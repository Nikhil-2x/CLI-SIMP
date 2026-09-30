import type { SecurityFinding } from "../../types/finding.js";
import { WMAuth001 } from "./wm-auth.js";
import { WMAuthz001 } from "./wm-authz.js";
import { WMApi001 } from "./wm-api.js";
import { WMInput001 } from "./wm-input.js";
import { WMSecret001 } from "./wm-secret.js";
import { WMConfig001 } from "./wm-config.js";
import { WMData001 } from "./wm-data.js";
import type { RuleContext, WMRule } from "./types.js";

export * from "./types.js";
export { WMAuth001, WMAuthz001, WMApi001, WMInput001, WMSecret001, WMConfig001, WMData001 };

export const wmRules: WMRule[] = [
  WMAuth001,
  WMAuthz001,
  WMApi001,
  WMInput001,
  WMSecret001,
  WMConfig001,
  WMData001,
];

export async function runRules(context: RuleContext): Promise<SecurityFinding[]> {
  const results = await Promise.all(wmRules.map((rule) => rule.evaluate(context)));
  return results.flat();
}
