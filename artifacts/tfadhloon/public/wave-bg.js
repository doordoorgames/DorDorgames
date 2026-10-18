/**
 * wave-bg.js
 * Tiles wave-shape-tiled.png as a scrolling background on every game screen,
 * using CSS masking so the fill color is EXACT (no filter approximation).
 *
 * Color rules:
 *  - Default : window.CURRENT_BG_HSL.zigzagHex (exact per-background hex,
 *              see backgrounds-config.js — same hue/sat, ~2% darker)
 *  - Yellow  : var(--game-yellow) — alternating zigzags only, while it is
 *              the player's own turn to choose
 *
 * Density: wave-shape-tiled.png already bakes in a real transparent gap
 * below the artwork (the source image is 2x the artwork's own height,
 * artwork on top, transparent padding below) — this halves the visible
 * shape count via genuine empty space, never by scaling the artwork.
 * The image is ALWAYS scaled uniformly (same factor on both axes) so the
 * hand-drawn shape is never stretched/distorted at any viewport size.
 *
 * API:
 *  window.waveBg.setYellow()   – player's own choose turn
 *  window.waveBg.setDefault()  – waiting / guessing / submitted / round over
 */
(function () {
  "use strict";

  var IMG_SRC          = "wave-shape-tiled.png"; // artwork + transparent gap baked in
  var SPEED             = 0.6;   // px per frame scrolling upward
  var TRANSITION_MS     = 480;   // ms for color transition (CSS)
  var DEFAULT_FALLBACK  = "#3a2245";

  var waveEl   = null;
  var accentEl = null;
  var waveImg  = null;
  var tileH   = 0;
  var scrollY = 0;
  var isYellow = false;

  function currentDefaultHex() {
    var bg = window.CURRENT_BG_HSL;
    return (bg && bg.zigzagHex) || DEFAULT_FALLBACK;
  }

  function brandYellow() {
    var token = getComputedStyle(document.documentElement)
      .getPropertyValue("--game-yellow")
      .trim();
    return token || "#F2F459";
  }

  function applyColor(animated) {
    if (!waveEl || !accentEl) return;
    waveEl.style.backgroundColor = currentDefaultHex();
    accentEl.style.backgroundColor = brandYellow();
    accentEl.style.transition = animated
      ? "opacity " + TRANSITION_MS + "ms ease"
      : "none";
    accentEl.style.opacity = isYellow ? "1" : "0";
  }

  /* ── scroll animation ────────────────────────────────────────── */
  function tick() {
    if (tileH > 0) {
      scrollY += SPEED;
      var offset = -(scrollY % tileH);
      if (offset > 0) offset -= tileH;
      var pos = "0 " + offset + "px";
      waveEl.style.maskPosition = pos;
      waveEl.style.webkitMaskPosition = pos;
      if (accentEl) {
        var accentOffset = -(scrollY % (tileH * 2));
        var accentPos = "0 " + accentOffset + "px";
        accentEl.style.maskPosition = accentPos;
        accentEl.style.webkitMaskPosition = accentPos;
      }
    }
    requestAnimationFrame(tick);
  }

  /* ── background redirect: body bg → <html> so wave shows ─────── */
  function redirectBodyBg() {
    var cur = document.body.style.backgroundColor;
    if (cur && cur !== "transparent" && cur !== "") {
      document.documentElement.style.backgroundColor = cur;
      document.body.style.backgroundColor = "transparent";
      document.body.style.background      = "transparent";
    }
  }

  /* ── recalculate tile height on load / resize ────────────────── */
  /* Same scale factor applied to width and height (uniform scaling) —
     the artwork's own aspect ratio is always preserved exactly. */
  function recalcTileH() {
    if (!waveImg || !waveImg.naturalWidth) return;
    var scale = window.innerWidth / waveImg.naturalWidth;
    tileH = Math.round(waveImg.naturalHeight * scale);
    var size = "100% " + tileH + "px";
    waveEl.style.maskSize = size;
    waveEl.style.webkitMaskSize = size;
    if (accentEl) {
      var accentSize = "100% " + (tileH * 2) + "px";
      accentEl.style.maskSize = accentSize;
      accentEl.style.webkitMaskSize = accentSize;
    }
  }

  /* ── init ────────────────────────────────────────────────────── */
  function init() {
    redirectBodyBg();

    /* Watch for body-style mutations (backgrounds-config, theme-engine) */
    var mo = new MutationObserver(function () {
      redirectBodyBg();
      if (!isYellow) applyColor(false); /* refresh if bg color changed */
    });
    mo.observe(document.body, { attributes: true, attributeFilter: ["style"] });

    /* Build the wave element — color comes from background-color,
       shape comes from the PNG used purely as an alpha mask. */
    waveEl = document.createElement("div");
    waveEl.id = "wave-bg";
    waveEl.style.cssText = [
      "position:fixed",
      "top:0",
      "left:0",
      "width:100%",
      "height:100%",
      "z-index:-1",
      "pointer-events:none",
      "mask-image:url(" + IMG_SRC + ")",
      "-webkit-mask-image:url(" + IMG_SRC + ")",
      "mask-repeat:repeat-y",
      "-webkit-mask-repeat:repeat-y",
      "mask-position:0 0",
      "-webkit-mask-position:0 0",
      "will-change:mask-position",
    ].join(";");

    accentEl = document.createElement("div");
    accentEl.id = "wave-bg-accent";
    accentEl.style.cssText = [
      "position:fixed",
      "top:0",
      "left:0",
      "width:100%",
      "height:100%",
      "z-index:-1",
      "pointer-events:none",
      "mask-repeat:repeat-y",
      "-webkit-mask-repeat:repeat-y",
      "mask-position:0 0",
      "-webkit-mask-position:0 0",
      "will-change:mask-position,opacity",
      "opacity:0",
    ].join(";");

    document.body.insertBefore(accentEl, document.body.firstChild);
    document.body.insertBefore(waveEl, accentEl);
    applyColor(false);

    /* Load the image to read its dimensions and build a mask containing
       one painted tile followed by one transparent tile. The resulting
       repeating mask colors only every other zigzag. */
    var img = new Image();
    img.onload = function () {
      waveImg = img;
      var canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight * 2;
      canvas.getContext("2d").drawImage(img, 0, 0);
      var alternatingMask = canvas.toDataURL("image/png");
      accentEl.style.maskImage = "url(" + alternatingMask + ")";
      accentEl.style.webkitMaskImage = "url(" + alternatingMask + ")";
      recalcTileH();
    };
    img.onerror = function () {
      console.warn("[wave-bg] could not load " + IMG_SRC);
    };
    img.src = IMG_SRC;

    window.addEventListener("resize", recalcTileH);

    requestAnimationFrame(tick);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  /* ── public API ──────────────────────────────────────────────── */
  window.waveBg = {
    setYellow: function () {
      if (isYellow) return;
      isYellow = true;
      applyColor(true);
    },
    setDefault: function () {
      if (!isYellow) return;
      isYellow = false;
      applyColor(true);
    },
  };
})();
