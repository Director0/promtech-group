/* =============================================================================
   pagekit.js — shared building blocks for the inner pages (licenses / specs).
   Exposes window.PAGEKIT with: buildNav, buildFooter, mountDocViewer, initReveal.
   Plain script (sets a global) — load AFTER config.js, like theme.js.
   ========================================================================== */
(function () {
  var C = window.SITE_CONFIG || {};
  var $ = function (s, r) { return (r || document).querySelector(s); };
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (m) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m];
    });
  }
  var ARROW = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M7 17 17 7M9 7h8v8"/></svg>';

  /* logo markup: image (with optional light variant) if a source is set, else text */
  function brandLogoHTML(b) {
    if (b.logo) {
      var h = b.logoHeight ? ' style="height:' + Number(b.logoHeight) + 'px"' : "";
      var alt = esc(b.logoAlt || b.name || "");
      var lightSrc = b.logoLight || b.logo;
      return '<img class="logo-img logo-dark" src="' + esc(b.logo) + '" alt="' + alt + '"' + h + ">" +
             '<img class="logo-img logo-light" src="' + esc(lightSrc) + '" alt="' + alt + '"' + h + ">";
    }
    return esc(b.name || "") + '<span class="text-gold">' + esc(b.nameAccent || "") + "</span>";
  }

  /* NAV — anchors point back to the home page; extra page links can be passed in. */
  function buildNav(extraLinks) {
    var b = C.brand || {};
    var logo = $("#nav-logo");
    if (logo) logo.innerHTML = brandLogoHTML(b);
    var links = (C.nav || []).map(function (n) {
      var href = n.href.charAt(0) === "#" ? "index.html" + n.href : n.href;
      return '<a href="' + esc(href) + '">' + esc(n.label) + "</a>";
    });
    (extraLinks || []).forEach(function (l) {
      var cur = l.current ? ' class="active"' : "";
      links.push('<a href="' + esc(l.href) + '"' + cur + ">" + esc(l.label) + "</a>");
    });
    var cta = C.navCta ? '<a href="index.html' + esc(C.navCta.href) + '" class="btn btn-primary nav-cta">' + esc(C.navCta.label) + "</a>" : "";
    var nl = $("#nav-links");
    if (nl) nl.innerHTML = links.join("") + cta;
    var tgl = $("#nav-toggle");
    if (tgl && nl) tgl.addEventListener("click", function () { nl.classList.toggle("open"); });
    var nav = $("#nav");
    if (nav) {
      var onScroll = function () { nav.classList.toggle("scrolled", window.scrollY > 30); };
      onScroll();
      window.addEventListener("scroll", onScroll, { passive: true });
    }
  }

  function buildFooter() {
    var f = C.footer || {}, b = C.brand || {};
    var fl = $("#footer-logo");
    if (fl) fl.innerHTML = esc(b.name || "") + '<span class="text-gold">' + esc(b.nameAccent || "") + "</span>";
    var fb = $("#footer-blurb");
    if (fb) fb.textContent = f.blurb || "";
    var fc = $("#footer-cols");
    if (fc) fc.innerHTML = (f.columns || []).map(function (col) {
      return '<div><h5>' + esc(col.title) + "</h5><ul>" +
        (col.links || []).map(function (l) {
          var href = l.href.charAt(0) === "#" ? "index.html" + l.href : l.href;
          return '<li><a href="' + esc(href) + '">' + esc(l.label) + "</a></li>";
        }).join("") + "</ul></div>";
    }).join("");
    var fcp = $("#footer-copy");
    if (fcp) fcp.textContent = "© " + (b.year || new Date().getFullYear()) + " " + (b.name || "") + (b.nameAccent || "") + ". Все права защищены.";
  }

  /* Document viewer: big preview (left) + selectable list (right).
     docs: [{ title, src }]  — src is any image (PNG / JPEG). */
  function mountDocViewer(container, docs) {
    if (!container) return;
    docs = (docs || []).filter(Boolean);
    if (!docs.length) { container.style.display = "none"; return; }

    var items = docs.map(function (d, i) {
      return '<button class="doc-item' + (i === 0 ? " active" : "") + '" data-i="' + i + '" type="button">' +
        '<span class="doc-thumb"><img src="' + esc(d.src) + '" alt="" loading="lazy" decoding="async" ' +
          'data-ph="' + esc(d.title) + '" onerror="window.PH&&PH.set(this,this.dataset.ph)"></span>' +
        '<span class="doc-name">' + esc(d.title) + "</span>" +
        '<span class="doc-num">' + String(i + 1).padStart(2, "0") + "</span></button>";
    }).join("");

    container.innerHTML =
      '<div class="doc-preview">' +
        '<div class="doc-preview-frame"><img id="doc-preview-img" alt="" data-zoom></div>' +
        '<div class="doc-caption" id="doc-caption"></div>' +
      "</div>" +
      '<div class="doc-list">' + items + "</div>";

    var img = $("#doc-preview-img", container);
    var cap = $("#doc-caption", container);
    var list = $(".doc-list", container);

    function select(i) {
      var d = docs[i];
      if (!d) return;
      img.dataset.ph = d.title;
      img.onerror = function () { window.PH && PH.set(img, d.title); };
      img.src = d.src;
      img.alt = d.title || "";
      cap.textContent = d.title || "";
      list.querySelectorAll(".doc-item").forEach(function (el) {
        el.classList.toggle("active", Number(el.dataset.i) === i);
      });
    }
    list.addEventListener("click", function (e) {
      var btn = e.target.closest(".doc-item");
      if (btn) select(Number(btn.dataset.i));
    });
    select(0);
  }

  function initReveal() {
    var items = document.querySelectorAll("[data-reveal]");
    if (!("IntersectionObserver" in window)) {
      items.forEach(function (i) { i.classList.add("in"); });
      return;
    }
    var io = new IntersectionObserver(function (ents) {
      ents.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
    items.forEach(function (i) { io.observe(i); });
  }

  function initLightbox() {
    var lb = $("#lightbox"), lbImg = $("#lightbox-img");
    if (!lb || !lbImg) return;
    document.addEventListener("click", function (e) {
      var img = e.target.closest("[data-zoom]");
      if (img && img.src) { lbImg.src = img.src; lb.classList.add("open"); document.body.style.overflow = "hidden"; }
      if (e.target.closest("#lightbox-close") || e.target === lb) {
        lb.classList.remove("open"); document.body.style.overflow = "";
      }
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") { lb.classList.remove("open"); document.body.style.overflow = ""; }
    });
  }

  window.PAGEKIT = {
    ARROW: ARROW, esc: esc,
    buildNav: buildNav, buildFooter: buildFooter,
    mountDocViewer: mountDocViewer, initReveal: initReveal, initLightbox: initLightbox
  };
})();
