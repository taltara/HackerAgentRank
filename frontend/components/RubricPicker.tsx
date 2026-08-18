"use client";

import type { RoleSummary } from "../lib/types";
import { useRubricPicker } from "../hooks/useRubricPicker";

interface RubricPickerProps {
  available: RoleSummary[];
  onAdd: (name: string) => void;
}

export default function RubricPicker({ available, onAdd }: RubricPickerProps) {
  const {
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
    disabled,
  } = useRubricPicker({ available, onAdd });

  return (
    <div ref={rootRef} className="relative">
      <span className="text-xs uppercase tracking-[0.16em] text-mist">
        Add a rubric
      </span>
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        onKeyDown={onTriggerKeyDown}
        className="mt-2 flex w-full items-center justify-between rounded-xl border border-white/10 bg-ink px-4 py-3 text-left text-sm outline-none transition hover:border-white/20 focus:border-gold/60 disabled:opacity-40"
      >
        <span className={disabled ? "text-mist" : "text-white"}>
          {disabled ? "All rubrics added" : "Select a rubric"}
        </span>
        <span className="font-mono text-xs text-mist" aria-hidden>
          {open ? "▴" : "▾"}
        </span>
      </button>

      {open && !disabled && (
        <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-white/10 bg-[#0c0c12] shadow-glow">
          <input
            ref={searchRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={onSearchKeyDown}
            placeholder="Search roles"
            aria-label="Search rubrics"
            className="w-full border-b border-white/10 bg-transparent px-4 py-3 text-sm text-white outline-none placeholder:text-mist"
          />
          <ul role="listbox" className="max-h-80 overflow-y-auto py-2">
            {groups.length === 0 && (
              <li className="px-4 py-3 text-sm text-mist">No matching rubrics</li>
            )}
            {groups.map((group) => (
              <li key={group.department}>
                <p className="px-4 pb-1 pt-3 font-mono text-[10px] uppercase tracking-[0.18em] text-gold/80">
                  {group.department}
                </p>
                <ul>
                  {group.roles.map((role) => {
                    const index = flat.indexOf(role);
                    const active = index === activeIndex;
                    return (
                      <li key={role.name}>
                        <button
                          type="button"
                          role="option"
                          aria-selected={active}
                          onMouseEnter={() => setHighlight(index)}
                          onClick={() => select(role.name)}
                          className={`flex w-full flex-col items-start px-4 py-2.5 text-left transition ${
                            active ? "bg-gold/10" : "hover:bg-white/[0.04]"
                          }`}
                        >
                          <span className="text-sm text-white">
                            {role.position_title}
                          </span>
                          <span className="mt-0.5 text-xs text-mist">
                            {role.description}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
