// Supabase-authoritative lobby. Firebase is intentionally not used here.
(() => {
  "use strict";

  const selectedLanguage = localStorage.getItem("lang") === "en" ? "en" : "ar";
  document.documentElement.lang = selectedLanguage;
  document.documentElement.dir = selectedLanguage === "ar" ? "rtl" : "ltr";

  const code = new URLSearchParams(window.location.search).get("code");
  if (!code) {
    window.location.href = "tfadhloon-homepage.html";
    return;
  }

  const els = {
    accessCode: document.getElementById("accessCode"),
    players: document.getElementById("playersContainer"),
    start: document.getElementById("startGameBtn"),
    category: document.getElementById("categorySelectionBtn"),
    categoryText: document.getElementById("categorySelectionBtnText"),
    limit: document.getElementById("questionLimitBtn"),
    limitText: document.getElementById("questionLimitBtnText"),
    limitSelect: document.getElementById("questionLimitSelect"),
    distribution: document.getElementById("questionDistributionSetting"),
    distributionRadios: document.querySelectorAll('input[name="questionDistributionMode"]'),
    languageSwitcher: document.getElementById("langSwitcherContainer"),
    languageOptions: [...document.querySelectorAll(".language-option")],
    back: document.getElementById("backBtn"),
    waiting: document.getElementById("waitingPlayersText"),
    accessLabel: document.getElementById("accessCodeLabel"),
    adminLabel: document.getElementById("adminSettingsLabel"),
    hostLabel: document.getElementById("hostSettingsLabel"),
    hostHr: document.getElementById("hostSettingsHR"),
    questionLimitDisplay: document.getElementById("questionLimitDisplay"),
    status: document.getElementById("statusText"),
  };

  const CATEGORY_LABELS = {
    "Kuwaiti Girls": { ar: "بنات الكويت", en: "Kuwaiti Girls" },
    "Islamic Things": { ar: "أشياء دينية", en: "Islamic Things" },
    Everything: { ar: "كل شي", en: "Everything" },
    "Dubai Life": { ar: "دبي", en: "Dubai Life" },
    Work: { ar: "دوااام", en: "Work" },
    Gamers: { ar: "اللعيبة", en: "Gamers" },
    Couples: { ar: "كبلز", en: "Couples" },
  };

  let game = null;
  let categories = [];
  let playerName = localStorage.getItem("playerName") || "";
  let unsubscribe = null;
  let refreshQueued = false;
  let realtimeFailed = false;
  let onboardingOutline = null;
  let highlightedButton = null;
  let gameplayAssetsReady = false;
  let gameplayPreloadError = null;
  let gameplayPreloadPromise = null;
  let showPreloadIndicator = false;
  let preloadIndicatorTimer = null;
  let startEnabledLogged = false;
  let startRequestInFlight = false;

  const TEST_BOT = "TestBot";
  const language = () => game?.game_language === "en"
    ? "en"
    : game?.game_language === "ar"
      ? "ar"
      : selectedLanguage;
  const text = (ar, en) => language() === "ar" ? ar : en;
  const localizedError = (error, ar = "حدث خطأ. حاول مرة ثانية.", en = "Something went wrong. Please try again.") =>
    window.tfadhloonUi?.localizedError(error, ar, en) || text(ar, en);
  const categoryLabel = (name) => CATEGORY_LABELS[name]?.[language()] || name || text("اختر الفئة", "Select Category");
  const displayName = (name) => name === TEST_BOT ? `${TEST_BOT} [TEST]` : name;

  const CRITICAL_GAMEPLAY_ASSETS = [
    "tfadhloon-gameplay.html",
    "tfadhloon-gameplay.css?v=20260806-preload-score1",
    "tfadhloon-theme.css?v=20260806-feedback-palette1",
    "custom/custom.css?v=20260806-preload-crash3",
    "tfadhloon-gameplay.js?v=20260806-preload-score1",
    "tfadhloon-ui.js?v=20260802-gameplay-loading2",
    "theme-engine.js?v=20260806-feedback-palette1",
    "backgrounds-config.js",
    "wave-bg.js",
    "custom/lang.js",
    "gallary/background-motion.png",
    "wave-shape-tiled.png",
    "buttons/blob-circle.webp",
    "buttons/blob-thin.webp",
    "buttons/blob-wide-2.webp",
  ];

  function localAssetUrl(reference, base = window.location.href) {
    if (!reference || reference.startsWith("data:") || reference.startsWith("#")) return null;
    try {
      const url = new URL(reference, base);
      return url.origin === window.location.origin ? url.href : null;
    } catch {
      return null;
    }
  }

  const PRELOAD_TIMEOUT_MS = 15000;

  async function measurePreload(label, task) {
    const startedAt = performance.now();
    try {
      return await task();
    } finally {
      const duration = Math.round(performance.now() - startedAt);
      console.info(`[tfadhloon preload] ${label}: ${duration}ms`);
    }
  }

  async function fetchWithPreloadTimeout(url) {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), PRELOAD_TIMEOUT_MS);
    try {
      const response = await fetch(url, {
        cache: "force-cache",
        credentials: "same-origin",
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`Unable to preload ${new URL(url).pathname} (${response.status})`);
      return response;
    } finally {
      window.clearTimeout(timer);
    }
  }

  async function fetchWarmText(reference, base = window.location.href) {
    const url = localAssetUrl(reference, base);
    if (!url) return "";
    return (await fetchWithPreloadTimeout(url)).text();
  }

  async function preloadDecodedAsset(reference) {
    const url = localAssetUrl(reference);
    if (!url) return;
    const pathname = new URL(url).pathname.toLowerCase();

    if (/\.(?:png|jpe?g|gif|webp|svg|avif)$/.test(pathname)) {
      const response = await fetchWithPreloadTimeout(url);
      const contentType = response.headers.get("content-type") || "";
      if (!contentType.toLowerCase().startsWith("image/")) {
        throw new Error(`Invalid image response for ${pathname}: ${contentType || "unknown content type"}`);
      }
      const objectUrl = URL.createObjectURL(await response.blob());
      try {
        const image = new Image();
        image.decoding = "async";
        image.src = objectUrl;
        if (image.decode) await image.decode();
        else await new Promise((resolve, reject) => {
          image.onload = resolve;
          image.onerror = () => reject(new Error(`Unable to decode ${pathname}`));
        });
      } finally {
        URL.revokeObjectURL(objectUrl);
      }
      return;
    }

    if (/\.(?:mp3|wav|ogg|m4a|aac)$/.test(pathname)) {
      const response = await fetchWithPreloadTimeout(url);
      const contentType = response.headers.get("content-type") || "";
      if (!contentType.toLowerCase().startsWith("audio/")) {
        throw new Error(`Invalid audio response for ${pathname}: ${contentType || "unknown content type"}`);
      }
      const objectUrl = URL.createObjectURL(await response.blob());
      await new Promise((resolve, reject) => {
        const audio = new Audio();
        const timer = window.setTimeout(() => finish(new Error(`Timed out preloading ${pathname}`)), PRELOAD_TIMEOUT_MS);
        const finish = (error) => {
          window.clearTimeout(timer);
          audio.removeEventListener("canplaythrough", ready);
          audio.removeEventListener("error", failed);
          URL.revokeObjectURL(objectUrl);
          error ? reject(error) : resolve();
        };
        const ready = () => finish();
        const failed = () => finish(new Error(`Unable to preload ${pathname}`));
        audio.preload = "auto";
        audio.addEventListener("canplaythrough", ready, { once: true });
        audio.addEventListener("error", failed, { once: true });
        audio.src = objectUrl;
        audio.load();
      });
      return;
    }

    await (await fetchWithPreloadTimeout(url)).arrayBuffer();
  }

  function warmGameplayComponents() {
    const warmup = document.createElement("div");
    warmup.className = "tf-gameplay-preload-warmup";
    warmup.setAttribute("aria-hidden", "true");
    warmup.inert = true;
    warmup.innerHTML = `
      <div class="tf-confirm-composition">
        <div class="alert-container tf-confirm-dialog" data-blob-variant="cloud"><h3 class="tf-confirm-title">Ready</h3></div>
        <div class="tf-confirm-actions">
          <button class="small-button icon tf-confirm-choice tf-confirm-cancel" data-blob-variant="triangle">×</button>
          <button class="small-button icon tf-confirm-choice tf-confirm-accept" data-blob-variant="circle">✓</button>
        </div>
      </div>
      <div class="points-dashboard open">
        <div class="dashboard-header"></div>
        <div class="points-container"><div class="point-item"><span class="point-item-name">Player</span><span class="point-item-score">0</span></div></div>
      </div>
      <div class="score-star-crown"><span></span><span></span><span></span><span></span><span></span></div>
      <div id="questionSectionprime">Question</div>
      <div id="optionsContainer"><button class="guess-option">Option</button><button class="guess-option">Option</button></div>`;
    document.body.appendChild(warmup);
    return new Promise((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => {
        warmup.remove();
        resolve();
      }));
    });
  }

  async function preloadGameplayExperience() {
    const totalStartedAt = performance.now();
    await Promise.all(CRITICAL_GAMEPLAY_ASSETS.map((reference) => {
      const url = localAssetUrl(reference);
      return measurePreload(
        `critical: ${new URL(url).pathname}`,
        () => preloadDecodedAsset(url),
      );
    }));

    if (document.fonts?.load) {
      await Promise.all([
        measurePreload("font: Playpen Sans Arabic", () => document.fonts.load('400 32px "Playpen Sans Arabic"', "ع")),
        measurePreload("font: Sniglet", () => document.fonts.load('400 32px "Sniglet"', "Start")),
      ]);
    }

    const total = Math.round(performance.now() - totalStartedAt);
    console.info(`[tfadhloon preload] total critical preload: ${total}ms`);
    return total;
  }

  function alertBox(message, type = "error") {
    const existing = document.querySelector(".alert-overlay");
    if (existing) existing.remove();
    const overlay = document.createElement("div");
    overlay.className = "alert-overlay";
    overlay.innerHTML = `
      <div class="alert-container alert-${type}">
        <div class="alert-header"><h3 class="alert-title">${type === "error" ? text("خطأ", "Error") : text("تنبيه", "Notice")}</h3></div>
        <div class="alert-body"><p class="alert-message"></p></div>
        <div class="alert-footer"><button class="alert-btn alert-btn-primary menu-button compact shape-1">${text("حسنًا", "OK")}</button></div>
      </div>`;
    overlay.querySelector(".alert-message").textContent = message;
    overlay.querySelector("button").addEventListener("click", () => overlay.remove());
    document.body.appendChild(overlay);
  }

  function setLanguageUi() {
    const lang = language();
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    localStorage.setItem("lang", lang);
    document.title = text("ردهة تفضلون", "Tfadhloon Lobby");
    els.waiting.textContent = text("انتظار اللاعبين...", "Waiting for players...");
    els.accessLabel.textContent = text("رمز الدخول", "Access code");
    els.adminLabel.textContent = text("اللاعبون", "Players");
    els.hostLabel.textContent = text("إعدادات المضيف", "Host settings");
    renderStartState();
    els.languageOptions.forEach((option) => {
      const selected = option.dataset.lang === lang;
      option.classList.toggle("active", selected);
      option.setAttribute("aria-pressed", String(selected));
    });
    els.categoryText.textContent = categoryLabel(game?.selected_category);
    els.limitText.textContent = `${game?.question_limit || 5} ${text("سؤال", "Questions")}`;
    const distributionLegend = document.getElementById("questionDistributionLegend");
    const sameLabel = document.getElementById("sameQuestionModeLabel");
    const differentLabel = document.getElementById("differentQuestionModeLabel");
    if (distributionLegend) distributionLegend.textContent = text("توزيع الأسئلة", "Question distribution");
    if (sameLabel) sameLabel.textContent = text("الكل يجاوب على نفس السؤال", "Everyone answers the same question");
    if (differentLabel) differentLabel.textContent = text("كل شخص يجاوب على سؤال مختلف", "Everyone answers a different question");
    const qrLabelMain = document.getElementById("qrLabelMain");
    if (qrLabelMain) qrLabelMain.textContent = text("امسح الكود للدخول", "Scan to join");
    const backText = document.getElementById("backBtnText");
    if (backText) backText.textContent = text("رجوع", "Back");
  }

  function renderPlayers() {
    const players = game?.players || [];
    els.players.innerHTML = "";
    for (const player of players) {
      const box = document.createElement("div");
      box.className = "player-box";
      const name = document.createElement("span");
      name.textContent = displayName(player.name);
      box.appendChild(name);
      if (playerName === game.host && !player.is_host && player.name !== TEST_BOT) {
        const remove = document.createElement("button");
        remove.className = "remove-player-btn small-button icon shape-4";
        remove.textContent = "✖";
        remove.addEventListener("click", async () => {
          try {
            await window.tfadhloonApi.removePlayer(code, player.name);
            await refresh();
          } catch (error) {
            alertBox(localizedError(error));
          }
        });
        box.appendChild(remove);
      }
      els.players.appendChild(box);
    }
    els.status.textContent = text(
      `${players.length} لاعب`,
      `${players.length} players`,
    );
  }

  function syncOnboardingOutline(target) {
    highlightedButton = target;
    if (!onboardingOutline) {
      onboardingOutline = document.createElement("div");
      onboardingOutline.className = "tf-onboarding-outline";
      onboardingOutline.setAttribute("aria-hidden", "true");
      document.querySelector(".lobby-action-grid")?.appendChild(onboardingOutline);
    }
    if (!onboardingOutline || !target) {
      if (onboardingOutline) onboardingOutline.hidden = true;
      return;
    }

    const outset = 0;
    onboardingOutline.hidden = false;
    onboardingOutline.style.left = `${target.offsetLeft - outset}px`;
    onboardingOutline.style.top = `${target.offsetTop - outset}px`;
    onboardingOutline.style.width = `${target.offsetWidth + outset * 2}px`;
    onboardingOutline.style.height = `${target.offsetHeight + outset * 2}px`;
    window.tfadhloonBlobOrbit?.mount(onboardingOutline, {
      shape: "wide2",
      assetUrl: "buttons/blob-wide-2.webp",
      direction: "clockwise",
      duration: 4800,
    });
  }

  function renderStartState() {
    if (!els.start) return;
    const label = text("ابدأ", "START");
    els.start.classList.toggle("is-preparing", !gameplayAssetsReady && showPreloadIndicator);
    els.start.classList.toggle("is-ready-transition", gameplayAssetsReady);
    els.start.setAttribute("aria-busy", String(!gameplayAssetsReady));
    if (gameplayAssetsReady || !showPreloadIndicator) {
      els.start.textContent = label;
      return;
    }
    const hourglass = (alternate = false) => `
      <svg class="tf-hourglass${alternate ? " tf-hourglass-alt" : ""}" viewBox="0 0 48 58" focusable="false" aria-hidden="true">
        <path class="tf-hourglass-frame" d="${alternate ? "M10 8 C18 5 31 7 39 7 M11 49 C18 52 31 51 39 48 M14 10 C15 19 18 24 23 28 C18 34 14 40 13 48 M36 9 C35 20 31 24 25 29 C31 34 35 39 36 47" : "M11 7 C17 5 31 6 38 8 M12 50 C19 53 31 52 38 49 M14 9 C14 20 18 23 24 28 C17 34 13 39 13 49 M36 10 C36 20 31 24 25 28 C32 34 36 40 36 48"}"/>
        <path class="tf-hourglass-sand" d="${alternate ? "M17 13 C22 14 29 13 33 15 C31 20 28 23 24 26 C20 23 18 18 17 13 M17 46 C19 40 22 35 24 32 C29 35 32 40 34 45 C28 44 22 47 17 46" : "M18 13 C23 15 29 13 33 14 C31 20 28 23 24 26 C20 22 18 18 18 13 M17 46 C19 39 22 34 25 31 C29 35 32 40 33 46 C27 44 22 47 17 46"}"/>
      </svg>`;
    els.start.innerHTML = `
      <span class="tf-hourglass-slot tf-hourglass-left">${hourglass()}</span>
      <span class="tf-start-label">${label}</span>
      <span class="tf-hourglass-slot tf-hourglass-right">${hourglass(true)}</span>`;
  }

  function updateControls() {
    renderStartState();
    const isHost = playerName === game?.host;
    const distributionAvailable = game?.question_distribution_mode === "same"
      || game?.question_distribution_mode === "different";
    if (els.distribution) els.distribution.style.display = isHost && distributionAvailable ? "grid" : "none";
    els.distributionRadios.forEach((radio) => {
      radio.checked = radio.value === (game?.question_distribution_mode || "same");
      radio.disabled = !isHost || game?.status !== "lobby";
    });
    for (const element of [els.category, els.limit, els.start]) {
      element.style.display = isHost ? "flex" : "none";
    }
    if (els.languageSwitcher) els.languageSwitcher.style.display = isHost ? "block" : "none";
    els.hostHr.style.display = isHost ? "block" : "none";
    els.hostLabel.style.display = isHost ? "block" : "none";
    const hasCategory = !!game?.selected_category;
    const validCategory = hasCategory && categories.includes(game.selected_category);
    els.category.classList.toggle("needs-category", isHost && !hasCategory);
    els.start.classList.toggle("category-ready", isHost && hasCategory);
    els.category.classList.toggle("onboarding-highlight", isHost && !hasCategory);
    els.start.classList.toggle("onboarding-highlight", isHost && hasCategory);
    syncOnboardingOutline(isHost ? (hasCategory ? els.start : els.category) : null);
    els.start.disabled = !isHost || !gameplayAssetsReady || (game?.players?.length || 0) < 2 || !validCategory;
    if (!els.start.disabled && !startEnabledLogged) {
      startEnabledLogged = true;
      console.info(`[tfadhloon preload] page load -> Start enabled: ${Math.round(performance.now())}ms`);
    }
    els.start.title = !gameplayAssetsReady
      ? text("نجهز اللعبة...", "Preparing gameplay...")
      : !validCategory
        ? text("اختر فئة فيها أسئلة", "Select a category with questions")
        : (game?.players?.length || 0) < 2
          ? text("تحتاج لاعبين على الأقل", "At least two players are required")
          : "";
  }

  async function loadCategories() {
    // The previous implementation downloaded the entire question database here
    // (about 287 KB in English) just to derive these seven stable category names.
    // The start endpoint selects and returns only the first round; later rounds
    // remain server-owned and continue loading independently of this lobby gate.
    categories = Object.keys(CATEGORY_LABELS);
  }

  async function refresh() {
    game = await window.tfadhloonApi.getGame(code);
    if (game.status === "playing") {
      await gameplayPreloadPromise;
      if (!gameplayAssetsReady) throw gameplayPreloadError || new Error("Gameplay assets are not ready.");
      window.location.href = `tfadhloon-gameplay.html?code=${code}`;
      return;
    }
    if (game.status === "ended") {
      alertBox(text("انتهت اللعبة", "The game has ended"), "warning");
    }
    await loadCategories();
    setLanguageUi();
    renderPlayers();
    updateControls();
  }

  function queueRefresh() {
    if (refreshQueued) return;
    refreshQueued = true;
    setTimeout(async () => {
      refreshQueued = false;
      try {
        await refresh();
        if (realtimeFailed) {
          realtimeFailed = false;
          window.tfadhloonUi?.showBanner({
            message: text("رجع الاتصال ✓", "Reconnected ✓"),
            type: "success",
          });
          window.setTimeout(() => window.tfadhloonUi?.hideBanner(), 1600);
        }
      } catch (error) {
        window.tfadhloonUi?.showBanner({
          message: text("تعذر تحديث الغرفة", "Unable to refresh the room"),
          type: "error",
          actionText: text("إعادة المحاولة", "Retry"),
          onAction: queueRefresh,
        });
        console.error("Lobby refresh error:", error);
      }
    }, 80);
  }

  async function ensurePlayer() {
    let current = await window.tfadhloonApi.getGame(code);
    if (!playerName) {
      const entered = window.prompt(current.game_language === "ar" ? "اكتب اسمك" : "Enter your name");
      if (!entered?.trim()) throw new Error("Player name is required.");
      playerName = entered.trim();
      await window.tfadhloonApi.joinGame(code, playerName);
      localStorage.setItem("playerName", playerName);
      localStorage.setItem("gameCode", code);
      current = await window.tfadhloonApi.getGame(code);
    } else if (!current.players?.some((player) => player.name === playerName)) {
      await window.tfadhloonApi.joinGame(code, playerName);
      current = await window.tfadhloonApi.getGame(code);
    }
    const hostNickname = current.host;
    if (
      hostNickname === "Test99" &&
      playerName === hostNickname &&
      !current.players?.some((player) => player.name === TEST_BOT)
    ) {
      try {
        await window.tfadhloonApi.joinGame(code, TEST_BOT);
      } catch (error) {
        const latest = await window.tfadhloonApi.getGame(code);
        if (!latest.players?.some((player) => player.name === TEST_BOT)) throw error;
      }
      current = await window.tfadhloonApi.getGame(code);
    }
    game = current;
  }

  function showCategoryDialog() {
    const dialog = document.createElement("div");
    dialog.className = "category-dialog";
    const buttons = categories.map((category, index) => {
      return `<button type="button" data-category="${category}" class="category-dialog-btn menu-button compact shape-${index % 4 + 1}" aria-label="${categoryLabel(category)}">${categoryLabel(category)}</button>`;
    }).join("");
    dialog.innerHTML = `
      <div class="category-dialog-container">
        <div class="category-dialog-header"><button class="category-dialog-close small-button icon shape-4" data-blob-variant="crescent">×</button><h2 class="category-dialog-heading">${text("اختر الفئة", "Select Category")}</h2></div>
        <div class="category-grid">${buttons || `<div>${text("لا توجد فئات متاحة", "No categories available")}</div>`}</div>
      </div>`;
    dialog.querySelector(".category-dialog-close").addEventListener("click", () => dialog.remove());
    dialog.querySelectorAll("[data-category]").forEach((button) => {
      button.addEventListener("click", async () => {
        const selected = button.dataset.category;
        const previousCategory = game?.selected_category || null;

        game = { ...game, selected_category: selected };
        els.categoryText.textContent = categoryLabel(selected);
        updateControls();
        dialog.remove();

        try {
          await window.tfadhloonApi.patchGame(code, {
            selected_category: selected,
            category_language: language() === "ar" ? "arabic" : "english",
          });
          await refresh();
        } catch (error) {
          game = { ...game, selected_category: previousCategory };
          els.categoryText.textContent = categoryLabel(previousCategory);
          updateControls();
          alertBox(localizedError(error));
        }
      });
    });
    document.body.appendChild(dialog);
  }

  async function changeLimit() {
    const value = window.prompt(text("عدد الأسئلة: 5، 10، 20، 30، 40، 80، 100", "Question count: 5, 10, 20, 30, 40, 80, 100"), String(game.question_limit || 5));
    if (value === null) return;
    const limit = Number(value);
    if (![5, 10, 20, 30, 40, 80, 100].includes(limit)) {
      alertBox(text("عدد الأسئلة غير صالح", "Invalid question count"));
      return;
    }
    await window.tfadhloonApi.patchGame(code, { question_limit: limit });
    await refresh();
  }

  async function startGame() {
    if (startRequestInFlight || els.start.disabled) return;
    startRequestInFlight = true;
    els.start.classList.remove("category-ready", "onboarding-highlight");
    syncOnboardingOutline(null);
    els.start.disabled = true;
    window.tfadhloonUi?.showBusy({
      title: text("نجهز أول سؤال...", "Loading the first question..."),
      message: text("كل اللاعبين بيدخلون معاكم", "Everyone will enter together"),
    });
    try {
      if (!game.selected_category) throw new Error(text("اختر فئة أولاً", "Select a category first"));
      await gameplayPreloadPromise;
      if (!gameplayAssetsReady) throw gameplayPreloadError || new Error("Gameplay assets are not ready.");
      const result = await measurePreload("request: first round", () => window.tfadhloonApi.startGame(code));
      if (!result?.started || result.status !== "playing" || !result.currentRound?.question) {
        throw new Error(text("تعذر بدء الغرفة", "The room could not start"));
      }
      window.location.href = `tfadhloon-gameplay.html?code=${code}`;
    } catch (error) {
      window.tfadhloonUi?.hideBusy();
      alertBox(localizedError(error, "تعذر بدء اللعبة", "Unable to start game"));
    } finally {
      startRequestInFlight = false;
      if (game?.status !== "playing") updateControls();
    }
  }

  function initializeQr() {
    const card = document.getElementById("qrJoinCard");
    const target = document.getElementById("qrCodeEl");
    if (!card || !target || typeof QRCode === "undefined") return;
    const url = `${window.location.origin}/tfadhloon-homepage.html?room=${encodeURIComponent(code)}`;
    new QRCode(target, { text: url, width: 200, height: 200, correctLevel: QRCode.CorrectLevel.M });
    card.style.display = "flex";
  }

  async function init() {
    els.accessCode.textContent = code;
    window.tfadhloonUi?.showBusy({
      title: text("نفتح الغرفة...", "Opening the room..."),
      message: text("نجهز اللاعبين والإعدادات", "Loading players and settings"),
    });
    try {
      if (!window.tfadhloonApi) throw new Error("Game service is unavailable.");
      await ensurePlayer();
      await refresh();
      unsubscribe = await window.tfadhloonApi.subscribeGame(
        code,
        queueRefresh,
        (error) => {
          if (realtimeFailed) return;
          realtimeFailed = true;
          window.tfadhloonUi?.showBanner({
            message: text("الاتصال ضعيف. مكانكم محفوظ.", "Connection interrupted. Your place is safe."),
            type: "error",
            actionText: text("إعادة المحاولة", "Retry"),
            onAction: () => window.location.reload(),
          });
          console.error("Lobby realtime error:", error);
        },
      );
      initializeQr();
      window.tfadhloonUi?.initScrollIndicator({ gameplay: false });
      window.tfadhloonUi?.hideBusy();
    } catch (error) {
      const roomWasNotFound = /game not found|room not found/i.test(error?.message || "");
      if (!roomWasNotFound) console.error("Unable to open room:", error);
      window.tfadhloonUi?.showEmptyState({
        icon: "!",
        title: text("الغرفة مو موجودة", "Room not found"),
        message: text("تأكدوا من رمز الدخول أو ارجعوا للرئيسية.", "Check the access code or return home."),
        actionText: text("العودة للرئيسية", "Return home"),
        onAction: () => { window.location.href = "tfadhloon-homepage.html"; },
      });
    }
  }

  els.category?.addEventListener("click", showCategoryDialog);
  els.limit?.addEventListener("click", () => changeLimit().catch((error) => alertBox(localizedError(error, "تعذر تحديث عدد الأسئلة", "Unable to update the question count"))));
  els.distributionRadios.forEach((radio) => radio.addEventListener("change", async () => {
    if (!radio.checked || playerName !== game?.host) return;
    const previousMode = game?.question_distribution_mode || "different";
    const nextMode = radio.value;
    game = { ...game, question_distribution_mode: nextMode };
    updateControls();
    try {
      await window.tfadhloonApi.patchGame(code, { question_distribution_mode: nextMode });
    } catch (error) {
      game = { ...game, question_distribution_mode: previousMode };
      updateControls();
      alertBox(localizedError(error, "تعذر تحديث توزيع الأسئلة", "Unable to update question distribution"));
    }
  }));
  els.languageOptions.forEach((option) => {
    option.addEventListener("click", async () => {
      const selectedLanguage = option.dataset.lang === "en" ? "en" : "ar";
      if (selectedLanguage === language()) return;
      try {
        await window.tfadhloonApi.patchGame(code, {
          game_language: selectedLanguage,
          selected_category: null,
        });
        await refresh();
      } catch (error) {
        alertBox(localizedError(error));
      }
    });
  });
  els.start?.addEventListener("click", startGame);
  els.back?.addEventListener("click", async () => {
    try {
      if (game && playerName !== game.host) await window.tfadhloonApi.removePlayer(code, playerName);
    } finally {
      localStorage.removeItem("gameCode");
      window.location.href = "tfadhloon-homepage.html";
    }
  });
  window.addEventListener("pageshow", (event) => {
    if (event.persisted) queueRefresh();
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") queueRefresh();
  });
  window.addEventListener("focus", queueRefresh);
  window.addEventListener("resize", () => syncOnboardingOutline(highlightedButton));
  window.addEventListener("beforeunload", () => { if (unsubscribe) unsubscribe(); });

  renderStartState();
  preloadIndicatorTimer = window.setTimeout(() => {
    if (gameplayAssetsReady) return;
    showPreloadIndicator = true;
    renderStartState();
  }, 1000);
  gameplayPreloadPromise = preloadGameplayExperience()
    .then((criticalDuration) => {
      gameplayAssetsReady = true;
      gameplayPreloadError = null;
      showPreloadIndicator = false;
      window.clearTimeout(preloadIndicatorTimer);
      console.info(`[tfadhloon preload] critical gate ready: ${criticalDuration}ms; slowest class: critical network asset`);
      if (game) updateControls();
      const warm = () => measurePreload("deferred: component warmup", warmGameplayComponents).catch((error) => console.warn("[tfadhloon preload] deferred warmup failed:", error));
      if ("requestIdleCallback" in window) window.requestIdleCallback(warm, { timeout: 2000 });
      else window.setTimeout(warm, 0);
    })
    .catch((error) => {
      gameplayAssetsReady = false;
      gameplayPreloadError = error;
      console.error("Unable to preload gameplay:", error);
      if (game) updateControls();
    });

  init();
})();
