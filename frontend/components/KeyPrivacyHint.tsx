"use client";

import { useKeyPrivacyHint } from "../hooks/useKeyPrivacyHint";

export default function KeyPrivacyHint() {
  const { labelId, open, show, hide, toggle } = useKeyPrivacyHint();

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        aria-label="How this API key is used"
        aria-expanded={open}
        aria-describedby={open ? labelId : undefined}
        onClick={toggle}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        className="flex h-5 w-5 items-center justify-center rounded-full border border-white/25 font-mono text-[11px] text-mist transition hover:border-gold hover:text-gold"
      >
        ?
      </button>
      {open ? (
        <div
          id={labelId}
          role="tooltip"
          className="absolute left-1/2 top-[calc(100%+8px)] z-20 w-56 -translate-x-1/2 rounded-xl border border-white/10 bg-ink px-3 py-3 text-left shadow-xl"
        >
          <p className="text-xs font-medium text-white">Temporary password usage.</p>
          <ul className="mt-2 space-y-1 font-mono text-[11px] leading-relaxed text-mist">
            <li>Never in storage</li>
            <li>Never in env</li>
            <li>Never in logs</li>
            <li>Never in SSE</li>
          </ul>
        </div>
      ) : null}
    </span>
  );
}
