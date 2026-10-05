// Scanner job worker. Assessments are queued (not run inline in HTTP
// handlers) and picked up here. A simple polling worker is enough for
// Round 1 — no Kafka/Redis required. Run several for parallelism: claiming
// a job is atomic.

import "dotenv/config";
import { runAssessment } from "../core/engine/index.js";
import { getChangedFiles, getGitInfo } from "../cli/lib/git.js";
import { buildReportFile } from "../cli/lib/report.js";
import {
  claimNextAssessment,
  failInterruptedAssessments,
  markAssessmentFailed,
  persistReport,
} from "../services/assessments.js";
import { checkLocalPath } from "../services/projects.js";
import { prisma } from "../lib/prisma.js";

const POLL_MS = Number(process.env.WORKER_POLL_MS || 5000);

type Job = NonNullable<Awaited<ReturnType<typeof claimNextAssessment>>>;

const log = (msg: string) => console.log(`[worker ${new Date().toISOString()}] ${msg}`);

export async function processAssessment(job: Job): Promise<void> {
  const { project } = job;
  if (!project.localPath) throw new Error("Project has no localPath");
  const projectPath = await checkLocalPath(project.localPath);

  let changedFiles: string[] | undefined;
  if (job.type === "PR") {
    changedFiles = await getChangedFiles(projectPath, project.defaultBranch);
    if (!changedFiles.length) {
      log(`${job.id}: no changes against ${project.defaultBranch}, running a full scan`);
      changedFiles = undefined;
    }
  }

  const gitInfo = await getGitInfo(projectPath);
  const result = await runAssessment(
    {
      projectPath,
      ...(changedFiles ? { changedFiles } : {}),
      ...(gitInfo.commitSha ? { commitSha: gitInfo.commitSha } : {}),
      ...(gitInfo.branch ? { branch: gitInfo.branch } : {}),
    },
    {
      hooks: {
        onScannerDone: (r, skipped) =>
          log(`${job.id}: ${r.scanner} ${skipped ? "skipped (not installed)" : `${r.findings.length} finding(s)${r.error ? " — error" : ""}`}`),
      },
    }
  );

  const report = buildReportFile(result, { projectPath, ...gitInfo, ...(changedFiles ? { changedFiles } : {}) });
  await persistReport(job.id, report);
  log(`${job.id}: completed, ${report.findings.length} finding(s) from ${report.rawFindingCount} raw`);
}

let stopping = false;

async function main() {
  const { count } = await failInterruptedAssessments();
  if (count) log(`marked ${count} interrupted assessment(s) as FAILED`);
  log(`polling every ${POLL_MS}ms`);

  while (!stopping) {
    let job: Job | null = null;
    try {
      job = await claimNextAssessment();
      if (job) {
        log(`${job.id}: ${job.type} scan of "${job.project.name}" started`);
        await processAssessment(job);
        continue; // look for the next job right away
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      log(`${job?.id ?? "poll"}: failed — ${message}`);
      if (job) await markAssessmentFailed(job.id, message).catch(() => {});
    }
    await new Promise((r) => setTimeout(r, POLL_MS));
  }
  await prisma.$disconnect();
}

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    log(`${signal} received, finishing the current job`);
    stopping = true;
  });
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
