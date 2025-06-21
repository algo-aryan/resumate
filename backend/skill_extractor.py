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

pdf_path = sys.argv[1]
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
    retries = 5  # Number of times to retry the API call
    base_delay = 5  # Initial delay in seconds before the first retry

    # Use 'gemini-1.5-flash' for higher free-tier limits and faster responses
    model_name = "gemini-1.5-flash" 

    for attempt in range(retries):
        try:
            prompt = f"""
You are an ATS. Rate the resume for the job from 0–100. Return only a number.

Resume: {resume_text[:3000]}
Job Description: {job_description[:3000]}
"""
            model = genai.GenerativeModel("gemini-1.5-flash")
            response = model.generate_content(prompt) # Send the actual prompt to Gemini

            print(f"📤 Gemini Prompt (Attempt {attempt+1}/{retries}):", prompt)
            print(f"📥 Gemini Response (Attempt {attempt+1}/{retries}):", response.text)

            score_match = re.findall(r'\d+', response.text)
            if score_match:
                score = int(score_match[0])
            else:
                score = 0
                print(f"⚠️ Warning: No numeric score found in Gemini response for attempt {attempt+1}.")
            return score # Return the score on success and exit the loop

        except Exception as e:
            error_message = str(e)
            print(f"❌ Gemini scoring error (Attempt {attempt+1}/{retries}):", error_message)

            if "429 You exceeded your current quota" in error_message:
                # Extract the recommended retry_delay from the error message if available
                match = re.search(r"retry_delay {\s+seconds: (\d+)", error_message)
                if match:
                    delay = int(match.group(1))
                else:
                    # Fallback to exponential backoff if no specific delay is provided
                    delay = base_delay * (2 ** attempt)

                print(f"Retrying in {delay} seconds due to quota limit...")
                time.sleep(delay)
            else:
                # For any other type of error (not quota-related), stop retrying
                print(f"Non-quota related error encountered, stopping retries: {error_message}")
                return 0 # Return 0 or re-raise the exception if it's a critical error

    print(f"❌ Gemini scoring failed after {retries} attempts due to persistent quota limits or other errors.")
    return 0 # Return 0 if all retries are exhausted and no score was obtained

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
        print(f"Error checking {link}: {e}")
        return False

def parse_stipend(stipend_str):
    numbers = [int(n.replace(",", "")) for n in re.findall(r'\d{1,3}(?:,\d{3})*', stipend_str)]
    return max(numbers) if numbers else 0

def convert_link(link):
    return link.replace("/internship/detail/", "/application/form/")

def scrape_internshala(skills, resume_text):
    import time

    skills_slug = ",".join(skills).replace(" ", "-").lower()
    url = f"https://internshala.com/internships/{skills_slug}-internship"
    headers = {"User-Agent": "Mozilla/5.0"}
    internships = []

    try:
        response = requests.get(url, headers=headers)
        soup = BeautifulSoup(response.text, "html.parser")
        log_to_csv("Scraping Started", f"URL: {url}")

        for div in soup.find_all("div", class_="individual_internship"):
            try:
                title_tag = div.find("a", class_="job-title-href")
                title = title_tag.text.strip()
                link = "https://internshala.com" + title_tag["href"]
                company = div.find("p", class_="company-name").text.strip()
                location = div.find("div", class_="locations").text.strip()
                stipend = div.find("span", class_="stipend").text.strip()

                internships.append({
                    "title": title,
                    "company": company,
                    "location": location,
                    "stipend": stipend,
                    "link": link,
                    "ats_score": None  # placeholder
                })

                if len(internships) >= 20:  # limit scraping to top 20 to stay efficient
                    break

            except Exception as e:
                log_to_csv("Parse Error", str(e))
                continue

    except Exception as e:
        log_to_csv("Scraping Failed", str(e))

    # ✅ Now score only top 10 eligible internships using Gemini
    scored_internships = []

    for job in internships[:10]:  # top 10 for Gemini
        try:
            if check_eligible(job["link"]):
                job_resp = requests.get(job["link"], headers=headers)
                job_soup = BeautifulSoup(job_resp.text, "html.parser")
                jd_div = job_soup.find("div", class_="internship_details")
                job_desc = jd_div.get_text(strip=True) if jd_div else ""

                ats_score = get_ats_score(resume_text, job_desc)
                time.sleep(1)  # avoid quota hit

                job["ats_score"] = ats_score
                log_to_csv("Gemini Scored", f"{job['title']} - ATS: {ats_score}")
                scored_internships.append(job)

        except Exception as e:
            log_to_csv("Gemini Error", str(e))
            continue

    # Helper functions for sorting
    def get_ats_value(ats):
        """Convert ATS score to float (handles percentages and missing values)"""
        if ats is None:
            return 0.0
        if isinstance(ats, (int, float)):
            return float(ats)
        try:
            # Remove % and convert to float
            return float(ats.replace('%', '').strip())
        except:
            return 0.0

    def get_stipend_value(stipend_str):
        """Convert stipend string to comparable integer"""
        if not stipend_str or "Unpaid" in stipend_str:
            return 0
        try:
            # Extract all numbers from stipend string
            numbers = re.findall(r'[\d,]+', stipend_str)
            if not numbers:
                return 0
            # Convert to integers and return highest value
            return max([int(num.replace(',', '')) for num in numbers])
        except:
            return 0

    # Sort by ATS (descending) then stipend (descending)
    scored_sorted = sorted(
        scored_internships,
        key=lambda x: (
            get_ats_value(x['ats_score']),
            get_stipend_value(x['stipend'])
        ),
        reverse=True
    )
    
    return scored_sorted

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

def details_to_csv(lod, filename="Details_csv"):
    with open(filename, "w") as f:
        writer = csv.DictWriter(f, fieldnames=lod[0].keys())
        writer.writeheader()
        writer.writerows(lod)

# Run
text = extract_text_from_pdf(pdf_path)
skills = extract_skills(text)
print("Extracted Skills:", skills)

results = scrape_internshala(skills, text)
results_sorted = sorted(results, key=lambda x: parse_stipend(x["stipend"]), reverse=True)

# Prepare structured response
final_output = []
for i, job in enumerate(results_sorted[:top_n], 1):
    final_output.append({
        "title": f"{i}. {job['title']} at {job['company']} [ATS Match: {job.get('ats_score', 'N/A')}%]",
        "location": job["location"],
        "stipend": job["stipend"],
        "link": job["link"],
        "apply": convert_link(job["link"]),
        "ats": job.get('ats_score', 'N/A')
    })

# Save for download (optional)
save_links_to_txt(results_sorted[:top_n])
for job in results_sorted[:top_n]:
    job["apply_link"] = convert_link(job["link"])
details_to_csv(results_sorted[:top_n])

# ✅ Output as JSON (used by Node server)
print(json.dumps({ "internships": final_output }))
details_to_csv(results_sorted[:top_n])