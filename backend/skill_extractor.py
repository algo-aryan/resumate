import requests
from bs4 import BeautifulSoup
import fitz  # PyMuPDF
import spacy
import nltk
from nltk.corpus import stopwords
import re
import csv
import datetime
import os
import sys
from dotenv import load_dotenv
import google.generativeai as genai
import time
import json
# Import specific error types from google.api_core.exceptions
# These are the exceptions raised by the google-generativeai client library
from google.api_core.exceptions import ResourceExhausted, GoogleAPIError, Aborted

# ✅ Load environment and configure Gemini
load_dotenv()
genai.configure(
    api_key=os.getenv("GOOGLE_API_KEY")
)

# ✅ Ensure NLTK stopwords are available
nltk.data.path.append(os.path.join(os.path.dirname(__file__), "nltk_data"))
try:
    stop_words = set(stopwords.words('english'))
except LookupError:
    nltk.download('stopwords')
    stop_words = set(stopwords.words('english'))

nlp = spacy.load("en_core_web_sm")

top_n = 10
# ... (SKILL_KEYWORDS unchanged – keep your full list here)
SKILL_KEYWORDS = [
    # 🧠 Broad Skill Domains / Roles
    "frontend developer", "backend developer", "fullstack developer", "data scientist",
    "data analyst", "machine learning", "deep learning", "artificial intelligence",
    "ai engineer", "nlp", "computer vision", "data science", "mle", "dl", "ai", "ml",
    "devops", "mobile developer", "web3 developer", "game developer", "cloud engineer",
    "qa engineer", "automation tester", "security analyst", "c++", "python", "html", "css",

    # 🌐 Frontend Frameworks & Tools
    "react.js", "vue.js", "next.js", "svelte", "tailwind css", "bootstrap", "chakra ui",
    "material ui", "vite", "framer motion", "styled components", "gsap",

    # 🔧 Backend Frameworks & Tools
    "express.js", "nestjs", "hapi.js", "adonisjs", "laravel", "symfony", "fastapi",
    "asp.net core", "rails", "gin gonic", "actix", "spring boot", "fiber",

    # 🤖 Machine Learning / AI
    "scikit-learn", "xgboost", "lightgbm", "catboost", "pytorch", "tensorflow",
    "keras", "onnx", "mlflow", "huggingface transformers", "openvino", "deepspeed",
    "fastai", "auto-sklearn", "tpot", "wandb", "optuna",

    # 💬 NLP Tools & Libraries
    "nltk", "spacy", "textblob", "gensim", "polyglot", "stanford nlp", "flair nlp",
    "huggingface", "transformers", "bert", "roberta", "gpt", "sentence-transformers",

    # 📊 Data Science & Analytics
    "power bi", "tableau", "looker", "superset", "metabase", "seaborn", "matplotlib",
    "plotly", "bokeh", "pandas profiling", "sweetviz", "datapane", "dvc",

    # 🗃️ Databases & Storage
    "mongodb", "postgresql", "redis", "neo4j", "dynamodb", "elastic search", "supabase",
    "influxdb", "cassandra", "firebase firestore", "clickhouse", "tidb",

    # ☁️ DevOps / Cloud
    "docker", "kubernetes", "ansible", "terraform", "jenkins", "prometheus", "grafana",
    "pagerduty", "argocd", "helm", "azure pipelines", "aws lambda", "gcp cloud run",
    "cloudflare", "netlify", "vercel",

    # 🔐 Cybersecurity
    "owasp zap", "burp suite", "metasploit", "nmap", "wireshark", "snort", "splunk", 
    "suricata", "hashicorp vault", "fail2ban", "crowdstrike",

    # 📱 Mobile App Development
    "flutter", "react native", "ionic", "xamarin", "kivy", "jetpack compose",
    "nativebase", "codemagic",

    # 🎮 Game Development / Graphics
    "unity", "unreal engine", "godot", "three.js", "babylon.js", "blender",
    "panda3d", "playcanvas",

    # 🌍 Web3 / Blockchain
    "solidity", "ethers.js", "web3.js", "hardhat", "truffle", "alchemy", "moralis",
    "polygon", "chainlink", "ipfs", "pinata", "foundry",

    # 🧪 Testing / QA
    "cypress", "playwright", "jest", "mocha", "chai", "postman", "newman", "selenium",
    "testcafe", "allure", "jmeter",

    # 🧠 Specialized AI Use Cases
    "ocr", "image segmentation", "object detection", "face recognition",
    "pose estimation", "edge ai", "tinyml", "autonomous agents", "rasa", "langchain"
]

def extract_text_from_pdf(pdf_path):
    doc = fitz.open(pdf_path)
    return "".join([page.get_text() for page in doc])

def extract_skills(text):
    text_lower = text.lower()
    found_skills = set()
    doc = nlp(text_lower)
    clean_tokens = [token.text for token in doc if token.text not in stop_words and not token.is_punct]
    text_clean = " ".join(clean_tokens)
    for skill in sorted(SKILL_KEYWORDS, key=len, reverse=True):
        pattern = r'\b' + re.escape(skill) + r'\b'
        if re.search(pattern, text_clean):
            found_skills.add(skill)
            text_clean = re.sub(pattern, '', text_clean)
    return list(found_skills)

def get_ats_score(resume_text, job_description):
    retries = 5
    base_delay = 5
    model_name = "gemini-1.5-flash"

    for attempt in range(retries):
        try:
            prompt = f"""
You are an ATS. Rate the resume for the job from 0–100. Return only a number.

Resume: {resume_text[:3000]}
Job Description: {job_description[:3000]}
"""
            model = genai.GenerativeModel("gemini-1.5-flash")
            response = model.generate_content(prompt)
            
            score_match = re.findall(r'\d+', response.text)
            if score_match:
                score = int(score_match[0])
            else:
                score = 0
            return score

        except (ResourceExhausted, Aborted) as e: # Catch specific quota errors
            error_message = str(e)
            sys.stderr.write(f"❌ Gemini scoring error (Attempt {attempt+1}/{retries}): {error_message}\n")

            if "429 You exceeded your current quota" in error_message or isinstance(e, ResourceExhausted):
                match = re.search(r"retry_delay {\s+seconds: (\d+)", error_message)
                if match:
                    delay = int(match.group(1))
                else:
                    delay = base_delay * (2 ** attempt)

                sys.stderr.write(f"Retrying in {delay} seconds due to quota limit...\n")
                time.sleep(delay)
            else: # Other GoogleAPIError types might not be retriable for this function
                sys.stderr.write(f"Non-quota related ResourceExhausted/Aborted error encountered, stopping retries: {error_message}\n")
                raise # Re-raise if not a quota error or something we handle here
        except GoogleAPIError as e: # Catch other general API errors
            sys.stderr.write(f"Non-quota related GoogleAPIError encountered, stopping retries: {str(e)}\n")
            raise # Re-raise other API errors
        except Exception as e:
            sys.stderr.write(f"❌ Unexpected error in get_ats_score (Attempt {attempt+1}/{retries}): {str(e)}\n")
            raise # Re-raise other unexpected errors

    # If loop finishes without returning, it means retries were exhausted
    # Due to quota or other unhandled errors that were re-raised.
    sys.stderr.write(f"❌ Gemini scoring failed after {retries} attempts due to persistent quota limits or other errors.\n")
    raise ResourceExhausted("Gemini API quota exceeded after multiple retries.")


def check_eligible(link):
    headers = {"User-Agent": "Mozilla/5.0"}
    try:
        response = requests.get(link, headers=headers)
        soup = BeautifulSoup(response.text, "html.parser")
        button = soup.find('button', class_='btn btn-primary top_apply_now_cta')
        if not button: return False
        text = button.get_text(strip=True).lower()
        return "apply now" in text and "login" not in text and "eligible" not in text
    except Exception as e:
        sys.stderr.write(f"Error checking {link}: {e}\n")
        return False

def parse_stipend(stipend_str):
    numbers = [int(n.replace(",", "")) for n in re.findall(r'\d{1,3}(?:,\d{3})*', stipend_str)]
    return max(numbers) if numbers else 0

def convert_link(link):
    return link.replace("/internship/detail/", "/application/form/")

def scrape_internshala(skills, resume_text, num_to_score=10, initial_scrape_limit=50):
    skills_slug = ",".join(skills).replace(" ", "-").lower()
    url = f"https://internshala.com/internships/{skills_slug}-internship"
    headers = {"User-Agent": "Mozilla/5.0"}
    
    eligible_internships_for_scoring = []

    try:
        response = requests.get(url, headers=headers)
        soup = BeautifulSoup(response.text, "html.parser")
        log_to_csv("Scraping Started", f"URL: {url}")

        processed_divs_count = 0 # Track how many divs we've processed
        for div in soup.find_all("div", class_="individual_internship"):
            if processed_divs_count >= initial_scrape_limit:
                break # Stop processing divs if we hit the limit
            processed_divs_count += 1

            try:
                title_tag = div.find("a", class_="job-title-href")
                title = title_tag.text.strip()
                link = "https://internshala.com" + title_tag["href"]
                company = div.find("p", class_="company-name").text.strip()
                location = div.find("div", class_="locations").text.strip()
                stipend = div.find("span", class_="stipend").text.strip()

                if check_eligible(link):
                    eligible_internships_for_scoring.append({
                        "title": title,
                        "company": company,
                        "location": location,
                        "stipend": stipend,
                        "link": link,
                        "ats_score": None
                    })
                    # Break if we have enough eligible internships to score
                    if len(eligible_internships_for_scoring) >= num_to_score:
                        break
                else:
                    log_to_csv("Internship Skipped (Not Eligible)", f"{title} - {link}")

            except Exception as e:
                log_to_csv("Parse Error for Individual Internship", str(e))
                sys.stderr.write(f"Parse Error for Individual Internship: {e}\n")
                continue

    except Exception as e:
        log_to_csv("Scraping Failed for Internshala URL", str(e))
        sys.stderr.write(f"Scraping Failed for Internshala URL: {e}\n")
        return []

    final_scored_internships = []
    sys.stderr.write(f"\n--- Fetching Job Descriptions and ATS Scores for Top {min(len(eligible_internships_for_scoring), num_to_score)} Internships ---\n")

    for i, job_data in enumerate(eligible_internships_for_scoring[:num_to_score]):
        try:
            sys.stderr.write(f"Processing ATS for: {job_data['title']} at {job_data['company']} ({i+1}/{min(len(eligible_internships_for_scoring), num_to_score)})\n")
            
            job_resp = requests.get(job_data["link"], headers=headers)
            job_soup = BeautifulSoup(job_resp.text, "html.parser")
            jd_div = job_soup.find("div", class_="internship_details")
            job_desc = jd_div.get_text(strip=True) if jd_div else ""

            ats_score = get_ats_score(resume_text, job_desc) # This can now raise exceptions
            
            job_data["ats_score"] = ats_score
            final_scored_internships.append(job_data)
            log_to_csv("ATS Scored", f"{job_data['title']} - ATS: {ats_score}")

        except (ResourceExhausted, GoogleAPIError, Aborted) as e:
            # If a Gemini error occurred during scoring, re-raise it
            # The main block will catch it and format the output for Node.js
            log_to_csv("ATS Scoring Error (Gemini API)", f"Error for {job_data['title']}: {str(e)}")
            raise # Re-raise so the main block catches it
        except Exception as e:
            log_to_csv("ATS Scoring Error (Other)", f"Error for {job_data['title']}: {str(e)}")
            sys.stderr.write(f"ATS Scoring Error (Other) for {job_data['title']}: {str(e)}\n")
            job_data["ats_score"] = 0
            final_scored_internships.append(job_data)
            continue # Continue to next job if non-Gemini error

    def get_ats_value(ats):
        if ats is None:
            return 0.0
        if isinstance(ats, (int, float)):
            return float(ats)
        try:
            return float(str(ats).replace('%', '').strip()) # Ensure it's a string before replace
        except:
            return 0.0

    def get_stipend_value(stipend_str):
        if not stipend_str or "Unpaid" in stipend_str:
            return 0
        try:
            numbers = re.findall(r'[\d,]+', stipend_str)
            if not numbers:
                return 0
            return max([int(num.replace(',', '')) for num in numbers])
        except:
            return 0

    sorted_by_ats_then_stipend = sorted(
        final_scored_internships,
        key=lambda x: (
            get_ats_value(x.get('ats_score')), # Use .get for safety
            get_stipend_value(x.get('stipend', '')) # Use .get for safety
        ),
        reverse=True
    )
    
    return sorted_by_ats_then_stipend

def save_links_to_txt(internships, filenames=["internship_links.txt", "internship_links_apply.txt"]):
    with open(filenames[0], "w") as f:
        for job in internships:
            f.write(job["link"] + "\n")
    with open(filenames[1], "w") as f:
        for job in internships:
            f.write(convert_link(job["link"]) + "\n")

def log_to_csv(event, details="", file_path="debug_log.csv"):
    timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    file_exists = os.path.isfile(file_path)
    with open(file_path, mode="a", newline="") as file:
        writer = csv.writer(file)
        if not file_exists:
            writer.writerow(["Timestamp", "Event", "Details"])
        writer.writerow([timestamp, event, details])

def details_to_csv(lod, filename="Details_csv.csv"):
    with open(filename, "w", newline="") as f:
        fieldnames = []
        if lod: # Only try to get keys if lod is not empty
            for item in lod:
                for key in item.keys():
                    if key not in fieldnames:
                        fieldnames.append(key)
        
        if fieldnames: # Only write header if there are fieldnames
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(lod)
        else:
            sys.stderr.write("Warning: No data to write to CSV.\n")

# --- Main execution block ---
if __name__ == "__main__":
    try:
        if len(sys.argv) < 2:
            sys.stderr.write("Usage: python skill_extractor.py <path_to_your_resume.pdf>\n")
            sys.exit(1)

        pdf_path = sys.argv[1]

        text = extract_text_from_pdf(pdf_path)
        skills = extract_skills(text)
        sys.stderr.write(f"Extracted Skills: {skills}\n")

        # Pass top_n for ATS scoring limit and initial scrape limit
        results = scrape_internshala(skills, text, num_to_score=top_n, initial_scrape_limit=50) 
        
        results_sorted = results 

        final_output = []
        for i, job in enumerate(results_sorted[:top_n], 1):
            job_apply_link = convert_link(job["link"])
            job["apply_link"] = job_apply_link # Add to job dict for CSV/JSON consistency

            final_output.append({
                "title": job['title'],
                "company": job['company'],
                "location": job["location"],
                "stipend": job["stipend"],
                "link": job["link"],
                "apply": job_apply_link,
                "ats": job.get('ats_score', 'N/A')
            })

        save_links_to_txt(results_sorted[:top_n])
        details_to_csv(results_sorted[:top_n])

        # ✅ Output as JSON to stdout (used by Node server)
        # This must be the ONLY thing printed to stdout.
        sys.stdout.write(json.dumps({ "internships": final_output }))
        
    except (ResourceExhausted, GoogleAPIError) as e:
        # Catch specific Gemini API errors and output as structured JSON for Node.js
        error_type = "Gemini_Quota_Exhausted" if isinstance(e, ResourceExhausted) else "Gemini_API_Error"
        error_message = str(e)
        error_payload = {"error": error_type, "message": error_message}
        sys.stdout.write(json.dumps(error_payload))
        sys.exit(1) # Exit with an error code
    except Exception as e:
        # Catch any other unexpected errors in the main execution block
        error_payload = {"error": "Script_Execution_Failed", "message": str(e)}
        sys.stdout.write(json.dumps(error_payload))
        sys.exit(1) # Exit with an error code