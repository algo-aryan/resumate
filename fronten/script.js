document.addEventListener("DOMContentLoaded", function () {
  const fileInput = document.getElementById("resumeFile");
  const customLabel = document.getElementById("customFileLabel");

  if (fileInput) { // Check if fileInput exists, as it's not present on login/signup pages
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
    const uploadingMessage = document.getElementById("uploadingMessage"); // Get uploading message element

    const file = document.getElementById("resumeFile").files[0];
    if (!file) {
      alert("Please upload a file");
      return;
    }

    const formData = new FormData();
    formData.append("resume", file);

    spinner.style.display = "block"; // Show the spinner
    uploadingMessage.style.display = "block"; // Show the uploading message
    resultsDiv.innerHTML = ""; // Clear previous results
    resultsDiv.style.display = "none"; // Hide the results div initially

    try {
      const res = await fetch(`https://resumate-production-a93f.up.railway.app/api/upload`, {
        method: "POST",
        body: formData
      });

      const data = await res.json();
      spinner.style.display = "none"; // Hide the spinner
      uploadingMessage.style.display = "none"; // Hide the uploading message

      const output = data.raw_output || "";

      // Only show results div if there's actual output
      if (output.trim() !== "") {
        resultsDiv.innerHTML = "<h3 style='margin-bottom: 20px;'>Internship Matches</h3>";
        const blocks = output
          .split(/\n(?=\d+\.)/)
          .filter(block => /^\d+\./.test(block.trim())); // Only keep blocks that start with "1.", "2.", etc.

        blocks.forEach(block => {
          if (block.trim() === "") return;

          const matchDiv = document.createElement("div");
          matchDiv.className = "card"; // Using 'card' class for styling consistency

          // Adjusting parsing for new block format (title, location, stipend, link, apply)
          const lines = block.trim().split("\n");
          if (lines.length >= 5) { // Ensure there are enough lines for all fields
            const title = lines[0].trim();
            const location = lines[1].replace("Location: ", "").trim();
            const stipend = lines[2].replace("Stipend: ", "").trim();
            const link = lines[3].replace("Link: ", "").trim();
            const apply = lines[4].replace("Apply: ", "").trim();

            matchDiv.innerHTML = `
              <h4>${title}</h4>
              <p><strong>📍 Location:</strong> ${location}</p>
              <p><strong>💰 Stipend:</strong> ${stipend}</p>
              <p><strong>🔗 <a href="${link}" target="_blank">View Internship</a></strong></p>
              <p><strong>🚀 <a href="${apply}" target="_blank">Apply Now</a></strong></p>
            `;
            resultsDiv.appendChild(matchDiv);
          } else {
            // Fallback for unexpected block format (if it doesn't have 5 specific lines)
            // You might want to handle this more robustly or log a warning
            matchDiv.innerHTML = `<h4>Error parsing internship:</h4><p>${block}</p>`;
            resultsDiv.appendChild(matchDiv);
          }
        });
        resultsDiv.style.display = "block"; // Show the results div after populating
      } else {
          resultsDiv.innerHTML = "<p>No internship matches found.</p>"; // Message for no results
          resultsDiv.style.display = "block"; // Still show the box to display "No matches"
      }


    } catch (err) {
      spinner.style.display = "none"; // Hide the spinner
      uploadingMessage.style.display = "none"; // Hide the uploading message
      resultsDiv.style.display = "none"; // Keep results hidden on error
      console.error("❌ Upload failed:", err);
      alert("Upload failed. Check console.");
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