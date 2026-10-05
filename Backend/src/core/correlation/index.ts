// Deduplicates and correlates findings from multiple scanners into single
// root-cause findings with multiple evidence sources. See plan Phase 6.
//
// Two raw findings are merged when any of these hold:
//   1. Identical fingerprint (exact duplicate, e.g. re-run of the same scanner)
//   2. Same file, overlapping/adjacent line ranges, and same category —
//      unless both carry a CWE and the CWEs differ (exec() on line 7 and
//      eval() on line 8 are both INJECTION, but need separate fixes)
//   3. Same file and same CWE, within ~20 lines
//   4. Same endpoint and same category (for dynamic/API findings without a file)

import { createHash } from "node:crypto";
import type { SecurityFinding } from "../../types/finding.js";
import type { CorrelatedFinding } from "./types.js";

const LINE_PROXIMITY = 3;
const CWE_PROXIMITY = 20;
const SEVERITY_RANK = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1, INFO: 0 } as const;

function linesOverlap(a: SecurityFinding, b: SecurityFinding, proximity = LINE_PROXIMITY): boolean {
  if (a.lineStart === undefined || b.lineStart === undefined) return false;
  const aStart = a.lineStart;
  const aEnd = a.lineEnd ?? a.lineStart;
  const bStart = b.lineStart;
  const bEnd = b.lineEnd ?? b.lineStart;
  return aStart <= bEnd + proximity && bStart <= aEnd + proximity;
}

function isSameIssue(a: SecurityFinding, b: SecurityFinding): boolean {
  if (a.fingerprint === b.fingerprint) return true;

  const differentCwe = Boolean(a.cweId && b.cweId && a.cweId !== b.cweId);

  if (a.filePath && a.filePath === b.filePath) {
    if (a.category === b.category && !differentCwe && linesOverlap(a, b)) return true;
    // Same CWE only counts as the same issue when it's nearby — otherwise 59
    // separate header problems in one nginx.conf collapse into one finding.
    if (a.cweId && a.cweId === b.cweId && linesOverlap(a, b, CWE_PROXIMITY)) return true;
  }

  if (a.endpoint && a.endpoint === b.endpoint && a.category === b.category && !differentCwe) return true;

  return false;
}

// Union-find over finding indices.
class DisjointSet {
  private parent: number[];

  constructor(size: number) {
    this.parent = Array.from({ length: size }, (_, i) => i);
  }

  find(i: number): number {
    if (this.parent[i] !== i) this.parent[i] = this.find(this.parent[i]!);
    return this.parent[i]!;
  }

  union(i: number, j: number) {
    const ri = this.find(i);
    const rj = this.find(j);
    if (ri !== rj) this.parent[ri] = rj;
  }
}

// Primary = highest severity, then highest confidence, so when Semgrep (90%)
// and a heuristic WM rule (40%) flag the same line, the title and
// description come from Semgrep. Fingerprint order keeps ties deterministic.
function mergeGroup(members: SecurityFinding[]): CorrelatedFinding {
  const primary = [...members].sort(
    (a, b) =>
      SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity] ||
      b.confidence - a.confidence ||
      a.fingerprint.localeCompare(b.fingerprint)
  )[0]!;

  const id = createHash("sha1")
    .update(members.map((m) => m.fingerprint).sort().join("|"))
    .digest("hex");

  const sources = [...new Set(members.map((m) => m.source))];
  const confidence = Math.max(...members.map((m) => m.confidence));
  const cweId = members.find((m) => m.cweId)?.cweId;
  const cveId = members.find((m) => m.cveId)?.cveId;
  const cvssScore = members.find((m) => m.cvssScore !== undefined)?.cvssScore;

  return {
    id,
    title: primary.title,
    description: primary.description,
    severity: primary.severity,
    confidence,
    category: primary.category,
    sources,
    ...(primary.filePath ? { filePath: primary.filePath } : {}),
    ...(primary.lineStart !== undefined ? { lineStart: primary.lineStart } : {}),
    ...(primary.lineEnd !== undefined ? { lineEnd: primary.lineEnd } : {}),
    ...(primary.endpoint ? { endpoint: primary.endpoint } : {}),
    ...(cweId ? { cweId } : {}),
    ...(cveId ? { cveId } : {}),
    ...(cvssScore !== undefined ? { cvssScore } : {}),
    ...(primary.context ? { context: primary.context } : {}),
    members,
  };
}

export function correlateFindings(findings: SecurityFinding[]): CorrelatedFinding[] {
  const dsu = new DisjointSet(findings.length);

  for (let i = 0; i < findings.length; i++) {
    for (let j = i + 1; j < findings.length; j++) {
      if (isSameIssue(findings[i]!, findings[j]!)) {
        dsu.union(i, j);
      }
    }
  }

  const groups = new Map<number, SecurityFinding[]>();
  findings.forEach((finding, i) => {
    const root = dsu.find(i);
    const group = groups.get(root) ?? [];
    group.push(finding);
    groups.set(root, group);
  });

  return [...groups.values()].map(mergeGroup);
}

export type { CorrelatedFinding } from "./types.js";
