#!/usr/bin/env node
import { Command } from "commander";
import { scanCommand } from "./commands/scan.js";
import { initCommand } from "./commands/init.js";
import { findingsCommand } from "./commands/findings.js";
import { verifyCommand } from "./commands/verify.js";
import { reportCommand } from "./commands/report.js";
import { githubCommentCommand } from "./commands/github-comment.js";
import { pushCommand } from "./commands/push.js";

const program = new Command();

program
  .name("wm-sentinel")
  .description("WM-Sentinel — evidence-driven security assessment CLI for World Monitor")
  .version("0.1.0");

program
  .command("init")
  .description("Set up WM-Sentinel for a project")
  .argument("[path]", "project path", ".")
  .action(initCommand);

program
  .command("scan")
  .description("Run a security assessment")
  .argument("[path]", "project path", ".")
  .option("--full", "run a full assessment (default)")
  .option("--pr", "scan only files changed vs. the base branch")
  .option("--base <branch>", "base branch to diff against for --pr", "main")
  .option("-o, --output <file>", "write the JSON report to this path")
  .action(scanCommand);

program
  .command("findings")
  .description("List findings from the last scan")
  .argument("[path]", "project path", ".")
  .option("--severity <severity>", "filter by severity (CRITICAL|HIGH|MEDIUM|LOW|INFO)")
  .option("--source <source>", "filter by scanner source")
  .option("--production", "hide findings in tests, docs and generated files")
  .action(findingsCommand);

program
  .command("verify")
  .description("Re-scan and check whether a specific finding is still present")
  .argument("<findingId>", "finding id (or a unique prefix) from the last report")
  .argument("[path]", "project path", ".")
  .action(verifyCommand);

program
  .command("report")
  .description("Export the last assessment report")
  .argument("[path]", "project path", ".")
  .option("-o, --output <file>", "output file path")
  .option("--format <format>", "output format: json | sarif | html", "json")
  .action(reportCommand);

program
  .command("github-comment")
  .description("Diff the last scan against the PR's base branch, evaluate the security gate, and post/update a PR comment")
  .argument("[path]", "project path", ".")
  .option("--base <branch>", "base branch to diff against (defaults to $GITHUB_BASE_REF or \"main\")")
  .action(githubCommentCommand);

program
  .command("push")
  .description("Upload the last scan report to the WM-Sentinel API (dashboard)")
  .argument("[path]", "project path", ".")
  .requiredOption("--project <id>", "project id in the WM-Sentinel API")
  .option("--api <url>", "API base URL (defaults to $WM_SENTINEL_API_URL or http://localhost:4000)")
  .action(pushCommand);

program.parseAsync(process.argv);
