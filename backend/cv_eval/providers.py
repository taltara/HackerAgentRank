"""Provider resolution for the CV evaluator.

Wraps the vendored reference pipeline's OpenAI-compatible provider layer
(``cv_eval/core``) with two additions the reference does not have:

1. **Local-model auto-detection.** The reference resolves models only from
   ``providers.json``. Here we also query the running Ollama instance
   (``GET /api/tags``) so any locally pulled model — including the one that
   ships in this environment, ``jarvis-qwen-mlx`` — is usable without editing
   config.

2. **Resilient structured output.** Local models frequently do not honour
   ``response_format: {"type": "json_schema"}``. ``ResilientProvider`` tries the
   configured structured-output mode first and, on a provider error, retries
   without it. Downstream JSON parsing (see ``pipeline``) is also tolerant of
   free-text-wrapped JSON, so a local model that ignores the schema constraint
   still yields a parseable result.

The contract is unchanged from the reference: a provider exposes
``chat(model, messages, options, **kwargs) -> {"message": {"content": ...}}``.
"""

from __future__ import annotations

import logging
import os
from typing import Any, Dict, List, Optional

import requests

# The vendored core lives on the path so its flat imports resolve.
from cv_eval._bootstrap import ensure_core_on_path

ensure_core_on_path()

from models import OpenAICompatibleProvider  # noqa: E402  (core, path-injected)

from cv_eval.runtimes import (  # noqa: E402
    CLOUD_RUNTIMES,
    cloud_config,
    parse_runtime,
    redact_secret,
    runtime_catalog,
)


OLLAMA_API = os.getenv("OLLAMA_HOST", "http://localhost:11434")
PREFERRED_MODELS = (
    "gemma4:31b-mlx",
    "gemma4:31b-mlx:latest",
    "gemma4:latest",
    "gemma4:26b",
)
# Fallback if no Gemma 4 variant is pulled locally.
SHIPPED_MODEL = PREFERRED_MODELS[0]


def list_local_models() -> List[str]:
    """Return the names of models currently available on the local Ollama host.

    Returns an empty list if Ollama is not reachable (the app still works with
    a configured remote provider).
    """
    try:
        resp = requests.get(f"{OLLAMA_API}/api/tags", timeout=3)
        if resp.status_code != 200:
            return []
        return [m["name"] for m in resp.json().get("models", [])]
    except Exception:
        return []


def available_models() -> List[str]:
    """Tags actually pulled on the local Ollama host.

    Cloud catalogs live under ``GET /models`` → ``runtimes`` and are not mixed
    in here, so the UI cannot present Gemini as a local model.
    """
    return list_local_models()


def default_model() -> str:
    """Pick the model to use by default.

    Order: ``DEFAULT_MODEL`` env → Gemma 4 local variants (``gemma4:31b-mlx``
    first) → any other local Ollama model → providers.json default.
    """
    env = os.getenv("DEFAULT_MODEL")
    if env:
        return env
    local = list_local_models()
    for name in PREFERRED_MODELS:
        if name in local:
            return name
    gemma = next((m for m in local if m.startswith("gemma4")), None)
    if gemma:
        return gemma
    if local:
        return local[0]
    try:
        from config import DEFAULT_MODEL as _default

        return _default
    except Exception:
        return "gemma4:latest"


def _is_local_ollama_model(model: str) -> bool:
    return model in list_local_models()


def models_payload() -> dict:
    """Shape returned by ``GET /models``: pulled local tags plus cloud catalogs."""
    local = list_local_models()
    default = default_model()
    if local and default not in local:
        default = next((name for name in PREFERRED_MODELS if name in local), local[0])
    return {
        "default": default,
        "available": local,
        "runtimes": {
            "local": {
                "label": "Local Ollama",
                "default": default,
                "models": local,
                "requires_key": False,
                "key_help": None,
            },
            **runtime_catalog(),
        },
    }


def get_provider(
    model: Optional[str] = None,
    structured_output: Optional[str] = None,
    runtime: str = "local",
    api_key: Optional[str] = None,
) -> ResilientProvider:
    """Build a resilient provider for ``model`` on ``runtime``.

    Local uses localhost Ollama only. The request key is ignored.

    Cloud uses a hardcoded base URL plus the request-scoped ``api_key``.
    Env is not read here — the CLI may fill a key before calling this.
    """
    resolved = parse_runtime(runtime)
    if resolved != "local":
        spec = CLOUD_RUNTIMES[resolved]
        chosen = model or spec.default_model
        cfg = cloud_config(resolved, chosen, api_key)
        if structured_output is not None:
            cfg = {**cfg, "structured_output": structured_output}
        return ResilientProvider(
            base_url=cfg["base_url"],
            api_key=cfg["api_key"],
            structured_output=cfg["structured_output"],
            extra_body=cfg.get("extra_body", {}),
            model=chosen,
        )

    model = model or default_model()
    if not _is_local_ollama_model(model):
        raise ValueError(
            f"Model '{model}' is not available on the local Ollama host "
            f"({OLLAMA_API}). Pull it with `ollama pull {model}` or switch "
            f"to a cloud runtime. Local models: "
            f"{', '.join(list_local_models()) or '(none)'}"
        )
    cfg: Dict[str, Any] = {
        "base_url": OLLAMA_API.rstrip("/") + "/v1",
        "api_key": None,
        "structured_output": "json_object",
        "extra_body": {"num_ctx": 32768},
    }
    if structured_output is not None:
        cfg = {**cfg, "structured_output": structured_output}

    return ResilientProvider(
        base_url=cfg["base_url"],
        api_key=None,
        structured_output=cfg["structured_output"],
        extra_body=cfg.get("extra_body", {}),
        model=model,
    )


class ResilientProvider:
    """An OpenAI-compatible provider that falls back off structured output.

    Tries the configured ``structured_output`` mode; if the provider rejects the
    request (e.g. a local model that does not understand ``json_schema``), it
    retries the same request with structured output disabled. The caller is
    expected to tolerate free-text-wrapped JSON (the pipeline does).
    """

    def __init__(
        self,
        base_url: str,
        api_key: Optional[str] = None,
        structured_output: str = "json_schema",
        extra_body: Optional[Dict[str, Any]] = None,
        model: str = "",
    ):
        self.model = model
        self.base_url = base_url
        self.structured_output = structured_output
        self._api_key = api_key
        self._primary = OpenAICompatibleProvider(
            base_url=base_url,
            api_key=api_key,
            structured_output=structured_output,
            extra_body=extra_body,
        )
        self._fallback = OpenAICompatibleProvider(
            base_url=base_url,
            api_key=api_key,
            structured_output="none",
            extra_body=extra_body,
        )

    def chat(
        self,
        model: str,
        messages: List[Dict[str, str]],
        options: Optional[Dict[str, Any]] = None,
        **kwargs,
    ):
        primary_kwargs = dict(kwargs)
        try:
            return self._primary.chat(model=model, messages=messages, options=options, **primary_kwargs)
        except Exception as exc:  # noqa: BLE001 - we deliberately catch broad here
            # Only fall back when structured output was actually requested.
            if "format" in primary_kwargs or self.structured_output != "none":
                logging.getLogger(__name__).warning(
                    "Structured-output request failed (%s); retrying without it.",
                    redact_secret(str(exc), self._api_key),
                )
                return self._fallback.chat(model=model, messages=messages, options=options, **primary_kwargs)
            raise
