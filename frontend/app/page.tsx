"use client";

import { AnimatePresence, motion } from "framer-motion";
import AppShell, { type ConnectionState } from "../components/AppShell";
import ConfigureStep from "../components/steps/ConfigureStep";
import ProgressStep from "../components/steps/ProgressStep";
import ResultsStep from "../components/steps/ResultsStep";
import RubricStep from "../components/steps/RubricStep";
import UploadStep from "../components/steps/UploadStep";
import { useEvaluator } from "../hooks/useEvaluator";
import type { WizardStep } from "../lib/wizard";

const panelMotion = {
  initial: { opacity: 0, y: 18, filter: "blur(8px)" },
  animate: { opacity: 1, y: 0, filter: "blur(0px)" },
  exit: { opacity: 0, y: -14, filter: "blur(8px)" },
  transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] as const },
};

function StepBody(props: ReturnType<typeof useEvaluator>) {
  switch (props.step) {
    case "upload":
      return <UploadStep value={props.file} onChange={props.setFile} />;
    case "rubric":
      return (
        <RubricStep
          roles={props.roles}
          selected={props.selectedRoles}
          onChange={props.setSelectedRoles}
        />
      );
    case "configure":
      return (
        <ConfigureStep
          models={props.models}
          model={props.model}
          onModel={props.setModel}
          enrich={props.enrich}
          onEnrich={props.setEnrich}
        />
      );
    case "run":
      return (
        <ProgressStep
          stages={props.stages}
          partials={props.partials}
          startedAt={props.startedAt}
          error={props.error}
        />
      );
    case "results":
      return props.result ? (
        <ResultsStep result={props.result} onDownload={props.downloadJson} />
      ) : (
        <ProgressStep
          stages={props.stages}
          partials={props.partials}
          startedAt={props.startedAt}
          error={props.error}
        />
      );
    default: {
      const _never: never = props.step;
      return _never;
    }
  }
}

function primaryAction(
  step: WizardStep,
  status: ReturnType<typeof useEvaluator>["status"],
): string {
  switch (step) {
    case "upload":
    case "rubric":
      return "Continue";
    case "configure":
      return "Run evaluation";
    case "run":
      return status === "error" ? "Retry" : "Evaluating…";
    case "results":
      return "New evaluation";
    default: {
      const _never: never = step;
      return _never;
    }
  }
}

function connectionState(backendOk: boolean | null): ConnectionState {
  if (backendOk === true) return "connected";
  if (backendOk === false) return "offline";
  return "connecting";
}

export default function Home() {
  const ev = useEvaluator();

  const onPrimary = () => {
    switch (ev.step) {
      case "upload":
      case "rubric":
        ev.goNext();
        return;
      case "configure":
        void ev.run();
        return;
      case "run":
        if (ev.status === "error") void ev.run();
        return;
      case "results":
        ev.setFile(null);
        ev.setSelectedRoles([]);
        ev.setStep("upload");
        return;
      default: {
        const _never: never = ev.step;
        return _never;
      }
    }
  };

  const primaryDisabled =
    (ev.step === "run" && ev.status === "running") ||
    ((ev.step === "upload" || ev.step === "rubric" || ev.step === "configure") &&
      !ev.canAdvance);

  return (
    <AppShell
      step={ev.step}
      connection={connectionState(ev.backendOk)}
      footer={
        <div className="mt-10 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={ev.goBack}
            disabled={ev.step === "upload" || ev.status === "running"}
            className="text-xs uppercase tracking-[0.18em] text-mist transition hover:text-white disabled:opacity-30"
          >
            Back
          </button>
          <button
            type="button"
            onClick={onPrimary}
            disabled={primaryDisabled}
            className="rounded-full bg-gold px-6 py-2.5 text-sm font-medium text-ink transition hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {primaryAction(ev.step, ev.status)}
          </button>
        </div>
      }
    >
      <AnimatePresence mode="wait">
        <motion.div key={ev.step} {...panelMotion}>
          <StepBody {...ev} />
        </motion.div>
      </AnimatePresence>
    </AppShell>
  );
}
