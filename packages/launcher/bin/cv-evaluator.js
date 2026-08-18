#!/usr/bin/env node
import { cli, up } from "../src/index.js";
import { bold, dim, fail } from "../src/log.js";

const HELP = `
${bold("cv-evaluator")} — local-first CV scoring against explainable hiring rubrics

${bold("Usage")}
  npx cv-evaluator                 Start the API and web UI, then open a browser
  npx cv-evaluator evaluate <cv.pdf>  Score a CV from the terminal
  npx cv-evaluator roles           List the available rubrics

${bold("Options")}
  --api-port <n>    Port for the API        ${dim("(default: 8000)")}
  --web-port <n>    Port for the web UI     ${dim("(default: 3000)")}
  --no-open         Do not open a browser
  --refresh         Re-download the latest version before starting
  -h, --help        Show this message

${bold("Requirements")}
  Python 3.11+, Node.js 20+, and Ollama with at least one model pulled.

${dim("Anything other than the commands above is passed through to the Python CLI.")}
`;

function parse(argv) {
  const options = { apiPort: 8000, webPort: 3000, open: true, refresh: false };
  const rest = [];

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    switch (arg) {
      case "--api-port":
        options.apiPort = Number(argv[++i]);
        break;
      case "--web-port":
        options.webPort = Number(argv[++i]);
        break;
      case "--no-open":
        options.open = false;
        break;
      case "--refresh":
        options.refresh = true;
        break;
      case "-h":
      case "--help":
        options.help = true;
        break;
      default:
        rest.push(arg);
    }
  }

  if (!Number.isInteger(options.apiPort) || !Number.isInteger(options.webPort)) {
    throw new Error("Ports must be integers.");
  }
  return { options, rest };
}

async function main() {
  const { options, rest } = parse(process.argv.slice(2));

  if (options.help) {
    console.log(HELP);
    return;
  }

  if (rest.length === 0) {
    await up(options);
    return;
  }

  await cli(rest, { refresh: options.refresh });
}

main().catch((error) => {
  fail(error.message || String(error));
  process.exitCode = 1;
});
