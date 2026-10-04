import type { FindingCategory } from "../../types/finding.js";

const CWE_CATEGORY: Record<number, FindingCategory> = {};
function map(category: FindingCategory, ...cwes: number[]) {
  for (const cwe of cwes) CWE_CATEGORY[cwe] = category;
}

map("INJECTION", 74, 77, 78, 79, 80, 89, 90, 91, 94, 95, 96, 917, 943, 1336);
map("INPUT_VALIDATION", 20, 22, 23, 36, 73, 116, 502, 601, 611, 918, 1333, 400, 770);
map("AUTHENTICATION", 287, 288, 290, 294, 306, 384, 521, 613, 620, 640, 307);
map("AUTHORIZATION", 269, 275, 284, 285, 639, 732, 862, 863, 915);
map("SECRETS", 259, 312, 321, 522, 532, 798, 200);
map("CRYPTOGRAPHY", 295, 296, 297, 326, 327, 328, 330, 331, 338, 759, 760, 916);
map("API_SECURITY", 346, 352, 942);
map("CONFIGURATION", 16, 215, 489, 614, 693, 1004, 1021, 1275);

const KEYWORDS: Array<[RegExp, FindingCategory]> = [
  [/sql|inject|xss|command|exec|eval|subprocess|shell|template/i, "INJECTION"],
  [/secret|password|credential|token|api[-_]?key|hardcoded/i, "SECRETS"],
  [/crypto|hash|md5|sha1|cipher|tls|ssl|random|jwt/i, "CRYPTOGRAPHY"],
  [/authz|authoriz|access[-_]?control|idor|permission/i, "AUTHORIZATION"],
  [/auth|session|login/i, "AUTHENTICATION"],
  [/cors|csrf|rate[-_]?limit|graphql|api/i, "API_SECURITY"],
  [/cookie|header|debug|config|bind|permissive/i, "CONFIGURATION"],
  [/path[-_]?traversal|ssrf|redirect|deserial|xxe|validation/i, "INPUT_VALIDATION"],
];

/** Maps a CWE id ("CWE-89" or 89) and/or a rule id/name to the universal category. */
export function inferCategory(cwe?: string | number, ruleText?: string): FindingCategory {
  const num = typeof cwe === "number" ? cwe : Number(cwe?.match(/\d+/)?.[0]);
  if (Number.isFinite(num) && CWE_CATEGORY[num]) return CWE_CATEGORY[num]!;

  for (const [pattern, category] of KEYWORDS) {
    if (ruleText && pattern.test(ruleText)) return category;
  }
  return "OTHER";
}
