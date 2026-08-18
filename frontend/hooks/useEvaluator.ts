"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { evaluateStream, health, listModels, listRoles } from "../lib/api";
import type {
  EvaluationResult,
  ModelsInfo,
  PipelineEvent,
  PlannedStage,
  RoleEvaluation,
  RoleSummary,
  RuntimeName,
  StageStatus,
} from "../lib/types";
import {
  defaultForRuntime,
  isCloudRuntime,
  modelsForRuntime,
} from "../lib/runtimes";
import { nextStep, prevStep, type WizardStep } from "../lib/wizard";

export type RunStatus = "" | "running" | "done" | "error";

export interface LiveStage extends PlannedStage {
  status: StageStatus;
  detail?: string | null;
  startedAt?: number;
}

function applyEvent(stages: LiveStage[], event: PipelineEvent): LiveStage[] {
  if (event.type === "plan") {
    return event.stages.map((stage) => ({ ...stage, status: "pending" as const }));
  }
  if (event.type !== "stage") return stages;
  const existing = stages.find((stage) => stage.id === event.id);
  const startedAt =
    event.status === "running"
      ? (existing?.startedAt ?? Date.now())
      : existing?.startedAt;
  const next: LiveStage = {
    id: event.id,
    label: event.label,
    status: event.status,
    detail: event.detail ?? existing?.detail,
    startedAt,
  };
  if (!existing) return [...stages, next];
  return stages.map((stage) => (stage.id === event.id ? next : stage));
}

export function useEvaluator() {
  const [roles, setRoles] = useState<RoleSummary[]>([]);
  const [models, setModels] = useState<ModelsInfo | null>(null);
  const [backendOk, setBackendOk] = useState<boolean | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [model, setModel] = useState("");
  const [runtime, setRuntimeState] = useState<RuntimeName>("local");
  const [apiKey, setApiKey] = useState("");
  const [enrich, setEnrich] = useState(false);
  const [step, setStep] = useState<WizardStep>("upload");
  const [status, setStatus] = useState<RunStatus>("");
  const [result, setResult] = useState<EvaluationResult | null>(null);
  const [partials, setPartials] = useState<RoleEvaluation[]>([]);
  const [stages, setStages] = useState<LiveStage[]>([]);
  const [error, setError] = useState("");
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      for (let i = 0; i < 8; i += 1) {
        try {
          const [r, m] = await Promise.all([
            listRoles(),
            listModels().catch(() => null),
          ]);
          await health().catch(() => null);
          if (!alive) return;
          setRoles(r);
          setBackendOk(true);
          if (m) {
            setModels(m);
            setModel((current) =>
              current ||
              defaultForRuntime(m.runtimes, "local", m.available) ||
              m.default,
            );
          }
          return;
        } catch {
          if (!alive) return;
          if (i === 7) setBackendOk(false);
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const canAdvance = useMemo(() => {
    switch (step) {
      case "upload":
        return !!file;
      case "rubric":
        return selectedRoles.length > 0;
      case "configure": {
        const allowed = modelsForRuntime(
          models?.runtimes,
          runtime,
          models?.available,
        );
        if (runtime === "local") return allowed.includes(model);
        return allowed.includes(model) && apiKey.trim().length > 0;
      }
      case "run":
        return status === "done";
      case "results":
        return false;
      default: {
        const _never: never = step;
        return _never;
      }
    }
  }, [step, file, selectedRoles.length, model, runtime, apiKey, status, models]);

  const setRuntime = useCallback(
    (next: RuntimeName) => {
      setRuntimeState(next);
      setModel((current) => {
        const allowed = modelsForRuntime(
          models?.runtimes,
          next,
          models?.available,
        );
        if (allowed.includes(current)) return current;
        return defaultForRuntime(models?.runtimes, next, models?.available);
      });
    },
    [models],
  );

  const goNext = useCallback(() => {
    const nxt = nextStep(step);
    if (!nxt || !canAdvance) return;
    setStep(nxt);
  }, [step, canAdvance]);

  const goBack = useCallback(() => {
    if (status === "running") return;
    const prev = prevStep(step);
    if (prev) setStep(prev);
  }, [step, status]);

  const run = useCallback(async () => {
    if (!file || selectedRoles.length === 0) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setStatus("running");
    setError("");
    setResult(null);
    setPartials([]);
    setStages([]);
    setStartedAt(Date.now());
    setStep("run");
    try {
      const final = await evaluateStream(
        {
          file,
          roles: selectedRoles,
          enrich,
          model: model || undefined,
          runtime,
          apiKey: isCloudRuntime(runtime) ? apiKey : undefined,
        },
        (event: PipelineEvent) => {
          setStages((current) => applyEvent(current, event));
          if (event.type === "partial") {
            setPartials((current) => {
              const rest = current.filter((item) => item.role !== event.evaluation.role);
              return [...rest, event.evaluation];
            });
          }
          if (event.type === "complete") setResult(event.result);
        },
        controller.signal,
      );
      if (final) setResult(final);
      setStatus("done");
      setStep("results");
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      setError(e instanceof Error ? e.message : String(e));
      setStatus("error");
    }
  }, [file, selectedRoles, enrich, model, runtime, apiKey]);

  const downloadJson = useCallback(() => {
    if (!result) return;
    const blob = new Blob([JSON.stringify(result, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cv-eval-${(result.candidate_name || "candidate").replace(/[^a-z0-9]+/gi, "_")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [result]);

  return {
    roles,
    models,
    backendOk,
    file,
    setFile,
    selectedRoles,
    setSelectedRoles,
    model,
    setModel,
    runtime,
    setRuntime,
    apiKey,
    setApiKey,
    enrich,
    setEnrich,
    step,
    setStep,
    status,
    result,
    partials,
    stages,
    error,
    startedAt,
    canAdvance,
    goNext,
    goBack,
    run,
    downloadJson,
  };
}
