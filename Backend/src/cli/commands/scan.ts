import { resolve } from "node:path";
import * as p from "@clack/prompts";
import chalk from "chalk";
import { runAssessment } from "../../core/engine/index.js";
import { loadConfig } from "../../core/config/index.js";
import type { ScanContext } from "../../core/scanners/types.js";
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

  const gitInfo = await getGitInfo(projectPath);
  const config = await loadConfig(projectPath);
  let changedFiles: string[] | undefined;

  if (options.pr) {
    const base = options.base ?? "main";
    changedFiles = await getChangedFiles(projectPath, base);
    if (changedFiles.length === 0) {
      p.log.warn(`No changed files found against "${base}" — running a full scan instead.`);
      changedFiles = undefined;
    } else {
      p.log.info(`Scanning ${changedFiles.length} changed file(s) against "${base}".`);
    }
  } else {
    p.log.info(`Discovered project at ${projectPath}`);
  }

  const context: ScanContext = {
    projectPath,
    ...(changedFiles ? { changedFiles } : {}),
    ...(gitInfo.commitSha ? { commitSha: gitInfo.commitSha } : {}),
    ...(gitInfo.branch ? { branch: gitInfo.branch } : {}),
  };

  let spinner = p.spinner();
  let rawCount = 0;
  let correlatedCount = 0;

  const result = await runAssessment(context, {
    config,
    hooks: {
      onScannerStart: (name) => {
        spinner = p.spinner();
        spinner.start(`Running ${name}...`);
      },
      onScannerDone: (r, skipped) => {
        if (skipped) spinner.stop(`${r.scanner}: not installed — skipped`);
        else {
          const suffix = r.error ? chalk.red(` (${r.error.split("\n")[0]})`) : "";
          spinner.stop(`${r.scanner}: ${r.findings.length} finding(s)${suffix}`);
        }
      },
      onStage: (stage, info) => {
        if (stage === "rules") p.log.step("Running World Monitor rules, correlating and scoring...");
        if (stage === "risk") {
          rawCount = info?.rawCount ?? 0;
          correlatedCount = info?.correlatedCount ?? 0;
        }
      },
    },
  });

  const report: ReportFile = {
    version: 1,
    projectPath,
    ...(gitInfo.branch ? { branch: gitInfo.branch } : {}),
    ...(gitInfo.commitSha ? { commitSha: gitInfo.commitSha } : {}),
    generatedAt: new Date().toISOString(),
    scannerResults: result.scannerResults.map((r) => ({
      scanner: r.scanner,
      findingCount: r.findings.length,
      ...(r.error ? { error: r.error } : {}),
    })),
    ...(changedFiles ? { changedFiles } : {}),
    rawFindingCount: result.rawFindingCount,
    findings: result.findings,
  };

  const outputPath = await saveReport(projectPath, report, options.output);

  p.outro(
    [
      chalk.bold("Assessment completed."),
      "",
      `Raw findings:        ${rawCount}`,
      `Correlated findings: ${correlatedCount}`,
      "",
      ...summaryLines(result.findings),
      "",
      `Report: ${outputPath}`,
    ].join("\n")
  );
}
