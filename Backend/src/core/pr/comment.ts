import type { PRDiff, ClassifiedFinding } from "./types.js";
import type { GateResult } from "./gate.js";

export const COMMENT_MARKER = "<!-- wm-sentinel-pr-report -->";

const MAX_LISTED_FINDINGS = 10;

function findingBlock(f: ClassifiedFinding): string {
  const location = f.filePath ? `\`${f.filePath}:${f.lineStart ?? "?"}\`` : (f.endpoint ?? "");
  return [`**${f.title} — ${f.severity}**`, "", f.description, "", location].join("\n");
}

export function buildPRComment(
  diff: PRDiff,
  gate: GateResult,
  meta: { existingCount: number }
): string {
  const resultLine = gate.passed ? "✅ PASSED" : "❌ FAILED";

  const lines: string[] = [
    COMMENT_MARKER,
    "## 🛡 WM-Sentinel Security Assessment",
    "",
    `### Result: ${resultLine}`,
    "",
    `Existing findings: ${meta.existingCount}  ·  New: ${diff.new.length}  ·  Fixed: ${diff.fixed.length}  ·  Unchanged: ${diff.unchanged.length}`,
    "",
    "| Severity | New |",
    "|---|---:|",
    `| Critical | ${gate.newBySeverity.CRITICAL} |`,
    `| High | ${gate.newBySeverity.HIGH} |`,
    `| Medium | ${gate.newBySeverity.MEDIUM} |`,
    `| Low | ${gate.newBySeverity.LOW} |`,
    "",
  ];

  if (diff.new.length > 0) {
    lines.push("### New Findings", "");
    for (const f of diff.new.slice(0, MAX_LISTED_FINDINGS)) {
      lines.push(findingBlock(f), "");
    }
    if (diff.new.length > MAX_LISTED_FINDINGS) {
      lines.push(`_...and ${diff.new.length - MAX_LISTED_FINDINGS} more. See the full report artifact._`, "");
    }
  }

  if (diff.fixed.length > 0) {
    lines.push("### Fixed Since Base Branch", "");
    for (const f of diff.fixed.slice(0, MAX_LISTED_FINDINGS)) {
      lines.push(`- ~~${f.title}~~ (${f.severity})`);
    }
    lines.push("");
  }

  lines.push(
    "### Security Gate",
    "",
    gate.passed ? "✅ Passed" : "❌ Failed",
    ...(gate.reason ? [`Reason: ${gate.reason}`] : []),
    ...gate.warnings.map((w) => `⚠️ ${w}`)
  );

  return lines.join("\n");
}
