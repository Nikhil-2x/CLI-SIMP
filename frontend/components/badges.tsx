import { cn } from "@/lib/utils";
import type { AssessmentStatus, LifecycleStatus, Priority, Severity } from "@/lib/types";
import { ASSESSMENT_STATUS_LABEL, LIFECYCLE_META, PRIORITY_META, SEVERITY_META } from "@/lib/types";

export function SeverityBadge({ severity, className }: { severity: Severity; className?: string }) {
  const m = SEVERITY_META[severity];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-semibold",
        m.bg,
        m.color,
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", m.dot)} />
      {m.label}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  const m = PRIORITY_META[priority];
  return (
    <span
      className="inline-flex items-center rounded-md border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-xs font-bold"
      style={{ color: m.color }}
    >
      {m.label}
    </span>
  );
}

export function StatusBadge({ status }: { status: LifecycleStatus }) {
  const m = LIFECYCLE_META[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        m.classes,
      )}
    >
      <span className={cn("size-1.5 rounded-full", m.dot)} />
      {m.label}
    </span>
  );
}

const ASSESSMENT_STYLES: Record<AssessmentStatus, string> = {
  RUNNING: "bg-blue-50 text-blue-700 border-blue-200",
  COMPLETED: "bg-green-50 text-green-700 border-green-200",
  FAILED: "bg-red-50 text-red-700 border-red-200",
  PENDING: "bg-amber-50 text-amber-800 border-amber-200",
};

export function AssessmentStatusBadge({ status }: { status: AssessmentStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        ASSESSMENT_STYLES[status],
      )}
    >
      <span className={cn("size-1.5 rounded-full", status === "RUNNING" && "animate-pulse bg-blue-600", status === "COMPLETED" && "bg-green-600", status === "FAILED" && "bg-red-600", status === "PENDING" && "bg-amber-600")} />
      {ASSESSMENT_STATUS_LABEL[status]}
    </span>
  );
}

export function RiskBar({ score, className }: { score: number; className?: string }) {
  const color = score >= 85 ? "#DC2626" : score >= 65 ? "#EA580C" : score >= 40 ? "#D97706" : "#2563EB";
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100">
        <span className="block h-full rounded-full" style={{ width: `${score}%`, background: color }} />
      </span>
      <span className="font-mono text-xs font-semibold text-slate-700">{score}</span>
    </span>
  );
}
