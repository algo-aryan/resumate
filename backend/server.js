// Imports
import express from 'express';
import connectDB from './config/db.js';
import dotenv from 'dotenv';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import User from './models/User.js';
import TrackedInternship from './models/TrackedInternship.js';
import resumeRoutes from './routes/resume.js';
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Setup
const app = express();

// Middleware
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'DELETE'] }));
app.use(express.json());

// Routes
app.use('/api', resumeRoutes);

// Connect DB and Auth
connectDB();
app.use('/api', authRoutes);

// Track Internship Route
app.post('/api/track-internship', async (req, res) => {
  const { userId, title, company, link, ats } = req.body;

  if (!userId || !title || !company || !link) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  try {
    const newTrack = new TrackedInternship({
      userId,
      title,
      company,
      link,
      ats,
    });

    await newTrack.save();
    res.status(201).json({ message: 'Internship tracked successfully' });
  } catch (err) {
    console.error('Track error:', err);
    res.status(500).json({
      message: 'Server error while tracking internship',
    });
  }
});

// Get All Tracked Internships for a User
app.get('/api/tracked-internships/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const internships = await TrackedInternship.find({ userId }).sort({
      trackedAt: -1,
    });
    res.status(200).json(internships);
  } catch (err) {
    console.error('Fetch error:', err);
    res.status(500).json({
      message: 'Failed to fetch tracked internships.',
    });
  }
});

// Untrack internship by ID
app.delete('/api/untrack-internship/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await TrackedInternship.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({ message: 'Internship not found' });
    }

    res.status(200).json({ message: 'Internship untracked successfully' });
  } catch (err) {
    console.error('Untrack error:', err);
    res.status(500).json({ message: 'Server error during untracking' });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () =>
  console.log(`Server running on port ${PORT}`),
);
