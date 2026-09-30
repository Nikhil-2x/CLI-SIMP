import type { SecurityFinding } from "../../types/finding.js";
import { makeFingerprint } from "../scanners/fingerprint.js";
import { grepFiles, walkSourceFiles } from "./files.js";
import type { RuleContext, WMRule } from "./types.js";

const EXTENSIONS = [".ts", ".tsx", ".js", ".jsx"];

const INSECURE_COOKIE = /(secure|httpOnly)\s*:\s*false/;

export const WMAuth001: WMRule = {
  code: "WM-AUTH-001",
  title: "Session cookies should be secure and httpOnly",
  description:
    "Session/auth cookies are expected to set both `secure` and `httpOnly`, " +
    "otherwise they're readable by client-side scripts (XSS-assisted theft) or " +
    "sent over plain HTTP.",

  async evaluate(context: RuleContext): Promise<SecurityFinding[]> {
    const files = await walkSourceFiles(context.projectPath, EXTENSIONS);
    const matches = await grepFiles(context.projectPath, files, INSECURE_COOKIE);

    return matches.map((match) => ({
      fingerprint: makeFingerprint(["CUSTOM", "WM-AUTH-001", match.filePath, match.lineNumber]),
      title: "Cookie flag explicitly disabled (secure/httpOnly: false)",
      description:
        "This line explicitly disables a cookie security flag. Confirm whether " +
        "this applies to a session/auth cookie — if so, it should be `true` in " +
        "production.\n\nWM-AUTH-001: expectation check, not a confirmed vulnerability.",
      severity: "MEDIUM" as const,
      confidence: 40,
      category: "AUTHENTICATION" as const,
      source: "CUSTOM" as const,
      filePath: match.filePath,
      lineStart: match.lineNumber,
      lineEnd: match.lineNumber,
    }));
  },
};
