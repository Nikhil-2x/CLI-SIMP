import { execa } from "execa";

export interface GitInfo {
  isRepo: boolean;
  commitSha?: string;
  branch?: string;
  remoteUrl?: string;
}

export async function getGitInfo(cwd: string): Promise<GitInfo> {
  try {
    const { stdout: commitSha } = await execa("git", ["rev-parse", "HEAD"], { cwd });
    const { stdout: branch } = await execa("git", ["rev-parse", "--abbrev-ref", "HEAD"], { cwd });

    let remoteUrl: string | undefined;
    try {
      const { stdout } = await execa("git", ["remote", "get-url", "origin"], { cwd });
      remoteUrl = stdout.trim();
    } catch {
      // no remote configured — fine
    }

    return {
      isRepo: true,
      commitSha: commitSha.trim(),
      branch: branch.trim(),
      ...(remoteUrl ? { remoteUrl } : {}),
    };
  } catch {
    return { isRepo: false };
  }
}

/** Files changed relative to `base`. Empty array if the diff can't be computed. */
export async function getChangedFiles(cwd: string, base: string): Promise<string[]> {
  try {
    const { stdout } = await execa("git", ["diff", "--name-only", `${base}...HEAD`], { cwd });
    return stdout
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}
