"use client";

import type { EvaluationResult } from "../../lib/types";
import { humanizeModel } from "../../lib/format";
import Chip from "../Chip";
import ResultCard from "../ResultCard";

interface ResultsStepProps {
  result: EvaluationResult;
  onDownload: () => void;
}

export default function ResultsStep({ result, onDownload }: ResultsStepProps) {
  const sorted = [...result.evaluations].sort((a, b) => b.overall - a.overall);

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
