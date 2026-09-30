import { resolve, join } from "node:path";
import { readFile, writeFile } from "node:fs/promises";
import * as p from "@clack/prompts";
import chalk from "chalk";
import { runAssessment } from "../../core/engine/index.js";
import { getGitInfo } from "../lib/git.js";
import { loadLastReport } from "../lib/report.js";

interface RetestLogEntry {
  findingId: string;
  status: "FIXED" | "VULNERABLE";
  previousSeverity: string;
  checkedAt: string;
}

async function appendRetestLog(projectPath: string, entry: RetestLogEntry): Promise<void> {
  const logPath = join(projectPath, ".wm-sentinel", "retests.json");
  let existing: RetestLogEntry[] = [];
  try {
    existing = JSON.parse(await readFile(logPath, "utf-8"));
  } catch {
    // no log yet
  }
  existing.push(entry);
  await writeFile(logPath, JSON.stringify(existing, null, 2), "utf-8");
}

export async function verifyCommand(findingId: string, targetPath: string): Promise<void> {
  const projectPath = resolve(targetPath || ".");

  const lastReport = await loadLastReport(projectPath);
  const previousFinding = lastReport?.findings.find((f) => f.id.startsWith(findingId));

  if (!previousFinding) {
    console.log(
      chalk.red(`No finding starting with "${findingId}" found in the last report. Run \`wm-sentinel scan\` first.`)
    );
    process.exitCode = 1;
    return;
  }

  p.intro(chalk.bold(`Retesting ${previousFinding.id.slice(0, 8)} — ${previousFinding.title}`));

  const spinner = p.spinner();
  spinner.start("Re-running assessment...");

  const gitInfo = await getGitInfo(projectPath);
  const result = await runAssessment({
    projectPath,
    ...(gitInfo.commitSha ? { commitSha: gitInfo.commitSha } : {}),
    ...(gitInfo.branch ? { branch: gitInfo.branch } : {}),
  });

  const stillPresent = result.findings.some((f) => f.id === previousFinding.id);
  spinner.stop(stillPresent ? "Finding is still present." : "Finding no longer detected.");

  await appendRetestLog(projectPath, {
    findingId: previousFinding.id,
    status: stillPresent ? "VULNERABLE" : "FIXED",
    previousSeverity: previousFinding.severity,
    checkedAt: new Date().toISOString(),
  });

  const status = stillPresent ? chalk.red.bold("VULNERABLE") : chalk.green.bold("FIXED");
  p.outro(`Result: ${status}`);
}
