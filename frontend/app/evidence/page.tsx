"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api/client";
import type { EvidenceType, Finding } from "@/lib/types";
import { SectionCard } from "@/components/cards";
import { ErrorState, LoadingState } from "@/components/states";
import { EvidenceChain } from "@/components/EvidenceChain";
import { formatDateTime } from "@/lib/services/dashboard";

export default function EvidencePage() {
  const [findings, setFindings] = useState<Finding[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [type, setType] = useState<EvidenceType | "ALL">("ALL");

  useEffect(() => {
    api.getFindings().then(setFindings).catch((e) => setError(e instanceof Error ? e.message : "Failed.")).finally(() => setLoading(false));
  }, []);

  const items = useMemo(
    () => findings.flatMap((f) => f.evidence.map((e) => ({ ...e, findingTitle: f.title, findingStatus: f.status }))),
    [findings],
  );
  const filtered = useMemo(() => (type === "ALL" ? items : items.filter((i) => i.type === type)), [items, type]);

  if (loading) return <LoadingState label="Loading evidence…" />;
  if (error) return <ErrorState message={error} />;

  return (
    <div className="space-y-5">
      <div className="animate-fade-up rounded-lg border border-teal-200 bg-teal-50/60 p-5">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Evidence</h1>
        <p className="mt-1 text-sm font-medium text-teal-900">“Every important claim should have evidence.”</p>
        <p className="mt-1 text-[13px] text-slate-600">Scanner output is a lead. Verified evidence is what KavachX reports and gates on.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
        <div className="xl:col-span-3">
          <SectionCard
            title={`${filtered.length} evidence items`}
            action={
              <div className="flex flex-wrap gap-1.5">
                {(["ALL", "REQUEST", "RESPONSE", "SNIPPET", "OBSERVATION", "SCREENSHOT"] as const).map((t) => (
                  <button key={t} onClick={() => setType(t)} className={`rounded-md border px-2 py-1 font-mono text-[11px] font-semibold ${type === t ? "border-[#0F766E] bg-[#0F766E] text-white" : "border-slate-200 bg-white text-slate-600"}`}>
                    {t}
                  </button>
                ))}
              </div>
            }
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-[13px]">
                <thead>
                  <tr className="border-b border-slate-100 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    <th className="px-3 py-2.5">Evidence</th>
                    <th className="px-3 py-2.5">Finding</th>
                    <th className="px-3 py-2.5">Type</th>
                    <th className="px-3 py-2.5">Captured</th>
                    <th className="px-3 py-2.5">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((e) => (
                    <tr key={e.id} className="border-b border-slate-50 last:border-0 hover:bg-teal-50/40">
                      <td className="px-3 py-3">
                        <p className="font-medium text-slate-800">{e.title}</p>
                        <p className="font-mono text-[11px] text-slate-400">{e.source} · {e.kind}</p>
                      </td>
                      <td className="max-w-56 px-3 py-3">
                        <Link href={`/findings/${e.findingId}`} className="text-slate-700 hover:text-[#1E3A8A] hover:underline">{e.findingTitle}</Link>
                      </td>
                      <td className="px-3 py-3"><span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] font-bold">{e.type}</span></td>
                      <td className="whitespace-nowrap px-3 py-3 font-mono text-xs text-slate-500">{formatDateTime(e.capturedAt)}</td>
                      <td className="px-3 py-3">
                        <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${e.status === "verified" ? "border-green-200 bg-green-50 text-green-700" : e.status === "captured" ? "border-slate-200 bg-slate-50 text-slate-500" : "border-amber-200 bg-amber-50 text-amber-700"}`}>{e.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </div>
        <SectionCard title="How proof accumulates" sub="Signature lifecycle" className="animate-fade-up stagger-2">
          <EvidenceChain current="evidence" compact />
          <p className="mt-3 border-t border-slate-100 pt-3 text-xs leading-relaxed text-slate-500">
            Raw scanner output → code location → analyst validation → retest proof. Only verified steps move a finding from Potential to Confirmed.
          </p>
        </SectionCard>
      </div>
    </div>
  );
}
