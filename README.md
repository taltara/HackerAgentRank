# CV Evaluator

Local-first CV scoring against **explainable hiring rubrics**. Upload a PDF, pick one or more roles, get a category-level score with evidence — on your machine.

Built around [interviewstreet/hiring-agent](https://github.com/interviewstreet/hiring-agent) (HackerRank, MIT): we vendor that resume-to-score pipeline and wrap it with multi-rubric scoring, a FastAPI service, a Next.js UI, and a CLI.

> Intended use: understand how a CV reads against a role, so you can improve it. This is not an ATS and not a hiring decision system.

![Scored results with per-category evidence](docs/images/results.png)

<p align="center"><em>Every category score expands to the evidence that produced it. Data shown is fictional.</em></p>

## Why this exists

HackerRank's hiring-agent is a strong intern scoring pipeline. It is also a single hardcoded rubric, a CLI, and a model layer that assumes structured JSON. This project keeps that core and adds what you need to run it as a product:

- **Multi-rubric** — score one CV against several roles in one pass
- **A catalog you can extend** — drop a folder in `backend/cv_eval/rubrics/`
- **Local models** — Ollama by default; tolerates models that ignore JSON-schema mode
- **Two surfaces** — web wizard and `python -m cv_eval`

## Requirements

- **Python 3.11+**
- **[Ollama](https://ollama.com)** with a pulled model — `gemma3:12b` is a good default
- **Node.js 20+** (web UI only)

## Quick start

```bash
ollama serve && ollama pull gemma3:12b
npx cv-evaluator
```

That checks your environment, provisions both services, and opens the UI at `http://localhost:3000`. Ports are configurable with `--api-port` and `--web-port`.

Just want the CLI, no Node?

```bash
uvx cv-eval score cv.pdf --role backend_engineer
```

<details>
<summary>Manual setup (contributors)</summary>

```bash
# API / CLI
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env

python -m cv_eval roles
python -m unittest tests.test_smoke -v
python -m cv_eval evaluate /path/to/cv.pdf --role backend_engineer

# Web UI — terminal 1
cd backend && uvicorn cv_eval.api:app --reload --port 8000

# Web UI — terminal 2
cd frontend
cp .env.example .env.local
npm install
npm run dev                  # http://localhost:3000
```

</details>

### On packaging

The pipeline is Python and is published to PyPI as [`cv-eval`](https://pypi.org/project/cv-eval/). The npm package [`cv-evaluator`](https://www.npmjs.com/package/cv-evaluator) is a **launcher only** — it has zero dependencies and never reimplements pipeline logic, it just provisions and supervises the two services. Shipping the evaluation logic itself as JavaScript would wrap a subprocess and lie about the runtime.

GitHub enrichment is **off** by default. Unauthenticated GitHub allows 60 requests/hour; set `GITHUB_TOKEN` in `backend/.env` if you turn it on.

## CLI

```bash
python -m cv_eval evaluate <cv.pdf> [options]
   -r, --role NAME      rubric to score (repeatable)
       --compare        score against every rubric
   -m, --model NAME     LLM model (default: local auto-detect)
       --no-github      skip GitHub enrichment
       --html-out PATH  write an HTML report
       --json-out PATH  write the raw JSON result

python -m cv_eval roles
python -m cv_eval models
```

## API

| Method | Path               | Returns                          |
| ------ | ------------------ | -------------------------------- |
| GET    | `/health`          | status, default model, role names |
| GET    | `/models`          | available models                  |
| GET    | `/roles`           | rubric summaries (incl. department) |
| POST   | `/evaluate`        | JSON result                       |
| POST   | `/evaluate/stream` | SSE: `plan`, `stage`, `partial`, `complete`, `error` |
| POST   | `/evaluate/html`   | HTML report                       |

`POST` bodies are multipart: `file` (PDF), `roles` (comma-separated names or `all`), `enrich` (`true`/`false`), `model` (optional).

## Rubrics

Each rubric is `backend/cv_eval/rubrics/<name>/` with `role.json`, `criteria.jinja`, and `system_message.jinja`. The intern rubric is HackerRank's. The rest are community rubrics in the same format: four explicit point bands per category, fairness guardrails, an evidence standard that scores unsupported claims at zero, and `{{ text_content }}` so the model actually sees the CV.

Point `CV_EVAL_ROLES_DIR` at your own directory to use a private rubric set without forking.

![Rubric picker grouped by department](docs/images/rubrics.png)

| Department   | Role                         | Directory                       | Source     |
| ------------ | ---------------------------- | ------------------------------- | ---------- |
| Engineering  | Software Engineering Intern  | `software_engineering_intern`   | HackerRank |
| Engineering  | Senior / Full-Stack Engineer | `senior_full_stack_engineer`    | Community  |
| Engineering  | Backend Engineer             | `backend_engineer`              | Community  |
| Engineering  | Frontend Engineer            | `frontend_engineer`             | Community  |
| Engineering  | DevOps / SRE                 | `devops_sre`                    | Community  |
| Engineering  | Engineering Manager          | `engineering_manager`           | Community  |
| Data & ML    | Machine Learning Engineer    | `machine_learning_engineer`     | Community  |
| Data & ML    | Data Analyst                 | `data_analyst`                  | Community  |
| Product      | Product Manager              | `product_manager`               | Community  |
| Design       | Product Designer             | `product_designer`              | Community  |
| General      | General professional         | `general_professional`          | Community  |

Authoring: [`docs/authoring-a-rubric.md`](docs/authoring-a-rubric.md). Architecture: [`docs/architecture.md`](docs/architecture.md).

## How it works

```
PDF ──▶ per-section LLM extraction ──▶ JSON Resume
     ──▶ optional GitHub enrichment
     ──▶ score against each selected rubric
     ──▶ score + evidence + bonus/deductions + strengths/gaps
```

LLM scores vary by model and temperature. Treat them as a structured critique, not a grade.

## Layout

```
cv-evaluator/
├── backend/
│   ├── cv_eval/          # package: pipeline, API, CLI
│   │   ├── core/         # vendored hiring-agent (NOTICE.md)
│   │   └── rubrics/      # rubric definitions, shipped with the package
│   └── tests/
├── frontend/             # Next.js wizard
├── packages/launcher/    # npx cv-evaluator
└── docs/
```

## Development

```bash
# backend
cd backend && source .venv/bin/activate
python -m unittest tests.test_smoke -v

# frontend
cd frontend
npm run typecheck
npm run lint
npm run build
```

## Status

v0.1. Local-first. No accounts, no hosted scoring, no auth. The API binds to localhost and is not safe to expose to the internet as-is.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). By participating you agree to the [Code of Conduct](CODE_OF_CONDUCT.md).

## Security

See [SECURITY.md](SECURITY.md). Do not file public issues for vulnerabilities.

## License

[MIT](LICENSE). Vendors parts of `interviewstreet/hiring-agent` (MIT) — see [`backend/cv_eval/core/NOTICE.md`](backend/cv_eval/core/NOTICE.md).
