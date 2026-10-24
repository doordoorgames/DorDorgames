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

  function showSessionStatus(account) {
    if (account.role !== "host") return;
    const render = function () {
      const active = account.activeSessionEndsAt && new Date(account.activeSessionEndsAt).getTime() > Date.now();
      const status = document.getElementById("dordor-session-status") || document.createElement("div");
      status.id = "dordor-session-status";
      status.setAttribute("role", "status");
      status.style.cssText = "position:fixed;top:14px;left:50%;transform:translateX(-50%);z-index:10000;padding:9px 14px;border:1px solid rgba(255,255,255,.45);border-radius:999px;background:rgba(12,8,24,.9);color:#fff;font:700 13px/1.2 system-ui,sans-serif;box-shadow:0 5px 20px rgba(0,0,0,.35);white-space:nowrap";
      if (active) {
        const end = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(new Date(account.activeSessionEndsAt));
        status.textContent = "Session ends at " + end;
      } else if ((account.remainingMinutes || 0) > 0) {
        status.textContent = account.remainingMinutes + " purchased minutes available";
      } else {
        status.innerHTML = 'Session ended · <a href="https://www.dordor.games/pricing" style="color:#ffe100">Buy a plan</a>';
      }
      if (!status.isConnected) document.body.appendChild(status);
    };
    if (document.body) render();
    else document.addEventListener("DOMContentLoaded", render, { once: true });
  }

  function showAccountChip(account) {
    const render = function () {
      const chip = document.getElementById("dordor-account-chip") || document.querySelector('a[href^="https://www.dordor.games/account"]') || document.createElement("a");
      chip.id = "dordor-account-chip";
      chip.href = "https://www.dordor.games/account";
      chip.setAttribute("aria-label", "Open account profile");
      chip.style.cssText = "position:fixed;right:14px;bottom:max(14px,env(safe-area-inset-bottom));z-index:10001;display:flex;align-items:center;gap:8px;max-width:min(72vw,260px);padding:9px 12px;border:1px solid rgba(255,255,255,.5);border-radius:999px;background:rgba(12,8,24,.92);color:#fff;text-decoration:none;font:800 13px/1.2 system-ui,sans-serif;box-shadow:0 5px 20px rgba(0,0,0,.4);backdrop-filter:blur(8px)";
      chip.replaceChildren();
      const avatar = document.createElement("span");
      avatar.textContent = (account.fullName || "?").trim().charAt(0).toUpperCase();
      avatar.style.cssText = "display:grid;place-items:center;flex:0 0 26px;width:26px;height:26px;border-radius:50%;background:#ffe100;color:#111;font-weight:900";
      const name = document.createElement("span");
      name.textContent = account.fullName || "Account";
      name.style.cssText = "overflow:hidden;text-overflow:ellipsis;white-space:nowrap";
      chip.append(avatar, name);
      if (!chip.isConnected) document.body.appendChild(chip);
    };
    if (document.body) render();
    else document.addEventListener("DOMContentLoaded", render, { once: true });
  }

  window.DordorAccountReady = loadAccount()
    .then(function (account) {
      window.DordorAccount = account;
      document.documentElement.style.visibility = "visible";
      showSessionStatus(account);
      showAccountChip(account);
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

  window.DordorActivateHostSession = async function () {
    const response = await request("/api/auth/host-session/activate", { method: "POST" });
    if (!response.ok) throw new Error("HOSTING_TIME_REQUIRED");
    const result = await response.json();
    const account = { ...window.DordorAccount, activeSessionEndsAt: result.sessionEndsAt };
    window.DordorAccount = account;
    showSessionStatus(account);
    return result;
  };

  window.DordorRequireActiveHostSession = async function () {
    const response = await request("/api/auth/host-session");
    const result = response.ok ? await response.json() : null;
    if (!result?.active) throw new Error("HOSTING_TIME_REQUIRED");
    return result;
  };
})();
