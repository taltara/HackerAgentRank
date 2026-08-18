"""Pipeline orchestration: PDF CV -> structured evaluation.

Flow: extract -> (optional) github enrich -> score each role -> aggregate.
``on_event`` is used by the streaming API so the UI can render a live stepper.
"""

from __future__ import annotations

import json
import logging
import os
import tempfile
from typing import Callable, List, Optional

from cv_eval._bootstrap import ensure_core_on_path

ensure_core_on_path()

from models import JSONResume, build_evaluation_model  # noqa: E402  (core)
from transform import (  # noqa: E402
    convert_json_resume_to_text,
    convert_github_data_to_text,
)
from llm_utils import extract_json_from_response  # noqa: E402
from prompts.template_manager import TemplateManager  # noqa: E402
from config import MODEL_PARAMETERS  # noqa: E402
from pdf import PDFHandler  # noqa: E402
from github import fetch_and_display_github_info  # noqa: E402

from cv_eval.providers import ResilientProvider, default_model, get_provider
from cv_eval.result import CategoryResult, EvaluationResult, RoleEvaluation
from cv_eval.roles import Role, load_role
from cv_eval.runtimes import CLOUD_RUNTIMES, parse_runtime
from cv_eval.scoring import coerce_evaluation_payload

logger = logging.getLogger(__name__)

EventSink = Optional[Callable[[dict], None]]

_CORE_TEMPLATES = os.path.join(ensure_core_on_path(), "prompts", "templates")

_SECTION_LABELS = {
    "basics": "Reading identity and contact",
    "work": "Parsing work history",
    "education": "Reading education",
    "skills": "Cataloguing skills",
    "projects": "Reviewing projects",
    "awards": "Collecting awards",
}


def _emit(on_event: EventSink, payload: dict) -> None:
    if on_event:
        on_event(payload)


def parse_json_robust(text: str) -> dict:
    """Parse a JSON object out of an LLM response that may be wrapped in prose."""
    text = (text or "").strip()
    if "</think>" in text:
        text = text.split("</think>", 1)[1]
    text = extract_json_from_response(text)
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    start, end = text.find("{"), text.rfind("}")
    if start != -1 and end != -1 and end > start:
        return json.loads(text[start : end + 1])
    raise ValueError(f"No JSON object found in LLM response: {text[:200]!r}")


def _find_profile(profiles, network: str):
    if not profiles:
        return None
    return next(
        (p for p in profiles if p.network and p.network.lower() == network.lower()),
        None,
    )


def extract_resume(
    cv_bytes: bytes,
    provider: ResilientProvider,
    on_event: EventSink = None,
) -> Optional[JSONResume]:
    """PDF bytes -> JSONResume, using the reference's per-section extractor."""

    def on_section(section: str, status: str) -> None:
        if section == "pdf":
            _emit(
                on_event,
                {
                    "type": "stage",
                    "id": "parse_pdf",
                    "label": "Converting PDF to text",
                    "status": status,
                },
            )
            return
        _emit(
            on_event,
            {
                "type": "stage",
                "id": f"extract.{section}",
                "label": _SECTION_LABELS.get(section, section),
                "status": status,
            },
        )

    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
        tmp.write(cv_bytes)
        tmp_path = tmp.name
    try:
        _emit(
            on_event,
            {
                "type": "stage",
                "id": "parse_pdf",
                "label": "Converting PDF to text",
                "status": "running",
            },
        )
        handler = PDFHandler(
            provider=provider,
            template_dir=_CORE_TEMPLATES,
            on_progress=on_section,
        )
        resume = handler.extract_json_from_pdf(tmp_path)
    finally:
        try:
            os.remove(tmp_path)
        except OSError:
            pass
    return resume


def enrich_github(
    resume: JSONResume,
    role: Role,
    provider: ResilientProvider,
    model: str,
) -> dict:
    """Fetch GitHub profile + top repos when the CV lists a GitHub profile."""
    profiles = resume.basics.profiles if (resume.basics and resume.basics.profiles) else []
    github_profile = _find_profile(profiles, "github")
    if not github_profile:
        return {}
    try:
        data = fetch_and_display_github_info(
            github_profile.url,
            position_title=role.position_title,
            model=model,
            provider=provider,
        )
        return data or {}
    except Exception as e:  # noqa: BLE001
        logger.warning("GitHub enrichment failed: %s", e)
        return {}


def clamp_final_score(
    total_score: float,
    bonus_raw: float,
    deductions_raw: float,
    role: Role,
) -> tuple[float, float, float]:
    """Bound a raw model verdict into (bonus, deductions, overall).

    A deduction reduces earned points; it never creates debt. Models routinely
    stack deductions past the points actually awarded on a weak CV, which
    otherwise yields a negative overall and an inverted progress bar in the UI.
    """
    bonus = min(max(bonus_raw, 0.0), role.bonus_max)
    deductions = min(max(deductions_raw, 0.0), total_score + bonus)
    floor = max(role.min_final_score, 0.0)
    overall = min(max(total_score + bonus - deductions, floor), role.max_final_score)
    return bonus, deductions, overall


def _score_role(
    role: Role,
    resume_text: str,
    provider: ResilientProvider,
    model: str,
    model_params: dict,
) -> RoleEvaluation:
    """Score one CV against one rubric, returning a RoleEvaluation."""
    evaluation_model = build_evaluation_model(role)
    tm = TemplateManager(template_dir=_CORE_TEMPLATES)
    context = {
        "text_content": resume_text,
        "position_title": role.position_title,
        "categories": role.categories,
        "bonus_max": role.bonus_max,
        "min_final_score": role.min_final_score,
        "max_final_score": role.max_final_score,
        "description": role.description,
    }
    criteria = tm.render_string(role.criteria_source, **context)
    system = tm.render_string(role.system_message_source, **context)
    cv_text = (resume_text or "").strip()
    if len(cv_text) < 80:
        raise RuntimeError(
            "Extracted resume text is empty or too short to score. "
            "Re-run extraction or check the PDF."
        )
    if "{{ text_content }}" not in role.criteria_source:
        criteria = (
            f"{criteria.rstrip()}\n\n---\n\n"
            "# Candidate CV\nScore ONLY the document below.\n\n"
            f"{cv_text}\n"
        )
    logger.info("Scoring %s with %d chars of resume text", role.name, len(cv_text))
    response = provider.chat(
        model=model,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": criteria},
        ],
        options={
            "stream": False,
            "temperature": model_params.get("temperature", 0.1),
            "top_p": model_params.get("top_p", 0.9),
        },
        format=evaluation_model.model_json_schema(),
    )
    data = coerce_evaluation_payload(
        parse_json_robust(response["message"]["content"]), role
    )
    evaluation = evaluation_model(**data)

    categories: List[CategoryResult] = []
    total_score = 0.0
    total_max = 0.0
    for category in role.categories:
        cat = getattr(evaluation.scores, category.key, None)
        if cat is None:
            continue
        capped = min(cat.score, category.max)
        total_score += capped
        total_max += category.max
        categories.append(
            CategoryResult(
                key=category.key,
                label=category.label,
                icon=category.icon,
                score=capped,
                max=category.max,
                evidence=cat.evidence,
            )
        )

    bonus, deductions, overall = clamp_final_score(
        total_score,
        evaluation.bonus_points.total if evaluation.bonus_points else 0.0,
        evaluation.deductions.total if evaluation.deductions else 0.0,
        role,
    )

    return RoleEvaluation(
        role=role.name,
        position_title=role.position_title,
        categories=categories,
        total_score=total_score,
        total_max=total_max,
        bonus_points=bonus,
        bonus_breakdown=evaluation.bonus_points.breakdown if evaluation.bonus_points else "",
        deductions=deductions,
        deduction_reasons=evaluation.deductions.reasons if evaluation.deductions else "",
        key_strengths=list(evaluation.key_strengths or []),
        areas_for_improvement=list(evaluation.areas_for_improvement or []),
        overall=round(overall, 1),
        max_final_score=role.max_final_score,
    )


def evaluate(
    cv_bytes: bytes,
    role_names: List[str],
    enrich: bool = True,
    model: Optional[str] = None,
    on_event: EventSink = None,
    runtime: str = "local",
    api_key: Optional[str] = None,
) -> EvaluationResult:
    """Evaluate a CV PDF against one or more rubrics."""
    if not role_names:
        raise ValueError("At least one role is required.")

    runtime_id = parse_runtime(runtime)
    if runtime_id != "local":
        model = model or CLOUD_RUNTIMES[runtime_id].default_model
    else:
        model = model or default_model()
    provider = get_provider(model, runtime=runtime_id, api_key=api_key)
    model_params = MODEL_PARAMETERS.get(model, {"temperature": 0.1, "top_p": 0.9})
    roles = [load_role(name) for name in role_names]

    stages = [
        {"id": "parse_pdf", "label": "Converting PDF to text"},
        *[{"id": f"extract.{key}", "label": label} for key, label in _SECTION_LABELS.items()],
    ]
    if enrich:
        stages.append({"id": "github", "label": "Enriching with GitHub signals"})
    for role in roles:
        stages.append(
            {"id": f"score.{role.name}", "label": f"Scoring {role.position_title}"}
        )
    _emit(on_event, {"type": "plan", "stages": stages, "model": model, "runtime": runtime_id})

    resume = extract_resume(cv_bytes, provider, on_event=on_event)
    if resume is None:
        raise RuntimeError(
            "Could not extract any structured data from the PDF. "
            "The file may be scanned/image-only or unreadable."
        )

    github_data: dict = {}
    if enrich:
        _emit(
            on_event,
            {
                "type": "stage",
                "id": "github",
                "label": "Enriching with GitHub signals",
                "status": "running",
            },
        )
        github_data = enrich_github(resume, roles[0], provider, model)
        _emit(
            on_event,
            {
                "type": "stage",
                "id": "github",
                "label": "Enriching with GitHub signals",
                "status": "done" if github_data else "skipped",
                "detail": None if github_data else "No GitHub profile on the CV",
            },
        )

    resume_text = convert_json_resume_to_text(resume)
    if github_data:
        resume_text += convert_github_data_to_text(github_data)

    evaluations: List[RoleEvaluation] = []
    for role in roles:
        _emit(
            on_event,
            {
                "type": "stage",
                "id": f"score.{role.name}",
                "label": f"Scoring {role.position_title}",
                "status": "running",
            },
        )
        ev = _score_role(role, resume_text, provider, model, model_params)
        evaluations.append(ev)
        _emit(
            on_event,
            {
                "type": "stage",
                "id": f"score.{role.name}",
                "label": f"Scoring {role.position_title}",
                "status": "done",
            },
        )
        _emit(on_event, {"type": "partial", "evaluation": ev.to_dict()})

    candidate_name = ""
    if resume.basics and resume.basics.name:
        candidate_name = resume.basics.name

    result = EvaluationResult(
        candidate_name=candidate_name,
        model=model,
        github_enriched=bool(github_data),
        resume=resume.model_dump() if hasattr(resume, "model_dump") else dict(resume),
        github=github_data or None,
        evaluations=evaluations,
        runtime=runtime_id,
    )
    _emit(on_event, {"type": "complete", "result": result.to_dict()})
    return result
