"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { api } from "@/lib/api/client";
import type { Project } from "@/lib/types";

export function StartAssessmentModal({
  open,
  onClose,
  projects,
}: {
  open: boolean;
  onClose: () => void;
  projects: Project[];
}) {
  const router = useRouter();
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "proj-world-monitor");
  const [branch, setBranch] = useState("main");
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  async function submit() {
    setBusy(true);
    try {
      const a = await api.queueAssessment(projectId || "proj-world-monitor", branch || "main");
      onClose();
      router.push(`/assessments/${a.id}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
      <div className="animate-fade-up relative w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-xl">
        <h2 className="text-base font-semibold text-slate-900">Start Assessment</h2>
        <p className="mt-1 text-xs leading-relaxed text-slate-500">
          Queues a mock assessment against the demo data layer. In the next phase this calls{" "}
          <code className="rounded bg-slate-100 px-1 font-mono">POST /api/assessments</code> and the worker runs the
          scanner pipeline.
        </p>
        <label className="mt-4 block text-xs font-medium text-slate-600">Project</label>
        <select
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          className="mt-1 h-9 w-full rounded-md border border-slate-200 bg-white px-2 text-sm outline-none focus:border-[#2563EB]"
        >
          {(projects.length ? projects : [{ id: "proj-world-monitor", name: "World Monitor" } as Project]).map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <label className="mt-3 block text-xs font-medium text-slate-600">Branch</label>
        <input
          value={branch}
          onChange={(e) => setBranch(e.target.value)}
          className="mt-1 h-9 w-full rounded-md border border-slate-200 px-2 font-mono text-sm outline-none focus:border-[#2563EB]"
        />
        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="h-9 rounded-md border border-slate-200 px-4 text-[13px] font-medium text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={busy}
            className="inline-flex h-9 items-center gap-2 rounded-md bg-[#1E3A8A] px-4 text-[13px] font-semibold text-white hover:bg-[#172f6e] disabled:opacity-60"
          >
            {busy && <Loader2 className="size-4 animate-spin" />}
            Queue assessment
          </button>
        </div>
      </div>
    </div>
  );
}
