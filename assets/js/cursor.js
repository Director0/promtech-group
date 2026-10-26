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

  // carry the pointer position across page transitions, so the cursor is
  // already in place on the new page instead of waiting for the next move
  var KEY = "pt-cursor-pos";
  function place() {
    dot.style.transform = "translate(" + mx + "px," + my + "px) translate(-50%,-50%)";
    ring.style.transform = "translate(" + rx + "px," + ry + "px) translate(-50%,-50%)";
  }
  try {
    var saved = JSON.parse(sessionStorage.getItem(KEY) || "null");
    if (saved && Date.now() - saved.t < 5000) {
      mx = rx = saved.x; my = ry = saved.y; ready = true;
      ring.classList.add("ready"); dot.classList.add("ready"); place();
    }
  } catch (e) {}
  function save() {
    if (!ready) return;
    try { sessionStorage.setItem(KEY, JSON.stringify({ x: mx, y: my, t: Date.now() })); } catch (e) {}
  }
  // during a page transition the cursor keeps its place instead of drifting
  // away with the old page (named only while the transition runs)
  function hold(vt) {
    if (!vt) return;
    ring.style.viewTransitionName = "pt-cursor-ring"; dot.style.viewTransitionName = "pt-cursor-dot";
    vt.finished.finally(function () { ring.style.viewTransitionName = ""; dot.style.viewTransitionName = ""; });
  }
  window.addEventListener("pageswap", function (e) { save(); hold(e.viewTransition); });
  window.addEventListener("pagereveal", function (e) { hold(e.viewTransition); });
  window.addEventListener("pagehide", save);
  window.addEventListener("pageshow", function (e) {
    if (e.persisted) { ring.classList.remove("hidden"); dot.classList.remove("hidden"); }
  });

  window.addEventListener("mousemove", function (e) {
    mx = e.clientX; my = e.clientY;
    if (!ready) { ready = true; rx = mx; ry = my; ring.classList.add("ready"); dot.classList.add("ready"); }
    // the pointer is evidently inside the page: never stay hidden
    ring.classList.remove("hidden"); dot.classList.remove("hidden");
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
  // leaving the window hides the cursor; it comes back on the next move
  document.documentElement.addEventListener("mouseleave", function (e) {
    if (e.relatedTarget) return;
    ring.classList.add("hidden"); dot.classList.add("hidden");
  });

  function loop() {
    var k = reduce ? 1 : 0.2;
    rx += (mx - rx) * k;
    ry += (my - ry) * k;
    ring.style.transform = "translate(" + rx + "px," + ry + "px) translate(-50%,-50%)";
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();
