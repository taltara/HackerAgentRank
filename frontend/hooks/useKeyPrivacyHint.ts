"use client";

import { useCallback, useId, useState } from "react";

export function useKeyPrivacyHint() {
  const labelId = useId();
  const [open, setOpen] = useState(false);
  const show = useCallback(() => setOpen(true), []);
  const hide = useCallback(() => setOpen(false), []);
  const toggle = useCallback(() => setOpen((current) => !current), []);
  return { labelId, open, show, hide, toggle };
}
