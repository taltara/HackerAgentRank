"use client";

import { useState } from "react";
import AppShell from "../../../components/AppShell";
import RubricStep from "../../../components/steps/RubricStep";
import { DEMO_ROLES } from "../../../lib/demo";

/**
 * Static showcase of the rubric picker with the shipped catalog. Used for
 * screenshots and for working on the picker without a backend.
 */
export default function DemoRubricsPage() {
  const [selected, setSelected] = useState<string[]>([
    "senior_full_stack_engineer",
  ]);

  return (
    <AppShell
      step="rubric"
      connection="connected"
      footer={
        <div className="mt-10 flex items-center justify-between gap-3">
          <span className="text-xs uppercase tracking-[0.18em] text-mist opacity-30">
            Back
          </span>
          <span className="rounded-full bg-gold px-6 py-2.5 text-sm font-medium text-ink">
            Continue
          </span>
        </div>
      }
    >
      <RubricStep
        roles={DEMO_ROLES}
        selected={selected}
        onChange={setSelected}
      />
    </AppShell>
  );
}
