import type { Scanner, ScanContext, ScannerResult } from "./types.js";
import type { SecurityFinding, Severity } from "../../types/finding.js";
import { isCommandAvailable, runCommand } from "./exec.js";
import { makeFingerprint } from "./fingerprint.js";
import { inferCategory } from "./category.js";

interface BanditResult {
  filename: string;
  issue_confidence: "HIGH" | "MEDIUM" | "LOW" | "UNDEFINED";
  issue_severity: "HIGH" | "MEDIUM" | "LOW" | "UNDEFINED";
  issue_text: string;
  line_number: number;
  line_range: number[];
  test_id: string;
  test_name: string;
  cwe?: { id: number };
}

interface BanditOutput {
  results: BanditResult[];
  errors: Array<{ filename: string; reason: string }>;
}

const SEVERITY_MAP: Record<BanditResult["issue_severity"], Severity> = {
  HIGH: "HIGH",
  MEDIUM: "MEDIUM",
  LOW: "LOW",
  UNDEFINED: "LOW",
};

const CONFIDENCE_MAP: Record<BanditResult["issue_confidence"], number> = {
  HIGH: 90,
  MEDIUM: 60,
  LOW: 30,
  UNDEFINED: 20,
};

function toFinding(result: BanditResult): SecurityFinding {
  const cweId = result.cwe ? `CWE-${result.cwe.id}` : undefined;

  return {
    fingerprint: makeFingerprint(["BANDIT", result.test_id, result.filename, result.line_number]),
    title: `${result.test_id}: ${result.test_name}`,
    description: result.issue_text,
    severity: SEVERITY_MAP[result.issue_severity] ?? "LOW",
    confidence: CONFIDENCE_MAP[result.issue_confidence] ?? 50,
    category: inferCategory(cweId, `${result.test_name} ${result.issue_text}`),
    source: "BANDIT",
    filePath: result.filename,
    lineStart: result.line_number,
    lineEnd: result.line_range?.at(-1) ?? result.line_number,
    ...(cweId ? { cweId } : {}),
  };
}

export const BanditScanner: Scanner = {
  name: "BANDIT",

  async isAvailable() {
    return isCommandAvailable("bandit");
  },

  async scan(context: ScanContext): Promise<ScannerResult> {
    const startedAt = new Date().toISOString();
    const args = [
      "-r",
      ".",
      "-f",
      "json",
      "-x",
      "./node_modules,./.venv,./venv,./env,./.git,./dist,./build,./.next",
    ];

    const { stdout, stderr, code } = await runCommand("bandit", args, {
      cwd: context.projectPath,
    });

    const completedAt = new Date().toISOString();

    // Bandit exits 1 when issues are found, 0 when clean. Anything else
    // (besides missing Python files, which still exits 0 with empty results)
    // is treated as a real failure only if stdout isn't valid JSON.
    let parsed: BanditOutput;
    try {
      parsed = JSON.parse(stdout);
    } catch {
      return {
        scanner: "BANDIT",
        startedAt,
        completedAt,
        findings: [],
        rawOutput: stdout,
        error: stderr || `bandit exited with code ${code} and produced no JSON`,
      };
    }

    return {
      scanner: "BANDIT",
      startedAt,
      completedAt,
      findings: parsed.results.map(toFinding),
      rawOutput: parsed,
    };
  },
};
