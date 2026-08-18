"use client";

import type { ReactNode } from "react";
import { useHintTooltip } from "../hooks/useHintTooltip";

type HintAlign = "center" | "right";

interface HintTooltipProps {
  label: string;
  glyph?: string;
  align?: HintAlign;
  panelClassName?: string;
  children: ReactNode;
}

function alignClass(align: HintAlign): string {
  switch (align) {
    case "center":
      return "left-1/2 -translate-x-1/2";
    case "right":
      return "right-0";
    default: {
      const _never: never = align;
      return _never;
    }
  }
}

export default function HintTooltip({
  label,
  glyph = "?",
  align = "center",
  panelClassName = "w-56",
  children,
}: HintTooltipProps) {
  const { labelId, open, show, hide, toggle } = useHintTooltip();

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-describedby={open ? labelId : undefined}
        onClick={toggle}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        className="flex h-5 w-5 items-center justify-center rounded-full border border-white/25 font-mono text-[11px] text-mist transition hover:border-gold hover:text-gold"
      >
        {glyph}
      </button>
      {open ? (
        <div
          id={labelId}
          role="tooltip"
          className={`absolute top-[calc(100%+8px)] z-20 rounded-xl border border-white/10 bg-ink px-3 py-3 text-left shadow-xl ${alignClass(align)} ${panelClassName}`}
        >
          {children}
        </div>
      ) : null}
    </span>
  );
}
