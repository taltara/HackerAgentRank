"use client";

import { STEP_COPY, WIZARD_STEPS, type WizardStep } from "../lib/wizard";

interface StepperRailProps {
  current: WizardStep;
}

function discClass(state: "done" | "active" | "idle"): string {
  const base =
    "relative z-10 mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-mono";
  switch (state) {
    case "active":
      return `${base} bg-gold text-[#07070b] shadow-glow`;
    case "done":
      return `${base} border border-gold/60 bg-[#07070b] text-gold`;
    case "idle":
      return `${base} border border-white/15 bg-[#07070b] text-mist`;
    default: {
      const _never: never = state;
      return _never;
    }
  }
}

export default function StepperRail({ current }: StepperRailProps) {
  const currentIndex = WIZARD_STEPS.indexOf(current);

  return (
    <ol className="flex flex-col gap-1">
      {WIZARD_STEPS.map((id, index) => {
        const copy = STEP_COPY[id];
        const state =
          index < currentIndex ? "done" : index === currentIndex ? "active" : "idle";
        return (
          <li key={id} className="relative flex items-start gap-3 py-2">
            {index < WIZARD_STEPS.length - 1 && (
              <span
                className={`absolute left-[11px] top-8 z-0 h-[calc(100%-8px)] w-px ${
                  state === "idle" ? "bg-white/10" : "bg-gold/50"
                }`}
              />
            )}
            <span className={discClass(state)}>{copy.index}</span>
            <div className="min-w-0">
              <p
                className={`text-sm font-medium ${
                  state === "idle" ? "text-mist" : "text-white"
                }`}
              >
                {copy.title}
              </p>
              <p className="text-[11px] uppercase tracking-[0.16em] text-mist/80">
                {copy.hint}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
