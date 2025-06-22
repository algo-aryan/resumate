import express from 'express';
import Application from '../models/Application.js';
const router = express.Router();

// ✅ Save a tracked internship
router.post('/track', async (req, res) => {
  try {
    const newApp = new Application(req.body);
    const saved = await newApp.save();
    res.status(201).json(saved);
  } catch (err) {
    console.error('Track error:', err);
    res.status(500).json({ message: 'Failed to track internship' });
  }
});

// ✅ Get all tracked internships for a user
router.get('/my-applications/:userId', async (req, res) => {
  try {
    const applications = await Application.find({ userId: req.params.userId }).sort({ trackedAt: -1 });
    res.json(applications);
  } catch (err) {
    console.error('Fetch error:', err);
    res.status(500).json({ message: 'Failed to fetch applications' });
  }
});

// ✅ Update status (Applied → Interview → Selected etc.)
router.put('/update-status/:id', async (req, res) => {
  try {
    const updated = await Application.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true }
    );
    res.json(updated);
  } catch (err) {
    console.error('Update status error:', err);
    res.status(500).json({ message: 'Failed to update status' });
  }
});

export default router;