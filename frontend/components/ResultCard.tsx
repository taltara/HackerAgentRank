"use client";

import type { RoleEvaluation } from "../lib/types";
import { scoreBand } from "../lib/format";
import { useCollapsibleCategories } from "../hooks/useCollapsibleCategories";
import CategoryRow from "./CategoryRow";
import ScoreVarianceHint from "./ScoreVarianceHint";

interface ResultCardProps {
  ev: RoleEvaluation;
}

function tone(ratio: number): string {
  const band = scoreBand(ratio);
  switch (band) {
    case "strong":
      return "text-emerald-400";
    case "moderate":
      return "text-gold";
    case "weak":
      return "text-rose-400";
    default: {
      const _never: never = band;
      return _never;
    }
  }
}

export default function ResultCard({ ev }: ResultCardProps) {
  const keys = ev.categories.map((category) => category.key);
  const { isExpanded, toggle, toggleAll, allExpanded } =
    useCollapsibleCategories(keys);
  const overallRatio =
    ev.max_final_score > 0 ? ev.overall / ev.max_final_score : 0;

  return (
    <article className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
      <header className="flex items-start justify-between gap-4 border-b border-white/10 p-5">
        <div>
          <h3 className="font-display text-xl text-white">{ev.position_title}</h3>
          <button
            type="button"
            onClick={toggleAll}
            className="mt-1 text-[11px] uppercase tracking-[0.14em] text-mist transition hover:text-gold"
          >
            {allExpanded ? "Collapse all" : "Expand all"}
          </button>
        </div>
        <div className="text-right">
          <div className="flex items-start justify-end gap-1.5">
            <p className={`font-display text-4xl tabular-nums ${tone(overallRatio)}`}>
              {ev.overall}
              <span className="text-base text-mist">/{ev.max_final_score}</span>
            </p>
            <span className="mt-1.5">
              <ScoreVarianceHint />
            </span>
          </div>
          <p className="mt-1 text-[11px] text-mist">
            base {ev.total_score}/{ev.total_max}
            {ev.bonus_points > 0 && ` · +${ev.bonus_points} bonus`}
            {ev.deductions > 0 && ` · −${ev.deductions}`}
          </p>
        </div>
      </header>

      <div className="space-y-2 p-5">
        {ev.categories.map((category) => (
          <CategoryRow
            key={category.key}
            category={category}
            expanded={isExpanded(category.key)}
            onToggle={() => toggle(category.key)}
          />
        ))}
      </div>

      {(ev.key_strengths.length > 0 || ev.areas_for_improvement.length > 0) && (
        <div className="grid gap-4 border-t border-white/10 p-5 sm:grid-cols-2">
          {ev.key_strengths.length > 0 && (
            <div>
              <h4 className="text-[11px] uppercase tracking-[0.16em] text-emerald-400">
                Strengths
              </h4>
              <ul className="mt-2 space-y-1.5">
                {ev.key_strengths.map((s) => (
                  <li key={s} className="text-xs leading-relaxed text-white/80">
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {ev.areas_for_improvement.length > 0 && (
            <div>
              <h4 className="text-[11px] uppercase tracking-[0.16em] text-gold">
                Areas to improve
              </h4>
              <ul className="mt-2 space-y-1.5">
                {ev.areas_for_improvement.map((s) => (
                  <li key={s} className="text-xs leading-relaxed text-white/80">
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </article>
  );
}
