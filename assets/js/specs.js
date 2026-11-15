/* =============================================================================
   specs.js — builds specs.html from config.specs
   Header (copy + animated checklist), company specs list, achievements viewer.
   ========================================================================== */
const C = window.SITE_CONFIG || {};
const PK = window.PAGEKIT;
const $ = (s, r = document) => r.querySelector(s);
const esc = PK.esc;
const CHECK = '<svg viewBox="0 0 24 24"><path d="M5 12.5 10 17.5 19 7"/></svg>';

document.addEventListener("DOMContentLoaded", () => {
  const S = C.specs || {};
  document.title = `${S.title || "Деятельность"} — ${(C.brand && C.brand.name) || ""}${(C.brand && C.brand.nameAccent) || ""}`;

  PK.buildNav([{ label: "Деятельность", href: "specs.html", current: true }]);
  PK.buildFooter();

  $("#page-eyebrow").textContent = S.eyebrow || "";
  $("#page-title").textContent = S.title || "Деятельность";
  $("#page-desc").textContent = S.description || "";

  buildChecklist(S.checklist || []);
  buildOverview(S.overview);
  buildAI(S.ai);
  buildSpecs(S);
  buildAchievements(S);

  PK.initLightbox();
  PK.initReveal();
});

/* ---------- animated "task list" checklist (right of the header) ---------- */
function buildChecklist(items) {
  const ul = $("#checklist");
  if (!ul) return;
  ul.innerHTML = items.map(t =>
    `<li><span class="mark">${CHECK}</span><span class="ck-label">${esc(t)}</span></li>`
  ).join("");

  const lis = Array.from(ul.querySelectorAll("li"));
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const run = () => {
    if (reduce) { lis.forEach(li => { li.classList.add("show", "done"); }); return; }
    lis.forEach((li, i) => {
      setTimeout(() => li.classList.add("show"), 260 + i * 520);
      setTimeout(() => li.classList.add("done"), 480 + i * 520);
    });
  };

  // with the 3D trophy (scene-trophy.js) each item is ticked when its stage
  // ring locks into the trophy; the timer below is only a safety net
  const all = () => lis.forEach(li => li.classList.add("show", "done"));
  window.__CHECKLIST = {
    mark(i) { const li = lis[i]; if (!li) return; li.classList.add("show"); setTimeout(() => li.classList.add("done"), 220); },
    all
  };
  const scene = !reduce && document.getElementById("trophy-canvas");
  if (scene) lis.forEach(li => li.classList.add("show"));

  if (!("IntersectionObserver" in window)) { scene ? all() : run(); return; }
  const io = new IntersectionObserver((ents) => {
    ents.forEach(en => {
      if (!en.isIntersecting) return;
      io.disconnect();
      if (scene) setTimeout(all, 9000); else run();
    });
  }, { threshold: 0.4 });
  io.observe(ul);
}

/* ---------- text-only overview paragraph ---------- */
function buildOverview(ov) {
  const sec = $("#overview");
  const paras = Array.isArray(ov) ? ov : (ov ? [ov] : []);
  if (!paras.length) { if (sec) sec.style.display = "none"; return; }
  $("#overview-text").innerHTML = paras.map(p => `<p>${esc(p)}</p>`).join("");
}

/* ---------- AI-in-design block: description + photo library ---------- */
function buildAI(ai) {
  const sec = $("#ai");
  if (!ai || !((ai.gallery && ai.gallery.length) || (ai.paragraphs && ai.paragraphs.length))) {
    if (sec) sec.style.display = "none";
    return;
  }
  $("#ai-eyebrow").textContent = ai.eyebrow || "";
  $("#ai-title").textContent = ai.title || "";
  $("#ai-desc").innerHTML = (ai.paragraphs || []).map(p => `<p>${esc(p)}</p>`).join("");
  $("#ai-gallery").innerHTML = (ai.gallery || []).map(src =>
    `<img src="${esc(window.optImg ? optImg(src, "hero") : src)}" data-full="${esc(src)}" alt="${esc(ai.title || "")}" loading="lazy" decoding="async" data-zoom
          data-ph="${esc(ai.title || "AI")}" onerror="window.PH&&PH.set(this,this.dataset.ph)">`
  ).join("");
}

/* ---------- company specifications list ---------- */
function buildSpecs(S) {
  $("#specs-title").textContent = S.specsTitle || "Показатели";
  $("#specs-list").innerHTML = (S.items || []).map((it, i) => `
    <div class="row" data-reveal data-reveal-delay="${(i % 2) + 1}">
      <div class="k">${esc(it.label)}</div>
      <div class="v">${esc(it.value)}</div>
    </div>`).join("");
}

/* ---------- achievements document viewer ---------- */
function buildAchievements(S) {
  const sec = $("#achievements");
  const list = S.achievements || [];
  if (!list.length) { if (sec) sec.style.display = "none"; return; }
  $("#ach-eyebrow").textContent = S.achievementsTitle || "Достижения";
  PK.mountDocViewer($("#ach-docviewer"), list);
}
