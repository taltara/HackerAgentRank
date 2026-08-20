# cv-evaluator

One-command launcher for [CV Evaluator](https://github.com/taltara/HackerAgentRank)
— local-first CV scoring against explainable hiring rubrics.

```bash
npx cv-evaluator
```

That checks your environment, provisions the Python backend, builds the web UI,
starts both services, and opens a browser.

## What this package is

A **launcher**, not the product. The evaluation pipeline is Python (PDF parsing,
resume extraction, LLM scoring). This package exists so that developers can get
the whole stack running with one command instead of following a five-step setup.

It has **zero runtime dependencies** and never reimplements pipeline logic.

## Requirements

- **Python 3.11+**
- **Node.js 20+**
- **[Ollama](https://ollama.com)** with any model pulled, **or** a Gemini / Ollama Cloud key on wizard step 03

The backend picks the model from what you have — `DEFAULT_MODEL`, then a
preferred Gemma 4 build, then any other `gemma4*`, then the first local model
Ollama reports. Pulling a specific tag is a suggestion, not a requirement.

The launcher checks Python and Node before doing anything. Local Ollama is
optional for the web UI: if it is missing, you can still paste a cloud key.
The CLI still requires Ollama unless you pass `--runtime gemini` or
`--runtime ollama_cloud`.

## Usage

```bash
npx cv-evaluator                      # start the API and web UI
npx cv-evaluator roles                # list the available rubrics
npx cv-evaluator evaluate cv.pdf --role backend_engineer
```

| Option           | Default | Description                                 |
| ---------------- | ------- | ------------------------------------------- |
| `--api-port <n>` | `8000`  | Port for the FastAPI service                |
| `--web-port <n>` | `3000`  | Port for the web UI                         |
| `--dev`          | —       | `uvicorn --reload` and `next dev`           |
| `--api-only`     | —       | Start only the FastAPI backend              |
| `--web-only`     | —       | Start only the Next.js UI                   |
| `--no-open`      | —       | Do not open a browser                       |
| `--refresh`      | —       | Re-download the latest version before start |

Any command other than the ones above is passed straight through to the Python
CLI.

## Where it runs from

1. A checkout you are standing in, if one is found by walking up from the
   working directory. Contributors always run their own code.
2. A previously downloaded copy in `~/.cv-evaluator/app`.
3. Otherwise it downloads the current `main` and caches it there.

## Prefer to skip Node entirely?

From a clone of this repository:

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python -m cv_eval evaluate cv.pdf --role backend_engineer
```

The launcher is only worth it when you want the web UI too.

## License

MIT
