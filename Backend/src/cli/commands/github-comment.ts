import { resolve } from "node:path";
import { readFile } from "node:fs/promises";
import * as p from "@clack/prompts";
import chalk from "chalk";
import { runAssessment } from "../../core/engine/index.js";
import { classifyFindings } from "../../core/pr/diff.js";
import { evaluateGate, DEFAULT_GATE_OPTIONS } from "../../core/pr/gate.js";
import { buildPRComment } from "../../core/pr/comment.js";
import { upsertPRComment } from "../../core/github/postComment.js";
import { loadLastReport } from "../lib/report.js";
import { resolveBaseRef, withBaselineWorktree } from "../lib/worktree.js";

export interface GithubCommentOptions {
  base?: string;
}

interface GitHubPullRequestEvent {
  pull_request?: { number: number };
}

async function resolvePRNumber(): Promise<number | undefined> {
  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (!eventPath) return undefined;
  try {
    const raw = await readFile(eventPath, "utf-8");
    const event = JSON.parse(raw) as GitHubPullRequestEvent;
    return event.pull_request?.number;
  } catch {
    return undefined;
  }
}

export async function githubCommentCommand(
  targetPath: string,
  options: GithubCommentOptions
): Promise<void> {
  const projectPath = resolve(targetPath || ".");
  const base = options.base ?? process.env.GITHUB_BASE_REF ?? "main";

  const currentReport = await loadLastReport(projectPath);
  if (!currentReport) {
    console.error(chalk.red("No current report found — run `wm-sentinel scan --pr` first."));
    process.exitCode = 1;
    return;
  }

  const spinner = p.spinner();
  spinner.start(`Scanning baseline (${base})...`);

  const baseRef = await resolveBaseRef(projectPath, base);
  const baselineFindings = await withBaselineWorktree(projectPath, baseRef, async (worktreePath) => {
    const result = await runAssessment({ projectPath: worktreePath });
    return result.findings;
  });

  if (baselineFindings === null) {
    spinner.stop(`Could not check out baseline "${baseRef}" — treating all findings as new.`);
  } else {
    spinner.stop(`Baseline (${baseRef}): ${baselineFindings.length} finding(s).`);
  }

  const diff = classifyFindings(baselineFindings ?? [], currentReport.findings);
  const gate = evaluateGate(diff.new, DEFAULT_GATE_OPTIONS);
  const body = buildPRComment(diff, gate, { existingCount: baselineFindings?.length ?? 0 });

  console.log();
  console.log(body);
  console.log();

  const token = process.env.GITHUB_TOKEN;
  const repoSlug = process.env.GITHUB_REPOSITORY; // "owner/repo"
  const prNumber = await resolvePRNumber();
  const [owner, repo] = repoSlug?.split("/") ?? [];

  if (token && owner && repo && prNumber) {
    await upsertPRComment({ token, owner, repo, prNumber, body });
    console.log(chalk.green(`Posted comment to ${owner}/${repo}#${prNumber}`));
  } else {
    console.log(
      chalk.yellow(
        "GITHUB_TOKEN / GITHUB_REPOSITORY / PR number not available — printed the comment instead of posting it."
      )
    );
  }

  if (!gate.passed) {
    console.error(chalk.red.bold(`\nSecurity gate FAILED: ${gate.reason}`));
    process.exitCode = 1;
  } else {
    console.log(chalk.green.bold("\nSecurity gate passed."));
  }
}
