// Mission state: everything ASTRA saves, in one validated object.
//
//   records    crew health check-ins (manual and synthetic)
//   reviews    crew medical officer reviews of a crew member's alerts
//   downlinks  store-and-forward reports the CMO sends to the ground
//   uplinks    recommendations the ground flight surgeon sends back
//
// All functions are pure: they take a state and return a new one.
import {
  validRecords,
  makeCrewDemo,
  crew,
  crewTriage,
  groundReport,
  MAX_RECORDS,
  dayKey,
} from "./health.js";

export const STATE_KEY = "astra-mission-v3";
const LEGACY_KEYS = ["astra-demo-v2", "astra-demo-v1"];
const crewIds = new Set(crew.map((c) => c.id));

export const emptyState = () => ({
  version: 3,
  records: [],
  reviews: [],
  downlinks: [],
  uplinks: [],
});

export function seedState(now = new Date()) {
  return { ...emptyState(), records: makeCrewDemo(now) };
}

const isText = (v, max = 2000) =>
  typeof v === "string" && v.trim().length > 0 && v.length <= max;
const isTime = (v) => typeof v === "string" && Number.isFinite(Date.parse(v));
const isStrList = (v) =>
  Array.isArray(v) && v.every((x) => typeof x === "string");
const isNumOrNull = (v) =>
  v === null || (typeof v === "number" && Number.isFinite(v));
const validRow = (r) =>
  r &&
  crewIds.has(r.id) &&
  typeof r.name === "string" &&
  typeof r.role === "string" &&
  isNumOrNull(r.score) &&
  typeof r.band === "string" &&
  isStrList(r.sustained) &&
  isStrList(r.pending) &&
  typeof r.checkin === "string" &&
  (r.review === null || typeof r.review === "string");

// Keep only well-formed items; never throw on bad input.
function cleanList(list, ok) {
  return Array.isArray(list) ? list.filter((x) => x && ok(x)) : [];
}

// Turn whatever is in storage into a valid state.
// Returns { state, repaired, source }.
//  - Valid v3 state: used as is.
//  - Older versions (a bare array of records): migrated. Manual check-ins are
//    kept; synthetic records without a crew member are dropped and the
//    fictional crew is re-seeded.
//  - Nothing usable: a fresh demo crew.
export function loadState(raw, legacyRaw = [], now = new Date()) {
  const parse = (s) => {
    try {
      return s ? JSON.parse(s) : null;
    } catch {
      return undefined;
    }
  };
  const v3 = parse(raw);
  if (v3 && typeof v3 === "object" && !Array.isArray(v3)) {
    const seen = new Set();
    const records = cleanList(
      v3.records,
      (r) => validRecords([r]) && crewIds.has(r.crew),
    ).filter((r) => !seen.has(r.id) && seen.add(r.id));
    const state = {
      version: 3,
      records,
      reviews: cleanList(
        v3.reviews,
        (r) =>
          typeof r.id === "string" &&
          crewIds.has(r.crew) &&
          isTime(r.at) &&
          isText(r.note),
      ),
      downlinks: cleanList(
        v3.downlinks,
        (d) =>
          typeof d.id === "string" &&
          isTime(d.at) &&
          isText(d.text, 20000) &&
          Array.isArray(d.rows) &&
          d.rows.every(validRow),
      ),
      uplinks: cleanList(
        v3.uplinks,
        (u) =>
          typeof u.id === "string" &&
          isTime(u.at) &&
          isText(u.text) &&
          typeof u.acknowledged === "boolean" &&
          (u.crew === null || crewIds.has(u.crew)) &&
          typeof u.replyTo === "string",
      ),
    };
    const dropped =
      (v3.records?.length ?? 0) -
      records.length +
      ((v3.reviews?.length ?? 0) - state.reviews.length) +
      ((v3.downlinks?.length ?? 0) - state.downlinks.length) +
      ((v3.uplinks?.length ?? 0) - state.uplinks.length);
    // Keep the fictional crew current: if its history no longer reaches
    // yesterday (or is missing), regenerate it. Own entries are kept.
    const lastDemo = records.filter((r) => r.synthetic).at(-1);
    const yesterday = new Date(now);
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    // Also regenerate if the demo looks dated in the future (device clock
    // moved back), so a real check-in today is never outranked.
    const refreshed =
      !lastDemo || dayKey(lastDemo.at) !== dayKey(yesterday.toISOString());
    if (refreshed)
      state.records = mergeDemo(
        records.filter((r) => !r.synthetic),
        now,
      );
    return { state, repaired: dropped > 0, refreshed, source: "saved" };
  }
  for (const legacy of legacyRaw) {
    const arr = parse(legacy);
    if (!Array.isArray(arr)) continue;
    const manual = arr
      .filter((r) => r && r.synthetic === false && validRecords([r]))
      .map((r) => ({ ...r, crew: crewIds.has(r.crew) ? r.crew : "c1" }));
    return {
      state: { ...emptyState(), records: mergeDemo(manual, now) },
      repaired: false,
      source: "migrated",
    };
  }
  return {
    state: seedState(now),
    repaired: v3 === undefined,
    source: "new",
  };
}

const byTime = (a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : 0);
function mergeDemo(manual, now) {
  return [...makeCrewDemo(now), ...manual].sort(byTime);
}

// Replace only the fictional data; the user's own check-ins, reviews and
// messages are kept.
export function resetDemo(state, now = new Date()) {
  const manual = state.records.filter((r) => !r.synthetic);
  return { ...state, records: mergeDemo(manual, now) };
}

export function addCheckin(state, entry) {
  if (!crewIds.has(entry.crew)) throw new Error("Unknown crew member");
  return {
    ...state,
    records: [...state.records, entry].sort(byTime).slice(-MAX_RECORDS),
  };
}

// CMO reviews a crew member's current alerts.
export function addReview(
  state,
  { crew: id, note, now = new Date(), id: rid },
) {
  if (!crewIds.has(id)) throw new Error("Unknown crew member");
  if (!isText(note, 500)) throw new Error("Write a short review note");
  return {
    ...state,
    reviews: [
      ...state.reviews,
      {
        id: rid ?? `rev-${now.getTime()}`,
        crew: id,
        at: now.toISOString(),
        note: note.trim(),
      },
    ],
  };
}

export function latestReview(state, id) {
  return (
    state.reviews
      .filter((r) => r.crew === id)
      .sort(byTime)
      .at(-1) ?? null
  );
}

// A review is current if no new check-in arrived after it.
export function reviewIsCurrent(state, id) {
  const rev = latestReview(state, id);
  if (!rev) return false;
  const last = state.records
    .filter((r) => r.crew === id)
    .sort(byTime)
    .at(-1);
  return !last || last.at <= rev.at;
}

// CMO packages the crew's status for the ground (store-and-forward).
export function makeDownlink(state, now = new Date()) {
  const rows = crewTriage(state.records, now).map((c) => ({
    id: c.id,
    name: c.name,
    role: c.role,
    score: c.readiness.score,
    band: c.readiness.band,
    sustained: c.escalation?.metrics ?? [],
    pending: c.readiness.pending,
    checkin: c.checkin.text,
    review: latestReview(state, c.id)?.note ?? null,
  }));
  const reviews = rows
    .filter((r) => r.review)
    .map((r) => `  ${r.name}: CMO note: ${r.review}`);
  const text = [
    groundReport(state.records, now),
    ...(reviews.length ? ["", "Crew medical officer notes:", ...reviews] : []),
  ].join("\n");
  return { id: `dl-${now.getTime()}`, at: now.toISOString(), rows, text };
}

export function addDownlink(state, now = new Date()) {
  return {
    ...state,
    downlinks: [...state.downlinks, makeDownlink(state, now)],
  };
}

// Ground flight surgeon replies to a specific downlink.
export function addUplink(state, { text, now = new Date(), crew: id = null }) {
  if (!isText(text, 1000)) throw new Error("Write a short recommendation");
  const ref = state.downlinks.at(-1);
  if (!ref) throw new Error("No crew report has been received yet");
  return {
    ...state,
    uplinks: [
      ...state.uplinks,
      {
        id: `ul-${now.getTime()}`,
        at: now.toISOString(),
        text: text.trim(),
        crew: crewIds.has(id) ? id : null,
        replyTo: ref.id,
        acknowledged: false,
      },
    ],
  };
}

export function acknowledgeUplink(state, uid) {
  return {
    ...state,
    uplinks: state.uplinks.map((u) =>
      u.id === uid ? { ...u, acknowledged: true } : u,
    ),
  };
}

export function minutesSince(iso, now = new Date()) {
  return Math.max(0, Math.round((now - Date.parse(iso)) / 60000));
}

// Storage probe: can this browser really keep data between visits?
export function probeStorage(storage) {
  try {
    const k = "astra-probe";
    storage.setItem(k, "1");
    const ok = storage.getItem(k) === "1";
    storage.removeItem(k);
    return ok;
  } catch {
    return false;
  }
}

// Two tabs may save at once. Merge what is stored with what this tab is
// about to save, so nobody's entries are lost. Nothing in ASTRA is ever
// deleted except fictional records on reset, so a union by id is safe.
export function mergeStates(stored, next) {
  const union = (a, b) => {
    const m = new Map(a.map((x) => [x.id, x]));
    for (const x of b) m.set(x.id, x);
    return [...m.values()].sort(byTime);
  };
  const ackd = new Set(
    stored.uplinks.filter((u) => u.acknowledged).map((u) => u.id),
  );
  return {
    version: 3,
    records: union(
      stored.records.filter((r) => !r.synthetic),
      next.records,
    ).slice(-MAX_RECORDS),
    reviews: union(stored.reviews, next.reviews),
    downlinks: union(stored.downlinks, next.downlinks),
    uplinks: union(stored.uplinks, next.uplinks).map((u) =>
      ackd.has(u.id) ? { ...u, acknowledged: true } : u,
    ),
  };
}

export { LEGACY_KEYS };
