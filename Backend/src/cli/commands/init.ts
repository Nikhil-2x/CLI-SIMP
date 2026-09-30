import { resolve, basename, join } from "node:path";
import { readFile, writeFile } from "node:fs/promises";
import * as p from "@clack/prompts";
import chalk from "chalk";
import { getGitInfo } from "../lib/git.js";

interface WMSentinelConfig {
  name: string;
  repositoryUrl?: string;
  defaultBranch: string;
}

async function guessProjectName(projectPath: string): Promise<string> {
  try {
    const raw = await readFile(join(projectPath, "package.json"), "utf-8");
    const pkg = JSON.parse(raw);
    if (typeof pkg.name === "string") return pkg.name;
  } catch {
    // no package.json — fall back to directory name
  }
  return basename(projectPath);
}

export async function initCommand(targetPath: string): Promise<void> {
  const projectPath = resolve(targetPath || ".");

  p.intro(chalk.bold("WM-Sentinel Init"));

  const gitInfo = await getGitInfo(projectPath);
  const guessedName = await guessProjectName(projectPath);

  const name = await p.text({
    message: "Project name",
    initialValue: guessedName,
  });
  if (p.isCancel(name)) {
    p.cancel("Cancelled.");
    process.exit(1);
  }

  const repositoryUrl = await p.text({
    message: "Repository URL",
    initialValue: gitInfo.remoteUrl ?? "",
    placeholder: "https://github.com/org/repo",
  });
  if (p.isCancel(repositoryUrl)) {
    p.cancel("Cancelled.");
    process.exit(1);
  }

  const defaultBranch = await p.text({
    message: "Default branch",
    initialValue: gitInfo.branch ?? "main",
  });
  if (p.isCancel(defaultBranch)) {
    p.cancel("Cancelled.");
    process.exit(1);
  }

  const config: WMSentinelConfig = {
    name,
    defaultBranch,
    ...(repositoryUrl ? { repositoryUrl } : {}),
  };

  const configPath = join(projectPath, ".wm-sentinel.json");
  await writeFile(configPath, JSON.stringify(config, null, 2) + "\n", "utf-8");

  p.outro(
    [
      `Wrote ${chalk.cyan(configPath)}`,
      "",
      `Run ${chalk.bold("wm-sentinel scan --full")} to run your first assessment.`,
    ].join("\n")
  );
}
