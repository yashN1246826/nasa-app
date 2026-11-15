# Build and verification log

## Delivered on 14 November 2026

- Identified the selected astronaut health monitoring challenge through the signed-in Space Apps account.
- Confirmed team notttsSWE, London event, Yash as owner and Pawan as member.
- Read the official challenge, resource links and submission guide in Chrome; checked the organisers' relevant emails.
- Implemented ASTRA in React/Vite: health dashboard, five-metric check-in, trend chart with scale and observation dates, body-system education, routine checklist, history, local persistence and JSON export.
- Added an accessible check-in dialog with required inputs, focus containment, Escape handling and inactive background content.
- Added research, implementation, responsibilities, limitations, submission requirements and demo outlines in PROJECT_BRIEF.md.
- Added README.md with setup and usage instructions and AI attribution.
- Added a pull-request workflow to run tests and a production build.

## Verification

- `npm test`: three tests pass for input validation, missing-value/review handling, and malformed restored records.
- `npm run build`: production bundle builds successfully.
- `git diff --check`: no whitespace errors at the time of review.
- Browser: inspected the rendered desktop dashboard in Chrome.
- Browser: entered fictional values (82 bpm, 5.5 hours, 2.3 litres, 90 exercise minutes and mood 3/5); saved successfully.
- Browser: observed the dashboard values and comparison labels change, and the trend gain an eighth point.
- Browser: observed the new row in the health history with the Manual demo source label.
- Browser: reloaded and verified that the fictional record persisted.
- Browser: exported JSON; Chrome reported `astra-crew-report.json`, 1,816 bytes, Done. macOS denied filesystem access to Downloads, so the downloaded JSON contents were not independently inspected.
- Review screenshots are kept in the gitignored `.context/` folder.

## GitHub collaboration

Pawan's account `pawankps44` was identified as an existing collaborator on `yashN1246826/3d-poseestimation`. A write-access invitation was created for `yashN1246826/nasa-app`, and the pending invitation was verified via GitHub API. Pawan must accept before access is active. No email or chat message was sent.

## Limits and remaining work

This is a functioning educational prototype. Clinical validation, actual astronaut data, device integration, secure multi-user storage, treatment guidance, offline reload and synchronization are not implemented. Example baselines and review deltas are invented demonstration values. Routine checkboxes reset on page reload. Font loading uses Google Fonts with local fallback.

Responsive CSS is implemented; a dedicated real-device/mobile test and a formal accessibility audit have not been completed. Keyboard and screen-reader semantics are included, but should receive further user testing. No NASA project submission or deployment has been performed. The repository remains private; the team must supply a publicly accessible demo for judges.

All source and project documents belong on the current feature branch and a PR against master. The target PR title is YN. No direct update to master is authorized or performed.

## 15 November 2026 — combined-v2 operations interface

Brought Pawan’s `e040831` source and 41 tests onto the existing feature branch without merging PR #2. Rebuilt crew, medical review and ground report layouts; added system typography, automatic OS appearance, collapsible navigation, accessible check-in/report dialogs, calendar-spaced charts and neutral review-task wording. The v2 mission data model is unchanged. Added appearance, contrast and fixed-snapshot tests: 47 tests and production build pass. Safari handover, live OS appearance and 200% zoom were checked. Chromium desktop/mobile CMO rendered, with later native automation issues limiting the remaining matrix. See [DESIGN_REVIEW.md](DESIGN_REVIEW.md) for evidence and outstanding manual checks. No deployment, merge or NASA submission.
