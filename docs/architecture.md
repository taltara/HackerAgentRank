# Architecture

## The reference pipeline

`hiring-agent` is a "resume-to-score" pipeline:

1. **PDF → markdown** (`pymupdf_rag.py::to_markdown`)
2. **Per-section LLM extraction** (`pdf.py::PDFHandler`) — one LLM call per
   section (basics, work, education, skills, projects, awards) using the prompts in
   `core/prompts/templates/`, assembled into a `JSONResume`.
3. **Normalization** (`transform.py`) — loose LLM JSON → strict `JSONResume`.
4. **GitHub enrichment** (`github.py`) — fetch profile + repos, classify open-source
   vs. personal, and LLM-select the top 7. Optional.
5. **Role-based scoring** — one LLM call per rubric scores the CV against its
   categories and returns evidence, bonus, deductions, strengths, improvements.

## What this app adds

| Concern            | Reference                    | This app                                        |
| ------------------ | --------------------------- | ---------------------------------------------- |
| Rubric selection   | single role, hardcoded       | multi-rubric, `--compare`, API `roles` param   |
| Model layer        | one provider, strict JSON    | resilient fallback + Ollama auto-detect        |
| Surface            | CLI only                     | CLI + FastAPI + Next.js UI                     |
| Output             | printed report / CSV         | JSON + HTML report, API responses             |
| Rubrics            | `software_engineering_intern`| intern (HackerRank) plus community roles grouped by department |

## Module map

```
cv_eval/
├── _bootstrap.py    # puts core/ on sys.path (core uses flat imports)
├── providers.py     # model resolution, Ollama auto-detect, ResilientProvider
├── roles.py         # load/validate rubrics from cv_eval/rubrics/ (or CV_EVAL_ROLES_DIR)
├── pipeline.py      # evaluate(): extract → enrich → score → EvaluationResult
├── report.py        # render EvaluationResult → text / HTML
├── api.py           # FastAPI (health, models, roles, evaluate)
├── cli.py           # typer CLI
└── core/            # vendored reference pipeline (see NOTICE.md)
```

## Data flow

```
cv_bytes ─▶ pipeline.evaluate()
             │  1. providers.get_provider(model)  → ResilientProvider
             │  2. pdf.PDFHandler(provider).extract_json_from_pdf()  → JSONResume
             │  3. github.fetch_and_display_github_info()  → {profile, projects}  (optional)
             │  4. transform.convert_json_resume_to_text() [+ github text]
             │  5. for each role: build_evaluation_model() + LLM → EvaluationData
             ▼
          EvaluationResult { candidate_name, model, github_enriched,
                             resume, github, evaluations[] }
```

## Resilient structured output

Local models often ignore `response_format: {"type": "json_schema"}`. The
`ResilientProvider` (a) tries the configured structured-output mode, (b) on a
provider error retries without it, and (c) the pipeline parses JSON out of
free-text-wrapped responses (`parse_json_robust`). The result: a local model that
cannot honour the schema still yields a parseable evaluation.

## Why core is on sys.path

The reference modules import each other by bare name (`from models import
JSONResume`) and assume CWD is the repo root. Rather than rewrite every import,
`_bootstrap.py` puts `core/` on `sys.path`. It's the one place that knows the
core's layout.
