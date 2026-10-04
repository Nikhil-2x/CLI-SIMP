import chalk from "chalk";
import type { Severity } from "../../types/finding.js";
import type { CorrelatedFinding } from "../../core/correlation/types.js";
import type { RiskOutput } from "../../core/risk/types.js";

const SEVERITY_COLOR: Record<Severity, (s: string) => string> = {
  CRITICAL: (s) => chalk.bgRed.white.bold(` ${s} `),
  HIGH: (s) => chalk.red.bold(s),
  MEDIUM: (s) => chalk.yellow(s),
  LOW: (s) => chalk.blue(s),
  INFO: (s) => chalk.gray(s),
};

export function colorSeverity(severity: Severity): string {
  return SEVERITY_COLOR[severity](severity);
}

export function countBySeverity(findings: Array<{ severity: Severity }>): Record<Severity, number> {
  const counts: Record<Severity, number> = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, INFO: 0 };
  for (const f of findings) counts[f.severity]++;
  return counts;
}

export function summaryLines(findings: Array<{ severity: Severity }>): string[] {
  const counts = countBySeverity(findings);
  return [
    `${colorSeverity("CRITICAL")}: ${counts.CRITICAL}`,
    `${colorSeverity("HIGH")}:     ${counts.HIGH}`,
    `${colorSeverity("MEDIUM")}:   ${counts.MEDIUM}`,
    `${colorSeverity("LOW")}:      ${counts.LOW}`,
  ];
}

export function findingRow(finding: CorrelatedFinding & Partial<RiskOutput>): string {
  const id = finding.id.slice(0, 8);
  const severity = colorSeverity(finding.severity).padEnd(20);
  const location = finding.filePath
    ? `${finding.filePath}:${finding.lineStart ?? "?"}`
    : (finding.endpoint ?? "-");
  const priority = finding.priority ? chalk.dim(`[${finding.priority}]`) : "";
  const context =
    finding.context && finding.context !== "production" ? chalk.dim(` [${finding.context}]`) : "";
  return `${chalk.dim(id)}  ${severity} ${priority} ${finding.title}\n         ${chalk.dim(location)} ${chalk.dim(`(${finding.sources.join(", ")}, ${finding.confidence}% conf)`)}${context}`;
}
