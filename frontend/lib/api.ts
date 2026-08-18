import type {
  EvaluationResult,
  ModelsInfo,
  PipelineEvent,
  RoleSummary,
} from "./types";

export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText}: ${await res.text()}`);
  }
  return (await res.json()) as T;
}

export function listRoles(): Promise<RoleSummary[]> {
  return getJson<RoleSummary[]>("/roles");
}

export function listModels(): Promise<ModelsInfo> {
  return getJson<ModelsInfo>("/models");
}

export function health(): Promise<{
  status: string;
  default_model: string;
  roles: string[];
}> {
  return getJson("/health");
}

export interface EvaluateOptions {
  file: File;
  roles?: string[] | "all";
  enrich?: boolean;
  model?: string;
}

function toForm(opts: EvaluateOptions): FormData {
  const form = new FormData();
  form.append("file", opts.file);
  form.append(
    "roles",
    opts.roles === "all" ? "all" : (opts.roles ?? []).join(","),
  );
  form.append("enrich", String(opts.enrich ?? true));
  if (opts.model) form.append("model", opts.model);
  return form;
}

function parseSseBlock(block: string): PipelineEvent | null {
  const line = block
    .split("\n")
    .map((part) => part.trim())
    .find((part) => part.startsWith("data:"));
  if (!line) return null;
  const json = line.replace(/^data:\s?/, "");
  return JSON.parse(json) as PipelineEvent;
}

export async function evaluateStream(
  opts: EvaluateOptions,
  onEvent: (event: PipelineEvent) => void,
  signal?: AbortSignal,
): Promise<EvaluationResult | null> {
  const res = await fetch(`${API_BASE}/evaluate/stream`, {
    method: "POST",
    body: toForm(opts),
    signal,
  });
  if (!res.ok || !res.body) {
    throw new Error((await res.text()) || `${res.status} ${res.statusText}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let finalResult: EvaluationResult | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const chunks = buffer.split("\n\n");
    buffer = chunks.pop() ?? "";
    for (const chunk of chunks) {
      const event = parseSseBlock(chunk);
      if (!event) continue;
      onEvent(event);
      if (event.type === "complete") finalResult = event.result;
      if (event.type === "error") throw new Error(event.detail);
    }
  }
  return finalResult;
}
