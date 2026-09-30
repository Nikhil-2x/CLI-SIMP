import { resolve } from "node:path";
import { writeFile } from "node:fs/promises";
import chalk from "chalk";
import { loadLastReport } from "../lib/report.js";
import { summaryLines } from "../lib/output.js";

export interface ReportOptions {
  output?: string;
  format?: string; // "json" today — sarif/html/pdf land in Phase 16
}

export async function reportCommand(targetPath: string, options: ReportOptions): Promise<void> {
  const projectPath = resolve(targetPath || ".");
  const report = await loadLastReport(projectPath);

  if (!report) {
    console.log(chalk.yellow("No report found. Run `wm-sentinel scan` first."));
    return;
  }

  const format = (options.format ?? "json").toLowerCase();
  if (format !== "json") {
    console.log(
      chalk.yellow(`Format "${format}" isn't implemented yet (only "json" today) — Phase 16 adds SARIF/HTML/PDF.`)
    );
    return;
  }

  const outputPath = options.output ?? `wm-sentinel-report-${Date.now()}.json`;
  await writeFile(outputPath, JSON.stringify(report, null, 2), "utf-8");

  console.log(chalk.bold(`Report exported: ${outputPath}`));
  console.log(`Generated at: ${report.generatedAt}`);
  console.log(`Findings: ${report.findings.length}\n`);
  console.log(summaryLines(report.findings).join("\n"));
}
