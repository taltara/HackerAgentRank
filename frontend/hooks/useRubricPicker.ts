"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import type { RoleSummary } from "../lib/types";
import { groupRolesByDepartment } from "../lib/roles";

interface UseRubricPickerArgs {
  available: RoleSummary[];
  onAdd: (name: string) => void;
}

export function useRubricPicker({ available, onAdd }: UseRubricPickerArgs) {
  const [open, setOpenState] = useState(false);
  const [query, setQueryState] = useState("");
  const [highlight, setHighlight] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return available;
    return available.filter((role) =>
      `${role.position_title} ${role.name} ${role.description} ${role.department}`
        .toLowerCase()
        .includes(needle),
    );
  }, [available, query]);

  const groups = useMemo(() => groupRolesByDepartment(filtered), [filtered]);
  const flat = useMemo(() => groups.flatMap((group) => group.roles), [groups]);
  const activeIndex = Math.min(highlight, Math.max(0, flat.length - 1));

  const setOpen = useCallback((next: boolean) => {
    setOpenState(next);
    setHighlight(0);
    if (!next) setQueryState("");
  }, []);

  const setQuery = useCallback((next: string) => {
    setQueryState(next);
    setHighlight(0);
  }, []);

  useEffect(() => {
    if (!open) return;
    searchRef.current?.focus();

    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpenState(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenState(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const select = useCallback(
    (name: string) => {
      onAdd(name);
      setQueryState("");
      setOpenState(false);
      setHighlight(0);
    },
    [onAdd],
  );

  const onTriggerKeyDown = useCallback(
    (event: ReactKeyboardEvent) => {
      if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        setOpen(true);
      }
    },
    [setOpen],
  );

  const onSearchKeyDown = useCallback(
    (event: ReactKeyboardEvent) => {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setHighlight((index) => Math.min(index + 1, Math.max(0, flat.length - 1)));
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setHighlight((index) => Math.max(0, index - 1));
        return;
      }
      if (event.key === "Enter") {
        event.preventDefault();
        const role = flat[activeIndex];
        if (role) select(role.name);
      }
    },
    [flat, activeIndex, select],
  );

  return {
    open,
    setOpen,
    query,
    setQuery,
    activeIndex,
    setHighlight,
    rootRef,
    searchRef,
    groups,
    flat,
    select,
    onTriggerKeyDown,
    onSearchKeyDown,
    disabled: available.length === 0,
  };
}
