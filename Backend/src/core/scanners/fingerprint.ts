import { createHash } from "node:crypto";

/** Stable identity for a finding, used for dedupe/correlation and re-scan diffing. */
export function makeFingerprint(parts: Array<string | number | undefined>): string {
  const normalized = parts.map((p) => String(p ?? "")).join("|");
  return createHash("sha1").update(normalized).digest("hex");
}
