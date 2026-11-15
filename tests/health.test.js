import test from "node:test";
import assert from "node:assert/strict";
import {
  metrics,
  validateReading,
  assess,
  makeDemo,
  validRecords,
  trendSummary,
  handoverSummary,
  personalBaseline,
  assessPersonal,
  sustainedChange,
  readiness,
  escalation,
  checkinStatus,
  qualityCheck,
  countermeasures,
  daily,
  dayPositions,
  crew,
  forCrew,
  makeCrewDemo,
  crewTriage,
  groundReport,
} from "../src/health.js";
test("missing, nonnumeric and out-of-range readings cannot become check-ins", () => {
  const good = { pulse: 64, sleep: 8, water: 2.5, exercise: 120, mood: 4 };
  assert.equal(validateReading(good), null);
  for (const bad of ["", null, undefined, NaN, Infinity, -1, 251])
    assert.ok(validateReading({ ...good, pulse: bad }));
  assert.ok(validateReading({ ...good, sleep: 25 }));
  assert.ok(validateReading({ ...good, mood: 0 }));
  assert.equal(validateReading({ ...good, exercise: 0 }), null);
});
test("review comparisons are explicit and missing readings never appear normal", () => {
  const pulse = metrics[0];
  assert.equal(assess(pulse, null), "No reading");
  assert.equal(assess(pulse, 64), "Near demo baseline");
  assert.equal(assess(pulse, 76), "Review change");
  assert.equal(assess(pulse, 52), "Review change");
});
test("synthetic records are valid and clearly marked; malformed storage is rejected", () => {
  const demo = makeDemo();
  assert.equal(validRecords(demo), true);
  assert.ok(demo.every((r) => r.synthetic));
  assert.equal(validRecords({}), false);
  assert.equal(validRecords([{ ...demo[0], at: "bad" }]), false);
  assert.equal(validRecords([{ ...demo[0], pulse: null }]), false);
});

const at = (day, h = 9, min = 0) =>
  new Date(Date.UTC(2026, 10, 1 + day, h, min)).toISOString();
const rec = (o = {}, day = 0, h = 9, min = 0) => ({
  id: `r${day}-${h}-${min}`,
  at: at(day, h, min),
  synthetic: false,
  crew: "c1",
  pulse: 64,
  sleep: 8,
  water: 2.5,
  exercise: 120,
  mood: 4,
  ...o,
});
const week = (n = 7) => Array.from({ length: n }, (_, i) => rec({}, i));
const NOW = new Date(Date.UTC(2026, 10, 14, 12));
const m = (id) => metrics.find((x) => x.id === id);

test("every reading is kept; analysis uses the latest reading of each day", () => {
  const r = [
    rec({ pulse: 64 }, 0, 8),
    rec({ pulse: 90 }, 0, 9),
    rec({ pulse: 66 }, 0, 10),
    rec({}, 1),
  ];
  assert.equal(daily(r).length, 2);
  assert.equal(daily(r)[0].pulse, 66);
  assert.match(
    checkinStatus(r.slice(0, 3), new Date(Date.UTC(2026, 10, 1, 20))).text,
    /3 readings; the latest counts/,
  );
});
test("one-sided indicators flag only the concerning direction", () => {
  assert.equal(
    assessPersonal([...week(), rec({ sleep: 9.9 }, 7)], m("sleep")).label,
    "Near your baseline",
  );
  assert.equal(
    assessPersonal([...week(), rec({ sleep: 6 }, 7)], m("sleep")).label,
    "Review change",
  );
  assert.equal(
    assessPersonal([...week(), rec({ pulse: 50 }, 7)], m("pulse")).label,
    "Review change",
  );
});
test("personal baseline needs 5 earlier days; repeat readings on one day don't count twice", () => {
  const sleepy = [6.5, 6.6, 6.4, 6.5].map((s, i) => rec({ sleep: s }, i));
  assert.equal(
    personalBaseline([...sleepy, rec({}, 4)], m("sleep")).personal,
    false,
  );
  assert.equal(
    assessPersonal([...sleepy, rec({ sleep: 6.5 }, 4)], m("sleep")).label,
    "Review change",
  );
  const dupes = [
    ...sleepy,
    rec({ sleep: 6.5 }, 3, 20),
    rec({ sleep: 6.5 }, 3, 21),
    rec({}, 4),
  ];
  assert.equal(personalBaseline(dupes, m("sleep")).personal, false);
  const five = [...sleepy, rec({ sleep: 6.5 }, 4), rec({ sleep: 6.5 }, 5)];
  assert.deepEqual(personalBaseline(five, m("sleep")), {
    value: 6.5,
    personal: true,
    n: 5,
  });
  assert.equal(assessPersonal(five, m("sleep")).label, "Near your baseline");
});
test("trend compares check-in days, not raw entries", () => {
  const r = [60, 60, 60, 70, 70, 70].map((p, i) => rec({ pulse: p }, i));
  assert.match(trendSummary(r, m("pulse")), /Rising: 10 bpm/);
  assert.match(trendSummary(r.slice(0, 2), m("pulse")), /Not enough/);
  assert.match(
    trendSummary(
      [...r, rec({ pulse: 99 }, 5, 8)].sort((a, b) => (a.at < b.at ? -1 : 1)),
      m("pulse"),
    ),
    /Rising: 10 bpm/,
  );
});
test("one bad day never escalates; three days in a row do", () => {
  const bad = { sleep: 5, mood: 2 };
  assert.equal(escalation([...week(), rec(bad, 7)]), null);
  const two = [...week(), rec(bad, 7), rec(bad, 8)];
  assert.equal(escalation(two), null);
  const three = [...two, rec(bad, 9)];
  assert.equal(sustainedChange(three, m("sleep")), true);
  assert.equal(escalation(three).level, "high");
  assert.equal(
    escalation([
      ...week(),
      rec({ sleep: 5 }, 7),
      rec({ sleep: 5 }, 8),
      rec({ sleep: 5 }, 9),
    ]).level,
    "watch",
  );
  // Three bad readings on the SAME day are one day, not a sustained change.
  assert.equal(
    escalation([...week(), rec(bad, 7, 8), rec(bad, 7, 9), rec(bad, 7, 10)]),
    null,
  );
});
test("readiness falls as indicators move the wrong way", () => {
  assert.equal(readiness(week()).score, 100);
  const worse = readiness([
    ...week(),
    rec({ sleep: 5, mood: 2, exercise: 40 }, 7),
  ]);
  assert.ok(worse.score < 60);
  assert.equal(worse.band, "Review with CMO");
  assert.ok(worse.drivers.includes("Sleep duration"));
  assert.equal(readiness([]).score, null);
});
test("check-in cadence counts missed days in station time (UTC)", () => {
  const r = [rec({}, 0)];
  assert.match(
    checkinStatus(r, new Date(Date.UTC(2026, 10, 1, 23, 59))).text,
    /Checked in today/,
  );
  assert.match(
    checkinStatus(r, new Date(Date.UTC(2026, 10, 2, 0, 1))).text,
    /due/,
  );
  const s = checkinStatus(r, new Date(Date.UTC(2026, 10, 4, 9)));
  assert.equal(s.missed, 2);
  assert.match(s.text, /Missed 2 days/);
});
test("implausible values are marked verify, kept out of baseline, and confirmed by a re-check", () => {
  const base = week();
  const typo = rec({ pulse: 140 }, 7, 9);
  assert.deepEqual(qualityCheck(base, typo), {
    verify: ["pulse"],
    confirmed: [],
  });
  assert.deepEqual(qualityCheck(base, rec({ pulse: 70 }, 7)), {
    verify: [],
    confirmed: [],
  });
  const withTypo = [...base, { ...typo, verify: ["pulse"] }];
  // Re-check gives a normal value: no flag.
  assert.deepEqual(qualityCheck(withTypo, rec({ pulse: 65 }, 7, 10)), {
    verify: [],
    confirmed: [],
  });
  // Re-check repeats the high value: confirmed, so it counts.
  assert.deepEqual(qualityCheck(withTypo, rec({ pulse: 138 }, 7, 10)), {
    verify: [],
    confirmed: ["pulse"],
  });
  // The unconfirmed typo never becomes part of anyone's baseline.
  const later = [
    ...withTypo,
    ...[8, 9, 10, 11, 12, 13, 14].map((d) => rec({}, d)),
  ];
  assert.equal(personalBaseline(later, m("pulse")).value, 64);
});
test("mood is self-reported and is never marked as a typo", () => {
  assert.deepEqual(qualityCheck(week(), rec({ mood: 1 }, 7)).verify, []);
  assert.equal(
    assessPersonal([...week(), rec({ mood: 1 }, 7)], m("mood")).label,
    "Review change",
  );
});
test("an unconfirmed reading is held back from the score but never ignored if it repeats", () => {
  const r = [...week(), { ...rec({ pulse: 140 }, 7), verify: ["pulse"] }];
  assert.equal(assessPersonal(r, m("pulse")).label, "Verify reading");
  const rd = readiness(r);
  assert.equal(rd.score, 100);
  assert.equal(rd.band, "Re-measure needed");
  assert.deepEqual(rd.pending, ["Resting heart rate"]);
  assert.equal(escalation(r), null);
  const repeated = [
    ...week(),
    ...[7, 8, 9].map((d) => ({ ...rec({ pulse: 140 }, d), verify: ["pulse"] })),
  ];
  assert.equal(sustainedChange(repeated, m("pulse")), true);
});
test("countermeasures match flagged indicators and pending re-measurements", () => {
  assert.deepEqual(countermeasures(week()), []);
  const t = countermeasures([...week(), rec({ sleep: 5.5 }, 7)]);
  assert.equal(t.length, 1);
  assert.match(t[0], /sleep window/);
  const v = countermeasures([
    ...week(),
    { ...rec({ pulse: 140 }, 7), verify: ["pulse"] },
  ]);
  assert.match(v[0], /Re-measure resting heart rate/);
});
test("chart positions follow the calendar so missed days show as gaps", () => {
  assert.deepEqual(
    dayPositions([rec({}, 0), rec({}, 1), rec({}, 5)]),
    [0, 0.2, 1],
  );
  assert.deepEqual(dayPositions([rec({}, 0)]), [0.5]);
});
test("handover lists every indicator with its baseline and status", () => {
  const out = handoverSummary(
    [...week(), rec({ pulse: 90 }, 7)],
    NOW,
    "Crew 1",
  );
  for (const x of metrics) assert.ok(out.includes(x.name));
  assert.match(out, /for Crew 1/);
  assert.match(out, /review: Resting heart rate/);
  assert.match(handoverSummary([], NOW), /No readings recorded/);
});
test("crew demo: valid, separate, and tells the intended story", () => {
  const all = makeCrewDemo(NOW);
  assert.equal(validRecords(all), true);
  assert.equal(new Set(all.map((r) => r.id)).size, all.length);
  for (const c of crew) assert.ok(forCrew(all, c.id).length >= 10);
  const rows = crewTriage(all, NOW);
  assert.equal(rows[0].id, "c3");
  assert.equal(rows[0].escalation.level, "high");
  assert.equal(rows[1].id, "c5");
  assert.equal(rows[1].checkin.missed, 2);
  assert.equal(rows[1].readiness.band, "No recent data");
  const c2 = rows.find((r) => r.id === "c2");
  assert.equal(c2.readiness.band, "Mission ready"); // typo was re-measured
  assert.match(c2.checkin.text, /due/); // demo ends yesterday: today is yours
  assert.ok(
    rows
      .filter((r) => !["c3", "c5"].includes(r.id))
      .every((r) => r.readiness.band === "Mission ready"),
  );
});
test("ground report names who needs review", () => {
  const txt = groundReport(makeCrewDemo(NOW), NOW);
  assert.match(txt, /Requesting ground review for: Crew 3/);
  for (const c of crew) assert.ok(txt.includes(c.name));
});
test("a crew member with no data is handled safely and prioritised", () => {
  const rows = crewTriage(forCrew(makeCrewDemo(NOW), "c1"), NOW);
  assert.equal(rows.find((r) => r.id === "c2").readiness.score, null);
  assert.equal(rows.at(-1).id, "c1");
});

test("QA#1: the demo never contains a reading from today or the future", () => {
  for (const hour of [0, 3, 8, 23]) {
    const now = new Date(Date.UTC(2026, 10, 14, hour, 5));
    const all = makeCrewDemo(now);
    assert.ok(
      all.every((r) => r.at.slice(0, 10) < "2026-11-14"),
      `hour ${hour}`,
    );
  }
});
test("QA#4: the readiness band never looks better than an active escalation", () => {
  const r = [
    ...week(),
    ...[7, 8, 9].map((d) => rec({ sleep: 6.5, water: 1.7 }, d)),
  ];
  assert.equal(escalation(r).level, "high");
  assert.equal(readiness(r).band, "Review with CMO");
  const w = [...week(), ...[7, 8, 9].map((d) => rec({ sleep: 6.5 }, d))];
  assert.equal(escalation(w).level, "watch");
  assert.notEqual(readiness(w).band, "Mission ready");
});
test("QA#5/16: stale data shows no score, in the dashboard and the handover alike", () => {
  const r = week();
  const later = new Date(Date.UTC(2026, 10, 12, 9));
  assert.deepEqual(
    [readiness(r, later).score, readiness(r, later).band],
    [null, "No recent data"],
  );
  assert.match(
    handoverSummary(r, later),
    /Readiness: -\/100 \(No recent data\)/,
  );
});
test("QA#8: no score is given when fewer than 3 indicators can be scored", () => {
  const r = [
    ...week(),
    {
      ...rec({ pulse: 250, sleep: 24, water: 15 }, 7),
      verify: ["pulse", "sleep", "water"],
    },
  ];
  assert.equal(readiness(r).score, null);
  assert.equal(readiness(r).band, "Re-measure needed");
});
test("QA#14: trend wording matches what is compared, and small wobbles are steady", () => {
  const four = [60, 60, 60, 70].map((p, i) => rec({ pulse: p }, i));
  assert.match(trendSummary(four, m("pulse")), /vs the check-in day before/);
  const wobble = [64, 64, 64, 65, 65, 65].map((p, i) => rec({ pulse: p }, i));
  assert.match(trendSummary(wobble, m("pulse")), /Steady/);
});
test("QA#2: records with a malformed verify list are rejected", () => {
  assert.equal(validRecords([{ ...rec(), verify: ["foo"] }]), false);
  assert.equal(validRecords([{ ...rec(), verify: "pulse" }]), false);
  assert.equal(validRecords([{ ...rec(), verify: ["pulse"] }]), true);
});
