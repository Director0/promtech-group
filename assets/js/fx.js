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
  var SPOT = ".benefit, .news-card, .form, .fact, .aside-card, .doc-item, .process-step";
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

  /* ---------- project deck ----------
     The cards wait face down in a pile. When the deck scrolls into view they
     are dealt one by one (arc up, flip over) into a fan, like a hand of
     playing cards. While the deck is pinned, scrolling turns the fan so the
     next card comes to the centre. Side cards recede and dim; the hovered
     card tilts towards the cursor with a glare. */
  var D = null;
  var DEAL_STAGGER = 0.08, DEAL_DUR = 0.75, GATHER_MS = 420;
  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }
  function pad2(n) { return String(n).padStart(2, "0"); }
  function $id(id) { return document.getElementById(id); }

  function deckMeasure() {
    var first = D.cards[0] || D.all[0];
    D.cardH = (first && first.el.offsetHeight) || 420;
    D.narrow = window.innerWidth < 640;
    D.step = D.narrow ? 13 : 9;              // degrees between neighbours
    D.R = D.cardH * (D.narrow ? 2.1 : 2.6);  // radius of the arc the fan sits on
    var n = D.cards.length;
    D.root.style.height = n > 1 ? "calc(100dvh + " + (n - 1) * (D.narrow ? 34 : 42) + "vh)" : "100dvh";
  }

  function deckReadScroll() {
    var n = D.cards.length;
    var span = D.root.offsetHeight - window.innerHeight;
    var p = span > 0 ? clamp01(-D.root.getBoundingClientRect().top / span) : 0;
    D.p = p;
    D.target = p * Math.max(n - 1, 0);
  }

  function deckScrollTo(k) {
    var n = D.cards.length;
    if (n < 2) return;
    k = Math.max(0, Math.min(n - 1, k));
    var top = D.root.getBoundingClientRect().top + window.scrollY;
    var y = top + (D.root.offsetHeight - window.innerHeight) * k / (n - 1) + 1;
    if (lenis) lenis.scrollTo(y, { duration: 1.1 });
    else window.scrollTo({ top: y, behavior: reduce ? "auto" : "smooth" });
  }

  function deckFrame(now) {
    if (!D.running) { D.raf = 0; return; }
    D.raf = requestAnimationFrame(deckFrame);
    deckReadScroll();
    D.pos += (D.target - D.pos) * 0.12;
    if (Math.abs(D.target - D.pos) < 0.0005) D.pos = D.target;

    var n = D.cards.length;
    var tDeal = D.dealt ? (now - D.dealStart) / 1000 : -1;
    var g = D.gathering ? clamp01((now - D.gatherStart) / GATHER_MS) : 1;
    if (D.gathering && g >= 1) D.gathering = false;

    for (var i = 0; i < n; i++) {
      var c = D.cards[i];
      var d = i - D.pos, ad = Math.abs(d), dc = Math.max(-6, Math.min(6, d));
      // pose in the fan
      var th = dc * D.step * Math.PI / 180;
      var fx = Math.sin(th) * D.R, fy = (1 - Math.cos(th)) * D.R;
      var fr = dc * D.step, fs = 1 - Math.min(ad, 4) * 0.05;
      // pose in the pile (face down, slightly messy, lower than the fan)
      var pr = (((i * 37) % 9) - 4) * 0.9, py = D.cardH * 0.1 + Math.min(i, 8) * 3, ps = 0.92;
      var e = tDeal < 0 ? 0 : easeOut(clamp01((tDeal - i * DEAL_STAGGER) / DEAL_DUR));

      var x, y, r, s, f;
      if (D.gathering) {
        var ge = easeOut(g);
        x = lerp(c.x, 0, ge); y = lerp(c.y, py, ge); r = lerp(c.r, pr, ge);
        s = lerp(c.s, ps, ge); f = lerp(c.f, 180, ge); e = 0;
      } else {
        x = fx * e;
        y = lerp(py, fy, e) - Math.sin(e * Math.PI) * D.cardH * 0.22; // arcs up while dealt
        r = lerp(pr, fr, e); s = lerp(ps, fs, e); f = 180 * (1 - e);
      }
      if (!D.gathering) { c.x = x; c.y = y; c.r = r; c.s = s; c.f = f; }

      var fade = ad > 4.5 ? clamp01(5.5 - ad) : 1;
      var op = lerp(1, fade, e);
      var dim = e * Math.min(ad, 3) / 3 * 0.6;
      var z = e <= 0 ? 10 + (n - i) : e < 1 ? 500 + i : 300 - Math.round(ad * 10);

      // hover tilt eases towards its target
      c.rx += (c.trx - c.rx) * 0.14; c.ry += (c.try_ - c.ry) * 0.14; c.gl += (c.tgl - c.gl) * 0.14;

      var tf = "translate(-50%,-50%) translate3d(" + x.toFixed(1) + "px," + y.toFixed(1) + "px,0) rotate(" +
               r.toFixed(2) + "deg) scale(" + s.toFixed(4) + ")";
      var ti = "rotateY(" + f.toFixed(1) + "deg) rotateX(" + c.rx.toFixed(2) + "deg) rotateY(" + c.ry.toFixed(2) + "deg)";
      if (tf !== c.tf) { c.el.style.transform = tf; c.tf = tf; }
      if (ti !== c.ti) { c.inner.style.transform = ti; c.ti = ti; }
      if (z !== c.z) { c.el.style.zIndex = z; c.z = z; }
      var ops = op.toFixed(3), dims = dim.toFixed(3), gls = c.gl.toFixed(3);
      if (ops !== c.op) { c.el.style.opacity = ops; c.el.style.visibility = op < 0.01 ? "hidden" : ""; c.op = ops; }
      if (dims !== c.dim) { c.el.style.setProperty("--dim", dims); c.dim = dims; }
      if (gls !== c.glS) { c.el.style.setProperty("--glare", gls); c.glS = gls; }
      var active = e >= 1 && ad < 0.5;
      if (active !== c.active) { c.el.classList.toggle("is-active", active); c.active = active; }
      c.e = e;
    }

    // HUD: counter, progress, arrows, hint
    var idx = n ? Math.max(0, Math.min(n - 1, Math.round(D.pos))) : 0;
    if (idx !== D.idx) {
      D.idx = idx;
      if (D.curEl) D.curEl.textContent = pad2(n ? idx + 1 : 0);
      if (D.prev) D.prev.disabled = idx <= 0;
      if (D.next) D.next.disabled = idx >= n - 1;
    }
    if (D.bar) D.bar.style.transform = "scaleX(" + (n > 1 ? D.pos / (n - 1) : 1).toFixed(4) + ")";
    if (D.hint) D.hint.classList.toggle("is-hidden", D.pos > 0.2);
  }

  function deckStart() {
    if (D.running) return;
    D.running = true;
    if (!D.raf) D.raf = requestAnimationFrame(deckFrame);
  }

  function refreshDeck() {
    if (!D || D.static) return;
    D.cards = D.all.filter(function (c) { return c.el.style.display !== "none"; });
    if (D.totalEl) D.totalEl.textContent = pad2(D.cards.length);
    D.idx = -1;
    deckMeasure();
    if (D.dealt) {
      // sweep the cards back into the pile, then deal the new hand
      var now = performance.now();
      D.gathering = true; D.gatherStart = now; D.dealStart = now + GATHER_MS;
      D.cards.forEach(function (c) { c.trx = c.try_ = c.tgl = 0; });
      // bring the fan back to its first card
      if (D.root.getBoundingClientRect().top < 0) {
        var top = D.root.getBoundingClientRect().top + window.scrollY;
        if (lenis) lenis.scrollTo(top, { immediate: true }); else window.scrollTo(0, top);
      }
      D.pos = 0;
    }
    deckStart();
  }

  function initDeck(root) {
    if (!root) return;
    var fan = root.querySelector(".deck-fan");
    if (!fan) return;
    D = {
      root: root, fan: fan, cards: [], pos: 0, target: 0, p: 0, idx: -1,
      dealt: false, dealStart: 0, gathering: false, gatherStart: 0, running: false, raf: 0,
      curEl: $id("deck-cur"), totalEl: $id("deck-total"), bar: $id("deck-bar"),
      prev: $id("deck-prev"), next: $id("deck-next"), hint: $id("deck-hint"), hover: null
    };
    D.all = Array.prototype.map.call(fan.querySelectorAll(".card"), function (el) {
      return { el: el, inner: el.querySelector(".pcard-inner"), x: 0, y: 0, r: 0, s: 1, f: 180,
               rx: 0, ry: 0, trx: 0, try_: 0, gl: 0, tgl: 0, e: 0 };
    });

    if (reduce) {
      // no motion: a plain wall of face-up cards
      D.static = true;
      root.classList.add("deck--static");
      return;
    }

    refreshDeck();

    // run the loop only while the deck is near the viewport
    new IntersectionObserver(function (ents) {
      ents.forEach(function (en) { if (en.isIntersecting) deckStart(); else D.running = false; });
    }, { rootMargin: "200px 0px" }).observe(root);

    // deal once the deck is well inside the viewport
    var dealIO = new IntersectionObserver(function (ents) {
      ents.forEach(function (en) {
        if (en.isIntersecting && !D.dealt) {
          D.dealt = true; D.dealStart = performance.now(); dealIO.disconnect();
        }
      });
    }, { rootMargin: "0px 0px -40% 0px" });
    dealIO.observe(root);

    if (window.ResizeObserver) new ResizeObserver(function () { deckMeasure(); }).observe(fan);

    if (D.prev) D.prev.addEventListener("click", function () { deckScrollTo(D.idx - 1); });
    if (D.next) D.next.addEventListener("click", function () { deckScrollTo(D.idx + 1); });

    function cardOf(target) {
      var el = target.closest && target.closest(".card");
      if (!el) return null;
      for (var i = 0; i < D.cards.length; i++) if (D.cards[i].el === el) return { c: D.cards[i], i: i };
      return null;
    }

    // a click on a side card brings it to the centre; the centre card opens the project
    fan.addEventListener("click", function (e) {
      var hit = cardOf(e.target);
      if (!hit) return;
      if (hit.c.e < 1) { e.preventDefault(); return; }          // still in the pile / being dealt
      if (e.detail > 0 && Math.abs(hit.i - D.pos) > 0.5) { e.preventDefault(); deckScrollTo(hit.i); }
    });

    // keyboard: Tab / arrows move through the hand
    fan.addEventListener("focusin", function (e) {
      var hit = cardOf(e.target);
      if (hit && Math.abs(hit.i - D.pos) > 0.5) deckScrollTo(hit.i);
    });
    fan.addEventListener("keydown", function (e) {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      var hit = cardOf(e.target);
      if (!hit) return;
      var nb = D.cards[hit.i + (e.key === "ArrowRight" ? 1 : -1)];
      if (nb) { e.preventDefault(); nb.el.focus({ preventScroll: true }); }
    });

    // hover tilt + glare (mouse only)
    if (finePointer) {
      fan.addEventListener("pointermove", function (e) {
        var hit = cardOf(e.target);
        var c = hit && hit.c.e >= 1 ? hit.c : null;
        if (D.hover && D.hover !== c) { D.hover.trx = D.hover.try_ = D.hover.tgl = 0; }
        D.hover = c;
        if (!c) return;
        var r = c.el.getBoundingClientRect();
        var u = clamp01((e.clientX - r.left) / r.width), v = clamp01((e.clientY - r.top) / r.height);
        c.try_ = (u - 0.5) * 18; c.trx = (0.5 - v) * 14; c.tgl = 1;
        c.el.style.setProperty("--gx", (u * 100).toFixed(1) + "%");
        c.el.style.setProperty("--gy", (v * 100).toFixed(1) + "%");
      }, { passive: true });
      fan.addEventListener("pointerleave", function () {
        if (D.hover) { D.hover.trx = D.hover.try_ = D.hover.tgl = 0; D.hover = null; }
      });
    }
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

  window.FX = { initDeck: initDeck, refreshDeck: refreshDeck, initTagline: initTagline };

  function boot() { initLenis(); initAnchors(); initGrain(); initSpotlight(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
