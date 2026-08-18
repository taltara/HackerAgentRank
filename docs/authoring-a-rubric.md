# Authoring a rubric

A rubric is a folder in `backend/cv_eval/rubrics/<name>/` with three files. The
loader (`cv_eval/roles.py`) and the UI pick it up automatically — no code changes.

Name the directory in `snake_case`. It becomes the machine id (`--role`, API).

To develop against a rubric set outside the repo, point `CV_EVAL_ROLES_DIR` at
your own directory.

## `role.json`

```json
{
    "position_title": "Backend Engineer",
    "department": "Engineering",
    "source": "community",
    "description": "One line: who this rubric is for.",
    "categories": [
        {"key": "systems_apis", "label": "Systems & APIs", "max": 30, "icon": "🔌"},
        {"key": "reliability", "label": "Reliability", "max": 20, "icon": "🛡"}
    ],
    "bonus_max": 15,
    "min_final_score": 0,
    "max_final_score": 115
}
```

| Field | Rule |
| ----- | ---- |
| `department` | One of `Engineering`, `Data & ML`, `Product`, `Design`, `General`. Drives picker group headers and is enforced by tests. |
| `source` | `hackerrank` for the upstream intern rubric, `community` for everything else. |
| `key` | Stable machine id in the JSON schema. Do not rename after people start comparing scores. |
| `max` | Category weight. Sum of maxes plus `bonus_max` **must** equal `max_final_score` — a test enforces this. |
| `description` | One sentence. Shown in the picker. No marketing language. |

Aim for category maxes summing to 100 so scores stay comparable across rubrics.

## `criteria.jinja`

Scoring instructions, rendered with the CV in `{{ text_content }}`. **If that
placeholder is missing, the model scores an empty document.**

### Bands are the whole game

Without explicit point bands an LLM clusters every category near the middle of
its range, and the rubric stops discriminating between candidates. Give each
category four bands with concrete, observable qualifiers:

```jinja
### 1. Systems & APIs (0-30 points)
Server-side services the candidate designed, shipped, and owned.

- **STRONG (21-30 points):** owned APIs with described contracts, consumers,
  and measured behaviour under load
- **SOLID (12-20 points):** shipped services with clear scope but no consumer
  or performance detail
- **LIMITED (1-11 points):** backend work asserted with no artifact
- **NONE (0 points):** no evidence in the CV for this category.
```

Band boundaries used by the shipped rubrics are 70% and 40% of the category max.

Write qualifiers you could check against a document. "Strong systems skills" is
unusable; "quantified latency or throughput outcomes the candidate owned" is not.

### Required sections

Every rubric must also include:

- A **fairness block** — never score on name, gender, age, location, institution,
  or grades.
- An **evidence standard** — including the rule that a category with no evidence
  scores 0 and says so.
- **Analysis instructions** that mention the optional `=== GITHUB DATA ===` and
  `=== BLOG DATA ===` sections, so enrichment is used rather than ignored.
- **Bonus** capped at `{{ bonus_max }}`, and **deductions** as a separate list.
- **Key Strengths** (1-5) and **Areas for Improvement** (1-3), both evidence-based.
- The exact output JSON structure, then `{{ text_content }}` last.

Copy an existing community rubric and replace the band text — the surrounding
scaffolding is deliberately identical across roles.

## `system_message.jinja`

Fairness guardrails and the JSON contract. Copy an existing role's file unless
you have a reason not to. Rendered with role context:

```jinja
You are evaluating a CV for "{{ position_title }}".
Categories:
{% for cat in categories %}
- {{ cat.label }} (max {{ cat.max }})
{% endfor %}
```

## Test it

```bash
python -m unittest tests.test_smoke -v   # structure, bounds, calibration markers
python -m cv_eval roles                  # confirm it loads and groups correctly
python -m cv_eval evaluate cv.pdf --role <name>
```

The test suite checks structure, not judgement. Before opening a PR, score at
least one strong and one deliberately weak CV against your rubric and confirm
the totals separate clearly. If a mediocre CV lands near the top of the range,
your bands are too generous.
