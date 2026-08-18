"""Role (rubric) loading for the CV evaluator.

A *role* bundles a scoring rubric in ``cv_eval/rubrics/<name>/``:

    role.json            categories, weights, score bounds (machine-readable)
    criteria.jinja       the evaluation criteria prompt (rendered with text_content)
    system_message.jinja the system prompt (fairness guardrails, JSON contract)

Rubrics live inside the package so they survive ``pip install``. Set
``CV_EVAL_ROLES_DIR`` to point at a different directory (a private rubric set,
for example) without touching the installed package.

This is the reference's role system pointed at our own rubric directory, so we
can ship rubrics alongside the industry one. The :class:`Category` /
:class:`Role` dataclasses mirror the reference's so the dynamic scoring schema
(``build_evaluation_model``) works unchanged.
"""

from __future__ import annotations

import json
import os
from dataclasses import dataclass
from pathlib import Path
from typing import List

ROLES_DIR = Path(
    os.environ.get("CV_EVAL_ROLES_DIR")
    or Path(__file__).resolve().parent / "rubrics"
)


@dataclass(frozen=True)
class Category:
    """One scoring category and its maximum weight."""

    key: str
    label: str
    max: int
    icon: str = "•"


@dataclass(frozen=True)
class Role:
    """A fully-loaded role definition."""

    name: str
    position_title: str
    categories: List[Category]
    bonus_max: int
    min_final_score: int
    max_final_score: int
    criteria_source: str
    system_message_source: str
    description: str = ""
    department: str = "General"
    source: str = "community"


def list_roles() -> List[str]:
    """Names of every role directory under ``roles/`` (sorted)."""
    if not ROLES_DIR.is_dir():
        return []
    return sorted(p.name for p in ROLES_DIR.iterdir() if (p / "role.json").is_file())


def role_summary(name: str) -> dict:
    """Lightweight metadata for a role, for listing in a UI without loading prompts."""
    role = load_role(name)
    return {
        "name": role.name,
        "position_title": role.position_title,
        "description": role.description,
        "categories": [
            {"key": c.key, "label": c.label, "max": c.max, "icon": c.icon}
            for c in role.categories
        ],
        "bonus_max": role.bonus_max,
        "max_final_score": role.max_final_score,
        "department": role.department,
        "source": role.source,
    }


def load_role(name: str) -> Role:
    """Load and validate the role named ``name``.

    Raises ValueError (with the list of available roles) if the role directory,
    its manifest, or its prompt templates are missing or malformed.
    """
    role_dir = ROLES_DIR / name
    manifest_path = role_dir / "role.json"
    criteria_path = role_dir / "criteria.jinja"
    system_message_path = role_dir / "system_message.jinja"

    if not manifest_path.is_file():
        available = ", ".join(list_roles()) or "(none found)"
        raise ValueError(
            f"Unknown role '{name}'. Expected {manifest_path} to exist. "
            f"Available roles: {available}"
        )

    for path in (criteria_path, system_message_path):
        if not path.is_file():
            raise ValueError(f"Role '{name}' is missing required file: {path}")

    try:
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as e:
        raise ValueError(f"Role '{name}' has an invalid role.json: {e}") from e

    raw_categories = manifest.get("categories")
    if not raw_categories or not isinstance(raw_categories, list):
        raise ValueError(
            f"Role '{name}' role.json must define a non-empty 'categories' list"
        )

    categories: List[Category] = []
    seen_keys = set()
    for raw in raw_categories:
        key = raw.get("key")
        max_score = raw.get("max")
        if not key or max_score is None:
            raise ValueError(
                f"Role '{name}': each category needs a 'key' and 'max' (got {raw!r})"
            )
        if key in seen_keys:
            raise ValueError(f"Role '{name}': duplicate category key '{key}'")
        seen_keys.add(key)
        categories.append(
            Category(
                key=key,
                label=raw.get("label", key),
                max=int(max_score),
                icon=raw.get("icon", "•"),
            )
        )

    bonus_max = int(manifest.get("bonus_max", 20))
    return Role(
        name=name,
        position_title=manifest.get("position_title", name),
        categories=categories,
        bonus_max=bonus_max,
        min_final_score=int(manifest.get("min_final_score", 0)),
        max_final_score=int(
            manifest.get(
                "max_final_score", sum(c.max for c in categories) + bonus_max
            )
        ),
        criteria_source=criteria_path.read_text(encoding="utf-8"),
        system_message_source=system_message_path.read_text(encoding="utf-8"),
        description=manifest.get("description", ""),
        department=str(manifest.get("department", "General")),
        source=str(manifest.get("source", "community")),
    )
