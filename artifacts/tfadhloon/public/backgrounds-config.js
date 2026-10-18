/**
 * backgrounds-config.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Central background configuration for all game screens.
 *
 * HOW TO ADD BACKGROUNDS:
 *   1. Upload your image to Supabase Storage (Dashboard → Storage → New bucket
 *      named "backgrounds" with Public access enabled).
 *   2. Copy the public URL from the bucket (it looks like:
 *      https://xxxx.supabase.co/storage/v1/object/public/backgrounds/my-bg.png)
 *   3. Paste it into the `url` field of an entry below.
 *   4. The `fallback` color is shown if the image fails to load or url is empty.
 *
 * RULES:
 *   - Leave `url: ""` for any slot you haven't uploaded yet → shows fallback color.
 *   - All images are applied with: background-size: cover, background-position: center,
 *     background-repeat: no-repeat, background-attachment: fixed.
 *   - Colors/design otherwise unchanged.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/**
 * The ONLY 5 allowed main-screen background colors, game-wide. Every
 * screen (including the first/start screen) must pick one of these
 * exact colors — no other hue/generated background is permitted.
 *
 * Each entry also carries `zigzagHex` — the exact color used for the
 * hand-drawn wave background pattern on that screen. It is always the
 * same hue/saturation as the main background, just ~2% darker (black).
 */
window.GAME_BACKGROUNDS = [
  { name: "Berry Magenta", hex: "#681A43", h: 328, s: 60, l: 25, zigzagHex: "#641941" },
  { name: "Deep Purple", hex: "#571B5B", h: 296, s: 54, l: 23, zigzagHex: "#531A57" },
  { name: "Dark Eggplant", hex: "#471B50", h: 290, s: 50, l: 21, zigzagHex: "#441A4C" },
  { name: "Teal Green", hex: "#1F6455", h: 167, s: 53, l: 26, zigzagHex: "#1E6052" },
  { name: "Indigo Navy", hex: "#291958", h: 255, s: 56, l: 22, zigzagHex: "#271854" },
];

/**
 * applyGameBackground(targetElement?)
 * Picks a random background from the exact 5-color palette above and
 * applies it to document.body by default. The chosen HSL is stashed on
 * window.CURRENT_BG_HSL so theme-engine.js can derive matching
 * button/card colors from it (small hue/saturation jitter around this
 * exact background, never an unrelated color).
 *
 * Usage (called automatically on DOMContentLoaded, or call manually):
 *   applyGameBackground();          // applies to body
 *   applyGameBackground(myDiv);     // applies to a specific element
 *
 * Returns the chosen { h, s, l, hex, css } color info.
 */
window.applyGameBackground = function (targetEl) {
  var el = targetEl || document.body;

  var palette = window.GAME_BACKGROUNDS;
  var pick = palette[Math.floor(Math.random() * palette.length)];

  el.style.backgroundImage = "none";
  el.style.backgroundColor = pick.hex;

  var info = { h: pick.h, s: pick.s, l: pick.l, hex: pick.hex, css: pick.hex, zigzagHex: pick.zigzagHex };
  window.CURRENT_BG_HSL = info;
  return info;
};

/**
 * IMPORTANT — load-order race fix:
 * theme-engine.js derives every button color from window.CURRENT_BG_HSL,
 * and reads it inside its OWN "DOMContentLoaded" listener. Every page
 * used to call applyGameBackground() from its own page-specific script
 * (tfadhloon-{homepage,lobby,gameplay,finalresults}.js), but those
 * scripts are loaded AFTER theme-engine.js — so theme-engine's listener
 * fired first, before CURRENT_BG_HSL existed, and silently fell back to
 * a hardcoded default color. Buttons then stayed a fixed
 * blue/violet shade no matter what background was actually chosen.
 * Fix: apply the background right here, in backgrounds-config.js,
 * which is always the first of the two scripts to load/run on every
 * page — guaranteeing CURRENT_BG_HSL is set before theme-engine.js's
 * listener (registered second) ever runs. Page-specific scripts should
 * no longer call applyGameBackground() on initial page load (only for
 * legitimate later re-applications, e.g. next round/turn).
 */
document.addEventListener("DOMContentLoaded", function () {
  window.applyGameBackground();
});
