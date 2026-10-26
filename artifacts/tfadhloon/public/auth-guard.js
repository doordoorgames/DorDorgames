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
    if (account.role !== "host") {
      document.getElementById("dordor-account-chip")?.remove();
      return;
    }
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

  window.addEventListener("dordor-account-updated", function (event) {
    if (event.detail) showSessionStatus(event.detail);
  });

  window.DordorAccountReady = loadAccount()
    .then(function (account) {
      window.DordorAccount = account;
      if (!account) return null;
      showSessionStatus(account);
      if (account.role === "host") showAccountChip(account);
      window.dispatchEvent(
        new CustomEvent("dordor-account-ready", { detail: account }),
      );
      return account;
    })
    .catch(function (error) {
      console.error("[Account] Verification failed.", error);
      return null;
    });
})();
