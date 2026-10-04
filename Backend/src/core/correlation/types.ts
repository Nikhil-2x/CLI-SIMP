import type { CodeContext, FindingCategory, FindingSource, SecurityFinding, Severity } from "../../types/finding.js";

/**
 * The result of merging one or more raw SecurityFinding records that were
 * judged to represent the same underlying root issue. This is what gets
 * shown on the dashboard instead of N separate scanner alerts.
 */
export interface CorrelatedFinding {
  id: string;

  title: string;
  description: string;

  severity: Severity; // highest severity among members
  confidence: number; // highest confidence among members

  category: FindingCategory;
  sources: FindingSource[]; // unique scanners that detected this issue

  filePath?: string;
  lineStart?: number;
  lineEnd?: number;
  endpoint?: string;

  cweId?: string;
  cveId?: string;
  cvssScore?: number;

  context?: CodeContext;

  members: SecurityFinding[];
}
