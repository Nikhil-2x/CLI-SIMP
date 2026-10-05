// Scanner adapter contract. Every scanner (Semgrep, Bandit, Gitleaks, OSV, ...)
// implements this interface so the core engine never needs to know about
// individual tool CLIs or output formats. See WM-Sentinel plan, Phase 3.

import type { SecurityFinding } from "../../types/finding.js";

export interface ScanContext {
  /** Absolute path to the checked-out project on disk. */
  projectPath: string;
  /** Restrict the scan to a subset of files (used for PR scans). */
  changedFiles?: string[];
  commitSha?: string;
  branch?: string;
}

export interface ScannerResult {
  scanner: string;
  startedAt: string;
  completedAt: string;
  findings: SecurityFinding[];
  rawOutput: unknown;
  error?: string;
  /** True when the tool isn't installed — not a failure. */
  skipped?: boolean;
}

export interface Scanner {
  name: string;
  isAvailable(): Promise<boolean>;
  scan(context: ScanContext): Promise<ScannerResult>;
}
