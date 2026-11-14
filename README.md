# ASTRA — Crew Health

An astronaut health check-in and visualization prototype for **notttsSWE**, built for the 2026 NASA Space Apps challenge **Create Health Monitoring Software for Astronauts on Space Missions**.

Team: Yash Kumar and Pawan Krishnamoorthy. Challenge and membership were verified in the Space Apps account on 14 November 2026. This is an independent educational prototype with synthetic scenarios, not a NASA product or a clinical system.

## Run it

Use Node.js 20.19+ or 22.12+.

```sh
npm install
npm run dev
```

Open the local URL printed by Vite. Production build and checks:

```sh
npm test
npm run build
npm run preview
```

## What works

- Responsive dashboard showing five indicators: resting heart rate, sleep, fluid intake, exercise time and mood.
- Daily check-in with required fields, units and numeric range validation.
- Selectable trends for up to 14 readings, including an explicitly illustrative baseline.
- Clickable and keyboard-accessible body-system markers with NASA research context.
- Session-based daily routine checklist.
- Health log identifying synthetic and manually entered demonstration records separately.
- Browser-local persistence, validation of restored records and a JSON report download.
- Research screen linking the challenge and NASA Human Research Program sources.

All sample readings, baseline values and comparison rules are invented for demonstration. The app does not use real astronaut records or trained health models. Manual entries are local demonstration data. Please use fictional readings: browser storage is not encrypted medical storage. There is no server, account, live telemetry, automatic diagnosis, treatment recommendation, secure sync or operational alerting.

## Project documents

- [PROJECT_BRIEF.md](PROJECT_BRIEF.md): verified challenge, proposed product, features, NASA resources, architecture, responsibilities, roadmap, submission requirements and demo outline.
- [BUILD_LOG.md](BUILD_LOG.md): implemented scope, verification, known gaps and GitHub collaboration status.

## Implementation

React and Vite, with plain CSS and SVG. Runtime records stay in localStorage under `astra-demo-v1` (up to 1,000 entries). Checklist completion lasts only for the current session. Fonts load from Google Fonts when available; the system sans-serif fallback works without them. After the app loads, data handling is local; offline reload/install support is a future feature.

`src/health.js` contains record validation and illustrative comparison logic. `src/main.jsx` contains the interface, local persistence and JSON export. `src/style.css` defines responsive presentation. Tests cover invalid readings, missing-value handling and corrupted restored data.

## Research and attribution

NASA resources inform educational explanations, not numerical review thresholds:

- [Official challenge](https://www.spaceappschallenge.org/2026/challenges/health-monitoring-software/)
- [Challenge resources](https://www.spaceappschallenge.org/2026/challenges/health-monitoring-software/?tab=resources)
- [NASA: Five Hazards of Human Spaceflight](https://www.nasa.gov/hrp/hazards/)
- [NASA: Risks of Human Spaceflight](https://www.nasa.gov/hrp/risks/)
- [NASA: Ongoing HRP Research](https://www.nasa.gov/hrp/ongoing-hrp-research/)

AI assistance was used for research synthesis, source code, tests, interface design and documentation. No AI-generated NASA branding or raster artwork is included. Team members should review and understand all generated work before submission.
