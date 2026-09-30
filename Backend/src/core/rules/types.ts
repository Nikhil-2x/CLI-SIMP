import type { SecurityFinding } from "../../types/finding.js";

export interface RuleContext {
  projectPath: string;
  /** Findings already produced by scanners/other rules, in case a rule wants context. */
  existingFindings: SecurityFinding[];
}

/**
 * A World Monitor-specific security expectation/check — NOT a claim that a
 * vulnerability exists. Each rule inspects the codebase for evidence that
 * an expected security property may be violated and reports it as a
 * CUSTOM-sourced finding for a human to confirm. See plan Phase 5/8.
 */
export interface WMRule {
  code: string; // e.g. "WM-AUTH-001"
  title: string;
  description: string;
  evaluate(context: RuleContext): Promise<SecurityFinding[]>;
}
