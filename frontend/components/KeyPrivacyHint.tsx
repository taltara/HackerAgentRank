"use client";

import HintTooltip from "./HintTooltip";

export default function KeyPrivacyHint() {
  return (
    <HintTooltip label="How this API key is used">
      <p className="text-xs font-medium text-white">Temporary password usage.</p>
      <ul className="mt-2 space-y-1 font-mono text-[11px] leading-relaxed text-mist">
        <li>Never in storage</li>
        <li>Never in env</li>
        <li>Never in logs</li>
        <li>Never in SSE</li>
      </ul>
    </HintTooltip>
  );
}
