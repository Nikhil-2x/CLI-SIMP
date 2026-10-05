"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, FlaskConical, MapPin, TriangleAlert } from "lucide-react";
import { api } from "@/lib/api/client";
import type { Finding } from "@/lib/types";
import { PriorityBadge, RiskBar, SeverityBadge, StatusBadge } from "@/components/badges";
import { SectionCard } from "@/components/cards";
import { ErrorState, LoadingState } from "@/components/states";
import { EvidenceChain, chainStageForStatus } from "@/components/EvidenceChain";
import { formatDateTime, formatSha } from "@/lib/services/dashboard";

function CodeBlock({ code, file, line }: { code: string; file?: string; line?: number }) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-800 bg-slate-950">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-2">
        <span className="font-mono text-[11px] text-slate-400">
          {file ?? "artifact"}{line ? `:${line}` : ""}
        </span>
        <span className="font-mono text-[10px] uppercase tracking-wide text-slate-500">code location</span>
      </div>
      <pre className="overflow-x-auto p-4 font-mono text-xs leading-relaxed text-slate-200">{code}</pre>
    </div>
  );
}

export default function FindingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [finding, setFinding] = useState<Finding | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .getFinding(id)
      .then((f) => setFinding(f ?? null))
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load finding."))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <LoadingState label="Loading finding…" />;
  if (error) return <ErrorState message={error} />;
  if (!finding)
    return (
      <div className="space-y-4">
        <Link href="/findings" className="text-sm text-[#2563EB] hover:underline">← Back to findings</Link>
        <ErrorState message="Finding not found in demo data." />
      </div>
    );

  const f = finding;
  const evidenceBacked = f.status === "confirmed" || f.status === "fixed" || f.status === "retest-passed" || f.evidence.some((e) => e.status === "verified");

  return (
    <div className="space-y-5">
      <Link href="/findings" className="inline-flex items-center gap-1.5 text-[13px] font-medium text-slate-500 hover:text-slate-900">
        <ArrowLeft className="size-4" /> Findings
      </Link>

      <div className="animate-fade-up rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <SeverityBadge severity={f.severity} />
          <PriorityBadge priority={f.priority} />
          <StatusBadge status={f.status} />
          <span className="ml-auto"><RiskBar score={f.riskScore} /></span>
        </div>
        <h1 className="mt-3 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">{f.title}</h1>
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 font-mono text-xs text-slate-500">
          <span>confidence {f.confidence}%</span>
          <span>{f.sources.join(" + ")}</span>
          <span>{f.filePath ?? f.endpoint}{f.lineStart ? `:${f.lineStart}` : ""}</span>
          {f.cweId && <span>{f.cweId}</span>}
          {f.cveId && <span>{f.cveId}</span>}
        </div>
      </div>

      {/* Scanner alert vs evidence-backed — central KavachX distinction */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="animate-fade-up stagger-1 rounded-lg border border-amber-200 bg-amber-50/60 p-5">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-amber-800">
            <TriangleAlert className="size-4" /> Scanner Alert
          </p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{f.members.length} scanner signal{f.members.length > 1 ? "s" : ""}</p>
          <p className="mt-1 text-[13px] text-slate-600">Confidence {f.confidence}% · treated as <strong>potential</strong> until reviewed.</p>
          <ul className="mt-3 space-y-1.5">
            {f.members.map((m) => (
              <li key={m.fingerprint} className="rounded-md border border-amber-200/70 bg-white px-3 py-2 font-mono text-[11px] text-slate-600">
                <span className="font-bold text-slate-800">{m.source}</span> · {m.title} · {m.severity} · {m.confidence}%
              </li>
            ))}
          </ul>
        </div>
        <div className={`animate-fade-up stagger-2 rounded-lg border p-5 ${evidenceBacked ? "border-emerald-200 bg-emerald-50/60" : "border-slate-200 bg-slate-50"}`}>
          <p className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wide ${evidenceBacked ? "text-emerald-800" : "text-slate-500"}`}>
            <FlaskConical className="size-4" /> Evidence-Backed Finding
          </p>
          {evidenceBacked ? (
            <>
              <p className="mt-2 text-2xl font-bold text-slate-900">{f.evidence.length} evidence item{f.evidence.length > 1 ? "s" : ""}</p>
              <p className="mt-1 text-[13px] text-slate-600">Analyst-reviewed proof attached. This is what KavachX reports — not the raw alert.</p>
            </>
          ) : (
            <>
              <p className="mt-2 text-2xl font-bold text-slate-400">Awaiting evidence</p>
              <p className="mt-1 text-[13px] text-slate-500">No verified proof yet. This stays <strong>potential</strong> — it cannot block a PR gate at this confidence.</p>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <SectionCard title="Why it matters" className="animate-fade-up stagger-2">
            <p className="text-sm leading-relaxed text-slate-700">{f.whyItMatters}</p>
            <p className="mt-3 border-t border-slate-100 pt-3 text-sm leading-relaxed text-slate-500">{f.description}</p>
          </SectionCard>

          <SectionCard title={`Evidence (${f.evidence.length})`} sub="Every important claim should have evidence" className="animate-fade-up stagger-3">
            {f.evidence.length === 0 ? (
              <p className="text-sm text-slate-500">No evidence captured yet — this finding remains potential.</p>
            ) : (
              <ul className="space-y-3">
                {f.evidence.map((e) => (
                  <li key={e.id} className="rounded-lg border border-slate-200">
                    <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-4 py-2.5">
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-600">{e.type}</span>
                      <span className="rounded bg-teal-50 px-1.5 py-0.5 font-mono text-[10px] font-bold text-teal-700">{e.kind}</span>
                      <span className="ml-auto font-mono text-[11px] text-slate-400">{e.source} · {formatDateTime(e.capturedAt)}</span>
                    </div>
                    <p className="px-4 pt-2.5 text-[13px] font-semibold text-slate-800">{e.title}</p>
                    <pre className="mx-4 mb-3 mt-2 overflow-x-auto rounded-md bg-slate-950 p-3 font-mono text-xs leading-relaxed text-slate-200">{e.content}</pre>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          <SectionCard title="Code Location" className="animate-fade-up stagger-3">
            <CodeBlock code={f.evidence.find((e) => e.kind === "code-location")?.content ?? `${f.filePath ?? f.endpoint ?? "location unknown"}`} file={f.filePath ?? f.endpoint} line={f.lineStart} />
            <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
              <MapPin className="size-3.5" /> Assessment {f.assessmentId} · first seen {formatDateTime(f.firstSeen)} · last seen {formatDateTime(f.lastSeen)}
            </p>
          </SectionCard>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <SectionCard title="Remediation">
              <p className="text-sm leading-relaxed text-slate-700">{f.remediation}</p>
            </SectionCard>
            <SectionCard title="Assessment Context">
              <dl className="space-y-2 text-[13px]">
                <div className="flex justify-between"><dt className="text-slate-500">Category</dt><dd className="font-mono font-medium">{f.category}</dd></div>
                <div className="flex justify-between"><dt className="text-slate-500">Project</dt><dd><Link href={`/projects/${f.projectId}`} className="font-medium text-[#2563EB] hover:underline">{f.projectId.replace("proj-", "")}</Link></dd></div>
                <div className="flex justify-between"><dt className="text-slate-500">Assessment</dt><dd><Link href={`/assessments/${f.assessmentId}`} className="font-mono font-medium text-[#2563EB] hover:underline">{f.assessmentId}</Link></dd></div>
                <div className="flex justify-between"><dt className="text-slate-500">Commit</dt><dd className="font-mono">{formatSha("a3f9c21e8b4d", 8)}</dd></div>
              </dl>
            </SectionCard>
          </div>
        </div>

        <div className="space-y-4">
          <SectionCard title="Evidence Chain" sub="Where this finding stands" className="animate-fade-up stagger-2">
            <EvidenceChain current={chainStageForStatus(f.status)} />
          </SectionCard>
          <SectionCard title="Timeline" className="animate-fade-up stagger-3">
            <ol className="space-y-3">
              {f.timeline.map((t) => (
                <li key={t.stage} className="flex items-center gap-2.5 text-[13px]">
                  <span className={`size-2.5 rounded-full ${t.done ? "bg-[#16A34A]" : "bg-slate-200"}`} />
                  <span className={t.done ? "font-medium text-slate-800" : "text-slate-400"}>{t.stage}</span>
                  {t.at && <span className="ml-auto font-mono text-[11px] text-slate-400">{t.at}</span>}
                </li>
              ))}
            </ol>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
