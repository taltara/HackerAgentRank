"use client";

import HintTooltip from "./HintTooltip";

export default function ScoreVarianceHint() {
  return (
    <HintTooltip
      label="Why scores can change between runs"
      glyph="i"
      align="right"
      panelClassName="w-64"
    >
      <p className="text-xs font-medium text-white">Scores vary between runs.</p>
      <p className="mt-2 text-[11px] leading-relaxed text-mist">
        The same CV is typically within ±2–3 points on a re-run, more on close
        calls. Read the evidence; this is a critique, not a grade.
      </p>
    </HintTooltip>
  );
}
