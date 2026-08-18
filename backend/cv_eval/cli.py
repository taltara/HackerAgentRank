"""Command-line interface.

Examples
--------
    python -m cv_eval evaluate resume.pdf --role software_engineering_intern
    python -m cv_eval evaluate resume.pdf --compare
    python -m cv_eval evaluate resume.pdf --compare --model qwen2.5:7b \\
        --no-github --html-out report.html
    python -m cv_eval roles
    python -m cv_eval models
"""

from __future__ import annotations

import json
import logging
from typing import List, Optional

import typer

from cv_eval import report
from cv_eval.pipeline import evaluate as run_evaluation
from cv_eval.providers import available_models, default_model, list_local_models
from cv_eval.roles import list_roles, load_role, role_summary

app = typer.Typer(
    add_completion=False,
    help="Evaluate a CV against industry / custom rubrics.",
)


@app.command()
def roles() -> None:
    """List the rubrics available under roles/."""
    available = list_roles()
    if not available:
        typer.echo("No roles found.")
        return
    for name in available:
        info = role_summary(name)
        cats = ", ".join(f"{c['label']}({c['max']})" for c in info["categories"])
        dept = info.get("department", "General")
        typer.echo(f"  {name}")
        typer.echo(f"      {info['position_title']}  [{dept}]")
        typer.echo(f"      {cats}")
        typer.echo(f"      {info.get('description', '')}")
        typer.echo("")


@app.command()
def models() -> None:
    """List models we can target (providers.json + local Ollama)."""
    local = list_local_models()
    default = default_model()
    typer.echo(f"Default: {default}")
    typer.echo(f"\nLocal (Ollama): {', '.join(local) or '(none reachable)'}")
    typer.echo("\nAll available:")
    for m in available_models():
        marker = "  <- default" if m == default else ""
        typer.echo(f"  {m}{marker}")


@app.command("evaluate")
def evaluate_cmd(
    cv_path: str = typer.Argument(..., help="Path to the CV PDF."),
    role: List[str] = typer.Option(
        None,
        "--role",
        "-r",
        help="Rubric to score against (repeatable). Omit to use the first available.",
    ),
    compare: bool = typer.Option(
        False, "--compare", help="Score against every available rubric."
    ),
    model: Optional[str] = typer.Option(
        None, "--model", "-m", help="LLM model to use."
    ),
    no_github: bool = typer.Option(
        False, "--no-github", help="Skip GitHub enrichment."
    ),
    html_out: Optional[str] = typer.Option(
        None, "--html-out", help="Write an HTML report here."
    ),
    json_out: Optional[str] = typer.Option(
        None, "--json-out", help="Write the raw JSON result here."
    ),
    verbose: bool = typer.Option(False, "--verbose", "-v", help="Verbose logging."),
) -> None:
    """Evaluate a CV PDF against one or more rubrics."""
    logging.basicConfig(
        level=logging.DEBUG if verbose else logging.WARNING,
        format="%(levelname)s %(name)s: %(message)s",
    )

    role_names = list_roles() if compare else (role or list_roles()[:1])
    if not role_names:
        typer.echo("No rubrics available under roles/.", err=True)
        raise typer.Exit(1)

    for name in role_names:
        try:
            load_role(name)
        except ValueError as e:
            typer.echo(str(e), err=True)
            raise typer.Exit(1)

    typer.echo(
        f"Evaluating {cv_path} against {', '.join(role_names)} with "
        f"{model or default_model()}…",
        err=True,
    )

    try:
        with open(cv_path, "rb") as f:
            result = run_evaluation(
                f.read(), role_names, enrich=not no_github, model=model
            )
    except Exception as e:  # noqa: BLE001
        typer.echo(f"Evaluation failed: {e}", err=True)
        raise typer.Exit(1)

    typer.echo("")
    typer.echo(report.render_text(result))

    if html_out:
        with open(html_out, "w", encoding="utf-8") as f:
            f.write(report.render_html(result))
        typer.echo(f"\nHTML report written to {html_out}", err=True)

    if json_out:
        with open(json_out, "w", encoding="utf-8") as f:
            json.dump(result.to_dict(), f, indent=2)
        typer.echo(f"JSON result written to {json_out}", err=True)


if __name__ == "__main__":
    app()
