"""Runtime catalog and BYOK tests. No LLM calls."""

from __future__ import annotations

import os
import unittest

from fastapi.testclient import TestClient

from cv_eval.api import app as api_app


class RuntimeCatalogTests(unittest.TestCase):
    def setUp(self) -> None:
        os.environ.pop("GEMINI_API_KEY", None)
        os.environ.pop("OLLAMA_API_KEY", None)

    def test_catalog_defaults(self) -> None:
        from cv_eval.runtimes import CLOUD_RUNTIMES

        self.assertEqual(CLOUD_RUNTIMES["gemini"].default_model, "gemini-3.5-flash")
        self.assertEqual(CLOUD_RUNTIMES["ollama_cloud"].default_model, "gemma4:latest")
        self.assertIn("gemini-3.7-flash", CLOUD_RUNTIMES["gemini"].models)

    def test_redact_secret(self) -> None:
        from cv_eval.runtimes import redact_secret

        self.assertEqual(redact_secret("token=abc123xyz", "abc123xyz"), "token=[redacted]")
        self.assertEqual(redact_secret("ok", None), "ok")

    def test_unknown_runtime_fails(self) -> None:
        from cv_eval.providers import get_provider

        with self.assertRaises(ValueError) as ctx:
            get_provider(runtime="groq")
        self.assertIn("Unknown runtime", str(ctx.exception))

    def test_gemini_without_key_fails(self) -> None:
        from cv_eval.providers import get_provider

        with self.assertRaises(ValueError) as ctx:
            get_provider("gemini-3.5-flash", runtime="gemini", api_key="")
        self.assertIn("API key", str(ctx.exception))

    def test_gemini_with_key_uses_google_url(self) -> None:
        from cv_eval.providers import get_provider

        provider = get_provider(
            "gemini-3.5-flash", runtime="gemini", api_key="test-secret-key"
        )
        self.assertIn("generativelanguage.googleapis.com", provider.base_url)
        self.assertEqual(provider.model, "gemini-3.5-flash")

    def test_ollama_cloud_with_key_uses_ollama_host(self) -> None:
        from cv_eval.providers import get_provider

        provider = get_provider(
            "gemma4:latest", runtime="ollama_cloud", api_key="test-secret-key"
        )
        self.assertEqual(provider.base_url, "https://ollama.com/v1")
        self.assertEqual(provider.model, "gemma4:latest")

    def test_request_key_overrides_env(self) -> None:
        from cv_eval.providers import get_provider

        os.environ["GEMINI_API_KEY"] = "env-should-not-win"
        try:
            provider = get_provider(
                "gemini-3.5-flash", runtime="gemini", api_key="request-key"
            )
            self.assertEqual(provider._api_key, "request-key")
        finally:
            os.environ.pop("GEMINI_API_KEY", None)

    def test_http_path_does_not_read_env(self) -> None:
        from cv_eval.providers import get_provider
        from cv_eval.runtimes import cli_api_key

        os.environ["GEMINI_API_KEY"] = "env-secret"
        try:
            with self.assertRaises(ValueError):
                get_provider("gemini-3.5-flash", runtime="gemini", api_key="")
            self.assertEqual(cli_api_key("gemini", None), "env-secret")
            self.assertEqual(cli_api_key("gemini", "typed"), "typed")
        finally:
            os.environ.pop("GEMINI_API_KEY", None)

    def test_models_endpoint_shape(self) -> None:
        client = TestClient(api_app)
        response = client.get("/models")
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertIn("available", body)
        self.assertIn("runtimes", body)
        gemini = body["runtimes"]["gemini"]
        self.assertEqual(gemini["default"], "gemini-3.5-flash")
        self.assertTrue(gemini["requires_key"])
        self.assertIn("gemini-3.5-flash", gemini["models"])
        self.assertNotIn("gemini-3.5-flash", body["available"])
        ollama_cloud = body["runtimes"]["ollama_cloud"]
        self.assertEqual(ollama_cloud["default"], "gemma4:latest")
        self.assertTrue(ollama_cloud["requires_key"])
        local = body["runtimes"]["local"]
        self.assertFalse(local["requires_key"])

    def test_evaluate_rejects_cloud_without_key(self) -> None:
        client = TestClient(api_app)
        response = client.post(
            "/evaluate",
            files={"file": ("resume.pdf", b"%PDF-1.4 dummy", "application/pdf")},
            data={"runtime": "gemini", "model": "gemini-3.5-flash"},
        )
        self.assertEqual(response.status_code, 400)
        detail = response.json()["detail"]
        self.assertIn("API key", detail)
        self.assertNotIn("test-secret", detail)

    def test_evaluate_ignores_server_env_key(self) -> None:
        os.environ["GEMINI_API_KEY"] = "env-must-not-unlock-http"
        try:
            client = TestClient(api_app)
            response = client.post(
                "/evaluate",
                files={"file": ("resume.pdf", b"%PDF-1.4 dummy", "application/pdf")},
                data={"runtime": "gemini", "model": "gemini-3.5-flash"},
            )
            self.assertEqual(response.status_code, 400)
            self.assertIn("API key", response.json()["detail"])
            self.assertNotIn("env-must-not-unlock-http", response.text)
        finally:
            os.environ.pop("GEMINI_API_KEY", None)


if __name__ == "__main__":
    unittest.main()
