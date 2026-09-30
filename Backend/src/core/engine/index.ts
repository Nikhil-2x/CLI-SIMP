// Orchestrates a full assessment: scan -> normalize -> apply WM rules ->
// correlate -> score risk. Persistence (Prisma) is the caller's job — the
// worker/CLI decide how to store an AssessmentResult. See plan Phase 5-7.

import type { ScanContext, ScannerResult } from "../scanners/types.js";
import { runAllScanners } from "../scanners/index.js";
import { flattenFindings } from "../normalizer/index.js";
import { runRules } from "../rules/index.js";
import { correlateFindings } from "../correlation/index.js";
import type { CorrelatedFinding } from "../correlation/types.js";
import { scoreFindings } from "../risk/index.js";
import type { RiskOutput } from "../risk/types.js";

export interface AssessmentResult {
  scannerResults: ScannerResult[];
  rawFindingCount: number;
  findings: Array<CorrelatedFinding & RiskOutput>;
}

export async function runAssessment(context: ScanContext): Promise<AssessmentResult> {
  const scannerResults = await runAllScanners(context);
  const scannerFindings = flattenFindings(scannerResults);

  const ruleFindings = await runRules({
    projectPath: context.projectPath,
    existingFindings: scannerFindings,
  });

  const allFindings = [...scannerFindings, ...ruleFindings];
  const correlated = correlateFindings(allFindings);
  const findings = scoreFindings(correlated);

  return {
    scannerResults,
    rawFindingCount: allFindings.length,
    findings,
  };
}
