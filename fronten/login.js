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
    
      console.log("🟡 Logging in with:", email, password);
    
      loginSpinner.style.display = "block";
      loadingMessage.style.display = "block";
    
      try {
        const res = await fetch("https://resumate-production-a93f.up.railway.app/api/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password })
        });
    
        const data = await res.json();
    
        console.log("🟢 Server response:", data);  // 👈 ADD THIS
    
        loginSpinner.style.display = "none";
        loadingMessage.style.display = "none";
    
        if (res.ok) {
          if (!data.token || !data.user) {
            alert("🛑 Login response missing data");
            return;
          }
    
          localStorage.setItem("token", data.token);
          localStorage.setItem("userId", data.user._id);
          window.location.href = "dashboard.html";
        } else {
          alert(data.message || "Login failed!");
        }
    
      } catch (err) {
        loginSpinner.style.display = "none";
        loadingMessage.style.display = "none";
        console.error("❌ Network/login error:", err);
        alert("Login failed. Network error.");
      }
    });
  });