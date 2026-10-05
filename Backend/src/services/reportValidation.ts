// Validates a ReportFile uploaded by `wm-sentinel push` before it reaches the
// database. Values land in Postgres enums, so anything unexpected is a 400,
// not a 500 from Prisma.

import { HttpError } from "../lib/http.js";
import type { ReportFile } from "../cli/lib/report.js";

const SEVERITIES = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"];
const CATEGORIES = [
  "AUTHENTICATION", "AUTHORIZATION", "INPUT_VALIDATION", "API_SECURITY", "SECRETS",
  "DEPENDENCY", "INJECTION", "CONFIGURATION", "CRYPTOGRAPHY", "OTHER",
];
const SOURCES = ["SEMGREP", "SONARQUBE", "BANDIT", "GITLEAKS", "OSV", "TRIVY", "ZAP", "NUCLEI", "CUSTOM"];
const CONTEXTS = ["production", "test", "docs", "generated"];
const PRIORITIES = ["P0", "P1", "P2", "P3"];
const EVIDENCE_TYPES = ["REQUEST", "RESPONSE", "SNIPPET", "OBSERVATION", "SCREENSHOT"];
const MAX_FINDINGS = 20_000;

type Obj = Record<string, unknown>;

function fail(path: string, msg: string): never {
  throw new HttpError(400, `Invalid report: ${path} ${msg}`);
}
const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);

function str(o: Obj, key: string, path: string, optional = false) {
  const v = o[key];
  if (v === undefined && optional) return;
  if (typeof v !== "string") fail(`${path}.${key}`, "must be a string");
}
function num(o: Obj, key: string, path: string, optional = false) {
  const v = o[key];
  if (v === undefined && optional) return;
  if (typeof v !== "number" || !Number.isFinite(v)) fail(`${path}.${key}`, "must be a number");
}
function enumOf(o: Obj, key: string, allowed: string[], path: string, optional = false) {
  const v = o[key];
  if (v === undefined && optional) return;
  if (typeof v !== "string" || !allowed.includes(v)) fail(`${path}.${key}`, `must be one of ${allowed.join(", ")}`);
}

function checkLocation(o: Obj, path: string) {
  str(o, "filePath", path, true);
  num(o, "lineStart", path, true);
  num(o, "lineEnd", path, true);
  str(o, "endpoint", path, true);
  str(o, "cweId", path, true);
  str(o, "cveId", path, true);
  num(o, "cvssScore", path, true);
  enumOf(o, "context", CONTEXTS, path, true);
}

export function validateReportFile(body: unknown): ReportFile {
  if (!isObj(body)) fail("body", "must be a JSON object");
  if (body.version !== 1) fail("version", "must be 1");
  str(body, "generatedAt", "report");
  if (Number.isNaN(Date.parse(body.generatedAt as string))) fail("generatedAt", "must be an ISO date");
  num(body, "rawFindingCount", "report");
  str(body, "branch", "report", true);
  str(body, "commitSha", "report", true);

  if (!Array.isArray(body.scannerResults)) fail("scannerResults", "must be an array");
  body.scannerResults.forEach((r, i) => {
    const path = `scannerResults[${i}]`;
    if (!isObj(r)) fail(path, "must be an object");
    str(r, "scanner", path);
    num(r, "findingCount", path);
    str(r, "error", path, true);
  });

  if (body.changedFiles !== undefined) {
    if (!Array.isArray(body.changedFiles) || body.changedFiles.some((f) => typeof f !== "string")) {
      fail("changedFiles", "must be an array of strings");
    }
  }

  if (!Array.isArray(body.findings)) fail("findings", "must be an array");
  if (body.findings.length > MAX_FINDINGS) fail("findings", `has more than ${MAX_FINDINGS} entries`);
  body.findings.forEach((f, i) => {
    const path = `findings[${i}]`;
    if (!isObj(f)) fail(path, "must be an object");
    str(f, "id", path);
    str(f, "title", path);
    str(f, "description", path);
    enumOf(f, "severity", SEVERITIES, path);
    num(f, "confidence", path);
    enumOf(f, "category", CATEGORIES, path);
    num(f, "riskScore", path);
    enumOf(f, "priority", PRIORITIES, path);
    checkLocation(f, path);
    if (!Array.isArray(f.sources) || !f.sources.length || f.sources.some((s) => !SOURCES.includes(s as string))) {
      fail(`${path}.sources`, `must be a non-empty array of ${SOURCES.join(", ")}`);
    }
    if (!Array.isArray(f.members) || !f.members.length) fail(`${path}.members`, "must be a non-empty array");
    f.members.forEach((m, j) => {
      const mp = `${path}.members[${j}]`;
      if (!isObj(m)) fail(mp, "must be an object");
      str(m, "fingerprint", mp);
      str(m, "title", mp);
      enumOf(m, "source", SOURCES, mp);
      enumOf(m, "severity", SEVERITIES, mp);
      num(m, "confidence", mp);
      checkLocation(m, mp);
      if (m.evidence !== undefined) {
        if (!Array.isArray(m.evidence)) fail(`${mp}.evidence`, "must be an array");
        m.evidence.forEach((e, k) => {
          if (!isObj(e)) fail(`${mp}.evidence[${k}]`, "must be an object");
          enumOf(e, "type", EVIDENCE_TYPES, `${mp}.evidence[${k}]`);
          str(e, "content", `${mp}.evidence[${k}]`);
        });
      }
    });
  });

  const ids = new Set(body.findings.map((f) => (f as Obj).id));
  if (ids.size !== body.findings.length) fail("findings", "contain duplicate ids");

  return body as unknown as ReportFile;
}
