"use client";

import { useEffect, useState } from "react";
import { Download, Eye, FileJson, FileText } from "lucide-react";
import { api } from "@/lib/api/client";
import type { ReportItem } from "@/lib/types";
import { SectionCard } from "@/components/cards";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import { formatDate } from "@/lib/services/dashboard";

const KIND_ORDER = ["Assessment Report", "Security Summary", "Findings Report", "PR Security Report"] as const;

export default function ReportsPage() {
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<ReportItem | null>(null);

  useEffect(() => {
    api.getReports().then(setReports).catch((e) => setError(e instanceof Error ? e.message : "Failed.")).finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingState label="Loading reports…" />;
  if (error) return <ErrorState message={error} />;

  return (
    <div className="space-y-5">
      <div className="animate-fade-up">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Reports</h1>
        <p className="mt-1 text-sm text-slate-500">
          Same formats the CLI produces today: <strong>JSON · SARIF · HTML</strong>. For PDF, open the HTML and print — no fake generation.
        </p>
      </div>

      {KIND_ORDER.map((kind) => {
        const items = reports.filter((r) => r.kind === kind);
        if (items.length === 0) return null;
        return (
          <SectionCard key={kind} title={kind} sub={`${items.length} file${items.length > 1 ? "s" : ""}`}>
            <ul className="divide-y divide-slate-100">
              {items.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center gap-3 py-3">
                  <span className="flex size-9 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-500">
                    {r.format === "JSON" ? <FileJson className="size-4" /> : <FileText className="size-4" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-slate-800">{r.name}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{r.description}</p>
                    <p className="mt-0.5 font-mono text-[11px] text-slate-400">{r.format} · {r.sizeKb} KB · {formatDate(r.createdAt)}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPreview(r)}
                      className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-200 px-3 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      <Eye className="size-3.5" /> View
                    </button>
                    {r.format === "PDF" ? (
                      <span className="inline-flex h-8 items-center rounded-md border border-slate-200 bg-slate-50 px-3 text-xs text-slate-400">
                        Open HTML → Print to PDF
                      </span>
                    ) : (
                      <button
                        onClick={() => setPreview(r)}
                        title="Preview only in demo — downloads arrive with the Express API"
                        className="inline-flex h-8 items-center gap-1.5 rounded-md bg-[#1E3A8A] px-3 text-xs font-semibold text-white hover:bg-[#172f6e]"
                      >
                        <Download className="size-3.5" /> Export
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </SectionCard>
        );
      })}

      {reports.length === 0 && <EmptyState title="No reports" body="Run an assessment to generate JSON, SARIF or HTML reports." />}

      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => setPreview(null)} />
          <div className="animate-fade-up relative max-h-[80vh] w-full max-w-2xl overflow-auto rounded-lg border border-slate-200 bg-white p-6 shadow-xl">
            <p className="font-mono text-[11px] uppercase tracking-wide text-slate-400">{preview.kind} · {preview.format} · preview</p>
            <h2 className="mt-1 text-base font-semibold">{preview.name}</h2>
            <p className="mt-1 text-xs text-slate-500">{preview.description}</p>
            <pre className="mt-4 overflow-x-auto rounded-lg bg-slate-950 p-4 font-mono text-xs leading-relaxed text-slate-200">
{preview.format === "JSON"
? `{\n  "tool": "wm-sentinel",\n  "assessment": "${preview.assessmentId ?? "n/a"}",\n  "generatedAt": "${preview.createdAt}",\n  "findings": "…correlated findings with riskScore, priority, confidence, sources[]…"\n}`
: preview.format === "SARIF"
? `{\n  "$schema": "sarif-2.1.0",\n  "runs": [{ "tool": { "driver": { "name": "WM-Sentinel" } },\n    "results": "…level: error|warning|note per severity…"}]\n}`
: `<html>…WM-Sentinel Security Assessment…\nFindings table sorted by risk. Heuristic (CUSTOM)\nfindings labelled as expectation checks…</html>`}
            </pre>
            <p className="mt-3 rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
              Demo preview — file download is disabled until the Express API serves real report artifacts. PDF: open the HTML report and print.
            </p>
            <div className="mt-4 flex justify-end">
              <button onClick={() => setPreview(null)} className="h-9 rounded-md border border-slate-200 px-4 text-[13px] font-medium hover:bg-slate-50">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
