// Deduplicates and correlates findings from multiple scanners into single
// root-cause findings with multiple evidence sources. See plan Phase 6.
//
// Two raw findings are merged when any of these hold:
//   1. Identical fingerprint (exact duplicate, e.g. re-run of the same scanner)
//   2. Same file, overlapping/adjacent line ranges, and same category
//   3. Same file and same CWE
//   4. Same endpoint and same category (for dynamic/API findings without a file)

import { createHash } from "node:crypto";
import type { SecurityFinding } from "../../types/finding.js";
import type { CorrelatedFinding } from "./types.js";

const LINE_PROXIMITY = 3;
const SEVERITY_RANK = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1, INFO: 0 } as const;

function linesOverlap(a: SecurityFinding, b: SecurityFinding): boolean {
  if (a.lineStart === undefined || b.lineStart === undefined) return false;
  const aStart = a.lineStart;
  const aEnd = a.lineEnd ?? a.lineStart;
  const bStart = b.lineStart;
  const bEnd = b.lineEnd ?? b.lineStart;
  return aStart <= bEnd + LINE_PROXIMITY && bStart <= aEnd + LINE_PROXIMITY;
}

function isSameIssue(a: SecurityFinding, b: SecurityFinding): boolean {
  if (a.fingerprint === b.fingerprint) return true;

  if (a.filePath && a.filePath === b.filePath) {
    if (a.category === b.category && linesOverlap(a, b)) return true;
    if (a.cweId && a.cweId === b.cweId) return true;
  }

  if (a.endpoint && a.endpoint === b.endpoint && a.category === b.category) return true;

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

function mergeGroup(members: SecurityFinding[]): CorrelatedFinding {
  const primary = members.reduce((best, f) =>
    SEVERITY_RANK[f.severity] > SEVERITY_RANK[best.severity] ? f : best
  );

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
