import type { SecurityFinding } from "../../types/finding.js";
import { makeFingerprint } from "../scanners/fingerprint.js";
import { grepFiles, walkSourceFiles } from "./files.js";
import type { RuleContext, WMRule } from "./types.js";

const EXTENSIONS = [".ts", ".tsx", ".js", ".jsx"];

const SENSITIVE_LOG =
  /console\.(log|info|warn|error|debug)\([^)]*\b(password|token|secret|ssn|creditCard|credit_card)\b/i;

export const WMData001: WMRule = {
  code: "WM-DATA-001",
  title: "Sensitive fields should not be logged",
  description:
    "Passwords, tokens, secrets, and other sensitive fields are expected to be " +
    "redacted before logging — plaintext logs are a common source of credential leaks.",

  async evaluate(context: RuleContext): Promise<SecurityFinding[]> {
    const files = await walkSourceFiles(context.projectPath, EXTENSIONS);
    const matches = await grepFiles(context.projectPath, files, SENSITIVE_LOG);

    return matches.map((match) => ({
      fingerprint: makeFingerprint(["CUSTOM", "WM-DATA-001", match.filePath, match.lineNumber]),
      title: "Possible sensitive field in a log statement",
      description:
        "This log call references a field name commonly associated with sensitive " +
        "data. Confirm the actual value logged isn't a real secret/credential.\n\n" +
        "WM-DATA-001: expectation check, not a confirmed vulnerability.",
      severity: "MEDIUM" as const,
      confidence: 45,
      category: "OTHER" as const,
      source: "CUSTOM" as const,
      filePath: match.filePath,
      lineStart: match.lineNumber,
      lineEnd: match.lineNumber,
    }));
  },
};
