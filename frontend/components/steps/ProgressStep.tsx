"use client";

import { useEta } from "../../hooks/useEta";
import type { LiveStage } from "../../hooks/useEvaluator";
import type { RoleEvaluation } from "../../lib/types";
import ResultCard from "../ResultCard";

interface ProgressStepProps {
  stages: LiveStage[];
  partials: RoleEvaluation[];
  startedAt: number | null;
  error: string;
}

function progressPct(stages: LiveStage[]): number {
  if (!stages.length) return 6;
  const finished = stages.filter(
    (s) => s.status === "done" || s.status === "skipped" || s.status === "error",
  ).length;
  const running = stages.filter((s) => s.status === "running").length;
  return Math.min(99, Math.round(((finished + running * 0.45) / stages.length) * 100));
}

function stageMark(status: LiveStage["status"]): string {
  switch (status) {
    case "running":
      return "◉";
    case "done":
      return "✓";
    case "skipped":
      return "–";
    case "error":
      return "!";
    case "pending":
      return "○";
    default: {
      const _never: never = status;
      return _never;
    }
  }
}

export default function ProgressStep({
  stages,
  partials,
  startedAt,
  error,
}: ProgressStepProps) {
  const eta = useEta(stages, startedAt);
  const pct = progressPct(stages);
  const current = stages.find((s) => s.status === "running");

  return (
    <div className="space-y-8">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-gold">
          Step 04
        </p>
        <h2 className="mt-2 font-display text-3xl text-white md:text-4xl">
          Evaluating
        </h2>
        <p className="mt-3 text-sm text-mist">
          {current ? current.label : eta}
        </p>
      </div>

      <div>
        <div className="mb-2 flex items-end justify-between font-mono text-[11px] text-mist">
          <span>{pct}%</span>
          <span>{eta}</span>
        </div>
        <div className="h-1 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full bg-gold transition-all duration-700 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <ol className="space-y-1">
        {stages.map((stage) => (
          <li
            key={stage.id}
            className={`flex items-start gap-3 rounded-lg px-3 py-2 text-sm transition ${
              stage.status === "running"
                ? "bg-gold/10 text-white"
                : stage.status === "done"
                  ? "text-white/80"
                  : "text-mist"
            }`}
          >
            <span className="mt-0.5 w-4 font-mono text-xs text-gold">
              {stageMark(stage.status)}
            </span>
            <span>
              {stage.label}
              {stage.detail ? (
                <span className="block text-xs text-mist">{stage.detail}</span>
              ) : null}
            </span>
          </li>
        ))}
      </ol>

      {error && (
        <p className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </p>
      )}

      {partials.length > 0 && (
        <div className="space-y-4">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-gold">
            Results as they complete
          </p>
          {partials.map((ev) => (
            <ResultCard key={ev.role} ev={ev} />
          ))}
        </div>
      )}
    </div>
  );
}
