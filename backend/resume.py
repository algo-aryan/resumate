import os
import sys
import json
from dotenv import load_dotenv
import google.generativeai as genai
# Import specific exception for API errors, including quota
from google.api_core.exceptions import ResourceExhausted, GoogleAPIError

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
        # Log full response for debugging purposes to stderr
        print("✅ Gemini API Response:", response.text, file=sys.stderr)
        
        # Extract and return the first 3 non-empty lines as summary
        return [line.strip() for line in response.text.split('\n') if line.strip()][:3]
        
    except ResourceExhausted as e:
        # Specifically catch quota exhaustion error
        error_payload = {"error": "Gemini_Quota_Exhausted", "message": f"Gemini API quota exceeded: {e}"}
        print(json.dumps(error_payload)) # Print to stdout for Node.js to capture
        sys.exit(1) # Exit with an error code
    except GoogleAPIError as e:
        # Catch other Google API specific errors
        error_payload = {"error": "Gemini_API_Error", "message": f"Gemini API error: {e}"}
        print(json.dumps(error_payload))
        sys.exit(1)
    except Exception as e:
        # Catch any other unexpected errors during generation
        error_payload = {"error": "Summary_Generation_Failed", "message": f"An unexpected error occurred: {e}"}
        print(json.dumps(error_payload)) # Print to stdout for Node.js to capture
        sys.exit(1) # Exit with an error code

if __name__ == "__main__":
    try:
        raw = sys.stdin.read()
        resume_data = json.loads(raw)
        
        # Call the function, it will handle errors and exit if necessary
        summary = query_llm_with_all_info(
            resume_data.get("name", ""),
            resume_data.get("goal", ""),
            resume_data.get("skills", []),
            resume_data.get("education", []),
            resume_data.get("experience", []),
            resume_data.get("projects", [])
        )
        
        # If the script reaches this point, it means summary generation was successful
        print(json.dumps(summary))
        
    except json.JSONDecodeError as e:
        # Handle cases where stdin is not valid JSON
        error_payload = {"error": "Invalid_Input", "message": f"Failed to parse input JSON: {e}"}
        print(json.dumps(error_payload))
        sys.exit(1)
    except Exception as e:
        # Catch any other unhandled exceptions in the main block
        error_payload = {"error": "Python_Script_Error", "message": f"An unhandled error in script: {e}"}
        print(json.dumps(error_payload))
        sys.exit(1)