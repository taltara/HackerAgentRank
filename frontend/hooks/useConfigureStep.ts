"use client";

import { useMemo } from "react";
import type { ModelsInfo, RuntimeName } from "../lib/types";
import {
  RUNTIME_ORDER,
  catalogFor,
  defaultForRuntime,
  isCloudRuntime,
  modelsForRuntime,
  runtimeLabel,
} from "../lib/runtimes";

interface UseConfigureStepArgs {
  models: ModelsInfo | null;
  runtime: RuntimeName;
}

export function useConfigureStep({ models, runtime }: UseConfigureStepArgs) {
  const catalog = useMemo(
    () => catalogFor(models?.runtimes, runtime),
    [models, runtime],
  );
  const options = useMemo(
    () => modelsForRuntime(models?.runtimes, runtime, models?.available),
    [models, runtime],
  );
  const cloud = isCloudRuntime(runtime);
  const localEmpty = runtime === "local" && options.length === 0;
  const keyHelp = catalog.key_help ?? null;

  return {
    catalog,
    options,
    cloud,
    localEmpty,
    keyHelp,
    runtimes: RUNTIME_ORDER,
    runtimeLabel,
    suggestedDefault: defaultForRuntime(
      models?.runtimes,
      runtime,
      models?.available,
    ),
  };
}
