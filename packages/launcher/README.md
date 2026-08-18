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
resume extraction, LLM scoring) and is distributed on PyPI as `cv-eval`. This
package exists so that developers can get the whole stack running with one
command instead of following a five-step setup.

It has **zero runtime dependencies** and never reimplements pipeline logic.

## Requirements

- **Python 3.11+**
- **Node.js 20+**
- **[Ollama](https://ollama.com)** running with at least one model pulled

The launcher checks all three before doing anything and tells you exactly what
is missing.

## Usage

```bash
npx cv-evaluator                      # start the API and web UI
npx cv-evaluator roles                # list the available rubrics
npx cv-evaluator score cv.pdf --role backend_engineer
```

| Option           | Default | Description                                 |
| ---------------- | ------- | ------------------------------------------- |
| `--api-port <n>` | `8000`  | Port for the FastAPI service                |
| `--web-port <n>` | `3000`  | Port for the web UI                         |
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

The CLI is available directly from PyPI:

```bash
uvx cv-eval score cv.pdf --role backend_engineer
```

The launcher is only worth it when you want the web UI too.

## License

MIT
