import { resolve } from "node:path";
import * as p from "@clack/prompts";
import chalk from "chalk";
import { scanners } from "../../core/scanners/index.js";
import type { ScanContext, ScannerResult } from "../../core/scanners/types.js";
import { flattenFindings } from "../../core/normalizer/index.js";
import { runRules } from "../../core/rules/index.js";
import { correlateFindings } from "../../core/correlation/index.js";
import { scoreFindings } from "../../core/risk/index.js";
import { getChangedFiles, getGitInfo } from "../lib/git.js";
import { saveReport, type ReportFile } from "../lib/report.js";
import { summaryLines } from "../lib/output.js";

export interface ScanOptions {
  full?: boolean;
  pr?: boolean;
  base?: string;
  output?: string;
}

export async function scanCommand(targetPath: string, options: ScanOptions): Promise<void> {
  const projectPath = resolve(targetPath || ".");

  p.intro(chalk.bold("WM-Sentinel Security Assessment"));

  const totalSteps = 1 + scanners.length + 2; // discover + each scanner + correlate + risk
  let step = 1;

  const discoverSpinner = p.spinner();
  discoverSpinner.start(`[${step}/${totalSteps}] Discovering project...`);

  const gitInfo = await getGitInfo(projectPath);
  let changedFiles: string[] | undefined;

  if (options.pr) {
    const base = options.base ?? "main";
    changedFiles = await getChangedFiles(projectPath, base);
    if (changedFiles.length === 0) {
      discoverSpinner.stop(
        `No changed files found against "${base}" — running a full scan instead.`
      );
    } else {
      discoverSpinner.stop(`Discovered ${changedFiles.length} changed file(s) against "${base}".`);
    }
  } else {
    discoverSpinner.stop(`Discovered project at ${projectPath}`);
  }

  const scanContext: ScanContext = {
    projectPath,
    ...(changedFiles?.length ? { changedFiles } : {}),
    ...(gitInfo.commitSha ? { commitSha: gitInfo.commitSha } : {}),
    ...(gitInfo.branch ? { branch: gitInfo.branch } : {}),
  };

  const scannerResults: ScannerResult[] = [];

  for (const scanner of scanners) {
    step++;
    const spinner = p.spinner();
    spinner.start(`[${step}/${totalSteps}] Running ${scanner.name}...`);

    const available = await scanner.isAvailable();
    if (!available) {
      spinner.stop(`${scanner.name}: not installed — skipped`);
      scannerResults.push({
        scanner: scanner.name,
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        findings: [],
        rawOutput: null,
        error: `${scanner.name} is not installed or not on PATH`,
      });
      continue;
    }

    const result = await scanner.scan(scanContext);
    const suffix = result.error ? chalk.red(` (${result.error})`) : "";
    spinner.stop(`${scanner.name}: ${result.findings.length} finding(s)${suffix}`);
    scannerResults.push(result);
  }

  step++;
  const correlateSpinner = p.spinner();
  correlateSpinner.start(`[${step}/${totalSteps}] Correlating findings...`);

  const scannerFindings = flattenFindings(scannerResults);
  const ruleFindings = await runRules({ projectPath, existingFindings: scannerFindings });
  const allFindings = [...scannerFindings, ...ruleFindings];
  const correlated = correlateFindings(allFindings);

  correlateSpinner.stop(
    `Correlated ${allFindings.length} raw finding(s) into ${correlated.length}.`
  );

  step++;
  const riskSpinner = p.spinner();
  riskSpinner.start(`[${step}/${totalSteps}] Calculating risk...`);
  const scored = scoreFindings(correlated);
  riskSpinner.stop("Risk calculated.");

  const report: ReportFile = {
    version: 1,
    projectPath,
    ...(gitInfo.branch ? { branch: gitInfo.branch } : {}),
    ...(gitInfo.commitSha ? { commitSha: gitInfo.commitSha } : {}),
    generatedAt: new Date().toISOString(),
    scannerResults: scannerResults.map((r) => ({
      scanner: r.scanner,
      findingCount: r.findings.length,
      ...(r.error ? { error: r.error } : {}),
    })),
    rawFindingCount: allFindings.length,
    findings: scored,
  };

  const outputPath = await saveReport(projectPath, report, options.output);

  const lines = [
    chalk.bold("Assessment completed."),
    "",
    `Raw findings:        ${allFindings.length}`,
    `Correlated findings: ${scored.length}`,
    "",
    ...summaryLines(scored),
    "",
    `Report: ${outputPath}`,
  ];

  p.outro(lines.join("\n"));
}
