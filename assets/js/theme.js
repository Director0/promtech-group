/* =============================================================================
   theme.js — applies the colors & fonts from config.js to the page.
   Runs on every page (home + project pages) BEFORE the modules render content,
   so changing config.theme.colors instantly recolors the whole site.
   ========================================================================== */
(function applyTheme() {
  var cfg = window.SITE_CONFIG;
  if (!cfg || !cfg.theme) return;

  var c = cfg.theme.colors || {};
  var root = document.documentElement;
  var map = {
    "--bg": c.bg,
    "--bg-elevated": c.bgElevated,
    "--navy": c.navy,
    "--navy-light": c.navyLight,
    "--gold": c.gold,
    "--gold-soft": c.goldSoft,
    "--text": c.text,
    "--muted": c.muted,
    "--line": c.line
  };
  Object.keys(map).forEach(function (k) {
    if (map[k]) root.style.setProperty(k, map[k]);
  });

  var f = cfg.theme.fonts || {};
  if (f.display) root.style.setProperty("--font-display", f.display);
  if (f.body) root.style.setProperty("--font-body", f.body);

  // expose the brand name as the document title prefix where useful
  if (cfg.brand && cfg.brand.name) {
    document.documentElement.setAttribute("data-brand", cfg.brand.name);
  }
})();
