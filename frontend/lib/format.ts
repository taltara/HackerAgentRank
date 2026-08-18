/** `senior_full_stack_engineer` -> `Senior Full Stack Engineer`. */
export function humanizeId(id: string): string {
  return id
    .split(/[_\-.]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

/** `gemma4:31b-mlx` -> `Gemma 4 · 31B`, falling back to the raw tag. */
export function humanizeModel(model: string): string {
  if (!model) return "Unknown model";
  const [family, tag] = model.split(":");
  const pretty = family
    .replace(/[-_]/g, " ")
    .replace(/([a-z])(\d)/gi, "$1 $2")
    .replace(/\b\w/g, (c) => c.toUpperCase());
  if (!tag) return pretty;
  const size = tag.match(/\d+(\.\d+)?b/i)?.[0]?.toUpperCase();
  return size ? `${pretty} · ${size}` : pretty;
}

export type ScoreBand = "strong" | "moderate" | "weak";

export function scoreBand(ratio: number): ScoreBand {
  if (ratio >= 0.7) return "strong";
  if (ratio >= 0.4) return "moderate";
  return "weak";
}
