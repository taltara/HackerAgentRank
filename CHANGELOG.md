# Changelog

## Unreleased

- Optional Gemini 3.5 Flash and Ollama Cloud (Gemma 4) runtimes on wizard step 03
- Per-run API key: never stored, never written to env, never logged, never in SSE
- Launcher treats local Ollama as optional so cloud-only users can reach the UI

## 0.1.0

First public cut.

- Multi-rubric scoring on the hiring-agent pipeline
- Local Ollama by default, FastAPI + Next.js wizard + Typer CLI
- Eleven rubrics grouped by department
- SSE progress with a remaining-time estimate that only falls or holds
