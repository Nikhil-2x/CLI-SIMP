import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execa } from "execa";

/** Prefers `origin/<base>` (works with a shallow-but-fetched CI checkout) and falls back to the local branch name. */
export async function resolveBaseRef(cwd: string, base: string): Promise<string> {
  try {
    await execa("git", ["rev-parse", "--verify", `origin/${base}`], { cwd });
    return `origin/${base}`;
  } catch {
    return base;
  }
}

/**
 * Checks out `ref` into a throwaway git worktree and runs `fn` against it —
 * used to scan the PR's base branch without disturbing the current checkout.
 * Returns null (instead of throwing) if the worktree can't be created, e.g.
 * the ref isn't available in a shallow clone.
 */
export async function withBaselineWorktree<T>(
  projectPath: string,
  ref: string,
  fn: (worktreePath: string) => Promise<T>
): Promise<T | null> {
  const worktreeDir = await mkdtemp(join(tmpdir(), "wm-sentinel-baseline-"));

  try {
    await execa("git", ["worktree", "add", "--detach", worktreeDir, ref], { cwd: projectPath });
  } catch {
    await rm(worktreeDir, { recursive: true, force: true });
    return null;
  }

  try {
    return await fn(worktreeDir);
  } finally {
    await execa("git", ["worktree", "remove", "--force", worktreeDir], { cwd: projectPath }).catch(
      () => {}
    );
    await rm(worktreeDir, { recursive: true, force: true }).catch(() => {});
  }
}
