/**
 * theme-engine.js
 * ─────────────────────────────────────────────────────────────────────────
 * Blob-shaped button/card theming.
 *
 * - Page background: flat, plain, not-too-saturated color chosen once per
 *   page load (no more Supabase photo backgrounds — see backgrounds-config.js).
 * - Every button/card is masked into a blob shape chosen DETERMINISTICALLY
 *   by its role (icon / utility / main CTA / answer choice / category tile /
 *   panel) — never randomly. Only the fill color gets a small random jitter
 *   (hue ±1-5°, saturation +1-10) around the page background color, so every
 *   button feels like a saturated sibling of the background.
 * - No black shadows, outlines or strokes are ever applied here.
 *
 * Deterministic shape mapping:
 *   circle -> icon-only buttons (.icon)
 *   thin   -> short one-line utility buttons (.small-button, .menu-button.compact)
 *   wide1/wide2 -> main/secondary CTAs and answer choices, alternating by
 *                  sibling position (index 0 -> wide1, index 1 -> wide2, ...)
 *   square -> category tiles (.category-dialog-btn / .category-btn) and
 *             panels whose aspect ratio is close to 1:1
 *   (tall is reserved for future decorative vertical panels; never picked
 *   automatically for buttons/tiles/panels)
 * ─────────────────────────────────────────────────────────────────────────
 */

(function () {
  var BLOBS = {
    circle: "buttons/blob-circle.webp",
    thin: "buttons/blob-thin.webp",
    square: "buttons/blob-square.webp",
    wide1: "buttons/blob-wide-1.webp",
    wide2: "buttons/blob-wide-2.webp",
    tall: "buttons/blob-tall.webp",
    triangle: "buttons/blob-triangle.svg",
    crescent: "buttons/blob-crescent.svg",
    cloud: "buttons/blob-cloud.svg",
    star: "buttons/blob-star.svg",
  };

  var PUBLIC_BLOB_VARIANTS = ["thin", "wide1", "wide2", "triangle", "crescent", "cloud", "star"];
  var naturalPools = {
    utility: ["thin", "triangle", "thin", "crescent", "wide1", "thin", "wide2"],
    cta: ["wide1", "cloud", "wide2", "triangle", "wide1", "crescent", "wide2", "star"],
    tile: ["square", "triangle", "square", "crescent", "wide1", "square", "wide2", "star"],
    icon: ["circle", "triangle", "circle", "crescent", "circle", "star"],
  };
  var naturalCursor = { utility: 0, cta: 0, tile: 0, icon: 0 };
  var lastNaturalVariant = "";

  function normalizedVariant(value) {
    if (!value) return "";
    var key = String(value).trim().toLowerCase().replace(/[\s_-]+/g, "");
    var aliases = {
      thin: "thin", wide1: "wide1", wide2: "wide2",
      triangle: "triangle", crescent: "crescent", cloud: "cloud", star: "star",
      circle: "circle", square: "square", tall: "tall",
    };
    return aliases[key] || "";
  }

  function naturalVariant(role) {
    var pool = naturalPools[role] || naturalPools.utility;
    var cursor = naturalCursor[role] || 0;
    var variant = pool[cursor % pool.length];
    naturalCursor[role] = cursor + 1;
    if (variant === lastNaturalVariant && pool.length > 1) {
      variant = pool[naturalCursor[role] % pool.length];
      naturalCursor[role]++;
    }
    lastNaturalVariant = variant;
    return variant;
  }

  function requestedVariant(el) {
    return normalizedVariant(el.dataset.blobVariant || el.getAttribute("variant"));
  }

  function isCloseControl(el) {
    var marker = [el.id, el.className, el.getAttribute("aria-label")]
      .filter(Boolean).join(" ").toLowerCase();
    return marker.indexOf("close") !== -1 || marker.indexOf("إغلاق") !== -1;
  }

  var closeVariantCursor = 0;
  function closeVariant() {
    var variant = closeVariantCursor % 2 === 0 ? "triangle" : "crescent";
    closeVariantCursor++;
    return variant;
  }

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function getBaseHSL() {
    if (window.CURRENT_BG_HSL) return window.CURRENT_BG_HSL;
    return { h: 250, s: 35, l: 30 };
  }

  /** Every button's fill is a *very close* variation of the current
   *  screen's exact background color — never an unrelated/random hue.
   *  Hue shifts 3-10° either direction, saturation shifts 3-10% either
   *  direction, lightness stays essentially unchanged so the button
   *  still blends into the background like a layered paper/blob cutout,
   *  just barely distinguishable from it.
   *  `biasDir` (-1/1) lets callers force the shift direction (e.g. so
   *  two sibling answer cards always diverge from each other) while the
   *  magnitude and saturation direction stay randomized. */
  function jitteredColor(biasDir) {
    var base = getBaseHSL();
    var hueDir = biasDir === -1 || biasDir === 1 ? biasDir : (Math.random() < 0.5 ? -1 : 1);
    var hueShift = randInt(3, 10) * hueDir;
    var satDir = Math.random() < 0.5 ? -1 : 1;
    var satShift = randInt(3, 10) * satDir;
    var h = (base.h + hueShift + 360) % 360;
    var s = clamp(base.s + satShift, 8, 95);
    var l = clamp(base.l + randInt(-2, 2), 12, 65); // brightness stays close to bg
    return "hsl(" + Math.round(h) + ", " + Math.round(s) + "%, " + Math.round(l) + "%)";
  }

  /** Would-You-Rather answer cards use the same background-derived
   *  variation system as every other button, but bias the two sibling
   *  cards to shift in opposite hue directions so they stay visually
   *  distinct from each other while both still reading as close
   *  siblings of the current screen background. */
  var answerColorCache = {};

  function answerCardColor(index) {
    var key = String(index % 2);
    if (!answerColorCache[key]) {
      answerColorCache[key] = jitteredColor(index % 2 === 0 ? 1 : -1);
    }
    return answerColorCache[key];
  }

  /** Index of `el` among its siblings that match `selector` (DOM order). */
  function siblingIndex(el, selector) {
    var parent = el.parentElement;
    if (!parent) return 0;
    var siblings = parent.querySelectorAll(selector);
    var idx = Array.prototype.indexOf.call(siblings, el);
    return idx < 0 ? 0 : idx;
  }

  function guessOptionIndex(el) {
    var explicitIndex = Number(el.dataset.optionIndex);
    return Number.isInteger(explicitIndex) ? explicitIndex : siblingIndex(el, ".guess-option");
  }

  /** Running counter per CTA "group" so unrelated full-width buttons
   *  elsewhere on the page still alternate wide1/wide2 deterministically,
   *  even when they aren't literal DOM siblings (e.g. New Game / Join Game
   *  each live in their own wrapper div). */
  var ctaCounter = 0;

  /** These specific homepage CTAs always use the same "wide1" blob so
   *  Start/Join always match each other exactly (never alternate). */
  var FORCE_WIDE1_IDS = ["newGameBtn", "joinGameBtn", "nicknameModalInput"];

  /** The floating nickname window's "Start" button is always a solid
   *  green thin blob with white text, regardless of the current
   *  background-jitter color system used everywhere else. */
  var FORCE_GREEN_IDS = ["nicknameStartBtn", "tfConfirmAccept"];
  var FORCE_PINK_IDS = ["tfConfirmCancel"];
  var FORCE_WHITE_IDS = ["endSuggestQuestionBtn"];

  /** Home and lobby Start controls intentionally render as floating white
   *  labels with invisible hit areas. Never apply a blob fill or mask. */
  var INVISIBLE_START_IDS = ["newGameBtn", "startGameBtn"];
  var FORCE_CLOUD_IDS = [];

  /** Lobby action buttons (category / suggest / question-limit / start) all
   *  share the same "wide2" blob and the same big width so they read as one
   *  consistent stack, per the reference design. */
  var FORCE_WIDE2_IDS = [
    "categorySelectionBtn",
    "suggestCategoryBtn",
    "questionLimitBtn",
    "startGameBtn",
  ];

  var PANEL_SELECTOR =
    ".alert-container, .category-dialog-container, .qlimit-container, .suggestion-dialog-container";

  function pickShapeFor(el) {
    // 0. Explicit developer API and semantic overrides.
    var explicit = requestedVariant(el);
    if (explicit && BLOBS[explicit]) return BLOBS[explicit];
    if (FORCE_CLOUD_IDS.indexOf(el.id) !== -1) return BLOBS.cloud;
    if (isCloseControl(el)) return BLOBS[closeVariant()];
    if (FORCE_WIDE1_IDS.indexOf(el.id) !== -1) return BLOBS.wide1;
    if (FORCE_WIDE2_IDS.indexOf(el.id) !== -1) return BLOBS.wide2;

    // 1. Icon controls keep a compact silhouette, with occasional accents.
    if (el.classList.contains("icon")) return BLOBS[naturalVariant("icon")];

    // 2. Category tiles use a varied handcrafted mix.
    if (el.classList.contains("category-dialog-btn") || el.classList.contains("category-btn")) {
      return BLOBS[naturalVariant("tile")];
    }

    // 3. Answer choice cards -> wide1/wide2 alternating by sibling position
    if (el.classList.contains("guess-option")) {
      var gIdx = guessOptionIndex(el);
      return gIdx % 2 === 0 ? BLOBS.wide1 : BLOBS.wide2;
    }

    // 4. Dialog/alert panels -> square if roughly 1:1, else wide (never tall)
    if (el.matches && el.matches(PANEL_SELECTOR)) {
      var rect = el.getBoundingClientRect();
      var w = rect.width || el.offsetWidth || 400;
      var h = rect.height || el.offsetHeight || 300;
      var ratio = w / (h || 1);
      return ratio >= 0.85 && ratio <= 1.3 ? BLOBS.square : BLOBS.wide1;
    }

    // 5. Short one-line utility buttons -> thin
    if (el.classList.contains("small-button") || el.classList.contains("menu-button")
        && el.classList.contains("compact")) {
      return BLOBS[naturalVariant("utility")];
    }

    // 6. Everything else in the small-button family uses the same natural mix.
    if (el.classList.contains("small-button")) return BLOBS[naturalVariant("utility")];

    // 7. Main/secondary CTA buttons (.menu-button, full-width or bare) ->
    //    alternate wide1/wide2 by a page-wide CTA counter, deterministic
    //    per page load (first CTA encountered -> wide1, next -> wide2, ...)
    if (el.classList.contains("menu-button")) {
      ctaCounter++;
      return BLOBS[naturalVariant("cta")];
    }

    return BLOBS[naturalVariant("utility")];
  }

  /** The language switcher stays a simple rounded pill (no blob mask —
   *  it's an inline text control, not a full button), but its fill still
   *  has to follow the same "close variation of the current background"
   *  rule as every other button per the game-wide color system. */
  function isPillTextEl(el) {
    return el.classList.contains("language-toggle") || el.classList.contains("language-option");
  }

  function themeElement(el) {
    if (!el || el.dataset.blobThemed === "1") return;
    el.dataset.blobThemed = "1";

    if (INVISIBLE_START_IDS.indexOf(el.id) !== -1) {
      el.style.setProperty("-webkit-mask-image", "none", "important");
      el.style.setProperty("mask-image", "none", "important");
      el.style.setProperty("background-color", "transparent", "important");
      el.style.setProperty("background", "transparent", "important");
      el.style.setProperty("background-image", "none", "important");
      el.style.setProperty("border", "none", "important");
      el.style.setProperty("box-shadow", "none", "important");
      el.style.setProperty("outline", "none", "important");
      el.style.setProperty("color", "#ffffff", "important");
      el.style.setProperty("text-shadow", "var(--tf-text-shadow)", "important");
      return;
    }

    if (isPillTextEl(el)) {
      var pillColor = jitteredColor();
      el.style.setProperty("background-color", pillColor, "important");
      el.style.setProperty("background", pillColor, "important");
      el.style.setProperty("background-image", "none", "important");
      el.style.setProperty("border-radius", "999px", "important");
      el.style.setProperty("border", "none", "important");
      el.style.setProperty("box-shadow", "none", "important");
      el.style.setProperty("outline", "none", "important");
      return;
    }

    var shapeUrl = pickShapeFor(el);
    var color;
    if (FORCE_WHITE_IDS.indexOf(el.id) !== -1) {
      color = "#ffffff";
    } else if (FORCE_GREEN_IDS.indexOf(el.id) !== -1) {
      color = "#1F6455";
    } else if (FORCE_PINK_IDS.indexOf(el.id) !== -1) {
      color = "#681A43";
    } else if (el.classList.contains("guess-option")) {
      color = answerCardColor(guessOptionIndex(el));
    } else {
      color = jitteredColor();
    }

    var explicitShape = requestedVariant(el)
      || FORCE_CLOUD_IDS.indexOf(el.id) !== -1
      || isCloseControl(el);
    var maskPriority = explicitShape ? "important" : "";
    el.style.setProperty("-webkit-mask-image", "url('" + shapeUrl + "')", maskPriority);
    el.style.setProperty("mask-image", "url('" + shapeUrl + "')", maskPriority);
    el.style.setProperty("-webkit-mask-size", "100% 100%", maskPriority);
    el.style.setProperty("mask-size", "100% 100%", maskPriority);
    el.style.setProperty("-webkit-mask-repeat", "no-repeat", maskPriority);
    el.style.setProperty("mask-repeat", "no-repeat", maskPriority);
    el.style.setProperty("-webkit-mask-position", "center", maskPriority);
    el.style.setProperty("mask-position", "center", maskPriority);
    el.style.setProperty("background-color", color, "important");
    el.style.setProperty("background", color, "important");
    el.style.setProperty("background-image", "none", "important");
    el.style.setProperty("border", "none", "important");
    el.style.setProperty("box-shadow", "none", "important");
    el.style.setProperty("outline", "none", "important");
    el.style.setProperty("text-shadow", "var(--tf-text-shadow)", "important");
  }

  var SELECTOR =
    ".menu-button, .small-button, .guess-option, .alert-container, " +
    ".category-dialog-container, .qlimit-container, .suggestion-dialog-container, " +
    ".category-dialog-btn, .category-btn, .language-toggle, .language-option";

  function themeAll(root) {
    var scope = root || document;
    var nodes = scope.querySelectorAll ? scope.querySelectorAll(SELECTOR) : [];
    for (var i = 0; i < nodes.length; i++) {
      themeElement(nodes[i]);
    }
  }

  /* Path-based bead guide. The path is extracted from the alpha edge of
   * the exact blob asset used by the target. Only individual beads move. */
  var orbitContourCache = {};

  function loadBlobContour(shape, assetUrl) {
    var source = assetUrl || BLOBS[shape];
    if (orbitContourCache[source]) return orbitContourCache[source];

    orbitContourCache[source] = new Promise(function (resolve, reject) {
      var image = new Image();
      image.decoding = "async";
      image.onload = function () {
        var canvas = document.createElement("canvas");
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        var context = canvas.getContext("2d", { willReadFrequently: true });
        context.drawImage(image, 0, 0);
        var pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
        var top = [];
        var bottom = [];

        for (var x = 0; x < canvas.width; x++) {
          var topY = -1;
          var bottomY = -1;

          for (var y = 0; y < canvas.height; y++) {
            if (pixels[(y * canvas.width + x) * 4 + 3] >= 128) {
              topY = y;
              break;
            }
          }

          if (topY < 0) continue;

          for (var reverseY = canvas.height - 1; reverseY >= topY; reverseY--) {
            if (pixels[(reverseY * canvas.width + x) * 4 + 3] >= 128) {
              bottomY = reverseY;
              break;
            }
          }

          top.push([x / canvas.width, topY / canvas.height]);
          bottom.push([x / canvas.width, bottomY / canvas.height]);
        }

        resolve(top.concat(bottom.reverse()));
      };
      image.onerror = reject;
      image.src = source;
    });

    return orbitContourCache[source];
  }

  function orbitPath(points, width, height) {
    var path = "";
    var previousX = null;
    var previousY = null;

    points.forEach(function (point) {
      var x = Math.round(point[0] * width * 10) / 10;
      var y = Math.round(point[1] * height * 10) / 10;
      if (x === previousX && y === previousY) return;
      path += (path ? " L " : "M ") + x + " " + y;
      previousX = x;
      previousY = y;
    });

    return path + " Z";
  }

  function mountBlobDotOrbit(outline, options) {
    if (!outline) return;
    outline.querySelectorAll(".tf-focus-arrow").forEach(function (arrow) {
      arrow.getAnimations().forEach(function (animation) { animation.cancel(); });
      arrow.remove();
    });
    options = options || {};
    var shape = normalizedVariant(options.shape) || "wide2";
    if (!BLOBS[shape]) shape = "wide2";
    var direction = options.direction === "counter-clockwise" ? "counter-clockwise" : "clockwise";
    var dotCount = 28;
    var duration = Number(options.duration) > 0 ? Number(options.duration) : 4800;
    var assetUrl = options.assetUrl || "";

    async function build() {
      var width = outline.clientWidth;
      var height = outline.clientHeight;
      if (!width || !height) return;

      var buildToken = (outline._tfOrbitBuildToken || 0) + 1;
      outline._tfOrbitBuildToken = buildToken;
      var contour = await loadBlobContour(shape, assetUrl);
      if (outline._tfOrbitBuildToken !== buildToken || !outline.isConnected) return;

      outline.querySelectorAll(".tf-orbit-dot").forEach(function (dot) {
        dot.getAnimations().forEach(function (animation) { animation.cancel(); });
        dot.remove();
      });

      var path = orbitPath(contour, width, height);
      var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      for (var i = 0; i < dotCount; i++) {
        var dot = document.createElement("span");
        dot.className = "tf-orbit-dot";
        dot.style.offsetPath = 'path("' + path + '")';
        dot.style.offsetDistance = (i / dotCount * 100) + "%";
        outline.appendChild(dot);

        if (!reducedMotion) {
          var forward = direction === "clockwise";
          dot.animate(
            { offsetDistance: forward ? ["0%", "100%"] : ["100%", "0%"] },
            {
              duration: duration,
              iterations: Infinity,
              easing: "linear",
              delay: -(i / dotCount) * duration,
            }
          );
        }
      }
    }

    window.requestAnimationFrame(build);
    if (!outline._tfOrbitResizeObserver && "ResizeObserver" in window) {
      outline._tfOrbitResizeObserver = new ResizeObserver(build);
      outline._tfOrbitResizeObserver.observe(outline);
    }
  }

  function clearGuidance(outline) {
    if (!outline) return;
    outline._tfOrbitBuildToken = (outline._tfOrbitBuildToken || 0) + 1;
    outline.querySelectorAll(".tf-orbit-dot, .tf-focus-arrow").forEach(function (item) {
      item.getAnimations().forEach(function (animation) { animation.cancel(); });
      item.remove();
    });
  }

  function mountFocusArrows(outline) {
    if (!outline) return;
    clearGuidance(outline);

    var arrowCount = 12;
    var width = outline.clientWidth;
    var height = outline.clientHeight;
    if (!width || !height) return;

    for (var i = 0; i < arrowCount; i++) {
      var angle = -Math.PI / 2 + (i / arrowCount) * Math.PI * 2;
      var arrow = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      arrow.setAttribute("viewBox", "0 0 44 24");
      arrow.setAttribute("aria-hidden", "true");
      arrow.classList.add("tf-focus-arrow");

      var shaft = document.createElementNS("http://www.w3.org/2000/svg", "path");
      shaft.setAttribute("d", i % 2 === 0
        ? "M3 12 C11 9, 20 14, 34 12 M27 6 C30 8, 33 10, 37 12 C33 14, 30 17, 27 19"
        : "M3 13 C12 15, 21 8, 34 12 M27 5 C31 8, 34 10, 38 12 C34 14, 31 16, 28 20");
      arrow.appendChild(shaft);

      var radiusX = width / 2 + 26;
      var radiusY = height / 2 + 24;
      var x = width / 2 + Math.cos(angle) * radiusX;
      var y = height / 2 + Math.sin(angle) * radiusY;
      var rotation = angle * 180 / Math.PI + 180;
      arrow.style.transform = "translate(" + (x - 22) + "px, " + (y - 12) + "px) rotate(" + rotation + "deg)";
      outline.appendChild(arrow);
    }
  }

  window.tfadhloonBlobOrbit = { mount: mountBlobDotOrbit };
  window.tfadhloonFocusArrows = { mount: mountFocusArrows, clear: clearGuidance };
  window.tfadhloonBlobs = {
    variants: PUBLIC_BLOB_VARIANTS.slice(),
    assets: Object.assign({}, BLOBS),
    apply: function (element, variant) {
      if (!element) return;
      var normalized = normalizedVariant(variant);
      if (variant && PUBLIC_BLOB_VARIANTS.indexOf(normalized) === -1) {
        throw new Error("Unsupported blob variant: " + variant);
      }
      if (normalized) element.dataset.blobVariant = normalized;
      else delete element.dataset.blobVariant;
      element.dataset.blobThemed = "";
      themeElement(element);
    },
  };

  function init() {
    themeAll(document);

    var observer = new MutationObserver(function (mutations) {
      for (var i = 0; i < mutations.length; i++) {
        var added = mutations[i].addedNodes;
        for (var j = 0; j < added.length; j++) {
          var node = added[j];
          if (node.nodeType !== 1) continue;
          if (node.matches && node.matches(SELECTOR)) themeElement(node);
          themeAll(node);
        }
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  window.reThemeBlobButtons = function () {
    ctaCounter = 0;
    naturalCursor = { utility: 0, cta: 0, tile: 0, icon: 0 };
    lastNaturalVariant = "";
    closeVariantCursor = 0;
    document.querySelectorAll(SELECTOR).forEach(function (el) {
      el.dataset.blobThemed = "";
    });
    themeAll(document);
  };
})();
