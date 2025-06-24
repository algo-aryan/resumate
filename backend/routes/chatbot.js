// routes/chatbot.js
import express from 'express';
import axios from 'axios';

const router = express.Router();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';

router.post('/chatbot', async (req, res) => {
  const userPrompt = req.body.prompt;

  const requestData = {
    contents: [
      {
        parts: [{ text: userPrompt }]
      }
    ]
  };

  try {
    const response = await axios.post(
      `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`,
      requestData
    );

    const reply = response.data.candidates[0].content.parts[0].text;
    return res.json({ reply });

  } catch (error) {
    console.error('Gemini API error:', error.response?.data || error.message);

    // Graceful fallback
    const fallbackMessage = `⚠️ Our AI assistant is currently unavailable due to high usage. 
Please try again later. Meanwhile, you can still explore resume analysis and internship features.`;

    return res.status(200).json({ reply: fallbackMessage });
  }
});

export default router;