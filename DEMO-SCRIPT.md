# WM-Sentinel — Demo Video Plan & Narration Script

**For:** screen recording (Nikhil) + voice-over (teammate).
**Total target length:** 4–5 minutes.
**Golden rule:** the voice-over describes exactly what is on screen at that moment.
Record each scene as a separate clip so a mistake only costs one clip.

The narration below is written to be read aloud. `[SCREEN: …]` lines are
directions for the recorder, not spoken.

---

## One-line project summary (for intro / slide)
"WM-Sentinel — an application-aware security assessment pipeline. Scanners are
the sensors; our system is the brain that correlates, prioritizes, and validates
their output into an evidence-backed report."

---

## SCENE 1 — The problem (20s)
[SCREEN: a title slide or the problem-statement PDF.]

> "Our task was to security-assess the World Monitor application: find real
> vulnerabilities, prove them, rate their impact, and recommend fixes. The
> challenge with modern security tools is noise — a single scan can throw
> hundreds of alerts, and most are false positives. So we didn't just run
> scanners. We built a system that thinks about the results the way a security
> analyst would."

---

## SCENE 2 — The architecture (30s)
[SCREEN: the methodology diagram — the 'Scanners → Normalize → Correlate →
Risk-rank → Agent validation → Report' pipeline. Use the diagram in the PDF
report, Section 3.]

> "WM-Sentinel runs five industry tools — Semgrep, Bandit, Gitleaks, OSV-Scanner,
> and our own custom World Monitor rules. Every tool speaks a different language,
> so our engine normalizes them into one finding format, then correlates
> duplicates, scores real-world risk, and tags whether code is production, test,
> or generated. Finally, an application-aware agent validates each candidate
> against the real source code. The result is a short list of findings a human
> can actually act on."

---

## SCENE 3 — Setup & tools installed (25s)
[SCREEN: terminal. Run these slowly:]
```bash
semgrep --version
bandit --version
gitleaks version
osv-scanner --version
```
[Then show the project layout: `ls Backend/src/core/` so scanners/, correlation/,
risk/, rules/ are visible.]

> "Here's our environment on Linux. We integrated four external scanners — all
> installed in an isolated local toolchain — plus our own rule engine. On the
> right you can see the core: separate modules for the scanner adapters,
> correlation, risk scoring, and the custom World Monitor rules. Each scanner is
> an adapter behind one interface, so adding a new tool never touches the engine."

---

## SCENE 4 — Running a real scan (40s)
[SCREEN: terminal. Run:]
```bash
cd Backend
npm run cli -- scan ~/coding/worldmonitor
```
[Let the spinners run. When it finishes, the summary shows raw vs correlated and
the severity counts. Pause on that summary.]

> "Now we run it against the real World Monitor codebase. All five sensors fire
> in parallel. In a few seconds it scans the entire repository... and here's the
> output: five hundred and ninety-four raw signals, correlated down to four
> hundred and forty distinct findings. But four hundred is still too many to be
> useful. That's where our intelligence layer earns its name."

---

## SCENE 5 — Triage: the key number (35s)
[SCREEN: terminal. Run:]
```bash
npm run cli -- triage ~/coding/worldmonitor --limit 30
```
[Show the output listing the worklist being written. Then:]
```bash
npm run cli -- findings ~/coding/worldmonitor --severity HIGH --production
```

> "The triage command ranks the findings and keeps only the ones that matter —
> production code, highest risk first. It cut four hundred findings down to a
> thirty-item worklist, and the high-severity production issues down to a
> handful. This ninety-seven percent noise reduction is the whole point: we turn
> a scanner dump into a security analyst's shortlist."

---

## SCENE 6 — The agent validates against real code (40s)
[SCREEN: open `wm-sentinel-triage/PROMPT.md`, scroll it briefly, then open
`wm-sentinel-triage/ASSESSMENT.md` and scroll through the summary table showing
CONFIRMED vs FALSE_POSITIVE verdicts.]

> "Each finding is still just a hypothesis. So we hand the worklist to an
> application-aware agent that reads the actual code around every alert and
> decides: is this real, or a false positive? Here's its verdict table. Out of
> thirty, it confirmed the genuine issues and dismissed twenty-nine as false
> positives — each with a documented reason. That honesty matters. Most teams
> would have submitted those twenty-nine as 'vulnerabilities.' We proved they
> weren't."

---

## SCENE 7 — The findings & report (45s)
[SCREEN: open SECURITY-ASSESSMENT-REPORT.html (or the PDF). Scroll to the MEDIUM
finding (Section 5.1), then the LOW finding (Section 4.1). Show the CVSS, the
evidence block, and the remediation.]

> "A targeted review of the scope areas — authentication, authorization, API
> security, client-side, and data storage — confirmed the codebase is genuinely
> well-built. We reported two findings. A medium-severity access-control flaw:
> premium data that's supposed to be paid is actually reachable by anonymous
> users through a different endpoint. And a low-severity hardening issue: a
> container running as root. Each finding has a CVSS score, code-level evidence,
> a safe proof-of-concept, business impact, and a concrete fix — exactly the
> deliverable format the assessment required."

---

## SCENE 8 — PR security gate (optional, 30s)
[SCREEN: terminal. If you have the planted-bug branch, show:]
```bash
npm run cli -- github-comment ~/coding/worldmonitor --base main
```
[Show the gate FAILED output and the PR comment markdown.]

> "WM-Sentinel also plugs into pull requests. On every PR it scans only the
> changed files, compares against the base branch, and blocks the merge if new
> high-severity issues appear — posting a comment that tells the developer
> exactly what broke. Security moves left, into the workflow."

---

## SCENE 9 — The dashboard (40s)
[SCREEN: browser at http://localhost:3000. Walk through: the home dashboard with
the risk chart and lifecycle funnel → Findings list → click one Finding detail →
Evidence chain → Pull Requests page with the gate pill.]

> "Finally, the product vision: a dashboard that turns all of this into something
> a team lives in. A risk overview, the finding lifecycle from alert to confirmed
> to fixed to retested, and for each finding, its evidence chain — which scanners
> saw it, where, and why. This view is populated with representative data to show
> the experience; the real assessment we just ran lives in the report. The whole
> pipeline — CLI, API, and dashboard — is one system."

---

## SCENE 10 — Close (20s)
[SCREEN: back to the report title, or a closing slide with the key numbers.]

> "To sum up: five scanners, five hundred and ninety-four raw signals, correlated
> and triaged down to a two-finding evidence-backed report — including a real
> access-control flaw no single scanner caught. Scanners are sensors. WM-Sentinel
> is the brain. Thank you."

---

## RECORDING CHECKLIST (for Nikhil)

Before recording:
- [ ] Dashboard running: `cd /tmp/wm-frontend/frontend && npm run dev` → open http://localhost:3000
- [ ] Terminal font large (zoom in) — the voice-over PC and judges must read it
- [ ] `export PATH="$HOME/coding/CLI-SIMP/.tools/bin:$PATH"` in the recording terminal, so scanners are found
- [ ] PDF/HTML report open in a browser tab
- [ ] ASSESSMENT.md and PROMPT.md open in the editor
- [ ] Close Slack/email/personal tabs; clean desktop

Record order (each as its own clip): Scene 3 → 4 → 5 → 6 → 7 → 8 → 9. Record the
slide scenes (1, 2, 10) last or make them static slides.

Capture tips:
- For the scan (Scene 4) the spinners take ~30s — you can speed that clip up 2x
  in editing, or cut to the final summary.
- Pause 2 seconds on every result screen so the voice-over has room.
- If a command output is long, scroll slowly, don't jump.

Hand to teammate: this file + your screen recording. She reads each scene's lines
while that scene plays.
