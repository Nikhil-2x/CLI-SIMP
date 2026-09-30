import type { SecurityFinding } from "../../types/finding.js";
import { makeFingerprint } from "../scanners/fingerprint.js";
import { grepFiles, walkSourceFiles } from "./files.js";
import type { RuleContext, WMRule } from "./types.js";

const EXTENSIONS = [".ts", ".tsx", ".js", ".jsx"];

const PATTERNS: Array<{ regex: RegExp; title: string; description: string }> = [
  {
    regex: /rejectUnauthorized\s*:\s*false/,
    title: "TLS certificate verification disabled",
    description:
      "rejectUnauthorized: false disables TLS certificate validation, allowing " +
      "man-in-the-middle attacks against this connection.",
  },
  {
    regex: /NODE_TLS_REJECT_UNAUTHORIZED\s*=\s*['"]?0/,
    title: "NODE_TLS_REJECT_UNAUTHORIZED disabled globally",
    description:
      "Setting NODE_TLS_REJECT_UNAUTHORIZED=0 disables TLS certificate validation " +
      "process-wide, not just for one connection.",
  },
  {
    regex: /origin\s*:\s*['"]\*['"]/,
    title: "CORS origin allows any domain",
    description:
      "A wildcard CORS origin allows any website to make authenticated requests " +
      "against this API if credentials are also permitted.",
  },
];

export const WMConfig001: WMRule = {
  code: "WM-CONFIG-001",
  title: "Insecure security-relevant configuration",
  description:
    "API and service configuration should not disable TLS verification or allow " +
    "unrestricted cross-origin access.",

  async evaluate(context: RuleContext): Promise<SecurityFinding[]> {
    const files = await walkSourceFiles(context.projectPath, EXTENSIONS);
    const findings: SecurityFinding[] = [];

    for (const pattern of PATTERNS) {
      const matches = await grepFiles(context.projectPath, files, pattern.regex);
      for (const match of matches) {
        findings.push({
          fingerprint: makeFingerprint([
            "CUSTOM",
            "WM-CONFIG-001",
            match.filePath,
            match.lineNumber,
          ]),
          title: pattern.title,
          description: `${pattern.description}\n\nWM-CONFIG-001: this is a heuristic match — confirm before treating it as a real finding.`,
          severity: "MEDIUM",
          confidence: 55,
          category: "CONFIGURATION",
          source: "CUSTOM",
          filePath: match.filePath,
          lineStart: match.lineNumber,
          lineEnd: match.lineNumber,
        });
      }
    }

    return findings;
  },
};
