import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
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

// Entropy-based catch-alls: "this string looks random". Useful to surface,
// far too noisy to treat like a known-format credential (AWS key, GitHub PAT...).
const GENERIC_RULES = new Set(["generic-api-key", "curl-auth-header", "curl-auth-user"]);

function toFinding(leak: GitleaksLeak): SecurityFinding {
  const generic = GENERIC_RULES.has(leak.RuleID);
  return {
    fingerprint: makeFingerprint(["GITLEAKS", leak.RuleID, leak.File, leak.StartLine]),
    title: `Potential secret: ${leak.Description}`,
    description:
      `Gitleaks rule "${leak.RuleID}" matched what looks like a secret. ` +
      "The secret value itself is redacted — rotate it if confirmed and remove it from history.",
    severity: generic ? "MEDIUM" : "HIGH",
    confidence: generic ? 35 : 85,
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

    // Extend the default ruleset but skip vendored/build dirs and lockfiles
    // (integrity hashes there look like secrets).
    const configPath = join(reportDir, "gitleaks.toml");
    await writeFile(
      configPath,
      [
        "[extend]",
        "useDefault = true",
        "[allowlist]",
        "paths = ['(^|/)(node_modules|venv|dist|build|\\.venv|\\.next|\\.git|\\.wm-sentinel)/', 'package-lock\\.json$']",
        "",
      ].join("\n"),
      "utf-8"
    );

    const args = [
      "detect",
      "--config",
      configPath,
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
