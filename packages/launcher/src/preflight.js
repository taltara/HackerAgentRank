import { exists, run } from "./exec.js";
import { detail, fail, ok, step } from "./log.js";

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
 */
export async function preflight({
  needsNode,
  needsPython = true,
  needsOllama = true,
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

  if (needsOllama) {
    const models = await listModels();
    if (models === null) {
      fail(`No Ollama server responded at ${OLLAMA_URL}.`);
      detail("Install from https://ollama.com, then run: ollama serve");
      throw new Error("ollama unreachable");
    }
    if (models.length === 0) {
      fail("Ollama is running but has no models installed.");
      detail("Pull one, for example: ollama pull gemma3:12b");
      throw new Error("no models");
    }
    ok(`Ollama with ${models.length} model${models.length === 1 ? "" : "s"}`);
  }

  return pythonCommand;
}
