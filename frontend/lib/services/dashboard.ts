import type { Finding } from "@/lib/types";

/** P0–P3 distribution for the Risk Overview chart. */
export function riskDistribution(findings: Finding[]) {
  const buckets = [
    { priority: "P0" as const, count: 0, color: "#DC2626" },
    { priority: "P1" as const, count: 0, color: "#EA580C" },
    { priority: "P2" as const, count: 0, color: "#D97706" },
    { priority: "P3" as const, count: 0, color: "#2563EB" },
  ];
  for (const f of findings) {
    const b = buckets.find((x) => x.priority === f.priority);
    if (b) b.count += 1;
  }
  return buckets;
}

/** Alert → Potential → Confirmed → Fixed → Retested funnel. */
export function lifecycleCounts(findings: Finding[]) {
  const potential = findings.filter((f) => f.status === "potential").length;
  const confirmed = findings.filter((f) => f.status === "confirmed").length;
  const fixed = findings.filter((f) => f.status === "fixed").length;
  const retested = findings.filter((f) => f.status === "retest-passed").length;
  return [
    { stage: "Alert", count: findings.length, hint: "raw scanner signals (correlated)" },
    { stage: "Potential", count: potential, hint: "needs review" },
    { stage: "Confirmed", count: confirmed, hint: "evidence-backed" },
    { stage: "Fixed", count: fixed, hint: "remediated" },
    { stage: "Retested", count: retested, hint: "verified fix" },
  ];
}

export function formatSha(sha: string, len = 8) {
  return sha.length > len ? sha.slice(0, len) : sha;
}

export function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function formatDateTime(iso: string) {
  const d = new Date(iso);
  return (
    d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) +
    ", " +
    d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
  );
}

export function formatDuration(ms?: number) {
  if (!ms) return "—";
  const m = Math.round(ms / 60000);
  if (m < 1) return `${Math.round(ms / 1000)}s`;
  return `${m}m ${Math.round((ms % 60000) / 1000)}s`;
}
