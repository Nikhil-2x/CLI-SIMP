"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api/client";
import type { Assessment, AssessmentStatus, Finding } from "@/lib/types";
import { AssessmentStatusBadge } from "@/components/badges";
import { SectionCard } from "@/components/cards";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import { formatDate, formatDuration, formatSha } from "@/lib/services/dashboard";

export default function AssessmentsPage() {
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [status, setStatus] = useState<AssessmentStatus | "ALL">("ALL");
  const [query, setQuery] = useState("");

  useEffect(() => {
    const onSearch = (e: Event) => setQuery((e as CustomEvent<string>).detail ?? "");
    window.addEventListener("kavachx:search", onSearch);
    load();
    return () => window.removeEventListener("kavachx:search", onSearch);
  }, []);

  async function load() {
    setLoading(true);
    try {
      const [a, f] = await Promise.all([api.getAssessments(), api.getFindings()]);
      setAssessments(a);
      setFindings(f);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load assessments.");
    } finally {
      setLoading(false);
    }
  }

  const byId = useMemo(() => new Map(findings.map((f) => [f.id, f])), [findings]);
  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return assessments
      .filter((a) => (status === "ALL" ? true : a.status === status))
      .filter((a) => (q ? `${a.id} ${a.commitSha} ${a.branch} ${a.source}`.toLowerCase().includes(q) : true));
  }, [assessments, status, query]);

  if (loading) return <LoadingState label="Loading assessments…" />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div className="space-y-5">
      <div className="animate-fade-up">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Assessments</h1>
        <p className="mt-1 text-sm text-slate-500">Every scan run — queued, running, completed or failed — with scanner provenance.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {(["ALL", "RUNNING", "COMPLETED", "FAILED", "PENDING"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`rounded-full border px-3 py-1 text-xs font-medium ${status === s ? "border-[#1E3A8A] bg-[#1E3A8A] text-white" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"}`}
          >
            {s === "ALL" ? "All" : s === "PENDING" ? "Queued" : s.charAt(0) + s.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      <SectionCard title={`${filtered.length} assessments`} sub="Demo data · worker + Express API arrive in the next phase">
        {filtered.length === 0 ? (
          <EmptyState title="No assessments" body="No assessments match. Queue one from the header to see the running state." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-[13px]">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  <th className="px-3 py-2.5">Assessment</th>
                  <th className="px-3 py-2.5">Commit</th>
                  <th className="px-3 py-2.5">Status</th>
                  <th className="px-3 py-2.5">Findings</th>
                  <th className="px-3 py-2.5">Crit / High</th>
                  <th className="px-3 py-2.5">Duration</th>
                  <th className="px-3 py-2.5">Created</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a) => {
                  const fs = a.findingIds.map((id) => byId.get(id)).filter(Boolean);
                  const crit = fs.filter((f) => f!.severity === "CRITICAL").length;
                  const high = fs.filter((f) => f!.severity === "HIGH").length;
                  return (
                    <tr key={a.id} className="border-b border-slate-50 last:border-0 hover:bg-blue-50/40">
                      <td className="px-3 py-3">
                        <Link href={`/assessments/${a.id}`} className="font-mono font-semibold text-[#1E3A8A] hover:underline">{a.id}</Link>
                        <p className="mt-0.5 text-xs text-slate-500">{a.branch} · {a.type} · {a.source}</p>
                      </td>
                      <td className="px-3 py-3 font-mono text-xs text-slate-600">{formatSha(a.commitSha)}</td>
                      <td className="px-3 py-3"><AssessmentStatusBadge status={a.status} /></td>
                      <td className="px-3 py-3 font-mono font-semibold">{a.status === "RUNNING" || a.status === "PENDING" ? "—" : fs.length}</td>
                      <td className="px-3 py-3 font-mono text-xs"><span className="font-bold text-red-600">{crit}</span> / <span className="font-bold text-orange-600">{high}</span></td>
                      <td className="px-3 py-3 font-mono text-xs text-slate-500">{a.status === "RUNNING" ? `${a.progress ?? 0}%` : formatDuration(a.durationMs)}</td>
                      <td className="px-3 py-3 text-xs text-slate-500">{formatDate(a.createdAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
