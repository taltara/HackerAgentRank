"""Render an :class:`~cv_eval.pipeline.EvaluationResult` to text / HTML / JSON.

The CLI prints a text report; the API can return JSON or an HTML report. HTML is
a single self-contained document (inline CSS) so it can be downloaded or viewed
standalone — no build step.
"""

from __future__ import annotations

import html
from typing import List, Optional

from cv_eval.result import EvaluationResult, RoleEvaluation
from cv_eval.runtimes import runtime_label


def _bar(value: float, max_value: float, width: int = 30) -> str:
    if max_value <= 0:
        return ""
    filled = int(round((value / max_value) * width))
    return "█" * filled + "░" * (width - filled)


def render_role_text(ev: RoleEvaluation) -> str:
    lines = [f"=== {ev.position_title} (rubric: {ev.role}) ===", ""]
    for cat in ev.categories:
        lines.append(f"  {cat.icon} {cat.label:<22} {cat.score:5.1f}/{cat.max:<3}  {_bar(cat.score, cat.max)}")
    lines.append("")
    lines.append(f"  Subtotal           {ev.total_score:5.1f}/{ev.total_max:.0f}")
    lines.append(f"  Bonus (+{ev.bonus_points:.1f})    {ev.bonus_breakdown or '-'}")
    if ev.deductions:
        lines.append(f"  Deductions (-{ev.deductions:.1f})  {ev.deduction_reasons}")
    lines.append(f"  OVERALL            {ev.overall:.1f}")
    lines.append("")
    if ev.key_strengths:
        lines.append("  Key strengths:")
        lines.extend(f"    + {s}" for s in ev.key_strengths)
        lines.append("")
    if ev.areas_for_improvement:
        lines.append("  Areas for improvement:")
        lines.extend(f"    - {a}" for a in ev.areas_for_improvement)
    return "\n".join(lines)


def render_text(result: EvaluationResult) -> str:
    header = [
        f"CV EVALUATION — {result.candidate_name or '(candidate)'}",
        f"Model: {result.model}   |   Runtime: {runtime_label(result.runtime)}   |   "
        f"GitHub enriched: {'yes' if result.github_enriched else 'no'}",
        f"Rubrics: {', '.join(ev.role for ev in result.evaluations)}",
        "=" * 60,
    ]
    body = [render_role_text(ev) for ev in result.evaluations]
    return "\n".join(header + ["", *body])


def _render_category_rows(ev: RoleEvaluation) -> str:
    rows = []
    for cat in ev.categories:
        pct = (cat.score / cat.max * 100) if cat.max else 0
        rows.append(
            f"<tr>"
            f"<td class='cat'>{html.escape(cat.icon)} {html.escape(cat.label)}</td>"
            f"<td class='score'>{cat.score:.1f}<span class='max'>/{cat.max}</span></td>"
            f"<td class='bar'><div class='track'><div class='fill' style='width:{pct:.0f}%'></div></div></td>"
            f"</tr>"
        )
    return "\n".join(rows)


def render_html(result: EvaluationResult, title: Optional[str] = None) -> str:
    name = html.escape(result.candidate_name or "Candidate")
    blocks = []
    for ev in result.evaluations:
        strengths = "".join(f"<li>{html.escape(s)}</li>" for s in ev.key_strengths) or "<li>—</li>"
        improvements = "".join(f"<li>{html.escape(a)}</li>" for a in ev.areas_for_improvement) or "<li>—</li>"
        evs = "".join(
            f"<div class='ev'><b>{html.escape(c.label)}:</b> {html.escape(c.evidence)}</div>"
            for c in ev.categories
            if c.evidence
        )
        blocks.append(f"""
      <section class="role">
        <h2>{html.escape(ev.position_title)} <span class="rubric">rubric: {html.escape(ev.role)}</span></h2>
        <div class="overall">
          <div class="overall-score">{ev.overall:.1f}<span>/{ev.max_final_score:.0f}</span></div>
          <div class="overall-meta">
            subtotal {ev.total_score:.1f}/{ev.total_max:.0f} · bonus +{ev.bonus_points:.1f} · deductions -{ev.deductions:.1f}
            {('<br>deductions: ' + html.escape(ev.deduction_reasons)) if ev.deductions else ''}
          </div>
        </div>
        <table class="cats">
          <thead><tr><th>Category</th><th>Score</th><th></th></tr></thead>
          <tbody>{_render_category_rows(ev)}</tbody>
        </table>
        <div class="cols">
          <div><h3>Key strengths</h3><ul>{strengths}</ul></div>
          <div><h3>Areas for improvement</h3><ul>{improvements}</ul></div>
        </div>
        <h3>Evidence</h3>{evs or '<p class="muted">No evidence recorded.</p>'}
      </section>""")

    return f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{html.escape(title or f"CV Evaluation — {name}")}</title>
<style>
  :root {{ --ink:#1a1a2e; --muted:#6b7280; --fill:#4f46e5; --bg:#f7f7fb; }}
  * {{ box-sizing:border-box; }}
  body {{ font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;
    color:var(--ink); background:var(--bg); margin:0; padding:32px; line-height:1.5; }}
  .wrap {{ max-width:860px; margin:0 auto; background:#fff; border-radius:14px;
    box-shadow:0 1px 3px rgba(0,0,0,.08); padding:32px; }}
  h1 {{ margin:0 0 4px; font-size:26px; }}
  .meta {{ color:var(--muted); font-size:13px; margin-bottom:24px; }}
  .role {{ margin-top:32px; padding-top:24px; border-top:1px solid #eee; }}
  .role:first-of-type {{ border-top:none; padding-top:0; margin-top:0; }}
  h2 {{ font-size:19px; margin:0 0 16px; }}
  .rubric {{ color:var(--muted); font-size:12px; font-weight:400; }}
  .overall {{ display:flex; align-items:baseline; gap:16px; margin-bottom:20px; }}
  .overall-score {{ font-size:52px; font-weight:700; color:var(--fill); line-height:1; }}
  .overall-score span {{ font-size:18px; color:var(--muted); font-weight:400; }}
  .overall-meta {{ color:var(--muted); font-size:13px; }}
  table.cats {{ width:100%; border-collapse:collapse; }}
  .cats th {{ text-align:left; font-size:12px; text-transform:uppercase; letter-spacing:.05em;
    color:var(--muted); padding:6px 8px; border-bottom:1px solid #eee; }}
  .cats td {{ padding:10px 8px; border-bottom:1px solid #f2f2f2; vertical-align:middle; }}
  .cat {{ font-weight:500; width:34%; }}
  .score {{ font-variant-numeric:tabular-nums; width:16%; }}
  .score .max {{ color:var(--muted); font-weight:400; }}
  .bar {{ width:50%; }}
  .track {{ background:#eee; border-radius:6px; height:10px; overflow:hidden; }}
  .fill {{ background:var(--fill); height:100%; }}
  .cols {{ display:grid; grid-template-columns:1fr 1fr; gap:24px; margin:16px 0; }}
  h3 {{ font-size:14px; margin:0 0 8px; }}
  ul {{ margin:0; padding-left:18px; }}
  li {{ margin-bottom:4px; font-size:14px; }}
  .ev {{ font-size:13px; padding:8px 0; border-bottom:1px solid #f5f5f5; }}
  .muted {{ color:var(--muted); font-size:13px; }}
  @media (max-width:640px) {{ .cols {{ grid-template-columns:1fr; }} body {{ padding:16px; }} }}
</style></head>
<body><div class="wrap">
  <h1>{name}</h1>
  <div class="meta">Model {html.escape(result.model)} · Runtime
    {html.escape(runtime_label(result.runtime))} · GitHub enriched:
    {'yes' if result.github_enriched else 'no'} ·
    Rubrics: {', '.join(html.escape(e.role) for e in result.evaluations)}</div>
  {''.join(blocks)}
</div></body></html>"""
