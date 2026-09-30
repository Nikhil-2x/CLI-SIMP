import type { SecurityFinding } from "../../types/finding.js";
import { makeFingerprint } from "../scanners/fingerprint.js";
import { grepFiles, walkSourceFiles } from "./files.js";
import type { RuleContext, WMRule } from "./types.js";

const EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".json", ".yml", ".yaml"];

// Deliberately conservative: literal-looking secret assignments that are NOT
// reads from process.env / an env-var lookup. Gitleaks (Phase 4) already
// covers known secret formats (AWS keys, etc.) with far fewer false
// positives — this rule exists to catch generic "secret = <literal>"
// patterns Gitleaks' rule set won't match.
const SECRET_ASSIGNMENT = /(api[_-]?key|secret|password|token)\s*[:=]\s*["'][A-Za-z0-9_\-!@#$%^&*]{8,}["']/i;
const PLACEHOLDER = /changeme|placeholder|example|xxxxx|your[_-]?(key|secret|password)|<.*>/i;

export const WMSecret001: WMRule = {
  code: "WM-SECRET-001",
  title: "Hardcoded credential literal",
  description:
    "Credentials, API keys, and secrets should be read from environment variables " +
    "or a secret manager, never committed as literal values in source.",

  async evaluate(context: RuleContext): Promise<SecurityFinding[]> {
    const files = await walkSourceFiles(context.projectPath, EXTENSIONS);
    const matches = await grepFiles(context.projectPath, files, SECRET_ASSIGNMENT);

    return matches
      .filter((m) => !m.line.includes("process.env") && !PLACEHOLDER.test(m.line))
      .map((match) => ({
        fingerprint: makeFingerprint(["CUSTOM", "WM-SECRET-001", match.filePath, match.lineNumber]),
        title: "Possible hardcoded credential",
        description:
          "This line assigns what looks like a literal secret/credential value. " +
          "The value itself is not reproduced here — verify manually and move it " +
          "to an environment variable if confirmed.\n\n" +
          "WM-SECRET-001: heuristic match, confirm before treating as a real finding.",
        severity: "HIGH" as const,
        confidence: 40,
        category: "SECRETS" as const,
        source: "CUSTOM" as const,
        filePath: match.filePath,
        lineStart: match.lineNumber,
        lineEnd: match.lineNumber,
      }));
  },
};
