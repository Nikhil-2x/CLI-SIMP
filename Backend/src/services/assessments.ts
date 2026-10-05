// Assessment persistence (plan Phases 13-15). The engine never touches the
// database: the worker (or an import from the CLI) hands a finished
// ReportFile to persistReport, which writes it in one transaction.

import type { AssessmentType, FindingStatus, Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { HttpError } from "../lib/http.js";
import type { ReportFile } from "../cli/lib/report.js";
import type { ScoredFinding } from "../core/pr/types.js";
import { getProject } from "./projects.js";

const SCANNER_TYPES = new Set(["SEMGREP", "SONARQUBE", "BANDIT", "GITLEAKS", "OSV", "TRIVY", "ZAP", "NUCLEI", "CUSTOM"]);

export function listAssessments(projectId: string) {
  return prisma.assessment.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { findings: true } } },
  });
}

export async function getAssessment(id: string) {
  const assessment = await prisma.assessment.findUnique({
    where: { id },
    include: { scannerRuns: { orderBy: { scanner: "asc" } }, project: { select: { id: true, name: true } } },
  });
  if (!assessment) throw new HttpError(404, "Assessment not found");

  const grouped = await prisma.finding.groupBy({ by: ["severity"], where: { assessmentId: id }, _count: true });
  const bySeverity = Object.fromEntries(grouped.map((g) => [g.severity, g._count]));
  return { ...assessment, bySeverity };
}

/** Queues a scan; the worker picks it up. HTTP handlers never run scanners inline. */
export async function enqueueAssessment(projectId: string, type: AssessmentType) {
  const project = await getProject(projectId);
  if (!project.localPath) {
    throw new HttpError(400, "Project has no localPath — set one (a local/test checkout) before queueing scans");
  }
  return prisma.assessment.create({ data: { projectId, type, status: "PENDING" } });
}

/** Atomically moves the oldest PENDING assessment to RUNNING. Safe with several workers. */
export async function claimNextAssessment() {
  const next = await prisma.assessment.findFirst({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
    include: { project: true },
  });
  if (!next) return null;
  const { count } = await prisma.assessment.updateMany({
    where: { id: next.id, status: "PENDING" },
    data: { status: "RUNNING", startedAt: new Date() },
  });
  return count === 1 ? next : null;
}

export function markAssessmentFailed(id: string, error: string) {
  return prisma.assessment.update({
    where: { id },
    data: { status: "FAILED", error: error.slice(0, 2000), completedAt: new Date() },
  });
}

/** Assessments left RUNNING by a worker that died. Called once at worker startup. */
export function failInterruptedAssessments() {
  return prisma.assessment.updateMany({
    where: { status: "RUNNING" },
    data: { status: "FAILED", error: "Worker stopped before the assessment finished", completedAt: new Date() },
  });
}

interface Carry {
  status: FindingStatus;
  firstSeen: Date;
}

/**
 * Looks up earlier findings of this project that share a member fingerprint,
 * so triage (FALSE_POSITIVE, CONFIRMED) and firstSeen survive re-scans.
 * A finding previously marked FIXED that shows up again is reopened.
 */
async function carryOverState(
  tx: Prisma.TransactionClient,
  projectId: string,
  assessmentId: string,
  findings: ScoredFinding[]
): Promise<Map<string, Carry>> {
  const fps = [...new Set(findings.flatMap((f) => f.members.map((m) => m.fingerprint)))];
  const byFp = new Map<string, Carry>();
  if (!fps.length) return byFp;

  const prior = await tx.finding.findMany({
    where: {
      assessmentId: { not: assessmentId },
      assessment: { projectId, status: "COMPLETED" },
      memberFingerprints: { hasSome: fps },
    },
    orderBy: { createdAt: "desc" },
    select: { memberFingerprints: true, status: true, firstSeen: true },
  });
  for (const p of prior) {
    for (const fp of p.memberFingerprints) {
      if (!byFp.has(fp)) {
        byFp.set(fp, { status: p.status === "FIXED" ? "OPEN" : p.status, firstSeen: p.firstSeen });
      }
    }
  }
  return byFp;
}

function primarySource(f: ScoredFinding) {
  return f.members.find((m) => m.title === f.title)?.source ?? f.sources[0] ?? "CUSTOM";
}

/** Writes scanner runs, findings and per-scanner evidence, then marks the assessment COMPLETED. */
export async function persistReport(assessmentId: string, report: ReportFile) {
  const assessment = await prisma.assessment.findUnique({ where: { id: assessmentId }, select: { projectId: true } });
  if (!assessment) throw new HttpError(404, "Assessment not found");
  const now = new Date();

  await prisma.$transaction(
    async (tx) => {
      // Re-persisting the same assessment replaces its findings.
      await tx.finding.deleteMany({ where: { assessmentId } });
      await tx.scannerRun.deleteMany({ where: { assessmentId } });

      const carry = await carryOverState(tx, assessment.projectId, assessmentId, report.findings);

      await tx.scannerRun.createMany({
        data: report.scannerResults
          .filter((r) => SCANNER_TYPES.has(r.scanner))
          .map((r) => ({
            assessmentId,
            scanner: r.scanner as Prisma.ScannerRunCreateManyInput["scanner"],
            status: r.skipped ? "SKIPPED" : r.error ? "FAILED" : "COMPLETED",
            completedAt: now,
            // Raw scanner output is deliberately not stored: Gitleaks' contains secret values.
            rawOutput: { findingCount: r.findingCount },
            error: r.error ?? null,
          })),
      });

      const created = await tx.finding.createManyAndReturn({
        data: report.findings.map((f) => {
          const prior = f.members.map((m) => carry.get(m.fingerprint)).find(Boolean);
          return {
            assessmentId,
            fingerprint: f.id,
            memberFingerprints: f.members.map((m) => m.fingerprint),
            title: f.title,
            description: f.description,
            severity: f.severity,
            confidence: Math.round(f.confidence),
            category: f.category,
            source: primarySource(f),
            sources: f.sources,
            context: f.context ?? null,
            filePath: f.filePath ?? null,
            lineStart: f.lineStart ?? null,
            lineEnd: f.lineEnd ?? null,
            endpoint: f.endpoint ?? null,
            cweId: f.cweId ?? null,
            cveId: f.cveId ?? null,
            cvssScore: f.cvssScore ?? null,
            riskScore: f.riskScore,
            priority: f.priority,
            status: prior?.status ?? "OPEN",
            firstSeen: prior?.firstSeen ?? now,
            lastSeen: now,
          };
        }),
        select: { id: true, fingerprint: true },
      });

      // One OBSERVATION per scanner hit, so every finding keeps its original
      // source and location even after correlation merged it.
      const idByFingerprint = new Map(created.map((c) => [c.fingerprint, c.id]));
      const evidence = report.findings.flatMap((f) => {
        const findingId = idByFingerprint.get(f.id)!;
        return f.members.flatMap((m) => [
          {
            findingId,
            type: "OBSERVATION",
            content: JSON.stringify({
              source: m.source,
              title: m.title,
              severity: m.severity,
              confidence: m.confidence,
              location: m.filePath ? `${m.filePath}:${m.lineStart ?? "?"}` : (m.endpoint ?? null),
              cweId: m.cweId ?? null,
              fingerprint: m.fingerprint,
            }),
          },
          ...(m.evidence ?? []).map((e) => ({ findingId, type: e.type, content: e.content })),
        ]);
      });
      if (evidence.length) await tx.evidence.createMany({ data: evidence });

      await tx.assessment.update({
        where: { id: assessmentId },
        data: {
          status: "COMPLETED",
          completedAt: now,
          rawFindingCount: report.rawFindingCount,
          commitSha: report.commitSha ?? null,
          branch: report.branch ?? null,
          changedFiles: report.changedFiles ?? [],
          error: null,
        },
      });
    },
    { timeout: 120_000, maxWait: 10_000 }
  );

  return getAssessment(assessmentId);
}

/** Stores a report produced by `wm-sentinel scan` on a developer machine or in CI. */
export async function importReport(projectId: string, report: ReportFile) {
  await getProject(projectId);
  const type: AssessmentType = report.changedFiles?.length ? "PR" : "FULL";
  const assessment = await prisma.assessment.create({
    data: { projectId, type, status: "RUNNING", startedAt: new Date(report.generatedAt) },
  });
  try {
    return await persistReport(assessment.id, report);
  } catch (err) {
    await markAssessmentFailed(assessment.id, err instanceof Error ? err.message : String(err));
    throw err;
  }
}

/** Rebuilds the CLI's ReportFile shape from the database, for the SARIF/HTML exporters. */
export async function loadReportFile(assessmentId: string): Promise<ReportFile> {
  const assessment = await prisma.assessment.findUnique({
    where: { id: assessmentId },
    include: { project: true, scannerRuns: true, findings: { orderBy: { riskScore: "desc" } } },
  });
  if (!assessment) throw new HttpError(404, "Assessment not found");

  return {
    version: 1,
    projectPath: assessment.project.name,
    ...(assessment.branch ? { branch: assessment.branch } : {}),
    ...(assessment.commitSha ? { commitSha: assessment.commitSha } : {}),
    generatedAt: (assessment.completedAt ?? assessment.createdAt).toISOString(),
    scannerResults: assessment.scannerRuns.map((r) => ({
      scanner: r.scanner,
      findingCount: (r.rawOutput as { findingCount?: number } | null)?.findingCount ?? 0,
      ...(r.error ? { error: r.error } : {}),
      ...(r.status === "SKIPPED" ? { skipped: true } : {}),
    })),
    ...(assessment.changedFiles.length ? { changedFiles: assessment.changedFiles } : {}),
    rawFindingCount: assessment.rawFindingCount,
    findings: assessment.findings.map((f) => ({
      id: f.fingerprint,
      title: f.title,
      description: f.description,
      severity: f.severity,
      confidence: f.confidence,
      category: f.category,
      sources: f.sources.length ? f.sources : [f.source],
      ...(f.filePath ? { filePath: f.filePath } : {}),
      ...(f.lineStart !== null ? { lineStart: f.lineStart } : {}),
      ...(f.lineEnd !== null ? { lineEnd: f.lineEnd } : {}),
      ...(f.endpoint ? { endpoint: f.endpoint } : {}),
      ...(f.cweId ? { cweId: f.cweId } : {}),
      ...(f.cveId ? { cveId: f.cveId } : {}),
      ...(f.cvssScore !== null ? { cvssScore: f.cvssScore } : {}),
      ...(f.context ? { context: f.context as NonNullable<ScoredFinding["context"]> } : {}),
      members: [],
      riskScore: f.riskScore ?? 0,
      priority: (f.priority ?? "P3") as ScoredFinding["priority"],
    })),
  };
}
