import { existsSync } from "node:fs";
import { join } from "node:path";

import { run, start } from "./exec.js";
import { ok, step } from "./log.js";

const binDir = (venv) => (process.platform === "win32" ? join(venv, "Scripts") : join(venv, "bin"));

export const venvPython = (venv) =>
  join(binDir(venv), process.platform === "win32" ? "python.exe" : "python");

/** Create the virtualenv and install backend dependencies if needed. */
export async function prepareBackend({ appDir, python }) {
  const backend = join(appDir, "backend");
  const venv = join(backend, ".venv");
  const interpreter = venvPython(venv);

  if (!existsSync(interpreter)) {
    step("Creating the Python environment");
    await run(python, ["-m", "venv", venv]);
  }

  // Cheap idempotence check: skip the install when the entrypoint imports.
  const installed = await run(interpreter, ["-c", "import fastapi"]).then(
    () => true,
    () => false,
  );

  if (!installed) {
    step("Installing backend dependencies (this takes a minute the first time)");
    await run(interpreter, ["-m", "pip", "install", "--quiet", "--upgrade", "pip"]);
    await run(interpreter, [
      "-m",
      "pip",
      "install",
      "--quiet",
      "-r",
      join(backend, "requirements.txt"),
    ]);
    ok("Backend ready");
  } else {
    ok("Backend ready (cached)");
  }

  return { backend, interpreter };
}

export function startBackend({ backend, interpreter, port }) {
  return start(
    interpreter,
    ["-m", "uvicorn", "cv_eval.api:app", "--port", String(port), "--host", "127.0.0.1"],
    { cwd: backend, prefix: "api  ", env: { PYTHONUNBUFFERED: "1" } },
  );
}

/** Poll the health endpoint until the API answers or the timeout elapses. */
export async function waitForBackend(port, timeoutMs = 60000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/health`, {
        signal: AbortSignal.timeout(1500),
      });
      if (response.ok) return true;
    } catch {
      // not up yet
    }
    await new Promise((wake) => setTimeout(wake, 500));
  }
  return false;
}
