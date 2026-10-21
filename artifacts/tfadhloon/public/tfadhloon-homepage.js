// Set game type
localStorage.setItem("selectedGameType", "tfadhloon");

// Room and gameplay state remain authoritative in Supabase via tfadhloonApi.
let currentAds = [];
let currentAdIndex = 0;

let newGameBtn;
let joinGameBtn;
let homeNameInput;
let homeNameLabel;
let gameContainer;
let backBtn;
let backBtnText;
let howToPlayBtn;
let tutorialOverlay;
let tutorialCloseBtn;
let roomCodeOverlay;
let roomCodeInput;
let roomCodeSubmitBtn;
let roomCodeCloseBtn;
let pendingRoomCode = "";
let roomLinkMode = false;

document.addEventListener("DOMContentLoaded", function () {
  newGameBtn = document.getElementById("newGameBtn");
  joinGameBtn = document.getElementById("joinGameBtn");
  homeNameInput = document.getElementById("homeNameInput");
  homeNameLabel = document.getElementById("homeNameLabel");
  gameContainer = document.querySelector(".game-container");
  backBtn = document.getElementById("backBtn");
  backBtnText = document.getElementById("backBtnText");
  howToPlayBtn = document.getElementById("howToPlayBtn");
  tutorialOverlay = document.getElementById("tutorialOverlay");
  tutorialCloseBtn = document.getElementById("tutorialCloseBtn");
  roomCodeOverlay = document.getElementById("roomCodeOverlay");
  roomCodeInput = document.getElementById("joinGameInput");
  roomCodeSubmitBtn = document.getElementById("roomCodeSubmitBtn");
  roomCodeCloseBtn = document.getElementById("roomCodeCloseBtn");

  const languageOptions = document.querySelectorAll(".language-option");

  function updateLanguageDisplay(lang) {
    languageOptions.forEach((option) => {
      const selected = option.dataset.lang === lang;
      option.classList.toggle("active", selected);
      option.setAttribute("aria-pressed", String(selected));
    });
  }

  languageOptions.forEach((option) => {
    option.addEventListener("click", function () {
      const selectedLang = this.dataset.lang;
      localStorage.setItem("lang", selectedLang);
      document.documentElement.lang = selectedLang;
      document.documentElement.dir = selectedLang === "ar" ? "rtl" : "ltr";
      updateLanguageDisplay(selectedLang);
      updateLocalizedUI();
    });
  });

  const selectedLang = localStorage.getItem("lang") || "ar";
  localStorage.setItem("lang", selectedLang);
  document.documentElement.lang = selectedLang;
  document.documentElement.dir = selectedLang === "ar" ? "rtl" : "ltr";
  updateLanguageDisplay(selectedLang);

  homeNameInput.value = localStorage.getItem("playerName") || "";
  if (!homeNameInput.value) {
    fetch("https://dordorgames-production.up.railway.app/api/auth/me", { credentials: "include", headers: { Accept: "application/json" } })
      .then((response) => response.ok ? response.json() : null)
      .then((account) => {
        const name = typeof account?.fullName === "string" ? account.fullName.trim().slice(0, 24) : "";
        if (name && !homeNameInput.value) {
          homeNameInput.value = name;
          updateNameOutline();
        }
      })
      .catch(() => console.debug("[Account] Profile name could not be loaded."));
  }
  homeNameInput.addEventListener("input", updateNameOutline);
  homeNameInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      if (roomLinkMode) submitJoinGame();
      else submitNewGame();
    }
  });

  roomCodeInput.addEventListener("input", () => {
    roomCodeInput.value = roomCodeInput.value.replace(/[^0-9]/g, "").slice(0, 5);
    roomCodeInput.setCustomValidity("");
  });
  roomCodeInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") submitJoinGame();
  });

  newGameBtn.addEventListener("click", submitNewGame);
  joinGameBtn.addEventListener("click", () => {
    if (roomLinkMode) submitJoinGame();
    else openRoomCodeModal();
  });
  roomCodeSubmitBtn.addEventListener("click", submitJoinGame);
  roomCodeCloseBtn.addEventListener("click", closeRoomCodeModal);
  roomCodeOverlay.addEventListener("click", (event) => {
    if (event.target === roomCodeOverlay) closeRoomCodeModal();
  });
  const closeTutorial = () => {
    tutorialOverlay.classList.remove("open");
    tutorialOverlay.setAttribute("aria-hidden", "true");
    howToPlayBtn.focus();
  };
  backBtn?.addEventListener("click", () => { window.location.href = "https://www.dordor.games/"; });
  howToPlayBtn.addEventListener("click", () => {
    tutorialOverlay.classList.add("open");
    tutorialOverlay.setAttribute("aria-hidden", "false");
    tutorialCloseBtn.focus();
  });
  tutorialCloseBtn.addEventListener("click", closeTutorial);
  tutorialOverlay.addEventListener("click", (event) => {
    if (event.target === tutorialOverlay) closeTutorial();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && tutorialOverlay.classList.contains("open")) closeTutorial();
  });

  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", () => {
      if (roomCodeOverlay.classList.contains("open")) {
        roomCodeInput.scrollIntoView({ block: "center" });
      }
    });
  }

  updateLocalizedUI();
  updateNameOutline();
  syncHomeGuidance();
  initializeRoomLinkJoin();
  loadAdsFromApi();

  requestAnimationFrame(focusNameInput);
  setTimeout(focusNameInput, 120);
});

function currentLanguage() {
  return localStorage.getItem("lang") === "en" ? "en" : "ar";
}

function focusNameInput() {
  if (!homeNameInput || roomCodeOverlay?.classList.contains("open")) return;
  homeNameInput.focus({ preventScroll: true });
  const length = homeNameInput.value.length;
  homeNameInput.setSelectionRange(length, length);
}

function validHomeName() {
  const name = homeNameInput.value.trim();
  if (name) return name;
  updateNameOutline();
  focusNameInput();
  return "";
}

function updateNameOutline() {
  syncHomeGuidance();
}

function syncHomeGuidance() {
  const outline = document.getElementById("homeGuidanceOutline");
  if (!outline || !homeNameInput || !newGameBtn || !gameContainer) return;

  const target = homeNameInput.value.trim()
    ? (roomLinkMode ? joinGameBtn : newGameBtn)
    : homeNameInput;
  const targetRect = target.getBoundingClientRect();
  const containerRect = gameContainer.getBoundingClientRect();

  outline.hidden = false;
  outline.style.left = `${targetRect.left - containerRect.left}px`;
  outline.style.top = `${targetRect.top - containerRect.top}px`;
  outline.style.width = `${targetRect.width}px`;
  outline.style.height = `${targetRect.height}px`;

  window.tfadhloonBlobOrbit?.mount(outline, {
    shape: "wide1",
    assetUrl: "buttons/blob-wide-1.webp",
    direction: "clockwise",
    duration: 9600,
  });
}

function hideHomeGuidance() {
  const outline = document.getElementById("homeGuidanceOutline");
  if (outline) {
    window.tfadhloonFocusArrows?.clear(outline);
    outline.hidden = true;
  }
}

window.addEventListener("resize", syncHomeGuidance);

function openRoomCodeModal() {
  const name = validHomeName();
  if (!name) return;
  if (pendingRoomCode && !roomCodeInput.value) roomCodeInput.value = pendingRoomCode;
  roomCodeOverlay.classList.add("open");
  roomCodeOverlay.setAttribute("aria-hidden", "false");
  setTimeout(() => {
    roomCodeInput.focus({ preventScroll: true });
    roomCodeInput.select();
  }, 50);
}

function closeRoomCodeModal() {
  roomCodeOverlay.classList.remove("open");
  roomCodeOverlay.setAttribute("aria-hidden", "true");
  setTimeout(() => joinGameBtn?.focus({ preventScroll: true }), 0);
}

async function submitNewGame() {
  const account = await window.DordorAccountReady;
  if (account?.role !== "host") {
    window.beautifulAlert.error("A host account is required to create a room.");
    return;
  }
  const name = validHomeName();
  if (!name) return;

  hideHomeGuidance();
  localStorage.setItem("hostNameFor_", "host");
  localStorage.setItem("playerName", name);
  const gameCode = generateGameCode();
  localStorage.setItem("gameCode", gameCode);
  const hostLang = currentLanguage();

  try {
    newGameBtn.disabled = true;
    window.tfadhloonUi?.showBusy({
      title: hostLang === "ar" ? "نجهز غرفتكم..." : "Preparing your room...",
      message: hostLang === "ar" ? "ثواني وتكون جاهزة" : "This will only take a moment",
    });
    if (!window.tfadhloonApi?.createGame) throw new Error("Game service is unavailable.");
    await window.tfadhloonApi.createGame(name, hostLang, gameCode);
    window.location.href = `tfadhloon-lobby.html?code=${gameCode}`;
  } catch (error) {
    window.tfadhloonUi?.hideBusy();
    newGameBtn.disabled = false;
    console.error("Error creating game:", error);
    window.beautifulAlert.error(t("createGameError") || "Failed to create game.");
  }
}

async function submitJoinGame() {
  const name = validHomeName();
  if (!name) {
    closeRoomCodeModal();
    return;
  }

  const code = roomCodeInput.value.trim();
  if (!/^\d{5}$/.test(code)) {
    roomCodeInput.setCustomValidity(
      currentLanguage() === "ar" ? "أدخل رمز الغرفة المكون من 5 أرقام" : "Enter the 5-digit room code",
    );
    roomCodeInput.reportValidity();
    roomCodeInput.focus();
    return;
  }

  try {
    window.tfadhloonUi?.setButtonLoading(
      roomCodeSubmitBtn,
      true,
      currentLanguage() === "ar" ? "جاري التحقق" : "Checking room",
    );
    window.tfadhloonUi?.showBusy({
      title: currentLanguage() === "ar" ? "نبحث عن الغرفة..." : "Finding your room...",
      message: currentLanguage() === "ar" ? "نتأكد من رمز الدخول" : "Checking the access code",
    });
    if (!window.tfadhloonApi?.getGame || !window.tfadhloonApi?.joinGame) {
      throw new Error("Game service is unavailable.");
    }

    const gameData = await window.tfadhloonApi.getGame(code);
    if (gameData.status !== "lobby") {
      throw new Error(t("gameAlreadyStarted") || "Game already started.");
    }

    window.tfadhloonUi?.setButtonLoading(
      roomCodeSubmitBtn,
      true,
      gameData.game_language === "en" ? "Joining" : "جاري الدخول",
    );
    await window.tfadhloonApi.joinGame(code, name);

    const roomLang = gameData.game_language === "en" ? "en" : "ar";
    localStorage.setItem("lang", roomLang);
    localStorage.setItem("playerName", name);
    localStorage.setItem("gameCode", code);
    document.documentElement.lang = roomLang;
    document.documentElement.dir = roomLang === "ar" ? "rtl" : "ltr";
    window.location.href = `tfadhloon-lobby.html?code=${code}`;
  } catch (error) {
    window.tfadhloonUi?.hideBusy();
    window.tfadhloonUi?.setButtonLoading(roomCodeSubmitBtn, false);
    console.error("Error joining game:", error);
    window.beautifulAlert.error(t("joinGameError") || "Failed to join game. Please try again.");
  }
}

async function initializeRoomLinkJoin() {
  const roomCode = new URLSearchParams(window.location.search).get("room")?.trim();
  if (!roomCode) return;

  pendingRoomCode = roomCode.replace(/[^0-9]/g, "").slice(0, 5);
  roomCodeInput.value = pendingRoomCode;

  try {
    if (!window.tfadhloonApi?.getGame) throw new Error("Game service is unavailable.");
    const room = await window.tfadhloonApi.getGame(pendingRoomCode);
    if (!room || room.status !== "lobby") throw new Error("Room no longer exists");

    roomLinkMode = true;
    gameContainer?.classList.add("room-link-mode");
    const roomLang = room.game_language === "en" ? "en" : "ar";
    localStorage.setItem("lang", roomLang);
    document.documentElement.lang = roomLang;
    document.documentElement.dir = roomLang === "ar" ? "rtl" : "ltr";
    document.querySelectorAll(".language-option").forEach((option) => {
      const selected = option.dataset.lang === roomLang;
      option.classList.toggle("active", selected);
      option.setAttribute("aria-pressed", String(selected));
    });
    updateLocalizedUI();
    syncHomeGuidance();
    focusNameInput();
  } catch (error) {
    document.querySelector(".container").style.display = "none";
    window.tfadhloonUi?.showEmptyState({
      icon: "!",
      title: currentLanguage() === "ar" ? "الغرفة لم تعد موجودة" : "Room no longer exists",
      message: currentLanguage() === "ar" ? "اطلب من المضيف إنشاء غرفة جديدة." : "Ask the host to create a new room.",
      actionText: currentLanguage() === "ar" ? "العودة للرئيسية" : "Return home",
      onAction: () => { window.location.href = "tfadhloon-homepage.html"; },
    });
  }
}

function updateLocalizedUI() {
  const lang = currentLanguage();
  document.title = t("gameTitle");
  if (newGameBtn) newGameBtn.textContent = t("startGame");
  if (joinGameBtn) joinGameBtn.textContent = t("joinGame");
  if (homeNameLabel) homeNameLabel.textContent = lang === "ar" ? "اكتب اسمك" : "Enter your name";
  if (homeNameInput) {
    homeNameInput.placeholder = lang === "ar" ? "اكتب اسمك" : "Enter your name";
  }
  const roomCodeTitle = document.getElementById("roomCodeTitle");
  if (roomCodeTitle) roomCodeTitle.textContent = lang === "ar" ? "أدخل رمز الغرفة" : "Enter room code";
  if (roomCodeInput) roomCodeInput.placeholder = lang === "ar" ? "رمز الغرفة" : "Room code";
  const roomCodeSubmitText = document.getElementById("roomCodeSubmitBtnText");
  if (roomCodeSubmitText) roomCodeSubmitText.textContent = lang === "ar" ? "دخول" : "Join";
  if (backBtnText) backBtnText.textContent = "Back to Home";
  if (howToPlayBtn) howToPlayBtn.textContent = lang === "ar" ? "▶ طريقة اللعب" : "▶ How to Play";
  const tutorialTitle = document.getElementById("tutorialTitle");
  if (tutorialTitle) tutorialTitle.textContent = lang === "ar" ? "طريقة اللعب" : "How to Play";

  const adText = document.querySelector(".ad-text");
  if (adText && currentAds.length === 0) adText.textContent = t("adHere");
}

      // Ad system
      async function loadAdsFromApi() {
        try {
          currentAds = (await window.tfadhloonApi.getAds("banner"))
            .filter((ad) => ad.status === "active")
            .map((ad) => ({ ...ad, image: ad.image_url }));
        } catch (error) {
          console.error("Error loading ads:", error);
          currentAds = [];
        }
        if (currentAds.length === 0) {
          currentAds = [{ title: "Default Ad", content: "", url: "" }];
        }
        initializeAdRotation();
      }

      function initializeAdRotation() {
        if (currentAds.length > 0) {
          updateAdBanner();
          if (currentAds.length > 1) {
            setInterval(() => {
              currentAdIndex = (currentAdIndex + 1) % currentAds.length;
              updateAdBanner();
            }, 30000);
          }
        }
      }

      function updateAdBanner() {
        const adText = document.querySelector(".ad-text");
        const adImg = document.querySelector(".ad-img");
        if (!adText || !adImg) return;
        if (currentAds.length > 0) {
          const currentAd = currentAds[currentAdIndex];
          adText.textContent = currentAd.content;
          if (currentAd.image && currentAd.image !== "") {
            adImg.src = currentAd.image;
            adImg.style.display = "inline-block";
          } else {
            adImg.style.display = "none";
            adImg.src = "";
          }
        } else {
          adText.textContent = t("adHere");
          adImg.style.display = "none";
        }
      }

      async function getMaxPlayers() {
        try {
          const settings = await window.tfadhloonApi.getSettings();
          return parseInt(settings.max_players || "101", 10);
        } catch (error) {
          console.error("Error fetching max players:", error);
          return 101;
        }
      }

      // Game Code Generator
      function generateGameCode() {
        const chars = "0123456789";
        let code = "";
        for (let i = 0; i < 5; i++) {
          code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
      }

      // ===== SIMPLIFIED AND WORKING BEAUTIFUL ALERT SYSTEM =====
      class BeautifulAlert {
        constructor() {
          this.queue = [];
          this.isShowing = false;
        }

        show(options) {
          return new Promise((resolve) => {
            const config = {
              title: options.title || "Alert",
              message: options.message || "",
              type: options.type || "info",
              confirmText: options.confirmText || "OK",
              cancelText: options.cancelText || "Cancel",
              showCancel: options.showCancel || false,
              autoClose: options.autoClose || false,
              onConfirm: options.onConfirm || (() => {}),
              onCancel: options.onCancel || (() => {}),
              closeOnOverlay: options.closeOnOverlay !== false,
              showCloseButton: options.showCloseButton !== false,
              input: options.input || false,
              inputPlaceholder: options.inputPlaceholder || "",
            };

            this.queue.push({ config, resolve });
            this.processQueue();
          });
        }

        processQueue() {
          if (this.isShowing || this.queue.length === 0) return;

          this.isShowing = true;
          const { config, resolve } = this.queue.shift();
          this.createAlert(config, resolve);
        }

        createAlert(config, resolve) {
          // Remove existing alert
          const existingAlert = document.querySelector(".alert-overlay");
          if (existingAlert) {
            existingAlert.remove();
          }

          // Create overlay
          const overlay = document.createElement("div");
          overlay.className = "alert-overlay";

          // Get icon
          const icons = {
            success: "bi bi-check-circle-fill",
            error: "bi bi-exclamation-triangle-fill",
            warning: "bi bi-exclamation-circle-fill",
            info: "bi bi-info-circle-fill",
            question: "bi bi-question-circle-fill",
          };

          const icon = icons[config.type] || icons.info;

          // Create alert
          const alert = document.createElement("div");
          alert.className = `alert-container alert-${config.type}`;

          let progressBar = "";
          if (config.autoClose) {
            progressBar = `<div class="alert-progress" style="animation-duration: ${config.autoClose}ms"></div>`;
          }

          // Add input field if requested
          const inputField = config.input
            ? `<input type="text" class="alert-input" placeholder="${config.inputPlaceholder}" />`
            : "";

          alert.innerHTML = `
            ${
              config.showCloseButton
                ? `<button class="alert-close small-button icon shape-4">&times;</button>`
                : ""
            }
            <div class="alert-header">
              <i class="alert-icon ${icon}"></i>
              <h3 class="alert-title">${config.title}</h3>
            </div>
            <div class="alert-body">
              <p class="alert-message">${config.message}</p>
              ${inputField}
            </div>
            <div class="alert-footer">
              ${
                config.showCancel
                  ? `<button class="alert-btn alert-btn-secondary cancel-btn menu-button compact shape-4">${config.cancelText}</button>`
                  : ""
              }
              <button class="alert-btn alert-btn-primary confirm-btn menu-button compact shape-1">${
                config.confirmText
              }</button>
            </div>
            ${progressBar}
          `;

          overlay.appendChild(alert);
          document.body.appendChild(overlay);

          // Store the resolve function for later use
          overlay._resolve = resolve;
          overlay._config = config;

          // Add event listeners using simple function approach
          this.addEventListeners(overlay, config);

          // Focus input if present
          if (config.input) {
            setTimeout(() => {
              const input = overlay.querySelector(".alert-input");
              if (input) input.focus();
            }, 300);
          }

          // Auto close
          if (config.autoClose) {
            setTimeout(() => {
              this.confirmAlert(overlay);
            }, config.autoClose);
          }
        }

        addEventListeners(overlay, config) {
          const self = this; // Store reference to this

          // Close button
          const closeBtn = overlay.querySelector(".alert-close");
          if (closeBtn) {
            closeBtn.addEventListener("click", function () {
              self.cancelAlert(overlay);
            });
          }

          // Confirm button
          const confirmBtn = overlay.querySelector(".confirm-btn");
          if (confirmBtn) {
            confirmBtn.addEventListener("click", function () {
              self.confirmAlert(overlay);
            });
          }

          // Cancel button
          const cancelBtn = overlay.querySelector(".cancel-btn");
          if (cancelBtn) {
            cancelBtn.addEventListener("click", function () {
              self.cancelAlert(overlay);
            });
          }

          // Overlay click
          if (config.closeOnOverlay) {
            overlay.addEventListener("click", function (e) {
              if (e.target === overlay) {
                self.cancelAlert(overlay);
              }
            });
          }

          // Enter key for confirm
          const handleKeyPress = function (e) {
            if (e.key === "Enter") {
              self.confirmAlert(overlay);
            } else if (e.key === "Escape") {
              self.cancelAlert(overlay);
            }
          };

          document.addEventListener("keydown", handleKeyPress);
          overlay._keyHandler = handleKeyPress;
        }

        confirmAlert(overlay) {
          let inputValue = "";
          if (overlay._config && overlay._config.input) {
            const input = overlay.querySelector(".alert-input");
            inputValue = input ? input.value : "";
          }

          this.closeAlert(overlay, true, inputValue);
        }

        cancelAlert(overlay) {
          this.closeAlert(overlay, false);
        }

        closeAlert(overlay, confirmed, inputValue = "") {
          // Remove key event listener
          if (overlay._keyHandler) {
            document.removeEventListener("keydown", overlay._keyHandler);
          }

          overlay.style.animation = "alertFadeIn 0.3s ease reverse";

          setTimeout(() => {
            if (overlay.parentNode) {
              overlay.parentNode.removeChild(overlay);
            }

            if (confirmed && overlay._config) {
              overlay._config.onConfirm(inputValue);
              overlay._resolve(inputValue);
            } else if (!confirmed && overlay._config) {
              overlay._config.onCancel();
              overlay._resolve(false);
            }

            this.isShowing = false;
            this.processQueue();
          }, 300);
        }

        // Public close method for backward compatibility
        close(confirmed) {
          const overlay = document.querySelector(".alert-overlay");
          if (overlay) {
            if (confirmed) {
              this.confirmAlert(overlay);
            } else {
              this.cancelAlert(overlay);
            }
          }
        }

        // Convenience methods
        success(message, title = "Success!") {
          return this.show({
            title,
            message,
            type: "success",
            autoClose: 3000,
          });
        }

        error(message, title = "Error!") {
          return this.show({ title, message, type: "error" });
        }

        warning(message, title = "Warning!") {
          return this.show({ title, message, type: "warning" });
        }

        info(message, title = "Information") {
          return this.show({ title, message, type: "info", autoClose: 3000 });
        }

        confirm(message, title = "Confirm") {
          return this.show({
            title,
            message,
            type: "question",
            showCancel: true,
            confirmText: "Yes",
            cancelText: "No",
          });
        }

        prompt(message, title = "Input", placeholder = "") {
          return this.show({
            title,
            message,
            type: "question",
            showCancel: true,
            confirmText: "OK",
            cancelText: "Cancel",
            input: true,
            inputPlaceholder: placeholder,
          });
        }

        // Toast notifications
        toast(message, type = "info") {
          const toast = document.createElement("div");
          toast.className = `alert-toast ${type}`;

          const icons = {
            success: "bi bi-check-circle-fill",
            error: "bi bi-exclamation-triangle-fill",
            warning: "bi bi-exclamation-circle-fill",
            info: "bi bi-info-circle-fill",
          };

          toast.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
              <i class="${
                icons[type] || icons.info
              }" style="font-size: 20px;"></i>
              <span>${message}</span>
            </div>
          `;

          document.body.appendChild(toast);

          setTimeout(() => {
            toast.style.animation = "toastSlideIn 0.3s ease reverse";
            setTimeout(() => {
              if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
              }
            }, 300);
          }, 3000);
        }
      }

      // Initialize the alert system
      window.beautifulAlert = new BeautifulAlert();

      // Global shortcut functions
      window.showAlert = (title, message, type = "info") => {
        return window.beautifulAlert.show({ title, message, type });
      };

      window.showSuccess = (message, title = "Success!") => {
        return window.beautifulAlert.success(message, title);
      };

      window.showError = (message, title = "Error!") => {
        return window.beautifulAlert.error(message, title);
      };

      window.showWarning = (message, title = "Warning!") => {
        return window.beautifulAlert.warning(message, title);
      };

      window.showInfo = (message, title = "Information") => {
        return window.beautifulAlert.info(message, title);
      };

      window.showConfirm = (message, title = "Confirm") => {
        return window.beautifulAlert.confirm(message, title);
      };

      window.showPrompt = (message, title = "Input", placeholder = "") => {
        return window.beautifulAlert.prompt(message, title, placeholder);
      };

      window.showToast = (message, type = "info") => {
        return window.beautifulAlert.toast(message, type);
      };
    

      // Voice Chat Initialization
      document.addEventListener("DOMContentLoaded", function () {
        const micBtn = document.getElementById("micBtn");
        const speakerBtn = document.getElementById("speakerBtn");
        const micIcon = document.getElementById("micIcon");
        const speakerIcon = document.getElementById("speakerIcon");

        let isMicMuted = true;
        let isSpeakerMuted = true;

        micIcon.className = "bi bi-mic-mute-fill";
        speakerIcon.className = "bi bi-volume-mute-fill";
        micBtn.classList.add("voice-disabled");
        speakerBtn.classList.add("voice-disabled");
        localStorage.setItem("micMuted", "true");
        localStorage.setItem("speakerMuted", "true");

        // Microphone toggle
        micBtn.addEventListener("click", function () {
          isMicMuted = !isMicMuted;

          if (isMicMuted) {
            micIcon.className = "bi bi-mic-mute-fill";
            // Add your mute microphone logic here
            console.log("Microphone muted");
          } else {
            micIcon.className = "bi bi-mic-fill";
            // Add your unmute microphone logic here
            console.log("Microphone unmuted");
          }

          this.classList.toggle("voice-disabled", isMicMuted);
          localStorage.setItem("micMuted", isMicMuted);

          // Add visual feedback
          this.style.transform = "scale(0.95)";
          setTimeout(() => {
            this.style.transform = "scale(1)";
          }, 150);
        });

        // Speaker toggle
        speakerBtn.addEventListener("click", function () {
          isSpeakerMuted = !isSpeakerMuted;

          if (isSpeakerMuted) {
            speakerIcon.className = "bi bi-volume-mute-fill";
            // Add your mute speaker logic here
            console.log("Speaker muted");
          } else {
            speakerIcon.className = "bi bi-volume-up-fill";
            // Add your unmute speaker logic here
            console.log("Speaker unmuted");
          }

          this.classList.toggle("voice-disabled", isSpeakerMuted);
          localStorage.setItem("speakerMuted", isSpeakerMuted);

          // Add visual feedback
          this.style.transform = "scale(0.95)";
          setTimeout(() => {
            this.style.transform = "scale(1)";
          }, 150);
        });

        // Add hover effects
        [micBtn, speakerBtn].forEach((btn) => {
          btn.addEventListener("mouseenter", function () {
            this.style.transform = "translateY(-2px)";
            this.style.boxShadow = "-8px -8px 0 rgba(0,0,0,0.8)";
          });

          btn.addEventListener("mouseleave", function () {
            this.style.transform = "translateY(0)";
            this.style.boxShadow = "-6px -6px 0 rgba(0,0,0,0.8)";
          });
        });

        console.log("Voice chat buttons initialized");
      });


// PREMIUM GUIDANCE GEOMETRY
// Recalculate the dotted orbit after font loading, responsive reflow and zoom.
(function keepHomeGuidanceAttached() {
  let scheduled = 0;
  function schedule() {
    cancelAnimationFrame(scheduled);
    scheduled = requestAnimationFrame(() => {
      if (typeof syncHomeGuidance === "function") syncHomeGuidance();
    });
  }
  window.addEventListener("resize", schedule, { passive: true });
  window.visualViewport?.addEventListener("resize", schedule, { passive: true });
  document.fonts?.ready.then(schedule);
  document.addEventListener("DOMContentLoaded", () => {
    const targets = [
      document.querySelector(".game-container"),
      document.getElementById("homeNameInput"),
      document.getElementById("newGameBtn"),
      document.getElementById("joinGameBtn"),
    ].filter(Boolean);
    if ("ResizeObserver" in window) {
      const observer = new ResizeObserver(schedule);
      targets.forEach((target) => observer.observe(target));
    }
    requestAnimationFrame(() => requestAnimationFrame(schedule));
  });
})();
