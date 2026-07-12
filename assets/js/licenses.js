/* =============================================================================
   licenses.js — builds licenses.html from config.licenses
   Header (copy + 3D building) and a document viewer (preview + selector).
   ========================================================================== */
const C = window.SITE_CONFIG || {};
const PK = window.PAGEKIT;
const $ = (s, r = document) => r.querySelector(s);
const esc = PK.esc;

document.addEventListener("DOMContentLoaded", () => {
  const L = C.licenses || {};
  document.title = `${L.title || "Лицензии"} — ${(C.brand && C.brand.name) || ""}${(C.brand && C.brand.nameAccent) || ""}`;

  PK.buildNav([{ label: "Лицензии", href: "licenses.html", current: true }]);
  PK.buildFooter();

  $("#page-eyebrow").textContent = L.eyebrow || "";
  $("#page-title").textContent = L.title || "Лицензии";
  $("#page-desc").textContent = L.description || "";

  buildPrograms(L.programs);

  $("#docs-eyebrow").textContent = L.docsTitle || "Документы";
  PK.mountDocViewer($("#docviewer"), L.documents);

  PK.initLightbox();
  PK.initReveal();
});

/* ---------- licensed-programs block: description + photo gallery ---------- */
function buildPrograms(pr) {
  const sec = $("#programs");
  if (!pr || !((pr.gallery && pr.gallery.length) || (pr.paragraphs && pr.paragraphs.length))) {
    if (sec) sec.style.display = "none";
    return;
  }
  $("#programs-eyebrow").textContent = pr.eyebrow || "";
  $("#programs-title").textContent = pr.title || "";
  $("#programs-desc").innerHTML = (pr.paragraphs || []).map(p => `<p>${esc(p)}</p>`).join("");
  $("#programs-gallery").innerHTML = (pr.gallery || []).map(src =>
    `<img src="${esc(src)}" alt="${esc(pr.title || "")}" loading="lazy" decoding="async" data-zoom
          data-ph="${esc(pr.title || "Программа")}" onerror="window.PH&&PH.set(this,this.dataset.ph)">`
  ).join("");
}
