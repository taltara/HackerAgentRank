"""JSON-serializable evaluation result types used by the pipeline, API, and CLI."""

from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import List, Optional


@dataclass
class CategoryResult:
    key: str
    label: str
    icon: str
    score: float
    max: int
    evidence: str


@dataclass
class RoleEvaluation:
    role: str
    position_title: str
    categories: List[CategoryResult]
    total_score: float
    total_max: float
    bonus_points: float
    bonus_breakdown: str
    deductions: float
    deduction_reasons: str
    key_strengths: List[str]
    areas_for_improvement: List[str]
    overall: float
    max_final_score: float = 100.0

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass
class EvaluationResult:
    candidate_name: str
    model: str
    github_enriched: bool
    resume: dict
    github: Optional[dict]
    evaluations: List[RoleEvaluation]

    @property
    def primary(self) -> Optional[RoleEvaluation]:
        return self.evaluations[0] if self.evaluations else None

    def to_dict(self) -> dict:
        return asdict(self)
