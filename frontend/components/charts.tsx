"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

export function RiskChart({ data }: { data: { priority: string; count: number; color: string }[] }) {
  const total = data.reduce((s, d) => s + d.count, 0) || 1;
  return (
    <div className="flex items-center gap-5">
      <div className="h-44 w-44 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="count" nameKey="priority" innerRadius={52} outerRadius={72} paddingAngle={3} strokeWidth={0} isAnimationActive>
              {data.map((d) => (
                <Cell key={d.priority} fill={d.color} />
              ))}
            </Pie>
            <Tooltip formatter={(v, _n, p) => [`${v} findings`, (p?.payload as { priority: string })?.priority ?? ""]} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="flex-1 space-y-2.5">
        {data.map((d) => (
          <li key={d.priority} className="flex items-center gap-2 text-[13px]">
            <span className="size-2.5 rounded-sm" style={{ background: d.color }} />
            <span className="font-mono font-bold text-slate-800">{d.priority}</span>
            <span className="text-slate-500">{d.count} findings</span>
            <span className="ml-auto h-1.5 w-24 overflow-hidden rounded-full bg-slate-100">
              <span className="block h-full rounded-full" style={{ width: `${Math.round((d.count / total) * 100)}%`, background: d.color }} />
            </span>
            <span className="w-9 text-right font-mono text-xs text-slate-500">{Math.round((d.count / total) * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function LifecycleFunnel({ stages }: { stages: { stage: string; count: number; hint: string }[] }) {
  const max = Math.max(...stages.map((s) => s.count), 1);
  const colors = ["#64748B", "#D97706", "#DC2626", "#16A34A", "#0F766E"];
  return (
    <ol className="space-y-3">
      {stages.map((s, i) => (
        <li key={s.stage}>
          <div className="flex items-baseline justify-between text-[13px]">
            <span className="font-medium text-slate-700">
              <span className="mr-2 font-mono text-[11px] text-slate-400">{String(i + 1).padStart(2, "0")}</span>
              {s.stage}
            </span>
            <span className="font-mono text-xs font-bold text-slate-800">{s.count}</span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${Math.max(6, Math.round((s.count / max) * 100))}%`, background: colors[i % colors.length] }}
            />
          </div>
          <p className="mt-1 text-[11px] text-slate-400">{s.hint}</p>
        </li>
      ))}
    </ol>
  );
}
