import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";

const IGNORED_DIRS = new Set([
  "node_modules",
  ".git",
  ".next",
  "dist",
  "build",
  "coverage",
  ".turbo",
]);

/** Recursively lists project source files matching the given extensions. */
export async function walkSourceFiles(
  projectPath: string,
  extensions: string[]
): Promise<string[]> {
  const results: string[] = [];

  async function walk(dir: string) {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (IGNORED_DIRS.has(entry.name)) continue;
        await walk(join(dir, entry.name));
      } else if (extensions.some((ext) => entry.name.endsWith(ext))) {
        results.push(join(dir, entry.name));
      }
    }
  }

  await walk(projectPath);
  return results;
}

export interface FileLineMatch {
  filePath: string; // relative to projectPath
  lineNumber: number;
  line: string;
}

/** Greps a set of files for a regex, returning relative-path + line-number matches. */
export async function grepFiles(
  projectPath: string,
  files: string[],
  pattern: RegExp
): Promise<FileLineMatch[]> {
  const matches: FileLineMatch[] = [];

  for (const file of files) {
    let content: string;
    try {
      content = await readFile(file, "utf-8");
    } catch {
      continue;
    }

    const lines = content.split("\n");
    lines.forEach((line, idx) => {
      if (pattern.test(line)) {
        matches.push({
          filePath: relative(projectPath, file).replace(/\\/g, "/"),
          lineNumber: idx + 1,
          line: line.trim(),
        });
      }
      pattern.lastIndex = 0; // reset for global regexes
    });
  }

  return matches;
}
