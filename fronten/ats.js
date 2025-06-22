document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('resume-form');
    const fileInput = document.getElementById('resume');
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
  
      const formData = new FormData();
      formData.append('resume', file);
  
      try {
        const res = await fetch('https://resumate-production-a93f.up.railway.app/api/ats-score', {
          method: 'POST',
          body: formData
        });
  
        const data = await res.json();
  
        if (data.error) {
          alert('❌ ' + (data.reason || data.error));
          return;
        }
  
        scoreEl.textContent = data.score ?? 'N/A';
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
          console.warn('⚠️ Gemini JSON parsing failed:', err);
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
  
        resultContainer.classList.remove('d-none');
      } catch (err) {
        console.error('❌ Frontend Error:', err);
        alert('Something went wrong while scoring the resume.');
      }
    });
  });