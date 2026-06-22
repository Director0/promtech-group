/* =============================================================================
   cursor.js — custom glass pointer.
   A translucent, blurred ring trails the mouse (with a precise dot); it grows
   over interactive elements, shrinks on click, and turns into a caret bar over
   text fields. Desktop only (fine pointer); touch keeps the native cursor.
   Disable via  SITE_CONFIG.cursor = { enabled: false }.
   ========================================================================== */
(function () {
  var cfg = window.SITE_CONFIG && window.SITE_CONFIG.cursor;
  if (cfg && cfg.enabled === false) return;
  // only on devices with a precise pointer that can hover
  if (!window.matchMedia || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var ring = document.createElement("div"); ring.className = "cursor";
  var dot = document.createElement("div"); dot.className = "cursor-dot";
  document.body.appendChild(ring);
  document.body.appendChild(dot);
  document.documentElement.classList.add("has-cursor");

  var INTERACTIVE = "a, button, input, textarea, select, label, summary, .card, .filter, .theme-toggle, [data-cursor]";
  var TEXTFIELD = 'input:not([type=button]):not([type=submit]):not([type=checkbox]):not([type=radio]), textarea, [contenteditable="true"]';

  var mx = window.innerWidth / 2, my = window.innerHeight / 2; // target (dot)
  var rx = mx, ry = my;                                        // ring (lagged)
  var ready = false;

  window.addEventListener("mousemove", function (e) {
    mx = e.clientX; my = e.clientY;
    if (!ready) { ready = true; rx = mx; ry = my; ring.classList.add("ready"); dot.classList.add("ready"); }
    dot.style.transform = "translate(" + mx + "px," + my + "px) translate(-50%,-50%)";

    var t = e.target;
    var isText = !!(t && t.closest && t.closest(TEXTFIELD));
    var isInteractive = !isText && !!(t && t.closest && t.closest(INTERACTIVE));
    ring.classList.toggle("is-text", isText);
    ring.classList.toggle("is-hover", isInteractive);
    dot.classList.toggle("is-hover", isInteractive || isText);
  }, { passive: true });

  window.addEventListener("mousedown", function () { ring.classList.add("is-down"); }, { passive: true });
  window.addEventListener("mouseup", function () { ring.classList.remove("is-down"); }, { passive: true });
  document.addEventListener("mouseleave", function () { ring.classList.add("hidden"); dot.classList.add("hidden"); });
  document.addEventListener("mouseenter", function () { ring.classList.remove("hidden"); dot.classList.remove("hidden"); });

  function loop() {
    var k = reduce ? 1 : 0.2;
    rx += (mx - rx) * k;
    ry += (my - ry) * k;
    ring.style.transform = "translate(" + rx + "px," + ry + "px) translate(-50%,-50%)";
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();
