import type { Severity } from "../../types/finding.js";
import type { ClassifiedFinding } from "./types.js";

const SEVERITY_ORDER: Severity[] = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"];

export interface GateOptions {
  /** Severities that block the gate if present among NEW findings. */
  failOn: Severity[];
}

export const DEFAULT_GATE_OPTIONS: GateOptions = { failOn: ["CRITICAL", "HIGH"] };

export interface GateResult {
  passed: boolean;
  reason?: string;
  newBySeverity: Record<Severity, number>;
}

export function evaluateGate(
  newFindings: ClassifiedFinding[],
  options: GateOptions = DEFAULT_GATE_OPTIONS
): GateResult {
  const newBySeverity: Record<Severity, number> = {
    CRITICAL: 0,
    HIGH: 0,
    MEDIUM: 0,
    LOW: 0,
    INFO: 0,
  };
  for (const f of newFindings) newBySeverity[f.severity]++;

  const blockingSeverity = SEVERITY_ORDER.find(
    (sev) => options.failOn.includes(sev) && newBySeverity[sev] > 0
  );

  if (blockingSeverity) {
    return {
      passed: false,
      reason: `New ${blockingSeverity} severity finding detected.`,
      newBySeverity,
    };
  }

  return { passed: true, newBySeverity };
}
