import { isAbsolute, relative, resolve } from "node:path";
import { stat } from "node:fs/promises";
import { prisma } from "../lib/prisma.js";
import { HttpError } from "../lib/http.js";

export interface ProjectInput {
  name: string;
  repositoryUrl: string;
  defaultBranch?: string;
  localPath?: string;
}

/**
 * The worker runs scanners against `localPath`, so anyone who can set it can
 * have this machine read that directory. When SCAN_ROOT is set, paths must
 * live under it. Paths must exist and be directories either way.
 */
export async function checkLocalPath(localPath: string): Promise<string> {
  const abs = resolve(localPath);
  const root = process.env.SCAN_ROOT ? resolve(process.env.SCAN_ROOT) : undefined;
  if (root) {
    const rel = relative(root, abs);
    if (rel.startsWith("..") || isAbsolute(rel)) {
      throw new HttpError(400, `localPath must be inside SCAN_ROOT (${root})`);
    }
  }
  const info = await stat(abs).catch(() => null);
  if (!info?.isDirectory()) throw new HttpError(400, `localPath does not exist or is not a directory: ${abs}`);
  return abs;
}

export function listProjects() {
  return prisma.project.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      assessments: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { id: true, type: true, status: true, createdAt: true, completedAt: true },
      },
    },
  });
}

export async function getProject(id: string) {
  const project = await prisma.project.findUnique({ where: { id } });
  if (!project) throw new HttpError(404, "Project not found");
  return project;
}

export async function createProject(input: ProjectInput) {
  return prisma.project.create({
    data: {
      name: input.name,
      repositoryUrl: input.repositoryUrl,
      ...(input.defaultBranch ? { defaultBranch: input.defaultBranch } : {}),
      ...(input.localPath ? { localPath: await checkLocalPath(input.localPath) } : {}),
    },
  });
}

export async function updateProject(id: string, input: Partial<ProjectInput>) {
  await getProject(id);
  return prisma.project.update({
    where: { id },
    data: {
      ...(input.name ? { name: input.name } : {}),
      ...(input.repositoryUrl ? { repositoryUrl: input.repositoryUrl } : {}),
      ...(input.defaultBranch ? { defaultBranch: input.defaultBranch } : {}),
      ...(input.localPath ? { localPath: await checkLocalPath(input.localPath) } : {}),
    },
  });
}
