import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { run, start } from "./exec.js";
import { ok, step } from "./log.js";

const npm = process.platform === "win32" ? "npm.cmd" : "npm";

/** Marker recording which API URL the current build was compiled against. */
const STAMP = ".cv-evaluator-api-url";

async function builtAgainst(frontend) {
  try {
    return (await readFile(join(frontend, ".next", STAMP), "utf8")).trim();
  } catch {
    return null;
  }
}

export async function prepareFrontend({ appDir, apiUrl }) {
  const frontend = join(appDir, "frontend");

  if (!existsSync(join(frontend, "node_modules"))) {
    step("Installing web UI dependencies (this takes a minute the first time)");
    const lockfile = existsSync(join(frontend, "package-lock.json"));
    await run(npm, [lockfile ? "ci" : "install", "--no-audit", "--no-fund"], {
      cwd: frontend,
    });
    ok("Web UI dependencies ready");
  }

  // NEXT_PUBLIC_* is inlined at build time, so a build made against a different
  // API URL cannot be reused by simply changing the environment at startup.
  if ((await builtAgainst(frontend)) === apiUrl) {
    ok("Web UI ready (cached build)");
    return frontend;
  }

  step("Building the web UI");
  await run(npm, ["run", "build"], {
    cwd: frontend,
    env: { NEXT_TELEMETRY_DISABLED: "1", NEXT_PUBLIC_API_URL: apiUrl },
  });
  await writeFile(join(frontend, ".next", STAMP), apiUrl);
  ok("Web UI ready");

  return frontend;
}

export function startFrontend({ frontend, port, apiUrl }) {
  return start(npm, ["run", "start", "--", "--port", String(port)], {
    cwd: frontend,
    prefix: "web  ",
    env: { NEXT_TELEMETRY_DISABLED: "1", NEXT_PUBLIC_API_URL: apiUrl },
  });
}

export async function waitForFrontend(port, timeoutMs = 90000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/`, {
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
