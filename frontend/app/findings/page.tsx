"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api/client";
import type { Finding, FindingCategory, FindingSource, LifecycleStatus, Severity } from "@/lib/types";
import { FindingTable } from "@/components/FindingTable";
import { SectionCard } from "@/components/cards";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";

const SEVS: (Severity | "ALL")[] = ["ALL", "CRITICAL", "HIGH", "MEDIUM", "LOW"];
const STATUSES: (LifecycleStatus | "ALL")[] = ["ALL", "potential", "confirmed", "fixed", "retest-passed", "retest-required", "unchanged"];
const SOURCES: (FindingSource | "ALL")[] = ["ALL", "SEMGREP", "BANDIT", "GITLEAKS", "OSV", "NUCLEI", "ZAP", "TRIVY", "CUSTOM"];
const CATS: (FindingCategory | "ALL")[] = ["ALL", "INJECTION", "AUTHENTICATION", "AUTHORIZATION", "API_SECURITY", "INPUT_VALIDATION", "SECRETS", "DEPENDENCY", "CRYPTOGRAPHY", "CONFIGURATION", "OTHER"];

function FilterGroup({ label, options, value, onChange }: { label: string; options: readonly string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {options.map((o) => (
          <button
            key={o}
            onClick={() => onChange(o)}
            className={`rounded-md border px-2 py-1 text-xs font-medium transition-colors ${
              value === o ? "border-[#1E3A8A] bg-[#1E3A8A] text-white" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
            }`}
          >
            {o === "ALL" ? "All" : o.charAt(0) + o.slice(1).toLowerCase().replace("_", " ")}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function FindingsPage() {
  const [findings, setFindings] = useState<Finding[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sev, setSev] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [source, setSource] = useState("ALL");
  const [cat, setCat] = useState("ALL");
  const [fileQ, setFileQ] = useState("");
  const [query, setQuery] = useState("");

  useEffect(() => {
    const onSearch = (e: Event) => setQuery((e as CustomEvent<string>).detail ?? "");
    const onProject = (e: Event) => load((e as CustomEvent<string>).detail === "all" ? undefined : (e as CustomEvent<string>).detail);
    window.addEventListener("kavachx:search", onSearch);
    window.addEventListener("kavachx:project", onProject);
    load();
    return () => {
      window.removeEventListener("kavachx:search", onSearch);
      window.removeEventListener("kavachx:project", onProject);
    };
  }, []);

  async function load(projectId?: string) {
    setLoading(true);
    setError("");
    try {
      setFindings(await api.getFindings(projectId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load findings.");
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    const q = (query + " " + fileQ).toLowerCase().trim();
    return findings
      .filter((f) => (sev === "ALL" ? true : f.severity === sev))
      .filter((f) => (status === "ALL" ? true : f.status === status))
      .filter((f) => (source === "ALL" ? true : f.sources.includes(source as FindingSource)))
      .filter((f) => (cat === "ALL" ? true : f.category === cat))
      .filter((f) => (q ? `${f.title} ${f.filePath ?? ""} ${f.cweId ?? ""} ${f.endpoint ?? ""}`.toLowerCase().includes(q) : true))
      .sort((a, b) => b.riskScore - a.riskScore);
  }, [findings, sev, status, source, cat, query, fileQ]);

  if (loading) return <LoadingState label="Loading findings explorer…" />;
  if (error) return <ErrorState message={error} onRetry={() => load()} />;

  return (
    <div className="space-y-5">
      <div className="animate-fade-up">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Findings</h1>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-bold text-slate-600">{filtered.length}</span>
        </div>
        <p className="mt-1 text-sm text-slate-500">
          Correlated findings — each row merges every scanner signal for one root issue. Scanner alert ≠ confirmed vulnerability.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        <aside className="animate-fade-up stagger-1 space-y-5 rounded-lg border border-slate-200 bg-white p-4 shadow-sm lg:sticky lg:top-20 lg:self-start">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">File / path</p>
            <input
              value={fileQ}
              onChange={(e) => setFileQ(e.target.value)}
              placeholder="e.g. auth/, .py, CWE-89…"
              className="mt-1.5 h-8 w-full rounded-md border border-slate-200 bg-slate-50 px-2.5 font-mono text-xs outline-none focus:border-[#2563EB] focus:bg-white"
            />
          </div>
          <FilterGroup label="Severity" options={SEVS} value={sev} onChange={setSev} />
          <FilterGroup label="Status" options={STATUSES} value={status} onChange={setStatus} />
          <FilterGroup label="Scanner" options={SOURCES} value={source} onChange={setSource} />
          <FilterGroup label="Category" options={CATS} value={cat} onChange={setCat} />
          <button
            onClick={() => { setSev("ALL"); setStatus("ALL"); setSource("ALL"); setCat("ALL"); setFileQ(""); }}
            className="w-full rounded-md border border-slate-200 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-50"
          >
            Clear filters
          </button>
        </aside>

        <SectionCard title="All findings" sub={`${filtered.length} of ${findings.length} · sorted by risk score`} className="animate-fade-up stagger-2 lg:col-span-3">
          {filtered.length === 0 ? (
            <EmptyState title="No findings match these filters" body="Try widening the severity or clearing the file filter. Low-confidence heuristic (CUSTOM) findings hide under stricter confidence views." />
          ) : (
            <FindingTable findings={filtered} />
          )}
        </SectionCard>
      </div>
    </div>
  );
}
