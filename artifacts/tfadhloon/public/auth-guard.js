/* Require a Dordor account before any game UI becomes interactive. */
(function () {
  "use strict";

  const apiOrigin =
    window.DORDOR_API_ORIGIN || "https://dordorgames-production.up.railway.app";
  const accountUrl =
    "https://www.dordor.games/account?returnTo=" +
    encodeURIComponent(window.location.href);
  document.documentElement.style.visibility = "hidden";

  async function request(path, options) {
    return fetch(apiOrigin + path, {
      credentials: "include",
      headers: { Accept: "application/json" },
      ...options,
    });
  }

  async function loadAccount() {
    let response = await request("/api/auth/me");
    if (response.status === 401) {
      const refreshed = await request("/api/auth/refresh", { method: "POST" });
      if (refreshed.ok) response = await request("/api/auth/me");
    }
    if (response.status === 401 || response.status === 403) {
      window.location.replace(accountUrl);
      return new Promise(function () {});
    }
    if (!response.ok)
      throw new Error("Account verification returned " + response.status);
    return response.json();
  }

  function showUnavailable() {
    document.documentElement.style.visibility = "visible";
    const render = function () {
      document.body.innerHTML =
        '<main style="min-height:100vh;display:grid;place-items:center;background:#111;color:#fff;font-family:sans-serif;padding:24px;text-align:center">' +
        "<div><h1>Unable to verify your account</h1><p>Please check your connection and try again.</p>" +
        '<button onclick="location.reload()" style="padding:12px 22px;font-weight:700;cursor:pointer">Try again</button></div></main>';
    };
    if (document.body) render();
    else document.addEventListener("DOMContentLoaded", render, { once: true });
  }

  window.DordorAccountReady = loadAccount()
    .then(function (account) {
      window.DordorAccount = account;
      document.documentElement.style.visibility = "visible";
      window.dispatchEvent(
        new CustomEvent("dordor-account-ready", { detail: account }),
      );
      return account;
    })
    .catch(function (error) {
      console.error("[Account] Verification failed.", error);
      showUnavailable();
      return new Promise(function () {});
    });
})();
