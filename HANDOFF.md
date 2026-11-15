# ASTRA — project handoff

Updated 15 November 2026. Start here for the current project state. [NASA_PROJECT_CONTEXT.md](NASA_PROJECT_CONTEXT.md) contains the longer research history; its 14 November snapshot predates Pawan's work and accepted GitHub access.

## What this project is

ASTRA is a local, browser-based demonstration of astronaut health check-ins and crew medical handovers. It records five indicators, shows trends, and simulates a crew member → crew medical officer → ground flight surgeon workflow. It is a hackathon prototype with fictional data and illustrative health rules. It is not connected to NASA systems, real astronauts, sensors or a clinical service.

- **Challenge:** [Create Health Monitoring Software for Astronauts on Space Missions](https://www.spaceappschallenge.org/2026/challenges/health-monitoring-software/).
- **Team:** notttsSWE — Yash Kumar and Pawan Krishnamoorthy.
- **Event:** London virtual event, NASA Space Apps 2026.
- **Repository:** https://github.com/yashN1246826/nasa-app (private at the last repository check).
- **GitHub accounts:** Yash `yashN1246826`; Pawan `pawankps44`.
- **Pawan access:** accepted; write permission verified on 15 November.

## Latest user feedback — preserve this

Yash explicitly rejected the current result as generic “AI slop.” Do not describe the current design as polished, approved, or submission-ready. No redesign has been agreed or implemented since that feedback. The user then requested an explanation of the app and this handoff.

The next product pass needs a clear, useful astronaut workflow and a deliberate visual direction, rather than more decorative dashboard elements or feature accumulation. Ask for concrete feedback where needed, but do useful work without repeatedly asking for permission. Do not imply the current prototype has been accepted by the team.

## Branches, commits and PRs

| Work                                 | Branch / commit                                                                    | PR and base                                                                                                                             |
| ------------------------------------ | ---------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Original prototype and documentation | `yashN1246826/nasa-project-app-build`; implementation `8180c03`, context `6795334` | [#1 — YN](https://github.com/yashN1246826/nasa-app/pull/1) → `master`                                                                   |
| Pawan's combined version             | `pawan-crew-health-v2`; `e040831`                                                  | [#2 — ASTRA v2: crew health monitoring update](https://github.com/yashN1246826/nasa-app/pull/2) → `yashN1246826/nasa-project-app-build` |

Both PRs were open at this handoff check. Pawan's branch includes the original prototype and extends it; these are not two unrelated applications. PR #2 has not been merged into PR #1. `master` still contains the initial repository commit at the last branch inspection.

**Working rules:** keep changes on the feature branch and PR; do not push directly to `master` or `main`, rename the branch, merge PRs, or submit to NASA as an assumed consequence of documentation work. Keep PR #1 titled **YN**. Leave the primary workspace on `yashN1246826/nasa-project-app-build`.

## Contributions

The original implementation was generated with coding-assistant help on Yash's branch. Attribution should reflect that assistance.

| Original foundation on Yash's branch                           | Pawan's extension                                                                  |
| -------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Dark dashboard, responsive CSS and five health indicator cards | Five crew profiles plus demo medical-officer and ground roles                      |
| Manual daily check-in and numeric input validation             | Per-person baselines; direction-specific comparison rules                          |
| Trend charts, observation dates and history                    | Reading rechecks, daily aggregation and missed-day display                         |
| Clickable body-system explorer                                 | Illustrative readiness scores and sustained-change escalation                      |
| Session checklist                                              | Tasks saved per crew member and day; suggested countermeasures                     |
| Browser-local records and JSON export                          | Medical-officer triage, review notes, simulated downlink/uplink and acknowledgment |
| NASA education links, research brief and AI disclosure         | In-app handover reports, migration/repair and cross-tab merge logic                |
| Three automated tests                                          | Expanded suite of 41 tests                                                         |

## Run and inspect

Primary workspace:

```sh
cd /Users/yashkumar/conductor/workspaces/nasa-app/hanoi
npm ci
npm run dev -- --port 5173
```

Pawan's branch was checked out in an isolated, detached worktree so the main workspace's branch remains unchanged:

```sh
cd /Users/yashkumar/conductor/workspaces/nasa-app/hanoi/.context/pawan-preview
npm ci
npm test
npm run build
npm run preview -- --port 4174
```

If that worktree is missing in a future session, recreate it from the primary workspace:

```sh
git fetch origin
git worktree add --detach .context/pawan-preview origin/pawan-crew-health-v2
```

Always check for existing servers first and use the URL printed by Vite. A local URL does not mean a public deployment, and preview processes may stop between sessions.

| Preview                  | Address used during review |
| ------------------------ | -------------------------- |
| Original development app | http://127.0.0.1:5173/     |
| Combined development app | http://127.0.0.1:5174/     |
| Original built app       | http://127.0.0.1:4173/     |
| Combined built app       | http://127.0.0.1:4174/     |

### Combined demo walkthrough

1. Open the combined app and select **Crew 3** in **Viewing as**.
2. Review the fictional history of disrupted sleep, rising heart rate and the displayed review flags.
3. Select **Crew medical officer**. Inspect the crew priority table, select a crew member, and optionally save a fictional review note.
4. Click **Send report to ground**. This changes only the local simulation; it sends no external message.
5. Select **Ground flight surgeon** and inspect the received report. This view can enter a simulated recommendation.
6. Switch back to the medical officer to inspect/acknowledge recommendations, or select a crew member to record a fictional daily check-in.
7. Use the report/export controls to keep a local copy.

All roles share one browser's data. The selector is not login, authorization or secure access control. Cross-tab merging is not cross-device communication.

## Technical map

React 19, Vite 7, plain CSS/SVG and Node's built-in test runner. There is no backend or paid API requirement.

| File                           | Responsibility                                                                                                 |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| `src/main.jsx`                 | Interface, role selection, check-in/report dialogs and local state integration                                 |
| `src/health.js`                | Metrics, validation and example analysis; Pawan's branch adds crew scenarios, personal comparisons and scoring |
| `src/mission.js`               | Pawan's branch only: persisted mission state, review/report operations, migration/repair and merge functions   |
| `src/style.css`                | Shared visual foundation plus Pawan's role/report layouts                                                      |
| `tests/health.test.js`         | Reading and analysis checks                                                                                    |
| `tests/mission.test.js`        | Pawan's branch only: mission state, handovers and persistence checks                                           |
| `vite.config.js`               | Pawan's branch only: relative asset paths; this alone does not deploy to GitHub Pages                          |
| `.github/workflows/checks.yml` | Pull-request tests and production build                                                                        |

Original storage key: `astra-demo-v1`, maximum 1,000 records. Combined mission storage key: `astra-mission-v3`, with migration from older keys and a 5,000-record cap. Combined checklist key: `astra-checks-v1`. These are browser-local demonstration stores, not encrypted patient records.

## Verification completed

- Original: three tests and production build passed; browser checks covered fictional check-in, changed dashboard/trend, history, reload persistence and completed JSON download.
- Combined `e040831`: **41 tests and production build passed locally on 15 November**. Its GitHub `verify` check also passed.
- Combined browser checks: selected Crew 3, inspected escalation/readiness display, selected medical officer, inspected crew triage, clicked **Send report to ground**, then verified that the ground view displayed the report.
- Sending a ground recommendation and acknowledging it were covered by automated tests; those two actions were not manually exercised in this comparison session.
- Original Brave preview intermittently painted blank despite its content being present in the accessibility tree. The combined view rendered successfully. Do not represent the comparison session as a clean cross-browser validation of both apps.
- No formal accessibility audit, full mobile/device pass, clinical evaluation or security review has been completed.

Screenshots remain gitignored under `.context/`: `astra-dashboard.png` is the earlier verified original dashboard; `comparison-medical-officer.png`, `comparison-combined-crew.png` and `comparison-ground.png` document the combined review. `comparison-original.png` captured a blank preview and is not useful for a demo. Do not rely on these local paths existing in a fresh clone.

## Limits and specific review points

- All numerical rules, scenarios and readiness scores are illustrative. A passing test suite verifies programmed behavior, not clinical correctness.
- “Mission ready” is not a validated fitness determination. Revisit this label before presenting the app.
- Combined countermeasure copy includes specific advice such as an extra fluid quantity. These instructions are not backed by a reviewed protocol in this project; replace with sourced, qualified guidance or omit them.
- Personal baselines use up to seven earlier recorded days, not necessarily the last seven calendar days. Sustained-change logic counts successive recorded check-in days and does not itself enforce uninterrupted calendar days. Review the claims and edge cases.
- The rolling baseline may adapt during an ongoing change; evaluate whether that can hide the scenario the demo intends to surface.
- “Reset demo crew” is reported by Pawan as having no visible effect in the current demo. Resolve its purpose before relying on it in the demonstration.
- No authenticated accounts, backend, cloud sync, real telemetry, clinical diagnosis, validated treatment system or installed offline app is implemented.
- The project has not been publicly deployed or submitted to NASA by this assistant. Submission status has not been rechecked in the account during this handoff.

## Submission handoff

Submit through [notttsSWE's Project tab](https://www.spaceappschallenge.org/2026/find-a-team/notttsswe/?tab=project), not through a GitHub PR.

The [official submission guide](https://www.spaceappschallenge.org/resources/project-submission-guide/) and the previously read London organiser email give the deadline as **15 November 2026, 11:59 pm UK time**. This is the recorded event deadline, not a newly checked account status.

Before submitting:

- Agree the final scope and review the combined version; it is the stronger current candidate, but Yash has not approved the design.
- Resolve critical demo issues, review medical claims and decide which branch/commit is the final artifact.
- Supply a public app or accessible final-project artifact. The private repository and localhost links are insufficient for judges.
- Create a demo of at most **30 seconds** or at most **seven slides**, including introductory slides.
- Complete the project name, summary, detailed description, NASA resource use, references and AI-use disclosure. Cite the actual NASA material used; do not claim the synthetic records are NASA patient data.
- Keep submission materials in English; a non-English demo video needs English subtitles.
- Test every public link while signed out.
- Review originality and terms personally, then use **Submit for Judging**. Saving progress alone is not submission.

The global guide and local email differed on editing after submission; the recorded recommendation is to finish and freeze the artifacts first, and ask the organisers if changes are needed afterward.

## Research and supporting documents

- [NASA: Five Hazards of Human Spaceflight](https://www.nasa.gov/hrp/hazards/)
- [NASA: Risks of Human Spaceflight](https://www.nasa.gov/hrp/risks/)
- [NASA: Ongoing HRP Research](https://www.nasa.gov/hrp/ongoing-hrp-research/)
- [Challenge resources](https://www.spaceappschallenge.org/2026/challenges/health-monitoring-software/?tab=resources)
- [PROJECT_BRIEF.md](PROJECT_BRIEF.md): full initial research and proposed work split.
- [NASA_PROJECT_CONTEXT.md](NASA_PROJECT_CONTEXT.md): historical consolidated context; use this handoff for the newer branch and collaboration state.
- [BUILD_LOG.md](BUILD_LOG.md): initial build evidence.
- [README.md](README.md): original branch setup and behavior.

## Next-session priorities

1. Read the latest user feedback above; do not keep polishing a rejected design without clarifying its intended workflow.
2. Inspect both branches and any new commits before editing. Preserve unrelated user changes.
3. Agree a focused demonstration narrative with Yash and Pawan and review the listed analysis/medical-copy issues.
4. Improve the chosen workflow and visual direction, then verify the actual user journey, not just unit tests.
5. Update documentation to match the selected version, prepare accessible submission artifacts and keep all code changes off `master` unless separately authorized.
