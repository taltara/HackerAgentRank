"""Loads providers.json and exposes provider/model resolution."""

import json
import os
from pathlib import Path

from dotenv import load_dotenv

# Load backend/.env first (app), then core/.env (optional override).
_BACKEND_ROOT = Path(__file__).resolve().parent.parent.parent
load_dotenv(_BACKEND_ROOT / ".env")
load_dotenv(Path(__file__).parent / ".env")

# Off by default so the app stays stateless. Set CV_EVAL_DEVELOPMENT_MODE=1 to
# enable the vendored core's response caching + CSV export.
DEVELOPMENT_MODE = os.getenv("CV_EVAL_DEVELOPMENT_MODE", "0").strip().lower() in {
    "1",
    "true",
    "yes",
}

_CONFIG_PATH = Path(__file__).parent / "providers.json"

with open(_CONFIG_PATH) as _f:
    _config = json.load(_f)

# Default model, overridable by env.
DEFAULT_MODEL = os.getenv("DEFAULT_MODEL", _config["default_model"])

# Flat model -> {temperature, top_p} map. Preserves the contract that
# prompt.MODEL_PARAMETERS exposed to evaluator.py / pdf.py / github.py / score.py.
MODEL_PARAMETERS = {
    model: {k: v for k, v in params.items() if k in ("temperature", "top_p")}
    for provider in _config["providers"].values()
    for model, params in provider["models"].items()
}


def provider_for(model_name: str) -> dict:
    """Resolve provider config for a model.

    Returns {base_url, api_key, structured_output, extra_body}.
    Raises ValueError if the model is unknown or its required key is unset.
    """
    for name, prov in _config["providers"].items():
        if model_name not in prov["models"]:
            continue
        api_key_env = prov.get("api_key_env")
        api_key = os.getenv(api_key_env) if api_key_env else None
        if api_key_env and not api_key:
            raise ValueError(
                f"Model '{model_name}' uses provider '{name}', which requires "
                f"env var '{api_key_env}', but it is unset."
            )
        extra_body = {
            **prov.get("extra_body", {}),
            **prov["models"][model_name].get("extra_body", {}),
        }
        return {
            "base_url": prov["base_url"].rstrip("/"),
            "api_key": api_key,
            "structured_output": prov.get("structured_output", "json_schema"),
            "extra_body": extra_body,
        }

    available = ", ".join(sorted(MODEL_PARAMETERS))
    raise ValueError(
        f"Unknown model '{model_name}'. Available models: {available}"
    )
