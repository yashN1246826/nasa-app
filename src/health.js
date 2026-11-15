// AI-assisted prototype. All scenario values and review rules are illustrative, not clinical.
export const metrics = [
  {
    id: "pulse",
    direction: "both",
    why: "Spaceflight shifts cardiovascular load, so a sustained change in either direction is worth discussing.",
    name: "Resting heart rate",
    unit: "bpm",
    min: 20,
    max: 250,
    step: 1,
    baseline: 64,
    delta: 12,
    system: "Cardiovascular",
  },
  {
    id: "sleep",
    direction: "low",
    why: "Isolation and disrupted light cycles can erode sleep; short sleep is the review signal.",
    name: "Sleep duration",
    unit: "hours",
    min: 0,
    max: 24,
    step: 0.1,
    baseline: 8,
    delta: 1.5,
    system: "Recovery",
  },
  {
    id: "water",
    direction: "low",
    why: "Fluid shifts in microgravity make low intake worth noting.",
    name: "Fluid intake",
    unit: "litres",
    min: 0,
    max: 15,
    step: 0.1,
    baseline: 2.5,
    delta: 0.8,
    system: "Nutrition",
  },
  {
    id: "exercise",
    direction: "low",
    why: "Exercise counters muscle and bone adaptation to altered gravity; missed sessions are the review signal.",
    name: "Exercise time",
    unit: "minutes",
    min: 0,
    max: 600,
    step: 1,
    baseline: 120,
    delta: 45,
    system: "Musculoskeletal",
  },
  {
    id: "mood",
    direction: "low",
    why: "Isolation and confinement can affect wellbeing; a lower mood score is worth sharing.",
    name: "Mood check-in",
    unit: "/ 5",
    min: 1,
    max: 5,
    step: 1,
    baseline: 4,
    delta: 1,
    system: "Behavioral health",
  },
];
export function validateReading(values) {
  for (const m of metrics) {
    const v = values[m.id];
    if (
      v === "" ||
      v === null ||
      v === undefined ||
      !Number.isFinite(Number(v)) ||
      Number(v) < m.min ||
      Number(v) > m.max
    )
      return `Enter ${m.name.toLowerCase()} between ${m.min} and ${m.max}.`;
  }
  return null;
}
export function assess(metric, value) {
  if (
    value === "" ||
    value === null ||
    value === undefined ||
    !Number.isFinite(Number(value))
  )
    return "No reading";
  const diff = Number(value) - metric.baseline;
  const flagged =
    metric.direction === "low"
      ? -diff >= metric.delta
      : Math.abs(diff) >= metric.delta;
  return flagged ? "Review change" : "Near demo baseline";
}
export function makeDemo() {
  const offsets = [0, 1, -1, 0, 2, 1, 0];
  return offsets.map((n, i) => ({
    id: `demo-${i}`,
    at: new Date(Date.UTC(2026, 10, 8 + i, 9)).toISOString(),
    pulse: 64 + n * 2,
    sleep: 8 - n * 0.3,
    water: 2.5 - n * 0.1,
    exercise: 120 - n * 8,
    mood: 4,
    synthetic: true,
  }));
}
export const MAX_RECORDS = 5000;
export function validRecords(records) {
  return (
    Array.isArray(records) &&
    records.length <= MAX_RECORDS &&
    records.every(
      (r) =>
        r &&
        typeof r.synthetic === "boolean" &&
        typeof r.id === "string" &&
        typeof r.at === "string" &&
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?Z$/.test(r.at) &&
        Number.isFinite(Date.parse(r.at)) &&
        (r.verify === undefined ||
          (Array.isArray(r.verify) &&
            r.verify.every((id) => metrics.some((m) => m.id === id)))) &&
        !validateReading(r),
    )
  );
}

// ===== Analysis layer (v0.2+) =====
// Every check-in is kept as entered (re-checks included). Analysis uses one
// value per day: the latest reading of each station day. Days are counted in
// UTC, the time standard the ISS runs on, so crew in any time zone share
// the same "day".
export const dayKey = (iso) => iso.slice(0, 10);
const dayStart = (iso) => Date.parse(dayKey(iso));
const DAY = 86400000;

export function daily(records) {
  const byDay = new Map();
  for (const r of [...records].sort((a, b) => (a.at < b.at ? -1 : 1)))
    byDay.set(dayKey(r.at), r);
  return [...byDay.values()];
}

const nums = (records, id) =>
  records.map((r) => Number(r?.[id])).filter(Number.isFinite);
const median = (a) => {
  const s = [...a].sort((x, y) => x - y);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const unverified = (r, id) => Boolean(r?.verify?.includes(id));

// Personal baseline: median of up to 7 earlier days, ignoring readings still
// awaiting re-measurement. The illustrative demo baseline is used until 5
// such days exist.
export function personalBaseline(records, metric, window = 7, minN = 5) {
  const prior = nums(
    daily(records)
      .slice(0, -1)
      .filter((r) => !unverified(r, metric.id)),
    metric.id,
  ).slice(-window);
  if (prior.length < minN)
    return { value: metric.baseline, personal: false, n: prior.length };
  return { value: median(prior), personal: true, n: prior.length };
}

// Distance moved in the concerning direction (0 if the move is harmless).
function concern(metric, value, base) {
  const d = Number(value) - base;
  return metric.direction === "low" ? Math.max(0, -d) : Math.abs(d);
}

export function assessPersonal(records, metric) {
  const last = daily(records).at(-1);
  const base = personalBaseline(records, metric);
  const v = last?.[metric.id];
  if (v === undefined || v === null || v === "" || !Number.isFinite(Number(v)))
    return { label: "No reading", ...base };
  if (unverified(last, metric.id)) return { label: "Verify reading", ...base };
  return {
    label:
      concern(metric, v, base.value) >= metric.delta
        ? "Review change"
        : base.personal
          ? "Near your baseline"
          : "Near demo baseline",
    ...base,
  };
}

// Sustained: the last k check-in days were all flagged (or all awaiting
// re-measurement) against the baseline that existed on each day. A single
// noisy day never escalates, and an unconfirmed reading is never ignored
// if it keeps happening.
export function sustainedChange(records, metric, k = 3) {
  const days = daily(records);
  if (days.length < k + 1) return false;
  for (let i = days.length - k; i < days.length; i++) {
    const label = assessPersonal(days.slice(0, i + 1), metric).label;
    if (label !== "Review change" && label !== "Verify reading") return false;
  }
  return true;
}

export function trendSummary(records, metric) {
  const v = nums(
    daily(records).filter((r) => !unverified(r, metric.id)),
    metric.id,
  );
  if (v.length < 4) return "Not enough check-in days for a trend yet.";
  const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
  const recent = v.slice(-3);
  const prior = v.slice(-6, -3);
  const before = prior.length ? prior : v.slice(0, -3);
  const change = mean(recent) - mean(before);
  // Changes smaller than a quarter of the review delta are day-to-day noise.
  const word =
    Math.abs(change) < metric.delta / 4
      ? "steady"
      : change > 0
        ? "rising"
        : "falling";
  const amt = Math.abs(change).toFixed(metric.step < 1 ? 1 : 0);
  return word === "steady"
    ? "Steady over the last 3 check-in days."
    : `${word[0].toUpperCase()}${word.slice(1)}: ${amt} ${metric.unit} vs the ${before.length === 1 ? "check-in day" : `${before.length} check-in days`} before.`;
}

// 0-100 composite from the latest day. Each indicator loses points as it
// moves in its concerning direction, reaching 0 at twice its review delta.
// Readings awaiting re-measurement are left out of the score and listed.
export function readiness(records, now = null) {
  const last = daily(records).at(-1);
  if (!last)
    return {
      score: null,
      band: "No data",
      drivers: [],
      pending: [],
      stale: false,
    };
  const pending = metrics.filter((m) => unverified(last, m.id));
  const parts = metrics
    .filter((m) => !unverified(last, m.id))
    .map((m) => ({
      m,
      s: Math.max(
        0,
        1 -
          concern(m, last[m.id], personalBaseline(records, m).value) /
            (2 * m.delta),
      ),
    }));
  const drivers = parts
    .filter((p) => p.s < 0.75)
    .sort((a, b) => a.s - b.s)
    .map((p) => p.m.name);
  const base = { drivers, pending: pending.map((m) => m.name), stale: false };
  // Readiness from stale data is not readiness.
  if (
    now &&
    Math.floor((dayStart(now.toISOString()) - dayStart(last.at)) / DAY) >= 2
  )
    return { ...base, score: null, band: "No recent data", stale: true };
  // A score from fewer than 3 of 5 indicators would mislead.
  if (parts.length < 3)
    return { ...base, score: null, band: "Re-measure needed" };
  const score = Math.round(
    (parts.reduce((a, p) => a + p.s, 0) / parts.length) * 100,
  );
  let band =
    score >= 80 ? "Mission ready" : score >= 60 ? "Monitor" : "Review with CMO";
  // The band can never look better than the escalation state.
  const esc = escalation(records);
  if (esc?.level === "high") band = "Review with CMO";
  else if (esc && band === "Mission ready") band = "Monitor";
  if (pending.length && band === "Mission ready") band = "Re-measure needed";
  return { ...base, score, band };
}

export function escalation(records) {
  const sustained = metrics.filter((m) => sustainedChange(records, m));
  if (!sustained.length) return null;
  const systems = [...new Set(sustained.map((m) => m.system))];
  return {
    level: sustained.length >= 2 ? "high" : "watch",
    metrics: sustained.map((m) => m.name),
    message:
      sustained.length >= 2
        ? `Raise with the crew medical officer: ${sustained.length} indicators (${systems.join(", ")}) have stayed changed for 3 check-in days in a row.`
        : `Watch: ${sustained[0].name} has stayed changed for 3 check-in days in a row.`,
  };
}

export function checkinStatus(records, now = new Date()) {
  if (!records.length)
    return { due: true, missed: 0, today: 0, text: "No check-ins yet." };
  const today = records.filter(
    (r) => dayKey(r.at) === dayKey(now.toISOString()),
  ).length;
  const last = daily(records).at(-1);
  const gap = Math.floor(
    (dayStart(now.toISOString()) - dayStart(last.at)) / DAY,
  );
  if (gap <= 0)
    return {
      due: false,
      missed: 0,
      today,
      text:
        today > 1
          ? `Checked in today (${today} readings; the latest counts).`
          : "Checked in today.",
    };
  if (gap === 1)
    return { due: true, missed: 0, today: 0, text: "Today's check-in is due." };
  return {
    due: true,
    missed: gap - 1,
    today: 0,
    text: `Missed ${gap - 1} day${gap > 2 ? "s" : ""}. Trends have gaps until you check in.`,
  };
}

// Data quality. A value at least 3x the review delta away from the person's
// own baseline is likely a typo or a non-resting measurement: it is saved,
// marked "verify" and kept out of baselines and the score until a re-check
// the same day confirms it (within one review delta). Mood is self-reported
// and is never second-guessed.
export function qualityCheck(records, entry) {
  const sameDay = records.filter((r) => dayKey(r.at) === dayKey(entry.at));
  const verify = [];
  const confirmed = [];
  for (const m of metrics) {
    if (m.id === "mood") continue;
    const b = personalBaseline([...records, entry], m);
    if (!b.personal || Math.abs(Number(entry[m.id]) - b.value) < 3 * m.delta)
      continue;
    const earlier = sameDay.filter((r) => unverified(r, m.id)).at(-1);
    if (earlier && Math.abs(Number(entry[m.id]) - earlier[m.id]) < m.delta)
      confirmed.push(m.id);
    else verify.push(m.id);
  }
  return { verify, confirmed };
}

// Flagged indicators add one concrete action each to today's routine.
const countermeasureText = {
  sleep: "Review the recorded sleep window with the crew medical officer",
  exercise: "Review the exercise log with the crew medical officer",
  water: "Review fluid intake observations with the crew medical officer",
  mood: "Discuss the wellbeing check-in with the crew medical officer",
  pulse: "Review resting heart rate observations with the crew medical officer",
};
export function countermeasures(records) {
  return metrics.flatMap((m) => {
    const label = assessPersonal(records, m).label;
    if (label === "Verify reading")
      return [
        `Re-measure ${m.name.toLowerCase()} and log it to confirm today's reading`,
      ];
    return label === "Review change" ? [countermeasureText[m.id]] : [];
  });
}

// Horizontal chart positions (0..1) by calendar day, so missed days show as gaps.
export function dayPositions(rs) {
  if (rs.length < 2) return rs.map(() => 0.5);
  const t = rs.map((r) => dayStart(r.at));
  const span = t.at(-1) - t[0];
  return span > 0
    ? t.map((x) => (x - t[0]) / span)
    : rs.map((_, i) => i / (rs.length - 1));
}

export function handoverSummary(records, now = new Date(), who = "") {
  const last = daily(records).at(-1);
  const r = readiness(records, now);
  const esc = escalation(records);
  const cad = checkinStatus(records, now);
  const lines = [
    `ASTRA crew health handover${who ? ` for ${who}` : ""}`,
    "Educational prototype with fictional data; not medical advice.",
    `Generated: ${now.toISOString()} (station time, UTC)`,
    last
      ? `Latest check-in: ${last.at} (${last.synthetic ? "synthetic" : "manual demo entry"}). ${cad.text}`
      : "No readings recorded.",
    `Readiness: ${r.score ?? "-"}/100 (${r.band})`,
    esc ? esc.message : "No sustained changes.",
    r.pending.length ? `Re-measure pending: ${r.pending.join(", ")}.` : "",
    "",
  ].filter((l, i, a) => l !== "" || a[i - 1] !== "");
  for (const m of metrics) {
    const a = assessPersonal(records, m);
    lines.push(
      `- ${m.name}: ${last?.[m.id] ?? "no reading"} ${m.unit} | ${a.label} (${a.personal ? "personal" : "demo"} baseline ${a.value}) | ${trendSummary(records, m)}${sustainedChange(records, m) ? " | SUSTAINED" : ""}`,
    );
  }
  const flagged = metrics.filter(
    (m) => assessPersonal(records, m).label === "Review change",
  );
  lines.push(
    "",
    flagged.length
      ? `For crew medical officer review: ${flagged.map((m) => m.name).join(", ")}.`
      : "Nothing flagged against baseline.",
    "Baselines and review rules are illustrative, not clinical thresholds.",
  );
  return lines.join("\n");
}

// ===== Crew (v0.3+) =====
export const crew = [
  { id: "c1", name: "Crew 1", role: "Commander" },
  { id: "c2", name: "Crew 2", role: "Pilot" },
  { id: "c3", name: "Crew 3", role: "Flight engineer" },
  { id: "c4", name: "Crew 4", role: "Mission specialist" },
  { id: "c5", name: "Crew 5", role: "Mission specialist" },
];
export const forCrew = (records, id) => records.filter((r) => r.crew === id);

// Fictional 14-day scenario: 9 steady days, then 5 days of disrupted sleep.
export function makeScenario(end = new Date()) {
  const out = [];
  for (let i = 0; i < 14; i++) {
    const bad = Math.max(0, i - 8);
    const d = new Date(end);
    d.setUTCDate(d.getUTCDate() - (13 - i));
    d.setUTCHours(8, 0, 0, 0);
    out.push({
      id: `scenario-${i}`,
      at: d.toISOString(),
      pulse: 63 + (i % 3) + bad * 4,
      sleep: Math.round((7.9 + ((i % 2) - 0.5) * 0.3 - bad * 0.75) * 10) / 10,
      water: Math.round((2.6 - (i % 3) * 0.1 - bad * 0.08) * 10) / 10,
      exercise: 115 + (i % 3) * 5 - bad * 14,
      mood: bad >= 3 ? 3 : 4,
      synthetic: true,
    });
  }
  return out;
}

function steady(id, end, days, seed, stopDaysAgo = 0) {
  const out = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(end);
    d.setUTCDate(d.getUTCDate() - (days - 1 - i) - stopDaysAgo);
    d.setUTCHours(7 + seed, 30, 0, 0);
    const w = ((i + seed) % 3) - 1;
    out.push({
      id: `${id}-${i}`,
      crew: id,
      at: d.toISOString(),
      pulse: 58 + seed * 3 + w,
      sleep: Math.round((7.4 + seed * 0.2 + w * 0.2) * 10) / 10,
      water: Math.round((2.4 + seed * 0.1 - w * 0.1) * 10) / 10,
      exercise: 110 + seed * 5 + w * 6,
      mood: 4,
      synthetic: true,
    });
  }
  return out;
}

// Fictional crew. Crew 3: five disrupted nights. Crew 5: missed two days.
// Crew 2: a mistyped heart rate this morning, re-measured 25 minutes later.
// The fictional history ends YESTERDAY, so nothing synthetic is ever dated
// in the future and the user's first check-in today is really the first.
export function makeCrewDemo(now = new Date()) {
  const end = new Date(now);
  end.setUTCDate(end.getUTCDate() - 1);
  const c2 = steady("c2", end, 14, 2);
  const typoAt = new Date(c2.at(-1).at);
  typoAt.setUTCMinutes(typoAt.getUTCMinutes() - 25);
  const typo = {
    ...c2.at(-1),
    id: "c2-typo",
    at: typoAt.toISOString(),
    pulse: 116,
    verify: ["pulse"],
  };
  return [
    ...steady("c1", end, 14, 1),
    ...c2,
    typo,
    ...makeScenario(end).map((r) => ({ ...r, id: `c3-${r.id}`, crew: "c3" })),
    ...steady("c4", end, 14, 0),
    ...steady("c5", end, 11, 3, 2),
  ].sort((a, b) => (a.at < b.at ? -1 : 1));
}

// Priority for the medical officer: sustained changes, missed days,
// pending re-measurements, then lowest readiness.
export function crewTriage(records, now = new Date()) {
  return crew
    .map((c) => {
      const mine = forCrew(records, c.id);
      const r = readiness(mine, now);
      const esc = escalation(mine);
      const cad = checkinStatus(mine, now);
      const priority =
        (esc?.level === "high" ? 300 : esc ? 200 : 0) +
        (cad.missed > 0 || !mine.length ? 100 : 0) +
        (r.pending.length ? 50 : 0) +
        (100 - (r.score ?? 0));
      return { ...c, readiness: r, escalation: esc, checkin: cad, priority };
    })
    .sort((a, b) => b.priority - a.priority);
}

export function groundReport(records, now = new Date()) {
  const rows = crewTriage(records, now);
  const lines = [
    "ASTRA crew health summary for ground flight surgeons",
    "Store-and-forward report. Educational prototype with fictional data; not medical advice.",
    `Generated: ${now.toISOString()} (station time, UTC)`,
    "",
  ];
  for (const c of rows) {
    lines.push(
      `${c.name} (${c.role}): readiness ${c.readiness.score ?? "-"}/100, ${c.readiness.band}`,
      `  ${c.escalation ? c.escalation.message : "No sustained changes."}`,
      ...(c.readiness.pending.length
        ? [`  Re-measure pending: ${c.readiness.pending.join(", ")}.`]
        : []),
      `  Check-in: ${c.checkin.text}`,
    );
  }
  const urgent = rows.filter((c) => c.escalation?.level === "high");
  lines.push(
    "",
    urgent.length
      ? `Requesting ground review for: ${urgent.map((c) => c.name).join(", ")}.`
      : "No crew member currently needs ground review.",
  );
  return lines.join("\n");
}
