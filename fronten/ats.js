document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('resume-form');
  const fileInput = document.getElementById('resume');
  const submitButton = document.querySelector('.btn.btn-primary'); // Get the submit button
  const resultContainer = document.getElementById('result-container');
  const scoreEl = document.getElementById('score');
  const summaryEl = document.getElementById('summary');
  const strengthsEl = document.getElementById('strengths');
  const suggestionsEl = document.getElementById('suggestions');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const file = fileInput.files[0];
    if (!file) {
      alert('Please select a resume file.');
      return;
    }

    // Show loading state
    submitButton.classList.add('loading');
    resultContainer.classList.add('d-none'); // Hide previous results if any

    const formData = new FormData();
    formData.append('resume', file);

    try {
      const res = await fetch('https://resumate-production-a93f.up.railway.app/api/ats-score', {
        method: 'POST',
        body: formData
      });

      // --- Start of minimal changes for error handling ---
      if (!res.ok) { // Check if response status is not in the 200-299 range
        const errorData = await res.json(); // Assuming error responses are JSON
        let errorMessage = 'Something went wrong while scoring the resume.'; // Default generic message

        if (res.status === 429) {
          errorMessage = '⚠️ AI assistant is currently unavailable due to quota limits. Please try again later.';
        } else {
          // Use the error message from the backend if available, otherwise fallback
          errorMessage = errorData.reason || errorData.error || errorMessage;
          errorMessage = '❌ ' + errorMessage; // Add the X for consistency
        }
        alert(errorMessage);
        console.error('❌ Backend Error for ATS score:', res.status, errorData);
        return; // Stop execution if there was an error
      }
      // --- End of minimal changes for error handling ---

      const data = await res.json(); // Parse JSON for successful responses

      // --- Corrected Line for Score Display ---
      let scoreValue = 'N/A';
      if (typeof data.score === 'number') { // Check if it's a number
        scoreValue = data.score + '%';
      } else if (typeof data.score === 'string') { // Check if it's a string
        scoreValue = data.score.replace(/%/g, '') + '%'; // Use regex to remove all % instances
      }
      scoreEl.textContent = scoreValue;
      // --- End Corrected Line --- 
      summaryEl.textContent = data.summary ?? 'No summary.';

      let parsed = { strengths: [], suggestions: [] };

      try {
        if (data.raw && data.raw.includes('```json')) {
          const match = data.raw.match(/```json\s*([\s\S]*?)\s*```/);
          if (match && match[1]) parsed = JSON.parse(match[1]);
        } else if (data.raw) {
          parsed = JSON.parse(data.raw);
        }
      } catch (err) {
        console.warn('⚠️ Gemini JSON parsing failed (for ATS suggestions):', err);
        // Fallback or display a message if the raw output isn't parsable JSON
        strengthsEl.innerHTML = '<li class="list-group-item text-red-500">Could not parse strengths from AI response.</li>';
        suggestionsEl.innerHTML = '<li class="list-group-item text-red-500">Could not parse suggestions from AI response.</li>';
        resultContainer.classList.remove('d-none'); // Still show container even if partial data
        return; // Exit here as parsing failed
      }


      strengthsEl.innerHTML = '';
      (parsed.strengths || []).forEach(item => {
        const li = document.createElement('li');
        li.className = 'list-group-item';
        li.textContent = item;
        strengthsEl.appendChild(li);
      });

      suggestionsEl.innerHTML = '';
      (parsed.suggestions || []).forEach(item => {
        const li = document.createElement('li');
        li.className = 'list-group-item';
        li.textContent = item;
        suggestionsEl.appendChild(li);
      });

      resultContainer.classList.remove('d-none'); // Make results visible
    } catch (err) {
      console.error('❌ Frontend Error (Network/Unexpected):', err);
      // This catch block handles network errors or JSON parsing errors if res.ok was true
      alert('Something went wrong while scoring the resume. Please check your network connection.');
    } finally {
      // Always remove loading state, regardless of success or failure
      submitButton.classList.remove('loading');
    }
  });
});