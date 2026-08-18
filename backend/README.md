# cv-eval

Local-first CV scoring against explainable hiring rubrics.

`cv-eval` reads a PDF resume, extracts a structured profile, optionally enriches
it with public GitHub signals, and scores it against one or more rubrics using a
local LLM through [Ollama](https://ollama.com). Every category score comes back
with the evidence that produced it. Nothing leaves your machine unless you
enable GitHub enrichment.

## Install

```bash
pip install cv-eval
# or, without installing:
uvx cv-eval --help
```

You also need Ollama running with at least one model pulled:

```bash
ollama pull gemma3:12b
```

## Use

```bash
# list available rubrics
cv-eval roles

# score a CV against one or more rubrics
cv-eval score resume.pdf --role backend_engineer --role senior_full_stack_engineer

# serve the HTTP API used by the web UI
cv-eval serve --port 8000
```

## Rubrics

Rubrics ship inside the package under `cv_eval/rubrics/`. Each is a directory
containing `role.json` (categories and score bounds), `criteria.jinja` (the
scoring prompt), and `system_message.jinja`.

To use your own rubric set without modifying the installed package, point
`CV_EVAL_ROLES_DIR` at your own directory:

```bash
CV_EVAL_ROLES_DIR=./my-rubrics cv-eval roles
```

## Documentation

Full documentation, the web UI, and rubric authoring guidance live in the
project repository: <https://github.com/taltara/HackerAgentRank>

## License

MIT
