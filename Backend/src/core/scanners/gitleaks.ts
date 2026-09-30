import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Scanner, ScanContext, ScannerResult } from "./types.js";
import type { SecurityFinding } from "../../types/finding.js";
import { isCommandAvailable, runCommand } from "./exec.js";
import { makeFingerprint } from "./fingerprint.js";

interface GitleaksLeak {
  Description: string;
  File: string;
  StartLine: number;
  EndLine: number;
  RuleID: string;
  Fingerprint: string;
  // Secret/Match intentionally not read — never surface raw secret material.
}

function toFinding(leak: GitleaksLeak): SecurityFinding {
  return {
    fingerprint: makeFingerprint(["GITLEAKS", leak.RuleID, leak.File, leak.StartLine]),
    title: `Potential secret: ${leak.Description}`,
    description:
      `Gitleaks rule "${leak.RuleID}" matched what looks like a secret. ` +
      "The secret value itself is redacted — rotate it if confirmed and remove it from history.",
    severity: "HIGH",
    confidence: 70,
    category: "SECRETS",
    source: "GITLEAKS",
    filePath: leak.File,
    lineStart: leak.StartLine,
    lineEnd: leak.EndLine,
  };
}

export const GitleaksScanner: Scanner = {
  name: "GITLEAKS",

  async isAvailable() {
    return isCommandAvailable("gitleaks", "version");
  },

  async scan(context: ScanContext): Promise<ScannerResult> {
    const startedAt = new Date().toISOString();

    const reportDir = await mkdtemp(join(tmpdir(), "wm-sentinel-gitleaks-"));
    const reportPath = join(reportDir, "report.json");

    const args = [
      "detect",
      "--source",
      ".",
      "--no-git",
      "--report-format",
      "json",
      "--report-path",
      reportPath,
      "--exit-code",
      "0",
    ];

    const { stderr, code } = await runCommand("gitleaks", args, {
      cwd: context.projectPath,
    });

    const completedAt = new Date().toISOString();

    let leaks: GitleaksLeak[] = [];
    let error: string | undefined;

    try {
      const raw = await readFile(reportPath, "utf-8");
      leaks = raw.trim() ? JSON.parse(raw) : [];
    } catch {
      // No report file is written when gitleaks finds nothing under some versions.
      if (code !== 0) {
        error = stderr || `gitleaks exited with code ${code}`;
      }
    } finally {
      await rm(reportDir, { recursive: true, force: true });
    }

    return {
      scanner: "GITLEAKS",
      startedAt,
      completedAt,
      findings: leaks.map(toFinding),
      rawOutput: { leakCount: leaks.length },
      ...(error ? { error } : {}),
    };
  },
};
