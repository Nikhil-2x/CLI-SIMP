import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { correlateFindings } from "../src/core/correlation/index.js";
import { scoreFindings, calculateRisk } from "../src/core/risk/index.js";
import { classifyFindings } from "../src/core/pr/diff.js";
import { evaluateGate, DEFAULT_GATE_OPTIONS } from "../src/core/pr/gate.js";
import { inferCategory } from "../src/core/scanners/category.js";
import { stabilizeFingerprints, dropSuppressed } from "../src/core/engine/postprocess.js";
import { toSarif } from "../src/core/report/index.js";
import type { SecurityFinding } from "../src/types/finding.js";

const finding = (o: Partial<SecurityFinding> = {}): SecurityFinding => ({
  fingerprint: "fp" + Math.random(),
  title: "t",
  description: "d",
  severity: "MEDIUM",
  confidence: 80,
  category: "INJECTION",
  source: "SEMGREP",
  filePath: "a.ts",
  lineStart: 10,
  lineEnd: 10,
  ...o,
});

test("correlation merges nearby same-category findings from two scanners", () => {
  const out = correlateFindings([
    finding({ source: "SEMGREP" }),
    finding({ source: "CUSTOM", lineStart: 11, lineEnd: 11 }),
    finding({ filePath: "b.ts" }),
  ]);
  assert.equal(out.length, 2);
  assert.deepEqual(out.find((f) => f.filePath === "a.ts")!.sources.sort(), ["CUSTOM", "SEMGREP"]);
});

test("risk: high-everything is P0, low is P3", () => {
  const hi = calculateRisk({ severity: "CRITICAL", confidence: 95, exploitability: "HIGH", internetExposed: true, sensitiveData: true });
  const lo = calculateRisk({ severity: "LOW", confidence: 20, exploitability: "LOW", internetExposed: false, sensitiveData: false });
  assert.equal(hi.priority, "P0");
  assert.equal(lo.priority, "P3");
});

test("category inference from CWE and rule text", () => {
  assert.equal(inferCategory("CWE-89"), "INJECTION");
  assert.equal(inferCategory(undefined, "javascript.express.security.audit.xss"), "INJECTION");
  assert.equal(inferCategory(undefined, "nothing-useful"), "OTHER");
});

test("PR diff: same finding with a shifted line is UNCHANGED, not NEW", async () => {
  const dir = await mkdtemp(join(tmpdir(), "wm-test-"));
  try {
    await writeFile(join(dir, "a.ts"), "x\nfoo(eval(y))\n");
    const base = await stabilizeFingerprints(dir, [finding({ fingerprint: "1", lineStart: 2 })]);
    await writeFile(join(dir, "a.ts"), "x\nx\nx\nfoo(eval(y))\n"); // 2 lines inserted above
    const cur = await stabilizeFingerprints(dir, [finding({ fingerprint: "2", lineStart: 4 })]);
    const diff = classifyFindings(
      scoreFindings(correlateFindings(base)),
      scoreFindings(correlateFindings(cur))
    );
    assert.equal(diff.new.length, 0);
    assert.equal(diff.unchanged.length, 1);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("wm-sentinel-ignore suppresses a finding", async () => {
  const dir = await mkdtemp(join(tmpdir(), "wm-test-"));
  try {
    await writeFile(join(dir, "a.ts"), "// wm-sentinel-ignore\nfoo(eval(y))\n");
    const kept = await dropSuppressed(dir, [finding({ lineStart: 2 })]);
    assert.equal(kept.length, 0);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("gate: new HIGH at good confidence fails; low-confidence HIGH only warns", () => {
  const mk = (confidence: number) =>
    classifyFindings([], scoreFindings(correlateFindings([finding({ severity: "HIGH", confidence })]))).new;
  assert.equal(evaluateGate(mk(90), DEFAULT_GATE_OPTIONS).passed, false);
  const soft = evaluateGate(mk(40), DEFAULT_GATE_OPTIONS);
  assert.equal(soft.passed, true);
  assert.ok(soft.warnings.length > 0);
});

test("SARIF output has one result per finding", () => {
  const findings = scoreFindings(correlateFindings([finding(), finding({ filePath: "z.ts" })]));
  const sarif = toSarif({ version: 1, projectPath: ".", generatedAt: "now", scannerResults: [], rawFindingCount: 2, findings });
  assert.equal(sarif.runs[0]!.results.length, 2);
});

test("same CWE far apart in one file is NOT merged; nearby is", () => {
  const out = correlateFindings([
    finding({ cweId: "CWE-16", category: "CONFIGURATION", lineStart: 10, lineEnd: 10 }),
    finding({ cweId: "CWE-16", category: "OTHER", lineStart: 25, lineEnd: 25 }),
    finding({ cweId: "CWE-16", category: "OTHER", lineStart: 200, lineEnd: 200 }),
  ]);
  assert.equal(out.length, 2);
});

test("code context: tests/docs get tagged and confidence-capped, lockfiles don't", async () => {
  const { applyCodeContext } = await import("../src/core/engine/postprocess.js");
  const [t, d, p, dep] = applyCodeContext([
    finding({ filePath: "server/__tests__/x.test.ts", confidence: 90 }),
    finding({ filePath: "docs/guide.mdx", confidence: 90 }),
    finding({ filePath: "src/api/x.ts", confidence: 90 }),
    finding({ filePath: "tests/package-lock.json", category: "DEPENDENCY", confidence: 85 }),
  ]);
  assert.equal(t!.context, "test");
  assert.equal(t!.confidence, 20);
  assert.equal(d!.context, "docs");
  assert.equal(p!.context, "production");
  assert.equal(p!.confidence, 90);
  assert.equal(dep!.confidence, 85);
});

test("WM rules: eval in a regex/comment and env-var-name 'secrets' are not flagged", async () => {
  const { WMInput001, WMSecret001 } = await import("../src/core/rules/index.js");
  const dir = await mkdtemp(join(tmpdir(), "wm-test-"));
  try {
    await writeFile(
      join(dir, "a.ts"),
      [
        "expect(x).toMatch(/^eval(sha)?$/i);",
        "const y = 1; // we never eval(code) here",
        "eval(userInput);",
        "MUTATION_TOKEN: 'RAILWAY_MUTATION_TOKEN',",
        "const SETTINGS_KEY = 'wm-consumer-prices';",
        "const apiKey = 'q8Zr2LmP0xWv7TnB';",
      ].join("\n")
    );
    const ctx = { projectPath: dir, existingFindings: [] };
    const evals = await WMInput001.evaluate(ctx);
    assert.deepEqual(evals.filter((f) => f.cweId === "CWE-95").map((f) => f.lineStart), [3]);
    const secrets = await WMSecret001.evaluate(ctx);
    assert.deepEqual(secrets.map((f) => f.lineStart), [6]);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
