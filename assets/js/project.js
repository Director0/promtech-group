/* =============================================================================
   project.js — renders a single project's detail page from config.js
   URL form:  project.html?id=<project-id>
   Full-width photo OR video hero, intro, description, fact cards,
   specifications table, services, gallery (with lightbox), and next-project link.
   ========================================================================== */
const C = window.SITE_CONFIG || {};
/* light web copy of an image (tools/optimize-images.py), or the original */
const O = (s, k) => (window.optImg ? window.optImg(s, k) : s);
const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, m => (
  { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
const ARROW = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M7 17 17 7M9 7h8v8"/></svg>';
const BACK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M14 7l-5 5 5 5"/></svg>';

document.addEventListener("DOMContentLoaded", () => {
  buildNav();
  buildFooter();

  const id = new URLSearchParams(location.search).get("id");
  const projects = C.projects || [];
  const idx = projects.findIndex(p => p.id === id);
  const p = projects[idx];

  if (!p) { renderNotFound(); return; }
  document.title = `${p.title} — ${(C.brand && C.brand.name) || ""}${(C.brand && C.brand.nameAccent) || ""}`;

  renderHero(p);
  renderBody(p);
  renderNext(projects, idx);
  initLightbox();
  initReveal();
  // header: full-width at top, collapses to floating card on scroll
  const nav = $("#nav");
  const onScroll = () => nav.classList.toggle("scrolled", window.scrollY > 30);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
});

/* logo markup: image (with optional light variant) if a source is set, else text */
function brandLogoHTML(b) {
  if (b.logo) {
    const h = b.logoHeight ? ` style="height:${Number(b.logoHeight)}px"` : "";
    const alt = esc(b.logoAlt || b.name || "");
    const lightSrc = b.logoLight || b.logo;
    return `<img class="logo-img logo-dark" src="${esc(b.logo)}" alt="${alt}"${h}>` +
           `<img class="logo-img logo-light" src="${esc(lightSrc)}" alt="${alt}"${h}>`;
  }
  return `${esc(b.name || "")}<span class="text-gold">${esc(b.nameAccent || "")}</span>`;
}

/* ---------- shared nav / footer ---------- */
function buildNav() {
  const b = C.brand || {};
  $("#nav-logo").innerHTML = brandLogoHTML(b);
  const links = (C.nav || []).map(n => {
    const href = n.href.startsWith("#") ? `index.html${n.href}` : n.href;
    return `<a href="${esc(href)}">${esc(n.label)}</a>`;
  }).join("");
  const cta = C.navCta ? `<a href="index.html${esc(C.navCta.href)}" class="btn btn-primary nav-cta">${esc(C.navCta.label)}</a>` : "";
  $("#nav-links").innerHTML = links + cta;
  $("#nav-toggle").addEventListener("click", () => $("#nav-links").classList.toggle("open"));
}

function buildFooter() {
  const f = C.footer || {}, b = C.brand || {};
  $("#footer-logo").innerHTML = `${esc(b.name || "")}<span class="text-gold">${esc(b.nameAccent || "")}</span>`;
  $("#footer-blurb").textContent = f.blurb || "";
  $("#footer-cols").innerHTML = (f.columns || []).map(col => `
    <div><h5>${esc(col.title)}</h5>
      <ul>${(col.links || []).map(l => {
        const href = l.href.startsWith("#") ? `index.html${l.href}` : l.href;
        return `<li><a href="${esc(href)}">${esc(l.label)}</a></li>`;
      }).join("")}</ul></div>`).join("");
  $("#footer-copy").textContent = `© ${b.year || new Date().getFullYear()} ${b.name || ""}${b.nameAccent || ""}. All rights reserved.`;
}

/* ---------- hero (image or video) ---------- */
function renderHero(p) {
  const media = (p.heroType === "video" && p.heroSrc)
    ? `<video id="hero-video" autoplay muted loop playsinline ${p.heroPoster ? `poster="${esc(O(p.heroPoster, "hero"))}"` : ""}>
         <source src="${esc(p.heroSrc)}" type="video/mp4">
       </video>`
    : `<img class="hero-main" src="${esc(O(p.heroSrc || p.thumb, "hero"))}" alt="${esc(p.title)}"
            data-ph="${esc(p.title)}" onload="this.classList.add('is-loaded')"
            onerror="window.PH&&PH.set(this,this.dataset.ph)" />`;
  // the card photo (already cached from the home page) sits under the full
  // hero image, so the card → hero morph lands on a picture, never on a gap
  const placeholder = p.thumb && p.heroType !== "video"
    ? `<img class="hero-ph" src="${esc(O(p.thumb, "card"))}" alt="" aria-hidden="true" />` : "";

  const meta = [
    p.category && `<span><b>${esc(p.category)}</b></span>`,
    p.location && `<span>${esc(p.location)}</span>`,
    p.year && `<span>${esc(p.year)}</span>`,
    p.status && `<span>${esc(p.status)}</span>`
  ].filter(Boolean).join("");

  $("#project-hero").innerHTML = `
    <div class="project-hero-media">${placeholder}${media}</div>
    <div class="project-hero-scrim"></div>
    <div class="project-hero-content">
      <div class="container">
        <p class="eyebrow">${esc(p.category || "Project")}</p>
        <h1>${esc(p.title)}</h1>
        <div class="project-hero-meta">${meta}</div>
      </div>
    </div>`;

  // if the demo video can't load, fall back to a branded still
  const v = $("#hero-video");
  if (v) {
    const fail = () => {
      const ph = window.PH ? window.PH(p.title, 1920, 1080) : (p.thumb || "");
      v.outerHTML = `<img src="${esc(ph)}" alt="${esc(p.title)}" />`;
    };
    v.addEventListener("error", fail, true);
    const src = v.querySelector("source");
    if (src) src.addEventListener("error", fail);
  }
}

/* ---------- body: intro, description, facts, spec table, gallery ---------- */
function renderBody(p) {
  const facts = (p.facts || []).map(f =>
    `<div class="fact"><div class="v">${esc(f.value)}</div><div class="l">${esc(f.label)}</div></div>`).join("");

  const desc = textHTML(p.description);

  const specs = (p.specs || []).map(s =>
    `<tr><th>${esc(s.label)}</th><td>${esc(s.value)}</td></tr>`).join("");

  const services = (p.services || []).map(s => `<li>${esc(s)}</li>`).join("");

  const gallery = galleryHTML(p.gallery, p.title);

  // extra blocks: [{ eyebrow, title, text | paragraphs, gallery }]
  const sections = (p.sections || []).map((sec, i) => {
    if (!sec) return "";
    const paras = textHTML(sec.text || sec.paragraphs);
    const g = galleryHTML(sec.gallery, sec.title || p.title);
    if (!sec.title && !paras && !g) return "";
    return `
      <section class="project-section" id="section-${i + 1}">
        ${sec.eyebrow ? `<p class="eyebrow" data-reveal>${esc(sec.eyebrow)}</p>` : ""}
        ${sec.title ? `<h2 class="project-section-title" data-reveal>${esc(sec.title)}</h2>` : ""}
        ${paras ? `<div class="project-desc" data-reveal data-reveal-delay="1">${paras}</div>` : ""}
        ${g ? `<div class="gallery" data-reveal>${g}</div>` : ""}
      </section>`;
  }).join("");

  $("#project-body").innerHTML = `
    <div class="project-main">
      <a class="back-link" href="index.html#portfolio">${BACK} Все проекты</a>
      ${p.intro ? `<p class="project-intro" data-reveal>${esc(p.intro)}</p>` : ""}
      ${facts ? `<div class="project-facts" data-reveal>${facts}</div>` : ""}
      <div class="project-desc" data-reveal data-reveal-delay="1">${desc}</div>
      ${gallery ? `<div class="gallery" data-reveal>${gallery}</div>` : ""}
      ${sections}
    </div>
    <aside>
      <div class="aside-card" data-reveal data-reveal-delay="1">
        <h3>Характеристики</h3>
        <table class="spec-table"><tbody>${specs}</tbody></table>
        ${services ? `<h3 style="margin-top:26px;font-size:1rem">Мы выполнили</h3>
          <ul class="services-list">${services}</ul>` : ""}
      </div>
    </aside>`;
}

/* text from config: a string or a list of strings.
     • each list item               → its own paragraph
     • a line break ("\n") inside   → line break
     • a blank line ("\n\n") inside → new paragraph
     • every extra blank line, or an empty item "" → an empty line of space */
function textHTML(src) {
  const items = [].concat(src == null ? [] : src).map(v => String(v == null ? "" : v));
  let out = "", lines = [], gap = 0, blank = 0;
  const close = () => {
    if (!lines.length) return;
    if (out && gap > 0) out += `<div class="text-gap" style="height:${Math.min(gap, 4) * 24}px" aria-hidden="true"></div>`;
    out += `<p>${lines.map(esc).join("<br>")}</p>`;
    lines = []; gap = 0;
  };
  items.forEach(item => {
    if (!item.trim()) { close(); gap++; return; }
    blank = 0;
    item.split(/\r?\n/).forEach(raw => {
      const line = raw.trim();
      if (!line) { blank++; return; }
      if (blank > 0) { close(); gap += blank - 1; }
      blank = 0;
      lines.push(line);
    });
    close();
  });
  return out;
}

/* gallery images: plain urls or { src, caption } */
function galleryHTML(list, alt) {
  return (list || []).map(item => {
    const src = typeof item === "string" ? item : item && item.src;
    if (!src) return "";
    const cap = typeof item === "object" && item.caption ? item.caption : "";
    return `<img src="${esc(O(src, "hero"))}" data-full="${esc(src)}" alt="${esc(cap || alt + " — фото")}" loading="lazy" decoding="async" data-zoom
          ${cap ? `title="${esc(cap)}"` : ""} data-ph="${esc(alt)}" onerror="window.PH&&PH.set(this,this.dataset.ph)" />`;
  }).join("");
}

/* ---------- next project ---------- */
function renderNext(projects, idx) {
  if (projects.length < 2) return;
  const next = projects[(idx + 1) % projects.length];
  $("#next-project").innerHTML = `
    <div class="container">
      <a href="project.html?id=${encodeURIComponent(next.id)}">
        <div>
          <div class="np-label">Next project</div>
          <div class="np-title">${esc(next.title)}</div>
        </div>
        <span class="np-arrow">${ARROW}</span>
      </a>
    </div>`;
}

function renderNotFound() {
  $("#project-hero").style.height = "auto";
  $("#project-body").innerHTML = `
    <div class="project-main" style="grid-column:1/-1;text-align:center;padding:18vh 0">
      <p class="eyebrow" style="justify-content:center">404</p>
      <h1 class="section-title">Проект не найден</h1>
      <p class="lead" style="margin:18px auto 30px">Такого проекта нет, время создавать.</p>
      <a class="btn btn-primary" href="index.html#portfolio">${BACK} Назад к проектам</a>
    </div>`;
}

/* ---------- gallery lightbox ---------- */
function initLightbox() {
  const lb = $("#lightbox"), lbImg = $("#lightbox-img");
  document.addEventListener("click", (e) => {
    const img = e.target.closest("[data-zoom]");
    if (img) { const orig = img.dataset.full || img.src; lbImg.onerror = () => { lbImg.onerror = null; lbImg.src = orig; }; lbImg.src = O(orig, "full"); lb.classList.add("open"); document.body.style.overflow = "hidden"; }
    if (e.target.closest("#lightbox-close") || e.target === lb) {
      lb.classList.remove("open"); document.body.style.overflow = "";
    }
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { lb.classList.remove("open"); document.body.style.overflow = ""; }
  });
}

/* ---------- scroll reveal ---------- */
function initReveal() {
  const items = document.querySelectorAll("[data-reveal]");
  if (!("IntersectionObserver" in window)) { items.forEach(i => i.classList.add("in")); return; }
  const io = new IntersectionObserver((ents) => {
    ents.forEach(en => {
      if (!en.isIntersecting) return;
      const el = en.target;
      el.classList.add("in"); io.unobserve(el);
      // drop the GPU layer once the fade up is over
      const done = (e) => { if (e.target === el && e.propertyName === "opacity") { el.style.willChange = "auto"; el.removeEventListener("transitionend", done); } };
      el.addEventListener("transitionend", done);
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
  items.forEach(i => io.observe(i));
}
