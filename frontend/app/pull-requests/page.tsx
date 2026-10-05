"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { GitPullRequest, OctagonX, ShieldCheck } from "lucide-react";
import { api } from "@/lib/api/client";
import type { PullRequest } from "@/lib/types";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import { formatDate, formatSha } from "@/lib/services/dashboard";

export function GatePill({ status }: { status: PullRequest["gateStatus"] }) {
  if (status === "BLOCKED")
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md border border-red-300 bg-red-600 px-2.5 py-1 text-xs font-bold text-white">
        <OctagonX className="size-3.5" /> BLOCKED
      </span>
    );
  if (status === "PASSED")
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md border border-green-300 bg-green-600 px-2.5 py-1 text-xs font-bold text-white">
        <ShieldCheck className="size-3.5" /> PASSED
      </span>
    );
  return <span className="rounded-md border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-500">PENDING</span>;
}

export default function PullRequestsPage() {
  const [prs, setPrs] = useState<PullRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api.getPullRequests().then(setPrs).catch((e) => setError(e instanceof Error ? e.message : "Failed.")).finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingState label="Loading pull requests…" />;
  if (error) return <ErrorState message={error} />;
  if (prs.length === 0) return <EmptyState title="No pull requests" body="PR assessments appear here once the GitHub workflow runs." />;

  return (
    <div className="space-y-5">
      <div className="animate-fade-up">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Pull Requests</h1>
          <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800">Sample data</span>
        </div>
        <p className="mt-1 text-sm text-slate-500">The gate judges <strong>new</strong> findings only — CRITICAL blocks at ≥50% confidence. Not yet connected to GitHub.</p>
      </div>

      <div className="space-y-4">
        {prs.map((pr, i) => (
          <Link
            key={pr.id}
            href={`/pull-requests/${pr.id}`}
            className={`animate-fade-up block rounded-lg border bg-white shadow-sm transition-shadow hover:shadow-md stagger-${Math.min(i + 1, 4)} ${pr.gateStatus === "BLOCKED" ? "border-red-200" : "border-slate-200"}`}
          >
            <div className="flex flex-wrap items-center gap-2.5 border-b border-slate-100 bg-slate-50/60 px-5 py-3.5">
              <GitPullRequest className="size-4 text-slate-400" />
              <span className="font-semibold text-slate-900">#{pr.number} {pr.title}</span>
              <span className="font-mono text-xs text-slate-400">{pr.branch} → {pr.baseBranch}</span>
              <span className="ml-auto"><GatePill status={pr.gateStatus} /></span>
            </div>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 px-5 py-3.5 text-[13px]">
              <span className="font-mono text-xs text-slate-500">{formatSha(pr.headSha)} · by {pr.author} · {formatDate(pr.createdAt)}</span>
              <span className="ml-auto flex gap-4 font-mono text-xs">
                <span><strong className="text-red-600">{pr.newCount}</strong> <span className="text-slate-500">NEW</span></span>
                <span><strong className="text-green-600">{pr.fixedCount}</strong> <span className="text-slate-500">FIXED</span></span>
                <span><strong className="text-slate-500">{pr.unchangedCount}</strong> <span className="text-slate-500">UNCHANGED</span></span>
              </span>
            </div>
            <p className={`px-5 pb-4 text-[13px] ${pr.gateStatus === "BLOCKED" ? "font-medium text-red-700" : "text-green-700"}`}>
              {pr.gateStatus === "BLOCKED" ? `⛔ ${pr.gateReason}` : "✓ No new High/Critical findings at gate confidence."}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
