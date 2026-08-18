import { homedir } from "node:os";
import { join } from "node:path";

import { resolveApp } from "./app-source.js";
import { prepareBackend, startBackend, waitForBackend } from "./backend.js";
import { prepareFrontend, startFrontend, waitForFrontend } from "./frontend.js";
import { start } from "./exec.js";
import { banner, bold, detail, fail, gold, ok, step, warn } from "./log.js";
import { preflight } from "./preflight.js";

const CACHE_DIR = join(homedir(), ".cv-evaluator", "app");

function openBrowser(url) {
  const command =
    process.platform === "darwin"
      ? ["open", [url]]
      : process.platform === "win32"
        ? ["cmd", ["/c", "start", "", url]]
        : ["xdg-open", [url]];
  try {
    start(command[0], command[1], { prefix: "open " }).unref();
  } catch {
    // A browser is a convenience; the URL is printed either way.
  }
}

/** Keep the launcher alive until interrupted, then stop both children. */
function superviseUntilExit(children) {
  let stopping = false;
  const stop = () => {
    if (stopping) return;
    stopping = true;
    console.log("");
    step("Shutting down");
    for (const child of children) child.kill("SIGTERM");
    setTimeout(() => {
      for (const child of children) child.kill("SIGKILL");
      process.exit(0);
    }, 4000).unref();
  };

  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);

  for (const child of children) {
    child.on("close", (code) => {
      if (!stopping && code !== 0) {
        fail(`A service exited unexpectedly (code ${code}).`);
        stop();
      }
    });
  }
}

/** Bring up the API and web UI, then open a browser. */
export async function up({ apiPort, webPort, open, refresh }) {
  banner();
  const python = await preflight({ needsNode: true });
  const appDir = await resolveApp({ cacheDir: CACHE_DIR, refresh });

  const { backend, interpreter } = await prepareBackend({ appDir, python });
  const apiUrl = `http://127.0.0.1:${apiPort}`;
  const frontend = await prepareFrontend({ appDir, apiUrl });

  step("Starting services");
  const api = startBackend({ backend, interpreter, port: apiPort });
  if (!(await waitForBackend(apiPort))) {
    api.kill("SIGTERM");
    fail(`The API did not come up on port ${apiPort}.`);
    detail("Is something else already using that port? Try --api-port 8010.");
    process.exitCode = 1;
    return;
  }
  ok(`API on ${apiUrl}`);

  const web = startFrontend({ frontend, port: webPort, apiUrl });
  const webUrl = `http://127.0.0.1:${webPort}`;
  if (!(await waitForFrontend(webPort))) {
    warn(`The web UI is slow to start; it may still appear at ${webUrl}.`);
  } else {
    ok(`Web UI on ${webUrl}`);
  }

  console.log("");
  console.log(`  ${bold("Open")} ${gold(webUrl)}`);
  console.log("  Press Ctrl+C to stop.");
  console.log("");

  if (open) openBrowser(webUrl);
  superviseUntilExit([api, web]);
}

/** Run the Python CLI with the given arguments, provisioning it if needed. */
export async function cli(args, { refresh }) {
  const python = await preflight({ needsNode: false });
  const appDir = await resolveApp({ cacheDir: CACHE_DIR, refresh });
  const { backend, interpreter } = await prepareBackend({ appDir, python });

  const child = start(interpreter, ["-m", "cv_eval", ...args], {
    cwd: backend,
    prefix: "",
    env: { PYTHONUNBUFFERED: "1" },
  });
  child.on("close", (code) => process.exit(code ?? 0));
}
