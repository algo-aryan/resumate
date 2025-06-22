import express from "express";
import multer from "multer";
import fs from "fs";
import { readFile } from "fs/promises";
import { GoogleGenerativeAI } from "@google/generative-ai";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.js";

const router = express.Router();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Create uploads folder if not exists
const storage = multer.diskStorage({
  destination: (_, __, cb) => {
    const dir = "./backend/uploads";
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
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
    if (!req.file) {
      return res.status(400).json({ error: "No resume uploaded" });
    }

    const filePath = req.file.path;
    console.log("📄 Uploaded file:", filePath);

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

    // Delete the uploaded file after processing
    fs.unlinkSync(filePath);

    try {
      const parsed = JSON.parse(responseText);
      return res.json(parsed);
    } catch (err) {
      console.warn("⚠️ Failed to parse Gemini response as JSON.");
      return res.json({
        score: 60,
        summary: "Basic resume",
        raw: responseText
      });
    }
  } catch (err) {
    console.error("❌ ATS error:", err);
    return res.status(500).json({ error: "Resume processing failed" });
  }
});

export default router;