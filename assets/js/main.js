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
  buildMarquee();
  buildAbout();
  buildTagline();
  buildBenefits();
  buildProcess();
  buildPortfolio();
  buildNews();
  buildFinalCta();
  buildContact();
  buildFooter();

  initNavBehavior();
  initReveal();
  initHeroIntro();
  initScrollSpy();
  initNewsModal();
  initFinalCtaVideo();

  // scroll-linked effects from fx.js need the built DOM
  if (window.FX) { FX.initDeck($("#deck")); FX.initTagline($("#tagline-text")); }
});

/* hide a whole section when its config block is empty */
function hide(sel) { const el = $(sel); if (el) el.hidden = true; }

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

  // live panel of the 3D quarter: clock of the scene's day + optional sound
  const sc = C.scene || {};
  const proc = $("#hero-process");
  if (proc) {
    if (sc.enabled === false) proc.hidden = true;
    else proc.innerHTML = `
      <div class="hero-live">
        <span class="hl-pulse" aria-hidden="true"></span>
        <span class="hl-time" id="scene-time">--:--</span>
        <span class="hl-phase" id="scene-phase"></span>
        <button class="hl-sound" id="scene-sound" type="button" aria-pressed="false">
          <svg class="hl-off" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 9v6h4l5 4V5L8 9H4Z"/><path d="m17 9 4 6M21 9l-4 6"/></svg>
          <svg class="hl-on" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 9v6h4l5 4V5L8 9H4Z"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/></svg>
          <span>${esc(sc.soundLabel || "Звук")}</span>
        </button>
      </div>` +
      (sc.hint ? `<p class="hero-process-hint">${esc(sc.hint)}</p>` : "");
  }
}

/* ---------- ABOUT ---------- */
function buildAbout() {
  const a = C.about || {};
  $("#about-eyebrow").textContent = a.eyebrow || "";
  $("#about-title").textContent = a.title || "";
  // Buttons identical to the hero: gold "primary" (with arrow) + "ghost" (no arrow)
  $("#about-copy").innerHTML =
    (a.paragraphs || []).map(p => `<p data-reveal>${esc(p)}</p>`).join("") +
    `<div class="about-actions" data-reveal data-reveal-delay="1">` +
    (a.links || []).map(l => {
      const ghost = l.style === "ghost";
      const cls = ghost ? "btn btn-ghost" : "btn btn-primary";
      return `<a class="${cls}" href="${esc(l.href)}">${esc(l.label)}${ghost ? "" : " " + ICON.arrow}</a>`;
    }).join("") + `</div>`;
  const aboutImg = $("#about-image");
  aboutImg.dataset.ph = "Meridian Build — Studio";
  aboutImg.onerror = () => window.PH && PH.set(aboutImg, aboutImg.dataset.ph);
  if (a.image) aboutImg.src = a.image;

  // floating badge overlapping the image
  const badge = $("#about-badge");
  if (badge && a.badge && a.badge.value) {
    badge.innerHTML = `<span class="about-badge-value">${esc(a.badge.value)}</span>` +
                      `<span class="about-badge-label">${esc(a.badge.label || "")}</span>`;
    badge.hidden = false;
  }
}

/* ---------- MARQUEE (areas of work, endless loop) ---------- */
function buildMarquee() {
  const items = C.marquee || [];
  const el = $("#marquee");
  if (!el) return;
  if (!items.length) { el.hidden = true; return; }
  const row = items.map(t => `<span class="marquee-item">${esc(t)}</span>`).join("");
  // two identical rows → translate by -50% for a seamless loop; the copy is hidden from AT
  el.innerHTML = `<div class="marquee-track"><div class="marquee-row">${row}</div>` +
                 `<div class="marquee-row" aria-hidden="true">${row}</div></div>`;
}

/* ---------- TAGLINE (each word lights up on scroll, see fx.js) ---------- */
function buildTagline() {
  const lines = (C.tagline && C.tagline.lines) || [];
  if (!lines.length) return hide("#tagline");
  // --w = word position inside its line → words on one line light up in reading order
  $("#tagline-text").innerHTML = lines.map(line =>
    `<span class="tl-line">${line.split(/\s+/).filter(Boolean)
      .map((w, k) => `<span class="tl-word" style="--w:${k}">${esc(w)}</span>`).join(" ")}</span>`).join(" ");
}

/* ---------- BENEFITS ---------- */
function buildBenefits() {
  const b = C.benefits || {};
  if (!(b.items || []).length) return hide("#benefits");
  $("#benefits-eyebrow").textContent = b.eyebrow || "";
  $("#benefits-title").textContent = b.title || "";
  $("#benefits-proof").innerHTML = (b.proof || []).map(p => `
    <div class="proof">
      <span class="proof-value">${esc(p.value)}</span>
      <span class="proof-label">${esc(p.label)}</span>
    </div>`).join("");
  $("#benefits-list").innerHTML = b.items.map((it, i) => `
    <li class="benefit" data-reveal data-reveal-delay="${(i % 2) + 1}">
      <span class="benefit-num">${String(i + 1).padStart(2, "0")}</span>
      <div>
        <h3 class="benefit-title">${esc(it.title)}</h3>
        <p class="benefit-text">${esc(it.text)}</p>
        ${it.link ? `<a class="text-link" href="${esc(it.link.href)}">${esc(it.link.label)} ${ICON.arrow}</a>` : ""}
      </div>
    </li>`).join("");
}

/* ---------- PROCESS (three steps, line draws on reveal) ---------- */
function buildProcess() {
  const p = C.process || {};
  if (!(p.steps || []).length) return hide("#process");
  $("#process-eyebrow").textContent = p.eyebrow || "";
  $("#process-title").textContent = p.title || "";
  $("#process-steps").innerHTML = p.steps.map((s, i) => `
    <li class="process-step" data-reveal data-reveal-delay="${i + 1}">
      <span class="process-node" aria-hidden="true">${String(i + 1).padStart(2, "0")}</span>
      <h3 class="process-title">${esc(s.title)}</h3>
      <p class="process-text">${esc(s.text)}</p>
    </li>`).join("");
}

/* ---------- FINAL CTA ---------- */
function buildFinalCta() {
  const f = C.finalCta || {};
  if (!f.cta) return hide("#final-cta");
  $("#final-cta-eyebrow").textContent = f.eyebrow || "";
  $("#final-cta-title").innerHTML = (f.titleLines || []).map(t => `<span class="line">${esc(t)}</span>`).join(" ");
  $("#final-cta-text").textContent = f.text || "";
  $("#final-cta-actions").innerHTML =
    `<a class="btn btn-primary btn-lg" href="${esc(f.cta.href)}">${esc(f.cta.label)} ${ICON.arrow}</a>`;
  const v = $("#final-cta-video");
  if (f.poster) v.poster = f.poster;
  if (f.video) v.dataset.src = f.video;
}

/* play the dimmed background video only while the block is on screen */
function initFinalCtaVideo() {
  const v = $("#final-cta-video");
  if (!v || !v.dataset.src || !("IntersectionObserver" in window)) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const io = new IntersectionObserver((ents) => {
    ents.forEach(en => {
      if (en.isIntersecting) {
        if (!v.src) v.src = v.dataset.src;
        v.play().catch(() => {});
      } else v.pause();
    });
  }, { threshold: 0.1 });
  io.observe(v);
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

  // Each project is a real card: a face (corner index, photo, title) and a back
  // with the brand mark. fx.js deals them from a pile into a fan that turns
  // while the page scrolls.
  const mark = brandLogoHTML(C.brand || {});
  $("#projects-grid").innerHTML = projects.map((pr, i) => {
    const num = String(i + 1).padStart(2, "0");
    return `
    <a class="card" href="project.html?id=${encodeURIComponent(pr.id)}" data-cat="${esc(pr.category || "")}"
       aria-label="${esc(pr.title)} — view project">
      <span class="pcard-inner">
        <span class="pcard-face">
          <span class="pcard-top">
            <span class="pcard-num">${num}</span>
            <span class="pcard-suit" aria-hidden="true"></span>
          </span>
          <span class="pcard-media">
            <img class="card-img" src="${esc(pr.thumb || pr.heroSrc)}" alt="${esc(pr.title)}" loading="lazy" decoding="async"
                 data-ph="${esc(pr.title)}" onerror="window.PH&&PH.set(this,this.dataset.ph)">
            ${pr.status ? `<span class="card-status">${esc(pr.status)}</span>` : ""}
          </span>
          <span class="pcard-body">
            <span class="card-cat">${esc(pr.category || "")} · ${esc(pr.year || "")}</span>
            <h3 class="card-title">${esc(pr.title)}</h3>
            <span class="card-meta">${esc(pr.location || "")}</span>
            <p class="card-summary">${esc(pr.summary || "")}</p>
            <span class="card-cta">Смотреть проект ${ICON.arrow}</span>
          </span>
          <span class="pcard-corner" aria-hidden="true">${num}</span>
          <span class="pcard-glare" aria-hidden="true"></span>
        </span>
        <span class="pcard-back" aria-hidden="true">
          <svg class="pcard-pattern" width="100%" height="100%"><defs>
            <pattern id="pcp-${i}" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <path d="M0 0V12" stroke="currentColor" stroke-width="1"/></pattern></defs>
            <rect width="100%" height="100%" fill="url(#pcp-${i})"/></svg>
          <span class="pcard-back-mark">${mark}</span>
        </span>
      </span>
    </a>`;
  }).join("");

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
    if (window.FX && FX.refreshDeck) FX.refreshDeck();
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

  // Consent to personal-data processing (152-ФЗ): fill the label from config and
  // keep the submit button disabled until the box is ticked.
  const cs = (C.legal && C.legal.consent) || {};
  const consentText = $("#consent-text");
  if (consentText) {
    consentText.innerHTML =
      `${esc(cs.text || "Я даю согласие на обработку персональных данных и принимаю")} ` +
      `<a href="${esc(cs.href || "privacy.html")}">${esc(cs.linkLabel || "политику конфиденциальности")}</a>.`;
  }
  const consent = $("#f-consent");
  const submit = $("#contact-submit");
  const syncConsent = () => { if (submit && consent) submit.disabled = !consent.checked; };
  if (consent) consent.addEventListener("change", syncConsent);
  syncConsent();

  const form = $("#contact-form");
  if (c.formAction) form.setAttribute("action", c.formAction), form.setAttribute("method", "post");

  // Inline client-side validation (no browser bubbles, no alerts).
  const rules = [
    { el: $("#f-name"),  err: $("#f-name-err"),  test: v => v.trim().length > 1,
      msg: "Укажите, как к вам обращаться." },
    { el: $("#f-email"), err: $("#f-email-err"), test: v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()),
      msg: "Проверьте адрес почты, например name@company.ru" },
    { el: $("#f-msg"),   err: $("#f-msg-err"),   test: v => v.trim().length > 9,
      msg: "Опишите задачу хотя бы в одном предложении." }
  ].filter(r => r.el && r.err);
  const check = (r) => {
    const ok = r.test(r.el.value);
    r.err.textContent = ok ? "" : r.msg;
    r.el.setAttribute("aria-invalid", ok ? "false" : "true");
    return ok;
  };
  rules.forEach(r => {
    r.el.addEventListener("blur", () => { if (r.el.value) check(r); });
    r.el.addEventListener("input", () => { if (r.el.getAttribute("aria-invalid") === "true") check(r); });
  });

  form.addEventListener("submit", (e) => {
    const bad = rules.filter(r => !check(r));
    if (bad.length) { e.preventDefault(); bad[0].el.focus(); return; }
    if (!c.formAction) {
      e.preventDefault();
      const btn = submit || form.querySelector("button[type=submit]");
      btn.textContent = "Спасибо за обращение!";
      btn.disabled = true;
      form.reset();
      // reset() clears the consent tick, so re-apply the gate after the thank-you.
      setTimeout(() => { btn.textContent = "Отправить"; syncConsent(); }, 3500);
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
  }, { rootMargin: "-45% 0px -54% 0px", threshold: 0 }); // a line mid-screen: works for very tall sections
  sections.forEach(s => io.observe(s));
}
