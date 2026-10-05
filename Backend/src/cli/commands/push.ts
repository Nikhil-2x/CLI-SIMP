import { resolve } from "node:path";
import chalk from "chalk";
import { loadLastReport } from "../lib/report.js";
import { summaryLines } from "../lib/output.js";

export interface PushOptions {
  project: string;
  api?: string;
}

/** Uploads the last scan report to the WM-Sentinel API so it shows up in the dashboard. */
export async function pushCommand(targetPath: string, options: PushOptions): Promise<void> {
  const projectPath = resolve(targetPath || ".");
  const report = await loadLastReport(projectPath);
  if (!report) {
    console.log(chalk.yellow("No report found. Run `wm-sentinel scan` first."));
    process.exitCode = 1;
    return;
  }

  const api = (options.api ?? process.env.WM_SENTINEL_API_URL ?? "http://localhost:4000").replace(/\/+$/, "");
  const apiKey = process.env.WM_SENTINEL_API_KEY;
  const url = `${api}/api/projects/${encodeURIComponent(options.project)}/assessments/import`;

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify(report),
    });
  } catch (err) {
    console.log(chalk.red(`Could not reach ${api}: ${err instanceof Error ? err.message : err}`));
    process.exitCode = 1;
    return;
  }

  const body = (await res.json().catch(() => ({}))) as { id?: string; error?: string };
  if (!res.ok) {
    console.log(chalk.red(`Upload failed (${res.status}): ${body.error ?? res.statusText}`));
    process.exitCode = 1;
    return;
  }

  console.log(chalk.green(`Uploaded assessment ${body.id} (${report.findings.length} findings)`));
  console.log(summaryLines(report.findings).join("\n"));
}
