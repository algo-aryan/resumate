// signup.js
document.addEventListener("DOMContentLoaded", function () {
    const signupForm = document.getElementById("signupForm");
    const themeToggle = document.getElementById('themeToggle');
    const body = document.body;
  
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
  
    signupForm?.addEventListener("submit", async function (e) {
      e.preventDefault();
      const name = document.getElementById("name").value;
      const email = document.getElementById("email").value;
      const password = document.getElementById("password").value;
  
      try {
        const res = await fetch("https://resumate-production-a93f.up.railway.app/api/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, password })
        });
  
        const data = await res.json();
        if (res.ok) {
          alert("Signup successful! Redirecting to login...");
          window.location.href = "login.html";
        } else {
          alert(data.message || "Signup failed!");
        }
      } catch (err) {
        alert("Signup failed. Network error.");
      }
    });
  });