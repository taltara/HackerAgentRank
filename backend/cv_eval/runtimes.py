"""Allowed LLM runtimes. Cloud base URLs are fixed — callers cannot supply a host."""

from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Dict, Optional


@dataclass(frozen=True)
class CloudRuntime:
    label: str
    base_url: str
    default_model: str
    models: tuple[str, ...]
    structured_output: str
    key_help: str
    env_key: str


CLOUD_RUNTIMES: Dict[str, CloudRuntime] = {
    "ollama_cloud": CloudRuntime(
        label="Ollama Cloud",
        base_url="https://ollama.com/v1",
        default_model="gemma4:latest",
        models=("gemma4:latest", "gemma4:26b"),
        structured_output="json_object",
        key_help="https://ollama.com/settings/keys",
        env_key="OLLAMA_API_KEY",
    ),
    "gemini": CloudRuntime(
        label="Gemini",
        base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
        default_model="gemini-3.5-flash",
        models=(
            "gemini-3.5-flash",
            "gemini-3.7-flash",
            "gemini-2.5-flash",
        ),
        structured_output="json_schema",
        key_help="https://aistudio.google.com/apikey",
        env_key="GEMINI_API_KEY",
    ),
}

VALID_RUNTIMES = ("local", *CLOUD_RUNTIMES.keys())


def parse_runtime(value: Optional[str]) -> str:
    name = (value or "local").strip() or "local"
    if name not in VALID_RUNTIMES:
        raise ValueError(
            f"Unknown runtime '{name}'. Use one of: {', '.join(VALID_RUNTIMES)}"
        )
    return name


def runtime_label(runtime: str) -> str:
    name = parse_runtime(runtime)
    if name == "local":
        return "Local Ollama"
    return CLOUD_RUNTIMES[name].label


def env_key_name(runtime: str) -> Optional[str]:
    spec = CLOUD_RUNTIMES.get(parse_runtime(runtime))
    return spec.env_key if spec else None


def redact_secret(message: str, secret: Optional[str]) -> str:
    if not secret:
        return message
    return message.replace(secret, "[redacted]")


def cli_api_key(runtime: str, api_key: Optional[str]) -> Optional[str]:
    """CLI convenience: typed flag, then env. The HTTP API must not call this."""
    key = (api_key or "").strip()
    if key:
        return key
    env_name = env_key_name(runtime)
    if not env_name:
        return None
    return (os.getenv(env_name) or "").strip() or None


def runtime_catalog() -> dict:
    return {
        name: {
            "label": spec.label,
            "default": spec.default_model,
            "models": list(spec.models),
            "requires_key": True,
            "key_help": spec.key_help,
        }
        for name, spec in CLOUD_RUNTIMES.items()
    }


def cloud_config(runtime: str, model: str, api_key: Optional[str]) -> dict:
    spec = CLOUD_RUNTIMES.get(runtime)
    if spec is None:
        raise ValueError(f"Runtime '{runtime}' is not a cloud provider.")
    key = (api_key or "").strip()
    if not key:
        raise ValueError(
            f"{spec.label} requires an API key for this run. "
            f"Create one at {spec.key_help}."
        )
    if model not in spec.models:
        raise ValueError(
            f"Model '{model}' is not offered on {spec.label}. "
            f"Available: {', '.join(spec.models)}"
        )
    return {
        "base_url": spec.base_url.rstrip("/"),
        "api_key": key,
        "structured_output": spec.structured_output,
        "extra_body": {},
    }
