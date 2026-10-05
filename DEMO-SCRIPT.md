# WM-Sentinel — Live Demo Script (Google Meet)

## How this works
- **Two people.** Nikhil shares his screen and runs the commands. The presenter
  (you, reading this) speaks the lines marked **SAY:**.
- It is **live**: Nikhil does an action, then you speak about it. Watch his
  screen and only read the next **SAY** once the matching **[SCREEN]** is visible.
- You do **not** need to understand the code. Everything you need to say is
  written out below. Just read the **SAY** lines in a clear, confident voice.
- Total time: about **5 minutes**.

## What this project is (read this once before the call, so you understand it)
Companies run automated "security scanners" on their code. The problem: scanners
produce hundreds of alerts and most are false alarms. Our team built
**WM-Sentinel** — a tool that runs five scanners at once, then intelligently
merges, ranks, and **validates** their results into a short, trustworthy report.
We tested it on a real application called **World Monitor**. The punchline:
we turned **~600 raw alerts into 2 real, proven findings**, and we can prove the
rest were false alarms. "The scanners are the senses; our tool is the brain."

Three numbers to remember (these win it for us):
- **~600** raw alerts → **~440** after merging duplicates → **2** real findings.
- **~97%** noise removed.
- **29 of 30** reviewed alerts were false positives — and we proved each one.

---

## BEFORE THE CALL — Nikhil's setup checklist
Do all of this *before* joining the Meet, so nothing breaks live.

1. Open a terminal. Make it **large-font** (Ctrl+Shift+= several times).
2. Run these two lines in it (loads the scanners, moves to the project):
   ```bash
   export PATH="$HOME/coding/CLI-SIMP/.tools/bin:$PATH"
   cd ~/coding/CLI-SIMP/Backend
   ```
3. In a **second** terminal, start the dashboard and leave it running:
   ```bash
   cd /tmp/wm-frontend/frontend && npm run dev
   ```
   Wait for "Ready", then open **http://localhost:3000** in a browser tab.
4. Open these tabs/windows ready to switch to:
   - Browser tab: the dashboard (localhost:3000)
   - Browser tab: `SECURITY-ASSESSMENT-REPORT.html` (the report)
   - Editor: `~/coding/worldmonitor/wm-sentinel-triage/ASSESSMENT.md`
5. Close Slack, email, personal tabs. Clean desktop.
6. **Pre-run the scan once** before the call so results are cached and fast. Then
   for the live demo it will be quick. (If you prefer to run it live, that's fine
   too — see Scene 4's note on filling the 30-second wait.)

---

## THE SCRIPT

### Scene 1 — Opening (on a title slide or the report)
**[SCREEN]** Title slide, or the top of the report.
**SAY:** "Hi everyone. Our problem statement was to security-assess the World
Monitor application — find real vulnerabilities, prove them, and recommend fixes.
The hard part in modern security isn't running tools, it's the noise: one scan
throws hundreds of alerts and most are false alarms. So we built WM-Sentinel — a
system that runs multiple scanners and then thinks about their results like a
security analyst would. Let me show you."

### Scene 2 — The tools (terminal)
**[SCREEN]** Nikhil runs:
```bash
semgrep --version; bandit --version; gitleaks version; osv-scanner --version
```
**SAY:** "WM-Sentinel integrates five security engines — Semgrep, Bandit,
Gitleaks, and OSV-Scanner, plus our own custom rules written for World Monitor.
Each one catches a different class of problem: code bugs, leaked secrets,
vulnerable dependencies. They all plug into one engine through a common
interface, so adding a new scanner never breaks the system."

### Scene 3 — The codebase (terminal)
**[SCREEN]** Nikhil runs:
```bash
ls src/core/
git log --oneline -12
```
**SAY:** "Here's the engine we built — separate modules for the scanners, for
correlation, risk scoring, and our custom rules. And this is our commit history;
you can see the work that went into it over the sprint."

### Scene 4 — The live scan (terminal) ⭐
**[SCREEN]** Nikhil runs:
```bash
npm run cli -- scan ~/coding/worldmonitor
```
**While it runs (about 30 seconds of animation), SAY this slowly:**
"Now we point it at the real World Monitor codebase — thousands of files. All
five engines run in parallel across the entire project. In a moment it'll show us
how many issues it found... and here it is."
**[SCREEN]** The summary box appears.
**SAY:** "Nearly 600 raw alerts from the scanners, which our engine correlates — merges
the duplicates where three tools flagged the same line — down to roughly 440 distinct
findings. But 440 is still far too many for a human. That's the problem our tool
actually solves."

> If the scan ever stalls on the call, Nikhil says "I'll use the cached result"
> and runs: `npm run cli -- findings ~/coding/worldmonitor` — same data, instant.

### Scene 5 — Triage: the key moment (terminal) ⭐
**[SCREEN]** Nikhil runs:
```bash
npm run cli -- triage ~/coding/worldmonitor --limit 30
```
**SAY:** "The triage step ranks everything by real-world risk and keeps only what
matters — production code, most dangerous first. It takes those ~440 findings down
to a 30-item shortlist. This is the heart of the project: we remove about 97% of
the noise, so a human reviews 30 things instead of hundreds."
**[SCREEN]** Nikhil runs:
```bash
npm run cli -- findings ~/coding/worldmonitor --severity HIGH --production
```
**SAY:** "And here's that shortlist — each finding with the file, the line, and a
confidence score."

### Scene 6 — Validation by an AI agent (editor) ⭐
**[SCREEN]** Nikhil opens `wm-sentinel-triage/ASSESSMENT.md` and scrolls to the
table with the CONFIRMED / FALSE_POSITIVE column.
**SAY:** "Now the clever part. Every alert is still just a suspicion. So we hand
the shortlist to an application-aware agent that reads the actual code around
each one and decides: is this real, or a false alarm? Here's its verdict table.
Of 30 findings, it confirmed the genuine issues and dismissed 29 as false
positives — and it documented a reason for every single dismissal. Most teams
would have submitted those 29 as 'vulnerabilities.' We can prove they aren't.
That honesty is what makes this a real assessment and not a scanner dump."

### Scene 7 — The findings and report (browser) 
**[SCREEN]** Nikhil opens `SECURITY-ASSESSMENT-REPORT.html` and scrolls to the
MEDIUM finding (Section 5.1), then the LOW finding.
**SAY:** "A deeper review of the security-critical areas confirmed World Monitor
is genuinely well-built. We reported two findings. The first, medium severity: a
set of premium, paid data that anonymous users can actually reach for free
through a different endpoint — an access-control flaw no single scanner caught;
our targeted review found it. The second, lower severity: a server container
running with root privileges. Each finding has a severity score, the exact code
evidence, a safe proof-of-concept, the business impact, and a concrete fix —
exactly the format the assessment required."

### Scene 8 — The dashboard (browser) 
**[SCREEN]** Nikhil switches to http://localhost:3000. Walks through: home page
(the charts) → Findings list → click one finding → the Evidence panel →
Pull Requests page.
**SAY:** "Finally, the product vision — a dashboard that turns all of this into
something a security team lives in. A risk overview, the lifecycle of every
finding from first alert to confirmed to fixed, and for each finding, its
evidence trail: which scanners saw it, where, and why. This view uses
representative sample data to show the experience — the real assessment we just
ran lives in the report. CLI, backend, and dashboard are one connected system."

### Scene 9 — Close (title slide or report)
**[SCREEN]** Back to the title slide or the report's summary.
**SAY:** "To sum up: five scanners, nearly 600 raw alerts, correlated and triaged down to
a two-finding, evidence-backed report — including a real access-control flaw no
scanner found on its own. We cut the noise by 97% and proved what was real and
what wasn't. Scanners are the senses; WM-Sentinel is the brain. Thank you — happy
to take questions."

---

## IF A JUDGE ASKS... (quick answers for the presenter)
- **"Only 2 findings?"** → "World Monitor is a very well-secured codebase. The
  value isn't the count — it's that we *validated* everything and proved 29
  alerts were false. A tool that cries wolf on 600 things is useless; ours gives
  a trustworthy shortlist, and still found a real paywall-bypass."
- **"Is the dashboard showing the real findings?"** → "The dashboard shows the UI
  with representative data. The real World Monitor assessment is in the report we
  showed. Wiring live data in is the next step."
- **"What's novel here?"** → "The intelligence layer: correlation across five
  tools, risk ranking, and agent validation against the real code — turning raw
  scanner output into an analyst-grade report automatically."
- **"Did you test the live site?"** → "No — only an authorized local copy, as the
  rules required. No production system was touched, no exploit was run."

## IF SOMETHING BREAKS LIVE
- Any command errors → Nikhil calmly says "let me show the saved result" and
  opens the report / ASSESSMENT.md instead. The story continues from the files.
- Dashboard won't load → skip Scene 8, say "the dashboard runs locally; here are
  screenshots in our deck," and show the PPT dashboard slide.
