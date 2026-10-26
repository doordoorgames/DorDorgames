/**
 * supabase-client.js
 * Thin helper that:
 *   1. Fetches the public Supabase config (URL + anon key) from the API server.
 *   2. Initialises window.supabaseClient using the CDN-loaded @supabase/supabase-js.
 *   3. Exposes a small window.tfadhloonApi wrapper for the game pages to use
 *      instead of calling Firebase directly.
 *
 * Include AFTER the Supabase CDN script:
 *   <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js"></script>
 *   <script src="supabase-client.js"></script>
 *
 * Firebase code remains untouched — this file is the new entry point for all
 * Supabase interactions. Pages that have been migrated should call
 *   window.tfadhloonApi.*  instead of  firebase.database().*
 */

(function () {
  "use strict";

  const API_BASE = (function () {
    const backendOrigin = window.DORDOR_API_ORIGIN || "https://dordorgames-production.up.railway.app";
    return backendOrigin.replace(/\/+$/, "") + "/tfadhloon/api";
  })();

  let _supabase = null;
  let _initPromise = null;
  let _refreshPromise = null;

  /**
   * Initialise (or return cached) Supabase client.
   * Always await this before calling _supabase.* methods.
   */
  async function init() {
    if (_supabase) return _supabase;
    if (_initPromise) return _initPromise;

    _initPromise = (async () => {
      try {
        const res = await fetch(API_BASE + "/config");
        if (!res.ok) throw new Error("Config endpoint returned " + res.status);
        const { url, anonKey } = await res.json();
        if (!window.supabase?.createClient) {
          throw new Error("Supabase browser library failed to load.");
        }
        _supabase = window.supabase.createClient(url, anonKey);
        window.supabaseClient = _supabase;
        console.log("[tfadhloon] Supabase client initialised ✓");
        return _supabase;
      } catch (err) {
        console.warn("[tfadhloon] Supabase not available:", err.message);
        return null;
      }
    })();

    return _initPromise;
  }

  // ─── REST helpers that go through the API server ─────────────────────────

  async function apiFetch(path, options = {}) {
    let res = await fetch(API_BASE + path, {
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      ...options,
    });
    if (res.status === 401) {
      const authBase = API_BASE.replace(/\/tfadhloon\/api$/, "");
      _refreshPromise ||= fetch(authBase + "/api/auth/refresh", {
        method: "POST",
        credentials: "include",
      }).then((response) => response.ok).catch(() => false).finally(() => { _refreshPromise = null; });
      if (await _refreshPromise) {
        res = await fetch(API_BASE + path, {
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          ...options,
        });
      }
    }
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || "API error " + res.status);
    }
    return res.json();
  }

  // ─── Public API ──────────────────────────────────────────────────────────

  window.tfadhloonApi = {

    // ── Game lifecycle ──────────────────────────────────────────────────────

    createGame: (hostName, language, code) =>
      apiFetch("/games", { method: "POST", body: JSON.stringify({ hostName, language, code }) }),

    getGame: (code) =>
      apiFetch("/games/" + code),

    patchGame: (code, updates) =>
      apiFetch("/games/" + code, { method: "PATCH", body: JSON.stringify(updates) }),

    joinGame: (code, playerName) =>
      apiFetch("/games/" + code + "/join", { method: "POST", body: JSON.stringify({ playerName }) }),

    updateGame: (code, updates) =>
      apiFetch("/games/" + code, { method: "PATCH", body: JSON.stringify(updates) }),

    startGame: (code) =>
      apiFetch("/games/" + code + "/start", { method: "POST" }),

    getCurrentRound: (code) =>
      apiFetch("/games/" + code + "/round"),

    nextAction: (code) =>
      apiFetch("/games/" + code + "/next", { method: "POST" }),

    endGame: (code) =>
      apiFetch("/games/" + code + "/end", { method: "POST" }),

    // ── Gameplay ────────────────────────────────────────────────────────────

    submitAnswer: (code, playerName, answer, turn) =>
      apiFetch("/games/" + code + "/submit", {
        method: "POST",
        body: JSON.stringify({
          playerName,
          answer,
          roundNumber: turn.roundNumber,
          actionNumber: turn.actionNumber,
          questionId: turn.questionId,
        }),
      }),

    awardPoints: (code) =>
      apiFetch("/games/" + code + "/award-points", { method: "POST" }),

    // ── Players ─────────────────────────────────────────────────────────────

    removePlayer: (code, playerName) =>
      apiFetch("/games/" + code + "/players/" + encodeURIComponent(playerName), {
        method: "DELETE",
      }),

    // ── Questions (admin) ───────────────────────────────────────────────────

    getQuestions: (filters = {}) => {
      const qs = new URLSearchParams(filters).toString();
      return apiFetch("/admin/questions" + (qs ? "?" + qs : ""));
    },

    getPlayableQuestions: async (language, category) => {
      const questionLanguage =
        language === "en" || language === "english" ? "english" : "arabic";
      const filters = { language: questionLanguage };
      if (category) filters.category = category;

      const questions = await apiFetch(
        "/admin/questions?" + new URLSearchParams(filters).toString(),
      );

      return questions.filter(
        (question) =>
          question &&
          question.language === questionLanguage &&
          question.category &&
          Array.isArray(question.options) &&
          question.options.length > 0,
      );
    },

    getPlayableCategories: async (language) => {
      const questions = await window.tfadhloonApi.getPlayableQuestions(language);
      return [...new Set(questions.map((question) => question.category))];
    },

    createQuestion: (data) =>
      apiFetch("/admin/questions", { method: "POST", body: JSON.stringify(data) }),

    updateQuestion: (id, data) =>
      apiFetch("/admin/questions/" + id, { method: "PUT", body: JSON.stringify(data) }),

    deleteQuestion: (id) =>
      apiFetch("/admin/questions/" + id, { method: "DELETE" }),

    // ── Categories (admin) ──────────────────────────────────────────────────

    getCategories: (language) =>
      apiFetch("/admin/categories" + (language ? "?language=" + language : "")),

    createCategory: (name, language) =>
      apiFetch("/admin/categories", { method: "POST", body: JSON.stringify({ name, language }) }),

    deleteCategory: (id) =>
      apiFetch("/admin/categories/" + id, { method: "DELETE" }),

    // ── Ads (admin) ─────────────────────────────────────────────────────────

    getAds: (type) =>
      apiFetch("/admin/ads" + (type ? "?type=" + type : "")),

    createAd: (data) =>
      apiFetch("/admin/ads", { method: "POST", body: JSON.stringify(data) }),

    updateAd: (id, data) =>
      apiFetch("/admin/ads/" + id, { method: "PUT", body: JSON.stringify(data) }),

    deleteAd: (id) =>
      apiFetch("/admin/ads/" + id, { method: "DELETE" }),

    // ── Settings (admin) ────────────────────────────────────────────────────

    getSettings: () => apiFetch("/admin/settings"),

    updateSetting: (key, value) =>
      apiFetch("/admin/settings/" + key, { method: "PUT", body: JSON.stringify({ value }) }),

    // ── Suggestions ─────────────────────────────────────────────────────────

    suggestQuestions: (code, data) =>
      apiFetch("/games/" + code + "/suggest", { method: "POST", body: JSON.stringify(data) }),

    getSuggestions: (status) =>
      apiFetch("/admin/suggestions" + (status ? "?status=" + status : "")),

    reviewSuggestion: (id, status) =>
      apiFetch("/admin/suggestions/" + id, { method: "PATCH", body: JSON.stringify({ status }) }),

    // ── Stats (admin) ───────────────────────────────────────────────────────

    getStats: () => apiFetch("/admin/stats"),

    // ── Realtime subscriptions (Supabase Realtime via anon client) ──────────

    /**
     * Subscribe to live game state changes.
     * callback(payload) fires on INSERT/UPDATE/DELETE.
     * Returns an unsubscribe function.
     *
     * Usage:
     *   const unsub = await window.tfadhloonApi.subscribeGame("12345", (payload) => {
     *     console.log("game changed", payload.new);
     *   });
     *   // later: unsub();
     */
    subscribeGame: async (code, callback, onError) => {
      const client = await init();
      if (!client) {
        const error = new Error("Realtime initialization failed.");
        if (onError) onError(error);
        throw error;
      }
      const channel = client
        .channel("game:" + code)
        .on("postgres_changes", {
          event: "*",
          schema: "public",
          table: "games",
          filter: "code=eq." + code,
        }, callback)
        .on("postgres_changes", {
          event: "*",
          schema: "public",
          table: "players",
          filter: "game_code=eq." + code,
        }, callback)
        .on("postgres_changes", {
          event: "*",
          schema: "public",
          table: "game_rounds",
          filter: "game_code=eq." + code,
        }, callback)
        .subscribe((status, error) => {
          if ((status === "CHANNEL_ERROR" || status === "TIMED_OUT") && onError) {
            onError(error || new Error("Realtime subscription " + status.toLowerCase()));
          }
        });

      return () => client.removeChannel(channel);
    },

    createPresenceChannel: async (code, peerId, onPeers, onError) => {
      const client = await init();
      if (!client) throw new Error("Realtime initialization failed.");
      const channel = client.channel("voice:" + code, {
        config: { presence: { key: peerId } },
      });
      channel.on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        onPeers(Object.keys(state));
      });
      channel.subscribe(async (status, error) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ peerId, onlineAt: new Date().toISOString() });
        } else if ((status === "CHANNEL_ERROR" || status === "TIMED_OUT") && onError) {
          onError(error || new Error("Voice realtime " + status.toLowerCase()));
        }
      });
      return () => client.removeChannel(channel);
    },

    // ── Connection check ────────────────────────────────────────────────────

    isConnected: async () => {
      const client = await init();
      return client !== null;
    },

    // Internal init (for pages that need the raw supabase client)
    _init: init,
  };

  // Auto-init on load so it's ready when the page needs it.
  init();
})();
