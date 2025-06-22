import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';

const router = express.Router();

// ✅ Signup
router.post('/signup', async (req, res) => {
  const { email, password, name } = req.body;
  try {
    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ message: "User already exists" });

    const hashed = await bcrypt.hash(password, 10);
    user = new User({ email, password: hashed, name });
    await user.save();

    res.status(201).json({ message: "User created" });
  } catch (err) {
    res.status(500).send("Server error");
  }
});

// ✅ Correct Login (moved from server.js)
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  console.log("📥 Login attempt:", email);

  try {
    const user = await User.findOne({ email });
    if (!user) {
      console.log("❌ User not found");
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log("❌ Incorrect password");
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (!process.env.JWT_SECRET) {
      console.error("❌ JWT_SECRET is undefined!");
      return res.status(500).json({ message: "Server misconfigured: JWT secret missing" });
    }

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '2h' });

    return res.status(200).json({ token, user: { _id: user._id, name: user.name, email: user.email } });
  } catch (err) {
    console.error('🔥 Login Error:', err);
    return res.status(500).json({ message: 'Server error during login' });
  }
});

// ✅ Logout
router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.status(200).json({ message: 'Logged out successfully' });
});

export default router;