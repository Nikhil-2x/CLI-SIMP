"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, GitBranch } from "lucide-react";
import { api } from "@/lib/api/client";
import type { Project } from "@/lib/types";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import { formatDate, formatSha } from "@/lib/services/dashboard";

const STATUS_STYLE: Record<Project["securityStatus"], { label: string; classes: string }> = {
  "needs-attention": { label: "Needs attention", classes: "bg-red-50 text-red-700 border-red-200" },
  monitoring: { label: "Monitoring", classes: "bg-amber-50 text-amber-800 border-amber-200" },
  stable: { label: "Stable", classes: "bg-green-50 text-green-700 border-green-200" },
};

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api.getProjects().then(setProjects).catch((e) => setError(e instanceof Error ? e.message : "Failed.")).finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingState label="Loading projects…" />;
  if (error) return <ErrorState message={error} />;
  if (projects.length === 0) return <EmptyState title="No projects" body="Connect a repository to run your first assessment." />;

  return (
    <div className="space-y-5">
      <div className="animate-fade-up">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Projects</h1>
        <p className="mt-1 text-sm text-slate-500">Repositories under continuous evidence-driven assessment.</p>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {projects.map((p, i) => {
          const s = STATUS_STYLE[p.securityStatus];
          return (
            <Link
              key={p.id}
              href={`/projects/${p.id}`}
              className={`animate-fade-up group rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md stagger-${Math.min(i + 1, 4)}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="text-[15px] font-semibold text-slate-900 group-hover:text-[#1E3A8A]">{p.name}</h2>
                  <p className="mt-0.5 font-mono text-[11px] text-slate-400">{p.repositoryUrl}</p>
                </div>
                <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium ${s.classes}`}>{s.label}</span>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 border-t border-slate-100 pt-4 text-center">
                <div><p className="text-lg font-bold">{p.openFindings}</p><p className="text-[11px] text-slate-500">Open</p></div>
                <div><p className="text-lg font-bold text-red-600">{p.criticalHigh}</p><p className="text-[11px] text-slate-500">Crit/High</p></div>
                <div><p className="text-lg font-bold text-teal-700">{p.coverageStatus === "full" ? "100%" : p.coverageStatus === "partial" ? "72%" : "PR"}</p><p className="text-[11px] text-slate-500">Coverage</p></div>
              </div>
              <div className="mt-3 flex items-center gap-1.5 text-[11px] text-slate-500">
                <GitBranch className="size-3.5" /> {p.defaultBranch} · {formatSha(p.lastCommitSha)} · {formatDate(p.lastAssessmentAt)}
                <ArrowRight className="ml-auto size-4 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-[#2563EB]" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
