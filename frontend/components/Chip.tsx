import type { ReactNode } from "react";

export type ChipTone = "model" | "positive" | "neutral" | "warning";

interface ChipProps {
  tone?: ChipTone;
  icon?: ReactNode;
  children: ReactNode;
}

function toneClass(tone: ChipTone): string {
  switch (tone) {
    case "model":
      return "border-violet-400/30 bg-violet-400/10 text-violet-200";
    case "positive":
      return "border-emerald-400/30 bg-emerald-400/10 text-emerald-200";
    case "warning":
      return "border-gold/30 bg-gold/10 text-gold";
    case "neutral":
      return "border-white/15 bg-white/[0.06] text-mist";
    default: {
      const _never: never = tone;
      return _never;
    }
  }
}

export default function Chip({ tone = "neutral", icon, children }: ChipProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[11px] leading-none ${toneClass(tone)}`}
    >
      {icon ? <span aria-hidden>{icon}</span> : null}
      {children}
    </span>
  );
}
