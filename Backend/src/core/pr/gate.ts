import type { Severity } from "../../types/finding.js";
import type { ClassifiedFinding } from "./types.js";

export interface GateOptions {
  /** Severities that fail the gate if any NEW finding has them. */
  blockOn: Severity[];
  /** Severities that are reported as warnings but do not fail the gate. */
  warnOn: Severity[];
  /** Fail when the number of NEW HIGH findings exceeds this. Undefined = no limit. */
  maxNewHigh?: number;
  /**
   * NEW findings below this confidence (0-100) never block — they're shown as
   * warnings. Keeps low-confidence heuristic (CUSTOM) rules from failing PRs.
   */
  minConfidence: number;
}

export const DEFAULT_GATE_OPTIONS: GateOptions = {
  blockOn: ["CRITICAL"],
  warnOn: ["HIGH"],
  maxNewHigh: 0,
  minConfidence: 50,
};

export interface GateResult {
  passed: boolean;
  reason?: string;
  warnings: string[];
  newBySeverity: Record<Severity, number>;
}

export function evaluateGate(
  newFindings: ClassifiedFinding[],
  options: GateOptions = DEFAULT_GATE_OPTIONS
): GateResult {
  const newBySeverity: Record<Severity, number> = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, INFO: 0 };
  const confident: Record<Severity, number> = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, INFO: 0 };

  for (const f of newFindings) {
    newBySeverity[f.severity]++;
    if (f.confidence >= options.minConfidence) confident[f.severity]++;
  }

  const warnings: string[] = [];
  const reasons: string[] = [];

  for (const sev of options.blockOn) {
    if (confident[sev] > 0) reasons.push(`${confident[sev]} new ${sev} severity finding(s)`);
  }
  if (
    options.maxNewHigh !== undefined &&
    !options.blockOn.includes("HIGH") &&
    confident.HIGH > options.maxNewHigh
  ) {
    reasons.push(`${confident.HIGH} new HIGH finding(s) (limit ${options.maxNewHigh})`);
  }

  for (const sev of options.warnOn) {
    if (newBySeverity[sev] > 0 && !reasons.length) warnings.push(`${newBySeverity[sev]} new ${sev} finding(s)`);
  }
  const lowConfidence = newFindings.filter(
    (f) => f.confidence < options.minConfidence && (options.blockOn.includes(f.severity) || f.severity === "HIGH")
  ).length;
  if (lowConfidence > 0) {
    warnings.push(`${lowConfidence} new finding(s) below ${options.minConfidence}% confidence did not block the gate`);
  }

  if (reasons.length) {
    return { passed: false, reason: `New findings: ${reasons.join("; ")}.`, warnings, newBySeverity };
  }
  return { passed: true, warnings, newBySeverity };
}
