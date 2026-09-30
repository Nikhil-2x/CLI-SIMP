// Computes a normalized risk score/priority — deliberately NOT a copy of the
// scanner's own severity. CVSS/technical severity is one input among several;
// see plan Phase 7.

import type { CorrelatedFinding } from "../correlation/types.js";
import type { Exploitability, Priority, RiskInput, RiskOutput } from "./types.js";

export type { RiskInput, RiskOutput, Priority, Exploitability } from "./types.js";

const SEVERITY_SCORE: Record<RiskInput["severity"], number> = {
  CRITICAL: 100,
  HIGH: 75,
  MEDIUM: 50,
  LOW: 25,
  INFO: 10,
};

const EXPLOITABILITY_SCORE: Record<Exploitability, number> = {
  HIGH: 100,
  MEDIUM: 60,
  LOW: 30,
};

const WEIGHTS = {
  severity: 0.4,
  exploitability: 0.25,
  exposure: 0.15,
  sensitivity: 0.1,
  confidence: 0.1,
};

export function calculateRisk(input: RiskInput): RiskOutput {
  const severityScore = SEVERITY_SCORE[input.severity];
  const exploitabilityScore = EXPLOITABILITY_SCORE[input.exploitability];
  const exposureScore = input.internetExposed ? 100 : 40;
  const sensitivityScore = input.sensitiveData ? 100 : 40;

  const riskScore =
    severityScore * WEIGHTS.severity +
    exploitabilityScore * WEIGHTS.exploitability +
    exposureScore * WEIGHTS.exposure +
    sensitivityScore * WEIGHTS.sensitivity +
    input.confidence * WEIGHTS.confidence;

  const rounded = Math.round(riskScore);

  let priority: Priority;
  if (rounded >= 85) priority = "P0";
  else if (rounded >= 65) priority = "P1";
  else if (rounded >= 40) priority = "P2";
  else priority = "P3";

  return { riskScore: rounded, priority };
}

// Categories that inherently touch high-value/sensitive assets or logic.
const HIGH_EXPLOITABILITY_CATEGORIES = new Set(["INJECTION", "AUTHENTICATION", "AUTHORIZATION"]);
const MEDIUM_EXPLOITABILITY_CATEGORIES = new Set(["API_SECURITY", "INPUT_VALIDATION"]);
const SENSITIVE_CATEGORIES = new Set(["AUTHENTICATION", "AUTHORIZATION", "SECRETS", "DEPENDENCY"]);

/**
 * Derives risk inputs from a correlated finding using what we actually know
 * about it today (category, whether it has an endpoint). Once attack-surface
 * mapping (Phase 11) exists, exposure should come from real endpoint
 * metadata instead of this heuristic.
 */
export function inferRiskInputs(finding: CorrelatedFinding): RiskInput {
  const exploitability: Exploitability = HIGH_EXPLOITABILITY_CATEGORIES.has(finding.category)
    ? "HIGH"
    : MEDIUM_EXPLOITABILITY_CATEGORIES.has(finding.category)
      ? "MEDIUM"
      : "LOW";

  return {
    severity: finding.severity,
    confidence: finding.confidence,
    exploitability,
    internetExposed: Boolean(finding.endpoint) || finding.category === "API_SECURITY",
    sensitiveData: SENSITIVE_CATEGORIES.has(finding.category),
  };
}

export function scoreFindings(
  findings: CorrelatedFinding[]
): Array<CorrelatedFinding & RiskOutput> {
  return findings.map((finding) => ({
    ...finding,
    ...calculateRisk(inferRiskInputs(finding)),
  }));
}
