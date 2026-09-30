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
export async function runAllScanners(context: ScanContext): Promise<ScannerResult[]> {
  const results: ScannerResult[] = [];

  for (const scanner of scanners) {
    const available = await scanner.isAvailable();
    if (!available) {
      results.push({
        scanner: scanner.name,
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        findings: [],
        rawOutput: null,
        error: `${scanner.name} is not installed or not on PATH — skipped`,
      });
      continue;
    }

    try {
      results.push(await scanner.scan(context));
    } catch (err) {
      results.push({
        scanner: scanner.name,
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        findings: [],
        rawOutput: null,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return results;
}
