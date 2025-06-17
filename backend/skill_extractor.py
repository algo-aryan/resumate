# skill_extractor.py
import requests
from bs4 import BeautifulSoup

import fitz  # PyMuPDF
import spacy
import nltk
from nltk.corpus import stopwords
import re

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.common.exceptions import NoSuchElementException

import csv
import datetime
import os

import sys
pdf_path = sys.argv[1]
####################################################################################
#THE PATH TO YOUR RESUME
##############################################################################
#how many to choose ( sorted descending in stipend)
top_n=10
##############################################################################


# Load English NLP model
nlp = spacy.load("en_core_web_sm")

# Load stopwords
stop_words = set(stopwords.words('english'))

# Sample skill keywords (you can expand this list or use a skill dataset)
SKILL_KEYWORDS = [
    # 🧠 Broad Skill Domains / Roles
    "frontend developer", "backend developer", "fullstack developer", "data scientist",
    "data analyst", "machine learning", "deep learning", "artificial intelligence",
    "ai engineer", "nlp", "computer vision", "data science", "mle", "dl", "ai", "ml",
    "devops", "mobile developer", "web3 developer", "game developer", "cloud engineer",
    "qa engineer", "automation tester", "security analyst",

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
    text = ""
    for page in doc:
        text += page.get_text()
    return text

def extract_skills(text):
    doc = nlp(text.lower())
    tokens = [token.text for token in doc if token.text not in stop_words and not token.is_punct]
    found_skills = set()

    for token in tokens:
        if token in SKILL_KEYWORDS:
            found_skills.add(token)
    
    # Also match multi-word skills
    for skill in SKILL_KEYWORDS:
        if skill in text.lower():
            found_skills.add(skill)

    return list(found_skills)


    skills_slug = ",".join(skills).replace(" ", "-").lower()
    url = f"https://internshala.com/internships/{skills_slug}-internship"
    headers = {"User-Agent": "Mozilla/5.0"}

    response = requests.get(url, headers=headers)
    soup = BeautifulSoup(response.text, "html.parser")
    internships = []

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
                "link": link
            })
        except:
            continue

    return internships

def check_eligible(link):
    headers = {"User-Agent": "Mozilla/5.0"}
    try:
        response = requests.get(link, headers=headers)
        soup = BeautifulSoup(response.text, "html.parser")
        button = soup.find('button', class_='btn btn-primary top_apply_now_cta')

        if not button:
            return False

        # Check if the button text contains "Apply Now" (and not "Login to apply" or "Not eligible")
        button_text = button.get_text(strip=True).lower()
        if "apply now" in button_text and "login" not in button_text and "eligible" not in button_text:
            return True
        return False

    except Exception as e:
        print(f"Error checking {link}: {e}")
        return False


def parse_stipend(stipend_str):
    """Extract highest numeric stipend from a string like '₹ 10,000 - 15,000 /month'"""
    numbers = [int(n.replace(",", "")) for n in re.findall(r'\d{1,3}(?:,\d{3})*', stipend_str)]
    return max(numbers) if numbers else 0

def convert_link(link):
    link=link.replace("/internship/detail/","/application/form/")
    return link

def scrape_internshala(skills):
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
                
                eligible=check_eligible(link)
                if eligible:
                 
                    internships.append({
                        "title": title,
                        "company": company,
                        "location": location,
                        "stipend": stipend,
                        "link": link
                    })

                    log_to_csv("Internship Found", f"{title} at {company}")

            except Exception as e:
                log_to_csv("Parse Error", str(e))
                continue

    except Exception as e:
        log_to_csv("Scraping Failed", str(e))

    return internships

def save_links_to_txt(internships, filename=["internship_links.txt","intenrnship_links_apply.txt"]):
    with open(filename[0], "w") as f:
        for job in internships:
            f.write(job["link"] + "\n")
    with open(filename[1], "w") as f:
        for job in internships:
            f.write(convert_link(job['link']) + "\n")



def log_to_csv(event, details="", file_path="debug_log.csv"):
    """Append a log entry with timestamp, event type, and details to a CSV file."""
    timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    file_exists = os.path.isfile(file_path)

    with open(file_path, mode="a", newline="") as file:
        writer = csv.writer(file)
        if not file_exists:
            writer.writerow(["Timestamp", "Event", "Details"])  # Write header once
        writer.writerow([timestamp, event, details])

def details_to_csv(lod,filename="Details_csv"):
    with open(filename,"w") as f:
        writer = csv.DictWriter(f, fieldnames=lod[0].keys())
        writer.writerows(lod)


text = extract_text_from_pdf(pdf_path)
skills = extract_skills(text)
# Extracted Skills
print("Extracted Skills:", skills)

# Scrape and sort by stipend
results = scrape_internshala(skills)
results_sorted = sorted(results, key=lambda x: parse_stipend(x["stipend"]), reverse=True)

# Display top 10 highest paying internships

for i, job in enumerate(results_sorted[:top_n], 1):
    print(f"{i}. {job['title']} at {job['company']}")
    print(f"   Location: {job['location']}")
    print(f"   Stipend: {job['stipend']}")
    print(f"   Link: {job['link']}\n")
    print(f"   Apply here:{convert_link(job['link'])}")

# Save only top 10 links
save_links_to_txt(results_sorted[:top_n])
# Add "apply_link" field to each job in the top_n list
for job in results_sorted[:top_n]:
    job["apply_link"] = convert_link(job["link"])

# Save to details.csv
details_to_csv(results_sorted[:top_n])