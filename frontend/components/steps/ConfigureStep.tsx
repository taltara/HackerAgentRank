"use client";

import KeyPrivacyHint from "../KeyPrivacyHint";
import { useConfigureStep } from "../../hooks/useConfigureStep";
import type { ModelsInfo, RuntimeName } from "../../lib/types";

interface ConfigureStepProps {
  models: ModelsInfo | null;
  runtime: RuntimeName;
  onRuntime: (value: RuntimeName) => void;
  model: string;
  onModel: (value: string) => void;
  apiKey: string;
  onApiKey: (value: string) => void;
  enrich: boolean;
  onEnrich: (value: boolean) => void;
}

export default function ConfigureStep({
  models,
  runtime,
  onRuntime,
  model,
  onModel,
  apiKey,
  onApiKey,
  enrich,
  onEnrich,
}: ConfigureStepProps) {
  const cfg = useConfigureStep({ models, runtime });

  return (
    <div className="space-y-8">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-gold">
          Step 03
        </p>
        <h2 className="mt-2 font-display text-3xl text-white md:text-4xl">
          Choose a model
        </h2>
        <p className="mt-3 max-w-lg text-sm leading-relaxed text-mist">
          Local Gemma 4 stays on this machine. Gemini or Ollama Cloud send the
          CV to that provider for this run only — the key is pasted, used, and
          discarded.
        </p>
      </div>

      <fieldset>
        <legend className="text-xs uppercase tracking-[0.16em] text-mist">
          Runtime
        </legend>
        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
          {cfg.runtimes.map((id) => {
            const selected = id === runtime;
            return (
              <button
                key={id}
                type="button"
                onClick={() => onRuntime(id)}
                className={`rounded-xl border px-3 py-3 text-left text-sm transition ${
                  selected
                    ? "border-gold/40 bg-gold/10 text-white"
                    : "border-white/10 bg-white/[0.03] text-mist hover:border-white/20 hover:text-white"
                }`}
              >
                {cfg.runtimeLabel(id)}
              </button>
            );
          })}
        </div>
      </fieldset>

      {cfg.cloud ? (
        <p className="rounded-xl border border-gold/25 bg-gold/5 px-4 py-3 text-xs leading-relaxed text-mist">
          This CV leaves the machine. The provider you selected will see the
          extracted resume for this evaluation.
        </p>
      ) : null}

      {cfg.localEmpty ? (
        <p className="text-xs leading-relaxed text-mist">
          No local Ollama models were found. Pull{" "}
          <span className="font-mono text-white">gemma4:latest</span> or switch
          to Gemini / Ollama Cloud.
        </p>
      ) : null}

      <label className="block">
        <span className="text-xs uppercase tracking-[0.16em] text-mist">Model</span>
        <select
          value={model}
          onChange={(e) => onModel(e.target.value)}
          disabled={cfg.options.length === 0}
          className="mt-2 w-full appearance-none rounded-xl border border-white/10 bg-ink px-4 py-3 font-mono text-sm text-white outline-none transition focus:border-gold/60 disabled:opacity-50"
        >
          {cfg.options.length > 0 ? (
            cfg.options.map((item) => (
              <option key={item} value={item}>
                {item}
                {item === cfg.suggestedDefault ? " · default" : ""}
              </option>
            ))
          ) : (
            <option value="">
              {models ? "No models for this runtime" : "Detecting local models…"}
            </option>
          )}
        </select>
      </label>

      {cfg.cloud ? (
        <label className="block">
          <span className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-mist">
            API key
            <KeyPrivacyHint />
          </span>
          <input
            type="password"
            autoComplete="off"
            value={apiKey}
            onChange={(e) => onApiKey(e.target.value)}
            placeholder="Paste for this run only"
            className="mt-2 w-full rounded-xl border border-white/10 bg-ink px-4 py-3 font-mono text-sm text-white outline-none transition focus:border-gold/60"
          />
          {cfg.keyHelp ? (
            <a
              href={cfg.keyHelp}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-block text-[11px] text-gold/80 underline-offset-2 hover:underline"
            >
              Get a key
            </a>
          ) : null}
        </label>
      ) : null}

      <button
        type="button"
        onClick={() => onEnrich(!enrich)}
        className={`flex w-full items-center justify-between rounded-xl border px-4 py-4 text-left transition ${
          enrich
            ? "border-gold/40 bg-gold/10"
            : "border-white/10 bg-white/[0.03] hover:border-white/20"
        }`}
      >
        <div>
          <p className="text-sm font-medium text-white">GitHub enrichment</p>
          <p className="mt-1 text-xs text-mist">
            Fetch public repositories when the CV lists a GitHub profile. Set
            GITHUB_TOKEN on the API if you enable this regularly.
          </p>
        </div>
        <span
          className={`relative h-6 w-11 rounded-full transition ${
            enrich ? "bg-gold" : "bg-white/15"
          }`}
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-ink transition ${
              enrich ? "left-5" : "left-0.5"
            }`}
          />
        </span>
      </button>
    </div>
  );
}
