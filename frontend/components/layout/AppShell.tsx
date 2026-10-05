"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { TopNav } from "@/components/layout/TopNav";
import { cn } from "@/lib/utils";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <div className="flex min-h-screen bg-[#F8FAFC] text-slate-900">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 border-r border-slate-200 lg:block">
        <AppSidebar />
      </aside>
      {/* Tablet collapsed rail */}
      <aside className="sticky top-0 hidden h-screen w-16 shrink-0 border-r border-slate-200 md:block lg:hidden">
        <CollapsedRail />
      </aside>
      {/* Mobile drawer */}
      <div
        className={cn(
          "fixed inset-0 z-50 transition-opacity md:hidden",
          mobileOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
        )}
      >
        <div className="absolute inset-0 bg-slate-900/40" onClick={() => setMobileOpen(false)} />
        <aside
          className={cn(
            "absolute left-0 top-0 h-full w-72 border-r border-slate-200 bg-white shadow-xl transition-transform",
            mobileOpen ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <button
            onClick={() => setMobileOpen(false)}
            className="absolute right-3 top-5 rounded-md p-1.5 text-slate-400 hover:bg-slate-100"
            aria-label="Close navigation"
          >
            <X className="size-4" />
          </button>
          <AppSidebar onNavigate={() => setMobileOpen(false)} />
        </aside>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <TopNav onMenu={() => setMobileOpen(true)} />
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
        <footer className="border-t border-slate-200 bg-white px-6 py-3">
          <p className="mx-auto max-w-7xl text-[11px] text-slate-400">
            KavachX · Proof Over Alerts · Demo data — scanner alert ≠ confirmed vulnerability · Next phase: Express
            API → Prisma → Neon
          </p>
        </footer>
      </div>
    </div>
  );
}

import {
  ClipboardCheck,
  FileText,
  FlaskConical,
  FolderGit2,
  GitPullRequest,
  LayoutDashboard,
  ScanSearch,
  Settings,
  Shield,
  ShieldAlert,
} from "lucide-react";
import Link from "next/link";

function CollapsedRail() {
  const items = [
    { href: "/", icon: LayoutDashboard },
    { href: "/assessments", icon: ScanSearch },
    { href: "/findings", icon: ShieldAlert },
    { href: "/projects", icon: FolderGit2 },
    { href: "/evidence", icon: FlaskConical },
    { href: "/retests", icon: ClipboardCheck },
    { href: "/pull-requests", icon: GitPullRequest },
    { href: "/reports", icon: FileText },
    { href: "/settings", icon: Settings },
  ];
  return (
    <div className="flex h-full flex-col items-center bg-white py-5">
      <span className="flex size-9 items-center justify-center rounded-lg bg-[#1E3A8A] text-white">
        <Shield className="size-5" />
      </span>
      <nav className="mt-6 flex flex-1 flex-col gap-1">
        {items.map((i) => (
          <Link key={i.href} href={i.href} className="rounded-md p-2.5 text-slate-400 hover:bg-slate-100 hover:text-slate-800">
            <i.icon className="size-5" />
          </Link>
        ))}
      </nav>
    </div>
  );
}
