import "dotenv/config";
import { PrismaClient, FindingCategory } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { wmRules } from "../src/core/rules/index.js";

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const CATEGORY_MAP: Record<string, FindingCategory> = {
  "WM-AUTH-001": "AUTHENTICATION",
  "WM-AUTHZ-001": "AUTHORIZATION",
  "WM-API-001": "AUTHORIZATION",
  "WM-INPUT-001": "INJECTION",
  "WM-SECRET-001": "SECRETS",
  "WM-CONFIG-001": "CONFIGURATION",
  "WM-DATA-001": "OTHER",
};

async function main() {
  for (const rule of wmRules) {
    await prisma.securityRule.upsert({
      where: { code: rule.code },
      update: { title: rule.title, description: rule.description },
      create: {
        code: rule.code,
        title: rule.title,
        description: rule.description,
        category: CATEGORY_MAP[rule.code] ?? "OTHER",
      },
    });
  }
  console.log(`Seeded ${wmRules.length} World Monitor security rules.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
