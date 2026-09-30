import { spawn } from "node:child_process";

export interface CommandResult {
  stdout: string;
  stderr: string;
  code: number | null;
}

/**
 * Runs a command and always resolves (never rejects on a non-zero exit code) —
 * security scanners routinely exit non-zero when they find something, which
 * is not the same as the command failing to run.
 */
export function runCommand(
  cmd: string,
  args: string[],
  options: { cwd?: string } = {}
): Promise<CommandResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      cwd: options.cwd,
      shell: process.platform === "win32",
    });

    let stdout = "";
    let stderr = "";

    child.stdout?.on("data", (chunk) => (stdout += chunk));
    child.stderr?.on("data", (chunk) => (stderr += chunk));

    child.on("error", reject);
    child.on("close", (code) => resolve({ stdout, stderr, code }));
  });
}

export async function isCommandAvailable(cmd: string, versionArg = "--version"): Promise<boolean> {
  try {
    const result = await runCommand(cmd, [versionArg]);
    return result.code === 0;
  } catch {
    return false;
  }
}
