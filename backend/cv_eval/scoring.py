"""Turn messy LLM JSON into a payload the evaluation schema will accept.

Local models routinely omit ``max`` (it lives on the rubric), return empty
strength lists, or flatten bonus/deductions into a number. We fill those gaps
here so scoring never dies on schema echo.
"""

from __future__ import annotations

from typing import Any, List

from cv_eval.roles import Role


def _as_float(value: Any, default: float = 0.0) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _as_str_list(value: Any, fallback: List[str]) -> List[str]:
    if isinstance(value, str) and value.strip():
        items = [value.strip()]
    elif isinstance(value, list):
        items = [str(item).strip() for item in value if str(item).strip()]
    else:
        items = []
    return items[:5] or list(fallback)


def coerce_evaluation_payload(data: Any, role: Role) -> dict:
    """Return a dict that satisfies ``build_evaluation_model(role)``."""
    payload = data if isinstance(data, dict) else {}
    raw_scores = payload.get("scores")
    if not isinstance(raw_scores, dict):
        raw_scores = {}

    scores: dict = {}
    for category in role.categories:
        entry = raw_scores.get(category.key)
        if not isinstance(entry, dict):
            entry = {}
        evidence = entry.get("evidence") or "No evidence provided."
        if not isinstance(evidence, str) or not evidence.strip():
            evidence = "No evidence provided."
        scores[category.key] = {
            "score": max(0.0, min(_as_float(entry.get("score")), category.max)),
            "max": int(entry.get("max") or category.max),
            "evidence": evidence,
        }

    bonus = payload.get("bonus_points")
    if isinstance(bonus, (int, float)):
        bonus = {"total": bonus, "breakdown": ""}
    if not isinstance(bonus, dict):
        bonus = {}
    bonus_total = max(0.0, min(_as_float(bonus.get("total")), role.bonus_max))

    deductions = payload.get("deductions")
    if isinstance(deductions, (int, float)):
        deductions = {"total": deductions, "reasons": ""}
    if not isinstance(deductions, dict):
        deductions = {}

    return {
        "scores": scores,
        "bonus_points": {
            "total": bonus_total,
            "breakdown": str(bonus.get("breakdown") or ""),
        },
        "deductions": {
            "total": max(0.0, _as_float(deductions.get("total"))),
            "reasons": str(deductions.get("reasons") or ""),
        },
        "key_strengths": _as_str_list(
            payload.get("key_strengths"),
            ["No distinct strengths extracted from this pass."],
        ),
        "areas_for_improvement": _as_str_list(
            payload.get("areas_for_improvement"),
            ["Add more evidence-backed detail to the CV."],
        ),
    }
