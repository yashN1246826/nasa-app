import React, { useState, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import {
  metrics,
  validateReading,
  assess,
  makeDemo,
  validRecords,
} from "./health";
import "./style.css";
const STORE = "astra-demo-v1";
const tasks = [
  "Complete daily health check-in",
  "Log prescribed exercise routine",
  "Review sleep and recovery",
  "Prepare crew medical handover",
];
const systems = {
  Cardiovascular: {
    icon: "♡",
    hazard: "Altered gravity",
    text: "Changing gravity affects the cardiovascular system. Track measurements over time and review changes in context with the crew medical officer.",
    link: "https://www.nasa.gov/hrp/hazards/",
  },
  Recovery: {
    icon: "☾",
    hazard: "Isolation & confinement",
    text: "Sleep and behavioral health matter during long missions. Record rest and subjective wellbeing, and compare changes with your usual routine.",
    link: "https://www.nasa.gov/hrp/hazards/",
  },
  Nutrition: {
    icon: "◉",
    hazard: "Hostile / closed environments",
    text: "Nutrition and fluid intake are useful context for a daily check-in. Individual plans and medical guidance should determine any intervention.",
    link: "https://www.nasa.gov/hrp/risks/",
  },
  Musculoskeletal: {
    icon: "⌁",
    hazard: "Altered gravity",
    text: "Muscles and bones adapt to altered gravity. Exercise logs document routine adherence; they do not measure bone density or diagnose bone loss.",
    link: "https://www.nasa.gov/hrp/hazards/",
  },
  "Behavioral health": {
    icon: "✧",
    hazard: "Isolation & confinement",
    text: "A short mood check-in can make changes easier to discuss. A mood score alone cannot diagnose a behavioral health condition.",
    link: "https://www.nasa.gov/hrp/hazards/",
  },
};
function readSaved() {
  try {
    const r = JSON.parse(localStorage.getItem(STORE));
    return validRecords(r) ? r : makeDemo();
  } catch {
    return makeDemo();
  }
}
function App() {
  const [records, setRecords] = useState(readSaved),
    [view, setView] = useState("Overview"),
    [system, setSystem] = useState("Cardiovascular"),
    [metric, setMetric] = useState("pulse"),
    [checks, setChecks] = useState([]),
    [notice, setNotice] = useState(""),
    [form, setForm] = useState(null);
  const modalRef = useRef(null),
    openerRef = useRef(null);
  useEffect(() => {
    if (!form) return;
    const before = openerRef.current;
    const onKey = (e) => {
      if (e.key === "Escape") {
        setForm(null);
        return;
      }
      if (e.key === "Tab") {
        const items = modalRef.current?.querySelectorAll("button,input");
        if (!items?.length) return;
        const first = items[0],
          last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      before?.focus();
    };
  }, [Boolean(form)]);
  const latest = records.at(-1),
    selected = metrics.find((m) => m.id === metric),
    info = systems[system];
  function persist(next) {
    setRecords(next);
    try {
      localStorage.setItem(STORE, JSON.stringify(next));
      setNotice("Saved on this device.");
    } catch {
      setNotice(
        "Browser storage unavailable. This session is in memory; export before closing.",
      );
    }
  }
  function save(e) {
    e.preventDefault();
    const error = validateReading(form);
    if (error) {
      setNotice(error);
      return;
    }
    persist(
      [
        ...records,
        {
          ...Object.fromEntries(metrics.map((m) => [m.id, Number(form[m.id])])),
          id: crypto.randomUUID(),
          at: new Date().toISOString(),
          synthetic: false,
        },
      ].slice(-1000),
    );
    setForm(null);
  }
  function exportReport() {
    const data = {
      project: "ASTRA Crew Health",
      prototype: true,
      exportedAt: new Date().toISOString(),
      baselinePolicy:
        "Illustrative demo comparisons, not validated clinical thresholds",
      records,
    };
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "astra-crew-report.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice("Report exported.");
  }
  const values = records.slice(-14).map((r) => r[selected.id]);
  const low = Math.min(...values, selected.baseline) - 1,
    high = Math.max(...values, selected.baseline) + 1;
  const points = values
    .map(
      (v, i) =>
        `${40 + (i * 700) / Math.max(1, values.length - 1)},${160 - ((v - low) / (high - low)) * 120}`,
    )
    .join(" ");
  return (
    <div className="shell">
      <aside inert={form ? true : undefined}>
        <a className="brand" href="#" onClick={() => setView("Overview")}>
          <span className="logo">✳</span> ASTRA
          <span className="brand-sub">CREW HEALTH SYSTEMS</span>
        </a>
        <div className="mission">
          <span className="dot" /> MISSION SIMULATION
          <big>
            Beyond Earth.
            <br />
            Within reach.
          </big>
          <small>Habitat A · Demonstration crew</small>
        </div>
        <p className="nav-label">WORKSPACE</p>
        <nav>
          {["Overview", "Health log", "Research & mission"].map((v, i) => (
            <button
              key={v}
              className={view === v ? "active" : ""}
              onClick={() => setView(v)}
            >
              <span>{["⊞", "⌁", "◎"][i]}</span>
              {v}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <span className="avatar">NS</span>
          <div>
            notttsSWE<small>NASA Space Apps 2026</small>
          </div>
          <span className="dot" />
        </div>
      </aside>
      <main inert={form ? true : undefined}>
        <header>
          <span>
            CREW OPERATIONS <b>/ {view.toUpperCase()}</b>
          </span>
          <div>
            <span className="dot" /> LOCAL DEMO{" "}
            <span className="profile">NS</span>
          </div>
        </header>
        <div className="content">
          <div className="heading">
            <div>
              <p className="eyebrow">HUMAN EXPLORATION · HEALTH MONITORING</p>
              <h1>
                {view === "Overview"
                  ? "A healthier journey."
                  : view === "Health log"
                    ? "Every check-in counts."
                    : "Built on space research."}
              </h1>
              <p className="muted">
                {view === "Overview"
                  ? "Your daily perspective on crew health, recovery and readiness."
                  : "A mission companion for Yash, Pawan and team notttsSWE."}
              </p>
            </div>
            <button
              className="primary"
              onClick={() => {
                openerRef.current = document.activeElement;
                setNotice("");
                setForm(Object.fromEntries(metrics.map((m) => [m.id, ""])));
              }}
            >
              ＋ Daily check-in
            </button>
          </div>
          <div className="demo-banner">
            <span>◇</span>
            <div>
              <strong>Exploration starts with a simulation.</strong> Synthetic
              sample readings · illustrative baselines · educational prototype,
              not medical advice.
            </div>
            <button onClick={exportReport}>Export report ↗</button>
          </div>
          {notice && (
            <p className="notice" role="status">
              {notice}
            </p>
          )}
          {view === "Overview" && (
            <>
              <section className="metrics">
                {metrics.map((m) => (
                  <button
                    key={m.id}
                    className={"metric " + (metric === m.id ? "selected" : "")}
                    onClick={() => {
                      setMetric(m.id);
                      setSystem(m.system);
                    }}
                  >
                    <span className="metric-title">
                      {m.name}
                      <span>{systems[m.system].icon}</span>
                    </span>
                    <div className="value">
                      {latest?.[m.id] ?? "—"} <small>{m.unit}</small>
                    </div>
                    <span
                      className={
                        "status " +
                        (assess(m, latest?.[m.id]) === "Review change"
                          ? "review"
                          : "")
                      }
                    >
                      {assess(m, latest?.[m.id])}
                    </span>
                    <svg viewBox="0 0 180 25" aria-hidden="true">
                      <polyline
                        points={records
                          .slice(-7)
                          .map(
                            (r, i) =>
                              `${i * 30},${22 - ((r[m.id] - m.min) / (m.max - m.min)) * 20}`,
                          )
                          .join(" ")}
                      />
                    </svg>
                  </button>
                ))}
              </section>
              <div className="dashboard-grid">
                <section className="panel trends">
                  <div className="panel-title">
                    <div>
                      <p className="eyebrow">THE BIGGER PICTURE</p>
                      <h2>Health trends</h2>
                    </div>
                    <span className="chip">
                      Last {Math.min(14, records.length)} readings
                    </span>
                  </div>
                  <div className="chart-select">
                    {metrics.map((m) => (
                      <button
                        key={m.id}
                        className={metric === m.id ? "active" : ""}
                        onClick={() => setMetric(m.id)}
                      >
                        {m.name.split(" ").slice(0, 2).join(" ")}
                      </button>
                    ))}
                  </div>
                  <div className="chart">
                    <div className="chart-label">
                      {selected.name} <span>({selected.unit})</span>
                    </div>
                    <svg
                      viewBox="0 0 780 200"
                      role="img"
                      aria-label={`${selected.name}: ${values.join(", ")} ${selected.unit}. Readings in recorded order.`}
                    >
                      {[40, 80, 120, 160].map((y) => (
                        <g key={y}>
                          <text x="2" y={y + 4} fill="#91a0b1" fontSize="10">
                            {(low + ((160 - y) / 120) * (high - low)).toFixed(
                              selected.step < 1 ? 1 : 0,
                            )}
                          </text>
                          <line
                            x1="40"
                            x2="750"
                            y1={y}
                            y2={y}
                            stroke="#25313c"
                            strokeDasharray="4 6"
                          />
                        </g>
                      ))}
                      <line
                        x1="40"
                        x2="750"
                        y1={
                          160 - ((selected.baseline - low) / (high - low)) * 120
                        }
                        y2={
                          160 - ((selected.baseline - low) / (high - low)) * 120
                        }
                        stroke="#768b95"
                        strokeDasharray="6 6"
                      />
                      <polyline
                        points={points}
                        fill="none"
                        stroke="#8de9cc"
                        strokeWidth="3"
                      />
                      {values.map((v, i) => (
                        <circle
                          key={i}
                          cx={40 + (i * 700) / Math.max(1, values.length - 1)}
                          cy={160 - ((v - low) / (high - low)) * 120}
                          r="4"
                          fill="#8de9cc"
                        />
                      ))}
                    </svg>
                    <div className="chart-footer">
                      <span>
                        {records.length
                          ? new Date(
                              records.slice(-14)[0].at,
                            ).toLocaleDateString()
                          : "No entries"}
                      </span>
                      <span>
                        ◌ Dashed line: demo baseline {selected.baseline}
                      </span>
                      <span>
                        {latest
                          ? new Date(latest.at).toLocaleDateString()
                          : "No entries"}
                      </span>
                    </div>
                  </div>
                  <p className="panel-note">
                    {latest?.synthetic
                      ? "Showing a synthetic mission scenario."
                      : "Latest entry: manually logged on this device."}{" "}
                    Changes highlight a conversation, not a diagnosis.
                  </p>
                </section>
                <section className="panel routine">
                  <p className="eyebrow">SMALL ACTIONS, LONG MISSIONS</p>
                  <h2>Daily mission routine</h2>
                  <p className="muted">
                    {checks.length} of {tasks.length} complete this session
                  </p>
                  <div className="progress">
                    <span
                      style={{
                        width: `${(checks.length / tasks.length) * 100}%`,
                      }}
                    />
                  </div>
                  {tasks.map((t) => (
                    <label key={t}>
                      <input
                        type="checkbox"
                        checked={checks.includes(t)}
                        onChange={() =>
                          setChecks(
                            checks.includes(t)
                              ? checks.filter((x) => x !== t)
                              : [...checks, t],
                          )
                        }
                      />
                      <span>{t}</span>
                    </label>
                  ))}
                  <div className="routine-foot">
                    ✧ A little consistency goes a long way.
                  </div>
                </section>
                <section className="panel body-panel">
                  <div>
                    <p className="eyebrow">KNOW YOUR SYSTEMS</p>
                    <h2>The human side of spaceflight.</h2>
                    <p className="muted">
                      Choose a body system to understand its mission context.
                    </p>
                    <div className="system-buttons">
                      {Object.keys(systems).map((s) => (
                        <button
                          key={s}
                          className={system === s ? "active" : ""}
                          onClick={() => setSystem(s)}
                        >
                          {systems[s].icon} {s}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div
                    className="body-figure"
                    aria-label="Body system selector"
                  >
                    <svg viewBox="0 0 180 260">
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
                          role="button"
                          tabIndex="0"
                          aria-label={p.s}
                          onClick={() => setSystem(p.s)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              setSystem(p.s);
                            }
                          }}
                        >
                          <circle
                            className={system === p.s ? "hot selected" : "hot"}
                            cx={p.x}
                            cy={p.y}
                            r="12"
                          />
                        </g>
                      ))}
                    </svg>
                  </div>
                  <div className="system-detail">
                    <span className="system-icon">{info.icon}</span>
                    <span className="chip">{info.hazard}</span>
                    <h3>{system}</h3>
                    <p>{info.text}</p>
                    <a href={info.link} target="_blank" rel="noreferrer">
                      Explore NASA research ↗
                    </a>
                  </div>
                </section>
              </div>
            </>
          )}
          {view === "Health log" && (
            <section className="panel">
              <div className="panel-title">
                <h2>Recorded check-ins</h2>
                <button onClick={exportReport}>Export JSON ↗</button>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Recorded at</th>
                      <th>Source</th>
                      {metrics.map((m) => (
                        <th key={m.id}>
                          {m.name} ({m.unit})
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[...records].reverse().map((r) => (
                      <tr key={r.id}>
                        <td>{new Date(r.at).toLocaleString()}</td>
                        <td>
                          <span className="chip">
                            {r.synthetic ? "Synthetic" : "Manual demo"}
                          </span>
                        </td>
                        {metrics.map((m) => (
                          <td key={m.id}>{r[m.id]}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="panel-note">
                Stored in this browser only. Use fictional readings. This
                prototype has no cloud account or clinical record system.
              </p>
            </section>
          )}
          {view === "Research & mission" && (
            <section className="research-grid">
              <article className="panel">
                <p className="eyebrow">THE CHALLENGE</p>
                <h2>Autonomy begins with understanding.</h2>
                <p>
                  Build a visual tool that gathers health indicators, makes
                  changes understandable, and helps astronauts evaluate their
                  health during long missions.
                </p>
                <p>
                  ASTRA connects a daily check-in, visible trends, body-system
                  education and a portable report. The first prototype uses
                  synthetic data and transparent example comparisons.
                </p>
                <a
                  href="https://www.spaceappschallenge.org/2026/challenges/health-monitoring-software/"
                  target="_blank"
                  rel="noreferrer"
                >
                  Read the official challenge ↗
                </a>
              </article>
              <article className="panel">
                <p className="eyebrow">NASA HUMAN RESEARCH PROGRAM</p>
                <h2>Five hazards. One human.</h2>
                {[
                  "Space radiation",
                  "Isolation and confinement",
                  "Distance from Earth",
                  "Gravity fields",
                  "Hostile / closed environments",
                ].map((h, i) => (
                  <p className="hazard" key={h}>
                    <span>0{i + 1}</span>
                    {h}
                  </p>
                ))}
                <a
                  href="https://www.nasa.gov/hrp/hazards/"
                  target="_blank"
                  rel="noreferrer"
                >
                  Explore the five hazards ↗
                </a>
              </article>
              <article className="panel">
                <h2>Research library</h2>
                <p>
                  <a
                    href="https://www.nasa.gov/hrp/risks/"
                    target="_blank"
                    rel="noreferrer"
                  >
                    NASA · Risks of Human Spaceflight ↗
                  </a>
                </p>
                <p>
                  <a
                    href="https://www.nasa.gov/hrp/ongoing-hrp-research/"
                    target="_blank"
                    rel="noreferrer"
                  >
                    NASA · Ongoing HRP Research ↗
                  </a>
                </p>
                <p>
                  <a
                    href="https://www.spaceappschallenge.org/resources/project-submission-guide/"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Space Apps · Submission guide ↗
                  </a>
                </p>
                <p className="muted">
                  NASA resources inform the educational context. NASA has not
                  validated this application or the illustrative baseline
                  values.
                </p>
              </article>
              <article className="panel">
                <h2>Prototype boundaries</h2>
                <p>
                  No live astronaut telemetry, hardware integration, diagnosis
                  or automated treatment is implemented. There is no medical
                  model behind the review labels.
                </p>
                <p>
                  Next: clinically reviewed measurement protocols, individual
                  baseline configuration, secure storage and evaluated
                  escalation workflows.
                </p>
                <p className="muted">
                  AI assistance was used for research synthesis, application
                  code and documentation.
                </p>
              </article>
            </section>
          )}
          <footer>
            ASTRA / notttsSWE{" "}
            <span>
              Built for NASA Space Apps 2026 · Independent educational prototype
            </span>
          </footer>
        </div>
      </main>
      {form && (
        <div className="overlay">
          <section
            ref={modalRef}
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="checkin-title"
          >
            <div className="panel-title">
              <h2 id="checkin-title">Daily check-in</h2>
              <button aria-label="Close check-in" onClick={() => setForm(null)}>
                ✕
              </button>
            </div>
            <p className="muted">
              Use fictional readings for this demonstration. All fields are
              required.
            </p>
            <form onSubmit={save}>
              {metrics.map((m) => (
                <label className="field" key={m.id}>
                  {m.name} ({m.unit})
                  <input
                    autoFocus={m.id === "pulse"}
                    type="number"
                    min={m.min}
                    max={m.max}
                    step={m.step}
                    required
                    value={form[m.id]}
                    onChange={(e) =>
                      setForm({ ...form, [m.id]: e.target.value })
                    }
                  />
                </label>
              ))}
              <button className="primary" type="submit">
                Save check-in
              </button>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
createRoot(document.getElementById("root")).render(<App />);
