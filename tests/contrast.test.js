import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const css = readFileSync(new URL("../src/style.css", import.meta.url), "utf8");
const declarations = [...css.matchAll(/:root\s*\{([^}]+)\}/g)].slice(0, 2);
function luminance(hex) {
  const rgb = hex
    .slice(1)
    .match(/../g)
    .map((v) => parseInt(v, 16) / 255)
    .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
}
function ratio(a, b) {
  const x = luminance(a),
    y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
for (const [index, block] of declarations.entries()) {
  const tokens = Object.fromEntries(
    [...block[1].matchAll(/--([\w-]+):\s*(#[0-9a-f]{6});/g)].map((m) => [
      m[1],
      m[2],
    ]),
  );
  test(`${index ? "dark" : "light"} semantic colors: text, selection, errors, disabled controls and focus`, () => {
    for (const background of ["canvas", "surface", "raised", "selected"]) {
      for (const foreground of [
        "text",
        "secondary",
        "accent",
        "review",
        "positive",
        "error",
      ]) {
        const actual = ratio(tokens[foreground], tokens[background]);
        assert.ok(
          actual >= 4.5,
          `${foreground}/${background}: ${actual.toFixed(2)}`,
        );
      }
      for (const foreground of ["control", "focus"]) {
        const actual = ratio(tokens[foreground], tokens[background]);
        assert.ok(
          actual >= 3,
          `${foreground}/${background}: ${actual.toFixed(2)}`,
        );
      }
    }
    assert.ok(ratio(tokens["on-accent"], tokens.accent) >= 4.5);
  });
}
