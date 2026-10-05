"use client";

import Link from "next/link";
import { FlaskConical } from "lucide-react";
import type { Finding } from "@/lib/types";
import { PriorityBadge, RiskBar, SeverityBadge, StatusBadge } from "@/components/badges";
import { formatDate } from "@/lib/services/dashboard";

export function FindingTable({ findings, compact = false }: { findings: Finding[]; compact?: boolean }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[820px] border-collapse text-left text-[13px]">
        <thead>
          <tr className="border-b border-slate-100 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            <th className="px-3 py-2.5">Severity</th>
            <th className="px-3 py-2.5">Finding</th>
            <th className="px-3 py-2.5">Source</th>
            <th className="px-3 py-2.5">File</th>
            <th className="px-3 py-2.5">Status</th>
            <th className="px-3 py-2.5">Risk</th>
            <th className="px-3 py-2.5">Updated</th>
          </tr>
        </thead>
        <tbody>
          {findings.map((f) => (
            <tr key={f.id} className="group border-b border-slate-50 transition-colors last:border-0 hover:bg-blue-50/40">
              <td className="px-3 py-3">
                <SeverityBadge severity={f.severity} />
              </td>
              <td className="max-w-64 px-3 py-3">
                <Link href={`/findings/${f.id}`} className="font-medium text-slate-800 hover:text-[#1E3A8A] hover:underline">
                  {compact && f.title.length > 52 ? `${f.title.slice(0, 52)}…` : f.title}
                </Link>
                <span className="mt-1 flex items-center gap-1.5">
                  <PriorityBadge priority={f.priority} />
                  {f.cweId && <span className="font-mono text-[11px] text-slate-400">{f.cweId}</span>}
                  {f.evidence.length > 0 && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-teal-700">
                      <FlaskConical className="size-3" />
                      {f.evidence.length}
                    </span>
                  )}
                </span>
              </td>
              <td className="px-3 py-3">
                <span className="flex flex-wrap gap-1">
                  {f.sources.map((s) => (
                    <span key={s} className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-slate-600">
                      {s}
                    </span>
                  ))}
                </span>
              </td>
              <td className="max-w-44 truncate px-3 py-3 font-mono text-xs text-slate-500">
                {f.filePath ?? f.endpoint ?? "—"}
                {f.lineStart ? `:${f.lineStart}` : ""}
              </td>
              <td className="px-3 py-3">
                <StatusBadge status={f.status} />
              </td>
              <td className="px-3 py-3">
                <RiskBar score={f.riskScore} />
              </td>
              <td className="whitespace-nowrap px-3 py-3 text-xs text-slate-500">{formatDate(f.lastSeen)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
