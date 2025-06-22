document.addEventListener("DOMContentLoaded", function () {
  // --- Global Variables (will be populated on successful upload) ---
  let allInternships = [];

  // --- DOM Elements ---
  const fileInput = document.getElementById("resumeFile");
  const customLabel = document.getElementById("customFileLabel");
  const uploadForm = document.getElementById("uploadForm");
  const loadingSpinner = document.getElementById("loadingSpinner");
  const uploadingMessage = document.getElementById("uploadingMessage");
  const internshipResults = document.getElementById("internshipResults");
  const rightPanel = document.getElementById("rightPanel");

  // Filter specific elements
  const filterToggleBtn = document.getElementById('filterToggleBtn');
  const filterControlsWrapper = document.getElementById('filterControlsWrapper');
  const filterIcon = document.getElementById('filter-icon');
  const locationFilter = document.getElementById('locationFilter');
  const minStipendInput = document.getElementById('minStipend');
  const minAtsInput = document.getElementById('minAts');
  const applyFiltersBtn = document.getElementById('applyFiltersBtn');
  const resetFiltersBtn = document.getElementById('resetFiltersBtn');

  // --- Initial UI State Setup ---
  // Ensure right panel and filters are hidden on page load
  rightPanel.classList.remove('show');
  filterControlsWrapper.classList.remove('show-filters');


  // --- Theme Toggle Logic ---
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

  // Load saved theme on page load
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'light') {
    themeToggle.checked = true;
    applyTheme(false);
  } else {
    themeToggle.checked = false;
    applyTheme(true);
  }

  themeToggle.addEventListener('change', function () {
    applyTheme(!this.checked);
  });

  // --- Custom File Input Label Update ---
  if (fileInput) {
    fileInput.addEventListener("change", () => {
      const fileName = fileInput.files.length > 0 ? fileInput.files[0].name : "📄 Choose PDF Resume";
      customLabel.textContent = `📎 ${fileName}`;
    });
  }

  // --- Upload Form Submission Handler ---
  uploadForm?.addEventListener("submit", async function (e) {
    e.preventDefault();

    const file = fileInput.files[0];
    if (!file) {
      alert("Please upload a resume file (PDF).");
      return;
    }

    const formData = new FormData();
    formData.append("resume", file);

    // Show loading indicators and hide results
    loadingSpinner.style.display = "block";
    uploadingMessage.style.display = "block";
    rightPanel.classList.remove('show'); // Hide right panel during upload
    internshipResults.innerHTML = ""; // Clear previous results
    internshipResults.style.display = "none"; // Hide results content initially
    filterControlsWrapper.classList.remove('show-filters'); // Hide filters during upload
    filterIcon.textContent = '⚙️'; // Reset filter toggle icon
    filterToggleBtn.textContent = 'Show Filters'; // Reset filter toggle text
    filterToggleBtn.prepend(filterIcon); // Re-add icon to text

    try {
      // Use your Railway.app backend URL directly here
      const res = await fetch(`https://resumate-production-a93f.up.railway.app/api/upload`, {
        method: "POST",
        body: formData
      });

      // Check for non-2xx HTTP status codes
      if (!res.ok) {
        // Try to parse JSON error message, fallback to statusText
        const errorData = await res.json().catch(() => ({ message: res.statusText }));
        throw new Error(`HTTP error! Status: ${res.status}, Message: ${errorData.message || 'Unknown error from server.'}`);
      }

      const data = await res.json();

      loadingSpinner.style.display = "none";
      uploadingMessage.style.display = "none";

      if (data.internships && data.internships.length > 0) {
        allInternships = data.internships; // Store original data
        renderInternships(allInternships);
        rightPanel.classList.add("show"); // Show the right panel
        internshipResults.style.display = "block"; // Show results content
        populateLocationFilter(); // Populate locations based on fetched data
      } else {
        internshipResults.innerHTML = '<p>No internships found matching your resume.</p>';
        rightPanel.classList.add("show"); // Still show panel to display message
        internshipResults.style.display = "block"; // Show results content
      }

    } catch (err) {
      console.error("❌ Upload failed:", err);
      loadingSpinner.style.display = "none";
      uploadingMessage.style.display = "none";
      rightPanel.classList.add("show"); // Show panel to display error
      internshipResults.style.display = "block"; // Show results content

      let errorMessage = "Error processing your request.";
      if (err.message) {
        errorMessage += ` Details: ${err.message}`;
        if (err.message.includes("405")) {
          errorMessage += " (Method Not Allowed - check your backend server's configuration for the /upload endpoint)";
        } else if (err.message.includes("Invalid output from Python script")) {
          errorMessage += " (Invalid data from server's processing script)";
        }
      }
      internshipResults.innerHTML = `<p style="color: red;">${errorMessage}</p>`;
    }
  });

  // --- Filter Toggle Logic ---
  filterToggleBtn.addEventListener('click', function () {
    filterControlsWrapper.classList.toggle('show-filters');
    if (filterControlsWrapper.classList.contains('show-filters')) {
      filterIcon.textContent = '🔼'; // Up arrow
      filterToggleBtn.textContent = 'Hide Filters';
      filterToggleBtn.prepend(filterIcon); // Re-add icon to text
    } else {
      filterIcon.textContent = '⚙️'; // Gear icon
      filterToggleBtn.textContent = 'Show Filters';
      filterToggleBtn.prepend(filterIcon); // Re-add icon to text
    }
  });


  function renderInternships(internshipsToRender) {
    internshipResults.innerHTML = "<h3 style='margin-bottom: 20px;'>Internship Matches</h3>";
  
    if (!internshipsToRender || internshipsToRender.length === 0) {
      internshipResults.innerHTML += "<p>No results found after filtering.</p>";
      return;
    }
  
    internshipsToRender.forEach(job => {
      const matchDiv = document.createElement("div");
      matchDiv.className = "card";
  
      const atsScore = job.ats !== 'N/A' ? parseInt(job.ats) : 0;
      let atsClass = 'ats-none';
      let color = '';
      let bgColor = '';
      let glow = '';
  
      if (atsScore >= 80) {
        atsClass = 'ats-high';
        color = '#00e676';
        bgColor = 'rgba(0, 230, 118, 0.08)';
        glow = '0 0 15px rgba(0, 230, 118, 0.5)';
      } else if (atsScore >= 45) {
        atsClass = 'ats-medium';
        color = '#ffc107';
        bgColor = 'rgba(255, 193, 7, 0.08)';
        glow = '0 0 15px rgba(255, 193, 7, 0.4)';
      } else {
        atsClass = 'ats-low';
        color = '#ff4d4f';
        bgColor = 'rgba(255, 77, 79, 0.08)';
        glow = '0 0 15px rgba(255, 77, 79, 0.4)';
      }
  
      matchDiv.style.borderLeft = `6px solid ${color}`;
      matchDiv.style.backgroundColor = bgColor;
      matchDiv.style.boxShadow = glow;
  
      matchDiv.innerHTML = `
        <h4>${job.title}</h4>
        <p><strong>Company:</strong> ${job.company || 'N/A'}</p>
        <p><strong>📍 Location:</strong> ${job.location}</p>
        <p><strong>💰 Stipend:</strong> ${job.stipend}</p>
        <p><strong>📊 ATS Match:</strong> <span class="${atsClass}">${job.ats}%</span></p>
        <p><strong>🔗 <a href="${job.link}" target="_blank">View Internship</a></strong></p>
        <p><strong>🚀 <a href="${job.apply}" target="_blank">Apply Now</a></strong></p>
        <button class="track-btn" data-title="${job.title}" data-company="${job.company}" data-link="${job.link}" data-ats="${job.ats}">📌 Track</button>
      `;
  
      internshipResults.appendChild(matchDiv);
  
      // 🔻 Add event listener for the "Track" button here:
      const trackBtn = matchDiv.querySelector(".track-btn");
      trackBtn.addEventListener("click", async function () {
        const internshipData = {
          title: this.dataset.title,
          company: this.dataset.company,
          link: this.dataset.link,
          ats: this.dataset.ats,
          userId: localStorage.getItem("userId") || ""
        };
  
        try {
          const response = await fetch("https://resumate-production-a93f.up.railway.app/api/track-internship", {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify(internshipData)
          });
  
          if (response.ok) {
            alert("✅ Internship tracked successfully!");
          } else {
            const errData = await response.json();
            alert(`❌ Failed to track internship: ${errData.message}`);
          }
        } catch (err) {
          console.error("Tracking Error:", err);
          alert("❌ Could not track the internship. Try again.");
        }
      });
    });
  }

  // --- Populate Location Filter Options ---
  function populateLocationFilter() {
    locationFilter.innerHTML = '<option value="">All Locations</option>'; // Reset options
    const uniqueLocations = new Set();
    allInternships.forEach(job => {
      if (job.location) {
        uniqueLocations.add(job.location);
      }
    });
    // Sort locations alphabetically
    const sortedLocations = Array.from(uniqueLocations).sort();
    sortedLocations.forEach(location => {
      const option = document.createElement('option');
      option.value = location;
      option.textContent = location;
      locationFilter.appendChild(option);
    });
  }

  // --- Filter and Reset Functionality ---
  applyFiltersBtn.addEventListener('click', applyFilters);
  resetFiltersBtn.addEventListener('click', resetFilters);

  function applyFilters() {
    const locationValue = locationFilter.value; // Value from <select>
    const minStipend = parseInt(minStipendInput.value) || 0;
    const minATS = parseInt(minAtsInput.value) || 0;

    const filteredInternships = allInternships.filter(job => {
      const jobLocation = job.location ? job.location.toLowerCase() : ''; // Handle undefined location
      // Robustly parse stipend, handling currency symbols and commas
      const jobStipendMatch = job.stipend ? job.stipend.match(/[\d,]+/) : null;
      const jobStipend = jobStipendMatch ? parseInt(jobStipendMatch[0].replace(/,/g, '')) : 0;

      const jobATS = job.ats !== 'N/A' ? parseInt(job.ats) : 0;

      // Corrected: Use exact match for dropdown value
      const matchLocation = !locationValue || jobLocation === locationValue.toLowerCase();
      const matchStipend = jobStipend >= minStipend;
      const matchATS = jobATS >= minATS;

      // Console logs for debugging filters
      console.log(`Filtering: ${job.title}`);
      console.log(`  Location: ${jobLocation} (matches "${locationValue}")? ${matchLocation}`);
      console.log(`  Stipend: ${jobStipend} (>= ${minStipend})? ${matchStipend}`);
      console.log(`  ATS: ${jobATS} (>= ${minATS})? ${matchATS}`);
      console.log(`  Overall match: ${matchLocation && matchStipend && matchATS}`);

      return matchLocation && matchStipend && matchATS;
    });

    renderInternships(filteredInternships);
  }

  function resetFilters() {
    locationFilter.value = '';
    minStipendInput.value = '';
    minAtsInput.value = '';
    renderInternships(allInternships); // Re-render all original internships
    populateLocationFilter(); // Re-populate to ensure "All Locations" is back to default
  }

});