"""FastAPI application.

Endpoints
---------
    GET  /health           liveness + which model is default
    GET  /models           local Ollama tags plus cloud runtime catalogs
    GET  /roles            rubric summaries (for the UI's picker)
    POST /evaluate         multipart: ``file`` (PDF) + ``roles`` + options
                            -> JSON EvaluationResult
    POST /evaluate/stream  same input, Server-Sent Events for the live stepper
    POST /evaluate/html    same input, returns an HTML report

The web frontend (Next.js) calls these. See ``docs/architecture.md``.
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import threading
from typing import List, Optional

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, JSONResponse, StreamingResponse

from cv_eval import report
from cv_eval.pipeline import evaluate
from cv_eval.providers import default_model, models_payload
from cv_eval.roles import list_roles, load_role, role_summary
from cv_eval.runtimes import redact_secret

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

MAX_UPLOAD_BYTES = 10 * 1024 * 1024

# The UI port is not fixed: the launcher accepts --web-port, and developers
# routinely land on 3001 when 3000 is taken. Allow any loopback origin rather
# than pinning a port. Set CV_EVAL_CORS_ORIGINS (comma-separated) to override
# when exposing the API beyond localhost.
LOOPBACK_ORIGIN = r"http://(localhost|127\.0\.0\.1)(:\d+)?"
_configured_origins = [
    origin.strip()
    for origin in os.environ.get("CV_EVAL_CORS_ORIGINS", "").split(",")
    if origin.strip()
]

app = FastAPI(title="CV Evaluator", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=_configured_origins,
    allow_origin_regex=None if _configured_origins else LOOPBACK_ORIGIN,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict:
    return {
        "status": "ok",
        "default_model": default_model(),
        "roles": list_roles(),
    }


@app.get("/models")
def models() -> dict:
    return models_payload()


@app.get("/roles")
def roles() -> List[dict]:
    out = []
    for name in list_roles():
        try:
            out.append(role_summary(name))
        except ValueError as e:
            logger.warning("Skipping malformed role %s: %s", name, e)
    return out


def _resolve_roles(role_param: Optional[str]) -> List[str]:
    if role_param in (None, "", "all"):
        return list_roles()
    names = [r.strip() for r in role_param.split(",") if r.strip()]
    for name in names:
        try:
            load_role(name)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
    if not names:
        raise HTTPException(status_code=400, detail="No roles selected.")
    return names


async def _load_pdf(file: UploadFile) -> bytes:
    filename = (file.filename or "").lower()
    if not filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="File must be a PDF.")
    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="Empty file.")
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="PDF exceeds the 10 MB limit.")
    if not data.startswith(b"%PDF"):
        raise HTTPException(status_code=400, detail="File is not a valid PDF.")
    return data


def _run(
    data: bytes,
    roles_param: Optional[str],
    enrich: bool,
    model: Optional[str],
    runtime: str = "local",
    api_key: Optional[str] = None,
):
    try:
        role_names = _resolve_roles(roles_param)
        return evaluate(
            data,
            role_names,
            enrich=enrich,
            model=model,
            runtime=runtime,
            api_key=api_key,
        )
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(
            status_code=400, detail=redact_secret(str(e), api_key)
        ) from e
    except RuntimeError as e:
        raise HTTPException(
            status_code=422, detail=redact_secret(str(e), api_key)
        ) from e
    except Exception as e:  # noqa: BLE001
        logger.error("Evaluation failed: %s", redact_secret(str(e), api_key), exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Evaluation failed: {redact_secret(str(e), api_key)}",
        ) from e


@app.post("/evaluate")
async def evaluate_endpoint(
    file: UploadFile = File(..., description="The CV as a PDF."),
    roles_param: str = Form("all", alias="roles"),
    enrich: bool = Form(True),
    model: Optional[str] = Form(None),
    runtime: str = Form("local"),
    api_key: Optional[str] = Form(None),
) -> JSONResponse:
    data = await _load_pdf(file)
    result = _run(data, roles_param, enrich, model, runtime, api_key)
    return JSONResponse(result.to_dict())


@app.post("/evaluate/stream")
async def evaluate_stream(
    file: UploadFile = File(...),
    roles_param: str = Form("all", alias="roles"),
    enrich: bool = Form(True),
    model: Optional[str] = Form(None),
    runtime: str = Form("local"),
    api_key: Optional[str] = Form(None),
) -> StreamingResponse:
    data = await _load_pdf(file)
    try:
        role_names = _resolve_roles(roles_param)
    except HTTPException:
        raise

    loop = asyncio.get_running_loop()
    queue: asyncio.Queue = asyncio.Queue()
    sentinel = object()

    def on_event(event: dict) -> None:
        loop.call_soon_threadsafe(queue.put_nowait, event)

    def worker() -> None:
        try:
            evaluate(
                data,
                role_names,
                enrich=enrich,
                model=model,
                on_event=on_event,
                runtime=runtime,
                api_key=api_key,
            )
        except Exception as e:  # noqa: BLE001
            safe = redact_secret(str(e), api_key)
            logger.error("Streaming evaluation failed: %s", safe, exc_info=True)
            on_event({"type": "error", "detail": safe})
        finally:
            loop.call_soon_threadsafe(queue.put_nowait, sentinel)

    threading.Thread(target=worker, daemon=True).start()

    async def generate():
        while True:
            item = await queue.get()
            if item is sentinel:
                break
            yield f"data: {json.dumps(item)}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@app.post("/evaluate/html", response_class=HTMLResponse)
async def evaluate_html(
    file: UploadFile = File(...),
    roles_param: str = Form("all", alias="roles"),
    enrich: bool = Form(True),
    model: Optional[str] = Form(None),
    runtime: str = Form("local"),
    api_key: Optional[str] = Form(None),
) -> HTMLResponse:
    data = await _load_pdf(file)
    result = _run(data, roles_param, enrich, model, runtime, api_key)
    return HTMLResponse(report.render_html(result))
