"use client";

import type { ModelsInfo } from "../../lib/types";

interface ConfigureStepProps {
  models: ModelsInfo | null;
  model: string;
  onModel: (value: string) => void;
  enrich: boolean;
  onEnrich: (value: boolean) => void;
}

export default function ConfigureStep({
  models,
  model,
  onModel,
  enrich,
  onEnrich,
}: ConfigureStepProps) {
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
          Defaults to a local Ollama model (Gemma 4 when available). GitHub
          enrichment is optional: it is slower and, without a token, hits the
          unauthenticated rate limit quickly.
        </p>
      </div>

      <label className="block">
        <span className="text-xs uppercase tracking-[0.16em] text-mist">Model</span>
        <select
          value={model}
          onChange={(e) => onModel(e.target.value)}
          disabled={!models}
          className="mt-2 w-full appearance-none rounded-xl border border-white/10 bg-ink px-4 py-3 font-mono text-sm text-white outline-none transition focus:border-gold/60"
        >
          {models ? (
            models.available.map((item) => (
              <option key={item} value={item}>
                {item}
                {item === models.default ? " · default" : ""}
              </option>
            ))
          ) : (
            <option value="">Detecting local models…</option>
          )}
        </select>
      </label>

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
