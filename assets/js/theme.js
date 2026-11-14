/* =============================================================================
   theme.js — applies colors/fonts from config.js and handles LIGHT/DARK mode.
   Dark is the default. The choice is saved to localStorage and re-applied on
   every page. window.toggleTheme() flips it; the #theme-toggle button calls it.
   ========================================================================== */
/* WebKit (Safari on macOS, every browser on iOS / iPadOS) gets lighter
   rendering paths: html.is-webkit (styles.css, fx.js, scene.js) */
(function () {
  var ua = navigator.userAgent;
  var ios = /iP(hone|ad|od)/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  var safari = /^((?!chrome|chromium|android|crios|fxios|edg|opr).)*safari/i.test(ua);
  if (/[?&]webkit\b/.test(location.search)) safari = true;   // preview the Safari path elsewhere
  if (ios || safari) document.documentElement.classList.add("is-webkit");
  if (ios) document.documentElement.classList.add("is-ios");
})();
(function () {
  var cfg = window.SITE_CONFIG;
  if (!cfg || !cfg.theme) return;

  var dark = cfg.theme.colors || {};
  var light = cfg.theme.light || {};
  var KEY = "pt-theme";
  // text color that sits on top of the accent (button) color
  var ON_ACCENT = { dark: "#131209", light: "#FFFFFF" };

  function colorsFor(mode) {
    return mode === "light" ? Object.assign({}, dark, light) : dark;
  }

  function apply(mode) {
    var c = colorsFor(mode);
    var root = document.documentElement;
    var map = {
      "--bg": c.bg, "--bg-elevated": c.bgElevated, "--navy": c.navy,
      "--navy-light": c.navyLight, "--gold": c.gold, "--gold-soft": c.goldSoft,
      "--text": c.text, "--muted": c.muted, "--line": c.line
    };
    Object.keys(map).forEach(function (k) { if (map[k]) root.style.setProperty(k, map[k]); });
    root.style.setProperty("--on-accent", ON_ACCENT[mode] || ON_ACCENT.dark);

    var f = cfg.theme.fonts || {};
    if (f.display) root.style.setProperty("--font-display", f.display);
    if (f.body) root.style.setProperty("--font-body", f.body);

    root.setAttribute("data-theme", mode);
    try { localStorage.setItem(KEY, mode); } catch (e) {}

    // keep the 3D scenes in sync (fog / stars / building lines react to the theme)
    if (window.__SCENE && window.__SCENE.applyTheme) window.__SCENE.applyTheme(c);
    if (window.__BUILDING && window.__BUILDING.applyTheme) window.__BUILDING.applyTheme();
  }

  var saved;
  try { saved = localStorage.getItem(KEY); } catch (e) {}
  apply(saved === "light" || saved === "dark" ? saved : "dark");

  window.toggleTheme = function () {
    var cur = document.documentElement.getAttribute("data-theme") || "dark";
    apply(cur === "light" ? "dark" : "light");
  };

  document.addEventListener("DOMContentLoaded", function () {
    var btn = document.getElementById("theme-toggle");
    if (btn) btn.addEventListener("click", window.toggleTheme);
  });
})();
