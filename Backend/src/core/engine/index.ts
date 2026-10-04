// Orchestrates a full assessment: scan -> normalize -> apply WM rules ->
// correlate -> score risk. Persistence (Prisma) is the caller's job — the
// worker/CLI decide how to store an AssessmentResult. See plan Phase 5-7.
// Both the CLI and the worker go through this one pipeline.

import type { ScanContext, ScannerResult } from "../scanners/types.js";
import { runAllScanners, type ScannerHooks } from "../scanners/index.js";
import { flattenFindings } from "../normalizer/index.js";
import { runRules } from "../rules/index.js";
import { correlateFindings } from "../correlation/index.js";
import type { CorrelatedFinding } from "../correlation/types.js";
import { scoreFindings } from "../risk/index.js";
import type { RiskOutput } from "../risk/types.js";
import { loadConfig, type SentinelConfig } from "../config/index.js";
import {
  applyCodeContext,
  dropIgnoredPaths,
  dropSuppressed,
  normalizePaths,
  restrictToChangedFiles,
  stabilizeFingerprints,
} from "./postprocess.js";

export interface AssessmentResult {
  scannerResults: ScannerResult[];
  rawFindingCount: number;
  findings: Array<CorrelatedFinding & RiskOutput>;
}

export interface AssessmentHooks extends ScannerHooks {
  onStage?: (stage: "rules" | "correlate" | "risk", info?: { rawCount?: number; correlatedCount?: number }) => void;
}

export async function runAssessment(
  context: ScanContext,
  options: { config?: SentinelConfig; hooks?: AssessmentHooks } = {}
): Promise<AssessmentResult> {
  const config = options.config ?? (await loadConfig(context.projectPath));
  const hooks = options.hooks;

  const scannerResults = await runAllScanners(context, hooks);
  const scannerFindings = flattenFindings(scannerResults);

  hooks?.onStage?.("rules");
  const ruleFindings = await runRules({
    projectPath: context.projectPath,
    existingFindings: scannerFindings,
  });

  hooks?.onStage?.("correlate");
  let all = normalizePaths(context.projectPath, [...scannerFindings, ...ruleFindings]);
  all = dropIgnoredPaths(all, config.ignorePaths);
  all = restrictToChangedFiles(context.projectPath, all, context.changedFiles);
  all = await dropSuppressed(context.projectPath, all);
  all = await stabilizeFingerprints(context.projectPath, all);
  all = applyCodeContext(all);

  const correlated = correlateFindings(all);
  hooks?.onStage?.("risk", { rawCount: all.length, correlatedCount: correlated.length });

  return {
    scannerResults,
    rawFindingCount: all.length,
    findings: scoreFindings(correlated),
  };
}
