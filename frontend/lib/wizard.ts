export const WIZARD_STEPS = [
  "upload",
  "rubric",
  "configure",
  "run",
  "results",
] as const;

export type WizardStep = (typeof WIZARD_STEPS)[number];

export const STEP_COPY: Record<
  WizardStep,
  { index: string; title: string; hint: string }
> = {
  upload: { index: "01", title: "Upload", hint: "PDF resume" },
  rubric: { index: "02", title: "Rubric", hint: "Role to score against" },
  configure: { index: "03", title: "Model", hint: "Runtime options" },
  run: { index: "04", title: "Evaluate", hint: "Extract and score" },
  results: { index: "05", title: "Results", hint: "Scores and evidence" },
};

export function nextStep(step: WizardStep): WizardStep | null {
  const i = WIZARD_STEPS.indexOf(step);
  return i < WIZARD_STEPS.length - 1 ? WIZARD_STEPS[i + 1] : null;
}

export function prevStep(step: WizardStep): WizardStep | null {
  const i = WIZARD_STEPS.indexOf(step);
  return i > 0 ? WIZARD_STEPS[i - 1] : null;
}
