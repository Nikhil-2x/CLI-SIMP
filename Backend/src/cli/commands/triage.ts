import { resolve, join } from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import chalk from "chalk";
import { loadLastReport } from "../lib/report.js";

export interface TriageOptions {
  output?: string;
  limit?: string;
  includeNonProd?: boolean;
}

// A compact view of one finding for the agent to validate. We strip the raw
// `members`/description noise down to what a human reviewer actually needs.
interface WorklistItem {
  id: string;
  severity: string;
  priority?: string;
  confidence: number;
  category: string;
  detectedBy: string[];
  location: string;
  cweId?: string;
  context?: string;
  claim: string;
}

/**
 * Turns the last scan into an agent worklist + prompt. The flow is:
 *   wm-sentinel scan <app>   -> raw findings
 *   wm-sentinel triage <app> -> worklist.json + PROMPT.md + REPORT_TEMPLATE.md
 *   (then) run Claude Code inside the TARGET repo with PROMPT.md
 *
 * This is the "application-aware intelligence layer": the scanners are sensors,
 * the agent reads the real code around each hit and decides TRUE/FALSE positive,
 * writing an evidence-backed report in the assessment deliverable format.
 */
export async function triageCommand(targetPath: string, options: TriageOptions): Promise<void> {
  const projectPath = resolve(targetPath || ".");
  const report = await loadLastReport(projectPath);
  if (!report) {
    console.log(chalk.yellow("No report found. Run `wm-sentinel scan` first."));
    process.exitCode = 1;
    return;
  }

  const limit = Number(options.limit ?? "25");
  const rank: Record<string, number> = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1, INFO: 0 };

  const selected = report.findings
    .filter((f) => options.includeNonProd || (f.context ?? "production") === "production")
    .sort(
      (a, b) =>
        (rank[b.severity] ?? 0) - (rank[a.severity] ?? 0) ||
        (b.confidence ?? 0) - (a.confidence ?? 0) ||
        (b.riskScore ?? 0) - (a.riskScore ?? 0)
    )
    .slice(0, limit);

  const worklist: WorklistItem[] = selected.map((f) => ({
    id: f.id.slice(0, 8),
    severity: f.severity,
    ...(f.priority ? { priority: f.priority } : {}),
    confidence: f.confidence,
    category: f.category,
    detectedBy: f.sources,
    location: f.filePath ? `${f.filePath}:${f.lineStart ?? "?"}` : (f.endpoint ?? "unknown"),
    ...(f.cweId ? { cweId: f.cweId } : {}),
    ...(f.context ? { context: f.context } : {}),
    // The tool's claim is a HYPOTHESIS, never a confirmed vuln — the agent tests it.
    claim: (f.description.split("\n")[0] ?? f.title).slice(0, 300),
  }));

  const outDir = resolve(options.output ?? join(projectPath, "wm-sentinel-triage"));
  await mkdir(outDir, { recursive: true });
  await writeFile(join(outDir, "worklist.json"), JSON.stringify(worklist, null, 2), "utf-8");
  await writeFile(join(outDir, "PROMPT.md"), buildPrompt(worklist.length, report.projectPath), "utf-8");
  await writeFile(join(outDir, "REPORT_TEMPLATE.md"), REPORT_TEMPLATE, "utf-8");

  console.log(chalk.bold(`\nTriage kit ready: ${outDir}`));
  console.log(`  worklist.json        ${worklist.length} finding(s) to validate`);
  console.log(`  PROMPT.md            paste into Claude Code, run inside the target repo`);
  console.log(`  REPORT_TEMPLATE.md   deliverable format (one block per confirmed finding)\n`);
  const bySev = selected.reduce<Record<string, number>>((a, f) => ((a[f.severity] = (a[f.severity] ?? 0) + 1), a), {});
  console.log("  selected: " + Object.entries(bySev).map(([s, n]) => `${s}=${n}`).join("  "));
  console.log(chalk.dim("\n  next: cd into the target app and run Claude Code with PROMPT.md"));
}

function buildPrompt(count: number, appName: string): string {
  return `# WM-Sentinel — Agent Triage Task

You are a security analyst validating automated scanner findings against the
**${appName}** source code. You are running inside the target repository.

## Context
WM-Sentinel ran Semgrep, Bandit, Gitleaks, OSV-Scanner and custom rules, then
correlated and risk-ranked the results. \`wm-sentinel-triage/worklist.json\` holds
the top ${count} findings. **Each is a HYPOTHESIS, not a confirmed vulnerability.**
Your job is to confirm or dismiss each one by reading the actual code.

## Rules (authorized assessment)
- Read-only static analysis of THIS local repo. Do NOT run exploits, do NOT
  touch any network host, do NOT test the production site.
- Never reproduce real secret VALUES in your output — reference location only.
- Do not invent vulnerabilities. If the code refutes the finding, mark it FALSE
  POSITIVE and say why. A well-reasoned dismissal is as valuable as a confirmation.

## For each finding in worklist.json
1. Open the file at \`location\` and read enough surrounding code to judge it.
2. Trace whether attacker-controlled input can actually reach the sink, and
   whether an existing control (middleware, allowlist, validation) already stops it.
3. Classify: **CONFIRMED**, **FALSE_POSITIVE**, or **NEEDS_DYNAMIC** (only
   provable by running the app).
4. For CONFIRMED findings, map to the assessment scope area: Authentication /
   Authorization / Input validation / API security / Client-side / Secure
   communication / Data storage.

## Output
Write \`wm-sentinel-triage/ASSESSMENT.md\`. Start with a summary table
(id | severity | verdict | scope area). Then, for every CONFIRMED finding, fill
one block of \`REPORT_TEMPLATE.md\` with real file:line evidence, a CVSS 3.1
vector + score you compute, concrete reproduction steps, a safe proof-of-concept
(a request shape or minimal script — not a live attack), business impact, and a
specific code-level remediation. List FALSE_POSITIVE findings in one short
section with a one-line reason each.

Work through the whole worklist before writing the report. Be skeptical and precise.
`;
}

const REPORT_TEMPLATE = `## Finding: <TITLE>

- **ID:** <wm-sentinel id>
- **Scope area:** <Authentication | Authorization | Input validation | API security | Client-side | Secure communication | Data storage>
- **Affected component:** \`<path/to/file.ts:line>\`
- **Detected by:** <Semgrep | Bandit | Gitleaks | OSV | custom rule(s)>
- **Severity:** <CRITICAL | HIGH | MEDIUM | LOW>
- **CVSS 3.1:** <score> (\`<vector string>\`)

### Description
<What the issue is, in plain language.>

### Evidence
\`\`\`
<code excerpt with file:line — NO real secret values>
\`\`\`
<Why this is exploitable: the data flow from attacker input to the sink, and why
existing controls do not stop it.>

### Steps to reproduce
1. <...>
2. <...>

### Proof of concept (safe)
<A request shape, payload, or minimal script that demonstrates the issue in a
local/test environment only. Do not target production.>

### Business impact
<Who/what is affected: confidentiality, integrity, availability; which data or users.>

### Remediation
<Specific, code-level fix. Reference the exact function/line to change.>
`;
