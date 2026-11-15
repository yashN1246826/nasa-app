import test from "node:test";
import assert from "node:assert/strict";
import {
  STATE_KEY,
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
  probeStorage,
  mergeStates,
} from "../src/mission.js";
import { makeScenario, forCrew } from "../src/health.js";

const NOW = new Date(Date.UTC(2026, 10, 14, 12));
const entry = (o = {}) => ({
  id: "m1",
  crew: "c1",
  at: "2026-11-14T12:30:00.000Z",
  synthetic: false,
  pulse: 70,
  sleep: 7,
  water: 2,
  exercise: 90,
  mood: 4,
  ...o,
});

test("first visit seeds the fictional crew", () => {
  const { state, source } = loadState(null, [], NOW);
  assert.equal(source, "new");
  assert.ok(state.records.length > 50);
});
test("saved state survives a save/load round trip unchanged", () => {
  let s = addCheckin(seedState(NOW), entry());
  s = addReview(s, { crew: "c3", note: "Spoke with crew 3.", now: NOW });
  s = addDownlink(s, NOW);
  s = addUplink(s, { text: "Add a rest period.", crew: "c3", now: NOW });
  const back = loadState(JSON.stringify(s), [], NOW);
  assert.equal(back.repaired, false);
  assert.deepEqual(back.state, s);
});
test("the bug that emptied the app is repaired on load: crew-less demo data is replaced, own entries kept", () => {
  const broken = JSON.stringify({
    version: 3,
    records: [...makeScenario(NOW), entry()],
    reviews: [],
    downlinks: [],
    uplinks: [],
  });
  const { state, repaired } = loadState(broken, [], NOW);
  assert.equal(repaired, true);
  for (const id of ["c1", "c2", "c3", "c4", "c5"])
    assert.ok(forCrew(state.records, id).length >= 10);
  assert.ok(state.records.some((r) => r.id === "m1"));
});
test("older saved versions are migrated, keeping manual check-ins", () => {
  const v2 = JSON.stringify([...makeScenario(NOW), entry({ crew: undefined })]);
  const { state, source, repaired } = loadState(null, [v2], NOW);
  assert.equal(source, "migrated");
  assert.equal(repaired, false); // QA#13: told "upgraded", not "damaged"
  const mine = state.records.find((r) => r.id === "m1");
  assert.equal(mine.crew, "c1");
  assert.ok(forCrew(state.records, "c5").length >= 10);
});
test("corrupted storage never crashes and falls back to a fresh crew", () => {
  const { state, repaired } = loadState("{not json", [], NOW);
  assert.equal(repaired, true);
  assert.ok(state.records.length > 50);
  const { state: s2 } = loadState(
    JSON.stringify({ records: [{ junk: 1 }], reviews: "x" }),
    [],
    NOW,
  );
  assert.ok(s2.records.length > 50);
  assert.deepEqual(s2.reviews, []);
});
test("reset replaces only fictional data", () => {
  let s = addCheckin(seedState(NOW), entry());
  s = addReview(s, { crew: "c3", note: "Reviewed.", now: NOW });
  const r = resetDemo(s, new Date(Date.UTC(2026, 10, 20)));
  assert.ok(r.records.some((x) => x.id === "m1"));
  assert.equal(r.reviews.length, 1);
  assert.ok(forCrew(r.records, "c1").length >= 14);
});
test("check-ins are stored in time order and rejected for unknown crew", () => {
  const s = addCheckin(seedState(NOW), entry());
  assert.equal(forCrew(s.records, "c1").at(-1).id, "m1");
  assert.throws(() => addCheckin(s, entry({ crew: "x9" })));
});
test("a review is current until a newer check-in arrives", () => {
  let s = addReview(seedState(NOW), {
    crew: "c3",
    note: "Checked in with crew 3.",
    now: NOW,
  });
  assert.equal(latestReview(s, "c3").note, "Checked in with crew 3.");
  assert.equal(reviewIsCurrent(s, "c3"), true);
  s = addCheckin(s, entry({ crew: "c3", id: "later" }));
  assert.equal(reviewIsCurrent(s, "c3"), false);
  assert.throws(() => addReview(s, { crew: "c3", note: "   " }));
});
test("downlink carries the crew picture and the CMO's notes", () => {
  let s = addReview(seedState(NOW), {
    crew: "c3",
    note: "Extra rest scheduled.",
    now: NOW,
  });
  s = addDownlink(s, NOW);
  const d = s.downlinks.at(-1);
  assert.equal(d.rows[0].id, "c3");
  assert.equal(d.rows[0].review, "Extra rest scheduled.");
  assert.match(d.text, /Requesting ground review for: Crew 3/);
  assert.match(d.text, /CMO note: Extra rest scheduled/);
});
test("ground can only reply after a report arrives, and the CMO acknowledges", () => {
  const s0 = seedState(NOW);
  assert.throws(() => addUplink(s0, { text: "Hello" }), /No crew report/);
  let s = addUplink(addDownlink(s0, NOW), {
    text: "Repeat HR twice daily.",
    crew: "c3",
    now: NOW,
  });
  const u = s.uplinks[0];
  assert.equal(u.acknowledged, false);
  assert.equal(u.replyTo, s.downlinks[0].id);
  s = acknowledgeUplink(s, u.id);
  assert.equal(s.uplinks[0].acknowledged, true);
});
test("storage probe reports blocked storage honestly", () => {
  const mem = new Map();
  const ok = {
    setItem: (k, v) => mem.set(k, v),
    getItem: (k) => mem.get(k) ?? null,
    removeItem: (k) => mem.delete(k),
  };
  assert.equal(probeStorage(ok), true);
  assert.equal(
    probeStorage({
      setItem() {
        throw new Error("blocked");
      },
    }),
    false,
  );
  assert.equal(
    probeStorage({ setItem() {}, getItem: () => null, removeItem() {} }),
    false,
  );
  assert.equal(STATE_KEY, "astra-mission-v3");
});

test("QA#2: any malformed saved item is dropped instead of crashing the app", () => {
  let s = addDownlink(seedState(NOW), NOW);
  s = addUplink(s, { text: "ok", now: NOW });
  const bad = JSON.parse(JSON.stringify(s));
  bad.uplinks.push({ ...bad.uplinks[0], id: "u2", crew: "c9" });
  bad.downlinks.push({ ...bad.downlinks[0], id: "d2", rows: [{ id: "c1" }] });
  bad.downlinks.push({ ...bad.downlinks[0], id: "d3", rows: [null] });
  bad.records.push({ ...bad.records[0], id: "x", verify: ["foo"] });
  const { state, repaired } = loadState(JSON.stringify(bad), [], NOW);
  assert.equal(repaired, true);
  assert.equal(state.uplinks.length, 1);
  assert.equal(state.downlinks.length, 1);
  assert.ok(!state.records.some((r) => r.id === "x"));
});
test("QA#3: two tabs saving at once keep both people's entries", () => {
  const base = seedState(NOW);
  const tabA = addCheckin(base, entry({ id: "a1", crew: "c4" }));
  const stored = tabA; // tab A saved first
  const tabB = addReview(base, { crew: "c3", note: "Reviewed.", now: NOW }); // tab B never saw a1
  const merged = mergeStates(stored, tabB);
  assert.ok(merged.records.some((r) => r.id === "a1"));
  assert.equal(merged.reviews.length, 1);
  const ack = acknowledgeUplink(
    addUplink(addDownlink(base, NOW), { text: "x", now: NOW }),
    "ul-" + NOW.getTime(),
  );
  const notAck = addUplink(addDownlink(base, NOW), { text: "x", now: NOW });
  assert.equal(mergeStates(ack, notAck).uplinks[0].acknowledged, true);
});
test("QA#6: an old demo crew is refreshed on the next visit, keeping own entries", () => {
  const s = addCheckin(seedState(NOW), entry());
  const later = new Date(Date.UTC(2026, 10, 17, 9));
  const { state, refreshed } = loadState(JSON.stringify(s), [], later);
  assert.equal(refreshed, true);
  assert.ok(state.records.some((r) => r.id === "m1"));
  const lastDemo = state.records.filter((r) => r.synthetic).at(-1);
  assert.equal(lastDemo.at.slice(0, 10), "2026-11-16");
  const same = loadState(
    JSON.stringify(s),
    [],
    new Date(Date.UTC(2026, 10, 14, 20)),
  );
  assert.equal(same.refreshed, false);
});

test("QA2: a demo dated in the future (clock moved back) is regenerated", () => {
  const s = addCheckin(seedState(NOW), entry());
  const earlier = new Date(Date.UTC(2026, 10, 9, 9));
  const { state, refreshed } = loadState(JSON.stringify(s), [], earlier);
  assert.equal(refreshed, true);
  assert.ok(
    state.records
      .filter((r) => r.synthetic)
      .every((r) => r.at.slice(0, 10) <= "2026-11-08"),
  );
});
test("QA2: duplicate ids and non-UTC timestamps are cleaned on load", () => {
  const s = seedState(NOW);
  const dup = { ...entry(), id: "same" };
  const raw = {
    ...s,
    records: [
      ...s.records,
      dup,
      { ...dup, pulse: 80 },
      { ...entry(), id: "tz", at: "2026-11-14T10:00:00-05:00" },
    ],
  };
  const { state } = loadState(JSON.stringify(raw), [], NOW);
  assert.equal(state.records.filter((r) => r.id === "same").length, 1);
  assert.ok(!state.records.some((r) => r.id === "tz"));
});

test("received snapshots retain their rows and notes after later local changes and reload", () => {
  let state = addReview(seedState(NOW), {
    crew: "c3",
    note: "Original observation context.",
    now: NOW,
  });
  state = addDownlink(state, NOW);
  const received = structuredClone(state.downlinks[0]);
  const later = new Date(NOW.getTime() + 3600000);
  state = addCheckin(
    state,
    entry({
      id: "after-report",
      crew: "c3",
      at: later.toISOString(),
      pulse: 65,
    }),
  );
  state = addReview(state, {
    crew: "c3",
    note: "Later local context.",
    now: later,
  });
  state = addDownlink(state, later);
  state = addUplink(state, {
    text: "Demo acknowledgment requested.",
    now: later,
  });
  state = acknowledgeUplink(state, state.uplinks[0].id);
  assert.deepEqual(state.downlinks[0], received);
  assert.equal(
    state.downlinks[1].rows.find((c) => c.id === "c3").review,
    "Later local context.",
  );
  const restored = loadState(JSON.stringify(state), [], later).state;
  assert.deepEqual(restored.downlinks[0], received);
  assert.equal(restored.uplinks[0].replyTo, restored.downlinks[1].id);
  assert.equal(restored.uplinks[0].acknowledged, true);
});
