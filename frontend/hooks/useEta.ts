"use client";

import { useEffect, useState } from "react";
import {
  applyMonotonicFloor,
  formatRemaining,
  remainingSeconds,
  type StageRef,
} from "../lib/eta";

/**
 * Remaining time that is allowed to fall or hold, never rise.
 *
 * Stage start times are stamped when the pipeline event arrives (not during
 * render). This hook only ticks the clock and keeps a low-water floor.
 */
export function useEta(stages: StageRef[], runId: number | null): string {
  const [now, setNow] = useState(() => Date.now());
  const [trackedRunId, setTrackedRunId] = useState(runId);
  const [floor, setFloor] = useState<number | null>(null);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  if (!stages.length) return "Estimating…";

  const unfinished = stages.some(
    (stage) =>
      stage.status !== "done" &&
      stage.status !== "skipped" &&
      stage.status !== "error",
  );
  if (!unfinished) return "Wrapping up";

  const running = stages.find((stage) => stage.status === "running");
  const raw = remainingSeconds(stages, running?.startedAt ?? null, now);
  const nextFloor =
    runId !== trackedRunId ? raw : applyMonotonicFloor(floor, raw);

  if (runId !== trackedRunId) {
    setTrackedRunId(runId);
    setFloor(raw);
  } else if (nextFloor !== floor) {
    setFloor(nextFloor);
  }

  return formatRemaining(nextFloor);
}
