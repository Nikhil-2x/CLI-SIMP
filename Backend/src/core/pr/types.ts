import type { CorrelatedFinding } from "../correlation/types.js";
import type { RiskOutput } from "../risk/types.js";

export type PRFindingState = "NEW" | "FIXED" | "UNCHANGED";

export type ScoredFinding = CorrelatedFinding & RiskOutput;

export interface ClassifiedFinding extends ScoredFinding {
  state: PRFindingState;
}

export interface PRDiff {
  new: ClassifiedFinding[];
  fixed: ClassifiedFinding[];
  unchanged: ClassifiedFinding[];
}
