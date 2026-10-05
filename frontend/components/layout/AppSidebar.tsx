"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/assessments", label: "Assessments", icon: ScanSearch },
  { href: "/findings", label: "Findings", icon: ShieldAlert },
  { href: "/projects", label: "Projects", icon: FolderGit2 },
  { href: "/evidence", label: "Evidence", icon: FlaskConical },
  { href: "/retests", label: "Retests", icon: ClipboardCheck },
  { href: "/pull-requests", label: "Pull Requests", icon: GitPullRequest },
  { href: "/reports", label: "Reports", icon: FileText },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function AppSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <div className="flex h-full flex-col bg-white">
      <Link href="/" onClick={onNavigate} className="flex items-center gap-2.5 px-5 pb-5 pt-6">
        <span className="flex size-9 items-center justify-center rounded-lg bg-[#1E3A8A] text-white shadow-sm">
          <Shield className="size-5" strokeWidth={2.2} />
        </span>
        <span className="leading-tight">
          <span className="block text-[15px] font-bold tracking-[0.08em] text-slate-900">KAVACHX</span>
          <span className="block text-[11px] font-medium text-slate-500">Proof Over Alerts</span>
        </span>
      </Link>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3">
        {NAV.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "group flex items-center gap-2.5 rounded-md px-3 py-2 text-[13px] font-medium transition-colors",
                active
                  ? "bg-blue-50 text-[#1E3A8A]"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
              )}
            >
              <item.icon className={cn("size-4 shrink-0", active ? "text-[#2563EB]" : "text-slate-400 group-hover:text-slate-600")} />
              {item.label}
              {item.href === "/findings" && (
                <span className="ml-auto rounded-full bg-red-50 px-1.5 py-0.5 font-mono text-[10px] font-bold text-[#DC2626]">
                  7
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="space-y-3 border-t border-slate-100 p-4">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div className="flex items-center gap-2">
            <span className="relative flex size-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
            </span>
            <p className="text-xs font-semibold text-slate-700">Demo environment</p>
          </div>
          <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
            Mock data · API not yet connected. Worker offline.
          </p>
        </div>
        <div className="flex items-center gap-2.5 px-1">
          <span className="flex size-8 items-center justify-center rounded-full bg-[#0F766E] text-xs font-bold text-white">
            AS
          </span>
          <div className="leading-tight">
            <p className="text-xs font-semibold text-slate-800">Ananya Sharma</p>
            <p className="text-[11px] text-slate-500">Security analyst</p>
          </div>
        </div>
      </div>
    </div>
  );
}
