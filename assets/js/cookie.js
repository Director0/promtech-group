/* =============================================================================
   cookie.js — cookie / analytics notice (152-ФЗ, РКН)
   -----------------------------------------------------------------------------
   Shows a one-time notice because the site uses веб-аналитику (Яндекс.Метрика),
   which sets cookies and processes the visitor's IP and behaviour. The choice is
   stored in localStorage. Text and links come from config.legal.cookie.

   Plain script (no modules) — load on every page AFTER config.js, e.g.:
     <script src="assets/js/cookie.js?v=1"></script>

   Gate your analytics init on acceptance:
     if (window.COOKIE_CONSENT === "accepted") { ...init Яндекс.Метрика here... }
   and listen for a later choice via the "cookie-consent" event on window
     (event.detail is "accepted" | "declined").
   ========================================================================== */
(function () {
  var KEY = "cookieConsent";
  var C = window.SITE_CONFIG || {};
  var cfg = (C.legal && C.legal.cookie) || {};

  var saved = null;
  try { saved = localStorage.getItem(KEY); } catch (e) {}
  window.COOKIE_CONSENT = saved; // "accepted" | "declined" | null

  // Already decided — nothing to show.
  if (saved === "accepted" || saved === "declined") return;

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (m) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m];
    });
  }

  function decide(value) {
    try { localStorage.setItem(KEY, value); } catch (e) {}
    window.COOKIE_CONSENT = value;
    window.dispatchEvent(new CustomEvent("cookie-consent", { detail: value }));
    if (bar) {
      bar.classList.remove("show");
      setTimeout(function () { bar.remove(); }, 500);
    }
  }

  var text = cfg.text ||
    "Мы используем файлы cookie и сервисы веб-аналитики, чтобы сайт работал корректно. " +
    "Продолжая пользоваться сайтом, вы соглашаетесь с обработкой cookie в соответствии с";
  var linkLabel = cfg.linkLabel || "политикой конфиденциальности";
  var href = cfg.href || "privacy.html";
  var accept = cfg.accept || "Принять";
  var decline = cfg.decline || "Отклонить";

  var bar = document.createElement("div");
  bar.className = "cookie";
  bar.setAttribute("role", "dialog");
  bar.setAttribute("aria-live", "polite");
  bar.setAttribute("aria-label", "Уведомление об использовании cookie");
  bar.innerHTML =
    '<p class="cookie-text">' + esc(text) + ' <a href="' + esc(href) + '">' + esc(linkLabel) + '</a>.</p>' +
    '<div class="cookie-actions">' +
      '<button class="btn btn-ghost" type="button" data-cookie="declined">' + esc(decline) + '</button>' +
      '<button class="btn btn-primary" type="button" data-cookie="accepted">' + esc(accept) + '</button>' +
    '</div>';

  bar.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-cookie]");
    if (btn) decide(btn.getAttribute("data-cookie"));
  });

  function mount() {
    document.body.appendChild(bar);
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { bar.classList.add("show"); });
    });
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else {
    mount();
  }
})();
