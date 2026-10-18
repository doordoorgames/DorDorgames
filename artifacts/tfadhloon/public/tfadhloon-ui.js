// Shared presentation utilities for Tfadhloon.
// This file intentionally contains no game rules, networking, or persistence logic.
(() => {
  "use strict";

  const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

  function language() {
    const documentLanguage = document.documentElement.lang;
    if (documentLanguage === "en" || documentLanguage === "ar") return documentLanguage;
    return localStorage.getItem("lang") === "en" ? "en" : "ar";
  }

  function text(ar, en) {
    return language() === "ar" ? ar : en;
  }

  function localizedError(error, fallbackAr, fallbackEn) {
    const message = String(error?.message || "").trim();
    if (!message) return text(fallbackAr, fallbackEn);
    const containsArabic = /[\u0600-\u06ff]/.test(message);
    if (language() === "ar") return containsArabic ? message : fallbackAr;
    return containsArabic ? fallbackEn : message;
  }

  function ensureLiveRegion() {
    let region = document.getElementById("tfUiLiveRegion");
    if (!region) {
      region = document.createElement("div");
      region.id = "tfUiLiveRegion";
      region.className = "tf-sr-only";
      region.setAttribute("aria-live", "polite");
      region.setAttribute("aria-atomic", "true");
      document.body.appendChild(region);
    }
    return region;
  }

  function announce(message) {
    const region = ensureLiveRegion();
    region.textContent = "";
    window.setTimeout(() => { region.textContent = message; }, 20);
  }

  function showBusy({ title, message = "", kind = "loading" } = {}) {
    hideBusy();
    const overlay = document.createElement("div");
    overlay.id = "tfUiBusy";
    overlay.className = "tf-ui-state";
    overlay.setAttribute("role", "status");
    overlay.setAttribute("aria-live", "polite");
    overlay.innerHTML = `
      <div class="tf-ui-state-card">
        <div class="tf-ui-orbit" aria-hidden="true"><span></span><span></span><span></span></div>
        <h2 class="tf-ui-state-title"></h2>
        <p class="tf-ui-state-message"></p>
      </div>`;
    overlay.dataset.kind = kind;
    overlay.lang = language();
    overlay.dir = language() === "ar" ? "rtl" : "ltr";
    overlay.querySelector(".tf-ui-state-title").textContent = title || text("لحظة جميلة...", "One moment...");
    overlay.querySelector(".tf-ui-state-message").textContent = message;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add("is-visible"));
    announce(title || message);
    return overlay;
  }

  function hideBusy() {
    const overlay = document.getElementById("tfUiBusy");
    if (!overlay) return;
    overlay.removeAttribute("id");
    overlay.classList.remove("is-visible");
    overlay.classList.add("is-leaving");
    overlay.setAttribute("aria-hidden", "true");
    window.setTimeout(() => overlay.remove(), 180);
  }

  function setButtonLoading(button, loading, label) {
    if (!button) return;
    if (loading) {
      if (!button.dataset.tfOriginalHtml) button.dataset.tfOriginalHtml = button.innerHTML;
      button.disabled = true;
      button.classList.add("is-loading");
      button.setAttribute("aria-busy", "true");
      button.innerHTML = `<span class="tf-button-spinner" aria-hidden="true"></span><span></span>`;
      button.querySelector("span:last-child").textContent = label || text("جاري التحميل", "Loading");
      announce(label || text("جاري التحميل", "Loading"));
    } else {
      if (button.dataset.tfOriginalHtml) {
        button.innerHTML = button.dataset.tfOriginalHtml;
        delete button.dataset.tfOriginalHtml;
      }
      button.classList.remove("is-loading");
      button.removeAttribute("aria-busy");
      button.disabled = false;
    }
  }

  function hideBanner() {
    document.getElementById("tfUiBanner")?.remove();
  }

  function showBanner({ message, type = "info", actionText, onAction } = {}) {
    hideBanner();
    const banner = document.createElement("div");
    banner.id = "tfUiBanner";
    banner.className = `tf-ui-banner is-${type}`;
    banner.lang = language();
    banner.dir = language() === "ar" ? "rtl" : "ltr";
    banner.setAttribute("role", type === "error" ? "alert" : "status");
    const copy = document.createElement("span");
    copy.textContent = message || "";
    banner.appendChild(copy);
    if (actionText && onAction) {
      const action = document.createElement("button");
      action.type = "button";
      action.className = "tf-ui-banner-action";
      action.textContent = actionText;
      action.addEventListener("click", onAction);
      banner.appendChild(action);
    }
    document.body.appendChild(banner);
    announce(message || "");
    return banner;
  }

  function showEmptyState({ icon = "!", title, message, actionText, onAction } = {}) {
    hideBusy();
    document.querySelector(".tf-empty-state")?.remove();
    const state = document.createElement("section");
    state.className = "tf-empty-state";
    state.setAttribute("role", "alert");
    state.innerHTML = `
      <div class="tf-empty-icon" aria-hidden="true"></div>
      <h2 class="tf-empty-title"></h2>
      <p class="tf-empty-message"></p>
      <button type="button" class="tf-empty-action menu-button compact shape-1"></button>`;
    state.querySelector(".tf-empty-icon").textContent = icon;
    state.querySelector(".tf-empty-title").textContent = title || text("ما قدرنا نفتح الغرفة", "We couldn't open this room");
    state.querySelector(".tf-empty-message").textContent = message || text("تأكد من الرمز وحاول مرة ثانية.", "Check the room code and try again.");
    const action = state.querySelector(".tf-empty-action");
    action.textContent = actionText || text("العودة للرئيسية", "Return home");
    action.addEventListener("click", onAction || (() => { window.location.href = "tfadhloon-homepage.html"; }));
    document.body.appendChild(state);
    announce(state.querySelector(".tf-empty-title").textContent);
    return state;
  }

  function animateRound(container) {
    if (!container || reducedMotion) return;
    container.classList.remove("tf-round-enter");
    void container.offsetWidth;
    container.classList.add("tf-round-enter");
    window.setTimeout(() => container.classList.remove("tf-round-enter"), 320);
  }

  function celebrate(target) {
    if (!target || reducedMotion) return;
    const layer = document.createElement("div");
    layer.className = "tf-celebration";
    layer.setAttribute("aria-hidden", "true");
    for (let i = 0; i < 14; i += 1) {
      const piece = document.createElement("span");
      piece.style.setProperty("--i", String(i));
      piece.style.setProperty("--x", `${8 + ((i * 31) % 84)}%`);
      layer.appendChild(piece);
    }
    target.appendChild(layer);
    window.setTimeout(() => layer.remove(), 2200);
  }

  document.addEventListener("pointerdown", (event) => {
    const button = event.target.closest("button, [role='button']");
    if (!button || button.disabled) return;
    button.classList.add("is-pressed");
  });

  for (const eventName of ["pointerup", "pointercancel", "pointerleave"]) {
    document.addEventListener(eventName, (event) => {
      event.target.closest?.("button, [role='button']")?.classList.remove("is-pressed");
    });
  }

  document.addEventListener("click", (event) => {
    const button = event.target.closest("button, [role='button']");
    if (!button || button.disabled) return;
    if (navigator.vibrate) navigator.vibrate(8);
  });

  window.addEventListener("offline", () => {
    showBanner({
      message: text("انقطع الاتصال. نحاول نرجعك للعبة...", "Connection lost. We'll keep your place."),
      type: "error",
      actionText: text("إعادة المحاولة", "Retry"),
      onAction: () => window.location.reload(),
    });
  });

  window.addEventListener("online", () => {
    showBanner({ message: text("رجع الاتصال ✓", "You're back online ✓"), type: "success" });
    window.setTimeout(hideBanner, 1800);
  });

  let scrollIndicatorController = null;

  function initScrollIndicator({ gameplay = false } = {}) {
    scrollIndicatorController?.destroy();

    const indicator = document.createElement("button");
    indicator.type = "button";
    indicator.className = `tf-scroll-indicator${gameplay ? " is-gameplay" : " is-lobby"}`;
    indicator.hidden = true;
    indicator.setAttribute("aria-label", document.documentElement.lang === "ar" ? "مرر للمحتوى التالي" : "Scroll to the next content");
    indicator.innerHTML = `
      <svg viewBox="0 0 34 58" focusable="false" aria-hidden="true">
        <path d="M6 7 C10 11 13 14 17 18 C21 14 25 10 29 6" />
        <path d="M5 23 C9 27 13 31 17 34 C21 31 25 27 30 22" />
        <path d="M7 40 C10 43 13 47 17 51 C21 47 25 43 28 39" />
      </svg>`;

    const findNextContent = () => {
      const viewportBottom = window.scrollY + window.innerHeight;
      const candidates = document.querySelectorAll(
        "[data-scroll-target], .tf-suggestion-footer, .qr-join-card, .players-heading, #playersContainer, .lobby-action-grid, .tf-final-leaderboard, .tf-end-actions, main section, main article, main h2, main h3, main h4, main h5",
      );
      return [...candidates]
        .filter((candidate) => {
          if (candidate.closest(".tf-scroll-indicator")) return false;
          const style = window.getComputedStyle(candidate);
          const rect = candidate.getBoundingClientRect();
          const absoluteTop = rect.top + window.scrollY;
          return style.display !== "none"
            && style.visibility !== "hidden"
            && rect.height > 0
            && absoluteTop > viewportBottom - 24;
        })
        .sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top)[0] || null;
    };

    const scrollToNextContent = () => {
      const target = findNextContent();
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
      window.scrollBy({ top: Math.round(window.innerHeight * 0.8), behavior: "smooth" });
    };

    indicator.addEventListener("click", scrollToNextContent);
    document.body.appendChild(indicator);
    let attentionStarted = false;
    let frame = 0;

    const update = () => {
      frame = 0;
      const root = document.documentElement;
      const remaining = root.scrollHeight - (window.scrollY + window.innerHeight);
      const hasMore = remaining > 48;
      indicator.hidden = !hasMore;
      if (hasMore && gameplay && !attentionStarted) {
        attentionStarted = true;
        indicator.classList.add("is-attending");
      }
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };

    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule, { passive: true });
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true });
    const resizeObserver = typeof ResizeObserver === "undefined"
      ? null
      : new ResizeObserver(schedule);
    resizeObserver?.observe(document.documentElement);
    schedule();

    scrollIndicatorController = {
      refresh: schedule,
      destroy: () => {
        window.removeEventListener("scroll", schedule);
        window.removeEventListener("resize", schedule);
        observer.disconnect();
        resizeObserver?.disconnect();
        if (frame) window.cancelAnimationFrame(frame);
        indicator.remove();
      },
    };
    return scrollIndicatorController;
  }

  function finishBootLoading() {
    const overlay = document.getElementById("tfBootOverlay");
    if (!overlay) return;

    const windowReady = document.readyState === "complete"
      ? Promise.resolve()
      : new Promise((resolve) => window.addEventListener("load", resolve, { once: true }));
    const fontsReady = document.fonts?.ready || Promise.resolve();
    const imagesReady = Promise.all(
      [...document.images].map((image) => {
        if (image.complete) return image.decode?.().catch(() => undefined) || Promise.resolve();
        return new Promise((resolve) => {
          image.addEventListener("load", resolve, { once: true });
          image.addEventListener("error", resolve, { once: true });
        });
      }),
    );

    Promise.all([windowReady, fontsReady, imagesReady]).then(() => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          overlay.classList.add("is-leaving");
          window.setTimeout(() => overlay.remove(), 300);
        });
      });
    });
  }

  finishBootLoading();

  window.tfadhloonUi = {
    announce,
    showBusy,
    hideBusy,
    setButtonLoading,
    showBanner,
    hideBanner,
    showEmptyState,
    animateRound,
    celebrate,
    text,
    localizedError,
    initScrollIndicator,
    refreshScrollIndicator: () => scrollIndicatorController?.refresh(),
  };
})();
