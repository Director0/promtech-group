/* =============================================================================
   fx.js — shared visual effects for every page (plain script, sets window.FX).
     • inertial smooth scroll (Lenis, loaded from CDN before this file)
     • smooth anchor navigation that respects the fixed nav
     • film grain overlay
     • spotlight borders that follow the cursor
     • project card stack depth (home)          → FX.initStack(grid)
     • tagline words lighting up on scroll (home) → FX.initTagline(el)
   Everything degrades gracefully: no Lenis → native scroll, reduced motion →
   static states, touch devices → no spotlight / stack depth.
   ========================================================================== */
(function () {
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  var lenis = null;

  /* ---------- inertial scroll ---------- */
  function initLenis() {
    if (reduce || typeof window.Lenis !== "function") return;
    lenis = new window.Lenis({ duration: 1.15, easing: function (t) { return 1 - Math.pow(1 - t, 4); } });
    function raf(time) { lenis.raf(time); requestAnimationFrame(raf); }
    requestAnimationFrame(raf);
    window.__LENIS = lenis;

    // pause while a modal / lightbox / mobile menu locks the page
    var mo = new MutationObserver(function () {
      var locked = document.body.style.overflow === "hidden" ||
                   !!document.querySelector(".nav-links.open");
      if (locked) lenis.stop(); else lenis.start();
    });
    mo.observe(document.body, { attributes: true, attributeFilter: ["style"] });
    var nl = document.getElementById("nav-links");
    if (nl) mo.observe(nl, { attributes: true, attributeFilter: ["class"] });
  }

  /* ---------- anchors (#section and index.html#section on the home page) ---------- */
  function navOffset() {
    var v = getComputedStyle(document.documentElement).getPropertyValue("--nav-h");
    return (parseInt(v, 10) || 64) + 24;
  }
  function initAnchors() {
    document.addEventListener("click", function (e) {
      var a = e.target.closest("a[href*='#']");
      if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey) return;
      var url = new URL(a.getAttribute("href"), location.href);
      if (url.pathname !== location.pathname || !url.hash) return;
      var id = decodeURIComponent(url.hash.slice(1));
      var target = id === "main" ? document.getElementById("main") : document.getElementById(id);
      if (!target) return;
      e.preventDefault();
      if (lenis) lenis.scrollTo(target, { offset: id === "home" ? 0 : -navOffset() });
      else window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - (id === "home" ? 0 : navOffset()),
                             behavior: reduce ? "auto" : "smooth" });
      if (id === "main") target.setAttribute("tabindex", "-1"), target.focus({ preventScroll: true });
      history.replaceState(null, "", "#" + id);
    });
  }

  /* ---------- film grain (fixed, pointer-events: none) ---------- */
  function initGrain() {
    if (document.querySelector(".grain")) return;
    var g = document.createElement("div");
    g.className = "grain";
    g.setAttribute("aria-hidden", "true");
    document.body.appendChild(g);
  }

  /* ---------- spotlight borders ---------- */
  var SPOT = ".card, .benefit, .news-card, .form, .fact, .aside-card, .doc-item, .process-step";
  function initSpotlight() {
    if (!finePointer) return;
    document.addEventListener("pointermove", function (e) {
      var el = e.target.closest && e.target.closest(SPOT);
      if (!el) return;
      var r = el.getBoundingClientRect();
      el.style.setProperty("--mx", (e.clientX - r.left) + "px");
      el.style.setProperty("--my", (e.clientY - r.top) + "px");
    }, { passive: true });
  }

  /* ---------- project card stack: covered cards recede ---------- */
  var stackGrid = null, stackTick = false;
  var wide = window.matchMedia("(min-width: 861px)");
  function updateStack() {
    stackTick = false;
    if (!stackGrid) return;
    var cards = Array.prototype.filter.call(stackGrid.querySelectorAll(".card"), function (c) {
      return c.style.display !== "none";
    });
    var active = wide.matches && !reduce;
    cards.forEach(function (card, i) {
      var p = 0, next = cards[i + 1];
      if (active && next) {
        var a = card.getBoundingClientRect(), b = next.getBoundingClientRect();
        // 0 while the next card is a full card away, 1 when it fully covers this one
        p = Math.min(Math.max(1 - (b.top - a.top) / a.height, 0), 1);
      }
      card.style.setProperty("--s", (1 - p * 0.06).toFixed(4));
      card.style.setProperty("--dim", (p * 0.55).toFixed(3));
    });
  }
  function requestStack() { if (!stackTick) { stackTick = true; requestAnimationFrame(updateStack); } }
  function initStack(grid) {
    stackGrid = grid;
    if (!grid) return;
    window.addEventListener("scroll", requestStack, { passive: true });
    window.addEventListener("resize", requestStack);
    requestStack();
  }

  /* ---------- tagline: words activate one by one past a trigger line ---------- */
  function initTagline(el) {
    if (!el) return;
    var words = el.querySelectorAll(".tl-word");
    if (reduce || !("IntersectionObserver" in window)) {
      words.forEach(function (w) { w.classList.add("on"); });
      return;
    }
    // the root extends far above the viewport, so a word stays "on" after it
    // scrolls past the top and turns off again only when scrolled back below
    // the trigger line (65% of the viewport height)
    var io = new IntersectionObserver(function (ents) {
      ents.forEach(function (en) { en.target.classList.toggle("on", en.isIntersecting); });
    }, { rootMargin: "10000px 0px -35% 0px", threshold: 0 });
    words.forEach(function (w) { io.observe(w); });
  }

  window.FX = { initStack: initStack, updateStack: requestStack, initTagline: initTagline };

  function boot() { initLenis(); initAnchors(); initGrain(); initSpotlight(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
