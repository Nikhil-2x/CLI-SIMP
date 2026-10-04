import type { SecurityFinding } from "../../types/finding.js";
import { makeFingerprint } from "../scanners/fingerprint.js";
import { grepFiles, walkSourceFiles } from "./files.js";
import type { RuleContext, WMRule } from "./types.js";

const EXTENSIONS = [".ts", ".tsx", ".js", ".jsx"];

const PATTERNS: Array<{ regex: RegExp; title: string; description: string; cweId: string }> = [
  {
    regex: /\.(query|execute)\(\s*`[^`]*\$\{/,
    title: "SQL query built with string interpolation",
    description:
      "A database query is built via template-literal interpolation instead of a " +
      "parameterized query/prepared statement, which can allow SQL injection " +
      "if any interpolated value comes from user input.",
    cweId: "CWE-89",
  },
  {
    regex: /\bexec\(\s*`[^`]*\$\{/,
    title: "Shell command built with string interpolation",
    description:
      "A shell command is built via template-literal interpolation, which can " +
      "allow command injection if any interpolated value comes from user input. " +
      "Prefer execFile/spawn with an argument array.",
    cweId: "CWE-78",
  },
  {
    // Not preceded by a regex/string delimiter: skips `/^eval(sha)?$/` etc.
    regex: /(?<![\w$.\/^'"`])eval\s*\(/,
    title: "Use of eval()",
    description: "eval() executes arbitrary strings as code — avoid it entirely, especially on user input.",
    cweId: "CWE-95",
  },
];

export const WMInput001: WMRule = {
  code: "WM-INPUT-001",
  title: "Unsafe input handling",
  description:
    "User-influenced input should never be concatenated directly into queries, " +
    "shell commands, or evaluated code.",

  async evaluate(context: RuleContext): Promise<SecurityFinding[]> {
    const files = await walkSourceFiles(context.projectPath, EXTENSIONS);
    const findings: SecurityFinding[] = [];

    for (const pattern of PATTERNS) {
      const matches = await grepFiles(context.projectPath, files, pattern.regex, { codeOnly: true });
      for (const match of matches) {
        findings.push({
          fingerprint: makeFingerprint(["CUSTOM", "WM-INPUT-001", match.filePath, match.lineNumber]),
          title: pattern.title,
          description: `${pattern.description}\n\nWM-INPUT-001: heuristic match, confirm before treating as a real finding.`,
          severity: "HIGH",
          confidence: 45,
          category: "INJECTION",
          source: "CUSTOM",
          filePath: match.filePath,
          lineStart: match.lineNumber,
          lineEnd: match.lineNumber,
          cweId: pattern.cweId,
        });
      }
    }

    return findings;
  },
};
