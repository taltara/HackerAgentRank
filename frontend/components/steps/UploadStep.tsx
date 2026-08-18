"use client";

import { useCallback, useRef, useState } from "react";

interface UploadStepProps {
  value: File | null;
  onChange: (file: File | null) => void;
}

export default function UploadStep({ value, onChange }: UploadStepProps) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const accept = useCallback(
    (file: File | undefined | null) => {
      if (!file) return;
      if (!file.name.toLowerCase().endsWith(".pdf")) return;
      onChange(file);
    },
    [onChange],
  );

  return (
    <div className="space-y-6">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-gold">
          Step 01
        </p>
        <h2 className="mt-2 font-display text-3xl text-white md:text-4xl">
          Upload a CV
        </h2>
        <p className="mt-3 max-w-lg text-sm leading-relaxed text-mist">
          PDF only. The pipeline extracts a structured resume, optionally
          enriches public GitHub signals, then scores against the rubrics you
          select.
        </p>
      </div>

      <button
        type="button"
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          accept(e.dataTransfer.files?.[0]);
        }}
        onClick={() => inputRef.current?.click()}
        className={`group relative w-full overflow-hidden rounded-2xl border border-dashed px-6 py-16 text-left transition-all duration-300 ${
          dragging
            ? "border-gold bg-gold/10"
            : "border-white/15 bg-white/[0.03] hover:border-gold/50 hover:bg-white/[0.05]"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          onChange={(e) => accept(e.target.files?.[0])}
        />
        <div className="relative z-10">
          <p className="font-display text-xl text-white">
            {value ? value.name : "Drop a PDF here"}
          </p>
          <p className="mt-2 text-sm text-mist">
            {value
              ? `${(value.size / 1024).toFixed(0)} KB · click to replace`
              : "or click to browse · PDF only"}
          </p>
        </div>
        <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-gold/10 blur-3xl transition-opacity group-hover:opacity-100" />
      </button>
    </div>
  );
}
