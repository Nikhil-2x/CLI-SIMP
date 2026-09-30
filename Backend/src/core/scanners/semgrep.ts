import type { Scanner, ScanContext, ScannerResult } from "./types.js";
import type { FindingCategory, SecurityFinding, Severity } from "../../types/finding.js";
import { isCommandAvailable, runCommand } from "./exec.js";
import { makeFingerprint } from "./fingerprint.js";

interface SemgrepResult {
  check_id: string;
  path: string;
  start: { line: number; col: number };
  end: { line: number; col: number };
  extra: {
    message: string;
    severity: "ERROR" | "WARNING" | "INFO";
    lines?: string;
    metadata?: {
      cwe?: string[] | string;
      category?: string;
      confidence?: string;
      owasp?: string[];
    };
  };
}

interface SemgrepOutput {
  results: SemgrepResult[];
  errors: Array<{ message: string }>;
}

const SEVERITY_MAP: Record<SemgrepResult["extra"]["severity"], Severity> = {
  ERROR: "HIGH",
  WARNING: "MEDIUM",
  INFO: "LOW",
};

const CONFIDENCE_MAP: Record<string, number> = {
  HIGH: 90,
  MEDIUM: 60,
  LOW: 30,
};

function mapCategory(metadataCategory?: string): FindingCategory {
  switch ((metadataCategory ?? "").toLowerCase()) {
    case "security":
      return "OTHER";
    case "correctness":
      return "OTHER";
    default:
      return "OTHER";
  }
}

function extractCwe(cwe?: string[] | string): string | undefined {
  const first = Array.isArray(cwe) ? cwe[0] : cwe;
  const match = first?.match(/CWE-\d+/i);
  return match?.[0];
}

function toFinding(result: SemgrepResult): SecurityFinding {
  const severity = SEVERITY_MAP[result.extra.severity] ?? "LOW";
  const confidence = CONFIDENCE_MAP[result.extra.metadata?.confidence ?? ""] ?? 50;
  const cweId = extractCwe(result.extra.metadata?.cwe);

  return {
    fingerprint: makeFingerprint([
      "SEMGREP",
      result.check_id,
      result.path,
      result.start.line,
    ]),
    title: result.check_id.split(".").pop() ?? result.check_id,
    description: result.extra.message,
    severity,
    confidence,
    category: mapCategory(result.extra.metadata?.category),
    source: "SEMGREP",
    filePath: result.path,
    lineStart: result.start.line,
    lineEnd: result.end.line,
    ...(cweId ? { cweId } : {}),
  };
}

export const SemgrepScanner: Scanner = {
  name: "SEMGREP",

  async isAvailable() {
    return isCommandAvailable("semgrep");
  },

  async scan(context: ScanContext): Promise<ScannerResult> {
    const startedAt = new Date().toISOString();
    const args = ["--config=auto", "--json", "--quiet"];
    if (context.changedFiles?.length) {
      args.push(...context.changedFiles);
    } else {
      args.push(".");
    }

    const { stdout, stderr, code } = await runCommand("semgrep", args, {
      cwd: context.projectPath,
    });

    const completedAt = new Date().toISOString();

    if (code !== 0 && code !== 1) {
      // Semgrep exits 1 when findings exist. Anything else is a real failure.
      return {
        scanner: "SEMGREP",
        startedAt,
        completedAt,
        findings: [],
        rawOutput: stdout,
        error: stderr || `semgrep exited with code ${code}`,
      };
    }

    let parsed: SemgrepOutput;
    try {
      parsed = JSON.parse(stdout);
    } catch {
      return {
        scanner: "SEMGREP",
        startedAt,
        completedAt,
        findings: [],
        rawOutput: stdout,
        error: "Failed to parse semgrep JSON output",
      };
    }

    return {
      scanner: "SEMGREP",
      startedAt,
      completedAt,
      findings: parsed.results.map(toFinding),
      rawOutput: parsed,
    };
  },
};
