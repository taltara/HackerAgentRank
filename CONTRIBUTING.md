# Contributing

Thanks for considering a patch. This repo is a thin product layer around a vendored pipeline — keep changes local to that layer unless you are deliberately updating `cv_eval/core`.

## Setup

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python -m unittest tests.test_smoke -v

cd ../frontend
npm install
npm run typecheck
npm run lint
```

Run Ollama if you are exercising extraction or scoring. Smoke tests do not call an LLM.

## What belongs where

| Change                         | Put it in                                      |
| ------------------------------ | ---------------------------------------------- |
| New / edited rubric            | `backend/cv_eval/rubrics/<name>/` + authoring doc |
| Scoring / extraction behaviour | `backend/cv_eval/` (not `core/` unless required) |
| HTTP surface                   | `backend/cv_eval/api.py`                       |
| CLI                            | `backend/cv_eval/cli.py`                       |
| Web wizard                     | `frontend/` — JSX in `components/`, logic in `hooks/` |

Do not rewrite vendored `core/` imports or prompts unless you are syncing upstream. Record any core patch in `backend/cv_eval/core/NOTICE.md`.

## Rubrics

A rubric is three files. The loader and UI pick it up with no code change.

1. Follow [`docs/authoring-a-rubric.md`](docs/authoring-a-rubric.md).
2. Set `department` so the picker can group it.
3. End `criteria.jinja` with `{{ text_content }}`. Without that the model scores an empty CV.
4. Keep category `key`s stable once published — they are the JSON schema.

Quality bar: evidence bands (high / medium / low), fairness language, no demographic scoring, no keyword-list scoring. If you cannot write that for a role, do not add the folder.

## Pull requests

- One concern per PR.
- Tests for loader / API / coercion changes.
- Do not commit `.env`, `.venv`, `.next`, or evaluation reports.
- Describe the behaviour change, not the file list.

## Reporting bugs

Use GitHub issues. Include: OS, Python / Node versions, model name, whether GitHub enrichment was on, and the stage that failed (from the live stepper or CLI logs). Do not attach CVs that contain other people's personal data.
