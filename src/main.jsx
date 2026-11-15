import React, { useState, useEffect, Component } from "react";
import { createRoot } from "react-dom/client";
import {
  metrics,
  validateReading,
  crew,
  forCrew,
  crewTriage,
  daily,
  dayKey,
  readiness,
  escalation,
  checkinStatus,
  qualityCheck,
  countermeasures,
  handoverSummary,
} from "./health.js";
import {
  STATE_KEY,
  LEGACY_KEYS,
  loadState,
  seedState,
  addCheckin,
  addReview,
  latestReview,
  reviewIsCurrent,
  addDownlink,
  addUplink,
  acknowledgeUplink,
  probeStorage,
  mergeStates,
  resetDemo,
} from "./mission.js";
import {
  Icon,
  Status,
  Empty,
  Modal,
  Checkin,
  Measurements,
  Trend,
  fmtTime,
  fmtDate,
  qualifiedBand,
} from "./ui.jsx";
import { Research } from "./research.jsx";
import "./style.css";
const CHECKS = "astra-checks-v1";
const tasks = [
  "Complete daily health check-in",
  "Log prescribed exercise routine",
  "Review sleep and recovery",
  "Prepare crew medical handover",
];
const storageOk = (() => {
  try {
    return probeStorage(window.localStorage);
  } catch {
    return false;
  }
})();
const boot = (() => {
  try {
    return storageOk
      ? loadState(
          localStorage.getItem(STATE_KEY),
          LEGACY_KEYS.map((k) => localStorage.getItem(k)),
        )
      : { state: seedState(), source: "memory" };
  } catch {
    return { state: seedState(), source: "memory" };
  }
})();
function readChecks() {
  try {
    const c = JSON.parse(localStorage.getItem(CHECKS));
    return Array.isArray(c) ? c.filter((n) => typeof n === "string") : [];
  } catch {
    return [];
  }
}
const cleanReport = (text) =>
  text
    .replaceAll("Mission ready", "No flags under demo rules")
    .replaceAll(
      "All crew mission ready",
      "All crew have no flags under demo rules",
    )
    .replaceAll("Readiness:", "Demo comparison score:")
    .replaceAll("readiness ", "demo comparison score ");
function App() {
  const [mission, setMission] = useState(boot.state),
    [role, setRole] = useState("c1"),
    [focus, setFocus] = useState(null),
    [view, setView] = useState("overview"),
    [metric, setMetric] = useState("pulse"),
    [notice, setNotice] = useState(
      boot.source === "memory"
        ? "Storage is unavailable. This session is in memory; export before closing."
        : boot.repaired
          ? "Some saved items were repaired. Valid manual records were kept."
          : boot.source === "migrated"
            ? "Saved records were migrated from the earlier version."
            : "",
    ),
    [dialog, setDialog] = useState(null),
    [reviewNote, setReviewNote] = useState(""),
    [recommendation, setRecommendation] = useState(""),
    [recommendCrew, setRecommendCrew] = useState(""),
    [reportId, setReportId] = useState(null),
    [checks, setChecks] = useState(readChecks),
    [sidebarVisible, setSidebarVisible] = useState(true),
    [mobileDetail, setMobileDetail] = useState(false);
  const isCmo = role === "cmo",
    isGround = role === "ground",
    staff = isCmo || isGround,
    triage = isCmo ? crewTriage(mission.records) : [];
  const member = staff ? (focus ?? triage[0]?.id ?? "c1") : role,
    memberInfo = crew.find((c) => c.id === member),
    records = forCrew(mission.records, member),
    latest = daily(records).at(-1),
    cadence = checkinStatus(records),
    score = readiness(records, new Date()),
    esc = escalation(records),
    review = latestReview(mission, member),
    today = dayKey(new Date().toISOString()),
    routine = [...tasks, ...countermeasures(records)],
    checkKey = (t) => `${member}|${today}|${t}`;
  const selectedReport =
      mission.downlinks.find((d) => d.id === reportId) ??
      mission.downlinks.at(-1) ??
      null,
    lastReport = mission.downlinks.at(-1),
    recheck =
      records.some((r) => dayKey(r.at) === today) || score.pending.length > 0;
  function commit(next, message) {
    if (!storageOk) {
      setMission(next);
      setNotice(
        `${message} Storage unavailable: export a copy before closing.`,
      );
      return;
    }
    try {
      const stored = loadState(localStorage.getItem(STATE_KEY)).state,
        merged = mergeStates(stored, next);
      localStorage.setItem(STATE_KEY, JSON.stringify(merged));
      const back = JSON.parse(localStorage.getItem(STATE_KEY));
      if (back?.records?.length !== merged.records.length)
        throw new Error("Storage verification failed");
      setMission(merged);
      setNotice(message);
    } catch {
      setMission(next);
      setNotice(
        `${message} It could not be saved on this device. Export before closing.`,
      );
    }
  }
  useEffect(() => {
    const listener = (e) => {
      if (e.key === STATE_KEY && e.newValue)
        setMission(loadState(e.newValue).state);
      if (e.key === CHECKS) setChecks(readChecks());
    };
    window.addEventListener("storage", listener);
    return () => window.removeEventListener("storage", listener);
  }, []);
  useEffect(() => {
    if (!window.matchMedia("(max-width: 767px)").matches) return;
    const target = document.querySelector(
      mobileDetail
        ? ".back-to-queue"
        : ".queue-item.selected, .snapshot-item.selected",
    );
    target?.focus();
  }, [mobileDetail]);
  function changeRole(value) {
    setRole(value);
    setFocus(null);
    setReviewNote("");
    setNotice("");
    setMobileDetail(false);
    setView("overview");
  }
  function save(values) {
    const error = validateReading(values);
    if (error) {
      setNotice(error);
      return;
    }
    const entry = {
      crew: member,
      ...Object.fromEntries(metrics.map((m) => [m.id, Number(values[m.id])])),
      id: crypto.randomUUID(),
      at: new Date().toISOString(),
      synthetic: false,
    };
    const { verify, confirmed } = qualityCheck(records, entry);
    if (verify.length) entry.verify = verify;
    const label = (id) => metrics.find((m) => m.id === id).name;
    let message = recheck
      ? "Recheck saved. Earlier entries remain in history; the latest daily reading is plotted."
      : "Check-in saved with a UTC timestamp.";
    if (confirmed.length)
      message += ` Recheck confirmed: ${confirmed.map(label).join(", ")}.`;
    if (verify.length)
      message += ` Verify reading: ${verify.map(label).join(", ")}. These values are excluded from your baseline until confirmed.`;
    commit(addCheckin(mission, entry), message);
    setDialog(null);
  }
  function toggleCheck(t) {
    const key = checkKey(t),
      base = [...new Set([...readChecks(), ...checks])].filter((x) =>
        x.includes(`|${today}|`),
      ),
      next = base.includes(key)
        ? base.filter((x) => x !== key)
        : [...base, key];
    setChecks(next);
    try {
      localStorage.setItem(CHECKS, JSON.stringify(next));
    } catch {
      setNotice("Routine updated for this session, but storage failed.");
    }
  }
  function report(title, text, filename) {
    setDialog({ kind: "report", title, text: cleanReport(text), filename });
  }
  function exportData() {
    report(
      staff ? "Crew records / JSON" : `${memberInfo.name} / JSON`,
      JSON.stringify(
        {
          project: "ASTRA Crew Health",
          prototype: true,
          exportedAt: new Date().toISOString(),
          baselinePolicy:
            "Illustrative demo comparisons, not validated clinical thresholds",
          scope: staff ? "whole crew" : memberInfo.name,
          records: staff ? mission.records : records,
          reviews: staff
            ? mission.reviews
            : mission.reviews.filter((r) => r.crew === member),
        },
        null,
        2,
      ),
      staff ? "astra-crew-data.json" : `astra-${member}-data.json`,
    );
  }
  function handover() {
    report(
      `${memberInfo.name} / handover`,
      handoverSummary(
        records,
        new Date(),
        `${memberInfo.name} (${memberInfo.role})`,
      ),
      `astra-handover-${member}.txt`,
    );
  }
  function download() {
    try {
      const url = URL.createObjectURL(
        new Blob([dialog.text], {
          type: dialog.filename.endsWith(".json")
            ? "application/json"
            : "text/plain",
        }),
      );
      const a = document.createElement("a");
      a.href = url;
      a.download = dialog.filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setNotice(`Download started: ${dialog.filename}. If blocked, use Copy.`);
    } catch {
      setNotice("Download unavailable. Use Copy to keep the report.");
    }
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(dialog.text);
      setNotice("Report copied.");
    } catch {
      const el = document.getElementById("report-content");
      el?.focus();
      el?.select();
      setNotice("Select and copy the report with Cmd+C or Ctrl+C.");
    }
  }
  function saveReview(e) {
    e.preventDefault();
    try {
      commit(
        addReview(mission, { crew: member, note: reviewNote }),
        `Review saved for ${memberInfo.name}. It will be included in the next report.`,
      );
      setReviewNote("");
    } catch (e) {
      setNotice(e.message);
    }
  }
  function sendReport() {
    commit(
      addDownlink(mission),
      "Simulated report sent. The ground view now has a fixed snapshot.",
    );
  }
  function sendRecommendation(e) {
    e.preventDefault();
    try {
      commit(
        addUplink(mission, {
          text: recommendation,
          crew: recommendCrew || null,
        }),
        "Simulated recommendation sent to the crew medical officer.",
      );
      setRecommendation("");
    } catch (e) {
      setNotice(e.message);
    }
  }

  const title =
    view === "history"
      ? isGround
        ? "Report archive"
        : "Observation history"
      : view === "research"
        ? "Research & context"
        : isCmo
          ? "Crew review"
          : isGround
            ? "Ground reports"
            : "Crew record";
  const utilities = (
    <details className="utilities">
      <summary>Utilities</summary>
      <div className="utility-actions">
        {!isGround && (
          <>
            <button onClick={exportData}>
              <Icon name="download" />
              Export {staff ? "crew" : "my"} data
            </button>
            <button onClick={handover}>Open handover</button>
          </>
        )}
        <button onClick={() => setDialog({ kind: "reset" })}>
          Refresh fictional scenario
        </button>
      </div>
    </details>
  );
  const recordHeading = (
    <div className="record-heading">
      <div>
        <p className="section-label">
          {member.toUpperCase()} / {memberInfo.role}
        </p>
        <h2>{memberInfo.name}</h2>
        <p className="muted small">
          Latest observation:{" "}
          <time dateTime={latest?.at}>{fmtTime(latest?.at)}</time>
          <span className="source-label">
            {latest
              ? latest.synthetic
                ? "Synthetic"
                : "Manual demo"
              : "No data"}
          </span>
        </p>
      </div>
      <div className="record-action">
        <Status>{cadence.text}</Status>
        {!staff && (
          <button
            className="primary"
            onClick={() => setDialog({ kind: "checkin" })}
          >
            <Icon name={recheck ? "history" : "plus"} />
            {recheck ? "Record a recheck" : "Daily check-in"}
          </button>
        )}
      </div>
    </div>
  );
  const comparison = (
    <details className="comparison-detail">
      <summary>
        Demo comparison score{" "}
        <span className="mono">{score.score ?? "—"}/100</span>
      </summary>
      <p>
        {qualifiedBand(score.band)}. This illustrative score is not a medical or
        fitness assessment.
      </p>
      <p className="muted small">
        {score.drivers.length
          ? `Indicators contributing to the score: ${score.drivers.join(", ")}.`
          : score.stale
            ? "Recent observations are needed to calculate a score."
            : "No contributing changes under the demo rules."}
        {score.pending.length
          ? ` Pending verification: ${score.pending.join(", ")}.`
          : ""}
      </p>
    </details>
  );
  const recordWorkspace = (
    <>
      {recordHeading}
      {(esc || score.pending.length > 0) && (
        <div className="review-strip">
          <Icon name="alert" />
          <div>
            <strong>
              {score.pending.length
                ? "Readings need verification"
                : `${esc?.metrics.length} sustained changes under demo rules`}
            </strong>
            <p>
              {score.pending.length
                ? `Record a recheck for ${score.pending.join(", ")}.`
                : esc?.message}{" "}
              <span className="muted">
                This is a simulation, not clinical triage.
              </span>
            </p>
          </div>
        </div>
      )}
      <div className="observations">
        <Measurements records={records} metric={metric} setMetric={setMetric} />
        <Trend records={records} metric={metric} />
      </div>
      {comparison}
    </>
  );
  function Routine() {
    return (
      <section className="routine">
        <div className="section-heading">
          <div>
            <p className="section-label">
              Daily record / {fmtDate(new Date().toISOString())}
            </p>
            <h2>Routine</h2>
          </div>
          <span className="mono small">
            {routine.filter((t) => checks.includes(checkKey(t))).length} /{" "}
            {routine.length} recorded
          </span>
        </div>
        <div className="routine-items">
          {routine.map((t, i) => (
            <label key={t}>
              <input
                type="checkbox"
                checked={checks.includes(checkKey(t))}
                onChange={() => toggleCheck(t)}
              />
              <span>{t}</span>
              <span className="muted small">
                {i < tasks.length ? "Routine" : "Review task"}
              </span>
            </label>
          ))}
        </div>
      </section>
    );
  }
  function Recommendations() {
    const all = mission.uplinks;
    return (
      all.length > 0 && (
        <section className="recommendations">
          <div className="section-heading">
            <h2>Ground recommendations</h2>
            <span className="small muted">Simulated uplink</span>
          </div>
          {[...all].reverse().map((u) => (
            <article key={u.id}>
              <p className="small muted">
                {fmtTime(u.at)} /{" "}
                {crew.find((c) => c.id === u.crew)?.name || "Whole crew"}
              </p>
              <p>{u.text}</p>
              {u.acknowledged ? (
                <Status>Acknowledged</Status>
              ) : (
                <button
                  onClick={() =>
                    commit(
                      acknowledgeUplink(mission, u.id),
                      "Recommendation acknowledged in the local simulation.",
                    )
                  }
                >
                  <Icon name="check" />
                  Acknowledge
                </button>
              )}
            </article>
          ))}
        </section>
      )
    );
  }
  return (
    <>
      <div
        className={"app-shell" + (sidebarVisible ? "" : " sidebar-hidden")}
        inert={dialog ? true : undefined}
      >
        <aside
          className="sidebar"
          id="app-sidebar"
          aria-label="Application sidebar"
        >
          <a
            className="brand"
            href="#"
            onClick={(e) => {
              e.preventDefault();
              setView("overview");
            }}
          >
            <svg width="32" height="32" viewBox="0 0 32 32" aria-hidden="true">
              <path
                d="M4 25 16 5l12 20H4Z M10 20h12 M16 13v12"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              />
            </svg>
            <span>
              ASTRA<small>Crew health operations</small>
            </span>
          </a>
          <div className="mission-identifier">
            <span className="section-label">Workspace</span>
            <strong>Habitat A</strong>
            <span className="muted small">Demonstration crew</span>
          </div>
          <nav aria-label="Primary">
            {[
              [
                "overview",
                isCmo
                  ? "Crew review"
                  : isGround
                    ? "Ground reports"
                    : "Crew record",
                "overview",
              ],
              [
                "history",
                isGround ? "Report archive" : "Health log",
                "history",
              ],
              ["research", "Research", "research"],
            ].map(([id, label, icon]) => (
              <button
                key={id}
                aria-current={view === id ? "page" : undefined}
                onClick={() => {
                  setView(id);
                  setMobileDetail(false);
                }}
              >
                <Icon name={icon} />
                <span>{label}</span>
                {view === id && <span className="nav-indicator" />}
              </button>
            ))}
          </nav>
          <div className="sidebar-foot">
            <p className="small">
              Fictional data
              <br />
              Local simulation
            </p>
            <span className="muted small">notttsSWE / Space Apps 2026</span>
          </div>
        </aside>
        <div className="app-main">
          <header className="topbar">
            <button
              className="icon-button sidebar-toggle"
              aria-label={sidebarVisible ? "Hide sidebar" : "Show sidebar"}
              title={sidebarVisible ? "Hide sidebar" : "Show sidebar"}
              aria-expanded={sidebarVisible}
              aria-controls="app-sidebar"
              onClick={() => setSidebarVisible((v) => !v)}
            >
              <Icon name="sidebar" />
            </button>
            <div className="breadcrumb">
              <span>Operations</span>
              <span>/</span>
              <strong>{title}</strong>
            </div>
            <span className="toolbar-context">
              Fictional data · Local simulation
            </span>
          </header>
          <div className="workspace">
            <div className="page-heading">
              <div>
                <p className="section-label">
                  {isGround
                    ? "Received snapshots"
                    : isCmo
                      ? "Medical officer workspace"
                      : "Personal observations"}
                </p>
                <h1>{title}</h1>
              </div>
              <label className="role-control">
                <span>Demo role</span>
                <select
                  aria-label="Demo role"
                  value={role}
                  onChange={(e) => changeRole(e.target.value)}
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
            </div>
            {notice && (
              <div className="notice" role="status">
                <Icon name="check" />
                <span>{notice}</span>
                <button
                  className="icon-button"
                  onClick={() => setNotice("")}
                  aria-label="Dismiss message"
                  title="Dismiss message"
                >
                  <Icon name="close" size={16} />
                </button>
              </div>
            )}
            {view === "overview" && !staff && (
              <>
                <div className="crew-workspace">{recordWorkspace}</div>
                {Routine()}
                {utilities}
              </>
            )}
            {view === "overview" && isCmo && (
              <div
                className={
                  "medical-layout " + (mobileDetail ? "show-detail" : "")
                }
              >
                <section className="review-queue" aria-labelledby="queue-title">
                  <div className="section-heading">
                    <div>
                      <p className="section-label">Review queue</p>
                      <h2 id="queue-title">{crew.length} crew members</h2>
                    </div>
                    <span className="small muted">Priority order</span>
                  </div>
                  {triage.map((c) => {
                    const reviewed = reviewIsCurrent(mission, c.id),
                      reason =
                        c.escalation?.metrics.join(", ") ||
                        (c.readiness.pending.length
                          ? "Verify " + c.readiness.pending.join(", ")
                          : c.checkin.missed
                            ? c.checkin.text
                            : "No flags under demo rules");
                    return (
                      <button
                        className={
                          "queue-item " + (member === c.id ? "selected" : "")
                        }
                        key={c.id}
                        aria-pressed={member === c.id}
                        onClick={() => {
                          setFocus(c.id);
                          setReviewNote("");
                          setMobileDetail(true);
                        }}
                      >
                        <span className="queue-name">
                          <strong>{c.name}</strong>
                          <span className="mono small">
                            {c.id.toUpperCase()}
                          </span>
                        </span>
                        <span className="muted small">{c.role}</span>
                        <span className="queue-reason">{reason}</span>
                        <span className="small muted">
                          Latest:{" "}
                          {fmtTime(
                            daily(forCrew(mission.records, c.id)).at(-1)?.at,
                          )}
                        </span>
                        <Status
                          kind={
                            reviewed
                              ? "positive"
                              : c.escalation ||
                                  c.checkin.missed ||
                                  c.readiness.pending.length
                                ? "review"
                                : "neutral"
                          }
                        >
                          {reviewed
                            ? "Reviewed"
                            : c.escalation ||
                                c.checkin.missed ||
                                c.readiness.pending.length
                              ? "Needs review"
                              : "No review flags"}
                        </Status>
                      </button>
                    );
                  })}
                </section>
                <div className="medical-detail">
                  <button
                    className="back-to-queue"
                    onClick={() => setMobileDetail(false)}
                  >
                    <Icon name="back" />
                    Back to crew queue
                  </button>
                  {recordWorkspace}
                  <section className="review-editor">
                    <div className="section-heading">
                      <h2>Review note</h2>
                      {review && (
                        <span className="small muted">
                          Last saved {fmtTime(review.at)}
                        </span>
                      )}
                    </div>
                    {review && <blockquote>{review.note}</blockquote>}
                    <form onSubmit={saveReview}>
                      <label htmlFor="review-note">
                        Review for {memberInfo.name}
                      </label>
                      <textarea
                        id="review-note"
                        value={reviewNote}
                        onChange={(e) => setReviewNote(e.target.value)}
                        maxLength={500}
                        required
                        rows={3}
                        placeholder="Record observations and context for the next handover."
                      />
                      <div className="editor-actions">
                        <span className="small muted">
                          Included in the next report snapshot.
                        </span>
                        <button className="primary" type="submit">
                          Save review
                          <Icon name="check" />
                        </button>
                      </div>
                    </form>
                  </section>
                  <section className="handover">
                    <div>
                      <p className="section-label">Simulated downlink</p>
                      <h2>Send a crew snapshot</h2>
                      <p className="muted">
                        Includes all five crew records and saved review notes.
                        Later changes will not alter this snapshot.
                      </p>
                      <p className="small muted">
                        {lastReport
                          ? "Last sent " + fmtTime(lastReport.at)
                          : "No report sent yet."}
                      </p>
                    </div>
                    <button onClick={sendReport}>
                      Send report to ground
                      <Icon name="arrow" />
                    </button>
                  </section>
                  {Recommendations()}
                  {utilities}
                </div>
              </div>
            )}
            {(view === "overview" || view === "history") && isGround && (
              <div
                className={
                  "ground-layout " + (mobileDetail ? "show-detail" : "")
                }
              >
                <section className="snapshot-list">
                  <div className="section-heading">
                    <div>
                      <p className="section-label">Received reports</p>
                      <h2>{mission.downlinks.length} snapshots</h2>
                    </div>
                  </div>
                  {mission.downlinks.length === 0 ? (
                    <Empty title="Awaiting a crew report">
                      Use the medical-officer view to simulate sending a
                      snapshot.
                    </Empty>
                  ) : (
                    [...mission.downlinks].reverse().map((d, i) => (
                      <button
                        key={d.id}
                        className={
                          "snapshot-item " +
                          (selectedReport?.id === d.id ? "selected" : "")
                        }
                        onClick={() => {
                          setReportId(d.id);
                          setMobileDetail(true);
                        }}
                        aria-pressed={selectedReport?.id === d.id}
                      >
                        <span className="small section-label">
                          Report{" "}
                          {String(mission.downlinks.length - i).padStart(
                            2,
                            "0",
                          )}
                          {i === 0 ? " / Latest" : ""}
                        </span>
                        <strong>{fmtTime(d.at)}</strong>
                        <span>{d.rows.length} crew members</span>
                        <span className="muted small">
                          {
                            d.rows.filter(
                              (r) => r.sustained.length || r.pending.length,
                            ).length
                          }{" "}
                          with review or verification flags
                        </span>
                      </button>
                    ))
                  )}
                </section>
                <div className="ground-detail">
                  <button
                    className="back-to-queue"
                    onClick={() => setMobileDetail(false)}
                  >
                    <Icon name="back" />
                    Back to received reports
                  </button>
                  {selectedReport ? (
                    <>
                      <div className="record-heading">
                        <div>
                          <p className="section-label">Fixed report snapshot</p>
                          <h2>Crew handover</h2>
                          <p className="muted">
                            Received {fmtTime(selectedReport.at)} /{" "}
                            {selectedReport.rows.length} crew members
                          </p>
                        </div>
                        <button
                          onClick={() =>
                            report(
                              "Received report / " + fmtTime(selectedReport.at),
                              selectedReport.text,
                              "astra-ground-report.txt",
                            )
                          }
                        >
                          <Icon name="download" />
                          Open report
                        </button>
                      </div>
                      <p className="snapshot-disclosure">
                        This view reads the transmitted snapshot only. Local
                        crew changes appear here only after another simulated
                        downlink.
                      </p>
                      <div className="received-crew">
                        {selectedReport.rows.map((c) => (
                          <article key={c.id}>
                            <div className="received-identity">
                              <span className="mono small">
                                {c.id.toUpperCase()}
                              </span>
                              <h3>{c.name}</h3>
                              <span className="muted">{c.role}</span>
                            </div>
                            <Status>{qualifiedBand(c.band)}</Status>
                            <p>
                              {c.sustained.length
                                ? "Sustained changes: " + c.sustained.join(", ")
                                : c.pending.length
                                  ? "Pending verification: " +
                                    c.pending.join(", ")
                                  : "No sustained changes in this snapshot."}
                            </p>
                            <p className="muted small">{c.checkin}</p>
                            {c.review && (
                              <blockquote>CMO note: {c.review}</blockquote>
                            )}
                            <details>
                              <summary>Demo comparison score</summary>
                              <p className="mono">{c.score ?? "—"}/100</p>
                              <p className="small muted">
                                Illustrative rules; not a fitness assessment.
                              </p>
                            </details>
                          </article>
                        ))}
                      </div>
                      <section className="recommendation-editor">
                        <p className="section-label">Simulated uplink</p>
                        <h2>Respond to this report</h2>
                        {selectedReport.id !== lastReport?.id ? (
                          <p className="muted">
                            This is a historical snapshot. Select the latest
                            report to send a recommendation.
                          </p>
                        ) : (
                          <form onSubmit={sendRecommendation}>
                            <label htmlFor="recommend-crew">Crew context</label>
                            <select
                              id="recommend-crew"
                              value={recommendCrew}
                              onChange={(e) => setRecommendCrew(e.target.value)}
                            >
                              <option value="">Whole crew</option>
                              {crew.map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.name} · {c.role}
                                </option>
                              ))}
                            </select>
                            <label htmlFor="recommendation">
                              Recommendation
                            </label>
                            <textarea
                              id="recommendation"
                              rows={3}
                              value={recommendation}
                              onChange={(e) =>
                                setRecommendation(e.target.value)
                              }
                              required
                              maxLength={1000}
                              placeholder="Write a fictional recommendation for the crew medical officer."
                            />
                            <div className="editor-actions">
                              <span className="small muted">
                                Local simulation; no external transmission.
                              </span>
                              <button className="primary" type="submit">
                                Send simulated recommendation
                                <Icon name="arrow" />
                              </button>
                            </div>
                          </form>
                        )}
                      </section>
                      <section className="reply-history">
                        <h2>Response history</h2>
                        {mission.uplinks.filter(
                          (u) => u.replyTo === selectedReport.id,
                        ).length === 0 ? (
                          <p className="muted">
                            No recommendations for this report.
                          </p>
                        ) : (
                          [...mission.uplinks]
                            .reverse()
                            .filter((u) => u.replyTo === selectedReport.id)
                            .map((u) => (
                              <article key={u.id}>
                                <p className="small muted">
                                  {fmtTime(u.at)} /{" "}
                                  {crew.find((c) => c.id === u.crew)?.name ||
                                    "Whole crew"}
                                </p>
                                <p>{u.text}</p>
                                <Status>
                                  {u.acknowledged
                                    ? "Acknowledged by CMO"
                                    : "Awaiting acknowledgment"}
                                </Status>
                              </article>
                            ))
                        )}
                      </section>
                    </>
                  ) : (
                    <Empty title="No received snapshot">
                      The ground workspace will show only information sent by
                      the simulated medical officer.
                    </Empty>
                  )}
                </div>
              </div>
            )}
            {view === "history" && !isGround && (
              <section className="history-section">
                <div className="section-heading">
                  <div>
                    <h2>{memberInfo.name} / observation log</h2>
                    <p className="muted">
                      Every check-in is retained. Charts use the latest reading
                      for each UTC day.
                    </p>
                  </div>
                  <button onClick={exportData}>
                    <Icon name="download" />
                    Export records
                  </button>
                </div>
                {isCmo && (
                  <label className="history-person">
                    Crew member
                    <select
                      value={member}
                      onChange={(e) => setFocus(e.target.value)}
                    >
                      {crew.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Observation (UTC)</th>
                        <th>Source / quality</th>
                        {metrics.map((m) => (
                          <th key={m.id}>
                            {m.name}
                            <span className="muted small">{m.unit}</span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[...records].reverse().map((r) => (
                        <tr key={r.id}>
                          <td className="mono">{fmtTime(r.at)}</td>
                          <td>
                            {r.synthetic ? "Synthetic" : "Manual demo"}
                            {records.find((x) => dayKey(x.at) === dayKey(r.at))
                              ?.id !== r.id
                              ? " / recheck"
                              : ""}
                            {r.verify?.length > 0 && (
                              <span className="status review">
                                Verify:{" "}
                                {r.verify
                                  .map(
                                    (id) =>
                                      metrics.find((m) => m.id === id).name,
                                  )
                                  .join(", ")}
                              </span>
                            )}
                          </td>
                          {metrics.map((m) => (
                            <td key={m.id} className="mono">
                              {r[m.id]}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {records.length === 0 && (
                  <Empty title="No observations">
                    Record a fictional daily check-in to start this log.
                  </Empty>
                )}
              </section>
            )}
            {view === "research" && <Research />}
            <footer>
              <span>ASTRA / notttsSWE</span>
              <span>
                Fictional data · Local simulation · All observations in UTC
              </span>
            </footer>
          </div>
        </div>
      </div>
      {dialog?.kind === "checkin" && (
        <Checkin
          member={memberInfo}
          recheck={recheck}
          save={save}
          close={() => setDialog(null)}
        />
      )}
      {dialog?.kind === "report" && (
        <Modal
          title={dialog.title}
          description="Local report. Fictional data and illustrative comparisons, not medical advice."
          close={() => setDialog(null)}
          wide
        >
          <label htmlFor="report-content">Report contents</label>
          <textarea
            id="report-content"
            data-autofocus
            readOnly
            value={dialog.text}
            rows={15}
            className="report-text"
          />
          {notice && (
            <p role="status" className="muted">
              {notice}
            </p>
          )}
          <div className="dialog-actions">
            <button onClick={copy}>Copy report</button>
            <button className="primary" onClick={download}>
              <Icon name="download" />
              Export report
            </button>
          </div>
        </Modal>
      )}
      {dialog?.kind === "reset" && (
        <Modal
          title="Refresh fictional scenario?"
          description="Regenerates the synthetic crew history for the current date. Manual entries, review notes and transmitted reports are kept. If the scenario is already current, the values will stay the same."
          close={() => setDialog(null)}
        >
          <div className="dialog-actions">
            <button onClick={() => setDialog(null)}>Cancel</button>
            <button
              className="primary"
              onClick={() => {
                commit(
                  resetDemo(mission),
                  "Fictional scenario refreshed. Manual records and reports were kept.",
                );
                setDialog(null);
              }}
            >
              Refresh scenario
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
class SafeApp extends Component {
  state = { error: null };
  static getDerivedStateFromError(error) {
    return { error };
  }
  render() {
    if (!this.state.error) return <App />;
    let raw = "";
    try {
      raw = localStorage.getItem(STATE_KEY) || "";
    } catch {}
    return (
      <main className="recovery">
        <p className="section-label">Local recovery</p>
        <h1>ASTRA could not open this session</h1>
        <p>
          Copy the saved record below before restarting. A backup is kept when
          storage is available.
        </p>
        <label htmlFor="recovery-data">Saved mission data</label>
        <textarea id="recovery-data" value={raw} readOnly rows={12} />
        <button
          className="primary"
          onClick={() => {
            try {
              if (raw) localStorage.setItem("astra-mission-backup", raw);
              localStorage.removeItem(STATE_KEY);
            } catch {}
            location.reload();
          }}
        >
          Back up and restart
        </button>
      </main>
    );
  }
}
createRoot(document.getElementById("root")).render(<SafeApp />);
