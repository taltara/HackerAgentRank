import { spawn } from "node:child_process";

import { dim } from "./log.js";

/** Run a command to completion, streaming output only when it fails. */
export function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: { ...process.env, ...options.env },
      stdio: options.inherit ? "inherit" : ["ignore", "pipe", "pipe"],
    });

    let output = "";
    child.stdout?.on("data", (chunk) => (output += chunk));
    child.stderr?.on("data", (chunk) => (output += chunk));

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve(output);
        return;
      }
      const label = `${command} ${args.join(" ")}`;
      reject(new Error(`${label} exited with code ${code}\n${dim(output.trim())}`));
    });
  });
}

/** Start a long-running process, prefixing each line of its output. */
export function start(command, args, { cwd, env, prefix }) {
  const child = spawn(command, args, {
    cwd,
    env: { ...process.env, ...env },
    stdio: ["ignore", "pipe", "pipe"],
  });

  const relay = (stream) => {
    let buffer = "";
    stream.on("data", (chunk) => {
      buffer += chunk;
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (line.trim()) console.log(`${dim(prefix)} ${line}`);
      }
    });
  };

  relay(child.stdout);
  relay(child.stderr);
  return child;
}

/** True when the command exists and runs. */
export async function exists(command, args = ["--version"]) {
  try {
    await run(command, args);
    return true;
  } catch {
    return false;
  }
}
