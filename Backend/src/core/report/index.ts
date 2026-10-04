// Report exporters (plan Phase 13): SARIF for GitHub code scanning, HTML for humans.

import type { ReportFile } from "../../cli/lib/report.js";
import type { Severity } from "../../types/finding.js";

const SARIF_LEVEL: Record<Severity, "error" | "warning" | "note"> = {
  CRITICAL: "error",
  HIGH: "error",
  MEDIUM: "warning",
  LOW: "note",
  INFO: "note",
};

export function toSarif(report: ReportFile) {
  return {
    $schema: "https://json.schemastore.org/sarif-2.1.0.json",
    version: "2.1.0",
    runs: [
      {
        tool: { driver: { name: "WM-Sentinel", version: "0.1.0", informationUri: "https://github.com" } },
        results: report.findings.map((f) => ({
          ruleId: f.cweId ?? f.members[0]?.source ?? "WM-SENTINEL",
          level: SARIF_LEVEL[f.severity],
          message: { text: `${f.title}\n\n${f.description}` },
          partialFingerprints: { "wmSentinel/v1": f.members[0]?.fingerprint ?? f.id },
          properties: {
            riskScore: f.riskScore,
            priority: f.priority,
            confidence: f.confidence,
            sources: f.sources,
          },
          ...(f.filePath
            ? {
                locations: [
                  {
                    physicalLocation: {
                      artifactLocation: { uri: f.filePath },
                      ...(f.lineStart
                        ? { region: { startLine: f.lineStart, endLine: f.lineEnd ?? f.lineStart } }
                        : {}),
                    },
                  },
                ],
              }
            : {}),
        })),
      },
    ],
  };
}

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function toHtml(report: ReportFile): string {
  const counts: Record<string, number> = {};
  for (const f of report.findings) counts[f.severity] = (counts[f.severity] ?? 0) + 1;

  const rows = [...report.findings]
    .sort((a, b) => b.riskScore - a.riskScore)
    .map(
      (f) => `<tr>
  <td>${f.priority}</td><td>${f.riskScore}</td><td>${f.severity}</td>
  <td>${esc(f.title)}<br><small>${esc(f.description.split("\n")[0] ?? "")}</small></td>
  <td>${esc(f.filePath ?? f.endpoint ?? "")}${f.lineStart ? ":" + f.lineStart : ""}</td>
  <td>${f.sources.join(", ")}</td><td>${f.confidence}%</td></tr>`
    )
    .join("\n");

  return `<!doctype html><html><head><meta charset="utf-8"><title>WM-Sentinel Report</title>
<style>body{font:14px system-ui;margin:2rem;color:#111}table{border-collapse:collapse;width:100%}
td,th{border:1px solid #ddd;padding:6px 8px;text-align:left;vertical-align:top}th{background:#f4f4f4}small{color:#666}</style></head>
<body><h1>WM-Sentinel Security Assessment</h1>
<p>Generated ${esc(report.generatedAt)}${report.commitSha ? ` · commit ${esc(report.commitSha.slice(0, 8))}` : ""}</p>
<h2>Summary</h2><p>${report.rawFindingCount} raw → ${report.findings.length} correlated.
${(["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"] as const).map((s) => `${s}: ${counts[s] ?? 0}`).join(" · ")}</p>
<h2>Scanners</h2><ul>${report.scannerResults.map((r) => `<li>${r.scanner}: ${r.findingCount}${r.error ? ` (${esc(r.error.split("\n")[0] ?? "")})` : ""}</li>`).join("")}</ul>
<h2>Findings</h2><table><tr><th>Pri</th><th>Risk</th><th>Severity</th><th>Finding</th><th>Location</th><th>Detected by</th><th>Conf.</th></tr>
${rows}</table>
<p><small>Heuristic (CUSTOM) findings are expectation checks, not confirmed vulnerabilities.</small></p></body></html>`;
}
