// AI-assisted prototype. All scenario values and review rules are illustrative, not clinical.
export const metrics = [
  {
    id: "pulse",
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
  return Math.abs(Number(value) - metric.baseline) >= metric.delta
    ? "Review change"
    : "Near demo baseline";
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
export function validRecords(records) {
  return (
    Array.isArray(records) &&
    records.length <= 1000 &&
    records.every(
      (r) =>
        r &&
        typeof r.synthetic === "boolean" &&
        typeof r.id === "string" &&
        typeof r.at === "string" &&
        Number.isFinite(Date.parse(r.at)) &&
        !validateReading(r),
    )
  );
}
