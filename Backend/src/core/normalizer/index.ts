// Every scanner adapter already normalizes its own raw output into
// SecurityFinding[] (see core/scanners/*). This layer just flattens
// results from a multi-scanner run into one list, ready for the
// correlation engine (Phase 6).

import type { ScannerResult } from "../scanners/types.js";
import type { SecurityFinding } from "../../types/finding.js";

export function flattenFindings(results: ScannerResult[]): SecurityFinding[] {
  return results.flatMap((r) => r.findings);
}
