"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, GitPullRequest } from "lucide-react";
import { api } from "@/lib/api/client";
import type { PullRequest } from "@/lib/types";
import { SeverityBadge } from "@/components/badges";
import { SectionCard } from "@/components/cards";
import { ErrorState, LoadingState } from "@/components/states";
import { GatePill } from "@/components/GatePill";
import { formatDateTime, formatSha } from "@/lib/services/dashboard";

export default function PullRequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [pr, setPr] = useState<PullRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api.getPullRequest(id).then((p) => setPr(p ?? null)).catch((e) => setError(e instanceof Error ? e.message : "Failed.")).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <LoadingState label="Loading pull request…" />;
  if (error) return <ErrorState message={error} />;
  if (!pr) return <ErrorState message="Pull request not found." />;

  return (
    <div className="space-y-5">
      <Link href="/pull-requests" className="inline-flex items-center gap-1.5 text-[13px] font-medium text-slate-500 hover:text-slate-900">
        <ArrowLeft className="size-4" /> Pull Requests
      </Link>

      <div className={`animate-fade-up rounded-lg border bg-white p-5 shadow-sm sm:p-6 ${pr.gateStatus === "BLOCKED" ? "border-red-200" : "border-slate-200"}`}>
        <div className="flex flex-wrap items-center gap-2.5">
          <GitPullRequest className="size-5 text-slate-400" />
          <h1 className="text-lg font-bold sm:text-xl">#{pr.number} {pr.title}</h1>
          <span className="ml-auto"><GatePill status={pr.gateStatus} /></span>
        </div>
        <p className="mt-2 font-mono text-xs text-slate-500">
          {pr.branch} → {pr.baseBranch} · head {formatSha(pr.headSha, 12)} · base {formatSha(pr.baseSha, 12)} · by {pr.author} · {formatDateTime(pr.createdAt)}
        </p>
        <div className={`mt-4 rounded-lg border p-4 text-[13px] leading-relaxed ${pr.gateStatus === "BLOCKED" ? "border-red-200 bg-red-50/70 text-red-800" : "border-green-200 bg-green-50/70 text-green-800"}`}>
          {pr.gateStatus === "BLOCKED" ? (
            <><strong>New High/Critical findings detected.</strong> {pr.gateReason}</>
          ) : (
            <><strong>No new High/Critical findings.</strong> Safe to merge from a gate perspective — pre-existing findings are tracked, not re-gated.</>
          )}
          {pr.gateWarnings.length > 0 && (
            <ul className="mt-2 list-disc pl-5 text-xs opacity-80">
              {pr.gateWarnings.map((w) => <li key={w}>{w}</li>)}
            </ul>
          )}
          <p className="mt-2 font-mono text-[11px] opacity-70">Gate semantics: blockOn=[CRITICAL] · warnOn=[HIGH] · maxNewHigh=0 · minConfidence=50 (mirrors Backend gate.ts)</p>
        </div>
        <div className="mt-3 flex gap-5 font-mono text-xs">
          <span><strong className="text-base text-red-600">{pr.newCount}</strong> NEW</span>
          <span><strong className="text-base text-green-600">{pr.fixedCount}</strong> FIXED</span>
          <span><strong className="text-base text-slate-500">{pr.unchangedCount}</strong> UNCHANGED</span>
          <span className="ml-auto hidden sm:block">CRIT {pr.newBySeverity.CRITICAL} · HIGH {pr.newBySeverity.HIGH} · MED {pr.newBySeverity.MEDIUM}</span>
        </div>
      </div>

      <SectionCard title="Finding classification" sub="NEW vs FIXED vs UNCHANGED against the base-branch baseline">
        <ul className="divide-y divide-slate-100">
          {pr.findings.map((f) => (
            <li key={f.findingId} className="flex items-center gap-3 py-2.5 text-[13px]">
              <span className={`rounded px-1.5 py-0.5 font-mono text-[11px] font-bold ${f.state === "NEW" ? "bg-red-100 text-red-700" : f.state === "FIXED" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>{f.state}</span>
              <SeverityBadge severity={f.severity} />
              <Link href={`/findings/${f.findingId}`} className="font-medium text-slate-800 hover:text-[#1E3A8A] hover:underline">{f.title}</Link>
              <span className="ml-auto font-mono text-[11px] text-slate-400">conf {f.confidence}%</span>
            </li>
          ))}
        </ul>
      </SectionCard>
    </div>
  );
}
