// Prisma 7 config — connection URLs live here, not in schema.prisma.
// See https://pris.ly/d/config-datasource
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Neon connection string. Use the DIRECT (non-pooled) connection here —
    // Prisma Migrate needs a direct connection. The running app can still
    // use a pooled connection separately if needed later.
    url: process.env["DATABASE_URL"],
  },
});
