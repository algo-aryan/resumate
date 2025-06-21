import express from 'express';
import connectDB from './config/db.js';
import dotenv from 'dotenv';
import multer from 'multer';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import { exec } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { readFile } from 'fs/promises';
import puppeteer from 'puppeteer';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from './models/User.js'; // adjust the path if it's different

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors({ origin: '*', methods: ['GET', 'POST'] }));
app.use(express.json());

const upload = multer({ dest: 'uploads/' });

// ✅ Python resume extractor route
app.post('/api/upload', upload.single('resume'), (req, res) => {
  const uploadedPath = path.resolve(__dirname, req.file.path);
  const pythonPath = 'python3';
  const scriptPath = path.resolve(__dirname, 'skill_extractor.py');

  exec(`"${pythonPath}" "${scriptPath}" "${uploadedPath}"`, {
    env: {
      ...process.env,
      PATH: `${path.join(__dirname, 'venv/bin')}:${process.env.PATH}`,
      VIRTUAL_ENV: path.resolve(__dirname, 'venv')
    }
  }, (err, stdout, stderr) => {
    if (err) {
      console.error("❌ Python Error:", stderr);
      return res.status(500).json({ error: stderr });
    }

    const outputLines = stdout.split('\n').filter(l => l.trim() !== '' && !l.startsWith("Extracted Skills:"));
    const results = [];

    for (let i = 0; i < outputLines.length; i++) {
      if (/^\d+\./.test(outputLines[i])) {
        results.push({
          title: outputLines[i],
          location: outputLines[i + 1]?.split(': ')[1] || '',
          stipend: outputLines[i + 2]?.split(': ')[1] || '',
          link: outputLines[i + 3]?.split(': ')[1] || '',
          apply: outputLines[i + 4]?.split(': ')[1] || ''
        });
      }
    }

    return res.status(200).json({ raw_output: stdout });
  });
});

// ✅ Resume Builder Route (Gemini + modern.html)
function parseSection(raw, count) {
  return raw
    .split('\n')
    .filter(Boolean)
    .map(line => {
      const parts = line.split(',').map(p => p.trim());
      if (parts.length < count) return null;

      if (count === 3) return { degree: parts[0], institution: parts[1], year: parts[2] };
      if (count === 4) return { role: parts[0], company: parts[1], year: parts[2], description: parts[3] };
      if (count === 2) return { title: parts[0], description: parts[1] };
    })
    .filter(Boolean);
}
app.post('/api/generate-resume', async (req, res) => {
  try {
    const { name, email, phone, linkedin, goal, education, experience, projects, skills } = req.body;

    const skillList = skills.split(',').map(s => s.trim());

    const resumeData = {
      name,
      goal,
      skills: skillList,
      education,     // already structured
      experience,    // already structured
      projects       // already structured
    };

    const child = exec('python3 resume.py', { cwd: __dirname });
    child.stderr.on('data', (data) => {
      console.error(`🔴 resume.py stderr: ${data}`);
    });
    let summary = [];

    child.stdin.write(JSON.stringify(resumeData));
    child.stdin.end();

    let stdout = '';
    child.stdout.on('data', data => { stdout += data; });

    child.on('close', async () => {
      try {
        summary = JSON.parse(stdout);
      } catch (err) {
        summary = ["Summary generation failed."];
      }

      const template = await readFile(path.resolve(__dirname, 'templates/modern.html'), 'utf-8');
      let filled = template
        .replace(/{{ data.name }}/g, name)
        .replace(/{{ data.email }}/g, email)
        .replace(/{{ data.phone }}/g, phone)
        .replace(/{{ data.linkedin }}/g, linkedin)
        .replace(/{{ data.summary\[0\] }}/g, summary.join(' '))
        .replace(/{{ data.skills \| join\(', '\) }}/g, skillList.join(', '));

        filled = filled.replace(
  /{% for edu in data.education %}[\s\S]*?{% endfor %}/,
  education.map(e => `<li><strong>${e.degree}</strong>, ${e.institution} (${e.year})</li>`).join('')
);

filled = filled.replace(
  /{% for exp in data.experience %}[\s\S]*?{% endfor %}/,
  experience.map(e => `<li><strong>${e.role}</strong> at ${e.company} (${e.year})<br>${e.description}</li>`).join('')
);

filled = filled.replace(
  /{% for proj in data.projects %}[\s\S]*?{% endfor %}/,
  projects.map(p => `<li><strong>${p.title}</strong>: ${p.description}</li>`).join('')
);

      res.send(filled);
    });

  } catch (err) {
    console.error("❌ Resume generation error:", err);
    res.status(500).send("Resume generation failed.");
  }
});

app.post('/api/download-resume-pdf', async (req, res) => {
  const { html } = req.body;

  if (!html) {
    return res.status(400).send("Missing HTML content.");
  }

  try {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
    await browser.close();

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="resume.pdf"'
    });
    res.send(pdfBuffer);

  } catch (err) {
    console.error("❌ PDF generation failed:", err);
    res.status(500).send("Failed to generate PDF.");
  }
});

// ✅ Connect DB and Auth
connectDB();
app.use('/api', authRoutes);

// ✅ Signup Route
app.post('/api/signup', async (req, res) => {
  const { name, email, password } = req.body;

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ name, email, password: hashedPassword });
    await newUser.save();

    res.status(201).json({ message: 'User created successfully' });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ message: 'Server error during signup' });
  }
});

// ✅ Login Route
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '2h' });

    res.json({ token });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// ✅ Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));