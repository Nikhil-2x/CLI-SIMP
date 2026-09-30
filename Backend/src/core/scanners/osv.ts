import type { Scanner, ScanContext, ScannerResult } from "./types.js";
import type { SecurityFinding, Severity } from "../../types/finding.js";
import { isCommandAvailable, runCommand } from "./exec.js";
import { makeFingerprint } from "./fingerprint.js";

interface OsvVulnerability {
  id: string;
  summary?: string;
  details?: string;
  aliases?: string[];
  database_specific?: { severity?: string };
  severity?: Array<{ type: string; score: string }>;
}

interface OsvPackageResult {
  package: { name: string; version: string; ecosystem: string };
  vulnerabilities: OsvVulnerability[];
}

interface OsvSourceResult {
  source: { path: string; type: string };
  packages: OsvPackageResult[];
}

interface OsvOutput {
  results: OsvSourceResult[];
}

function mapSeverity(vuln: OsvVulnerability): Severity {
  const declared = vuln.database_specific?.severity?.toUpperCase();
  if (declared === "CRITICAL" || declared === "HIGH" || declared === "MEDIUM" || declared === "LOW") {
    return declared;
  }

  const cvss = vuln.severity?.find((s) => s.type === "CVSS_V3")?.score;
  const scoreMatch = cvss?.match(/(\d+(\.\d+)?)$/);
  const score = scoreMatch ? parseFloat(scoreMatch[1]!) : undefined;

  if (score === undefined) return "MEDIUM";
  if (score >= 9) return "CRITICAL";
  if (score >= 7) return "HIGH";
  if (score >= 4) return "MEDIUM";
  return "LOW";
}

function extractCvssScore(vuln: OsvVulnerability): number | undefined {
  const cvss = vuln.severity?.find((s) => s.type === "CVSS_V3")?.score;
  const match = cvss?.match(/(\d+(\.\d+)?)$/);
  return match ? parseFloat(match[1]!) : undefined;
}

function toFinding(
  pkg: OsvPackageResult,
  vuln: OsvVulnerability,
  sourcePath: string
): SecurityFinding {
  const cveId = vuln.aliases?.find((a) => a.startsWith("CVE-"));
  const cvssScore = extractCvssScore(vuln);

  return {
    fingerprint: makeFingerprint(["OSV", vuln.id, pkg.package.name, pkg.package.version]),
    title: `${pkg.package.name}@${pkg.package.version}: ${vuln.id}`,
    description: vuln.summary || vuln.details || `Known vulnerability ${vuln.id} in ${pkg.package.name}`,
    severity: mapSeverity(vuln),
    confidence: 85,
    category: "DEPENDENCY",
    source: "OSV",
    filePath: sourcePath,
    component: pkg.package.name,
    ...(cveId ? { cveId } : {}),
    ...(cvssScore !== undefined ? { cvssScore } : {}),
  };
}

export const OSVScanner: Scanner = {
  name: "OSV",

  async isAvailable() {
    return isCommandAvailable("osv-scanner");
  },

  async scan(context: ScanContext): Promise<ScannerResult> {
    const startedAt = new Date().toISOString();
    const args = ["--format", "json", "--recursive", "."];

    const { stdout, stderr, code } = await runCommand("osv-scanner", args, {
      cwd: context.projectPath,
    });

    const completedAt = new Date().toISOString();

    // osv-scanner exits 1 when vulnerabilities are found.
    let parsed: OsvOutput;
    try {
      parsed = JSON.parse(stdout);
    } catch {
      if (code !== 0) {
        return {
          scanner: "OSV",
          startedAt,
          completedAt,
          findings: [],
          rawOutput: stdout,
          error: stderr || `osv-scanner exited with code ${code}`,
        };
      }
      parsed = { results: [] };
    }

    const findings: SecurityFinding[] = [];
    for (const result of parsed.results ?? []) {
      for (const pkg of result.packages ?? []) {
        for (const vuln of pkg.vulnerabilities ?? []) {
          findings.push(toFinding(pkg, vuln, result.source.path));
        }
      }
    }

    return {
      scanner: "OSV",
      startedAt,
      completedAt,
      findings,
      rawOutput: parsed,
    };
  },
};
