"use client";

import type { RoleSummary } from "../../lib/types";
import RubricPicker from "../RubricPicker";

interface RubricStepProps {
  roles: RoleSummary[];
  selected: string[];
  onChange: (selected: string[]) => void;
}

export default function RubricStep({ roles, selected, onChange }: RubricStepProps) {
  const available = roles.filter((role) => !selected.includes(role.name));
  const chosen = roles.filter((role) => selected.includes(role.name));

  const add = (name: string) => {
    if (!name || selected.includes(name)) return;
    onChange([...selected, name]);
  };

  const remove = (name: string) => {
    onChange(selected.filter((item) => item !== name));
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-gold">
          Step 02
        </p>
        <h2 className="mt-2 font-display text-3xl text-white md:text-4xl">
          Select rubrics
        </h2>
        <p className="mt-3 max-w-lg text-sm leading-relaxed text-mist">
          Score one CV against one or more roles. Nothing is selected until you
          add it. Use several rubrics when you want a comparison, not a single
          verdict.
        </p>
      </div>

      <RubricPicker available={available} onAdd={add} />

      <div className="space-y-3">
        {chosen.length === 0 && (
          <p className="rounded-xl border border-white/10 px-4 py-6 text-sm text-mist">
            No rubric selected. Add at least one to continue.
          </p>
        )}
        {chosen.map((role) => (
          <div
            key={role.name}
            className="flex items-start justify-between gap-4 rounded-xl border border-gold/20 bg-gold/5 px-4 py-4"
          >
            <div>
              <p className="text-[11px] uppercase tracking-[0.14em] text-gold/70">
                {role.department}
              </p>
              <p className="mt-1 font-medium text-white">{role.position_title}</p>
              <p className="mt-1 text-xs leading-relaxed text-mist">
                {role.description || role.name}
              </p>
              <p className="mt-2 font-mono text-[11px] text-gold/80">
                max {role.max_final_score} · {role.categories.length} categories
              </p>
            </div>
            <button
              type="button"
              onClick={() => remove(role.name)}
              className="shrink-0 text-xs uppercase tracking-widest text-mist transition hover:text-white"
            >
              Remove
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
