document.addEventListener("DOMContentLoaded", function () {
  const fileInput = document.getElementById("resumeFile");
  const customLabel = document.getElementById("customFileLabel");

  if (fileInput) {
    fileInput.addEventListener("change", () => {
      const fileName = fileInput.files.length > 0 ? fileInput.files[0].name : "📄 Choose PDF Resume";
      customLabel.textContent = `📎 ${fileName}`;
    });
  }

  const form = document.getElementById("uploadForm");
  form?.addEventListener("submit", async function (e) {
    e.preventDefault();
    const spinner = document.getElementById("loadingSpinner");
    const resultsDiv = document.getElementById("internshipResults");
    const uploadingMessage = document.getElementById("uploadingMessage");

    const file = document.getElementById("resumeFile").files[0];
    if (!file) {
      alert("Please upload a file");
      return;
    }

    const formData = new FormData();
    formData.append("resume", file);

    spinner.style.display = "block";
    uploadingMessage.style.display = "block";
    resultsDiv.innerHTML = "";
    resultsDiv.style.display = "none";

    try {
      const res = await fetch(`https://resumate-production-a93f.up.railway.app/api/upload`, {
        method: "POST",
        body: formData
      });

      const data = await res.json();

      spinner.style.display = "none";
      uploadingMessage.style.display = "none";

      const internships = data.internships;

      if (internships && internships.length > 0) {
        resultsDiv.innerHTML = "<h3 style='margin-bottom: 20px;'>Internship Matches</h3>";

        internships.forEach(job => {
          const matchDiv = document.createElement("div");
          matchDiv.className = "card";

          // --- NEW: Determine color based on ATS score ---
          const atsScore = parseInt(job.ats); // Convert ATS score to an integer
          let atsColorClass = ''; // For CSS class approach
          let atsInlineStyle = ''; // For inline style approach

          if (atsScore >= 80) {
            atsColorClass = 'ats-high'; // Green for high match
            atsInlineStyle = 'color: #28a745; font-weight: bold;'; // Tailwind-like green
          } else if (atsScore >= 45) {
            atsColorClass = 'ats-medium'; // Orange/Yellow for medium match
            atsInlineStyle = 'color: #ffc107;'; // Tailwind-like yellow
          } else if (atsScore > 0) { // Anything above 0 but below 50
            atsColorClass = 'ats-low'; // Red/Grey for low match
            atsInlineStyle = 'color: #dc3545;'; // Tailwind-like red
          } else { // ATS score is 0 or N/A
            atsColorClass = 'ats-none'; // Grey for no match/N/A
            atsInlineStyle = 'color: #6c757d;'; // Tailwind-like grey
          }
          // --- END NEW ---

          matchDiv.innerHTML = `
            <h4>${job.title}</h4>
            <p><strong>📍 Location:</strong> ${job.location}</p>
            <p><strong>💰 Stipend:</strong> ${job.stipend}</p>
            <p><strong>📊 ATS Match:</strong> <span class="${atsColorClass}" style="${atsInlineStyle}">${job.ats}%</span></p>
            <p><strong>🔗 <a href="${job.link}" target="_blank">View Internship</a></strong></p>
            <p><strong>🚀 <a href="${job.apply}" target="_blank">Apply Now</a></strong></p>
          `;
          resultsDiv.appendChild(matchDiv);
        });
        resultsDiv.style.display = "block";
      } else {
          resultsDiv.innerHTML = "<p>No internship matches found.</p>";
          resultsDiv.style.display = "block";
      }

    } catch (err) {
      spinner.style.display = "none";
      uploadingMessage.style.display = "none";
      resultsDiv.style.display = "none";
      console.error("❌ Upload failed:", err);
      if (err.message && err.message.includes("Invalid output from Python script")) {
          alert("Upload failed. The server received invalid data from the processing script. Check server logs for Python errors.");
      } else {
          alert("Upload failed. Check console for details.");
      }
    }
  });


  document.getElementById("loginForm")?.addEventListener("submit", async function (e) {
    e.preventDefault();
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const spinner = document.getElementById("loadingSpinner");
    const loadingMessage = document.getElementById("loadingMessage");

    spinner.style.display = "block";
    loadingMessage.style.display = "block";

    const res = await fetch("https://resumate-production-a93f.up.railway.app/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();

    spinner.style.display = "none";
    loadingMessage.style.display = "none";

    if (res.ok) {
      localStorage.setItem("token", data.token);
      window.location.href = "dashboard.html";
    } else {
      alert(data.message || "Login failed!");
    }
  });

  document.getElementById("signupForm")?.addEventListener("submit", async function (e) {
    e.preventDefault();
    const name = document.getElementById("name").value;
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

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
  });
});