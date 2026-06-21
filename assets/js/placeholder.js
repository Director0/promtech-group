/* =============================================================================
   placeholder.js — elegant branded fallback for images that fail to load.
   The demo uses remote placeholder photos (picsum). If they are blocked or you
   are offline, images gracefully fall back to a generated SVG that matches the
   brand colors — never a broken-image icon. Swap config image URLs for your own
   real photos and these fallbacks simply stop being used.
   ========================================================================== */
(function () {
  function colors() {
    var c = (window.SITE_CONFIG && window.SITE_CONFIG.theme && window.SITE_CONFIG.theme.colors) || {};
    return {
      navy: c.navy || "#0A1F3C",
      bg: c.bg || "#05080F",
      gold: c.gold || "#C9A24B",
      goldSoft: c.goldSoft || "#E6C77E",
      muted: c.muted || "#94A4BC"
    };
  }
  function clean(s) { return String(s == null ? "" : s).replace(/[<>&]/g, " "); }

  // Build a deep-navy SVG with a faint architectural skyline + label.
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
      '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0" stop-color="' + c.navy + '"/><stop offset="1" stop-color="' + c.bg + '"/>' +
      '</linearGradient></defs>' +
      '<rect width="' + w + '" height="' + h + '" fill="url(#g)"/>' +
      bld +
      '<line x1="0" y1="' + midY + '" x2="' + w + '" y2="' + midY + '" stroke="' + c.gold + '" stroke-opacity="0.18"/>' +
      '<text x="' + (w * 0.06) + '" y="' + (h * 0.55) + '" fill="' + c.goldSoft + '" ' +
      'font-family="Georgia, serif" font-size="' + Math.max(18, w * 0.045) + '" letter-spacing="1">' + lbl + '</text>' +
      '<text x="' + (w * 0.06) + '" y="' + (h * 0.46) + '" fill="' + c.muted + '" ' +
      'font-family="Arial, sans-serif" font-size="' + Math.max(10, w * 0.016) + '" letter-spacing="4">PROJECT IMAGE</text>' +
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
