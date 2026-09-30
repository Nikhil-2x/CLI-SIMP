import type { SecurityFinding } from "../../types/finding.js";
import { makeFingerprint } from "../scanners/fingerprint.js";
import { grepFiles, walkSourceFiles } from "./files.js";
import type { RuleContext, WMRule } from "./types.js";

const EXTENSIONS = [".ts", ".tsx", ".js", ".jsx"];

const ADMIN_ROUTE = /['"`]\/(admin|internal|management)[^'"`]*['"`]\s*,/;
const ROLE_CHECK_HINTS = /(role|Role|isAdmin|requireRole|permission|rbac)/;

export const WMAuthz001: WMRule = {
  code: "WM-AUTHZ-001",
  title: "Privileged routes should enforce a role/permission check",
  description:
    "Routes under an admin/internal/management path are expected to verify the " +
    "caller's role or permission, not just that they're logged in. This rule " +
    "flags admin-looking route definitions with no visible role/permission check " +
    "on the same line — middleware applied at the router level won't be caught, " +
    "so this needs manual confirmation.",

  async evaluate(context: RuleContext): Promise<SecurityFinding[]> {
    const files = await walkSourceFiles(context.projectPath, EXTENSIONS);
    const matches = await grepFiles(context.projectPath, files, ADMIN_ROUTE);

    return matches
      .filter((m) => !ROLE_CHECK_HINTS.test(m.line))
      .map((match) => ({
        fingerprint: makeFingerprint(["CUSTOM", "WM-AUTHZ-001", match.filePath, match.lineNumber]),
        title: "Privileged-looking route may be missing a role/permission check",
        description:
          "This route path looks admin/internal-facing but no role or permission " +
          "check is visible on the same line.\n\n" +
          "WM-AUTHZ-001: expectation check, not a confirmed vulnerability.",
        severity: "HIGH" as const,
        confidence: 35,
        category: "AUTHORIZATION" as const,
        source: "CUSTOM" as const,
        filePath: match.filePath,
        lineStart: match.lineNumber,
        lineEnd: match.lineNumber,
      }));
  },
};
