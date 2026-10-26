/* =============================================================================
   placeholder.js — elegant branded fallback for images that fail to load.
   The demo uses remote placeholder photos (picsum). If they are blocked or you
   are offline, images gracefully fall back to a generated SVG that matches the
   brand colors — never a broken-image icon. Swap config image URLs for your own
   real photos and these fallbacks simply stop being used.
   ========================================================================== */
(function () {
  // Read the live theme variables so the fallback matches dark AND light mode.
  function colors() {
    var c = (window.SITE_CONFIG && window.SITE_CONFIG.theme && window.SITE_CONFIG.theme.colors) || {};
    var css = getComputedStyle(document.documentElement);
    function v(name, fb) { return (css.getPropertyValue(name) || "").trim() || fb; }
    return {
      surface: v("--bg-elevated", c.bgElevated || "#181818"),
      gold: v("--gold", c.gold || "#D4A95C"),
      goldSoft: v("--gold-soft", c.goldSoft || "#F1D7A0"),
      muted: v("--muted", c.muted || "#9B9B9B")
    };
  }
  function clean(s) { return String(s == null ? "" : s).replace(/[<>&]/g, " "); }

  // Build a flat SVG (no gradient) with a faint architectural skyline + label.
  window.PH = function (label, w, h) {
    w = Math.round(w) || 1200; h = Math.round(h) || 800;
    var c = colors();
    var lbl = clean(label);
    var midY = h * 0.66;
    // a few simple building blocks for a skyline silhouette
    var bw = w / 7, bld = "";
    for (var i = 0; i < 7; i++) {
      var bh = h * (0.18 + ((i * 37) % 30) / 100);
      bld += '<rect x="' + (i * bw) + '" y="' + (h - bh) + '" width="' + (bw - 6) +
        '" height="' + bh + '" fill="' + c.gold + '" opacity="0.05"/>';
    }
    var svg =
      '<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '">' +
      '<rect width="' + w + '" height="' + h + '" fill="' + c.surface + '"/>' +
      bld +
      '<line x1="0" y1="' + midY + '" x2="' + w + '" y2="' + midY + '" stroke="' + c.gold + '" stroke-opacity="0.18"/>' +
      '<text x="' + (w * 0.06) + '" y="' + (h * 0.55) + '" fill="' + c.gold + '" ' +
      'font-family="Manrope, sans-serif" font-weight="600" font-size="' + Math.max(18, w * 0.045) + '">' + lbl + '</text>' +
      '<text x="' + (w * 0.06) + '" y="' + (h * 0.46) + '" fill="' + c.muted + '" ' +
      'font-family="Manrope, sans-serif" font-size="' + Math.max(10, w * 0.016) + '" letter-spacing="2">PROJECT IMAGE</text>' +
      '</svg>';
    return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  };

  // Attach to an <img> as an error fallback, sized to the rendered box.
  window.PH.set = function (img, label) {
    if (!img) return;
    img.onerror = null;
    var r = img.getBoundingClientRect();
    img.src = window.PH(label || "Meridian Build", r.width || 1200, r.height || 800);
  };
})();
