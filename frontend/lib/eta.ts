import type { StageStatus } from "./types";

export type StageRef = {
  id: string;
  status: StageStatus;
  startedAt?: number | null;
};

/**
 * Prior duration (seconds) per stage family. Calibrated from local Gemma 4 runs.
 * These are budgets, not averages — remaining time counts the budget down and
 * never inflates it.
 */
const PRIOR_SEC = {
  parse_pdf: 4,
  extract: 22,
  github: 10,
  score: 28,
  other: 15,
} as const;

export function priorFor(id: string): number {
  if (id === "parse_pdf") return PRIOR_SEC.parse_pdf;
  if (id === "github") return PRIOR_SEC.github;
  if (id.startsWith("extract.")) return PRIOR_SEC.extract;
  if (id.startsWith("score.")) return PRIOR_SEC.score;
  return PRIOR_SEC.other;
}

function isFinished(status: StageStatus): boolean {
  return status === "done" || status === "skipped" || status === "error";
}

/**
 * Work-remaining estimator used by CI dashboards and download UIs:
 * unfinished stages keep their full prior; the running stage counts down
 * to 0 and stays at 0 if it overruns. The total therefore never increases
 * unless stages are added.
 */
export function remainingSeconds(
  stages: StageRef[],
  currentStartedAt: number | null,
  now: number,
): number {
  if (!stages.length) return 0;
  const unfinished = stages.filter((stage) => !isFinished(stage.status));
  if (!unfinished.length) return 0;

  let total = 0;
  for (const stage of unfinished) {
    if (stage.status === "running" && currentStartedAt != null) {
      const elapsed = Math.max(0, (now - currentStartedAt) / 1000);
      total += Math.max(0, priorFor(stage.id) - elapsed);
    } else {
      total += priorFor(stage.id);
    }
  }
  return total;
}

/**
 * Coarse buckets (YouTube / Chrome download style). Seconds that tick up and
 * down look broken; minute-scale labels only move when the estimate actually
 * drops a band.
 */
export function formatRemaining(seconds: number): string {
  if (seconds <= 0) return "Finishing…";
  if (seconds < 45) return "Less than a minute";
  if (seconds < 90) return "About 1 minute";
  const minutes = Math.round(seconds / 60);
  return `About ${minutes} minutes`;
}

export function applyMonotonicFloor(
  previous: number | null,
  next: number,
): number {
  if (previous == null) return next;
  return Math.min(previous, next);
}
