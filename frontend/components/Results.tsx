"use client";

import type { EvaluationResult } from "../lib/types";
import ResultCard from "./ResultCard";

interface ResultsProps {
  result: EvaluationResult;
  onDownload: () => void;
}

/**
 * Comparison view: one card per rubric, plus a summary strip. When a single
 * rubric is chosen the comparison chrome collapses to just that card.
 */
export default function Results({ result, onDownload }: ResultsProps) {
  const multi = result.evaluations.length > 1;

  // Sort by overall score, descending, so the best fit floats to the top.
  const sorted = [...result.evaluations].sort((a, b) => b.overall - a.overall);

  return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-800">
              {result.candidate_name || "Candidate"}
            </h2>
            <p className="text-xs text-slate-400">
              model: <span className="font-mono">{result.model}</span>
              {result.github_enriched && " · + GitHub signals"}
            </p>
          </div>
          <button
            type="button"
            onClick={onDownload}
            className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-900"
            >
              Download JSON
            </button>
        </div>

        {multi && (
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {sorted.map((ev) => {
            const best = ev === sorted[0];
            return (
              <div
              key={ev.role}
              className={`rounded-lg border p-3 ${
               best
                ? "border-indigo-500 bg-indigo-50"
                : "border-slate-200 bg-white"
              }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700">
                    {ev.position_title}
                  </span>
                  {best && (
                    <span className="text-[10px] font-bold uppercase text-indigo-600">
                     Best fit
                    </span>
                  )}
                </div>
                <div className="mt-1 text-2xl font-bold tabular-nums text-slate-800">
                  {ev.overall}
                  <span className="text-sm font-normal text-slate-400">
                   /{ev.max_final_score}
                  </span>
                </div>
              </div>
            );
           })}
         </div>
        )}

        <div className="space-y-6">
          {sorted.map((ev) => (
            <ResultCard key={ev.role} ev={ev} />
          ))}
        </div>
      </div>
     );
}
