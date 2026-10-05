"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { api } from "@/lib/api/client";
import type { Assessment, Finding } from "@/lib/types";
import { AssessmentStatusBadge, SeverityBadge } from "@/components/badges";
import { SectionCard } from "@/components/cards";
import { AssessmentFailedState, ErrorState, LoadingState } from "@/components/states";
import { RiskChart } from "@/components/charts";
import { riskDistribution, formatDateTime, formatDuration, formatSha } from "@/lib/services/dashboard";

const TABS = ["Summary", "Scanner Results", "Risk Distribution", "Findings", "Evidence", "Retests", "PR Impact"] as const;

export default function AssessmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [tab, setTab] = useState<(typeof TABS)[number]>("Summary");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const a = await api.getAssessment(id);
        setAssessment(a ?? null);
        if (a) {
          const all = await api.getFindings();
          setFindings(all.filter((f) => a.findingIds.includes(f.id)));
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load assessment.");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const risk = useMemo(() => riskDistribution(findings), [findings]);
  const evidenceCount = useMemo(() => findings.reduce((s, f) => s + f.evidence.length, 0), [findings]);

  if (loading) return <LoadingState label="Loading assessment…" />;
  if (error) return <ErrorState message={error} />;
  if (!assessment) return <ErrorState message="Assessment not found in demo data." />;
  const a = assessment;

  return (
    <div className="space-y-5">
      <Link href="/assessments" className="inline-flex items-center gap-1.5 text-[13px] font-medium text-slate-500 hover:text-slate-900">
        <ArrowLeft className="size-4" /> Assessments
      </Link>

      <div className="animate-fade-up rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-sm font-bold text-slate-900">{a.id}</span>
          <AssessmentStatusBadge status={a.status} />
          <span className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-[11px] text-slate-600">{a.type}</span>
          <span className="ml-auto font-mono text-xs text-slate-500">{formatSha(a.commitSha, 12)} · {a.branch}</span>
        </div>
        <p className="mt-2 text-[13px] text-slate-500">{a.source} · started {formatDateTime(a.startedAt)}{a.completedAt ? ` · completed ${formatDateTime(a.completedAt)}` : ""} · {formatDuration(a.durationMs)}</p>
        {a.status === "RUNNING" && (
          <div className="mt-4">
            <div className="flex justify-between text-xs font-medium text-slate-600"><span>Scanning… {a.progress}%</span><span>Semgrep + Bandit done · Gitleaks running</span></div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-[#2563EB] transition-all" style={{ width: `${a.progress ?? 0}%` }} />
            </div>
          </div>
        )}
        {a.status === "FAILED" && a.error && <div className="mt-4"><AssessmentFailedState error={a.error} /></div>}
      </div>

      <div className="no-scrollbar flex gap-1 overflow-x-auto border-b border-slate-200">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`whitespace-nowrap border-b-2 px-3.5 py-2.5 text-[13px] font-medium transition-colors ${tab === t ? "border-[#1E3A8A] text-[#1E3A8A]" : "border-transparent text-slate-500 hover:text-slate-800"}`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Summary" && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[["Findings", String(findings.length)], ["Critical", String(findings.filter((f) => f.severity === "CRITICAL").length)], ["High", String(findings.filter((f) => f.severity === "HIGH").length)], ["Evidence items", String(evidenceCount)]].map(([k, v]) => (
            <div key={k} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs text-slate-500">{k}</p>
              <p className="mt-1 text-2xl font-bold">{v}</p>
            </div>
          ))}
        </div>
      )}

      {tab === "Scanner Results" && (
        <SectionCard title="Scanner results" sub="One row per adapter run — mirrors `wm-sentinel scan` output">
          <ul className="divide-y divide-slate-100">
            {a.scannerResults.length === 0 && <li className="py-4 text-sm text-slate-500">Queued — scanners have not started yet.</li>}
            {a.scannerResults.map((s) => (
              <li key={s.scanner} className="flex items-center gap-3 py-3 text-[13px]">
                <span className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-[11px] font-bold">{s.scanner}</span>
                <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${s.status === "COMPLETED" ? "border-green-200 bg-green-50 text-green-700" : s.status === "RUNNING" ? "border-blue-200 bg-blue-50 text-blue-700" : s.status === "FAILED" ? "border-red-200 bg-red-50 text-red-700" : "border-slate-200 bg-slate-50 text-slate-500"}`}>{s.status}</span>
                <span className="font-mono text-slate-600">{s.findingCount} findings</span>
                {s.error && <span className="font-mono text-xs text-red-600">{s.error}</span>}
                <span className="ml-auto font-mono text-xs text-slate-400">{s.durationMs ? `${Math.round(s.durationMs / 1000)}s` : "—"}</span>
              </li>
            ))}
          </ul>
        </SectionCard>
      )}

      {tab === "Risk Distribution" && (
        <SectionCard title="Risk distribution" sub="Same P0–P3 thresholds as the backend risk engine">
          <RiskChart data={risk} />
        </SectionCard>
      )}

      {tab === "Findings" && (
        <SectionCard title={`${findings.length} correlated findings`}>
          {findings.length === 0 ? <p className="text-sm text-slate-500">No findings yet — still scanning or queued.</p> : (
            <ul className="divide-y divide-slate-100">
              {findings.map((f) => (
                <li key={f.id} className="flex items-center gap-3 py-2.5 text-[13px]">
                  <SeverityBadge severity={f.severity} />
                  <Link href={`/findings/${f.id}`} className="font-medium text-slate-800 hover:text-[#1E3A8A] hover:underline">{f.title}</Link>
                  <span className="ml-auto font-mono text-xs text-slate-400">risk {f.riskScore}</span>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      )}

      {tab === "Evidence" && (
        <SectionCard title={`${evidenceCount} evidence items`} sub="Proof attached across findings in this assessment">
          {findings.flatMap((f) => f.evidence).map((e) => (
            <div key={e.id} className="border-b border-slate-100 py-2.5 text-[13px] last:border-0">
              <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-bold">{e.type}</span>
              <span className="ml-2 font-medium text-slate-800">{e.title}</span>
              <span className="ml-2 font-mono text-[11px] text-slate-400">{e.findingId}</span>
            </div>
          ))}
          {evidenceCount === 0 && <p className="text-sm text-slate-500">No evidence yet.</p>}
        </SectionCard>
      )}

      {tab === "Retests" && (
        <SectionCard title="Retests" sub="Linked retest activity for these findings">
          <p className="text-sm text-slate-500">See the <Link href="/retests" className="text-[#2563EB] hover:underline">Retests page</Link> for before/after comparisons.</p>
        </SectionCard>
      )}

      {tab === "PR Impact" && (
        <SectionCard title="PR impact" sub="How this assessment affects open pull requests">
          <p className="text-sm text-slate-500">
            {a.type === "PR" ? <>PR-type assessment — gate verdicts are on the <Link href="/pull-requests" className="text-[#2563EB] hover:underline">Pull Requests page</Link>.</> : "Full-branch assessment — establishes the baseline that PR diffs compare against."}
          </p>
        </SectionCard>
      )}
    </div>
  );
}
