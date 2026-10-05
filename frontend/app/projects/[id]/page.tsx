"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { api } from "@/lib/api/client";
import type { Assessment, Finding, Project } from "@/lib/types";
import { AssessmentStatusBadge, SeverityBadge } from "@/components/badges";
import { SectionCard } from "@/components/cards";
import { ErrorState, LoadingState } from "@/components/states";
import { formatDateTime, formatSha } from "@/lib/services/dashboard";

const TABS = ["Overview", "Assessments", "Findings", "Security Controls", "History"] as const;

const WM_RULES = [
  { code: "WM-AUTH-001", title: "Auth middleware present on protected routes", category: "AUTHENTICATION" },
  { code: "WM-AUTHZ-001", title: "Authorization check before sensitive actions", category: "AUTHORIZATION" },
  { code: "WM-API-001", title: "Outbound calls use allow-list + timeout", category: "API_SECURITY" },
  { code: "WM-INPUT-001", title: "Request input validated against explicit schema", category: "INPUT_VALIDATION" },
  { code: "WM-SECRET-001", title: "No hardcoded secrets outside vault", category: "SECRETS" },
  { code: "WM-CONFIG-001", title: "Production debug + verbose errors disabled", category: "CONFIGURATION" },
  { code: "WM-DATA-001", title: "Sensitive data paths encrypted + access-logged", category: "CRYPTOGRAPHY" },
];

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [project, setProject] = useState<Project | null>(null);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [tab, setTab] = useState<(typeof TABS)[number]>("Overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const [p, a, f] = await Promise.all([api.getProject(id), api.getAssessments(id), api.getFindings(id)]);
        setProject(p ?? null);
        setAssessments(a);
        setFindings(f);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed.");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) return <LoadingState label="Loading project…" />;
  if (error) return <ErrorState message={error} />;
  if (!project) return <ErrorState message="Project not found." />;

  return (
    <div className="space-y-5">
      <Link href="/projects" className="inline-flex items-center gap-1.5 text-[13px] font-medium text-slate-500 hover:text-slate-900">
        <ArrowLeft className="size-4" /> Projects
      </Link>
      <div className="animate-fade-up rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">{project.name}</h1>
        <p className="mt-1 font-mono text-xs text-slate-500">{project.repositoryUrl} · default branch <span className="font-bold text-slate-700">{project.defaultBranch}</span> · {project.language}</p>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[["Open findings", String(project.openFindings)], ["Critical / High", String(project.criticalHigh)], ["Last assessment", formatDateTime(project.lastAssessmentAt)], ["Last commit", formatSha(project.lastCommitSha)]].map(([k, v]) => (
            <div key={k} className="rounded-md border border-slate-100 bg-slate-50 px-3 py-2.5">
              <p className="text-[11px] text-slate-500">{k}</p>
              <p className="mt-0.5 font-mono text-[13px] font-bold text-slate-800">{v}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="no-scrollbar flex gap-1 overflow-x-auto border-b border-slate-200">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`whitespace-nowrap border-b-2 px-3.5 py-2.5 text-[13px] font-medium ${tab === t ? "border-[#1E3A8A] text-[#1E3A8A]" : "border-transparent text-slate-500 hover:text-slate-800"}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === "Overview" && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <SectionCard title="Posture">
            <p className="text-sm leading-relaxed text-slate-600">
              {project.openFindings} open findings, {project.criticalHigh} critical/high. Findings below 50% confidence are tracked as leads — they never block the PR gate.
            </p>
          </SectionCard>
          <SectionCard title="Latest findings">
            <ul className="space-y-2">
              {findings.slice(0, 4).map((f) => (
                <li key={f.id} className="flex items-center gap-2 text-[13px]">
                  <SeverityBadge severity={f.severity} />
                  <Link href={`/findings/${f.id}`} className="truncate font-medium hover:text-[#1E3A8A] hover:underline">{f.title}</Link>
                </li>
              ))}
            </ul>
          </SectionCard>
        </div>
      )}
      {tab === "Assessments" && (
        <SectionCard title={`${assessments.length} assessments`}>
          <ul className="divide-y divide-slate-100">
            {assessments.map((a) => (
              <li key={a.id} className="flex items-center gap-3 py-2.5 text-[13px]">
                <Link href={`/assessments/${a.id}`} className="font-mono font-semibold text-[#1E3A8A] hover:underline">{a.id}</Link>
                <AssessmentStatusBadge status={a.status} />
                <span className="ml-auto font-mono text-xs text-slate-400">{formatSha(a.commitSha)}</span>
              </li>
            ))}
          </ul>
        </SectionCard>
      )}
      {tab === "Findings" && (
        <SectionCard title={`${findings.length} findings`}>
          <ul className="divide-y divide-slate-100">
            {findings.map((f) => (
              <li key={f.id} className="flex items-center gap-2 py-2.5 text-[13px]">
                <SeverityBadge severity={f.severity} />
                <Link href={`/findings/${f.id}`} className="font-medium hover:text-[#1E3A8A] hover:underline">{f.title}</Link>
              </li>
            ))}
          </ul>
        </SectionCard>
      )}
      {tab === "Security Controls" && (
        <SectionCard title="World Monitor security expectations" sub="Heuristic checks (WM-XXX) — leads, not vulnerability verdicts">
          <ul className="divide-y divide-slate-100">
            {WM_RULES.map((r) => (
              <li key={r.code} className="flex items-center gap-3 py-2.5 text-[13px]">
                <span className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-[11px] font-bold">{r.code}</span>
                <span className="font-medium text-slate-700">{r.title}</span>
                <span className="ml-auto font-mono text-[11px] text-slate-400">{r.category}</span>
              </li>
            ))}
          </ul>
        </SectionCard>
      )}
      {tab === "History" && (
        <SectionCard title="Assessment history">
          <ol className="space-y-2.5">
            {assessments.map((a) => (
              <li key={a.id} className="flex items-center gap-2.5 text-[13px]">
                <span className={`size-2.5 rounded-full ${a.status === "COMPLETED" ? "bg-green-500" : a.status === "FAILED" ? "bg-red-500" : a.status === "RUNNING" ? "bg-blue-500" : "bg-amber-500"}`} />
                <Link href={`/assessments/${a.id}`} className="font-mono font-medium hover:text-[#1E3A8A] hover:underline">{a.id}</Link>
                <span className="text-slate-500">{a.source}</span>
                <span className="ml-auto font-mono text-[11px] text-slate-400">{formatDateTime(a.createdAt)}</span>
              </li>
            ))}
          </ol>
        </SectionCard>
      )}
    </div>
  );
}
