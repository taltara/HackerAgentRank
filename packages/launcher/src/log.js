const useColor = process.stdout.isTTY && !process.env.NO_COLOR;

const paint = (code, text) => (useColor ? `\u001b[${code}m${text}\u001b[0m` : text);

export const dim = (text) => paint("2", text);
export const bold = (text) => paint("1", text);
export const gold = (text) => paint("33", text);
export const green = (text) => paint("32", text);
export const red = (text) => paint("31", text);

export function step(message) {
  console.log(`${gold("›")} ${message}`);
}

export function ok(message) {
  console.log(`${green("✓")} ${message}`);
}

export function warn(message) {
  console.log(`${gold("!")} ${message}`);
}

export function fail(message) {
  console.error(`${red("✗")} ${message}`);
}

export function detail(message) {
  console.log(`  ${dim(message)}`);
}

export function banner() {
  console.log("");
  console.log(bold("  CV Evaluator"));
  console.log(dim("  Local-first CV scoring against explainable hiring rubrics."));
  console.log("");
}
