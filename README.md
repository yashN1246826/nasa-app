# ASTRA — Crew health operations

A React web demonstration for **notttsSWE** (Yash Kumar and Pawan Krishnamoorthy), built for the NASA Space Apps challenge [Create Health Monitoring Software for Astronauts on Space Missions](https://www.spaceappschallenge.org/2026/challenges/health-monitoring-software/).

Record fictional observations, review a crew queue, then simulate sending a fixed health summary to a ground flight surgeon. All roles and communication run locally in the browser.

## Run

Use Node.js 20.19+ or 22.12+.

```sh
npm ci
npm run dev
```

Open the URL printed by Vite. For production verification:

```sh
npm test
npm run build
npm run preview
```

## Try the workflow

1. Under **Demo role**, select Crew 3. Inspect its latest readings and sustained changes. Select a measurement row to change the chart; expand **View plotted observations** for the values.
2. Save a **Daily check-in** using fictional values. Repeat entries become rechecks; earlier entries remain in the health log.
3. Select **Crew medical officer**. Choose someone in the review queue, enter an inline note and **Save review**.
4. **Send report to ground**, then select **Ground flight surgeon**. Select a received snapshot and inspect its saved notes. Later crew edits do not alter it.
5. Send a simulated recommendation for the latest report. Return to the medical officer and **Acknowledge** it.
6. Use **Utilities** for JSON export, a handover report or refreshing the fictional scenario. Refreshing preserves manual records, notes and reports; it can leave values unchanged if the scenario is already current.

On a narrow screen, staff views start with their queue; selecting a row opens detail with a back control. The toolbar’s Show/Hide Sidebar button controls navigation. Appearance automatically follows the operating system, including changes while open. Legacy `astra-theme` overrides are ignored.

## Implementation and boundaries

React 19, Vite 7, CSS and SVG; no backend, component framework or external font requests. System typography and tabular numerals support a content-focused interface aligned with applicable macOS HIG principles. This is a web adaptation, with opaque surfaces and ASTRA-specific colors and dimensions.

- `src/health.js`: Pawan’s comparisons, personal baselines, rechecks, cadence, scores and crew scenarios. Suggested actions now use neutral review wording.
- `src/mission.js`: unchanged v2 state model, migrations, repair, storage probing, cross-tab merging, reviews and fixed downlink/uplink records.
- `src/main.jsx`: role workflows, persistence, exports and application shell.
- `src/ui.jsx`: check-in dialog, measurement list and calendar-spaced chart.
- `src/research.jsx`: body-system exploration and NASA resource context.
- `public/theme-init.js`: system appearance initialization; CSS also follows `prefers-color-scheme` before paint.
- `tests/`: 47 checks covering the inherited data behavior, snapshot immutability, appearance and semantic color contrast.

Mission state uses `astra-mission-v3` (5,000-record cap), migrating older keys including `astra-demo-v1`. Routine completion uses `astra-checks-v1`, per crew member and UTC day. Browser storage is not encrypted patient storage. Use fictional readings only. Different localhost ports and browser profiles have separate storage.

Scores, thresholds and scenarios are illustrative. “No flags under demo rules” is not a fitness determination. There is no authentication, real telemetry, medical diagnosis, clinical validation, external transmission, cross-device sync or installed offline application.

## Documentation

- [HANDOFF.md](HANDOFF.md): current version, contributions, GitHub state, usage and submission handoff.
- [DESIGN_REVIEW.md](DESIGN_REVIEW.md): redesign decisions, HIG references, verified checks, screenshots and remaining manual verification.
- [NASA_PROJECT_CONTEXT.md](NASA_PROJECT_CONTEXT.md): historical account research and project context.
- [PROJECT_BRIEF.md](PROJECT_BRIEF.md): original challenge research and proposal.
- [BUILD_LOG.md](BUILD_LOG.md): implementation history.

## Sources and attribution

NASA resources inform educational context, not numerical thresholds:

- [NASA Human Research Program: Five Hazards](https://www.nasa.gov/hrp/hazards/)
- [NASA: Risks of Human Spaceflight](https://www.nasa.gov/hrp/risks/)
- [NASA: Ongoing HRP Research](https://www.nasa.gov/hrp/ongoing-hrp-research/)
- [Challenge resources](https://www.spaceappschallenge.org/2026/challenges/health-monitoring-software/?tab=resources)

AI assistance was used for research synthesis, code, tests, interface design and documentation. No real astronaut records, trained health models or AI-generated NASA branding are included. Review the demonstration and claims before presenting it.
