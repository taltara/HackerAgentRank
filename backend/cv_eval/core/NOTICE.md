# NOTICE — vendored from interviewstreet/hiring-agent

The modules in this directory are derived from
[interviewstreet/hiring-agent](https://github.com/interviewstreet/hiring-agent)
and are subject to the **MIT License**. Original copyright:

> Copyright (c) 2026 Interview Street / HackerRank

The following files are vendored (copied and, where noted, lightly patched so they
run inside a package instead of as repo-root scripts):

| File                          | Change from upstream                                                                 |
| ----------------------------- | ------------------------------------------------------------------------------------ |
| `models.py`                   | unchanged                                                                            |
| `pymupdf_rag.py`              | unchanged                                                                            |
| `transform.py`                | unchanged                                                                            |
| `llm_utils.py`                | unchanged                                                                            |
| `prompt.py`                   | unchanged                                                                            |
| `config.py`                   | loads `backend/.env`; `DEVELOPMENT_MODE` from `CV_EVAL_DEVELOPMENT_MODE`             |
| `providers.json`              | unchanged                                                                            |
| `pdf.py`                      | `PDFHandler.__init__` accepts an injected `provider` and template dir                |
| `evaluator.py`                | unchanged (scoring is re-driven in `cv_eval/pipeline.py`)                            |
| `github.py`                   | `generate_projects_json` / `fetch_and_display_github_info` accept `model` + `provider` |
| `prompts/template_manager.py` | default template dir is absolute (next to this file), not CWD                        |
| `prompts/templates/*.jinja`   | unchanged                                                                            |

These patches are additive and backwards-compatible: running the core without an
injected provider still behaves like upstream. The app layer (`cv_eval/pipeline.py`,
`providers.py`, `roles.py`, `report.py`, `api.py`, `cli.py`) is original work under
the repository's MIT license.
