import express from "express";
import multer from "multer";
import fs from "fs";
import { readFile } from "fs/promises";
import { GoogleGenerativeAI } from "@google/generative-ai";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.js";

const router = express.Router();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const storage = multer.diskStorage({
  destination: (_, __, cb) => {
    const dir = "./backend/uploads";
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);
    cb(null, dir);
  },
  filename: (_, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});
const upload = multer({ storage });

async function extractTextFromPDF(filePath) {
  const data = new Uint8Array(await readFile(filePath));
  const pdf = await pdfjsLib.getDocument({ data }).promise;

  let fullText = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const strings = content.items.map(item => item.str).join(" ");
    fullText += strings + "\n";
  }

  return fullText;
}

router.post("/ats-score", upload.single("resume"), async (req, res) => {
  try {
    const filePath = req.file.path;
    const resumeText = await extractTextFromPDF(filePath);

    const prompt = `
You are an AI-powered ATS resume evaluator. Analyze the following resume and give:
- score (0-100)
- summary (1-line)
- strengths (list)
- suggestions (list)

Respond in JSON format.

Resume:
"""${resumeText}"""
`;

    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    fs.unlinkSync(filePath); // clean up uploaded file

    try {
      const parsed = JSON.parse(responseText);
      res.json(parsed);
    } catch {
      res.json({ score: 60, summary: "Basic resume", raw: responseText });
    }
  } catch (err) {
    console.error("❌ ATS error:", err);
    res.status(500).json({ error: "Resume processing failed" });
  }
});

export default router;