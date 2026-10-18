(function () {
  "use strict";

  const form = document.getElementById("adminLoginForm");
  const passwordInput = document.getElementById("adminPassword");
  const toggle = document.getElementById("togglePassword");
  const errorMessage = document.getElementById("errorMessage");
  const loginText = document.querySelector(".login-text");
  const loading = document.querySelector(".loading");
  const backendOrigin = window.DORDOR_API_ORIGIN || window.location.origin;
  const loginUrl = backendOrigin.replace(/\/+$/, "") + "/api/admin/login";
  const sessionDuration = 24 * 60 * 60 * 1000;

  toggle.addEventListener("click", function () {
    const showing = passwordInput.type === "text";
    passwordInput.type = showing ? "password" : "text";
    this.classList.toggle("fa-eye", showing);
    this.classList.toggle("fa-eye-slash", !showing);
  });

  form.addEventListener("submit", async function (event) {
    event.preventDefault();
    errorMessage.style.display = "none";
    loginText.style.display = "none";
    loading.classList.add("show");

    try {
      const response = await fetch(loginUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: "admin", password: passwordInput.value }),
      });
      const result = await response.json();
      if (!response.ok || !result.token) throw new Error("Invalid password");

      sessionStorage.setItem("adminAuthenticated", "true");
      sessionStorage.setItem("adminLoginTime", Date.now().toString());
      sessionStorage.setItem("dordorAdminToken", result.token);
      window.location.href = "admin-dashboard.html";
    } catch {
      errorMessage.textContent = "Invalid password. Please try again.";
      errorMessage.style.display = "block";
      passwordInput.value = "";
      passwordInput.focus();
    } finally {
      loginText.style.display = "inline";
      loading.classList.remove("show");
    }
  });

  const loginTime = Number(sessionStorage.getItem("adminLoginTime") || 0);
  const authenticated = sessionStorage.getItem("adminAuthenticated") === "true";
  if (authenticated && Date.now() - loginTime < sessionDuration) {
    window.location.href = "admin-dashboard.html";
  } else {
    sessionStorage.removeItem("adminAuthenticated");
    sessionStorage.removeItem("adminLoginTime");
    sessionStorage.removeItem("dordorAdminToken");
    passwordInput.focus();
  }
})();

