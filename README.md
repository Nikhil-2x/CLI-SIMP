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
   npx prisma migrate deploy     # applies prisma/migrations
   ```

### API, worker and CLI upload

Run the API and the worker in two terminals from `Backend/`:

```bash
npm run dev       # Express API on http://127.0.0.1:4000
npm run worker    # picks up queued assessments and runs the scanners
```

| Env var (`Backend/.env`) | Purpose |
|---|---|
| `API_KEY` | Bearer token required on `/api/*`. If unset, the API is unauthenticated and listens on 127.0.0.1 only. |
| `HOST` | Bind address when `API_KEY` is set (default `0.0.0.0`). |
| `CORS_ORIGIN` | Comma-separated dashboard origins (default `http://localhost:3000`). |
| `SCAN_ROOT` | If set, a project's `localPath` must be inside this directory. |
| `WORKER_POLL_MS` | Worker poll interval (default 5000). |

Routes (all under `/api`):

```
GET/POST   /projects                      list / create {name, repositoryUrl, defaultBranch?, localPath?}
GET/PATCH  /projects/:id
GET        /projects/:id/assessments
POST       /projects/:id/assessments      queue a scan {type: FULL|PR|MANUAL} -> 202, worker runs it
POST       /projects/:id/assessments/import   store a report from `wm-sentinel push`
GET        /assessments/:id               status, scanner runs, counts by severity
GET        /assessments/:id/findings      ?severity=&source=&category=&status=&context=&limit=&offset=
GET        /assessments/:id/report        ?format=json|sarif|html
GET/PATCH  /findings/:id                  details + evidence / triage {status}
```

`localPath` is the local/test checkout the worker scans (never a production host).
Triage status (`FALSE_POSITIVE`, `CONFIRMED`) carries over to the same finding in later scans.

Upload a CLI scan instead of queueing one:

```bash
npm run cli -- scan ~/coding/worldmonitor
npm run cli -- push ~/coding/worldmonitor --project <projectId>   # uses $WM_SENTINEL_API_KEY if set
```

To get a real `wm-sentinel` command: `npm run build && npm link` (undo with `npm unlink -g backend`).

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
