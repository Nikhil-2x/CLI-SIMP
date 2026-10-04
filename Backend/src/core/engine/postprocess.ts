import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { isAbsolute, join, relative } from "node:path";
import type { CodeContext, SecurityFinding } from "../../types/finding.js";

const SUPPRESS_MARKER = "wm-sentinel-ignore";

export function normalizePath(projectPath: string, p: string): string {
  let out = isAbsolute(p) ? relative(projectPath, p) : p;
  out = out.replace(/\\/g, "/");
  while (out.startsWith("./")) out = out.slice(2);
  return out;
}

/** Makes every finding's filePath repo-relative with forward slashes. */
export function normalizePaths(projectPath: string, findings: SecurityFinding[]): SecurityFinding[] {
  return findings.map((f) =>
    f.filePath ? { ...f, filePath: normalizePath(projectPath, f.filePath) } : f
  );
}

export function dropIgnoredPaths(findings: SecurityFinding[], ignorePaths: string[]): SecurityFinding[] {
  if (!ignorePaths.length) return findings;
  return findings.filter((f) => !f.filePath || !ignorePaths.some((p) => f.filePath!.startsWith(p)));
}

/** PR mode: keep findings in changed files (and findings with no file, e.g. endpoint-only). */
export function restrictToChangedFiles(
  projectPath: string,
  findings: SecurityFinding[],
  changedFiles?: string[]
): SecurityFinding[] {
  if (!changedFiles?.length) return findings;
  const changed = new Set(changedFiles.map((f) => normalizePath(projectPath, f)));
  return findings.filter((f) => !f.filePath || changed.has(f.filePath));
}

class LineReader {
  private cache = new Map<string, string[] | null>();
  constructor(private root: string) {}

  async line(file: string, n: number): Promise<string | undefined> {
    if (!this.cache.has(file)) {
      try {
        this.cache.set(file, (await readFile(join(this.root, file), "utf-8")).split("\n"));
      } catch {
        this.cache.set(file, null);
      }
    }
    return this.cache.get(file)?.[n - 1];
  }
}

/** Drops findings whose line (or the line above) carries a `wm-sentinel-ignore` comment. */
export async function dropSuppressed(
  projectPath: string,
  findings: SecurityFinding[]
): Promise<SecurityFinding[]> {
  const reader = new LineReader(projectPath);
  const kept: SecurityFinding[] = [];
  for (const f of findings) {
    if (f.filePath && f.lineStart) {
      const here = await reader.line(f.filePath, f.lineStart);
      const above = f.lineStart > 1 ? await reader.line(f.filePath, f.lineStart - 1) : undefined;
      if (here?.includes(SUPPRESS_MARKER) || above?.includes(SUPPRESS_MARKER)) continue;
    }
    kept.push(f);
  }
  return kept;
}

/**
 * Replaces line-number-based fingerprints with ones derived from the finding's
 * source (rule + file + the trimmed text of the flagged line + occurrence
 * index among identical hits). Findings keep the same identity when
 * unrelated edits shift line numbers, so PR diffs and `verify` stay stable.
 * Findings with no file/line (e.g. OSV) already have line-independent fingerprints.
 */
export async function stabilizeFingerprints(
  projectPath: string,
  findings: SecurityFinding[]
): Promise<SecurityFinding[]> {
  const reader = new LineReader(projectPath);
  const ordered = findings
    .map((f, i) => ({ f, i }))
    .sort((a, b) => (a.f.filePath ?? "").localeCompare(b.f.filePath ?? "") || (a.f.lineStart ?? 0) - (b.f.lineStart ?? 0));

  const seen = new Map<string, number>();
  const out = new Array<SecurityFinding>(findings.length);

  for (const { f, i } of ordered) {
    if (!f.filePath || !f.lineStart) {
      out[i] = f;
      continue;
    }
    const text = ((await reader.line(f.filePath, f.lineStart)) ?? "").trim().replace(/\s+/g, " ");
    const base = [f.source, f.title, f.filePath, text].join("|");
    const occurrence = seen.get(base) ?? 0;
    seen.set(base, occurrence + 1);
    out[i] = {
      ...f,
      fingerprint: createHash("sha1").update(`${base}|${occurrence}`).digest("hex"),
    };
  }
  return out;
}

const CONTEXT_PATTERNS: Array<[CodeContext, RegExp, number]> = [
  ["test", /(^|\/)(tests?|__tests__|__mocks__|mocks?|fixtures?|e2e|spec)\/|\.(test|spec)\.[cm]?[jt]sx?$/i, 20],
  ["docs", /(^|\/)docs?\/|\.(md|mdx|rst|txt)$/i, 20],
  ["generated", /generated|\.min\.js$|(^|\/)vendor\//i, 30],
];

/**
 * Tags each finding with where its code lives and caps confidence for
 * tests/docs/generated files. They stay in the report (a real key in a test
 * is still a real key) but can't block the gate on their own.
 * Dependency findings are left alone — a lockfile is never "test code".
 */
export function applyCodeContext(findings: SecurityFinding[]): SecurityFinding[] {
  return findings.map((f) => {
    if (!f.filePath || f.category === "DEPENDENCY") return { ...f, context: "production" };
    const match = CONTEXT_PATTERNS.find(([, re]) => re.test(f.filePath!));
    if (!match) return { ...f, context: "production" };
    const [context, , cap] = match;
    return { ...f, context, confidence: Math.min(f.confidence, cap) };
  });
}
