import React, { useState } from "react";
import { Icon } from "./ui.jsx";
const sources = {
  Cardiovascular: {
    hazard: "Altered gravity",
    text: "Changing gravity affects the cardiovascular system. Track observations over time and discuss changes in context with the crew medical officer.",
  },
  Recovery: {
    hazard: "Isolation and confinement",
    text: "Record sleep duration and changes in routine. A single sleep measurement cannot establish a cause or a diagnosis.",
  },
  Nutrition: {
    hazard: "Hostile and closed environments",
    text: "Fluid intake is one observation, not a measurement of hydration status. Individual plans and medical protocols determine any intervention.",
  },
  Musculoskeletal: {
    hazard: "Altered gravity",
    text: "An exercise log records routine adherence. It does not measure bone density or diagnose muscle or bone loss.",
  },
  "Behavioral health": {
    hazard: "Isolation and confinement",
    text: "A subjective mood check-in provides context for conversation. A score alone cannot diagnose a behavioral health condition.",
  },
};
export function Research() {
  const [system, setSystem] = useState("Cardiovascular"),
    info = sources[system];
  return (
    <div className="research">
      <section className="research-intro">
        <p className="section-label">Purpose and evidence</p>
        <h2>Understand the observation</h2>
        <p>
          ASTRA demonstrates health logging and crew handovers for long-duration
          missions. NASA Human Research Program resources inform the educational
          context. The example comparison thresholds and scores are not derived
          from validated clinical protocols.
        </p>
        <a
          href="https://www.spaceappschallenge.org/2026/challenges/health-monitoring-software/"
          target="_blank"
          rel="noreferrer"
        >
          Official Space Apps challenge
          <Icon name="external" size={16} />
        </a>
      </section>
      <section className="body-education">
        <div>
          <p className="section-label">Body systems</p>
          <h2>Explore mission context</h2>
          <div
            className="system-selector"
            role="group"
            aria-label="Body system"
          >
            {Object.keys(sources).map((s) => (
              <button
                key={s}
                onClick={() => setSystem(s)}
                aria-pressed={s === system}
              >
                {s}
                <Icon name="chevron" size={16} />
              </button>
            ))}
          </div>
        </div>
        <div className="anatomy">
          <svg
            viewBox="0 0 180 260"
            role="img"
            aria-label="Abstract body figure with interactive system markers"
          >
            <circle cx="90" cy="36" r="24" />
            <path d="M63 72 Q90 60 117 72 L131 138 L113 145 L105 107 L108 175 L119 246 L98 246 L90 185 L82 246 L61 246 L72 175 L75 107 L67 145 L49 138 Z" />
            {[
              { s: "Behavioral health", x: 90, y: 35 },
              { s: "Cardiovascular", x: 94, y: 94 },
              { s: "Nutrition", x: 90, y: 138 },
              { s: "Musculoskeletal", x: 77, y: 204 },
            ].map((p) => (
              <g
                key={p.s}
                tabIndex="0"
                role="button"
                aria-label={"Explore " + p.s}
                aria-pressed={system === p.s}
                onClick={() => setSystem(p.s)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSystem(p.s);
                  }
                }}
              >
                <circle
                  className={
                    "body-marker " + (system === p.s ? "selected" : "")
                  }
                  cx={p.x}
                  cy={p.y}
                  r="12"
                />
              </g>
            ))}
          </svg>
        </div>
        <article className="system-context">
          <p className="section-label">{info.hazard}</p>
          <h2>{system}</h2>
          <p>{info.text}</p>
          <a
            href="https://www.nasa.gov/hrp/hazards/"
            target="_blank"
            rel="noreferrer"
          >
            Read NASA context
            <Icon name="external" size={16} />
          </a>
        </article>
      </section>
      <section className="reference-library">
        <h2>Reference library</h2>
        {[
          [
            "Five hazards of human spaceflight",
            "Radiation, isolation, distance, gravity and closed environments.",
            "https://www.nasa.gov/hrp/hazards/",
          ],
          [
            "Risks of human spaceflight",
            "Human Research Program overview and linked risk research.",
            "https://www.nasa.gov/hrp/risks/",
          ],
          [
            "Ongoing HRP research",
            "Current research context from NASA’s Human Research Program.",
            "https://www.nasa.gov/hrp/ongoing-hrp-research/",
          ],
        ].map(([title, text, url], i) => (
          <a key={url} href={url} target="_blank" rel="noreferrer">
            <span className="mono muted">0{i + 1}</span>
            <span>
              <strong>{title}</strong>
              <span className="muted">{text}</span>
            </span>
            <Icon name="external" />
          </a>
        ))}
      </section>
      <section className="prototype-boundaries">
        <h2>How to interpret this demonstration</h2>
        <p>
          Personal baselines use up to seven earlier recorded days. Sustained
          changes refer to recorded check-in days; they do not guarantee
          uninterrupted calendar days. All comparison rules and scores are
          illustrative, not assessments of fitness for duty.
        </p>
        <p>
          Role switching and ground communication are local simulations. There
          is no authentication, device connection, clinical validation or
          external transmission. AI assistance was used for research synthesis,
          code, tests and interface design. Typography uses the operating system
          font. Navigation and controls adapt applicable macOS design principles
          to the web; ASTRA is a React browser application.
        </p>
      </section>
    </div>
  );
}
