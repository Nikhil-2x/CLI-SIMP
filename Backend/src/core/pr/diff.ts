// Compares a PR's current findings against a baseline (the base branch) so a
// PR only gets judged on risk it actually introduces — not the project's
// entire pre-existing finding backlog. See plan Phase 11/"PR-specific
// intelligence".

import type { ClassifiedFinding, PRDiff, ScoredFinding } from "./types.js";

export function classifyFindings(baseline: ScoredFinding[], current: ScoredFinding[]): PRDiff {
  const baselineIds = new Set(baseline.map((f) => f.id));
  const currentIds = new Set(current.map((f) => f.id));

  return {
    new: current
      .filter((f) => !baselineIds.has(f.id))
      .map((f) => ({ ...f, state: "NEW" as const })),
    fixed: baseline
      .filter((f) => !currentIds.has(f.id))
      .map((f) => ({ ...f, state: "FIXED" as const })),
    unchanged: current
      .filter((f) => baselineIds.has(f.id))
      .map((f) => ({ ...f, state: "UNCHANGED" as const })),
  };
}

export type { ClassifiedFinding, PRDiff, PRFindingState, ScoredFinding } from "./types.js";
