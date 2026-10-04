# HANDOFF — WM-Sentinel (session "cli-simp")

Written 2026-10-04 to resume work on Linux / Pop!_OS.
Everything below comes from a read-only code review. Nothing was run or tested.

## 1. What has been built or changed

**No code was changed in this session.** It was analysis only. The one new file is this HANDOFF.md. Commits are still `ab18233` (GitHub Actions PR workflow and .gitignore) on top of `85fd4b0` (initial commit), on branch `main`.

What exists in the repo (from the review):

- `Backend/` is Express + TypeScript (ESM, run with `tsx`).
  - **Scanner adapters** in `src/core/scanners/` for Semgrep, Bandit, Gitleaks and OSV. All implement one `Scanner` interface and produce the shared `SecurityFinding` type (`src/types/finding.ts`).
  - **Seven custom rules** in `src/core/rules/wm-*.ts` (WM-AUTH/AUTHZ/API/INPUT/SECRET/CONFIG/DATA-001). These are regex line-greps, worded as "expectation checks".
  - **Correlation** (`core/correlation`) merges duplicates with union-find. **Risk scoring** (`core/risk`) gives a 0-100 score and a P0-P3 priority.
  - **PR logic** in `core/pr/` (diff, gate, comment) and `core/github/postComment.ts`.
  - **CLI**: `init`, `scan`, `findings`, `verify`, `report` (JSON only), `github-comment`. Run with `npm run cli -- <cmd>`. State goes to `.wm-sentinel/last-report.json`.
  - **Stubs only**: Express API (`/health` only), worker, evidence, routes, controllers, services, middleware.
  - **Prisma schema** (12 models), two migrations and a rules seed. Nothing in the app uses the database yet.
- `frontend/` is an untouched `create-next-app` scaffold (Next 16, Tailwind 4, shadcn button).
- `.github/workflows/wm-sentinel.yml` scans PRs and posts a comment.
- `docker-compose.yml` exists but is broken (see section 3).

## 2. Architectural decisions and why

These are the decisions already in the code and docs, not new ones from this session.

- **Two independent npm projects, no monorepo tooling.** This keeps setup simple. The frontend never talks to the database and goes through the Express API (README).
- **Scanner adapter interface.** The engine doesn't need to know any tool's CLI or output format. A missing tool is skipped and doesn't fail the scan.
- **Normalise at the adapter.** Each adapter outputs `SecurityFinding[]`, so the "normalizer" is just a flatten.
- **WM rules are low-confidence "expectation checks", not claims of vulnerabilities.** Gitleaks covers known secret formats, and the rules cover generic patterns.
- **Risk score is separate from scanner severity.** It weights severity 40%, exploitability 25%, exposure 15%, sensitivity 10% and confidence 10%. The last three are guessed from the finding's category and endpoint.
- **PR gate judges only new findings.** It compares the PR scan against a baseline scan of the base branch (run in a throwaway `git worktree`) and fails on new CRITICAL or HIGH.
- **GitHub integration uses plain `fetch`**, a minimal-scope `GITHUB_TOKEN`, and the `pull_request` trigger (not `pull_request_target`) so privileged secrets never run against untrusted PR code.
- **JSON files for state today, Neon Postgres (via Prisma) later.** The CLI doesn't use the database yet.
- **Decided by the user in chat:** move testing to Pop!_OS because Semgrep has limited native Windows support.

## 3. Current errors and blockers (not fixed yet)

Most serious first. All are from reading the code, not from running it.

1. **PR diff is unreliable.** Finding IDs hash fingerprints that include line numbers, and a merged finding's ID changes when neighbours change. A PR that only shifts lines can show old issues as NEW and fail the gate. `verify` has the same weakness. Files: `core/scanners/*.ts`, `core/correlation/index.ts` (`mergeGroup`).
2. **CI will likely fail.**
   - The Gitleaks step downloads `releases/latest/download/gitleaks_8.18.4_...`, which 404s once "latest" isn't 8.18.4.
   - `scan.ts` runs `git diff main...HEAD` using the raw base name. A PR checkout in Actions usually has no local `main`, so it silently becomes a full scan. `github-comment` already uses `resolveBaseRef`, but `scan` doesn't.
3. **Current and baseline scans aren't comparable.** In `--pr` mode only Semgrep honours `changedFiles`. Bandit, Gitleaks, OSV and all the WM rules scan everything, and the baseline is a full scan.
4. **Semgrep and Bandit always report category `OTHER`.** Because of this, category-based correlation and the risk model's exploitability guess barely work.
5. **The gate is noisy.** Low-confidence regex rules emit HIGH severity, and the gate ignores confidence. WM-API-001 and WM-AUTHZ-001 only check the same line for middleware.
6. **Prisma config.**
   - The file is `prisma7.config.ts`, but Prisma only auto-loads `prisma.config.ts`.
   - The config comments and README mention `DIRECT_URL`, but the code only reads `DATABASE_URL`.
   - The `package.json` `prisma.seed` key may be deprecated in Prisma 7 (unsure).
7. **`docker-compose.yml` references Dockerfiles that don't exist** in `Backend/` or `frontend/`.
8. **`npm run build` probably fails.** `Backend/tsconfig.json` has `"types": []`, so `@types/node` isn't loaded. `tsx` hides this at dev time.
9. **Robustness.**
   - Gitleaks (`--no-git`) and Bandit (`-r .`) have no exclude for `node_modules` or virtualenvs.
   - `scan.ts` has no try/catch around `scanner.scan()`, so a thrown error crashes the CLI (`runAllScanners` has one).
   - `runCommand` uses `shell: true` on Windows with file names from git, which breaks on spaces and is an injection risk. This goes away on Linux.
   - Semgrep gets the changed-file list, which can include files deleted in the PR.
10. **The rules flag this repo's own source.** The string `"Use of eval()"` in `wm-input.ts` matches its own pattern.
11. **Duplicated pipeline.** `cli/commands/scan.ts` re-implements `core/engine`.
12. **Minor.**
    - Correlation is O(n²) and merges any two findings in a file with the same CWE, however far apart.
    - `upsertPRComment` reads only the first comment page, so it can post duplicates.
    - Fork PRs get a read-only token, so the comment post throws.
    - `scan` writes `wm-sentinel-report.json` into the scanned repo.
    - `init` writes `.wm-sentinel.json`, which nothing reads.
    - The frontend depends on a `cn` package that is probably unused.
    - There are no tests.

## 4. Next immediate steps on Pop!_OS

These commands are what I'd expect to work. Verify versions and URLs as you go.

1. **Get the code.** Commit or push anything local first, then `git clone` the repo on the Linux machine. Keep `Backend/.env` out of git and recreate it there.
2. **Install system tools:**
   ```bash
   sudo apt update && sudo apt install -y git curl build-essential python3 python3-pip pipx
   ```
3. **Install Node 20 or newer.** Use nvm, then run `nvm install 22`. Confirm with `node -v`.
4. **Install the scanners:**
   ```bash
   pipx install semgrep
   pipx install bandit
   pipx ensurepath          # then restart the shell
   ```
   - Pip installs into the system Python can be blocked on newer distros, which is why `pipx` is suggested.
   - Install **gitleaks** and **osv-scanner** from their GitHub releases pages (download the linux amd64 binary, `chmod +x`, move to `/usr/local/bin`), or build with `go install` if Go is installed.
   - Confirm all four with `semgrep --version`, `bandit --version`, `gitleaks version` and `osv-scanner --version`.
5. **Install and smoke-test:**
   ```bash
   cd Backend && npm install
   npm run cli -- scan ..          # scan the repo itself
   npm run cli -- findings ..
   ```
   - Note which scanners run or are skipped.
   - Check the output for the false positive in problem 10 and for `node_modules` noise (problem 9).
   - Check how long Gitleaks and Bandit take.
6. **Fix in this order:**
   - **Problem 4:** map Semgrep and Bandit categories.
   - **Problem 2:** the Gitleaks URL and the `--pr` base ref.
   - **Problem 1:** line-independent fingerprints, so the PR diff is stable.
   - **Problem 3:** make all scanners honour `changedFiles`, or scan the baseline the same way.
   - **Problem 8:** the tsconfig `types`.
   - **Problem 6:** rename `prisma7.config.ts` to `prisma.config.ts`, then wire up `DIRECT_URL`.
   - **Problem 5:** gate on confidence or severity.
7. **Test the PR flow locally.** Make a branch with a small insecure change, run `npm run cli -- scan .. --pr --base main`, then `npm run cli -- github-comment .. --base main`. Without `GITHUB_TOKEN` the comment is printed instead of posted.
8. **Add tests**, starting with correlation, risk and gate (pure functions).
9. **Later:** database persistence, then the Express API and worker, then the frontend.

## Open questions for the user

- Should heuristic WM-rule findings be able to fail the PR gate at all?
- Do you want me to fix problems 1-4 first once you're on Linux?
