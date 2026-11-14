# ASTRA project brief for Yash and Pawan

Research checked on 14 November 2026. This document distinguishes the selected challenge and event facts from our proposed implementation. ASTRA is a working product name; it has not been entered into the Space Apps project submission.

## 1. What you selected

**Create Health Monitoring Software for Astronauts on Space Missions** — 2026 NASA Space Apps Challenge. Difficulty: intermediate. Subjects: human exploration, software and space exploration.

- [Official challenge](https://www.spaceappschallenge.org/2026/challenges/health-monitoring-software/)
- [Your team: notttsSWE](https://www.spaceappschallenge.org/2026/find-a-team/notttsswe/)
- [London event](https://www.spaceappschallenge.org/2026/local-events/london-united-kingdom/)

The signed-in account's My Challenge menu and team About page both identify this challenge. The Members tab confirms Yash Kumar as owner and Pawan Krishnamoorthy (`pawankps`) as a team member. The London organisers' email confirms that the event is virtual. Pawan's GitHub account is separately identified as `pawankps44`, an existing collaborator on Yash's `3d-poseestimation` repository.

The initially attached Tirthan travel brochure is unrelated and is excluded from the application. Private email contents, contacts and the travel PDF are not included in Git.

## 2. What NASA is asking for

Create a visual tool that collects health indicators, helps astronauts understand their condition, and supports health assessment and improvement during space missions. The challenge allows manual input and other inputs such as camera images; it does not require sensors, image analysis or machine learning. Examples include scalar measurements and medical images.

NASA invites teams to explain why a measurement matters, how spaceflight changes its interpretation, and when the crew or ground medical team should review a result. Clear interfaces matter. The challenge suggests an interactive body figure, trends, color coding and routine prompts; these are optional design ideas rather than a required checklist. Different mission environments and gamification are also optional.

## 3. Our proposed product

**ASTRA: a daily health companion for crews far from Earth.**

The central experience is a short check-in followed by an understandable view of trends and mission context. A crew member should be able to answer: what did I record, what changed, which body system does this relate to, and what information should I share with the crew medical officer?

Example demo: an astronaut logs a fictional check-in after several disrupted nights. Sleep trends visibly change; a review label explains deviation from an illustrative baseline. The user explores recovery context, reviews routine tasks and exports a record for handover. The software does not infer a diagnosis from those readings.

## 4. Features and current status

| Feature          | First prototype                                      | Next iteration                                                    |
| ---------------- | ---------------------------------------------------- | ----------------------------------------------------------------- |
| Health dashboard | Five metrics, units and labelled example comparisons | Individually configured and clinically reviewed baseline policies |
| Check-in         | Validated manual entries                             | Measurement instructions and instrument provenance                |
| Trends           | Latest 14 entries; selectable metric                 | Individual ranges, missing-data and quality indicators            |
| Body explorer    | Four clickable markers and five system selectors     | More detailed anatomy with reviewed content                       |
| Routine          | Four session-based tasks                             | Mission schedules and persisted completion history                |
| History          | Source labels and record timestamps                  | Per-crew identity and editing with an audit trail                 |
| Handover         | Local JSON download                                  | Clinician-friendly report and secure delivery workflow            |
| Research         | Linked official NASA resources                       | Versioned, reviewed education cards                               |
| Persistence      | Browser localStorage                                 | Encrypted data storage and controlled access                      |
| Offline          | Local interactions after page load                   | Service worker, offline reload, sync conflict handling            |

A full treatment-guidance module remains future work and would need approved protocols and clinical review. The first build covers data capture, visualization and education; it does not fully implement every ambition of the challenge.

## 5. Science and data strategy

The official Resources tab lists:

1. [NASA: Five Hazards of Human Spaceflight](https://www.nasa.gov/hrp/hazards/).
2. [NASA: Risks of Human Spaceflight](https://www.nasa.gov/hrp/risks/).
3. [NASA: Ongoing HRP Research](https://www.nasa.gov/hrp/ongoing-hrp-research/).
4. [CSA: Monitoring Radiation for Astronaut Health](https://www.asc-csa.gc.ca/eng/news/articles/2026/2026-02-26-monitoring-radiation-astronaut-health.asp).
5. [CSA: Why Do We Conduct Science Experiments in Space?](https://www.asc-csa.gc.ca/eng/iss/science/why-do-we-conduct-science-experiments-in-space.asp).

The first three and the two CSA links were extracted from the challenge resource page. The NASA hazards page was also read directly. CSA content has not yet been independently reviewed; listing it here is a research lead, not a claim that it validates the implementation.

NASA groups spaceflight hazards into radiation, isolation/confinement, distance from Earth, gravity fields and hostile/closed environments. Its research discusses how those factors affect health and autonomy. The app uses this material as educational context. It does not derive clinical thresholds from those articles.

| Indicator          | Why include it in the prototype         | Data origin                          |
| ------------------ | --------------------------------------- | ------------------------------------ |
| Resting heart rate | Demonstrate cardiovascular trend review | Synthetic values / manual demo entry |
| Sleep duration     | Demonstrate recovery tracking           | Synthetic values / manual demo entry |
| Fluid intake       | Add daily nutrition context             | Synthetic values / manual demo entry |
| Exercise minutes   | Show routine adherence                  | Synthetic values / manual demo entry |
| Mood, 1–5          | Show a subjective check-in              | Synthetic values / manual demo entry |

These are our product choices, not a NASA-mandated measurement set. Exercise logging cannot measure bone loss; mood logging cannot diagnose a disorder; fluid totals cannot determine hydration status alone. Radiation measurements, ultrasound and biomarkers are outside this version. No live NASA patient-data API is assumed or required. Do not present invented readings as real NASA data.

### Illustrative comparison rules

For each metric, the prototype highlights the absolute difference from an invented baseline when it reaches the invented review delta:

| Metric             | Demo baseline | Review delta |
| ------------------ | ------------: | -----------: |
| Resting heart rate |        64 bpm |       12 bpm |
| Sleep              |       8 hours |    1.5 hours |
| Fluids             |    2.5 litres |   0.8 litres |
| Exercise           |   120 minutes |   45 minutes |
| Mood               |           4/5 |      1 point |

These symmetric rules exist to demonstrate interaction only. Both higher and lower values can trigger the same label; this is not a clinical severity model or a prescription for daily targets. Before real use, replace them with reviewed protocols that account for individual baselines, measurement conditions, duration, symptoms, quality and mission context.

## 6. Architecture

```text
Manual demo check-in -> validation -> React record state -> browser-local persistence
                                     |                  |
                                     v                  v
                              trends and log       JSON report export
                                     |
                                     v
                           linked NASA education
```

Current stack: React, Vite, CSS, SVG, localStorage and Node's built-in test runner. No backend, paid API, API key or cloud health database is needed to run the demo. Keep future authentication, medical protocols and sync behind explicit interfaces so the demonstration logic can be replaced without rewriting the UI.

Record fields: ID, ISO timestamp, five numeric readings and a synthetic flag. Export includes prototype status and a statement explaining the baseline policy. Storage limits are 1,000 records per browser. Session checklist state is separate from health records.

For a future operational design: separate crew profiles, individual baselines, measurement source and quality, access roles, encryption, audit logs, consent, approved escalation and store-and-forward communications. Such features require evaluated engineering and clinical workflows; their inclusion in a roadmap does not imply current capability.

## 7. Proposed division of work

This is a proposed split, not an agreement already made by Pawan.

| Yash                                   | Pawan                                             | Together                                  |
| -------------------------------------- | ------------------------------------------------- | ----------------------------------------- |
| Dashboard, forms and responsive design | Data model, measurement provenance and validation | Agree the user problem and demo narrative |
| Body explorer and interaction polish   | Research-backed education and comparison policy   | Review scientific claims and limitations  |
| Demo walkthrough and deployment        | Report format and integration testing             | Test the demo and final submission        |

The coding assistant has provided the first implementation so both team members can immediately review and improve it. Avoid editing the same source file simultaneously without coordination.

## 8. Work order before submission

1. Run this version and review every screen together.
2. Confirm the narrow scenario: daily check-in and handover for a long-duration crew.
3. Replace placeholder education with a few well-cited, reviewed measurement instructions.
4. Improve trend dates and source/quality labelling; add one convincing fictional scenario.
5. Test at phone and laptop widths, keyboard operation, invalid values, persistence and exports.
6. Deploy a judge-accessible demo and verify it in a signed-out browser. The GitHub repository is currently private; a private repo link alone will not give judges access.
7. Prepare a maximum seven-slide deck or a video of at most 30 seconds.
8. Complete the project page, attribution and AI-use disclosure; review the terms personally and submit before the event deadline.

Avoid expanding into an untested diagnostic chatbot, ultrasound interpretation, wearables or a radiation prediction system during the initial build. These are substantially larger validation problems.

## 9. Submission requirements and deadline

Sources: [official project submission guide](https://www.spaceappschallenge.org/resources/project-submission-guide/) and the London organisers' 14 November email, “NASA Space Apps Challenge 2026 - Good Luck!”.

- London deadline: **15 November 2026, 11:59 pm UK time**. The organisers explicitly confirmed this. Check the London event schedule for any earlier local presentation deadline.
- Provide project name, high-level summary, demo link, final-project link, detailed description, NASA resource use, other references and AI-use information.
- Use at least one NASA data source or resource for Global Award eligibility. Clearly describe how the NASA research informs the tool.
- Demo: up to seven slides including title/introduction, OR a video no longer than 30 seconds. Do not exceed these limits.
- Submission and linked materials must be in English; a non-English demo video needs English subtitles.
- Demo and project links must be publicly accessible without login or permission requests. The repository is private, so provide a public deployment or otherwise accessible artifact.
- Judging criteria: impact, creativity, validity, relevance and presentation.
- The guide asks for clear AI attribution, including code/data metadata. This prototype includes disclosure in README, this brief and its research screen. Team review of disclosure remains necessary.
- The guide excludes likenesses of persons under 18 from final projects and demos. Use the abstract body figure and fictional records.
- There is a distinction between saving progress and submitting for judging. The final submission requires agreement to terms and confirmation of originality. This work does not submit the NASA project or accept those terms for you.

The global guide permits edits and resubmission until the deadline, while the local email asks participants not to edit after submission. Safest workflow: finish, review and freeze the shared artifacts before submitting; consult the organisers if you need to change a submitted entry.

## 10. Draft pitch

ASTRA helps astronauts make sense of daily health observations when Earth is far away. A simple check-in becomes a clear view of trends, body-system context and routine adherence. Grounded in NASA Human Research Program resources, the prototype demonstrates how crews could prepare understandable health handovers. It uses fictional scenarios and transparent example comparisons; clinical decision support remains future work.

### Seven-slide outline

1. ASTRA — team notttsSWE; Yash and Pawan; selected challenge.
2. Problem — long missions need understandable crew health information.
3. User journey — check in, review, understand, hand over.
4. Working prototype — dashboard, trend and body explorer screenshots.
5. NASA foundation — exact HRP resources and how they inform education.
6. Technical approach — local data, validation, transparent rules and limitations.
7. Impact and next steps — reviewed protocols, secure records and operational evaluation.

### 30-second demo outline

- 0–4 seconds: introduce team, challenge and ASTRA.
- 4–10 seconds: enter a fictional check-in.
- 10–18 seconds: show a changed trend and body-system context.
- 18–24 seconds: review the routine and export a handover.
- 24–30 seconds: state NASA research use, synthetic-data boundary and intended benefit.

## 11. What remains unverified

Actual health-monitoring performance, clinical validity, usability with astronauts, instrument interoperability and secure operational deployment have not been established. No prize outcome is assumed. Review the latest challenge and event guidance before submission. The build is a functioning demonstration and a foundation for the team's own decisions and evaluation.
