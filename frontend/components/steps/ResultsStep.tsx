"use client";

import type { EvaluationResult, RuntimeName } from "../../lib/types";
import { humanizeModel } from "../../lib/format";
import { parseRuntime, runtimeLabel } from "../../lib/runtimes";
import Chip, { type ChipTone } from "../Chip";
import ResultCard from "../ResultCard";

interface ResultsStepProps {
  result: EvaluationResult;
  onDownload: () => void;
}

function runtimeTone(runtime: RuntimeName): ChipTone {
  switch (runtime) {
    case "local":
      return "neutral";
    case "ollama_cloud":
    case "gemini":
      return "warning";
    default: {
      const _never: never = runtime;
      return _never;
    }
  }
}

export default function ResultsStep({ result, onDownload }: ResultsStepProps) {
  const sorted = [...result.evaluations].sort((a, b) => b.overall - a.overall);
  const runtime = parseRuntime(result.runtime);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-gold">
            Step 05
          </p>
          <h2 className="mt-2 font-display text-3xl text-white md:text-4xl">
            {result.candidate_name || "Results"}
          </h2>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Chip tone="model" icon="◆">
              {humanizeModel(result.model)}
            </Chip>
            <Chip tone={runtimeTone(runtime)}>{runtimeLabel(runtime)}</Chip>
            <Chip tone={result.github_enriched ? "positive" : "neutral"}>
              {result.github_enriched ? "GitHub enriched" : "GitHub off"}
            </Chip>
            <Chip tone="neutral">
              {sorted.length} {sorted.length === 1 ? "rubric" : "rubrics"}
            </Chip>
          </div>
        </div>
        <button
          type="button"
          onClick={onDownload}
          className="rounded-full border border-white/15 px-4 py-2 text-xs uppercase tracking-[0.16em] text-white transition hover:border-gold hover:text-gold"
        >
          Download JSON
        </button>
      </div>

      <div className="space-y-5">
        {sorted.map((ev) => (
          <ResultCard key={ev.role} ev={ev} />
        ))}
      </div>
    </div>
  );
}
