import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { CorrelatedFinding } from "../../core/correlation/types.js";
import type { RiskOutput } from "../../core/risk/types.js";
import type { AssessmentResult } from "../../core/engine/index.js";

const STATE_DIR = ".wm-sentinel";
const LAST_REPORT_FILE = "last-report.json";
const DEFAULT_OUTPUT_FILE = "wm-sentinel-report.json";

export interface ReportFile {
  version: 1;
  projectPath: string;
  branch?: string;
  commitSha?: string;
  generatedAt: string;
  scannerResults: Array<{ scanner: string; findingCount: number; error?: string; skipped?: boolean }>;
  /** PR mode: the changed-file list this scan was restricted to. */
  changedFiles?: string[];
  rawFindingCount: number;
  findings: Array<CorrelatedFinding & RiskOutput>;
}

/** Shapes an engine result into the on-disk / API report format. Raw scanner output is not kept. */
export function buildReportFile(
  result: AssessmentResult,
  meta: { projectPath: string; branch?: string; commitSha?: string; changedFiles?: string[] }
): ReportFile {
  return {
    version: 1,
    projectPath: meta.projectPath,
    ...(meta.branch ? { branch: meta.branch } : {}),
    ...(meta.commitSha ? { commitSha: meta.commitSha } : {}),
    generatedAt: new Date().toISOString(),
    scannerResults: result.scannerResults.map((r) => ({
      scanner: r.scanner,
      findingCount: r.findings.length,
      ...(r.error ? { error: r.error } : {}),
      ...(r.skipped ? { skipped: true } : {}),
    })),
    ...(meta.changedFiles ? { changedFiles: meta.changedFiles } : {}),
    rawFindingCount: result.rawFindingCount,
    findings: result.findings,
  };
}

export async function saveReport(
  projectPath: string,
  report: ReportFile,
  outputPath?: string
): Promise<string> {
  const stateDir = join(projectPath, STATE_DIR);
  await mkdir(stateDir, { recursive: true });

  const json = JSON.stringify(report, null, 2);
  await writeFile(join(stateDir, LAST_REPORT_FILE), json, "utf-8");

  const finalOutput = outputPath ?? join(projectPath, DEFAULT_OUTPUT_FILE);
  await writeFile(finalOutput, json, "utf-8");

  return finalOutput;
}

export async function loadLastReport(projectPath: string): Promise<ReportFile | null> {
  try {
    const raw = await readFile(join(projectPath, STATE_DIR, LAST_REPORT_FILE), "utf-8");
    return JSON.parse(raw) as ReportFile;
  } catch {
    return null;
  }
}
