// Clean data-access layer.
// Today: mock implementation (lib/mock). Tomorrow: fetch() against the
// Express REST API. Components must only use `api`, never mockData directly.
//
// No Prisma imports here — by design. No invented endpoints: the interface
// mirrors concepts the CLI/backend already produce.
import {
  assessments,
  findings,
  projects,
  pullRequests,
  reports,
  retests,
} from "@/lib/mock/mockData";
import type {
  Assessment,
  Finding,
  Project,
  PullRequest,
  ReportItem,
  Retest,
} from "@/lib/types";

export const DATA_SOURCE: "mock" | "api" = "mock";
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

/** Toggles for demonstrating loading / error / empty states in the demo. */
export const demoFlags = {
  simulateLatencyMs: 250,
  simulateError: false as boolean,
  emptyMode: false as boolean,
};

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function guard<T>(value: T): Promise<T> {
  if (demoFlags.simulateLatencyMs) await delay(demoFlags.simulateLatencyMs);
  if (demoFlags.simulateError) throw new Error("API unavailable (simulated). Start the Express backend or clear the flag.");
  return value;
}

export interface DashboardKpis {
  openFindings: number;
  criticalHigh: number;
  verifiedFindings: number;
  retestsPassed: number;
}

export const api = {
  async getProjects(): Promise<Project[]> {
    return guard(demoFlags.emptyMode ? [] : projects);
  },
  async getProject(id: string): Promise<Project | undefined> {
    return guard((demoFlags.emptyMode ? [] : projects).find((p) => p.id === id));
  },
  async getAssessments(projectId?: string): Promise<Assessment[]> {
    const all = demoFlags.emptyMode ? [] : assessments;
    return guard(projectId ? all.filter((a) => a.projectId === projectId) : all);
  },
  async getAssessment(id: string): Promise<Assessment | undefined> {
    return guard(assessments.find((a) => a.id === id));
  },
  async getFindings(projectId?: string): Promise<Finding[]> {
    const all = demoFlags.emptyMode ? [] : findings;
    return guard(projectId ? all.filter((f) => f.projectId === projectId) : all);
  },
  async getFinding(id: string): Promise<Finding | undefined> {
    return guard(findings.find((f) => f.id === id));
  },
  async getRetests(): Promise<Retest[]> {
    return guard(demoFlags.emptyMode ? [] : retests);
  },
  async getPullRequests(): Promise<PullRequest[]> {
    return guard(demoFlags.emptyMode ? [] : pullRequests);
  },
  async getPullRequest(id: string): Promise<PullRequest | undefined> {
    return guard(pullRequests.find((p) => p.id === id));
  },
  async getReports(): Promise<ReportItem[]> {
    return guard(demoFlags.emptyMode ? [] : reports);
  },
  async getKpis(): Promise<DashboardKpis> {
    const open = findings.filter((f) => !["fixed", "retest-passed", "false-positive"].includes(f.status));
    return guard({
      openFindings: open.length,
      criticalHigh: open.filter((f) => f.severity === "CRITICAL" || f.severity === "HIGH").length,
      verifiedFindings: findings.filter((f) => f.status === "fixed" || f.status === "retest-passed").length,
      retestsPassed: retests.filter((r) => r.status === "FIXED").length,
    });
  },
  /** Creates a mock QUEUED assessment (dashboard-only until the API/worker exists). */
  async queueAssessment(projectId: string, branch: string): Promise<Assessment> {
    const project = projects.find((p) => p.id === projectId);
    const created: Assessment = {
      id: `asm-${Date.now().toString().slice(-4)}`,
      projectId,
      type: "MANUAL",
      status: "PENDING",
      commitSha: project?.lastCommitSha ?? "pending",
      branch,
      startedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      source: "Queued from dashboard (demo — worker not yet connected)",
      scannerResults: [],
      findingIds: [],
    };
    assessments.unshift(created);
    return guard(created);
  },
};

export type KavachApi = typeof api;
