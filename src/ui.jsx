import React, { useEffect, useRef, useState } from "react";
import {
  metrics,
  daily,
  dayKey,
  personalBaseline,
  trendSummary,
  assessPersonal,
} from "./health.js";
export function Icon({ name, size = 20, ...props }) {
  const paths = {
    sidebar: "M3 4h18v16H3zM9 4v16M5 8h2M5 12h2",
    overview: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z",
    history: "M4 5h16M4 12h16M4 19h16",
    research:
      "M12 5c-3-2-6-2-9-1v15c3-1 6-1 9 1m0-15c3-2 6-2 9-1v15c-3-1-6-1-9 1V5",
    arrow: "M5 12h14m-6-6 6 6-6 6",
    back: "M19 12H5m6-6-6 6 6 6",
    plus: "M12 5v14M5 12h14",
    close: "m6 6 12 12M6 18 18 6",
    download: "M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5",
    check: "m5 12 4 4L19 6",
    external: "M14 3h7v7m0-7L10 14M10 3H3v18h18v-7",
    alert: "M12 8v5m0 3v1M12 3 2 21h20L12 3",
    chevron: "m9 5 7 7-7 7",
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d={paths[name] || paths.overview} />
    </svg>
  );
}
export const fmtTime = (iso) =>
  iso
    ? new Date(iso).toLocaleString("en-GB", {
        timeZone: "UTC",
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      }) + " UTC"
    : "No observations";
export const fmtDate = (iso) =>
  new Date(iso).toLocaleDateString("en-GB", {
    timeZone: "UTC",
    day: "2-digit",
    month: "short",
  });
export const qualifiedBand = (band) =>
  band === "Mission ready" ? "No flags under demo rules" : band;
export const tone = (label) =>
  /Review|Verify|Watch|Re-measure|Missed|No recent|due|Needs review/.test(label)
    ? "review"
    : "positive";
export function Status({ children, kind }) {
  return (
    <span className={"status " + (kind || tone(String(children)))}>
      <span className="status-mark" aria-hidden="true" />
      {children}
    </span>
  );
}
export function Empty({ title, children }) {
  return (
    <div className="empty">
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  );
}
export function Modal({ title, description, close, children, wide = false }) {
  const ref = useRef(null);
  useEffect(() => {
    const before = document.activeElement;
    const box = ref.current;
    (
      box.querySelector("[data-autofocus]") ||
      box.querySelector("input,textarea,button")
    )?.focus();
    const key = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      }
      if (e.key === "Tab") {
        const nodes = [
          ...box.querySelectorAll("button,input,textarea,select,a[href]"),
        ].filter((n) => !n.disabled);
        const first = nodes[0],
          last = nodes.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    const prior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", key);
      document.body.style.overflow = prior;
      before?.focus();
    };
  }, []);
  return (
    <div className="overlay">
      <section
        className={"dialog " + (wide ? "dialog-wide" : "")}
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        aria-describedby={description ? "dialog-description" : undefined}
      >
        <header className="dialog-heading">
          <h2 id="dialog-title">{title}</h2>
          <button
            className="icon-button"
            aria-label="Close dialog"
            title="Close dialog"
            onClick={close}
          >
            <Icon name="close" />
          </button>
        </header>
        {description && (
          <p id="dialog-description" className="muted">
            {description}
          </p>
        )}
        {children}
      </section>
    </div>
  );
}
export function Checkin({ member, recheck, save, close }) {
  const [values, setValues] = useState(
      Object.fromEntries(metrics.map((m) => [m.id, ""])),
    ),
    [errors, setErrors] = useState({});
  function submit(e) {
    e.preventDefault();
    const next = {};
    for (const m of metrics) {
      const raw = values[m.id],
        v = Number(raw);
      if (
        raw === "" ||
        !Number.isFinite(v) ||
        v < m.min ||
        v > m.max ||
        Math.abs((v - m.min) / m.step - Math.round((v - m.min) / m.step)) > 1e-6
      )
        next[m.id] =
          `Enter ${m.min}–${m.max} ${m.unit}, in steps of ${m.step}.`;
    }
    setErrors(next);
    if (Object.keys(next).length) {
      document.getElementById("reading-" + Object.keys(next)[0])?.focus();
      return;
    }
    save(values);
  }
  return (
    <Modal
      title={recheck ? "Record a recheck" : "Daily check-in"}
      description={`${member.name} / ${member.role}. Fictional readings only. All fields are required; observations are timestamped in UTC.`}
      close={close}
    >
      <form noValidate onSubmit={submit}>
        {metrics.map((m, i) => (
          <div className="form-field" key={m.id}>
            <label htmlFor={"reading-" + m.id}>
              {m.name}
              <span className="unit-label">{m.unit}</span>
            </label>
            <input
              data-autofocus={i === 0 ? "true" : undefined}
              id={"reading-" + m.id}
              type="number"
              inputMode={m.step < 1 ? "decimal" : "numeric"}
              min={m.min}
              max={m.max}
              step={m.step}
              required
              value={values[m.id]}
              aria-invalid={Boolean(errors[m.id])}
              aria-describedby={"help-" + m.id}
              onChange={(e) => {
                setValues({ ...values, [m.id]: e.target.value });
                setErrors({ ...errors, [m.id]: undefined });
              }}
            />
            <p
              id={"help-" + m.id}
              className={errors[m.id] ? "field-error" : "field-help"}
            >
              {errors[m.id] ||
                `Accepted input: ${m.min}–${m.max} ${m.unit}. These are input limits, not clinical ranges.`}
            </p>
          </div>
        ))}
        <div className="dialog-actions">
          <button type="button" onClick={close}>
            Cancel
          </button>
          <button className="primary" type="submit">
            Save {recheck ? "recheck" : "check-in"}
            <Icon name="check" />
          </button>
        </div>
      </form>
    </Modal>
  );
}
export function Measurements({ records, metric, setMetric }) {
  const latest = daily(records).at(-1);
  return (
    <section className="measurement-list" aria-labelledby="measurements-title">
      <div className="section-heading">
        <h2 id="measurements-title">Measurements</h2>
        <span className="muted small">Latest observation</span>
      </div>
      <div className="measurement-labels">
        <span>Indicator</span>
        <span>Value</span>
        <span>Comparison</span>
      </div>
      {metrics.map((m) => {
        const a = assessPersonal(records, m);
        return (
          <button
            className={"measurement-row " + (metric === m.id ? "selected" : "")}
            key={m.id}
            aria-pressed={metric === m.id}
            onClick={() => setMetric(m.id)}
          >
            <span className="measurement-name">
              {m.name}
              <span className="small muted">{m.system}</span>
            </span>
            <span className="measurement-value">
              {latest?.[m.id] ?? "—"}
              <span className="measurement-unit">{m.unit}</span>
            </span>
            <span className="measurement-status">
              <Status>{a.label}</Status>
              <Icon name="chevron" size={16} />
            </span>
          </button>
        );
      })}
      <p className="small muted list-foot">
        Select an indicator to inspect its history. Status uses illustrative
        comparison rules.
      </p>
    </section>
  );
}
export function Trend({ records, metric }) {
  const m = metrics.find((x) => x.id === metric),
    rs = daily(records).slice(-14),
    base = personalBaseline(records, m),
    ref = useRef(null),
    [width, setWidth] = useState(600);
  useEffect(() => {
    const ob = new ResizeObserver(([entry]) =>
      setWidth(Math.max(240, Math.floor(entry.contentRect.width))),
    );
    ob.observe(ref.current);
    return () => ob.disconnect();
  }, []);
  const chartHeight = width < 400 ? 220 : 248,
    left = 44,
    right = 16,
    top = 24,
    bottom = 40,
    plotW = width - left - right,
    plotH = chartHeight - top - bottom;
  const nums = rs.map((r) => Number(r[m.id])),
    min = Math.min(base.value, ...nums),
    max = Math.max(base.value, ...nums),
    pad = Math.max((max - min) * 0.2, m.step < 1 ? 0.3 : 2),
    lo = Math.max(m.min, min - pad),
    hi = Math.min(m.max, max + pad),
    span = Math.max(m.step, hi - lo);
  const t0 = rs.length ? Date.parse(dayKey(rs[0].at)) : 0,
    t1 = rs.length ? Date.parse(dayKey(rs.at(-1).at)) : 0;
  const x = (i) =>
      left +
      (t1 === t0
        ? plotW / 2
        : ((Date.parse(dayKey(rs[i].at)) - t0) / (t1 - t0)) * plotW),
    y = (v) => top + ((hi - v) / span) * plotH;
  const segments = [];
  let segment = [];
  rs.forEach((r, i) => {
    if (
      i &&
      Date.parse(dayKey(r.at)) - Date.parse(dayKey(rs[i - 1].at)) > 86400000
    ) {
      segments.push(segment);
      segment = [];
    }
    segment.push(`${x(i)},${y(r[m.id])}`);
  });
  if (segment.length) segments.push(segment);
  const dateIndices =
    width < 400
      ? [0, rs.length - 1]
      : [0, Math.floor((rs.length - 1) / 2), rs.length - 1];
  return (
    <section className="trend" aria-labelledby="trend-title">
      <div className="section-heading">
        <div>
          <p className="section-label">Observation trend</p>
          <h2 id="trend-title">
            {m.name} <span className="muted small">/ {m.unit}</span>
          </h2>
        </div>
        <span className="small muted">{rs.length} check-in days</span>
      </div>
      <p className="trend-summary">{trendSummary(records, m)}</p>
      <div ref={ref} className="chart-frame">
        {rs.length ? (
          <svg
            width="100%"
            height={chartHeight}
            viewBox={`0 0 ${width} ${chartHeight}`}
            role="img"
            aria-label={`${m.name}, ${m.unit}. ${rs.map((r) => `${fmtDate(r.at)}: ${r[m.id]}${r.verify?.includes(metric) ? ", verify reading" : ""}`).join("; ")}. Gaps mean no observation.`}
          >
            {[0, 1, 2, 3].map((i) => {
              const v = lo + (span * i) / 3;
              return (
                <g key={i}>
                  <line
                    x1={left}
                    x2={width - right}
                    y1={y(v)}
                    y2={y(v)}
                    className="chart-grid"
                  />
                  <text
                    x={left - 8}
                    y={y(v) + 4}
                    textAnchor="end"
                    className="chart-text"
                  >
                    {v.toFixed(m.step < 1 ? 1 : 0)}
                  </text>
                </g>
              );
            })}
            <line
              x1={left}
              x2={width - right}
              y1={y(base.value)}
              y2={y(base.value)}
              className="baseline"
            />
            {segments.map((p, i) => (
              <polyline key={i} points={p.join(" ")} className="chart-line" />
            ))}
            {rs.map((r, i) => (
              <circle
                key={r.id}
                cx={x(i)}
                cy={y(r[m.id])}
                r={r.verify?.includes(metric) ? 5 : 3.5}
                className={
                  r.verify?.includes(metric)
                    ? "chart-point pending"
                    : "chart-point"
                }
              >
                <title>
                  {fmtTime(r.at)}: {r[m.id]} {m.unit}
                  {r.verify?.includes(metric) ? " (verify reading)" : ""}
                </title>
              </circle>
            ))}
            {[...new Set(dateIndices)].map((i) => (
              <text
                key={i}
                x={x(i)}
                y={chartHeight - 12}
                textAnchor={
                  i === 0 ? "start" : i === rs.length - 1 ? "end" : "middle"
                }
                className="chart-text"
              >
                {fmtDate(rs[i].at)}
              </text>
            ))}
          </svg>
        ) : (
          <Empty title="No observations yet">
            Record a fictional check-in to start the trend.
          </Empty>
        )}
      </div>
      <div className="chart-legend">
        <span>
          <i className="legend-line" />
          Recorded value
        </span>
        <span>
          <i className="legend-line dashed" />
          {base.personal ? "Personal" : "Demo"} baseline:{" "}
          <b>
            {Number(base.value.toFixed(1))} {m.unit}
          </b>
        </span>
      </div>
      <p className="small muted">
        {base.personal
          ? `Median of ${base.n} earlier recorded days, excluding unverified values.`
          : "Illustrative baseline; at least five earlier recorded days are needed for a personal comparison."}{" "}
        Time spacing is preserved; disconnected points indicate missing days.
      </p>
      <details className="chart-data">
        <summary>View plotted observations</summary>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Day (UTC)</th>
                <th>
                  {m.name} ({m.unit})
                </th>
                <th>Source</th>
              </tr>
            </thead>
            <tbody>
              {rs.map((r) => (
                <tr key={r.id}>
                  <td>{fmtDate(r.at)}</td>
                  <td className="mono">
                    {r[m.id]}
                    {r.verify?.includes(metric) ? " · verify" : ""}
                  </td>
                  <td>{r.synthetic ? "Synthetic" : "Manual demo"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  );
}
