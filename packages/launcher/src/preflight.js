import { exists, run } from "./exec.js";
import { detail, fail, ok, step, warn } from "./log.js";

const OLLAMA_URL = process.env.OLLAMA_HOST || "http://127.0.0.1:11434";

async function findPython() {
  for (const candidate of ["python3", "python"]) {
    try {
      const version = await run(candidate, ["--version"]);
      const match = version.match(/(\d+)\.(\d+)/);
      if (match && Number(match[1]) === 3 && Number(match[2]) >= 11) {
        return { command: candidate, version: version.trim() };
      }
    } catch {
      // try the next candidate
    }
  }
  return null;
}

async function listModels() {
  try {
    const response = await fetch(`${OLLAMA_URL}/api/tags`, {
      signal: AbortSignal.timeout(2000),
    });
    if (!response.ok) return null;
    const body = await response.json();
    return (body.models ?? []).map((model) => model.name);
  } catch {
    return null;
  }
}

/**
 * Verify the host can run the stack. Returns the resolved Python command.
 * Throws with actionable guidance rather than letting a later step fail oddly.
 *
 * `ollama`:
 *   - required — hard fail if Ollama is down or has no models (CLI default)
 *   - optional — warn and continue so the UI can take a Gemini / Ollama Cloud key
 *   - skip — do not check (web-only, or CLI with --runtime gemini|ollama_cloud)
 */
export async function preflight({
  needsNode,
  needsPython = true,
  ollama = "required",
}) {
  step("Checking your environment");

  let pythonCommand = null;
  if (needsPython) {
    const python = await findPython();
    if (!python) {
      fail("Python 3.11+ is required and was not found on PATH.");
      detail("Install it from https://www.python.org/downloads/ and retry.");
      throw new Error("missing python");
    }
    ok(`${python.version}`);
    pythonCommand = python.command;
  }

  if (needsNode) {
    const major = Number(process.versions.node.split(".")[0]);
    if (major < 20) {
      fail(`Node.js 20+ is required for the web UI (found ${process.versions.node}).`);
      throw new Error("node too old");
    }
    ok(`Node.js ${process.versions.node}`);

    if (!(await exists("npm"))) {
      fail("npm was not found on PATH.");
      throw new Error("missing npm");
    }
  }

  if (ollama !== "skip") {
    const models = await listModels();
    if (models === null || models.length === 0) {
      const missing =
        models === null
          ? `No Ollama server responded at ${OLLAMA_URL}.`
          : "Ollama is running but has no models installed.";
      if (ollama === "required") {
        fail(missing);
        detail(
          models === null
            ? "Install from https://ollama.com, then run: ollama serve"
            : "Pull one, for example: ollama pull gemma4:latest",
        );
        throw new Error(models === null ? "ollama unreachable" : "no models");
      }
      warn(missing);
      detail("Paste a Gemini or Ollama Cloud key on step 03, or install Ollama.");
    } else {
      ok(`Ollama with ${models.length} model${models.length === 1 ? "" : "s"}`);
    }
  }

  return pythonCommand;
}
