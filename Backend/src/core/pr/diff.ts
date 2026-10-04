// Compares a PR's current findings against a baseline (the base branch) so a
// PR only gets judged on risk it actually introduces — not the project's
// entire pre-existing finding backlog. See plan Phase 11/"PR-specific
// intelligence".
//
// Matching is by member fingerprint overlap, not by the merged finding's id:
// a correlated id changes whenever a neighbouring finding joins or leaves the
// group, but the raw fingerprints (rule + file + line text) stay put.

import type { ClassifiedFinding, PRDiff, ScoredFinding } from "./types.js";

function fingerprints(f: ScoredFinding): string[] {
  return f.members.map((m) => m.fingerprint);
}

export function classifyFindings(baseline: ScoredFinding[], current: ScoredFinding[]): PRDiff {
  const baselineFps = new Set(baseline.flatMap(fingerprints));
  const currentFps = new Set(current.flatMap(fingerprints));

  const inBaseline = (f: ScoredFinding) => fingerprints(f).some((fp) => baselineFps.has(fp));
  const inCurrent = (f: ScoredFinding) => fingerprints(f).some((fp) => currentFps.has(fp));

  const tag = (f: ScoredFinding, state: ClassifiedFinding["state"]): ClassifiedFinding => ({ ...f, state });

  return {
    new: current.filter((f) => !inBaseline(f)).map((f) => tag(f, "NEW")),
    fixed: baseline.filter((f) => !inCurrent(f)).map((f) => tag(f, "FIXED")),
    unchanged: current.filter(inBaseline).map((f) => tag(f, "UNCHANGED")),
  };
}

/** True if any member of `target` is still present in `findings`. */
export function isStillPresent(target: ScoredFinding, findings: ScoredFinding[]): boolean {
  const fps = new Set(findings.flatMap(fingerprints));
  return fingerprints(target).some((fp) => fps.has(fp));
}

export type { ClassifiedFinding, PRDiff, PRFindingState, ScoredFinding } from "./types.js";
