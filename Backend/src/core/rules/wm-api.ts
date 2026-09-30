import type { SecurityFinding } from "../../types/finding.js";
import { makeFingerprint } from "../scanners/fingerprint.js";
import { grepFiles, walkSourceFiles } from "./files.js";
import type { RuleContext, WMRule } from "./types.js";

const EXTENSIONS = [".ts", ".tsx", ".js", ".jsx"];

const ROUTE_DEFINITION = /^\s*(router|app)\.(get|post|put|patch|delete)\(\s*['"`][^'"`]+['"`]\s*,/;

const AUTH_MIDDLEWARE_HINTS =
  /(auth|Auth|passport|jwt|verifyToken|requireLogin|ensureLoggedIn|isAuthenticated)/;

export const WMApi001: WMRule = {
  code: "WM-API-001",
  title: "API endpoint should enforce expected authentication/authorization controls",
  description:
    "Every route handler is expected to run through an authentication (and, where " +
    "appropriate, authorization) middleware before reaching business logic. This " +
    "rule flags route definitions where no such middleware is visible on the same " +
    "line — it does NOT confirm the endpoint is actually unprotected, since " +
    "middleware is often applied at the router level instead of per-route.",

  async evaluate(context: RuleContext): Promise<SecurityFinding[]> {
    const files = await walkSourceFiles(context.projectPath, EXTENSIONS);
    const matches = await grepFiles(context.projectPath, files, ROUTE_DEFINITION);

    return matches
      .filter((m) => !AUTH_MIDDLEWARE_HINTS.test(m.line))
      .map((match) => {
        const pathMatch = match.line.match(/['"`]([^'"`]+)['"`]/);
        const endpoint = pathMatch?.[1];

        return {
          fingerprint: makeFingerprint(["CUSTOM", "WM-API-001", match.filePath, match.lineNumber]),
          title: `Route may be missing an auth middleware: ${endpoint ?? match.filePath}`,
          description:
            "No authentication middleware reference was found on this route " +
            "definition's line. Verify whether auth is applied at the router " +
            "level, and whether this endpoint is intended to be public.\n\n" +
            "WM-API-001: expectation check, not a confirmed vulnerability.",
          severity: "MEDIUM" as const,
          confidence: 35,
          category: "AUTHORIZATION" as const,
          source: "CUSTOM" as const,
          filePath: match.filePath,
          lineStart: match.lineNumber,
          lineEnd: match.lineNumber,
          ...(endpoint ? { endpoint } : {}),
        };
      });
  },
};
