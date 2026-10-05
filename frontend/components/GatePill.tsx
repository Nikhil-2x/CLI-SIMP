"use client";

import { OctagonX, ShieldCheck } from "lucide-react";
import type { PullRequest } from "@/lib/types";

export function GatePill({ status }: { status: PullRequest["gateStatus"] }) {
  if (status === "BLOCKED")
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md border border-red-300 bg-red-600 px-2.5 py-1 text-xs font-bold text-white">
        <OctagonX className="size-3.5" /> BLOCKED
      </span>
    );
  if (status === "PASSED")
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md border border-green-300 bg-green-600 px-2.5 py-1 text-xs font-bold text-white">
        <ShieldCheck className="size-3.5" /> PASSED
      </span>
    );
  return <span className="rounded-md border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-500">PENDING</span>;
}
