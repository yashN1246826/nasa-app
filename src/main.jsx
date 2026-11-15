import React, { useState, useEffect, useRef, Component } from "react";
import { createRoot } from "react-dom/client";
import {
  metrics,
  validateReading,
  assess,
  makeDemo,
  validRecords,
  trendSummary,
  handoverSummary,
  assessPersonal,
  personalBaseline,
  readiness,
  escalation,
  checkinStatus,
  makeScenario,
  qualityCheck,
  daily,
  dayKey,
  MAX_RECORDS,
  crew,
  forCrew,
  makeCrewDemo,
  crewTriage,
  groundReport,
  countermeasures,
  dayPositions,
} from "./health";
import {
  STATE_KEY,
  LEGACY_KEYS,
  loadState,
  seedState,
  resetDemo,
  addCheckin,
  addReview,
  latestReview,
  reviewIsCurrent,
  addDownlink,
  addUplink,
  acknowledgeUplink,
  minutesSince,
  probeStorage,
  mergeStates,
} from "./mission";
import "./style.css";
const STORE = "astra-demo-v2";
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
// Can this browser keep data between visits? Checked once at start-up.
const storageOk = (() => {
  try {
    return probeStorage(window.localStorage);
  } catch {
    return false;
  }
})();
const boot = (() => {
  try {
    if (!storageOk)
      return { state: seedState(), repaired: false, source: "memory" };
    return loadState(
      localStorage.getItem(STATE_KEY),
      LEGACY_KEYS.map((k) => localStorage.getItem(k)),
    );
  } catch {
    return { state: seedState(), repaired: false, source: "memory" };
  }
})();
const bootNotice = !storageOk
  ? "This browser view can't keep data between visits. Your entries work until you close the page; use Export to keep a copy."
  : boot.repaired
    ? "Some saved data was damaged and has been repaired. Your own check-ins were kept."
    : boot.source === "migrated"
      ? "Saved data from an earlier version was upgraded. Your own check-ins were kept."
      : "";
const fmtTime = (iso) =>
  new Date(iso).toLocaleString(undefined, {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }) + " UTC";
const CHECKS = "astra-checks-v1";
function readChecks() {
  try {
    const c = JSON.parse(localStorage.getItem(CHECKS));
    return Array.isArray(c) ? c.filter((n) => typeof n === "string") : [];
  } catch {
    return [];
  }
}
function App() {
  const [mission, setMission] = useState(boot.state),
    [report, setReport] = useState(null),
    [confirmReset, setConfirmReset] = useState(false),
    [reviewNote, setReviewNote] = useState(""),
    [uplinkText, setUplinkText] = useState(""),
    [uplinkCrew, setUplinkCrew] = useState(""),
    [role, setRole] = useState("c1"),
    [focus, setFocus] = useState(null),
    [view, setView] = useState("Overview"),
    [system, setSystem] = useState("Cardiovascular"),
    [metric, setMetric] = useState("pulse"),
    [checks, setChecks] = useState(readChecks),
    [notice, setNotice] = useState(bootNotice),
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
  const allRecords = mission.records;
  const staff = role === "cmo" || role === "ground";
  const triage = staff ? crewTriage(allRecords) : [];
  const member = staff ? (focus ?? triage[0]?.id ?? "c1") : role;
  const memberInfo = crew.find((c) => c.id === member);
  const records = forCrew(allRecords, member);
  const roleLabel =
    role === "cmo"
      ? "Crew medical officer"
      : role === "ground"
        ? "Ground flight surgeon"
        : `${memberInfo.name} · ${memberInfo.role}`;
  const latest = records.at(-1),
    selected = metrics.find((m) => m.id === metric),
    info = systems[system];
  // Save the whole mission state, then read it back to prove it was kept.
  function commit(next, message) {
    if (!storageOk) {
      setMission(next);
      setNotice(
        `${message} This browser view can't keep it after you close the page.`,
      );
      return;
    }
    try {
      // Merge with anything another tab saved since this one loaded.
      const stored = loadState(localStorage.getItem(STATE_KEY)).state;
      const merged = mergeStates(stored, next);
      localStorage.setItem(STATE_KEY, JSON.stringify(merged));
      const back = JSON.parse(localStorage.getItem(STATE_KEY));
      if (back?.records?.length !== merged.records.length)
        throw new Error("mismatch");
      setMission(merged);
      setNotice(message);
    } catch {
      setMission(next);
      setNotice(
        `${message} Warning: it couldn't be saved on this device. Export a copy before closing.`,
      );
    }
  }
  // Another tab saved: show its changes here too.
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === STATE_KEY && e.newValue)
        setMission(loadState(e.newValue).state);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
  function save(e) {
    e.preventDefault();
    const error = validateReading(form);
    if (error) {
      setNotice(error);
      return;
    }
    const entry = {
      crew: member,
      ...Object.fromEntries(metrics.map((m) => [m.id, Number(form[m.id])])),
      id: crypto.randomUUID(),
      at: new Date().toISOString(),
      synthetic: false,
    };
    const { verify, confirmed } = qualityCheck(records, entry);
    if (verify.length) entry.verify = verify;
    const recheck = records.some(
      (r) => !r.synthetic && dayKey(r.at) === dayKey(entry.at),
    );
    const name = (id) => metrics.find((m) => m.id === id).name;
    const parts = [
      recheck
        ? "Saved as a re-check. Earlier readings today stay in the health log; trends use the latest."
        : "Check-in saved.",
    ];
    if (confirmed.length)
      parts.push(`Confirmed by re-measure: ${confirmed.map(name).join(", ")}.`);
    if (verify.length)
      parts.push(
        `${verify.map(name).join(", ")} ${verify.length > 1 ? "are" : "is"} far from your usual range. ${verify.length > 1 ? "They're" : "It's"} marked "verify": re-measure to confirm. ${verify.length > 1 ? "They won't" : "It won't"} change your baseline until then.`,
      );
    commit(addCheckin(mission, entry), parts.join(" "));
    setForm(null);
  }
  // Routine ticks: start from what is stored (another tab may have ticked),
  // keep only today's, then save.
  function toggleCheck(t) {
    const key = checkKey(t);
    const stored = readChecks();
    const base = [...new Set([...stored, ...checks])].filter((x) =>
      x.includes(`|${todayKey}|`),
    );
    const next = base.includes(key)
      ? base.filter((x) => x !== key)
      : [...base, key];
    setChecks(next);
    try {
      localStorage.setItem(CHECKS, JSON.stringify(next));
    } catch {}
  }
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === CHECKS) setChecks(readChecks());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
  // Reports open inside the app, so they work even where downloads are blocked.
  function showReport(title, text, filename) {
    setReport({ title, text, filename });
    setNotice("");
  }
  function exportHandover() {
    showReport(
      `Handover summary · ${memberInfo.name}`,
      handoverSummary(
        records,
        new Date(),
        `${memberInfo.name} (${memberInfo.role})`,
      ),
      `astra-handover-${member}.txt`,
    );
  }
  function exportReport() {
    const data = {
      project: "ASTRA Crew Health",
      prototype: true,
      exportedAt: new Date().toISOString(),
      baselinePolicy:
        "Illustrative demo comparisons, not validated clinical thresholds",
      scope: staff ? "whole crew" : memberInfo.name,
      records: staff ? allRecords : records,
      reviews: staff
        ? mission.reviews
        : mission.reviews.filter((r) => r.crew === member),
    };
    showReport(
      staff
        ? "Crew data export (JSON)"
        : `My data export · ${memberInfo.name} (JSON)`,
      JSON.stringify(data, null, 2),
      staff ? "astra-crew-data.json" : `astra-${member}-data.json`,
    );
  }
  function downloadReport() {
    try {
      const url = URL.createObjectURL(
        new Blob([report.text], { type: "text/plain" }),
      );
      const a = document.createElement("a");
      a.href = url;
      a.download = report.filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setNotice(
        `Download started: ${report.filename}. If nothing appears, this view blocks downloads; use Copy instead.`,
      );
    } catch {
      setNotice("This view blocks downloads. Use Copy instead.");
    }
  }
  async function copyReport() {
    try {
      await navigator.clipboard.writeText(report.text);
      setNotice("Copied to clipboard.");
    } catch {
      const el = document.getElementById("report-text");
      if (el) {
        el.focus();
        el.select();
      }
      setNotice("Text selected. Press Cmd+C or Ctrl+C to copy.");
    }
  }
  function sendDownlink() {
    commit(
      addDownlink(mission),
      "Crew report sent to ground. The flight surgeon sees it on their next view.",
    );
  }
  function saveReview(e) {
    e.preventDefault();
    try {
      commit(
        addReview(mission, { crew: member, note: reviewNote }),
        `Review saved for ${memberInfo.name}. It's included in the next report to ground.`,
      );
      setReviewNote("");
    } catch (err) {
      setNotice(err.message + ".");
    }
  }
  function sendUplink(e) {
    e.preventDefault();
    try {
      commit(
        addUplink(mission, { text: uplinkText, crew: uplinkCrew || null }),
        "Recommendation sent to the spacecraft. The medical officer sees it on their next view.",
      );
      setUplinkText("");
    } catch (err) {
      setNotice(err.message + ".");
    }
  }
  const lastDownlink = mission.downlinks.at(-1) ?? null;
  const openUplinks = mission.uplinks.filter((u) => !u.acknowledged);
  const myReview = latestReview(mission, member);
  const ready = readiness(records, new Date()),
    esc = escalation(records),
    cadence = checkinStatus(records),
    selBase = personalBaseline(records, selected).value;
  const routine = [...tasks, ...countermeasures(records)];
  const todayKey = dayKey(new Date().toISOString());
  const checkKey = (t) => `${member}|${todayKey}|${t}`;
  const done = routine.filter((t) => checks.includes(checkKey(t))).length;
  const days = daily(records);
  const firstOfDay = new Set(
    [...records]
      .reverse()
      .map((r) => [dayKey(r.at), r.id])
      .reduce((m, [d, id]) => m.set(d, id), new Map())
      .values(),
  );
  const recent = days.slice(-14);
  const xs = dayPositions(recent);
  const values = recent.map((r) => r[selected.id]);
  const low = Math.min(...values, selBase) - 1,
    high = Math.max(...values, selBase) + 1;
  const points = values
    .map(
      (v, i) => `${40 + xs[i] * 700},${160 - ((v - low) / (high - low)) * 120}`,
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
            <label className="role-select">
              <span>VIEWING AS</span>
              <select
                value={role}
                onChange={(e) => {
                  setRole(e.target.value);
                  setFocus(null);
                  setNotice("");
                }}
                aria-label="Demo role"
              >
                <optgroup label="Crew">
                  {crew.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} · {c.role}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Medical">
                  <option value="cmo">Crew medical officer</option>
                  <option value="ground">Ground flight surgeon</option>
                </optgroup>
              </select>
            </label>
            <span className="profile" title={roleLabel}>
              {role === "cmo"
                ? "MO"
                : role === "ground"
                  ? "GS"
                  : member.toUpperCase()}
            </span>
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
                  ? staff
                    ? role === "ground"
                      ? "You see only the reports the crew medical officer sends from the spacecraft."
                      : `Reviewing ${memberInfo.name} · ${memberInfo.role}. Select a crew member below.`
                    : "Your daily perspective on crew health, recovery and readiness."
                  : "A mission companion for Yash, Pawan and team notttsSWE."}
              </p>
            </div>
            {!staff && (
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
            )}
          </div>
          <div className="demo-banner">
            <span>◇</span>
            <div>
              <strong>Exploration starts with a simulation.</strong> Synthetic
              sample readings · illustrative baselines · educational prototype,
              not medical advice.
            </div>
            {role !== "ground" && (
              <button onClick={exportReport}>
                {staff ? "Export crew data ↗" : "Export my data ↗"}
              </button>
            )}
            {role !== "ground" && (
              <button onClick={exportHandover}>Handover summary ↗</button>
            )}
            {role === "cmo" && (
              <button onClick={sendDownlink}>Send report to ground ↗</button>
            )}
            {role === "ground" ? null : confirmReset ? (
              <span className="confirm">
                Reset fictional data? Your own entries are kept.
                <button
                  onClick={() => {
                    commit(
                      resetDemo(mission),
                      "Fictional crew data reset. Your own check-ins, reviews and messages were kept.",
                    );
                    setConfirmReset(false);
                  }}
                >
                  Reset
                </button>
                <button onClick={() => setConfirmReset(false)}>Cancel</button>
              </span>
            ) : (
              <button onClick={() => setConfirmReset(true)}>
                Reset demo crew
              </button>
            )}
          </div>
          {notice && (
            <p className="notice" role="status">
              {notice}
            </p>
          )}
          {report && (
            <section className="panel report-view" aria-label={report.title}>
              <div className="panel-title">
                <h2>{report.title}</h2>
                <div className="report-actions">
                  <button onClick={copyReport}>Copy</button>
                  <button onClick={downloadReport}>Download</button>
                  <button onClick={() => setReport(null)}>Close</button>
                </div>
              </div>
              <textarea
                id="report-text"
                readOnly
                value={report.text}
                rows={14}
              />
            </section>
          )}
          {view === "Overview" && role === "ground" && (
            <>
              <section className="panel crew-panel">
                <div className="panel-title">
                  <div>
                    <p className="eyebrow">
                      GROUND SUPPORT · STORE AND FORWARD
                    </p>
                    <h2>Latest crew report from the spacecraft</h2>
                  </div>
                  {lastDownlink && (
                    <span className="chip">
                      Received {fmtTime(lastDownlink.at)} ·{" "}
                      {minutesSince(lastDownlink.at)} min old
                    </span>
                  )}
                </div>
                {!lastDownlink ? (
                  <p className="muted">
                    No report received yet. On a deep-space mission the ground
                    can't watch live data; the crew medical officer sends
                    reports when the link allows. Switch to "Crew medical
                    officer" and choose "Send report to ground".
                  </p>
                ) : (
                  <>
                    <table>
                      <thead>
                        <tr>
                          <th>Crew member</th>
                          <th>Readiness</th>
                          <th>Sustained changes</th>
                          <th>Check-in</th>
                          <th>CMO note</th>
                        </tr>
                      </thead>
                      <tbody>
                        {lastDownlink.rows.map((c) => (
                          <tr key={c.id}>
                            <td>
                              {c.name}
                              <small className="sub">{c.role}</small>
                            </td>
                            <td>
                              <b>{c.score ?? "—"}</b>{" "}
                              <span
                                className={
                                  "status " +
                                  (c.band !== "Mission ready" ? "review" : "")
                                }
                              >
                                {c.band}
                              </span>
                            </td>
                            <td className="wrap">
                              {c.sustained.length
                                ? c.sustained.join(", ")
                                : c.pending.length
                                  ? `Re-measure: ${c.pending.join(", ")}`
                                  : "None"}
                            </td>
                            <td className="wrap">{c.checkin}</td>
                            <td className="wrap">{c.review ?? "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <button
                      className="inline-action"
                      onClick={() =>
                        showReport(
                          `Crew report received ${fmtTime(lastDownlink.at)}`,
                          lastDownlink.text,
                          "astra-ground-report.txt",
                        )
                      }
                    >
                      Open full report ↗
                    </button>
                  </>
                )}
              </section>
              <section className="panel">
                <p className="eyebrow">UPLINK</p>
                <h2>Send a recommendation to the spacecraft</h2>
                <form
                  className="stack"
                  onSubmit={(e) => {
                    e.preventDefault();
                    sendUplink(e);
                  }}
                >
                  <label>
                    About
                    <select
                      value={uplinkCrew}
                      onChange={(e) => setUplinkCrew(e.target.value)}
                    >
                      <option value="">Whole crew</option>
                      {crew.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} · {c.role}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Recommendation
                    <textarea
                      rows={3}
                      maxLength={1000}
                      value={uplinkText}
                      onChange={(e) => setUplinkText(e.target.value)}
                      placeholder="Crew 3: add a second rest period tomorrow and repeat resting heart rate morning and evening."
                    />
                  </label>
                  <button
                    className="primary"
                    type="button"
                    onClick={sendUplink}
                    disabled={!lastDownlink}
                  >
                    Send to spacecraft
                  </button>
                  {!lastDownlink && (
                    <p className="muted">
                      You can reply once a crew report arrives.
                    </p>
                  )}
                </form>
                {mission.uplinks.length > 0 && (
                  <ul className="messages">
                    {[...mission.uplinks].reverse().map((u) => (
                      <li key={u.id}>
                        <small>
                          {fmtTime(u.at)} ·{" "}
                          {u.crew
                            ? crew.find((c) => c.id === u.crew).name
                            : "Whole crew"}{" "}
                          ·{" "}
                          {u.acknowledged
                            ? "Acknowledged by CMO"
                            : "Awaiting acknowledgement"}
                        </small>
                        {u.text}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </>
          )}
          {view === "Overview" && role !== "ground" && (
            <>
              {role === "cmo" && openUplinks.length > 0 && (
                <section className="panel">
                  <p className="eyebrow">FROM GROUND</p>
                  <h2>Recommendations from the flight surgeon</h2>
                  <ul className="messages">
                    {openUplinks.map((u) => (
                      <li key={u.id}>
                        <small>
                          {fmtTime(u.at)} ·{" "}
                          {u.crew
                            ? crew.find((c) => c.id === u.crew).name
                            : "Whole crew"}
                        </small>
                        {u.text}
                        <button
                          className="inline-action"
                          onClick={() =>
                            commit(
                              acknowledgeUplink(mission, u.id),
                              "Recommendation acknowledged. Ground will see it.",
                            )
                          }
                        >
                          Acknowledge
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
              {role === "cmo" && (
                <section className="panel crew-panel">
                  <div className="panel-title">
                    <div>
                      <p className="eyebrow">
                        {role === "cmo"
                          ? "CREW MEDICAL OFFICER"
                          : "GROUND SUPPORT"}
                      </p>
                      <h2>Crew at a glance</h2>
                    </div>
                    <span className="chip">
                      Sorted by priority ·{" "}
                      {lastDownlink
                        ? `last sent to ground ${minutesSince(lastDownlink.at)} min ago`
                        : "not yet sent to ground"}
                    </span>
                  </div>
                  <p className="mobile-hint">
                    Scroll the table sideways for check-in and review status →
                  </p>
                  <div className="table-scroll">
                    <table>
                      <thead>
                        <tr>
                          <th>Crew member</th>
                          <th>Readiness</th>
                          <th>Sustained changes</th>
                          <th>Check-in</th>
                          <th>Your review</th>
                        </tr>
                      </thead>
                      <tbody>
                        {triage.map((c) => (
                          <tr
                            key={c.id}
                            className={member === c.id ? "selected" : ""}
                          >
                            <td>
                              <button
                                className="link-button"
                                onClick={() => {
                                  setFocus(c.id);
                                  setReviewNote("");
                                }}
                                aria-pressed={member === c.id}
                              >
                                {c.name}
                                <small>{c.role}</small>
                              </button>
                            </td>
                            <td>
                              <b>{c.readiness.score ?? "—"}</b>{" "}
                              <span
                                className={
                                  "status " +
                                  (c.readiness.band !== "Mission ready"
                                    ? "review"
                                    : "")
                                }
                              >
                                {c.readiness.band}
                              </span>
                            </td>
                            <td className="wrap">
                              {c.escalation
                                ? c.escalation.metrics.join(", ")
                                : c.readiness.pending.length
                                  ? `Re-measure: ${c.readiness.pending.join(", ")}`
                                  : "None"}
                            </td>
                            <td className="wrap">{c.checkin.text}</td>
                            <td className="wrap">
                              {reviewIsCurrent(mission, c.id)
                                ? `Reviewed ${fmtTime(latestReview(mission, c.id).at)}`
                                : c.escalation ||
                                    c.readiness.band !== "Mission ready"
                                  ? "Needs review"
                                  : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}
              <section className="panel insight" aria-live="polite">
                <div>
                  <p className="eyebrow">
                    {staff
                      ? `${memberInfo.name.toUpperCase()} READINESS`
                      : "YOUR READINESS"}
                  </p>
                  <h2>
                    {ready.score ?? "—"}
                    <small>/100 · {ready.band}</small>
                  </h2>
                  <p className="muted">
                    {ready.stale
                      ? "The last check-in is more than a day old. Readiness needs a fresh check-in."
                      : ready.drivers.length
                        ? `Pulling the score down: ${ready.drivers.join(", ")}.`
                        : "All scored indicators near baseline."}
                    {ready.pending.length
                      ? ` Re-measure needed: ${ready.pending.join(", ")}.`
                      : ""}
                  </p>
                </div>
                <div>
                  <p className="eyebrow">CHECK-IN</p>
                  <p>{cadence.text}</p>
                  {myReview && (
                    <p className="muted">
                      Medical officer, {fmtTime(myReview.at)}: {myReview.note}
                    </p>
                  )}
                  {role === "cmo" && (
                    <form
                      className="stack"
                      onSubmit={(e) => {
                        e.preventDefault();
                        saveReview(e);
                      }}
                    >
                      <label>
                        Review {memberInfo.name}
                        <textarea
                          rows={2}
                          maxLength={500}
                          value={reviewNote}
                          onChange={(e) => setReviewNote(e.target.value)}
                          placeholder="Spoke with crew member; adding a rest period and repeating heart rate tomorrow morning."
                        />
                      </label>
                      <button type="button" onClick={saveReview}>
                        Save review
                      </button>
                    </form>
                  )}
                  {esc && (
                    <p
                      className={
                        "status " + (esc.level === "high" ? "review" : "")
                      }
                    >
                      {esc.message}
                    </p>
                  )}
                </div>
              </section>
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
                        (assessPersonal(records, m).label === "Review change"
                          ? "review"
                          : "")
                      }
                    >
                      {assessPersonal(records, m).label}
                    </span>
                    <svg viewBox="0 0 180 25" aria-hidden="true">
                      <polyline
                        points={days
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
                      Last {recent.length} check-in days · gaps are missed days
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
                    <p className="muted" role="status">
                      {trendSummary(records, selected)} <i>{selected.why}</i>
                    </p>
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
                        y1={160 - ((selBase - low) / (high - low)) * 120}
                        y2={160 - ((selBase - low) / (high - low)) * 120}
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
                          cx={40 + xs[i] * 700}
                          cy={160 - ((v - low) / (high - low)) * 120}
                          r="4"
                          fill="#8de9cc"
                        />
                      ))}
                    </svg>
                    <div className="chart-footer">
                      <span>
                        {records.length
                          ? new Date(recent[0].at).toLocaleDateString(
                              undefined,
                              { timeZone: "UTC" },
                            )
                          : "No entries"}
                      </span>
                      <span>
                        ◌ Dashed line:{" "}
                        {personalBaseline(records, selected).personal
                          ? "your baseline"
                          : "demo baseline"}{" "}
                        {selBase}
                      </span>
                      <span>
                        {latest
                          ? new Date(latest.at).toLocaleDateString(undefined, {
                              timeZone: "UTC",
                            })
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
                    {done} of {routine.length} complete today
                  </p>
                  <div className="progress">
                    <span
                      style={{
                        width: `${(done / routine.length) * 100}%`,
                      }}
                    />
                  </div>
                  {routine.map((t) => (
                    <label key={t}>
                      <input
                        type="checkbox"
                        checked={checks.includes(checkKey(t))}
                        onChange={() => toggleCheck(t)}
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
          {view === "Health log" && role === "ground" && (
            <section className="panel">
              <div className="panel-title">
                <h2>Reports received from the spacecraft</h2>
              </div>
              {mission.downlinks.length === 0 ? (
                <p className="muted">No reports received yet.</p>
              ) : (
                <ul className="messages">
                  {[...mission.downlinks].reverse().map((d) => (
                    <li key={d.id}>
                      <small>Received {fmtTime(d.at)}</small>
                      {d.rows
                        .filter((r) => r.band !== "Mission ready")
                        .map((r) => `${r.name}: ${r.band}`)
                        .join(" · ") || "All crew mission ready"}
                      <button
                        className="inline-action"
                        onClick={() =>
                          showReport(
                            `Crew report received ${fmtTime(d.at)}`,
                            d.text,
                            "astra-ground-report.txt",
                          )
                        }
                      >
                        Open ↗
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <p className="panel-note">
                The ground sees only what the medical officer sends. It never
                reads live crew data.
              </p>
            </section>
          )}
          {view === "Health log" && role !== "ground" && (
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
                        <td>{fmtTime(r.at)}</td>
                        <td>
                          <span className="chip">
                            {r.synthetic ? "Synthetic" : "Manual demo"}
                            {firstOfDay.has(r.id) ? "" : " · re-check"}
                            {r.verify?.length
                              ? ` · verify ${r.verify
                                  .map((id) =>
                                    metrics
                                      .find((m) => m.id === id)
                                      .name.toLowerCase(),
                                  )
                                  .join(", ")}`
                              : ""}
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
                {storageOk
                  ? "Saved in this browser on this device. Use fictional readings. This prototype has no cloud account or clinical record system."
                  : "This browser view can't keep data after you close the page. Use Export to keep a copy."}
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
            <form
              onSubmit={(e) => {
                e.preventDefault();
                save(e);
              }}
            >
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
              <button
                className="primary"
                type="button"
                onClick={(e) => {
                  const f = e.currentTarget.form;
                  if (f && !f.reportValidity()) return;
                  save(e);
                }}
              >
                Save check-in
              </button>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
// Last line of defence: if anything ever fails to render, never show a
// blank page. Keep a backup of the saved data and offer a clean restart.
class SafeApp extends Component {
  state = { error: null };
  static getDerivedStateFromError(error) {
    return { error };
  }
  render() {
    if (!this.state.error) return <App />;
    let raw = "";
    try {
      raw = localStorage.getItem(STATE_KEY) ?? "";
    } catch {}
    return (
      <div className="recovery">
        <h1>ASTRA hit a problem</h1>
        <p>
          Your saved data is shown below so nothing is lost. Copy it if you need
          it, then restart with a fresh demo crew.
        </p>
        <textarea readOnly value={raw} rows={8} />
        <button
          className="primary"
          onClick={() => {
            try {
              // Never replace a real backup with an empty one.
              if (raw) localStorage.setItem("astra-mission-backup", raw);
              localStorage.removeItem(STATE_KEY);
            } catch {}
            location.reload();
          }}
        >
          Back up and restart
        </button>
      </div>
    );
  }
}
createRoot(document.getElementById("root")).render(<SafeApp />);
