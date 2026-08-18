"""cv_eval — a CV evaluation app built around interviewstreet/hiring-agent.

Public surface:
    from cv_eval.pipeline import evaluate, EvaluationResult
    from cv_eval.roles import list_roles, load_role
    from cv_eval.providers import available_models, default_model
"""

__all__ = ["pipeline", "roles", "providers", "report", "api", "cli"]
