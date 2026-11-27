/* Load a host account when available; guests may join without one. */
(function () {
  "use strict";

  const apiOrigin =
    window.DORDOR_API_ORIGIN || "https://dordorgames-production.up.railway.app";
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
      return null;
    }
    if (!response.ok)
      throw new Error("Account verification returned " + response.status);
    return response.json();
  }

  window.DordorAccountReady = loadAccount()
    .then(function (account) {
      window.DordorAccount = account;
      if (!account) return null;
      window.dispatchEvent(
        new CustomEvent("dordor-account-ready", { detail: account }),
      );
      return account;
    })
    .catch(function (error) {
      console.error("[Account] Verification failed.", error);
      return null;
    });

  window.DordorActivateHostSession = async function () {
    const response = await request("/api/auth/host-session/activate", { method: "POST" });
    if (!response.ok) throw new Error("HOSTING_TIME_REQUIRED");
    const result = await response.json();
    const account = { ...window.DordorAccount, activeSessionEndsAt: result.sessionEndsAt };
    window.DordorAccount = account;
    return result;
  };

  window.DordorRequireActiveHostSession = async function () {
    const response = await request("/api/auth/host-session");
    const result = response.ok ? await response.json() : null;
    if (!result?.active) throw new Error("HOSTING_TIME_REQUIRED");
    return result;
  };
})();
