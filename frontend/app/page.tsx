"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, BadgeCheck, FlaskConical, Search, ShieldAlert, Siren } from "lucide-react";
import { api } from "@/lib/api/client";
import type { Finding, Severity } from "@/lib/types";
import { MetricCard, SectionCard } from "@/components/cards";
import { FindingTable } from "@/components/FindingTable";
import { LifecycleFunnel, RiskChart } from "@/components/charts";
import { ErrorState, LoadingState } from "@/components/states";
import { lifecycleCounts, riskDistribution } from "@/lib/services/dashboard";

export default function OverviewPage() {
  const [findings, setFindings] = useState<Finding[]>([]);
  const [kpis, setKpis] = useState({ openFindings: 0, criticalHigh: 0, verifiedFindings: 0, retestsPassed: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [sev, setSev] = useState<Severity | "ALL">("ALL");

  useEffect(() => {
    const onSearch = (e: Event) => setQuery((e as CustomEvent<string>).detail ?? "");
    const onProject = (e: Event) => {
      const id = (e as CustomEvent<string>).detail;
      load(id === "all" ? undefined : id);
    };
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
      const [f, k] = await Promise.all([api.getFindings(projectId), api.getKpis()]);
      setFindings(f);
      setKpis(k);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load dashboard.");
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return findings
      .filter((f) => (sev === "ALL" ? true : f.severity === sev))
      .filter((f) =>
        q
          ? `${f.title} ${f.filePath ?? ""} ${f.cweId ?? ""} ${f.sources.join(" ")}`.toLowerCase().includes(q)
          : true,
      )
      .sort((a, b) => b.riskScore - a.riskScore);
  }, [findings, query, sev]);

  if (loading) return <LoadingState label="Loading security overview…" />;
  if (error) return <ErrorState message={error} onRetry={() => load()} />;

  const risk = riskDistribution(findings);
  const lifecycle = lifecycleCounts(findings);

  return (
    <div className="space-y-6">
      <div className="animate-fade-up flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Security Overview</h1>
            <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
              Demo data
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">Evidence-driven assessment of your applications.</p>
        </div>
        <Link
          href="/assessments"
          className="inline-flex h-9 items-center gap-1.5 rounded-md bg-[#1E3A8A] px-4 text-[13px] font-semibold text-white shadow-sm hover:bg-[#172f6e]"
        >
          Start Assessment <ArrowRight className="size-4" />
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Open Findings" value={String(kpis.openFindings)} sub="Across 3 demo projects" icon={ShieldAlert} accent="#DC2626" className="stagger-1" />
        <MetricCard label="Critical / High" value={String(kpis.criticalHigh)} sub="Need attention first" icon={Siren} accent="#EA580C" className="stagger-2" />
        <MetricCard label="Verified Findings" value={String(kpis.verifiedFindings)} sub="Fixed or retest-passed" icon={BadgeCheck} accent="#16A34A" className="stagger-3" />
        <MetricCard label="Retests Passed" value={String(kpis.retestsPassed)} sub="Fixes confirmed with evidence" icon={FlaskConical} accent="#0F766E" className="stagger-4" />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
        <SectionCard
          title="Risk Overview"
          sub="Correlated findings by priority (P0 ≥ 85 · P1 ≥ 65 · P2 ≥ 40)"
          className="animate-fade-up stagger-2 xl:col-span-3"
        >
          <RiskChart data={risk} />
        </SectionCard>
        <SectionCard
          title="Finding Lifecycle"
          sub="Alert ≠ vulnerability until evidence confirms it"
          className="animate-fade-up stagger-3 xl:col-span-2"
        >
          <LifecycleFunnel stages={lifecycle} />
        </SectionCard>
      </div>

      <SectionCard
        title="Recent Findings"
        sub="Sorted by risk score · click a finding for the evidence trail"
        className="animate-fade-up stagger-4"
        action={
          <Link href="/findings" className="inline-flex items-center gap-1 text-[13px] font-medium text-[#2563EB] hover:underline">
            Open explorer <ArrowRight className="size-3.5" />
          </Link>
        }
      >
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter findings…"
              className="h-8 w-56 rounded-md border border-slate-200 bg-slate-50 pl-8 pr-2 text-xs outline-none focus:border-[#2563EB] focus:bg-white"
            />
          </div>
          {(["ALL", "CRITICAL", "HIGH", "MEDIUM", "LOW"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSev(s)}
              className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                sev === s
                  ? "border-[#1E3A8A] bg-[#1E3A8A] text-white"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
              }`}
            >
              {s === "ALL" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
        <FindingTable findings={filtered.slice(0, 8)} compact />
      </SectionCard>
    </div>
  );
}
