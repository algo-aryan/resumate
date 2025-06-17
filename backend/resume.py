import os
import sys
import json
from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")
genai.configure(api_key=api_key)

def query_llm_with_all_info(name, goal, skills, education, experience, projects):
    prompt = f"""You are a resume writing assistant.
Write a professional, first-person resume summary in 3 crisp lines. Use "I" instead of third-person names.
Keep the tone confident but authentic — suitable for job applications.

Here are the details:
Name: {name}
Career Goal: {goal}
Skills: {', '.join(skills)}
Education: {', '.join([f"{e['degree']} from {e['institution']} in {e['year']}" for e in education])}
Experience: {', '.join([f"{e['role']} at {e['company']} ({e['year']}) - {e['description']}" for e in experience])}
Projects: {', '.join([f"{p['title']} - {p['description']}" for p in projects])}

Start directly with the summary. Do not repeat the inputs.
"""

    try:
        model = genai.GenerativeModel("models/gemini-1.5-flash-latest")
        response = model.generate_content(prompt)
        return [line.strip() for line in response.text.split('\n') if line.strip()][:3]
    except Exception as e:
        print("⚠️ Gemini generation failed:", e, file=sys.stderr)
        return []

if __name__ == "__main__":
    # 🔽 Minimal addition: read from stdin and return summary as JSON
    try:
        raw = sys.stdin.read()
        resume_data = json.loads(raw)
        summary = query_llm_with_all_info(
            resume_data.get("name", ""),
            resume_data.get("goal", ""),
            resume_data.get("skills", []),
            resume_data.get("education", []),
            resume_data.get("experience", []),
            resume_data.get("projects", [])
        )
        print(json.dumps(summary))
    except Exception as e:
        print("[]")  # Return empty list on failure