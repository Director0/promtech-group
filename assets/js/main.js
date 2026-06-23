/* =============================================================================
   main.js — builds the HOME page from config.js and wires up interactions.
   ========================================================================== */
const C = window.SITE_CONFIG || {};

/* ---------- tiny helpers ---------- */
const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, m => (
  { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
const ICON = {
  arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M7 17 17 7M9 7h8v8"/></svg>',
  menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
  mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>',
  phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M5 4h4l2 5-3 2a14 14 0 0 0 6 6l2-3 5 2v4a2 2 0 0 1-2 2A17 17 0 0 1 3 6a2 2 0 0 1 2-2Z"/></svg>',
  pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11Z"/><circle cx="12" cy="10" r="2.5"/></svg>'
};

document.addEventListener("DOMContentLoaded", () => {
  buildNav();
  buildHero();
  buildAbout();
  buildPortfolio();
  buildNews();
  buildContact();
  buildFooter();

  initNavBehavior();
  initReveal();
  initHeroIntro();
  initScrollSpy();
  initNewsModal();
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

/* ---------- NAV ---------- */
function buildNav() {
  const b = C.brand || {};
  $("#nav-logo").innerHTML = brandLogoHTML(b);
  const links = (C.nav || []).map(n => `<a href="${esc(n.href)}">${esc(n.label)}</a>`).join("");
  const cta = C.navCta ? `<a href="${esc(C.navCta.href)}" class="btn btn-primary nav-cta">${esc(C.navCta.label)}</a>` : "";
  $("#nav-links").innerHTML = links + cta;
  if (b.name) document.title = `${b.name}${b.nameAccent || ""} — ${b.tagline || "Construction"}`;
}

/* ---------- HERO ---------- */
function buildHero() {
  const h = C.hero || {};
  const lines = (h.titleLines || []).map(t =>
    `<span class="line"><span>${esc(t)}</span></span>`).join("");
  $("#hero-eyebrow").textContent = h.eyebrow || "";
  $("#hero-title").innerHTML = lines;
  $("#hero-summary").textContent = h.summary || "";
  $("#hero-actions").innerHTML = `
    ${h.primaryCta ? `<a class="btn btn-primary" href="${esc(h.primaryCta.href)}">${esc(h.primaryCta.label)} ${ICON.arrow}</a>` : ""}
    ${h.secondaryCta ? `<a class="btn btn-ghost" href="${esc(h.secondaryCta.href)}">${esc(h.secondaryCta.label)}</a>` : ""}`;
  $("#hero-stats").innerHTML = (h.stats || []).map(s => `
    <div class="stat">
      <div class="stat-value" data-count="${Number(s.value) || 0}">0<span class="text-gold">${esc(s.suffix || "")}</span></div>
      <div class="stat-label">${esc(s.label)}</div>
    </div>`).join("");
}

/* ---------- ABOUT ---------- */
function buildAbout() {
  const a = C.about || {};
  $("#about-eyebrow").textContent = a.eyebrow || "";
  $("#about-title").textContent = a.title || "";
  $("#about-copy").innerHTML =
    (a.paragraphs || []).map(p => `<p data-reveal>${esc(p)}</p>`).join("") +
    `<div class="about-values">` +
    (a.values || []).map((v, i) => `
      <div class="value" data-reveal data-reveal-delay="${(i % 4) + 1}">
        <h4>${esc(v.title)}</h4><p>${esc(v.text)}</p>
      </div>`).join("") + `</div>`;
  const aboutImg = $("#about-image");
  aboutImg.dataset.ph = "Meridian Build — Studio";
  aboutImg.onerror = () => window.PH && PH.set(aboutImg, aboutImg.dataset.ph);
  if (a.image) aboutImg.src = a.image;
}

/* ---------- PORTFOLIO ---------- */
function buildPortfolio() {
  const p = C.portfolio || {};
  const projects = C.projects || [];
  $("#portfolio-eyebrow").textContent = p.eyebrow || "";
  $("#portfolio-title").textContent = p.title || "Projects";
  $("#portfolio-subtitle").textContent = p.subtitle || "";

  // category filters
  if (p.filtersEnabled !== false) {
    const cats = ["All", ...Array.from(new Set(projects.map(pr => pr.category).filter(Boolean)))];
    $("#filters").innerHTML = cats.map((c, i) =>
      `<button class="filter${i === 0 ? " active" : ""}" data-filter="${esc(c)}">${esc(c)}</button>`).join("");
  }

  $("#projects-grid").innerHTML = projects.map((pr, i) => `
    <a class="card" href="project.html?id=${encodeURIComponent(pr.id)}" data-cat="${esc(pr.category || "")}"
       data-reveal data-reveal-delay="${(i % 3) + 1}" aria-label="${esc(pr.title)} — view project">
      <img class="card-img" src="${esc(pr.thumb || pr.heroSrc)}" alt="${esc(pr.title)}" loading="lazy" decoding="async"
           data-ph="${esc(pr.title)}" onerror="window.PH&&PH.set(this,this.dataset.ph)">
      ${pr.status ? `<span class="card-status">${esc(pr.status)}</span>` : ""}
      <span class="card-arrow" aria-hidden="true">${ICON.arrow}</span>
      <div class="card-overlay">
        <div class="card-cat">${esc(pr.category || "")} · ${esc(pr.year || "")}</div>
        <h3 class="card-title">${esc(pr.title)}</h3>
        <div class="card-meta">${esc(pr.location || "")}</div>
        <p class="card-summary">${esc(pr.summary || "")}</p>
      </div>
    </a>`).join("");

  // filtering
  const grid = $("#projects-grid");
  $("#filters")?.addEventListener("click", (e) => {
    const btn = e.target.closest(".filter");
    if (!btn) return;
    $("#filters").querySelectorAll(".filter").forEach(f => f.classList.remove("active"));
    btn.classList.add("active");
    const f = btn.dataset.filter;
    grid.querySelectorAll(".card").forEach(card => {
      const show = f === "All" || card.dataset.cat === f;
      card.style.display = show ? "" : "none";
    });
  });
}

/* ---------- NEWS ---------- */
function fmtDate(iso) {
  const d = new Date(iso);
  if (isNaN(d)) return iso || "";
  try { return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", year: "numeric" }).format(d); }
  catch (e) { return iso; }
}

function buildNews() {
  const n = C.news || {};
  const items = n.items || [];
  const sec = document.getElementById("news");
  if (!sec) return;
  if (!items.length) { sec.style.display = "none"; return; }

  $("#news-eyebrow").textContent = n.eyebrow || "";
  $("#news-title").textContent = n.title || "News";
  $("#news-subtitle").textContent = n.subtitle || "";

  $("#news-grid").innerHTML = items.map((it, i) => `
    <button class="news-card" data-news-id="${esc(it.id)}" data-reveal data-reveal-delay="${(i % 3) + 1}"
            aria-label="${esc(it.title)} — открыть">
      <span class="news-card-media">
        <img src="${esc(it.thumb || "")}" alt="${esc(it.title)}" loading="lazy" decoding="async"
             data-ph="${esc(it.title)}" onerror="window.PH&&PH.set(this,this.dataset.ph)">
      </span>
      <time class="news-card-date">${esc(fmtDate(it.date))}</time>
      <h3 class="news-card-title">${esc(it.title)}</h3>
      <span class="news-card-cta">Читать ${ICON.arrow}</span>
    </button>`).join("");
}

function initNewsModal() {
  const items = (C.news && C.news.items) || [];
  const byId = {};
  items.forEach(it => byId[it.id] = it);
  const modal = $("#news-modal");
  if (!modal) return;
  const img = $("#news-modal-img"), dateEl = $("#news-modal-date"),
        titleEl = $("#news-modal-title"), textEl = $("#news-modal-text");

  function open(it) {
    img.dataset.ph = it.title;
    img.onerror = () => window.PH && PH.set(img, it.title);
    img.src = it.thumb || "";
    img.alt = it.title || "";
    dateEl.textContent = fmtDate(it.date);
    titleEl.textContent = it.title || "";
    const body = Array.isArray(it.body) ? it.body : [it.body || ""];
    textEl.innerHTML = body.map(p => `<p>${esc(p)}</p>`).join("");
    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }
  function close() {
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  $("#news-grid")?.addEventListener("click", (e) => {
    const card = e.target.closest(".news-card");
    if (card && byId[card.dataset.newsId]) open(byId[card.dataset.newsId]);
  });
  $("#news-modal-close").addEventListener("click", close);
  modal.addEventListener("click", (e) => { if (e.target === modal) close(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && modal.classList.contains("open")) close(); });
}

/* ---------- CONTACT ---------- */
function buildContact() {
  const c = C.contact || {};
  $("#contact-eyebrow").textContent = c.eyebrow || "";
  $("#contact-title").textContent = c.title || "";
  $("#contact-text").textContent = c.text || "";
  const rows = [
    c.email && { ic: ICON.mail, lbl: "Email", val: c.email, href: `mailto:${c.email}` },
    c.phone && { ic: ICON.phone, lbl: "Телефон", val: c.phone, href: `tel:${c.phone.replace(/\s+/g, "")}` },
    c.address && { ic: ICON.pin, lbl: "Адрес", val: c.address }
  ].filter(Boolean);
  $("#contact-list").innerHTML = rows.map(r => `
    <li>
      <span class="ic" aria-hidden="true">${r.ic}</span>
      <span><span class="lbl">${esc(r.lbl)}</span><br>
      ${r.href ? `<a class="val" href="${esc(r.href)}">${esc(r.val)}</a>` : `<span class="val">${esc(r.val)}</span>`}</span>
    </li>`).join("");

  const form = $("#contact-form");
  if (c.formAction) form.setAttribute("action", c.formAction), form.setAttribute("method", "post");
  form.addEventListener("submit", (e) => {
    if (!c.formAction) {
      e.preventDefault();
      const btn = form.querySelector("button[type=submit]");
      btn.textContent = "Спасибо за обращение!";
      btn.disabled = true;
      form.reset();
      setTimeout(() => { btn.textContent = "Отправить"; btn.disabled = false; }, 3500);
    }
  });
}

/* ---------- FOOTER ---------- */
function buildFooter() {
  const f = C.footer || {}, b = C.brand || {};
  $("#footer-logo").innerHTML = `${esc(b.name || "")}<span class="text-gold">${esc(b.nameAccent || "")}</span>`;
  $("#footer-blurb").textContent = f.blurb || "";
  $("#footer-cols").innerHTML = (f.columns || []).map(col => `
    <div><h5>${esc(col.title)}</h5>
      <ul>${(col.links || []).map(l => `<li><a href="${esc(l.href)}">${esc(l.label)}</a></li>`).join("")}</ul>
    </div>`).join("");
  $("#footer-copy").textContent = `© ${b.year || new Date().getFullYear()} ${b.name || ""}${b.nameAccent || ""}. Все права защищены.`;
}

/* =============================================================================
   INTERACTIONS
   ========================================================================== */
function initNavBehavior() {
  const nav = $("#nav"), links = $("#nav-links"), toggle = $("#nav-toggle");
  const onScroll = () => nav.classList.toggle("scrolled", window.scrollY > 30);
  onScroll(); window.addEventListener("scroll", onScroll, { passive: true });
  toggle.addEventListener("click", () => links.classList.toggle("open"));
  links.addEventListener("click", (e) => { if (e.target.closest("a")) links.classList.remove("open"); });
}

function initReveal() {
  const items = document.querySelectorAll("[data-reveal]");
  if (!("IntersectionObserver" in window)) { items.forEach(i => i.classList.add("in")); return; }
  const io = new IntersectionObserver((entries) => {
    entries.forEach(en => { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } });
  }, { threshold: 0.15, rootMargin: "0px 0px -8% 0px" });
  items.forEach(i => io.observe(i));
}

function initHeroIntro() {
  // staggered reveal of hero content once fonts/scene settle
  requestAnimationFrame(() => requestAnimationFrame(() => {
    document.documentElement.classList.remove("preload");
    const spans = document.querySelectorAll(".hero h1 .line span");
    spans.forEach((s, i) => { s.style.transitionDelay = `${0.15 + i * 0.12}s`; });
    const seq = ["#hero-eyebrow", "#hero-summary", "#hero-actions", "#hero-stats"];
    seq.forEach((sel, i) => { const e = $(sel); if (e) e.style.transitionDelay = `${0.45 + i * 0.12}s`; });
  }));
  // count-up stats when hero stats appear
  const stats = $("#hero-stats");
  if (stats) {
    const io = new IntersectionObserver((ents) => {
      ents.forEach(en => { if (en.isIntersecting) { countUp(); io.disconnect(); } });
    }, { threshold: 0.4 });
    io.observe(stats);
  }
}

function countUp() {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  document.querySelectorAll(".stat-value").forEach(el => {
    const target = Number(el.dataset.count) || 0;
    const suffix = el.querySelector(".text-gold")?.outerHTML || "";
    if (reduce) { el.innerHTML = target + suffix; return; }
    const dur = 1400, start = performance.now();
    const step = (now) => {
      const p = Math.min((now - start) / dur, 1);
      const val = Math.round(target * (1 - Math.pow(1 - p, 3)));
      el.innerHTML = val + suffix;
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
}

function initScrollSpy() {
  const sections = ["home", "about", "portfolio", "contact"].map(id => document.getElementById(id)).filter(Boolean);
  const links = Array.from(document.querySelectorAll("#nav-links a[href^='#']"));
  if (!sections.length) return;
  const io = new IntersectionObserver((ents) => {
    ents.forEach(en => {
      if (en.isIntersecting) {
        links.forEach(a => a.classList.toggle("active", a.getAttribute("href") === `#${en.target.id}`));
      }
    });
  }, { threshold: 0.5 });
  sections.forEach(s => io.observe(s));
}
