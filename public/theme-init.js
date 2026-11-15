/* Follow the OS before first paint. Legacy astra-theme overrides are ignored.
   This script never reads, writes or deletes health records or preferences. */
(function () {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  function apply() {
    const resolved = media.matches ? "dark" : "light";
    document.documentElement.dataset.theme = resolved;
    document.documentElement.style.colorScheme = resolved;
  }
  media.addEventListener("change", apply);
  apply();
})();
