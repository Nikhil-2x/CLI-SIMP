"use client";

import { useEffect, useState } from "react";
import { Bell, ChevronDown, Menu, Play, Search } from "lucide-react";
import { api } from "@/lib/api/client";
import type { Project } from "@/lib/types";
import { StartAssessmentModal } from "@/components/StartAssessmentModal";

export function TopNav({ onMenu }: { onMenu: () => void }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selected, setSelected] = useState<string>("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    api.getProjects().then(setProjects).catch(() => setProjects([]));
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      window.dispatchEvent(new CustomEvent("kavachx:search", { detail: query }));
    }, 200);
    return () => clearTimeout(t);
  }, [query]);

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-6">
        <button
          onClick={onMenu}
          className="rounded-md p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
          aria-label="Open navigation"
        >
          <Menu className="size-5" />
        </button>

        <div className="relative hidden w-72 md:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search findings, files, CWEs…"
            className="h-9 w-full rounded-md border border-slate-200 bg-slate-50 pl-9 pr-3 text-[13px] text-slate-800 outline-none placeholder:text-slate-400 focus:border-[#2563EB] focus:bg-white focus:ring-2 focus:ring-blue-100"
          />
        </div>

        <div className="relative">
          <select
            value={selected}
            onChange={(e) => {
              setSelected(e.target.value);
              window.dispatchEvent(new CustomEvent("kavachx:project", { detail: e.target.value }));
            }}
            className="h-9 appearance-none rounded-md border border-slate-200 bg-white pl-3 pr-8 text-[13px] font-medium text-slate-700 outline-none hover:border-slate-300 focus:border-[#2563EB]"
            aria-label="Select project"
          >
            <option value="all">All projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
        </div>

        <span className="hidden rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-800 sm:inline-block">
          Demo Data
        </span>

        <div className="ml-auto flex items-center gap-1.5">
          <button
            onClick={() => setModalOpen(true)}
            className="hidden h-9 items-center gap-1.5 rounded-md bg-[#1E3A8A] px-3.5 text-[13px] font-semibold text-white shadow-sm transition-colors hover:bg-[#172f6e] sm:inline-flex"
          >
            <Play className="size-3.5" />
            Start Assessment
          </button>
          <button className="relative rounded-md p-2 text-slate-500 hover:bg-slate-100" aria-label="Notifications">
            <Bell className="size-5" />
            <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-[#DC2626] ring-2 ring-white" />
          </button>
          <span className="flex size-8 items-center justify-center rounded-full bg-[#1E3A8A] text-xs font-bold text-white">
            AS
          </span>
        </div>
      </header>
      <StartAssessmentModal open={modalOpen} onClose={() => setModalOpen(false)} projects={projects} />
    </>
  );
}
