// KavachX frontend domain types.
// Mirrors Backend/src/types/finding.ts, core/correlation/types.ts,
// core/risk/types.ts, core/pr/types.ts and prisma/schema.prisma.
// The UI never imports Prisma — these are plain TS interfaces served
// today by lib/mock/* and tomorrow by the Express REST API.

export type Severity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";

export type Priority = "P0" | "P1" | "P2" | "P3";

export type FindingCategory =
  | "AUTHENTICATION"
  | "AUTHORIZATION"
  | "INPUT_VALIDATION"
  | "API_SECURITY"
  | "SECRETS"
  | "DEPENDENCY"
  | "INJECTION"
  | "CONFIGURATION"
  | "CRYPTOGRAPHY"
  | "OTHER";

export type FindingSource =
  | "SEMGREP"
  | "SONARQUBE"
  | "BANDIT"
  | "GITLEAKS"
  | "OSV"
  | "TRIVY"
  | "ZAP"
  | "NUCLEI"
  | "CUSTOM";

/** UX lifecycle. Maps from Prisma FindingStatus + RetestStatus. */
export type LifecycleStatus =
  | "potential"
  | "confirmed"
  | "fixed"
  | "retest-passed"
  | "retest-required"
  | "unchanged"
  | "false-positive";

export const PRISMA_STATUS_TO_LIFECYCLE: Record<string, LifecycleStatus> = {
  OPEN: "potential",
  CONFIRMED: "confirmed",
  FIXED: "fixed",
  RETEST_REQUIRED: "retest-required",
  FALSE_POSITIVE: "false-positive",
};

export type EvidenceType = "REQUEST" | "RESPONSE" | "SNIPPET" | "OBSERVATION" | "SCREENSHOT";

export interface EvidenceItem {
  id: string;
  findingId: string;
  type: EvidenceType;
  /** Human label for the evidence kind (scanner output, code location, …) */
  kind: "scanner-output" | "code-location" | "validation" | "retest" | "pr-comparison";
  title: string;
  content: string;
  source: FindingSource;
  capturedAt: string;
  /** verified = reviewed by analyst; captured = raw scanner artifact */
  status: "verified" | "captured" | "pending";
}

export interface FindingMember {
  fingerprint: string;
  source: FindingSource;
  title: string;
  severity: Severity;
  confidence: number;
}

export interface Finding {
  id: string;
  title: string;
  description: string;
  severity: Severity;
  confidence: number;
  category: FindingCategory;
  /** All scanners that detected this correlated issue */
  sources: FindingSource[];
  members: FindingMember[];
  filePath?: string;
  lineStart?: number;
  lineEnd?: number;
  endpoint?: string;
  component?: string;
  cweId?: string;
  cveId?: string;
  cvssScore?: number;
  riskScore: number; // 0-100, same formula as Backend risk engine
  priority: Priority; // P0>=85 P1>=65 P2>=40 else P3
  status: LifecycleStatus;
  projectId: string;
  assessmentId: string;
  evidence: EvidenceItem[];
  whyItMatters: string;
  remediation: string;
  firstSeen: string;
  lastSeen: string;
  timeline: { stage: "Detected" | "Reviewed" | "Confirmed" | "Fixed" | "Retested"; at?: string; done: boolean }[];
}

export type AssessmentStatus = "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";
export type AssessmentType = "FULL" | "PR" | "MANUAL" | "RETEST";
/** Display label: PENDING renders as "Queued" */
export const ASSESSMENT_STATUS_LABEL: Record<AssessmentStatus, string> = {
  PENDING: "Queued",
  RUNNING: "Running",
  COMPLETED: "Completed",
  FAILED: "Failed",
};

export interface ScannerResult {
  scanner: FindingSource;
  status: "COMPLETED" | "RUNNING" | "FAILED" | "SKIPPED" | "PENDING";
  findingCount: number;
  error?: string;
  durationMs?: number;
}

export interface Assessment {
  id: string;
  projectId: string;
  type: AssessmentType;
  status: AssessmentStatus;
  commitSha: string;
  branch: string;
  startedAt: string;
  completedAt?: string;
  createdAt: string;
  durationMs?: number;
  source: string;
  scannerResults: ScannerResult[];
  findingIds: string[];
  progress?: number; // 0-100 for RUNNING
  error?: string; // for FAILED
}

export interface Project {
  id: string;
  name: string;
  repositoryUrl: string;
  defaultBranch: string;
  lastAssessmentAt: string;
  lastCommitSha: string;
  openFindings: number;
  criticalHigh: number;
  securityStatus: "needs-attention" | "monitoring" | "stable";
  coverageStatus: "full" | "partial" | "pr-only";
  language: string;
}

export type RetestStatus = "PENDING" | "VULNERABLE" | "FIXED" | "INCONCLUSIVE";

export interface Retest {
  id: string;
  findingId: string;
  findingTitle: string;
  severity: Severity;
  originalStatus: string;
  currentStatus: string;
  commitSha: string;
  status: RetestStatus;
  previousResult: string;
  currentResult: string;
  beforeSnippet: string;
  afterSnippet: string;
  date: string;
  assessmentId: string;
}

export type PRFindingState = "NEW" | "FIXED" | "UNCHANGED";
export type GateStatus = "PASSED" | "BLOCKED" | "PENDING";

export interface PRFindingRef {
  findingId: string;
  title: string;
  severity: Severity;
  confidence: number;
  state: PRFindingState;
}

export interface PullRequest {
  id: string;
  number: number;
  title: string;
  projectId: string;
  branch: string;
  baseBranch: string;
  headSha: string;
  baseSha: string;
  author: string;
  createdAt: string;
  gateStatus: GateStatus;
  /** Exact strings produced by the gate semantics (blockOn CRITICAL, minConfidence 50) */
  gateReason?: string;
  gateWarnings: string[];
  newCount: number;
  fixedCount: number;
  unchangedCount: number;
  newBySeverity: Record<Severity, number>;
  findings: PRFindingRef[];
}

export interface ReportItem {
  id: string;
  name: string;
  kind: "Assessment Report" | "Security Summary" | "Findings Report" | "PR Security Report";
  format: "JSON" | "SARIF" | "HTML" | "PDF";
  assessmentId?: string;
  createdAt: string;
  sizeKb: number;
  description: string;
}

// ---- helpers shared by UI ----

export const SEVERITY_ORDER: Severity[] = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"];

export const SEVERITY_META: Record<Severity, { label: string; color: string; bg: string; dot: string }> = {
  CRITICAL: { label: "Critical", color: "text-[#DC2626]", bg: "bg-red-50 border-red-200", dot: "bg-[#DC2626]" },
  HIGH: { label: "High", color: "text-[#EA580C]", bg: "bg-orange-50 border-orange-200", dot: "bg-[#EA580C]" },
  MEDIUM: { label: "Medium", color: "text-[#D97706]", bg: "bg-amber-50 border-amber-200", dot: "bg-[#D97706]" },
  LOW: { label: "Low", color: "text-[#2563EB]", bg: "bg-blue-50 border-blue-200", dot: "bg-[#2563EB]" },
  INFO: { label: "Info", color: "text-[#64748B]", bg: "bg-slate-100 border-slate-200", dot: "bg-[#64748B]" },
};

export const PRIORITY_META: Record<Priority, { label: string; color: string }> = {
  P0: { label: "P0", color: "#DC2626" },
  P1: { label: "P1", color: "#EA580C" },
  P2: { label: "P2", color: "#D97706" },
  P3: { label: "P3", color: "#2563EB" },
};

export const LIFECYCLE_META: Record<LifecycleStatus, { label: string; classes: string; dot: string }> = {
  potential: { label: "Potential", classes: "bg-amber-50 text-amber-800 border-amber-200", dot: "bg-[#D97706]" },
  confirmed: { label: "Confirmed", classes: "bg-red-50 text-red-700 border-red-200", dot: "bg-[#DC2626]" },
  fixed: { label: "Fixed", classes: "bg-green-50 text-green-700 border-green-200", dot: "bg-[#16A34A]" },
  "retest-passed": { label: "Retest Passed", classes: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-[#16A34A]" },
  "retest-required": { label: "Retest Required", classes: "bg-teal-50 text-teal-800 border-teal-200", dot: "bg-[#0F766E]" },
  unchanged: { label: "Unchanged", classes: "bg-slate-100 text-slate-600 border-slate-200", dot: "bg-[#64748B]" },
  "false-positive": { label: "False Positive", classes: "bg-slate-100 text-slate-500 border-slate-200", dot: "bg-[#64748B]" },
};
