import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readdir, rename, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { run } from "./exec.js";
import { detail, ok, step } from "./log.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const TARBALL =
  "https://codeload.github.com/taltara/HackerAgentRank/tar.gz/refs/heads/main";

const isProjectRoot = (dir) =>
  existsSync(join(dir, "backend", "cv_eval")) &&
  existsSync(join(dir, "frontend", "package.json"));

/** Walk up from a starting directory looking for the project root. */
function findUpwards(from) {
  let dir = resolve(from);
  for (let depth = 0; depth < 6; depth += 1) {
    if (isProjectRoot(dir)) return dir;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

async function download(cacheDir) {
  step("Downloading CV Evaluator");
  detail(TARBALL);

  const response = await fetch(TARBALL, { redirect: "follow" });
  if (!response.ok) {
    throw new Error(
      `Download failed (HTTP ${response.status}). Clone the repository instead: ` +
        "git clone https://github.com/taltara/HackerAgentRank.git",
    );
  }

  const staging = await mkdtemp(join(tmpdir(), "cv-evaluator-"));
  const archive = join(staging, "source.tar.gz");
  await writeFile(archive, Buffer.from(await response.arrayBuffer()));
  await run("tar", ["-xzf", archive, "-C", staging]);

  const entries = await readdir(staging, { withFileTypes: true });
  const extracted = entries.find((entry) => entry.isDirectory());
  if (!extracted) throw new Error("Downloaded archive was empty.");

  // The repository root holds the project in cv-evaluator/.
  const inner = join(staging, extracted.name, "cv-evaluator");
  const source = existsSync(inner) ? inner : join(staging, extracted.name);

  await rm(cacheDir, { recursive: true, force: true });
  await mkdir(dirname(cacheDir), { recursive: true });
  await rename(source, cacheDir);
  await rm(staging, { recursive: true, force: true });

  ok(`Installed to ${cacheDir}`);
  return cacheDir;
}

/**
 * Resolve the project directory to run from.
 *
 * Prefers a checkout the user is already standing in (so contributors run their
 * own code), then a previously downloaded copy, then a fresh download.
 */
export async function resolveApp({ cacheDir, refresh }) {
  const local = findUpwards(process.cwd()) ?? findUpwards(HERE);
  if (local) {
    ok(`Using local checkout at ${local}`);
    return local;
  }

  if (!refresh && isProjectRoot(cacheDir)) {
    ok(`Using cached copy at ${cacheDir}`);
    detail("Run with --refresh to download the latest version.");
    return cacheDir;
  }

  return download(cacheDir);
}
