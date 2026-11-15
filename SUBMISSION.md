# ASTRA — submission copy and public artifacts

Prepared 15 November 2026 for team **notttsSWE**. This file is submission material, not confirmation that the NASA form has been submitted or saved.

## Public links

- Project: https://github.com/yashN1246826/nasa-app/tree/yashN1246826/nasa-project-app-build
- Project demonstration: https://github.com/yashN1246826/nasa-app/blob/yashN1246826/nasa-project-app-build/docs/demo/README.md
- MP4 download: https://github.com/yashN1246826/nasa-app/raw/refs/heads/yashN1246826/nasa-project-app-build/docs/demo/astra-demo.mp4
- Demo length: **28 seconds**, including introduction/credits; 1920×1080 H.264 MP4 plus a GIF preview.

## Project name

ASTRA — Crew Health Operations

## Summary

ASTRA is a browser-based prototype that helps a space crew record daily health observations and prepare clear medical handovers. Crew members manually enter resting heart rate, sleep, fluid intake, exercise and mood. The app shows trends, flags changes under transparent demonstration rules and lets a crew medical officer save review notes. A simulated ground view receives a fixed report snapshot and returns recommendations for acknowledgment. NASA Human Research Program resources inform the educational context. Built by Yash Kumar and Pawan Krishnamoorthy, ASTRA demonstrates a review workflow for missions where communication may be delayed. All readings are fictional, communication is local, and the prototype makes no diagnosis or fitness-for-duty determination.

## Project details

ASTRA demonstrates a crew health check-in and medical handover workflow for long-duration space missions. Team notttsSWE: Yash Kumar and Pawan Krishnamoorthy.

Crew members manually record resting heart rate, sleep, fluid intake, exercise and mood. Calendar-spaced charts show trends and missing days; the history retains original entries, rechecks, timestamps and sources. Fictional scenarios demonstrate sustained changes and verification of unusual readings.

A crew medical officer reviews a priority queue and saves contextual notes. Sending a report creates a fixed snapshot. A simulated ground flight surgeon reviews that snapshot and returns a recommendation for acknowledgment. Later local changes do not alter an earlier report. This models store-and-forward review; no real spacecraft communications or cross-device transmission occurs.

NASA Human Research Program resources inform body-system education and mission context, including isolation, altered gravity and distance from Earth. They do not validate our numerical thresholds. Personal baselines use earlier recorded days; scores and review rules are illustrative.

Built with React, JavaScript, Vite, CSS, SVG and browser localStorage. Features include system light/dark appearance, responsive queue/detail navigation, labelled controls, chart descriptions and underlying tables, persistence and report export. All 47 automated tests and the production build pass.

The intended benefit is a clear record of observations and medical review context when communication is delayed. Operational use would require approved clinical protocols, instrument integration, authentication, encryption, secure communications and astronaut usability evaluation. This prototype has no real patient data, live telemetry, diagnosis, validated treatment advice or fitness-for-duty clearance.

AI/SI assisted research synthesis, code, synthetic scenarios, tests, interface design, documentation and preparation of the screenshot demo video. The demo carries a visible AI/SI disclosure. No generated NASA branding is used.

## AI/SI selections

- Ideation or Brainstorming
- Research or Information Gathering
- Coding, Debugging, or Troubleshooting
- Writing, Editing, or Translation
- Visual Design or Image Creation
- Presentation, Video, or Audio

There is no SI/ML model embedded in the application. The comparison rules are ordinary JavaScript functions.

## NASA Data fields

| Link Text                                                       | Link URL                                       |
| --------------------------------------------------------------- | ---------------------------------------------- |
| NASA Human Research Program — Five Hazards of Human Spaceflight | https://www.nasa.gov/hrp/hazards/              |
| NASA — Risks of Human Spaceflight                               | https://www.nasa.gov/hrp/risks/                |
| NASA — Ongoing Human Research Program Research                  | https://www.nasa.gov/hrp/ongoing-hrp-research/ |

These are educational sources. No NASA patient dataset is used. All scenarios and manual demonstration readings are fictional.

## Other resources and tools

| Link Text                                                                                          | Link URL                                                       |
| -------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| React and React DOM (MIT licence)                                                                  | https://react.dev/                                             |
| Vite build tooling (MIT licence)                                                                   | https://vite.dev/                                              |
| Node.js and its test runner                                                                        | https://nodejs.org/                                            |
| OpenAI Codex — AI assistance for research, code, synthetic scenarios, writing and demo preparation | https://openai.com/codex/                                      |
| Apple Human Interface Guidelines — web interface design reference                                  | https://developer.apple.com/design/human-interface-guidelines/ |
| FFmpeg — screenshot video encoding                                                                 | https://ffmpeg.org/                                            |
| GitHub — source hosting and collaboration                                                          | https://github.com/                                            |
| Prettier — source formatting                                                                       | https://prettier.io/                                           |

System fonts resolve from the viewer’s OS. Screenshots are of the team’s application. No external photographs, stock illustrations, generated NASA branding, music or voice recordings are included. See package-lock.json for dependency versions and respective upstream licences for dependencies.

## Submission verification

The form requires the team owner to agree to the submission requirements, Participant Terms and Conditions and Privacy Policy, and to confirm original work/resource attribution. During preparation, **Save Progress also required these boxes**. They were left unchecked. Review the filled content and these statements before accepting them; preparing this file or pushing the video does not submit the project.

Use the team Project tab: https://www.spaceappschallenge.org/2026/find-a-team/notttsswe/?tab=project
