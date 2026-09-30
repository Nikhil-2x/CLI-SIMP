# WM-Sentinel

Evidence-driven security assessment and DevSecOps platform for World Monitor.

## Layout

Two independent npm projects — no monorepo/workspace tooling:

```
Backend/     Express + TypeScript API, core engine, scanner adapters, worker, CLI
frontend/    Next.js + TypeScript dashboard
```

Database: [Neon](https://neon.tech) (managed Postgres), accessed via Prisma from `Backend/`.
The frontend never talks to the database directly — always through the Express API.

## Local development

```bash
cd Backend
npm install
npm run dev        # http://localhost:4000

cd frontend
npm install
npm run dev         # http://localhost:3000
```

### Database setup (Neon)

1. Create a Neon project (and a separate branch for local dev, e.g. `dev`).
2. Copy the pooled connection string into `Backend/.env` as `DATABASE_URL`,
   and the direct (non-pooled) connection string as `DIRECT_URL`.
3. From `Backend/`:
   ```bash
   npx prisma generate
   npx prisma migrate dev --name init
   ```

## Structure inside `Backend/src`

```
core/
  engine/         assessment orchestration
  scanners/        Scanner adapter interface + implementations (Semgrep, Bandit, ...)
  normalizer/      raw scanner output -> SecurityFinding
  correlation/     dedupe/merge findings across scanners
  risk/            risk scoring/prioritization
  rules/           World Monitor-specific security rules (WM-AUTH-001, ...)
  evidence/        evidence capture/storage helpers
cli/               wm-sentinel CLI (npm run cli -- <command>)
worker/            scanner job worker (assessments are queued, not run inline)
routes/ controllers/ services/ middleware/   Express API
types/             shared types (SecurityFinding, etc.)
```

See the implementation plan for the full phase breakdown.
