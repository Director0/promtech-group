/* =============================================================================
   licenses.js — builds licenses.html from config.licenses
   Header (copy + 3D building) and a document viewer (preview + selector).
   ========================================================================== */
const C = window.SITE_CONFIG || {};
const PK = window.PAGEKIT;
const $ = (s, r = document) => r.querySelector(s);

document.addEventListener("DOMContentLoaded", () => {
  const L = C.licenses || {};
  document.title = `${L.title || "Лицензии"} — ${(C.brand && C.brand.name) || ""}${(C.brand && C.brand.nameAccent) || ""}`;

  PK.buildNav([{ label: "Лицензии", href: "licenses.html", current: true }]);
  PK.buildFooter();

  $("#page-eyebrow").textContent = L.eyebrow || "";
  $("#page-title").textContent = L.title || "Лицензии";
  $("#page-desc").textContent = L.description || "";

  $("#docs-eyebrow").textContent = L.docsTitle || "Документы";
  PK.mountDocViewer($("#docviewer"), L.documents);

  PK.initLightbox();
  PK.initReveal();
});
