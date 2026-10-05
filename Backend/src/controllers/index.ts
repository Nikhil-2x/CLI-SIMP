// HTTP handlers: parse/validate the request, call a service, send JSON.
// Express 5 forwards rejected promises to the error middleware.

import type { Request, Response } from "express";
import {
  bodyObject,
  HttpError,
  oneOf,
  optionalString,
  queryInt,
  queryString,
  requiredString,
} from "../lib/http.js";
import * as projects from "../services/projects.js";
import * as assessments from "../services/assessments.js";
import * as findings from "../services/findings.js";
import { validateReportFile } from "../services/reportValidation.js";
import { toHtml, toSarif } from "../core/report/index.js";

const SEVERITIES = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"] as const;
const CATEGORIES = [
  "AUTHENTICATION", "AUTHORIZATION", "INPUT_VALIDATION", "API_SECURITY", "SECRETS",
  "DEPENDENCY", "INJECTION", "CONFIGURATION", "CRYPTOGRAPHY", "OTHER",
] as const;
const SOURCES = ["SEMGREP", "SONARQUBE", "BANDIT", "GITLEAKS", "OSV", "TRIVY", "ZAP", "NUCLEI", "CUSTOM"] as const;
const FINDING_STATUSES = ["OPEN", "CONFIRMED", "FALSE_POSITIVE", "FIXED", "RETEST_REQUIRED"] as const;
const CONTEXTS = ["production", "test", "docs", "generated"] as const;
// RETEST needs a target finding; it goes through `wm-sentinel verify` for now.
const QUEUEABLE_TYPES = ["FULL", "PR", "MANUAL"] as const;

const param = (req: Request, name: string) => {
  const value = req.params[name];
  if (typeof value !== "string" || !value) throw new HttpError(400, `Missing "${name}"`);
  return value;
};

function projectInput(body: Record<string, unknown>, partial: boolean) {
  const read = partial ? optionalString : requiredString;
  const name = read(body, "name");
  const repositoryUrl = read(body, "repositoryUrl");
  const defaultBranch = optionalString(body, "defaultBranch");
  const localPath = optionalString(body, "localPath");
  return {
    ...(name ? { name } : {}),
    ...(repositoryUrl ? { repositoryUrl } : {}),
    ...(defaultBranch ? { defaultBranch } : {}),
    ...(localPath ? { localPath } : {}),
  };
}

// --- projects --------------------------------------------------------------

export async function listProjects(_req: Request, res: Response) {
  res.json(await projects.listProjects());
}

export async function getProject(req: Request, res: Response) {
  res.json(await projects.getProject(param(req, "id")));
}

export async function createProject(req: Request, res: Response) {
  const input = projectInput(bodyObject(req), false) as projects.ProjectInput;
  res.status(201).json(await projects.createProject(input));
}

export async function updateProject(req: Request, res: Response) {
  res.json(await projects.updateProject(param(req, "id"), projectInput(bodyObject(req), true)));
}

// --- assessments -----------------------------------------------------------

export async function listAssessments(req: Request, res: Response) {
  const projectId = param(req, "id");
  await projects.getProject(projectId);
  res.json(await assessments.listAssessments(projectId));
}

export async function enqueueAssessment(req: Request, res: Response) {
  const body = req.body && typeof req.body === "object" ? (req.body as Record<string, unknown>) : {};
  const type = oneOf(body.type, QUEUEABLE_TYPES, "type") ?? "FULL";
  res.status(202).json(await assessments.enqueueAssessment(param(req, "id"), type));
}

export async function importAssessment(req: Request, res: Response) {
  const report = validateReportFile(req.body);
  res.status(201).json(await assessments.importReport(param(req, "id"), report));
}

export async function getAssessment(req: Request, res: Response) {
  res.json(await assessments.getAssessment(param(req, "id")));
}

export async function listAssessmentFindings(req: Request, res: Response) {
  const id = param(req, "id");
  const severity = oneOf(queryString(req, "severity")?.toUpperCase(), SEVERITIES, "severity");
  const category = oneOf(queryString(req, "category")?.toUpperCase(), CATEGORIES, "category");
  const source = oneOf(queryString(req, "source")?.toUpperCase(), SOURCES, "source");
  const status = oneOf(queryString(req, "status")?.toUpperCase(), FINDING_STATUSES, "status");
  const context = oneOf(queryString(req, "context")?.toLowerCase(), CONTEXTS, "context");
  const take = queryInt(req, "limit", 200, 1000);
  const skip = queryInt(req, "offset", 0, Number.MAX_SAFE_INTEGER);
  await assessments.getAssessment(id);
  res.json(
    await findings.listFindings(id, {
      ...(severity ? { severity } : {}),
      ...(category ? { category } : {}),
      ...(source ? { source } : {}),
      ...(status ? { status } : {}),
      ...(context ? { context } : {}),
      take,
      skip,
    })
  );
}

export async function exportAssessmentReport(req: Request, res: Response) {
  const id = param(req, "id");
  const format = oneOf(queryString(req, "format")?.toLowerCase(), ["json", "sarif", "html"] as const, "format") ?? "json";
  const report = await assessments.loadReportFile(id);
  const filename = `wm-sentinel-${id}.${format}`;
  res.set("Content-Disposition", `attachment; filename="${filename}"`);
  if (format === "html") {
    // The report is a static page: no scripts needed, so forbid them.
    res.set("Content-Security-Policy", "default-src 'none'; style-src 'unsafe-inline'");
    return void res.type("html").send(toHtml(report));
  }
  res.json(format === "sarif" ? toSarif(report) : report);
}

// --- findings --------------------------------------------------------------

export async function getFinding(req: Request, res: Response) {
  res.json(await findings.getFinding(param(req, "id")));
}

export async function updateFinding(req: Request, res: Response) {
  const status = oneOf(bodyObject(req).status, FINDING_STATUSES, "status");
  if (!status) throw new HttpError(400, `"status" is required`);
  res.json(await findings.updateFindingStatus(param(req, "id"), status));
}
