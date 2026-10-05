import type { Scanner, ScanContext, ScannerResult } from "./types.js";
import { SemgrepScanner } from "./semgrep.js";
import { BanditScanner } from "./bandit.js";
import { GitleaksScanner } from "./gitleaks.js";
import { OSVScanner } from "./osv.js";

export * from "./types.js";
export { SemgrepScanner, BanditScanner, GitleaksScanner, OSVScanner };

// Sprint 1 scanners. SonarQube, ZAP, Nuclei, Trivy join in later sprints
// (see plan Phase 4) — add them here once their adapters exist.
export const scanners: Scanner[] = [SemgrepScanner, BanditScanner, GitleaksScanner, OSVScanner];

/**
 * Runs every registered scanner that's available on this machine.
 * Scanners that aren't installed are skipped, not failed — the caller
 * (worker/CLI) decides whether a skip is acceptable.
 */
export interface ScannerHooks {
  onScannerStart?: (name: string) => void;
  onScannerDone?: (result: ScannerResult, skipped: boolean) => void;
}

export async function runAllScanners(
  context: ScanContext,
  hooks?: ScannerHooks
): Promise<ScannerResult[]> {
  const results: ScannerResult[] = [];

  for (const scanner of scanners) {
    hooks?.onScannerStart?.(scanner.name);
    let result: ScannerResult;
    let skipped = false;

    if (!(await scanner.isAvailable())) {
      skipped = true;
      result = {
        scanner: scanner.name,
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        findings: [],
        rawOutput: null,
        error: `${scanner.name} is not installed or not on PATH — skipped`,
        skipped: true,
      };
    } else {
      try {
        result = await scanner.scan(context);
      } catch (err) {
        result = {
          scanner: scanner.name,
          startedAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
          findings: [],
          rawOutput: null,
          error: err instanceof Error ? err.message : String(err),
        };
      }
    }

    results.push(result);
    hooks?.onScannerDone?.(result, skipped);
  }

  return results;
}
