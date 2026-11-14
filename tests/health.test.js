import test from "node:test";
import assert from "node:assert/strict";
import {
  metrics,
  validateReading,
  assess,
  makeDemo,
  validRecords,
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
