# ASTRA — current handoff

Updated 15 November 2026 after the combined-v2 redesign. This file supersedes the older design/status descriptions in the historical context documents. See [DESIGN_REVIEW.md](DESIGN_REVIEW.md) for evidence and remaining manual checks.

## Submission artifacts update

The repository is now public. A 28-second MP4 and GIF walkthrough are in [docs/demo](docs/demo/README.md); [SUBMISSION.md](SUBMISSION.md) contains public links, form copy and attribution. The project form has been filled as part of submission preparation, but its terms/original-work confirmations are left to the owner. The site required those confirmations even to save progress. No NASA submission has been completed by this assistant.

## What we made

ASTRA demonstrates an astronaut health check-in → crew medical officer → ground flight surgeon handover. Five fictional crew members have resting heart rate, sleep duration, fluid intake, exercise time and mood observations. The app compares recorded days with illustrative personal baselines, highlights changes, retains rechecks and simulates fixed reports and replies.

It runs entirely in a browser. There are no real astronaut records, sensors, authenticated roles, clinical validation, NASA integration, backend or external transmission. Role switching is a demonstration control, not access control. Scores are labelled “Demo comparison score”; “No flags under demo rules” is not fitness clearance.

## Project and contributors

- Team **notttsSWE**: Yash Kumar and Pawan Krishnamoorthy; London virtual Space Apps event.
- Challenge: [Create Health Monitoring Software for Astronauts on Space Missions](https://www.spaceappschallenge.org/2026/challenges/health-monitoring-software/).
- Repository: https://github.com/yashN1246826/nasa-app — public, verified without authentication on 15 November 2026.
- Yash: `yashN1246826`. Pawan: `pawankps44`; accepted collaborator with write access at the earlier 15 November check.
- Original Yash-branch prototype: `8180c03`; context documentation `6795334`; earlier handoff `4c396f9`. Research, implementation and documentation used AI assistance.
- Pawan’s v2: `e040831`, branch `pawan-crew-health-v2`, [PR #2](https://github.com/yashN1246826/nasa-app/pull/2), based on our feature branch. It added multi-crew roles, personal baselines, verification/rechecks, scoring, review notes, local downlink/uplink, migrations and merge logic, plus 41 tests.
- This pass copied the combined-v2 source and tests onto the existing feature branch, then rebuilt the interface. It did **not** merge PR #2. Pawan’s data model is unchanged; five suggested-action strings now use neutral review wording. The complete original v2 test suite is retained.

Current branch: `yashN1246826/nasa-project-app-build`. Existing [PR #1 — YN](https://github.com/yashN1246826/nasa-app/pull/1) targets `master` and receives this update. Do not rename the branch, push to master/main, merge either PR, deploy or submit to NASA without a separate instruction. Because v2 source was copied rather than merged, review PR #2’s overlap before any future merge.

## User direction and resulting design

Yash rejected the original design as generic “AI slop.” Two subsequent implementation prompts requested a more useful operations console and then alignment with applicable macOS HIG principles. Those directions are implemented, but the new result has not been approved by Yash.

The crew screen has identity/status/action first, five measurement rows and one trend. The medical officer has a priority queue, selected crew detail and inline review. Ground shows received snapshots, saved review notes and simulated replies. Scores are secondary. Research/body-system exploration is separate. There is a collapsible sidebar, compact toolbar, system typography and automatic OS appearance. Opaque surfaces and custom colors/radii are deliberate web adaptations; no native/Apple-certified claim is made.

## Run and use it

```sh
cd /Users/yashkumar/conductor/workspaces/nasa-app/hanoi
npm ci
npm run dev -- --port 5180
```

Use the actual URL printed by Vite; the reviewed development address was `http://127.0.0.1:5180/`. Local servers may stop between sessions. Different ports have different browser storage. This is not a public deployment.

1. Choose **Crew 3** under **Demo role**. Select an indicator to inspect its trend and underlying values. Record a fictional check-in; another reading that day is a recheck.
2. Choose **Crew medical officer**. Pick someone from the queue, enter a note and **Save review**.
3. **Send report to ground**. Choose **Ground flight surgeon**, select the snapshot and read its saved contents.
4. Send a simulated recommendation, then return to the medical officer and **Acknowledge** it.
5. Crew/medical Utilities offer JSON export and handover text. The report dialog offers Copy and Export report.
6. Refresh fictional scenario regenerates synthetic history for today while retaining manual entries, notes and reports. It can leave the values unchanged when already current.

Below 768px, staff views start with the queue and open a separate detail view with a back control. The toolbar button shows/hides navigation. Change the OS appearance to change the theme; there is no independent theme picker.

## Data and code map

React 19, Vite 7, plain CSS/SVG, Node tests. No added framework, backend or external font dependency.

| File                           | Responsibility                                                                                  |
| ------------------------------ | ----------------------------------------------------------------------------------------------- |
| `src/main.jsx`                 | Application shell, roles, state integration, review/report workflows, history and exports       |
| `src/ui.jsx`                   | Check-in dialog, compact measurements, accessible chart and underlying table                    |
| `src/research.jsx`             | Body-system explorer, NASA sources and prototype boundaries                                     |
| `src/health.js`                | v2 analysis/scenarios; neutral review-task copy                                                 |
| `src/mission.js`               | Unchanged v2 persistence, migrations/repair, merges, reports/recommendations/acknowledgment     |
| `src/style.css`                | Semantic light/dark themes, system typography, responsive layouts and accessibility preferences |
| `public/theme-init.js`         | OS appearance initialization and live change listener, without storage access                   |
| `tests/`                       | 47 passing tests: original 41 plus appearance, contrast and snapshot regression                 |
| `.github/workflows/checks.yml` | PR tests and production build                                                                   |

Mission key: `astra-mission-v3`, 5,000-record cap, with older-key migration. Checklist key: `astra-checks-v1`, per crew/day. Existing `astra-theme` overrides are ignored and left untouched. Browser storage is local demonstration storage, not encrypted patient storage. Cross-tab merging is not communication between computers.

Baselines use up to seven earlier **recorded days**, excluding unverified values; five earlier days are needed for a personal baseline. Sustained changes count recorded check-in days, not guaranteed uninterrupted calendar days. These calculations and all thresholds remain illustrative.

## Verification and limits

**47 tests and production build pass.** Safari checks completed check-in, reload persistence, review → fixed report → recommendation → acknowledgment. All three roles were inspected in light/dark, live OS switching was checked, and Safari explicitly confirmed 200% zoom. The original Light system appearance and 100% browser zoom were restored.

Chromium rendered the desktop crew/CMO and 390×844 CMO queue/detail. Later native automation became unreliable and intermittently painted blank. VoiceOver, a fully keyboard-only review submission, exact 1024×768 verification and a clean mobile crew capture remain outstanding. Full details and local screenshot filenames are in [DESIGN_REVIEW.md](DESIGN_REVIEW.md). Do not claim a complete accessibility/device audit or team approval.

## Where to submit

Submit through [notttsSWE’s Project tab](https://www.spaceappschallenge.org/2026/find-a-team/notttsswe/?tab=project), not through a GitHub PR.

The previously inspected organiser email and [submission guide](https://www.spaceappschallenge.org/resources/project-submission-guide/) recorded **15 November 2026, 23:59 UK time**. This is a recorded deadline, not a fresh verification of account/submission status.

Remaining submission work: team review, final public artifact/app links, a demo of at most 30 seconds or seven slides, English project summary/details, actual NASA references, AI-use disclosure and signed-out link checks. The repository is public; localhost remains unavailable to judges. The form explicitly accepts a public code repository as the project artifact. A team member must review the submission terms and complete Submit for Judging; saving a draft is not submission. This assistant has not deployed or submitted the project.

## Supporting context

[README.md](README.md) is the quick start. [NASA_PROJECT_CONTEXT.md](NASA_PROJECT_CONTEXT.md), [PROJECT_BRIEF.md](PROJECT_BRIEF.md) and earlier [BUILD_LOG.md](BUILD_LOG.md) sections preserve the original account research/proposal and history; older current-state claims in them should be read with this update.

The detached `.context/pawan-preview` worktree remains available for comparison with Pawan’s original `e040831`. Screenshots under `.context/` are local and gitignored. The originally attached travel brochure was unrelated to the NASA challenge.
