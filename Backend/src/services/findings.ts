import type { FindingCategory, FindingSource, FindingStatus, Prisma, Severity } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { HttpError } from "../lib/http.js";

export interface FindingFilters {
  severity?: Severity;
  source?: FindingSource;
  category?: FindingCategory;
  status?: FindingStatus;
  context?: string;
  take: number;
  skip: number;
}

export async function listFindings(assessmentId: string, filters: FindingFilters) {
  const where: Prisma.FindingWhereInput = {
    assessmentId,
    ...(filters.severity ? { severity: filters.severity } : {}),
    ...(filters.category ? { category: filters.category } : {}),
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.context ? { context: filters.context } : {}),
    ...(filters.source ? { sources: { has: filters.source } } : {}),
  };
  const [total, items] = await Promise.all([
    prisma.finding.count({ where }),
    prisma.finding.findMany({
      where,
      orderBy: [{ riskScore: "desc" }, { id: "asc" }],
      take: filters.take,
      skip: filters.skip,
    }),
  ]);
  return { total, items };
}

export async function getFinding(id: string) {
  const finding = await prisma.finding.findUnique({
    where: { id },
    include: {
      evidence: { orderBy: { createdAt: "asc" } },
      retests: { orderBy: { createdAt: "desc" } },
      assessment: { select: { id: true, projectId: true, type: true, commitSha: true, branch: true } },
    },
  });
  if (!finding) throw new HttpError(404, "Finding not found");
  return finding;
}

/** Triage. The new status is carried into later scans of the same project (see persistReport). */
export async function updateFindingStatus(id: string, status: FindingStatus) {
  await getFinding(id);
  return prisma.finding.update({ where: { id }, data: { status } });
}
