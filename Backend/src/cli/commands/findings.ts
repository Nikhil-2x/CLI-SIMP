import { resolve } from "node:path";
import chalk from "chalk";
import { loadLastReport } from "../lib/report.js";
import { findingRow } from "../lib/output.js";
import type { Severity, FindingSource } from "../../types/finding.js";

export interface FindingsOptions {
  severity?: string;
  source?: string;
  production?: boolean;
}

export async function findingsCommand(targetPath: string, options: FindingsOptions): Promise<void> {
  const projectPath = resolve(targetPath || ".");
  const report = await loadLastReport(projectPath);

  if (!report) {
    console.log(chalk.yellow("No report found. Run `wm-sentinel scan` first."));
    return;
  }

  let findings = report.findings;

  if (options.severity) {
    const wanted = options.severity.toUpperCase() as Severity;
    findings = findings.filter((f) => f.severity === wanted);
  }

  if (options.source) {
    const wanted = options.source.toUpperCase() as FindingSource;
    findings = findings.filter((f) => f.sources.includes(wanted));
  }

  if (options.production) {
    findings = findings.filter((f) => (f.context ?? "production") === "production");
  }

  if (findings.length === 0) {
    console.log(chalk.dim("No findings match those filters."));
    return;
  }

  console.log(chalk.bold(`${findings.length} finding(s) from the last scan (${report.generatedAt}):\n`));
  for (const finding of findings) {
    console.log(findingRow(finding));
    console.log();
  }
}
