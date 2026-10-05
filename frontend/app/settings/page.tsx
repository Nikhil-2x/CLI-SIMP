"use client";

import { useState } from "react";
import { demoFlags } from "@/lib/api/client";
import { SectionCard } from "@/components/cards";

export default function SettingsPage() {
  const [latency, setLatency] = useState(demoFlags.simulateLatencyMs);
  const [err, setErr] = useState(demoFlags.simulateError);
  const [empty, setEmpty] = useState(demoFlags.emptyMode);

  return (
    <div className="space-y-5">
      <div className="animate-fade-up">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Settings</h1>
        <p className="mt-1 text-sm text-slate-500">Workspace preferences and demo data-layer controls.</p>
      </div>

      <SectionCard title="Data source" sub="The UI talks to this layer — swap mock for Express without touching components">
        <dl className="space-y-2 text-[13px]">
          <div className="flex justify-between"><dt className="text-slate-500">Source</dt><dd className="rounded bg-amber-50 border border-amber-200 px-2 py-0.5 font-mono text-xs font-bold text-amber-800">mock (demo)</dd></div>
          <div className="flex justify-between"><dt className="text-slate-500">Future API base</dt><dd className="font-mono text-xs">http://localhost:4000</dd></div>
          <div className="flex justify-between"><dt className="text-slate-500">Migration path</dt><dd className="font-mono text-xs">Mock → Express REST → Prisma → Neon</dd></div>
        </dl>
        <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
          <label className="flex items-center justify-between text-[13px]">
            <span>Simulate loading latency (ms)</span>
            <input type="number" value={latency} min={0} max={3000} step={50} onChange={(e) => { const v = Number(e.target.value); setLatency(v); demoFlags.simulateLatencyMs = v; }} className="h-8 w-24 rounded-md border border-slate-200 px-2 font-mono text-xs" />
          </label>
          <label className="flex items-center justify-between text-[13px]">
            <span>Simulate API unavailable</span>
            <input type="checkbox" checked={err} onChange={(e) => { setErr(e.target.checked); demoFlags.simulateError = e.target.checked; }} className="size-4 accent-[#1E3A8A]" />
          </label>
          <label className="flex items-center justify-between text-[13px]">
            <span>Empty state mode (no projects/findings)</span>
            <input type="checkbox" checked={empty} onChange={(e) => { setEmpty(e.target.checked); demoFlags.emptyMode = e.target.checked; }} className="size-4 accent-[#1E3A8A]" />
          </label>
        </div>
      </SectionCard>

      <SectionCard title="Gate policy (read-only)" sub="Mirrors Backend/src/core/pr/gate.ts — change in code, not in UI">
        <pre className="overflow-x-auto rounded-lg bg-slate-950 p-4 font-mono text-xs leading-relaxed text-slate-200">{`blockOn: ["CRITICAL"]\nwarnOn: ["HIGH"]\nmaxNewHigh: 0\nminConfidence: 50  // below this, findings never block`}</pre>
      </SectionCard>

      <SectionCard title="Next phase" sub="Express API endpoints to implement (proposed UI — none exist yet)">
        <ul className="font-mono text-xs text-slate-500 space-y-1.5">
          <li>GET /api/projects · GET /api/projects/:id</li>
          <li>GET /api/assessments · POST /api/assessments · GET /api/assessments/:id</li>
          <li>GET /api/findings · GET /api/findings/:id</li>
          <li>GET /api/evidence · GET /api/retests · GET /api/pull-requests</li>
          <li>GET /api/reports · GET /api/reports/:id/download</li>
        </ul>
      </SectionCard>
    </div>
  );
}
