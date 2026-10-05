"use client";

import { Check, Circle, FileSearch, FlaskConical, ShieldCheck, TriangleAlert, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";

export type EvidenceChainStage =
  | "alert"
  | "potential"
  | "evidence"
  | "confirmed"
  | "fix"
  | "retest"
  | "verified";

/**
 * Signature KavachX visual: Scanner Alert → Potential → Evidence →
 * Confirmed → Fix → Retest → Verified. State-aware: completed stages
 * are filled, the current stage pulses, future stages are hollow.
 */
export function EvidenceChain({
  current,
  orientation = "vertical",
  compact = false,
}: {
  current: EvidenceChainStage;
  orientation?: "vertical" | "horizontal";
  compact?: boolean;
}) {
  const order: { key: EvidenceChainStage; label: string; sub: string; icon: typeof Circle }[] = [
    { key: "alert", label: "Scanner Alert", sub: "raw signal", icon: TriangleAlert },
    { key: "potential", label: "Potential", sub: "needs review", icon: FileSearch },
    { key: "evidence", label: "Evidence", sub: "proof attached", icon: FlaskConical },
    { key: "confirmed", label: "Confirmed", sub: "analyst verdict", icon: Check },
    { key: "fix", label: "Fix", sub: "remediation", icon: Wrench },
    { key: "retest", label: "Retest", sub: "re-run probe", icon: FlaskConical },
    { key: "verified", label: "Verified", sub: "evidence-backed", icon: ShieldCheck },
  ];
  const idx = order.findIndex((s) => s.key === current);
  const horizontal = orientation === "horizontal";

  return (
    <ol className={cn("flex", horizontal ? "flex-row items-start gap-0 overflow-x-auto" : "flex-col")}>
      {order.map((s, i) => {
        const done = i < idx;
        const active = i === idx;
        const Icon = s.icon;
        return (
          <li key={s.key} className={cn("flex", horizontal ? "min-w-24 flex-1 flex-col items-center text-center" : "flex-row gap-3")}>
            <div className={cn("flex", horizontal ? "w-full flex-col items-center" : "flex-col items-center")}>
              <span
                className={cn(
                  "flex items-center justify-center rounded-full border-2 transition-colors",
                  compact ? "size-7" : "size-8",
                  done && "border-[#16A34A] bg-[#16A34A] text-white",
                  active && "border-[#1E3A8A] bg-[#1E3A8A] text-white ring-4 ring-blue-100",
                  !done && !active && "border-slate-200 bg-white text-slate-400",
                  active && s.key === "alert" && "border-[#D97706] bg-[#D97706] ring-amber-100",
                )}
              >
                <Icon className={compact ? "size-3.5" : "size-4"} />
              </span>
              {i < order.length - 1 && (
                <span
                  aria-hidden
                  className={cn(
                    horizontal ? "mt-2 hidden" : "my-1 w-0.5 flex-1",
                    compact ? "min-h-3" : "min-h-4",
                    i < idx ? "bg-[#16A34A]" : "bg-slate-200",
                  )}
                />
              )}
            </div>
            <div className={cn(horizontal ? "mt-2" : "pb-4")}>
              <p className={cn("text-xs font-semibold", active ? "text-slate-900" : done ? "text-slate-700" : "text-slate-400")}>
                {s.label}
              </p>
              {!compact && <p className="text-[11px] text-slate-400">{s.sub}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/** Map a finding lifecycle status onto the chain position. */
export function chainStageForStatus(status: string): EvidenceChainStage {
  switch (status) {
    case "confirmed":
      return "confirmed";
    case "fixed":
      return "fix";
    case "retest-passed":
      return "verified";
    case "retest-required":
      return "retest";
    case "potential":
    default:
      return "potential";
  }
}
