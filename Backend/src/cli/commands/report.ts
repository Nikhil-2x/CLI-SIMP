import { resolve } from "node:path";
import { writeFile } from "node:fs/promises";
import chalk from "chalk";
import { loadLastReport } from "../lib/report.js";
import { toHtml, toSarif } from "../../core/report/index.js";
import { summaryLines } from "../lib/output.js";

export interface ReportOptions {
  output?: string;
  format?: string; // json | sarif | html
}

export async function reportCommand(targetPath: string, options: ReportOptions): Promise<void> {
  const projectPath = resolve(targetPath || ".");
  const report = await loadLastReport(projectPath);

  if (!report) {
    console.log(chalk.yellow("No report found. Run `wm-sentinel scan` first."));
    return;
  }

  const format = (options.format ?? "json").toLowerCase();
  const exporters: Record<string, { ext: string; render: () => string }> = {
    json: { ext: "json", render: () => JSON.stringify(report, null, 2) },
    sarif: { ext: "sarif", render: () => JSON.stringify(toSarif(report), null, 2) },
    html: { ext: "html", render: () => toHtml(report) },
  };
  const exporter = exporters[format];
  if (!exporter) {
    console.log(chalk.yellow(`Unknown format "${format}". Use json, sarif or html (pdf: open the HTML and print).`));
    process.exitCode = 1;
    return;
  }

  const outputPath = options.output ?? `wm-sentinel-report-${Date.now()}.${exporter.ext}`;
  await writeFile(outputPath, exporter.render(), "utf-8");

  console.log(chalk.bold(`Report exported: ${outputPath}`));
  console.log(`Generated at: ${report.generatedAt}`);
  console.log(`Findings: ${report.findings.length}\n`);
  console.log(summaryLines(report.findings).join("\n"));
}
