"use client";

import { useCallback, useMemo, useState } from "react";

/**
 * Per-category disclosure state. Evidence is hidden by default so a report
 * with several rubrics stays scannable; each row expands, or all at once.
 */
export function useCollapsibleCategories(keys: string[]) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const expandedCount = useMemo(
    () => keys.filter((key) => expanded[key]).length,
    [keys, expanded],
  );

  const allExpanded = keys.length > 0 && expandedCount === keys.length;

  const toggle = useCallback((key: string) => {
    setExpanded((current) => ({ ...current, [key]: !current[key] }));
  }, []);

  const toggleAll = useCallback(() => {
    setExpanded((current) => {
      const isAllExpanded =
        keys.length > 0 && keys.every((key) => current[key]);
      if (isAllExpanded) return {};
      return Object.fromEntries(keys.map((key) => [key, true]));
    });
  }, [keys]);

  const isExpanded = useCallback(
    (key: string) => Boolean(expanded[key]),
    [expanded],
  );

  return { isExpanded, toggle, toggleAll, allExpanded };
}
