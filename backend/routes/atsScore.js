import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import pdfjsLib from 'pdfjs-dist/legacy/build/pdf.js';
const { GlobalWorkerOptions } = pdfjsLib;
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';

const router = express.Router();
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ Add this exact line
GlobalWorkerOptions.standardFontDataUrl = path.resolve(
    __dirname,
    '../../node_modules/pdfjs-dist/standard_fonts/'
  );


const upload = multer({ dest: 'backend/uploads/' });

// ✅ Text extraction function
async function extractTextFromPDF(pdfPath) {
  const data = new Uint8Array(fs.readFileSync(pdfPath));
  const pdf = await pdfjsLib.getDocument({ data }).promise;

  let fullText = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const strings = content.items.map(item => item.str);
    fullText += strings.join(' ') + '\n';
  }

  return fullText.trim();
}

// ✅ Gemini ATS evaluation function
async function getATSScore(resumeText) {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: 'models/gemini-1.5-flash' });

  const prompt = `
You are an ATS bot. Given a resume, provide:
1. A numeric ATS score (0–100)
2. A brief summary
3. A list of strengths
4. A list of suggestions for improvement

Return response strictly in JSON format like this:

{
  "score": 85,
  "summary": "Brief summary of the candidate...",
  "strengths": ["Point 1", "Point 2"],
  "suggestions": ["Point 1", "Point 2"]
}

Resume:
"""${resumeText.slice(0, 12000)}"""
`;

  const result = await model.generateContent(prompt);
  return result.response.text();
}

// ✅ Main ATS score route
router.post('/ats-score', upload.single('resume'), async (req, res) => {
  try {
    const resumePath = req.file.path;
    console.log("📥 Received ATS score request");
    console.log("📄 Uploaded file path:", resumePath);

    const resumeText = await extractTextFromPDF(resumePath);

    const geminiResponse = await getATSScore(resumeText);
    console.log("🔍 Gemini raw response:\n", geminiResponse); 

    // Try to extract JSON block safely even if Gemini adds markdown
    const match = geminiResponse.match(/```json([\s\S]*?)```/);
    const rawJSON = match ? match[1].trim() : geminiResponse;

    try {
      const parsed = JSON.parse(rawJSON);
      fs.unlinkSync(resumePath); // Clean up

      return res.status(200).json({
        score: parsed.score || 0,
        summary: parsed.summary || 'No summary.',
        strengths: parsed.strengths || [],
        suggestions: parsed.suggestions || [],
        raw: geminiResponse // for debugging
      });
    } catch (jsonErr) {
      console.warn("⚠️ Could not parse JSON response from Gemini.");
      fs.unlinkSync(resumePath);
      return res.status(200).json({
        score: 60,
        summary: "Basic resume",
        strengths: [],
        suggestions: [],
        raw: geminiResponse
      });
    }

  } catch (err) {
    console.error("❌ ATS error:", err);
    return res.status(500).json({
      error: "Resume processing failed",
      reason: err.message
    });
  }
});

export default router;