// Universal finding schema — the common language every scanner adapter normalizes into.
// See WM-Sentinel plan, Phase 2.

export type Severity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";

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

export interface Evidence {
  type: "REQUEST" | "RESPONSE" | "SNIPPET" | "OBSERVATION" | "SCREENSHOT";
  content: string;
  capturedAt: string;
}

/** Where the flagged code lives. Non-production findings are kept but can't block the gate. */
export type CodeContext = "production" | "test" | "docs" | "generated";

export interface SecurityFinding {
  fingerprint: string;

  title: string;
  description: string;

  severity: Severity;
  confidence: number; // 0-100

  category: FindingCategory;
  source: FindingSource;

  filePath?: string;
  lineStart?: number;
  lineEnd?: number;

  component?: string;
  endpoint?: string;

  cweId?: string;
  cveId?: string;
  cvssScore?: number;

  context?: CodeContext;

  evidence?: Evidence[];
}
