import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function MetricCard({
  label,
  value,
  sub,
  icon: Icon,
  accent,
  className,
}: {
  label: string;
  value: string;
  sub: string;
  icon: LucideIcon;
  accent: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "animate-fade-up rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md",
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-medium text-slate-500">{label}</p>
        <span className="flex size-8 items-center justify-center rounded-md border border-slate-100" style={{ background: `${accent}14`, color: accent }}>
          <Icon className="size-4" />
        </span>
      </div>
      <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{sub}</p>
    </div>
  );
}

export function SectionCard({
  title,
  sub,
  action,
  children,
  className,
}: {
  title: string;
  sub?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-lg border border-slate-200 bg-white shadow-sm", className)}>
      <header className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
          {sub && <p className="mt-0.5 text-xs text-slate-500">{sub}</p>}
        </div>
        {action}
      </header>
      <div className="px-5 py-4">{children}</div>
    </section>
  );
}
