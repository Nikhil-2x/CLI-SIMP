import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { DEFAULT_GATE_OPTIONS, type GateOptions } from "../pr/gate.js";

export interface SentinelConfig {
  name?: string;
  repositoryUrl?: string;
  defaultBranch?: string;
  /** Repo-relative path prefixes whose findings are dropped (e.g. "Backend/src/core/rules/"). */
  ignorePaths: string[];
  securityGate: GateOptions;
}

export const CONFIG_FILE = ".wm-sentinel.json";

export const DEFAULT_CONFIG: SentinelConfig = {
  ignorePaths: [],
  securityGate: DEFAULT_GATE_OPTIONS,
};

/** Reads `.wm-sentinel.json` (written by `init`). Missing or invalid file → defaults. */
export async function loadConfig(projectPath: string): Promise<SentinelConfig> {
  try {
    const raw = JSON.parse(await readFile(join(projectPath, CONFIG_FILE), "utf-8"));
    return {
      ...DEFAULT_CONFIG,
      ...raw,
      ignorePaths: Array.isArray(raw.ignorePaths) ? raw.ignorePaths : [],
      securityGate: { ...DEFAULT_GATE_OPTIONS, ...(raw.securityGate ?? {}) },
    };
  } catch {
    return DEFAULT_CONFIG;
  }
}
