

// ============================================
// FINAL RESULTS PAGE - COMPLETE SOLUTION
// ============================================

(function() {
  'use strict';

  // Configuration
  const LANDING_PAGE_URL = "/tfadhloon-homepage.html";

  const DEBUG = true;
  
  function log(...args) {
    if (DEBUG) console.log('[FinalResults]', ...args);
  }

  // Wait for DOM to be ready
  document.addEventListener("DOMContentLoaded", async function() {
    log("Page loaded, initializing...");

    // Background is now applied by backgrounds-config.js itself
    // (before this script loads) so theme-engine.js's button
    // colors always derive from the correct, already-applied bg.

    // ===== FIREBASE INITIALIZATION =====
    const firebaseConfig = {
      apiKey: "AIzaSyAXUdqcAfldO1YuxlKDWCh7EYo2nO4AMog",
      authDomain: "spyfall-fb59a.firebaseapp.com",
      projectId: "spyfall-fb59a",
      storageBucket: "spyfall-fb59a.firebasestorage.app",
      messagingSenderId: "125069847545",
      appId: "1:125069847545:web:faa43c6e58db9df7242b28",
      measurementId: "G-MFV3SETE0D",
      databaseURL: "https://spyfall-fb59a-default-rtdb.firebaseio.com",
    };

    // Initialize Firebase
    try {
      if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
        log('Firebase initialized successfully');
      } else {
        log('Firebase already initialized');
      }
    } catch (error) {
      log('Firebase initialization error:', error);
      showError(t("initFirebaseError") || 'Failed to initialize Firebase. Please refresh the page.');
      return;
    }

    const database = firebase.database();

    // ===== GET ACCESS CODE FROM URL =====
    const urlParams = new URLSearchParams(window.location.search);
    let accessCode = urlParams.get("code");
    
    log('Access code from URL:', accessCode);

    if (!accessCode) {
      // Try to get from localStorage as fallback
      accessCode = localStorage.getItem("gameCode");
      log('Access code from localStorage:', accessCode);
    }

    if (!accessCode) {
      showError(t("noGameCode") || "No game code provided. Please return to the landing page.");
      document.getElementById("result").innerHTML = `
        <h4>❌ ${t("noGameCode") || "No Game Code"}</h4>
        <p>${t("noGameCode") || "Please return to the landing page and enter a game code."}</p>
      `;
      return;
    }

    // ===== SYNC ROOM LANGUAGE BEFORE ANY RENDERING =====
    // Read gameLanguage from Firebase first; update localStorage so t() returns
    // the correct language for every subsequent call on this page.
    try {
      const langSnap = await database.ref("games/" + accessCode + "/gameLanguage").once("value");
      const roomLang = langSnap.val();
      if (roomLang === "ar" || roomLang === "en") {
        localStorage.setItem("lang", roomLang);
        document.documentElement.lang = roomLang;
        document.documentElement.dir  = roomLang === "ar" ? "rtl" : "ltr";
        log("Room language synced:", roomLang);
      }
    } catch (langErr) {
      log("Could not read room language, using localStorage default:", langErr);
    }

    // Localize all static HTML text nodes to match the room language.
    // This runs once, immediately after the room language is resolved above.
    (function localizeStaticUI() {
      const set = (id, text) => {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
      };
      set("backBtnText",                t("back")                 || "Back");
      set("finalResultsTitle",          t("finalResultsTitle")    || "Final Results");
      set("playerResultsHeading",       t("playerResultsHeading") || "🏅 Player Results");
      set("locationsTitle",             t("locationsChosenBySpy") || "📍 Locations Chosen by Spy");
      set("newGameSameCategoryBtnText", t("newGameSameCategory")  || "New Game — Same Category");
      set("newCategoryBtnText",         t("newCategoryBtnLabel")  || "New Category");
      set("chooseCategoryOption",       t("chooseCategoryOption") || "— Choose Category —");
      set("confirmCategoryBtnText",     t("confirmBtnLabel")      || "Confirm");
      set("startNewGameText",           t("startNewGame")         || "Start New Game");
    })();

    // Update URL if needed
    if (!urlParams.get("code")) {
      window.history.replaceState({}, '', `?code=${accessCode}`);
    }

    // ===== GET DOM ELEMENTS =====
    const resultDiv = document.getElementById("result");
    const spyNameBox = document.getElementById("spyNameBox");
    const locationsList = document.getElementById("locationsList");
    const scoresList = document.getElementById("scoresList");
    const locationsTitle = document.querySelector(".locations-title");

    if (!resultDiv || !scoresList) {
      log('Critical elements not found!');
      return;
    }

    // Show loading state
    resultDiv.innerHTML = `
      <div class="text-center">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">${t("loading") || "Loading..."}</span>
        </div>
        <p class="mt-2">${t("loading") || "Loading..."}</p>
      </div>
    `;
    resultDiv.className = "result-box";

    // ===== LOAD GAME RESULTS =====
    const gameRef = database.ref("games/" + accessCode);

    // First, check if the game exists
    database.ref().child("games").once("value", (snapshot) => {
      const allGames = snapshot.val();
      log('All games in database:', allGames ? Object.keys(allGames) : 'No games');
      
      if (allGames && allGames[accessCode]) {
        log('Game found with code:', accessCode);
      } else {
        log('Game NOT found with code:', accessCode);
        // Try case-insensitive match
        if (allGames) {
          const possibleMatch = Object.keys(allGames).find(key => 
            key.toLowerCase() === accessCode.toLowerCase()
          );
          if (possibleMatch) {
            log('Found match with different case:', possibleMatch);
            // Redirect to correct case
            window.location.href = `?code=${possibleMatch}`;
            return;
          }
        }
      }
    });

    // Load game data
    gameRef.once("value")
      .then((snapshot) => {
        const data = snapshot.val();
        log('Firebase game data:', data);

        if (!data) {
          throw new Error(t("gameDataNotFound") || "Game data not found");
        }

        // Clear previous content
        scoresList.innerHTML = "";
        locationsList.innerHTML = "";

        // ===== DISPLAY SCORES =====
        // Try different possible data structures
        const points = data.points || data.scores || {};
        const players = data.players || {};
        
        log('Points data:', points);
        log('Players data:', players);

        // Get player names from various sources
        let playerNames = [];
        
        if (Object.keys(points).length > 0) {
          playerNames = Object.keys(points);
        } else if (Object.keys(players).length > 0) {
          playerNames = Object.keys(players);
        } else if (data.playersList && Array.isArray(data.playersList)) {
          playerNames = data.playersList;
        } else if (data.playerNames && Array.isArray(data.playerNames)) {
          playerNames = data.playerNames;
        }

        log('Player names found:', playerNames);

        if (playerNames.length > 0) {
          // Sort players by points (highest first)
          playerNames.sort((a, b) => (points[b] || 0) - (points[a] || 0));
          
          playerNames.forEach((name) => {
            const li = document.createElement("li");
            li.className = "list-group-item d-flex justify-content-between align-items-center";
            
            // Player name with icon
            const nameSpan = document.createElement("span");
            nameSpan.innerHTML = `<i class="bi bi-person-circle me-2"></i>${name}`;
            
            // Points badge
            const badge = document.createElement("span");
            badge.className = "badge bg-primary rounded-pill";
            const playerPoints = points[name] || 0;
            badge.innerHTML = `${playerPoints} <i class="bi bi-star-fill"></i>`;
            
            li.appendChild(nameSpan);
            li.appendChild(badge);
            scoresList.appendChild(li);
          });
        } else {
          const li = document.createElement("li");
          li.className = "list-group-item text-center text-muted";
          li.innerHTML = `<i class="bi bi-info-circle me-2"></i>${t("noScores") || "No scores available yet."}`;
          scoresList.appendChild(li);
        }

        // ===== DISPLAY SPY INFORMATION =====
        if (data.spy) {
          spyNameBox.style.display = "block";
          const spyLabel = document.documentElement.lang === "ar" ? (t("spyLabel") || "الجاسوس") : (t("spyLabel") || "Spy");
          let spyName;
          if (typeof data.spy === 'object') {
            spyName = data.spy.name || Object.values(data.spy)[0] || t("unknown") || "—";
          } else {
            spyName = data.spy;
          }
          spyNameBox.innerHTML = `<strong>🕵️ ${spyLabel}: ${spyName}</strong>`;
        }

        // ===== DISPLAY LOCATIONS =====
        const locations = data.locationsChosen || data.locations || [];
        if (locations && locations.length > 0) {
          locationsTitle.style.display = "block";
          
          locations.forEach((location, index) => {
            const li = document.createElement("li");
            li.className = "list-group-item";
            li.innerHTML = `<i class="bi bi-geo-alt-fill me-2 text-primary"></i>${index + 1}. ${location}`;
            locationsList.appendChild(li);
          });
        }

        // ===== DISPLAY WINNER =====
        if (data.winner) {
          if (data.winner.startsWith("Tie:")) {
            // Extract tied player names; the value was stored as "Tie: Alice, Bob"
            const tiedNames = data.winner.slice(4).trim().replace(/^:?\s*/, "");
            const tieLabel  = t("tieResult") || (document.documentElement.lang === "ar" ? "تعادل" : "Tie");
            resultDiv.className = "result-box";
            resultDiv.innerHTML = `<h4>🤝 ${tieLabel}: ${tiedNames}</h4>`;
          } else if (data.winner === "No Winner") {
            resultDiv.className = "result-box";
            resultDiv.innerHTML = `<h4>🎮 ${t("gameCompleted") || "Game Completed!"}</h4><p>${t("noPointsScored") || "No points were scored."}</p>`;
          } else {
            resultDiv.className = "result-box win";

            // Check if winner is spy
            const isSpyWinner = data.winner.includes("Spy") || 
                               (data.spy && (data.winner === data.spy || 
                                (typeof data.spy === 'object' && data.winner === data.spy.name)));

            const winnerLabel = isSpyWinner
              ? `🕵️ ${data.winner}`
              : data.winner;

            resultDiv.innerHTML = `
              <div class="trophy-display">
                <img src="gallary/trophy-cup.png" class="trophy-img" alt="Trophy" />
                <div class="trophy-label trophy-label-name">${winnerLabel}</div>
                <div class="trophy-label trophy-label-winner"><span>${t("winner") || "WINNER"}</span></div>
              </div>
            `;
          }
        } else {
          resultDiv.className = "result-box";
          resultDiv.innerHTML = `<p>${t("gameCompleted") || "Game completed."}</p>`;
        }

        // ===== HOST-ONLY ACTIONS =====
        const savedPlayerName = localStorage.getItem("playerName") || "";
        const currentHostName = data.hostName || data.host || "";
        const isHost = !!(savedPlayerName && currentHostName && savedPlayerName === currentHostName);
        log("Host check — saved:", savedPlayerName, "host:", currentHostName, "isHost:", isHost);
        if (isHost) {
          const hostSection = document.getElementById("hostActionsSection");
          if (hostSection) hostSection.style.display = "flex";
        }

        // Show success message
        if (window.beautifulAlert) {
          window.beautifulAlert.toast(t("resultsLoaded") || "Results loaded!", "success");
        }
      })
      .catch((error) => {
        log('Error loading game data:', error);
        resultDiv.className = "result-box lose";
        resultDiv.innerHTML = `
          <h4>❌ ${t("errorLoadingResults") || "Error Loading Results"}</h4>
          <p>${error.message}</p>
          <button class="btn btn-outline-light mt-2 menu-button compact shape-3" onclick="location.reload()">
            <i class="bi bi-arrow-clockwise"></i> ${t("tryAgain") || "Try Again"}
          </button>
        `;
        
        if (window.beautifulAlert) {
          window.beautifulAlert.error(t("resultsLoadFailed") || "Could not load game results. Please check the game code.");
        }
      });

    // ===== ADS LOADING =====
    let currentAds = [];
    let currentAdIndex = 0;

    function loadAdsFromFirebase() {
      database.ref("admin/ads").on("value", (snapshot) => {
        const adsData = snapshot.val() || {};
        currentAds = Object.values(adsData).filter(
          (ad) => ad.status === "active"
        );
        log("Loaded active ads:", currentAds.length);

        if (currentAds.length === 0) {
          currentAds = [{
            title: "Spyfall Game",
            content: "🎮 Play Spyfall with friends!",
            url: "",
          }];
        }

        initializeAdRotation();
      }, (error) => {
        log('Error loading ads:', error);
      });
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
      if (adText && currentAds.length > 0) {
        const currentAd = currentAds[currentAdIndex];
        adText.textContent = currentAd.content || currentAd.title || "🎮 Spyfall - The exciting game of deception!";
      }
    }

    loadAdsFromFirebase();

    // ===== HOST BUTTON HANDLERS =====
    function resetGameAndGoToLobby(newCategory) {
      const updates = {
        gameEnded: false,
        gameStarted: false,
        gameRestarting: true,
        currentRound: null,
        totalQuestionCount: 0,
        points: null,
        winner: null,
        pointsAwarded: null,
      };
      if (newCategory) {
        updates.selectedCategory = newCategory;
      }
      gameRef.update(updates)
        .then(() => {
          window.location.href = `tfadhloon-lobby.html?code=${accessCode}`;
        })
        .catch((err) => {
          log("Error resetting game:", err);
          window.location.href = `tfadhloon-lobby.html?code=${accessCode}`;
        });
    }

    const newGameSameCategoryBtn = document.getElementById("newGameSameCategoryBtn");
    if (newGameSameCategoryBtn) {
      newGameSameCategoryBtn.addEventListener("click", () => {
        window.beautifulAlert.confirm(
          t("newGameSameCategoryMsg") || "Start a new game with the same category?",
          t("newGameSameCategory") || "New Game"
        ).then((confirmed) => {
          if (confirmed) resetGameAndGoToLobby(null);
        });
      });
    }

    const newCategoryBtn = document.getElementById("newCategoryBtn");
    const categoryDropdown = document.getElementById("categoryDropdown");
    if (newCategoryBtn && categoryDropdown) {
      newCategoryBtn.addEventListener("click", () => {
        const isHidden = categoryDropdown.style.display === "none" || !categoryDropdown.style.display;
        categoryDropdown.style.display = isHidden ? "flex" : "none";
      });
    }

    const confirmCategoryBtn = document.getElementById("confirmCategoryBtn");
    const categorySelect = document.getElementById("categorySelect");
    if (confirmCategoryBtn && categorySelect) {
      confirmCategoryBtn.addEventListener("click", () => {
        const selectedVal = categorySelect.value;
        if (!selectedVal) {
          if (window.beautifulAlert) window.beautifulAlert.warning(t("selectCategoryFirst") || "Please select a category first.");
          else alert(t("selectCategoryFirst") || "Please select a category first.");
          return;
        }
        const selectedLabel = categorySelect.options[categorySelect.selectedIndex].text;
        const confirmMsg = (t("confirmCategoryChange") || 'Change category to "{label}"?').replace("{label}", selectedLabel);
        window.beautifulAlert.confirm(confirmMsg, t("newCategory") || "New Category").then((confirmed) => {
          if (confirmed) resetGameAndGoToLobby(selectedVal);
        });
      });
    }

    // Non-host players: redirect when host starts a new game
    gameRef.child("gameRestarting").on("value", (snap) => {
      if (snap.val() === true) {
        setTimeout(() => {
          window.location.href = `tfadhloon-lobby.html?code=${accessCode}`;
        }, 600);
      }
    });

    // ===== BACK BUTTON FUNCTIONALITY =====
    const backButton = document.getElementById("backButton");
    if (backButton) {
      backButton.addEventListener("click", function() {
        if (window.showConfirm) {
          window.showConfirm(
            t("leaveResultsMsg") || "Are you sure you want to leave the game results?",
            t("leaveResults") || "Leave Results"
          ).then((confirmed) => {
            if (confirmed) {
              window.location.href = LANDING_PAGE_URL;
            }
          });
        }
      });
    }

    // ===== VOICE CHAT CONTROLS (minimal, just UI) =====
    const micBtn = document.getElementById("micBtn");
    const speakerBtn = document.getElementById("speakerBtn");
    const micIcon = document.getElementById("micIcon");
    const speakerIcon = document.getElementById("speakerIcon");

    if (micBtn && speakerBtn && micIcon && speakerIcon) {
      // Initialize from localStorage
      let isMicMuted = localStorage.getItem("micMuted") === "true";
      let isSpeakerMuted = localStorage.getItem("speakerMuted") === "true";

      // Set initial icons
      micIcon.className = isMicMuted ? "bi bi-mic-mute-fill" : "bi bi-mic-fill";
      speakerIcon.className = isSpeakerMuted ? "bi bi-volume-mute-fill" : "bi bi-volume-up-fill";

      // Microphone toggle
      micBtn.addEventListener("click", function() {
        isMicMuted = !isMicMuted;
        micIcon.className = isMicMuted ? "bi bi-mic-mute-fill" : "bi bi-mic-fill";
        
        // Try to control actual mic if available
        if (window.localStream) {
          window.localStream.getAudioTracks().forEach(track => {
            track.enabled = !isMicMuted;
          });
        }
        
        localStorage.setItem("micMuted", isMicMuted);
        
        // Visual feedback
        this.style.transform = "scale(0.95)";
        setTimeout(() => this.style.transform = "scale(1)", 150);
      });

      // Speaker toggle
      speakerBtn.addEventListener("click", function() {
        isSpeakerMuted = !isSpeakerMuted;
        speakerIcon.className = isSpeakerMuted ? "bi bi-volume-mute-fill" : "bi bi-volume-up-fill";
        
        // Mute all audio elements
        document.querySelectorAll("audio").forEach(audio => {
          audio.muted = isSpeakerMuted;
        });
        
        localStorage.setItem("speakerMuted", isSpeakerMuted);
        
        // Visual feedback
        this.style.transform = "scale(0.95)";
        setTimeout(() => this.style.transform = "scale(1)", 150);
      });

      // Hover effects
      [micBtn, speakerBtn].forEach(btn => {
        btn.addEventListener("mouseenter", function() {
          this.style.transform = "translateY(-2px)";
          this.style.boxShadow = "-8px -8px 0 rgba(0,0,0,0.8)";
        });
        btn.addEventListener("mouseleave", function() {
          this.style.transform = "translateY(0)";
          this.style.boxShadow = "-6px -6px 0 rgba(0,0,0,0.8)";
        });
      });
    }
  });

  // ===== ALERT SYSTEM =====
  // Beautiful Alert Class
  class BeautifulAlert {
    constructor() {
      this.queue = [];
      this.isShowing = false;
    }

    show(options) {
      const config = {
        title: options.title || 'Alert',
        message: options.message || '',
        type: options.type || 'info',
        confirmText: options.confirmText || 'OK',
        cancelText: options.cancelText || 'Cancel',
        showCancel: options.showCancel || false,
        autoClose: options.autoClose || false,
        onConfirm: options.onConfirm || (() => {}),
        onCancel: options.onCancel || (() => {}),
        closeOnOverlay: options.closeOnOverlay !== false,
        showCloseButton: options.showCloseButton !== false
      };

      // For autoClose under 3 seconds, use toast
      if (config.autoClose && config.autoClose <= 3000) {
        return this.toast(config.message, config.type, config.title);
      }

      return new Promise((resolve) => {
        this.queue.push({ config, resolve });
        this.processQueue();
      });
    }

    toast(message, type = 'info', title = '') {
      // Create toast container if it doesn't exist
      let toastContainer = document.querySelector('.alert-queue');
      if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.className = 'alert-queue';
        document.body.appendChild(toastContainer);
      }

      const toast = document.createElement('div');
      toast.className = `toast-alert ${type}`;

      const icons = {
        success: 'bi bi-check-circle-fill',
        error: 'bi bi-exclamation-triangle-fill',
        warning: 'bi bi-exclamation-circle-fill',
        info: 'bi bi-info-circle-fill',
        question: 'bi bi-question-circle-fill'
      };

      toast.innerHTML = `
        <i class="toast-icon ${icons[type] || icons.info}"></i>
        <div class="toast-content">
          ${title ? `<div class="toast-title">${title}</div>` : ''}
          <div class="toast-message">${message}</div>
        </div>
      `;

      toastContainer.appendChild(toast);

      setTimeout(() => {
        toast.style.animation = 'toastSlideIn 0.3s ease reverse';
        setTimeout(() => {
          if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
          }
        }, 300);
      }, 3000);

      return Promise.resolve(true);
    }

    processQueue() {
      if (this.isShowing || this.queue.length === 0) return;

      this.isShowing = true;
      const { config, resolve } = this.queue.shift();
      this.createAlert(config, resolve);
    }

    createAlert(config, resolve) {
      // Remove existing alert
      const existingAlert = document.querySelector('.alert-overlay');
      if (existingAlert) {
        existingAlert.remove();
      }

      // Create overlay
      const overlay = document.createElement('div');
      overlay.className = 'alert-overlay';

      // Get icon
      const icons = {
        success: 'bi bi-check-circle-fill',
        error: 'bi bi-exclamation-triangle-fill',
        warning: 'bi bi-exclamation-circle-fill',
        info: 'bi bi-info-circle-fill',
        question: 'bi bi-question-circle-fill'
      };

      const icon = icons[config.type] || icons.info;

      // Create alert
      const alert = document.createElement('div');
      alert.className = `alert-container alert-${config.type}`;

      let progressBar = '';
      if (config.autoClose) {
        progressBar = `<div class="alert-progress" style="animation-duration: ${config.autoClose}ms"></div>`;
      }

      alert.innerHTML = `
        ${config.showCloseButton ? `<button class="alert-close small-button icon shape-4" onclick="window.beautifulAlert.close(false)">&times;</button>` : ''}
        <div class="alert-header">
          <i class="alert-icon ${icon}"></i>
          <h3 class="alert-title">${config.title}</h3>
        </div>
        <div class="alert-body">
          <p class="alert-message">${config.message}</p>
        </div>
        <div class="alert-footer">
          ${config.showCancel ? `
            <button class="alert-btn alert-btn-secondary menu-button compact shape-4" onclick="window.beautifulAlert.close(false)">
              ${config.cancelText}
            </button>
          ` : ''}
          <button class="alert-btn alert-btn-primary menu-button compact shape-1" onclick="window.beautifulAlert.close(true)">
            ${config.confirmText}
          </button>
        </div>
        ${progressBar}
      `;

      overlay.appendChild(alert);
      document.body.appendChild(overlay);

      // Store callbacks
      this.currentConfig = config;
      this.currentResolve = resolve;
      this.currentOverlay = overlay;

      // Close on overlay click
      if (config.closeOnOverlay) {
        overlay.addEventListener('click', (e) => {
          if (e.target === overlay) {
            this.close(false);
          }
        });
      }

      // Auto close
      if (config.autoClose) {
        setTimeout(() => {
          this.close(true);
        }, config.autoClose);
      }
    }

    close(confirmed) {
      if (this.currentOverlay) {
        this.currentOverlay.style.animation = 'alertFadeIn 0.3s ease reverse';
        setTimeout(() => {
          if (this.currentOverlay.parentNode) {
            this.currentOverlay.parentNode.removeChild(this.currentOverlay);
          }

          if (confirmed && this.currentConfig) {
            this.currentConfig.onConfirm();
            this.currentResolve(true);
          } else if (!confirmed && this.currentConfig) {
            this.currentConfig.onCancel();
            this.currentResolve(false);
          }

          this.isShowing = false;
          this.processQueue();
        }, 300);
      }
    }

    // Convenience methods
    success(message, title = 'Success!') {
      return this.show({ title, message, type: 'success', autoClose: 3000 });
    }

    error(message, title = 'Error!') {
      return this.show({ title, message, type: 'error' });
    }

    warning(message, title = 'Warning!') {
      return this.show({ title, message, type: 'warning' });
    }

    info(message, title = 'Information') {
      return this.show({ title, message, type: 'info', autoClose: 3000 });
    }

    confirm(message, title = 'Confirm') {
      return this.show({
        title,
        message,
        type: 'question',
        showCancel: true,
        confirmText: 'Yes',
        cancelText: 'No'
      });
    }
  }

  // Initialize alert system globally
  window.beautifulAlert = new BeautifulAlert();

  // Global helper functions
  window.showAlert = (title, message, type = 'info') => {
    return window.beautifulAlert.show({ title, message, type });
  };

  window.showSuccess = (message, title = 'Success!') => {
    return window.beautifulAlert.success(message, title);
  };

  window.showError = (message, title = 'Error!') => {
    return window.beautifulAlert.error(message, title);
  };

  window.showWarning = (message, title = 'Warning!') => {
    return window.beautifulAlert.warning(message, title);
  };

  window.showInfo = (message, title = 'Information') => {
    return window.beautifulAlert.info(message, title);
  };

  window.showConfirm = (message, title = 'Confirm') => {
    return window.beautifulAlert.confirm(message, title);
  };

  window.showToast = (message, type = 'info') => {
    return window.beautifulAlert.toast(message, type);
  };
})();