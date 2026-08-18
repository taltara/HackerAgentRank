"use client";

import type { ReactNode } from "react";
import StepperRail from "./StepperRail";
import type { WizardStep } from "../lib/wizard";

export type ConnectionState = "connected" | "offline" | "connecting";

interface AppShellProps {
  step: WizardStep;
  connection: ConnectionState;
  children: ReactNode;
  footer?: ReactNode;
  evaluating?: boolean;
}

function statusClass(connection: ConnectionState): string {
  switch (connection) {
    case "connected":
      return "border-emerald-500/30 text-emerald-400";
    case "offline":
      return "border-rose-500/30 text-rose-300";
    case "connecting":
      return "border-white/15 text-mist";
    default: {
      const _never: never = connection;
      return _never;
    }
  }
}

function dotClass(connection: ConnectionState): string {
  switch (connection) {
    case "connected":
      return "bg-emerald-400";
    case "offline":
      return "bg-rose-400";
    case "connecting":
      return "animate-pulse bg-gold";
    default: {
      const _never: never = connection;
      return _never;
    }
  }
}

function statusLabel(connection: ConnectionState): string {
  switch (connection) {
    case "connected":
      return "API connected";
    case "offline":
      return "API offline";
    case "connecting":
      return "Connecting";
    default: {
      const _never: never = connection;
      return _never;
    }
  }
}

export default function AppShell({
  step,
  connection,
  children,
  footer,
  evaluating = false,
}: AppShellProps) {
  return (
    <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col px-4 py-8 md:px-8 md:py-12">
      <div
        className="pointer-events-none fixed inset-0 overflow-hidden"
        aria-hidden
      >
        <div className={`orb orb-gold ${evaluating ? "is-active" : ""}`} />
        <div className={`orb orb-teal ${evaluating ? "is-active" : ""}`} />
      </div>

      <header className="relative z-10 mb-10 flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-gold">
            Local-first
          </p>
          <h1 className="mt-2 font-display text-2xl text-white md:text-3xl">
            CV Evaluator
          </h1>
        </div>
        <div
          className={`flex items-center gap-2 rounded-full border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.16em] ${statusClass(connection)}`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${dotClass(connection)}`} />
          {statusLabel(connection)}
        </div>
      </header>

      <div className="relative z-10 grid flex-1 gap-10 lg:grid-cols-[220px_1fr]">
        <aside className="hidden lg:block">
          <StepperRail current={step} />
        </aside>

        <section className="relative min-h-[520px] rounded-3xl border border-white/10 bg-panel/80 p-6 shadow-glow backdrop-blur-md md:p-10">
          {children}
          {footer}
        </section>
      </div>
    </div>
  );
}
