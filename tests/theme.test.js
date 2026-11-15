import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
const source = readFileSync(
  new URL("../public/theme-init.js", import.meta.url),
  "utf8",
);
function browser(dark, saved) {
  const listeners = [],
    storage = new Map([
      ["astra-theme", saved],
      ["astra-mission-v3", "health-data"],
    ]);
  const media = {
    matches: dark,
    addEventListener(type, fn) {
      assert.equal(type, "change");
      listeners.push(fn);
    },
  };
  const root = { dataset: {}, style: {} };
  const window = {
    matchMedia(query) {
      assert.equal(query, "(prefers-color-scheme: dark)");
      return media;
    },
  };
  // Appearance must work even if reading localStorage would throw (blocked storage).
  Object.defineProperty(window, "localStorage", {
    get() {
      throw new Error("Appearance must not access storage");
    },
  });
  vm.runInNewContext(source, {
    window,
    localStorage: window.localStorageProxy,
    document: { documentElement: root },
  });
  return {
    root,
    storage,
    change(value) {
      media.matches = value;
      listeners.forEach((fn) => fn());
    },
  };
}
test("system appearance is applied before first paint in either OS appearance", () => {
  for (const dark of [false, true]) {
    const b = browser(dark);
    assert.equal(b.root.dataset.theme, dark ? "dark" : "light");
    assert.equal(b.root.style.colorScheme, dark ? "dark" : "light");
  }
});
test("appearance follows live OS changes in both directions", () => {
  const b = browser(false);
  b.change(true);
  assert.equal(b.root.dataset.theme, "dark");
  assert.equal(b.root.style.colorScheme, "dark");
  b.change(false);
  assert.equal(b.root.dataset.theme, "light");
  assert.equal(b.root.style.colorScheme, "light");
});
test("legacy overrides cannot affect system appearance or mutate health storage", () => {
  for (const saved of ["light", "dark", "system", "invalid"]) {
    const b = browser(saved === "light", saved);
    assert.equal(b.root.dataset.theme, saved === "light" ? "dark" : "light");
    assert.equal(b.storage.get("astra-theme"), saved);
    assert.equal(b.storage.get("astra-mission-v3"), "health-data");
  }
});
