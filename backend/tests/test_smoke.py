"""Smoke tests that do not require an LLM."""

from __future__ import annotations

import os
import unittest

from fastapi.testclient import TestClient
from typer.testing import CliRunner

from cv_eval.api import app as api_app
from cv_eval.cli import app as cli_app
from cv_eval.pipeline import _CORE_TEMPLATES, clamp_final_score, parse_json_robust
from cv_eval.roles import list_roles, load_role, role_summary
from cv_eval.scoring import coerce_evaluation_payload
from prompts.template_manager import TemplateManager

DEPARTMENTS = {"Engineering", "Data & ML", "Product", "Design", "General"}


class ScoreClampTests(unittest.TestCase):
    def setUp(self) -> None:
        self.role = load_role("backend_engineer")

    def test_deductions_never_produce_a_negative_score(self) -> None:
        bonus, deductions, overall = clamp_final_score(13.0, 0.0, 22.0, self.role)
        self.assertEqual(bonus, 0.0)
        self.assertEqual(deductions, 13.0, "deductions must cap at points earned")
        self.assertEqual(overall, 0.0)

    def test_bonus_is_capped_at_the_role_maximum(self) -> None:
        bonus, _, overall = clamp_final_score(100.0, 999.0, 0.0, self.role)
        self.assertEqual(bonus, self.role.bonus_max)
        self.assertEqual(overall, self.role.max_final_score)

    def test_negative_model_output_is_ignored(self) -> None:
        bonus, deductions, overall = clamp_final_score(50.0, -5.0, -5.0, self.role)
        self.assertEqual((bonus, deductions), (0.0, 0.0))
        self.assertEqual(overall, 50.0)

    def test_every_role_is_bounded_at_zero_and_max(self) -> None:
        for name in list_roles():
            role = load_role(name)
            _, _, low = clamp_final_score(0.0, 0.0, 500.0, role)
            _, _, high = clamp_final_score(role.max_final_score, 500.0, 0.0, role)
            self.assertEqual(low, 0.0, f"{name} can score below zero")
            self.assertEqual(high, role.max_final_score, f"{name} exceeds its max")


class RoleLoaderTests(unittest.TestCase):
    def test_ships_industry_and_custom_rubrics(self) -> None:
        names = list_roles()
        for required in (
            "software_engineering_intern",
            "senior_full_stack_engineer",
            "backend_engineer",
            "frontend_engineer",
            "devops_sre",
            "engineering_manager",
            "machine_learning_engineer",
            "data_analyst",
            "product_manager",
            "product_designer",
            "general_professional",
        ):
            self.assertIn(required, names)

    def test_intern_role_loads(self) -> None:
        role = load_role("software_engineering_intern")
        self.assertGreater(len(role.categories), 0)
        self.assertTrue(role.criteria_source)
        self.assertTrue(role.system_message_source)
        summary = role_summary("software_engineering_intern")
        self.assertEqual(summary["name"], "software_engineering_intern")
        self.assertEqual(summary["department"], "Engineering")
        self.assertEqual(summary["source"], "hackerrank")

    def test_every_role_includes_cv_and_department(self) -> None:
        for name in list_roles():
            role = load_role(name)
            self.assertIn(
                "{{ text_content }}",
                role.criteria_source,
                f"{name} criteria.jinja must include the CV",
            )
            self.assertIn(
                role.department,
                DEPARTMENTS,
                f"{name} has an unknown department: {role.department}",
            )
            self.assertGreaterEqual(len(role.categories), 4)

    def test_score_bounds_are_internally_consistent(self) -> None:
        """Category maxes plus bonus must equal the advertised final maximum."""
        for name in list_roles():
            role = load_role(name)
            category_total = sum(c.max for c in role.categories)
            self.assertEqual(
                category_total + role.bonus_max,
                role.max_final_score,
                f"{name}: categories ({category_total}) + bonus ({role.bonus_max}) "
                f"!= max_final_score ({role.max_final_score})",
            )
            self.assertLessEqual(role.min_final_score, 0)

    def test_criteria_are_calibrated(self) -> None:
        """Every rubric must anchor its scores and name every category key.

        Without explicit bands an LLM clusters every category near the middle of
        its range, so these markers are a scoring-quality requirement, not style.
        """
        for name in list_roles():
            role = load_role(name)
            source = role.criteria_source
            for marker in ("0 points", "fairness", "evidence"):
                self.assertIn(
                    marker.lower(),
                    source.lower(),
                    f"{name} criteria.jinja is missing a '{marker}' rule",
                )
            for category in role.categories:
                self.assertIn(
                    category.key,
                    source,
                    f"{name} criteria.jinja never mentions category "
                    f"'{category.key}'",
                )

    def test_system_messages_keep_fairness_guardrails(self) -> None:
        for name in list_roles():
            source = load_role(name).system_message_source.lower()
            for term in ("gender", "grades", "institution"):
                self.assertIn(
                    term,
                    source,
                    f"{name} system_message.jinja dropped the {term} guardrail",
                )

    def test_unknown_role_lists_available(self) -> None:
        with self.assertRaises(ValueError) as ctx:
            load_role("not_a_real_role")
        self.assertIn("Available roles", str(ctx.exception))


class JsonParseTests(unittest.TestCase):
    def test_plain_object(self) -> None:
        self.assertEqual(parse_json_robust('{"a": 1}'), {"a": 1})

    def test_fenced_and_prose(self) -> None:
        raw = 'Here you go:\n```json\n{"score": 3}\n```\n'
        self.assertEqual(parse_json_robust(raw), {"score": 3})

    def test_think_tags(self) -> None:
        raw = '<think>reasoning</think>{"ok": true}'
        self.assertEqual(parse_json_robust(raw), {"ok": True})


class CoerceScoreTests(unittest.TestCase):
    def test_fills_max_and_empty_lists(self) -> None:
        role = load_role("general_professional")
        raw = {
            "scores": {
                cat.key: {"score": 0, "evidence": "none"} for cat in role.categories
            },
            "bonus_points": {"total": 0, "breakdown": ""},
            "deductions": {"total": 0, "reasons": ""},
            "key_strengths": [],
            "areas_for_improvement": [],
        }
        coerced = coerce_evaluation_payload(raw, role)
        for cat in role.categories:
            self.assertEqual(coerced["scores"][cat.key]["max"], cat.max)
        self.assertGreaterEqual(len(coerced["key_strengths"]), 1)
        self.assertGreaterEqual(len(coerced["areas_for_improvement"]), 1)


class TemplatePathTests(unittest.TestCase):
    def test_core_templates_exist(self) -> None:
        self.assertTrue(
            os.path.isfile(os.path.join(_CORE_TEMPLATES, "basics.jinja")),
            f"missing basics.jinja in {_CORE_TEMPLATES}",
        )

    def test_template_manager_loads_sections(self) -> None:
        tm = TemplateManager(template_dir=_CORE_TEMPLATES)
        for section in ("basics", "work", "education", "skills", "projects", "awards"):
            self.assertIn(section, tm.get_available_sections())


class CliTests(unittest.TestCase):
    def test_help_and_roles(self) -> None:
        runner = CliRunner()
        help_result = runner.invoke(cli_app, ["--help"])
        self.assertEqual(help_result.exit_code, 0, help_result.output)
        self.assertIn("evaluate", help_result.output)
        roles_result = runner.invoke(cli_app, ["roles"])
        self.assertEqual(roles_result.exit_code, 0, roles_result.output)
        self.assertIn("software_engineering_intern", roles_result.output)


class ApiTests(unittest.TestCase):
    def test_health_roles_and_cors(self) -> None:
        client = TestClient(api_app)
        health = client.get("/health", headers={"Origin": "http://localhost:3000"})
        self.assertEqual(health.status_code, 200)
        body = health.json()
        self.assertEqual(body["status"], "ok")
        self.assertIn("software_engineering_intern", body["roles"])
        self.assertEqual(
            health.headers.get("access-control-allow-origin"),
            "http://localhost:3000",
        )
        roles = client.get("/roles")
        self.assertEqual(roles.status_code, 200)
        names = {r["name"] for r in roles.json()}
        self.assertIn("software_engineering_intern", names)

    def test_cors_allows_any_loopback_port(self) -> None:
        """The UI port is not fixed, so CORS must not pin one."""
        client = TestClient(api_app)
        for origin in (
            "http://localhost:3000",
            "http://localhost:3010",
            "http://127.0.0.1:3001",
            "http://127.0.0.1",
        ):
            response = client.get("/health", headers={"Origin": origin})
            self.assertEqual(
                response.headers.get("access-control-allow-origin"),
                origin,
                f"CORS rejected {origin}",
            )

    def test_cors_rejects_remote_origins(self) -> None:
        client = TestClient(api_app)
        response = client.get("/health", headers={"Origin": "https://evil.example"})
        self.assertIsNone(response.headers.get("access-control-allow-origin"))

    def test_rejects_non_pdf(self) -> None:
        client = TestClient(api_app)
        response = client.post(
            "/evaluate",
            files={"file": ("resume.txt", b"not a pdf", "text/plain")},
        )
        self.assertEqual(response.status_code, 400)


if __name__ == "__main__":
    unittest.main()
