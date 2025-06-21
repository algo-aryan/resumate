// login.js
document.addEventListener("DOMContentLoaded", function () {
    const loginForm = document.getElementById("loginForm");
    const themeToggle = document.getElementById('themeToggle');
    const body = document.body;
  
    // Theme
    function applyTheme(isDark) {
      if (isDark) {
        body.classList.remove('light-theme');
        localStorage.setItem('theme', 'dark');
      } else {
        body.classList.add('light-theme');
        localStorage.setItem('theme', 'light');
      }
    }
  
    const savedTheme = localStorage.getItem('theme');
    themeToggle.checked = savedTheme === 'light';
    applyTheme(savedTheme !== 'light');
    themeToggle.addEventListener('change', () => applyTheme(!themeToggle.checked));
  
    loginForm?.addEventListener("submit", async function (e) {
      e.preventDefault();
      const email = document.getElementById("email").value;
      const password = document.getElementById("password").value;
      const loginSpinner = document.getElementById("loadingSpinner");
      const loadingMessage = document.getElementById("loadingMessage");
  
      loginSpinner.style.display = "block";
      loadingMessage.style.display = "block";
  
      try {
        const res = await fetch("https://resumate-production-a93f.up.railway.app/api/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password })
        });
  
        const data = await res.json();
        loginSpinner.style.display = "none";
        loadingMessage.style.display = "none";
  
        if (res.ok) {
          localStorage.setItem("token", data.token);
          window.location.href = "dashboard.html";
        } else {
          alert(data.message || "Login failed!");
        }
      } catch (err) {
        loginSpinner.style.display = "none";
        loadingMessage.style.display = "none";
        alert("Login failed. Network error.");
      }
    });
  });