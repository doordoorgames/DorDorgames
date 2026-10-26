// Supabase-authoritative gameplay. Firebase is intentionally not used here.
(() => {
  "use strict";

  const selectedLanguage = localStorage.getItem("lang") === "en" ? "en" : "ar";
  document.documentElement.lang = selectedLanguage;
  document.documentElement.dir = selectedLanguage === "ar" ? "rtl" : "ltr";

  const code = new URLSearchParams(window.location.search).get("code");
  const playerName = localStorage.getItem("playerName") || "";
  if (!code || !playerName) {
    window.location.href = "tfadhloon-homepage.html";
    return;
  }

  const els = {
    question: document.getElementById("questionSectionprime"),
    options: document.getElementById("optionsContainer"),
    next: document.getElementById("nextRoundBtn"),
    nextAction: document.getElementById("nextAction"),
    nextOrbit: document.getElementById("nextRoundOrbit"),
    players: document.getElementById("playersContainer"),
    points: document.getElementById("pointsContainer"),
    round: document.getElementById("roundProgress"),
    turn: document.getElementById("turnProgress"),
    waiting: document.getElementById("waitingHeader"),
    choose: document.getElementById("chooseHeader"),
    back: document.getElementById("backButton"),
    dashboard: document.getElementById("pointsDashboard"),
    dashboardToggle: document.getElementById("dashboardToggle"),
    dashboardClose: document.getElementById("closeDashboard"),
    roundInfo: document.getElementById("roundInfo"),
    actionInfo: document.getElementById("actionInfo"),
    suggest: document.getElementById("suggestQuestionBtn"),
  };

  let game = null;
  let round = null;
  let unsubscribe = null;
  let refreshQueued = false;
  let awarding = false;
  let realtimeFailed = false;
  let lastRoundKey = "";
  let endScreenRendered = false;
  let resultActionKey = "";
  let knownResultPlayers = new Set();
  let botActionKey = "";
  let botTimer = null;
  let botCleanupStarted = false;
  let pendingConfirmationResolve = null;
  let optionStructureKey = "";
  let refreshPromise = null;
  let refreshAgain = false;

  const TEST_BOT = "TestBot";
  const language = () => game?.game_language === "en"
    ? "en"
    : game?.game_language === "ar"
      ? "ar"
      : selectedLanguage;
  const text = (ar, en) => language() === "ar" ? ar : en;
  const localizedError = (error, ar, en) =>
    window.tfadhloonUi?.localizedError(error, ar, en) || text(ar, en);
  const displayName = (name) => name === TEST_BOT ? `${TEST_BOT} [TEST]` : name;
  const isSoloTestHost = () => game?.host === "Test99" && playerName === game.host;

  let nextOrbitVisible = false;

  function syncNextOrbit(canAdvance) {
    const visible = Boolean(canAdvance && els.next && !els.next.disabled);
    els.nextAction?.classList.toggle("is-visible", visible);
    if (!els.nextOrbit || visible === nextOrbitVisible) return;
    nextOrbitVisible = visible;

    if (!visible) {
      window.tfadhloonFocusArrows?.clear(els.nextOrbit);
      els.nextOrbit.hidden = true;
      return;
    }

    els.nextOrbit.hidden = false;
    window.requestAnimationFrame(() => {
      window.tfadhloonBlobOrbit?.mount(els.nextOrbit, {
        shape: "wide2",
        assetUrl: "buttons/blob-wide-2.webp",
        direction: "clockwise",
        duration: 9600,
      });
    });
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

  function openSuggestionDialog() {
    return new Promise((resolve) => {
      const overlay = document.createElement("div");
      overlay.className = "suggestion-dialog-overlay";
      overlay.innerHTML = `
        <div class="suggestion-dialog-screen" role="dialog" aria-modal="true" aria-labelledby="suggestionDialogTitle">
          <button type="button" class="suggestion-dialog-close small-button icon shape-4" data-blob-variant="triangle" aria-label="${text("إغلاق", "Close")}">×</button>
          <h2 id="suggestionDialogTitle" class="suggestion-floating-title"></h2>
          <form class="suggestion-form">
            <label for="suggestionOptionA">${text("الخيار الأول", "First option")}</label>
            <input id="suggestionOptionA" class="suggestion-blob-input" type="text" autocomplete="off" required />
            <label for="suggestionOptionB">${text("الخيار الثاني", "Second option")}</label>
            <input id="suggestionOptionB" class="suggestion-blob-input" type="text" autocomplete="off" required />
            <button type="submit" class="suggestion-submit menu-button full-width shape-1">${text("أرسل الاقتراح", "Send suggestion")}</button>
          </form>
        </div>`;
      overlay.querySelector(".suggestion-floating-title").textContent =
        text("ودك تقترح علينا سؤال؟", "Want to suggest a question for us?");

      const close = (result = null) => {
        overlay.remove();
        resolve(result);
      };
      overlay.querySelector(".suggestion-dialog-close").addEventListener("click", () => close());
      overlay.addEventListener("click", (event) => {
        if (event.target === overlay) close();
      });
      overlay.querySelector(".suggestion-form").addEventListener("submit", (event) => {
        event.preventDefault();
        const optionA = overlay.querySelector("#suggestionOptionA").value.trim();
        const optionB = overlay.querySelector("#suggestionOptionB").value.trim();
        if (!optionA || !optionB) return;
        close({ optionA, optionB });
      });

      document.body.appendChild(overlay);
      overlay.querySelector("#suggestionOptionA").focus();
    });
  }

  async function suggestQuestion() {
    const suggestion = await openSuggestionDialog();
    if (!suggestion) return;
    try {
      await window.tfadhloonApi.suggestQuestions(code, {
        categoryName: text("اقتراح لاعب", "Player suggestion"),
        questions: [{ optionA: suggestion.optionA, optionB: suggestion.optionB }],
        suggestedBy: playerName,
        language: language() === "ar" ? "arabic" : "english",
      });
      alertBox(text("تم إرسال الاقتراح", "Suggestion submitted"), "success");
    } catch (error) {
      alertBox(localizedError(error));
    }
  }

  function localizeSuggestionButton(button) {
    const label = button?.querySelector("span");
    if (label) label.textContent = text("ودك تقترح علينا سؤال؟", "Want to suggest a question for us?");
  }

  function playerList() {
    return game?.players || [];
  }

  function closeAnswerConfirmation(confirmed = false) {
    const overlay = document.querySelector(".tf-confirm-overlay");
    if (overlay) {
      overlay.classList.add("is-leaving");
      overlay.setAttribute("aria-hidden", "true");
      window.setTimeout(() => overlay.remove(), 160);
    }
    if (pendingConfirmationResolve) {
      const resolve = pendingConfirmationResolve;
      pendingConfirmationResolve = null;
      resolve(confirmed);
    }
  }

  function confirmAnswer() {
    closeAnswerConfirmation(false);

    return new Promise((resolve) => {
      pendingConfirmationResolve = resolve;

      const overlay = document.createElement("div");
      overlay.className = "alert-overlay tf-confirm-overlay";
      overlay.setAttribute("role", "presentation");
      overlay.innerHTML = `
        <div class="tf-confirm-composition">
          <div class="alert-container tf-confirm-dialog" data-blob-variant="cloud" role="dialog" aria-modal="true" aria-labelledby="tfConfirmTitle">
            <h3 id="tfConfirmTitle" class="tf-confirm-title"></h3>
          </div>
          <div class="tf-confirm-actions">
            <button id="tfConfirmCancel" type="button" class="small-button icon tf-confirm-choice tf-confirm-cancel" data-blob-variant="triangle" aria-label="${text("إلغاء", "Cancel")}"><span class="tf-confirm-symbol" aria-hidden="true">×</span></button>
            <button id="tfConfirmAccept" type="button" class="small-button icon tf-confirm-choice tf-confirm-accept" data-blob-variant="circle" aria-label="${text("تأكيد", "Confirm")}"><span class="tf-confirm-symbol" aria-hidden="true">✓</span></button>
          </div>
        </div>`;

      overlay.querySelector(".tf-confirm-title").textContent = text("متأكد؟", "Are you sure?");
      overlay.querySelector("#tfConfirmCancel").addEventListener("click", () => closeAnswerConfirmation(false));
      overlay.querySelector("#tfConfirmAccept").addEventListener("click", () => closeAnswerConfirmation(true));
      overlay.addEventListener("click", (event) => {
        if (event.target === overlay) closeAnswerConfirmation(false);
      });
      overlay.addEventListener("keydown", (event) => {
        if (event.key === "Escape") closeAnswerConfirmation(false);
      });

      document.body.appendChild(overlay);
      overlay.querySelector("#tfConfirmAccept").focus();
    });
  }

  function renderPlayers() {
    const players = playerList();
    const playerNodes = new Map(
      [...els.players.querySelectorAll(".player-box[data-player-name]")]
        .map((node) => [node.dataset.playerName, node]),
    );
    const pointNodes = new Map(
      [...els.points.querySelectorAll(".point-item[data-player-name]")]
        .map((node) => [node.dataset.playerName, node]),
    );

    const orderedPlayers = [];
    const orderedPoints = [];

    for (const player of players) {
      let playerBox = playerNodes.get(player.name);
      if (!playerBox) {
        playerBox = document.createElement("div");
        playerBox.className = "player-box";
        playerBox.dataset.playerName = player.name;
      }
      const renderedName = displayName(player.name);
      if (playerBox.textContent !== renderedName) playerBox.textContent = renderedName;
      orderedPlayers.push(playerBox);

      let pointBox = pointNodes.get(player.name);
      if (!pointBox) {
        pointBox = document.createElement("div");
        pointBox.className = "point-item";
        pointBox.dataset.playerName = player.name;

        const pointName = document.createElement("span");
        pointName.className = "point-item-name";
        const pointScore = document.createElement("span");
        pointScore.className = "point-item-score";
        pointBox.append(pointName, pointScore);
      }

      const pointName = pointBox.querySelector(".point-item-name");
      const pointScore = pointBox.querySelector(".point-item-score");
      if (pointName.textContent !== renderedName) pointName.textContent = renderedName;
      const renderedScore = String(player.points || 0);
      if (pointScore.textContent !== renderedScore) pointScore.textContent = renderedScore;
      orderedPoints.push(pointBox);
    }

    if (
      orderedPlayers.length !== els.players.children.length
      || orderedPlayers.some((node, index) => els.players.children[index] !== node)
    ) {
      els.players.replaceChildren(...orderedPlayers);
    }
    if (
      orderedPoints.length !== els.points.children.length
      || orderedPoints.some((node, index) => els.points.children[index] !== node)
    ) {
      els.points.replaceChildren(...orderedPoints);
    }
  }

  function showPersonalResult(isCorrect) {
    const existing = document.querySelector(".personal-result-toast");
    if (existing) existing.remove();

    const toast = document.createElement("div");
    toast.className = `personal-result-toast ${isCorrect ? "is-correct" : "is-wrong"}`;
    toast.setAttribute("role", "status");
    toast.textContent = isCorrect
      ? text(`${playerName} جاوب صح`, `${playerName} got it right`)
      : text(`${playerName} جاوب غلط`, `${playerName} got it wrong`);
    document.body.appendChild(toast);

    window.setTimeout(() => toast.classList.add("is-leaving"), 1550);
    window.setTimeout(() => toast.remove(), 1850);
  }

  function showResultFeedItem(name, isCorrect) {
    const feed = document.getElementById("resultFeed");
    if (!feed) return;

    const item = document.createElement("div");
    item.className = `result-feed-item ${isCorrect ? "is-correct" : "is-wrong"}`;
    item.setAttribute("role", "status");
    item.textContent = isCorrect
      ? text(`${name} جاوب صح`, `${name} got it right`)
      : text(`${name} جاوب غلط`, `${name} got it wrong`);

    feed.prepend(item);
    while (feed.children.length > 3) feed.lastElementChild.remove();

    window.setTimeout(() => item.classList.add("is-leaving"), 3200);
    window.setTimeout(() => item.remove(), 3500);
  }

  function syncResultFeed() {
    if (!round) return;

    const actionKey = `${round.round_number}:${round.action_number}:${round.question_id}`;
    const answers = round.selected_answers || {};
    const selectedPlayer = round.selected_player;

    if (actionKey !== resultActionKey) {
      resultActionKey = actionKey;
      knownResultPlayers = new Set(Object.keys(answers));
      return;
    }

    const correctAnswer = answers[selectedPlayer];
    if (correctAnswer === undefined) return;

    for (const [name, answer] of Object.entries(answers)) {
      if (name === selectedPlayer || knownResultPlayers.has(name)) continue;
      knownResultPlayers.add(name);
      showResultFeedItem(name, answer === correctAnswer);
    }
  }

  function allAnswersSubmitted() {
    const answers = round?.selected_answers || {};
    return playerList().length >= 2 && playerList().every((player) => answers[player.name] !== undefined);
  }

  function scheduleTestBot() {
    if (!isSoloTestHost() || !round || round.points_awarded) return;
    if (!playerList().some((player) => player.name === TEST_BOT)) return;

    const answers = round.selected_answers || {};
    if (answers[TEST_BOT] !== undefined) return;

    const selectedPlayer = round.selected_player;
    if (selectedPlayer !== TEST_BOT && answers[selectedPlayer] === undefined) return;

    const actionKey = `${round.round_number}:${round.action_number}:${selectedPlayer}`;
    if (botActionKey === actionKey) return;
    botActionKey = actionKey;

    const optionIndex = (round.round_number + round.action_number) % round.options.length;
    const answer = round.options[optionIndex];
    botTimer = window.setTimeout(async () => {
      try {
        await window.tfadhloonApi.submitAnswer(code, TEST_BOT, answer, {
          roundNumber: round.round_number,
          actionNumber: round.action_number,
          questionId: round.question_id,
        });
        await refresh();
      } catch (error) {
        botActionKey = "";
        console.debug("[Solo Test Mode] TestBot could not submit:", error);
      } finally {
        botTimer = null;
      }
    }, 700);
  }

  function removeTestBot() {
    if (!isSoloTestHost() || botCleanupStarted) return;
    if (!playerList().some((player) => player.name === TEST_BOT)) return;
    botCleanupStarted = true;
    window.tfadhloonApi.removePlayer(code, TEST_BOT).catch((error) => {
      botCleanupStarted = false;
      console.debug("[Solo Test Mode] TestBot cleanup failed:", error);
    });
  }

  async function handleOptionClick(button) {
    const optionIndex = Number(button.dataset.optionIndex);
    const option = round?.options?.[optionIndex];
    if (!option || button.disabled) return;

    const expectedStructure = optionStructureKey;
    const turnSnapshot = {
      roundNumber: round.round_number,
      actionNumber: round.action_number,
      questionId: round.question_id,
      selectedPlayer: round.selected_player,
      answers: { ...(round.selected_answers || {}) },
    };
    const selectedPlayer = turnSnapshot.selectedPlayer;
    const answers = turnSnapshot.answers;
    const selectedAnswered = answers[selectedPlayer] !== undefined;
    const isSelectedPlayer = playerName === selectedPlayer;
    const canInteract = answers[playerName] === undefined
      && (isSelectedPlayer || selectedAnswered)
      && !round.points_awarded;
    if (!canInteract) return;

    const confirmed = await confirmAnswer();
    if (!confirmed || expectedStructure !== optionStructureKey) {
      if (!confirmed) button.focus();
      return;
    }

    const optionButtons = [...els.options.querySelectorAll(".guess-option")];
    els.options.classList.add("is-committing");
    els.options.setAttribute("aria-busy", "true");
    els.options.querySelectorAll(".tf-onboarding-outline").forEach((outline) => {
      outline.hidden = true;
    });
    for (const optionButton of optionButtons) {
      const selected = optionButton === button;
      optionButton.disabled = true;
      optionButton.classList.toggle("selected", selected);
      optionButton.classList.toggle("is-inert", !selected);
      optionButton.setAttribute("aria-pressed", String(selected));
      optionButton.setAttribute("aria-disabled", "true");
    }

    try {
      await window.tfadhloonApi.submitAnswer(code, playerName, option, turnSnapshot);
      if (!isSelectedPlayer && selectedAnswered) {
        showPersonalResult(option === answers[selectedPlayer]);
      }
      await refresh();
    } catch (error) {
      renderQuestion();
      alertBox(localizedError(error, "تعذر إرسال الإجابة", "Unable to submit answer"));
    } finally {
      els.options.classList.remove("is-committing");
      els.options.removeAttribute("aria-busy");
    }
  }

  function renderOptions(answers, selectedPlayer, selectedAnswered, alreadyAnswered, isSelectedPlayer) {
    const nextStructureKey = JSON.stringify([round.question_id, round.options]);
    if (nextStructureKey !== optionStructureKey) {
      optionStructureKey = nextStructureKey;
      closeAnswerConfirmation(false);
      const fragment = document.createDocumentFragment();

      round.options.forEach((option, optionIndex) => {
        const guide = document.createElement("div");
        guide.className = "tf-option-guide";

        const button = document.createElement("button");
        button.className = "guess-option";
        button.dataset.optionIndex = String(optionIndex);
        button.textContent = option;
        button.addEventListener("click", () => handleOptionClick(button));
        guide.appendChild(button);
        fragment.appendChild(guide);
      });

      els.options.replaceChildren(fragment);
    }

    const guides = [...els.options.querySelectorAll(".tf-option-guide")];
    guides.forEach((guide, optionIndex) => {
      const button = guide.querySelector(".guess-option");
      const option = round.options[optionIndex];
      const isCurrentSelection = alreadyAnswered && answers[playerName] === option;
      const canInteract = !alreadyAnswered
        && (isSelectedPlayer || selectedAnswered)
        && !round.points_awarded;

      if (button.textContent !== option) button.textContent = option;
      button.disabled = !canInteract;
      button.classList.toggle("selected", isCurrentSelection);
      button.classList.toggle("is-inert", !canInteract && !isCurrentSelection);
      button.setAttribute("aria-pressed", String(isCurrentSelection));
      button.setAttribute("aria-disabled", String(!canInteract));

      let outline = guide.querySelector(".tf-answer-outline");
      if (canInteract && !outline) {
        outline = document.createElement("span");
        outline.className = "tf-onboarding-outline tf-answer-outline";
        outline.setAttribute("aria-hidden", "true");
        guide.appendChild(outline);
        window.tfadhloonBlobOrbit?.mount(outline, {
          shape: optionIndex % 2 === 0 ? "wide1" : "wide2",
          direction: "clockwise",
          duration: optionIndex % 2 === 0 ? 14400 : 16000,
        });
      } else if (!canInteract && outline) {
        outline.remove();
      }
    });
  }

  function renderQuestion() {
    document.documentElement.lang = language();
    document.documentElement.dir = language() === "ar" ? "rtl" : "ltr";
    els.back.textContent = text("رجوع", "Back");
    const playersHeader = document.getElementById("playersHeader");
    if (playersHeader) playersHeader.textContent = text("اللاعبون", "Players");
    const dashboardTitle = document.querySelector(".dashboard-title-content span");
    if (dashboardTitle) dashboardTitle.textContent = text("المكافآت", "Rewards");

    if (!round?.question || !Array.isArray(round.options) || round.options.length === 0) {
      window.waveBg?.setDefault();
      els.question.textContent = text("لا توجد أسئلة متاحة. حاول مرة ثانية.", "No playable question is available. Please try again.");
      optionStructureKey = "";
      els.options.replaceChildren();
      alertBox(text("لم يتم تحميل السؤال الأول", "The first question could not be loaded"));
      return;
    }

    const players = playerList();
    const order = game.player_order || players.map((player) => player.name);
    els.round.textContent = text(
      `السؤال ${round.round_number} من ${game.question_limit}`,
      `Question ${round.round_number} of ${game.question_limit}`,
    );
    els.turn.textContent = text(
      `الدور ${round.action_number} من ${order.length}`,
      `Turn ${round.action_number} of ${order.length}`,
    );
    if (els.roundInfo) els.roundInfo.textContent = text(`الجولة ${round.round_number}`, `Round ${round.round_number}`);
    if (els.actionInfo) els.actionInfo.textContent = text(`الدور ${round.action_number}/${order.length}`, `Action ${round.action_number}/${order.length}`);

    const selectedPlayer = round.selected_player;
    const answers = round.selected_answers || {};
    const selectedAnswered = answers[selectedPlayer] !== undefined;
    const alreadyAnswered = answers[playerName] !== undefined;
    const isSelectedPlayer = playerName === selectedPlayer;
    window.waveBg?.setDefault();

    const redundantQuestionHeading = /^would you rather[?؟]?$/i.test(round.question.trim());
    els.question.textContent = redundantQuestionHeading ? "" : round.question;
    els.question.classList.toggle("d-none", redundantQuestionHeading);
    els.choose.textContent = isSelectedPlayer
      ? text("بسرية!! اختر بين هذين الخيارين", "In secret, choose between these two")
      : selectedAnswered
        ? text(`توقع اختيار ${selectedPlayer}`, `Guess what ${selectedPlayer} chose`)
        : text(`ننتظر ${selectedPlayer} يختار...`, `Waiting for ${selectedPlayer} to choose...`);
    els.choose.style.display = "block";
    els.waiting.style.display = "none";

    renderOptions(answers, selectedPlayer, selectedAnswered, alreadyAnswered, isSelectedPlayer);

    const isHost = playerName === game.host;
    const canAdvance = Boolean(isHost && round.points_awarded);
    els.next.classList.toggle("d-none", !canAdvance);
    els.next.textContent = text("التالي", "Next");
    syncNextOrbit(canAdvance);

    if (isHost && allAnswersSubmitted() && !round.points_awarded && !awarding) {
      awarding = true;
      window.tfadhloonApi.awardPoints(code)
        .then(refresh)
        .catch((error) => alertBox(localizedError(error, "تعذر احتساب النقاط", "Unable to award points")))
        .finally(() => { awarding = false; });
    }
    scheduleTestBot();
  }

  function renderEndGame() {
    if (endScreenRendered) return;
    endScreenRendered = true;
    const ranked = [...playerList()].sort((a, b) => (b.points || 0) - (a.points || 0));
    const topScore = ranked[0]?.points || 0;
    const winners = ranked.filter((player) => (player.points || 0) === topScore);
    const winnerNames = winners.map((player) => player.name).join(language() === "ar" ? " و " : " & ");

    document.body.classList.add("tf-game-ended");
    const screen = document.createElement("section");
    screen.className = "tf-end-screen";
    screen.setAttribute("aria-labelledby", "tfEndTitle");
    screen.innerHTML = `
      <div class="tf-winner-mark" aria-hidden="true">🏆</div>
      <h2 id="tfEndTitle" class="tf-end-title"></h2>
      <p class="tf-end-subtitle"></p>
      <div class="tf-final-leaderboard" aria-label="${text("الترتيب النهائي", "Final leaderboard")}"></div>
      <div class="tf-end-actions">
        <button type="button" class="tf-play-again menu-button compact shape-1"></button>
        <button type="button" class="tf-return-home menu-button compact" data-blob-variant="wide1"></button>
      </div>
      <div class="tf-suggestion-footer">
        <button type="button" id="endSuggestQuestionBtn" class="tf-end-suggest tf-suggest-question-btn menu-button full-width" data-blob-variant="wide1">
          <i class="bi bi-lightbulb" aria-hidden="true"></i>
          <span></span>
        </button>
      </div>`;

    screen.querySelector(".tf-end-title").textContent = winners.length > 1
      ? text("تعادل جميل!", "A brilliant tie!")
      : text(`مبروك ${winnerNames}!`, `Congratulations, ${winnerNames}!`);
    screen.querySelector(".tf-end-subtitle").textContent = text(
      "هذه هي النتيجة النهائية",
      "Here are the final results",
    );

    const leaderboard = screen.querySelector(".tf-final-leaderboard");
    ranked.forEach((player, index) => {
      const row = document.createElement("div");
      row.className = `tf-final-player${index === 0 ? " is-winner" : ""}`;
      const rankLabel = index === 0 ? "★" : String(index + 1);
      row.innerHTML = `
        <span class="tf-final-rank"></span>
        <span class="tf-final-name"></span>
        <span class="tf-final-score"></span>`;
      row.querySelector(".tf-final-rank").textContent = rankLabel;
      row.querySelector(".tf-final-name").textContent = displayName(player.name);
      row.querySelector(".tf-final-score").textContent = text(
        `${player.points || 0} نقطة`,
        `${player.points || 0} pts`,
      );
      leaderboard.appendChild(row);
    });

    const playAgain = screen.querySelector(".tf-play-again");
    const returnHome = screen.querySelector(".tf-return-home");
    const endSuggest = screen.querySelector(".tf-end-suggest");
    playAgain.textContent = text("العبوا مرة ثانية", "Play again");
    returnHome.textContent = text("العودة للرئيسية", "Return home");
    localizeSuggestionButton(endSuggest);
    endSuggest.addEventListener("click", suggestQuestion);
    playAgain.addEventListener("click", () => {
      window.location.href = "tfadhloon-homepage.html?playAgain=1";
    });
    returnHome.addEventListener("click", () => {
      window.location.href = "tfadhloon-homepage.html";
    });

    document.body.appendChild(screen);
    window.tfadhloonUi?.refreshScrollIndicator();
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    window.scrollTo(0, 0);
    window.requestAnimationFrame(() => window.scrollTo(0, 0));
    window.tfadhloonUi?.celebrate(screen);
    window.tfadhloonUi?.announce(screen.querySelector(".tf-end-title").textContent);
  }

  async function performRefresh() {
    game = await window.tfadhloonApi.getGame(code);
    if (game.status === "lobby") {
      window.location.href = `tfadhloon-lobby.html?code=${code}`;
      return;
    }
    if (game.status === "ended") {
      window.waveBg?.setDefault();
      els.options.innerHTML = "";
      els.next.classList.add("d-none");
      syncNextOrbit(false);
      renderPlayers();
      renderEndGame();
      removeTestBot();
      window.tfadhloonUi?.hideBusy();
      return;
    }
    round = game.current_round || await window.tfadhloonApi.getCurrentRound(code);
    renderPlayers();
    syncResultFeed();
    renderQuestion();
    const roundKey = `${round.round_number}:${round.action_number}:${round.question_id}`;
    if (roundKey !== lastRoundKey) {
      lastRoundKey = roundKey;
      window.tfadhloonUi?.animateRound(document.querySelector(".container"));
    }
    window.tfadhloonUi?.hideBusy();
  }

  async function refresh() {
    if (refreshPromise) {
      refreshAgain = true;
      return refreshPromise;
    }

    refreshPromise = (async () => {
      do {
        refreshAgain = false;
        await performRefresh();
      } while (refreshAgain);
    })();

    try {
      await refreshPromise;
    } finally {
      refreshPromise = null;
    }
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
          message: text("تعذر تحديث الجولة", "Unable to refresh the round"),
          type: "error",
          actionText: text("إعادة المحاولة", "Retry"),
          onAction: queueRefresh,
        });
        console.error("Gameplay refresh error:", error);
      }
    }, 80);
  }

  async function nextAction() {
    const surface = document.querySelector(".container");
    els.next.disabled = true;
    syncNextOrbit(false);
    window.tfadhloonUi?.setButtonLoading(els.next, true, text("التالي...", "Next..."));
    try {
      const result = await window.tfadhloonApi.nextAction(code);
      if (result.ended) {
        await refresh();
        return;
      }
      if (!result.currentRound?.question) {
        throw new Error(text("لم يتم تحميل السؤال التالي", "The next question could not be loaded"));
      }
      await refresh();
    } catch (error) {
      alertBox(localizedError(error, "تعذر الانتقال للسؤال التالي", "Unable to advance"));
    } finally {
      surface?.classList.remove("tf-round-leaving");
      window.tfadhloonUi?.setButtonLoading(els.next, false);
      syncNextOrbit(!els.next.classList.contains("d-none"));
    }
  }

  async function init() {
    localizeSuggestionButton(els.suggest);
    els.suggest?.addEventListener("click", suggestQuestion);
    window.tfadhloonUi?.initScrollIndicator({ gameplay: true });
    window.tfadhloonUi?.showBusy({
      title: text("نحمل السؤال...", "Loading the question..."),
      message: text("استعدوا للاختيار", "Get ready to choose"),
    });
    try {
      if (!window.tfadhloonApi) throw new Error("Game service is unavailable.");
      await refresh();
      unsubscribe = await window.tfadhloonApi.subscribeGame(
        code,
        queueRefresh,
        (error) => {
          if (realtimeFailed) return;
          realtimeFailed = true;
          window.tfadhloonUi?.showBanner({
            message: text("الاتصال ضعيف. الجولة محفوظة.", "Connection interrupted. The round is safe."),
            type: "error",
            actionText: text("إعادة المحاولة", "Retry"),
            onAction: () => window.location.reload(),
          });
          console.error("Gameplay realtime error:", error);
        },
      );
    } catch (error) {
      console.error("Unable to load game:", error);
      window.tfadhloonUi?.showEmptyState({
        icon: "!",
        title: text("تعذر تحميل اللعبة", "Unable to load the game"),
        message: text("حاولوا مرة ثانية أو ارجعوا للرئيسية.", "Try again or return home."),
        actionText: text("العودة للرئيسية", "Return home"),
        onAction: () => { window.location.href = "tfadhloon-homepage.html"; },
      });
    }
  }

  els.next.addEventListener("click", nextAction);
  els.back.addEventListener("click", () => {
    window.location.href = "tfadhloon-homepage.html";
  });
  function setDashboardOpen(isOpen) {
    els.dashboard?.classList.toggle("open", isOpen);
    els.dashboard?.setAttribute("aria-hidden", String(!isOpen));
    els.dashboardToggle?.setAttribute("aria-hidden", String(isOpen));
  }

  setDashboardOpen(false);
  els.dashboardToggle?.addEventListener("click", () => setDashboardOpen(true));
  els.dashboardClose?.addEventListener("click", () => setDashboardOpen(false));
  window.addEventListener("pageshow", (event) => {
    if (event.persisted) queueRefresh();
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") queueRefresh();
  });
  window.addEventListener("focus", queueRefresh);
  window.addEventListener("beforeunload", () => {
    if (botTimer) window.clearTimeout(botTimer);
    if (unsubscribe) unsubscribe();
  });

  init();
})();
