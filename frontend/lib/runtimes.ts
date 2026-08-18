export type RuntimeName = "local" | "ollama_cloud" | "gemini";

export interface RuntimeCatalog {
  label: string;
  default: string;
  models: string[];
  requires_key?: boolean;
  key_help?: string | null;
}

export const RUNTIME_ORDER: RuntimeName[] = ["local", "ollama_cloud", "gemini"];

const FALLBACK: Record<RuntimeName, RuntimeCatalog> = {
  local: {
    label: "Local Ollama",
    default: "gemma4:latest",
    models: [],
    requires_key: false,
    key_help: null,
  },
  ollama_cloud: {
    label: "Ollama Cloud",
    default: "gemma4:latest",
    models: ["gemma4:latest", "gemma4:26b"],
    requires_key: true,
    key_help: "https://ollama.com/settings/keys",
  },
  gemini: {
    label: "Gemini",
    default: "gemini-3.5-flash",
    models: ["gemini-3.5-flash", "gemini-3.7-flash", "gemini-2.5-flash"],
    requires_key: true,
    key_help: "https://aistudio.google.com/apikey",
  },
};

export function isRuntimeName(value: string): value is RuntimeName {
  return value === "local" || value === "ollama_cloud" || value === "gemini";
}

export function parseRuntime(value: string | undefined | null): RuntimeName {
  if (value && isRuntimeName(value)) return value;
  return "local";
}

export function isCloudRuntime(runtime: RuntimeName): boolean {
  switch (runtime) {
    case "local":
      return false;
    case "ollama_cloud":
    case "gemini":
      return true;
    default: {
      const _never: never = runtime;
      return _never;
    }
  }
}

export function runtimeLabel(runtime: RuntimeName): string {
  switch (runtime) {
    case "local":
      return "Local Ollama";
    case "ollama_cloud":
      return "Ollama Cloud";
    case "gemini":
      return "Gemini";
    default: {
      const _never: never = runtime;
      return _never;
    }
  }
}

export function catalogFor(
  runtimes: Record<string, RuntimeCatalog> | undefined,
  runtime: RuntimeName,
): RuntimeCatalog {
  return runtimes?.[runtime] ?? FALLBACK[runtime];
}

export function modelsForRuntime(
  runtimes: Record<string, RuntimeCatalog> | undefined,
  runtime: RuntimeName,
  available: string[] | undefined,
): string[] {
  const catalog = catalogFor(runtimes, runtime);
  if (runtime === "local" && catalog.models.length === 0) {
    return available ?? [];
  }
  return catalog.models;
}

export function defaultForRuntime(
  runtimes: Record<string, RuntimeCatalog> | undefined,
  runtime: RuntimeName,
  available: string[] | undefined,
): string {
  const models = modelsForRuntime(runtimes, runtime, available);
  const preferred = catalogFor(runtimes, runtime).default;
  if (preferred && models.includes(preferred)) return preferred;
  return models[0] ?? "";
}
