# ats_matcher.py
import os
import PyPDF2 as pdf
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()
genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))
model = genai.GenerativeModel('gemini-pro')

def score_resume_against_jd(resume_text, jd_text):
    prompt = f"""
    Resume: {resume_text}
    Job Description: {jd_text}

    I want the only response in 4 sectors as follows:
    • Job Description Match: \n\n
    • Missing Keywords: \n\n
    • Profile Summary: \n\n
    • Personalized suggestions for skils, keywords and acheivements that can enhance the provided resume: \n\n
    • Application Success rates : \n\n
    """

    response = model.generate_content(prompt)
    return response.text