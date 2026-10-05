"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { api } from "@/lib/api/client";
import type { Retest } from "@/lib/types";
import { SeverityBadge } from "@/components/badges";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import { formatDate, formatSha } from "@/lib/services/dashboard";

function BeforeAfter({ label, before, after, tone }: { label: string; before: string; after: string; tone: "bad" | "good" }) {
  return (
    <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
      <div className={`overflow-hidden rounded-lg border ${tone === "bad" ? "border-red-200" : "border-slate-200"}`}>
        <p className={`px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wide ${tone === "bad" ? "bg-red-50 text-red-700" : "bg-slate-50 text-slate-500"}`}>Before · vulnerable</p>
        <pre className="overflow-x-auto bg-slate-950 p-3 font-mono text-xs leading-relaxed text-slate-200">{before}</pre>
      </div>
      <div className="overflow-hidden rounded-lg border border-green-200">
        <p className="bg-green-50 px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wide text-green-700">After · {label}</p>
        <pre className="overflow-x-auto bg-slate-950 p-3 font-mono text-xs leading-relaxed text-slate-200">{after}</pre>
      </div>
    </div>
  );
}

export default function RetestsPage() {
  const [retests, setRetests] = useState<Retest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api.getRetests().then(setRetests).catch((e) => setError(e instanceof Error ? e.message : "Failed.")).finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingState label="Loading retests…" />;
  if (error) return <ErrorState message={error} />;
  if (retests.length === 0) return <EmptyState title="No retests yet" body="Fix a finding and queue a retest assessment to verify it with evidence." />;

  return (
    <div className="space-y-5">
      <div className="animate-fade-up">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Retests</h1>
        <p className="mt-1 text-sm text-slate-500">Before → after, then a re-run probe. A fix counts only when the retest passes.</p>
      </div>
      <div className="space-y-4">
        {retests.map((r, i) => (
          <article key={r.id} className={`animate-fade-up rounded-lg border border-slate-200 bg-white p-5 shadow-sm stagger-${Math.min(i + 1, 4)}`}>
            <div className="flex flex-wrap items-center gap-2">
              <SeverityBadge severity={r.severity} />
              <Link href={`/findings/${r.findingId}`} className="text-[15px] font-semibold text-slate-900 hover:text-[#1E3A8A] hover:underline">
                {r.findingTitle}
              </Link>
              <span className="ml-auto flex items-center gap-1.5">
                {r.status === "FIXED" && <span className="inline-flex items-center gap-1 rounded-full border border-green-200 bg-green-50 px-2.5 py-0.5 text-xs font-semibold text-green-700"><CheckCircle2 className="size-3.5" /> Retest Passed</span>}
                {r.status === "VULNERABLE" && <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-700"><XCircle className="size-3.5" /> Still Vulnerable</span>}
                {r.status === "PENDING" && <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800"><Clock className="size-3.5" /> Retest Queued</span>}
                {r.status === "INCONCLUSIVE" && <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-semibold text-slate-500">Inconclusive</span>}
              </span>
            </div>
            <p className="mt-1.5 font-mono text-[11px] text-slate-400">{r.originalStatus} → {r.currentStatus} · commit {formatSha(r.commitSha)} · {formatDate(r.date)}</p>
            <div className="mt-3">
              <BeforeAfter label={r.status === "FIXED" ? "fixed" : r.status === "PENDING" ? "proposed" : "attempted"} before={r.beforeSnippet} after={r.afterSnippet} tone={r.status === "VULNERABLE" ? "bad" : "good"} />
            </div>
            <div className="mt-3 grid grid-cols-1 gap-2 text-xs md:grid-cols-2">
              <p className="rounded-md bg-red-50/70 border border-red-100 px-3 py-2 text-slate-600"><span className="font-mono font-bold text-red-700">WAS — </span>{r.previousResult}</p>
              <p className="rounded-md bg-green-50/70 border border-green-100 px-3 py-2 text-slate-600"><span className="font-mono font-bold text-green-700">NOW — </span>{r.currentResult}</p>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
