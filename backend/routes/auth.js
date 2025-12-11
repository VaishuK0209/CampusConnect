const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const config = require('../utils/config');
const db = require('../utils/db');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Signup
router.post('/signup', async (req, res) => {
  const { name, email, password } = req.body || {};
  if (!name || !email || !password) return res.status(400).json({ error: 'name, email and password required' });
  if (db.isMongo()) {
    const { User } = db.getModels();
    try {
      const existing = await User.findOne({ email: email.toLowerCase() });
      if (existing) return res.status(400).json({ error: 'Email already registered' });
      const passwordHash = bcrypt.hashSync(password, 10);
      const user = await User.create({ name, email: email.toLowerCase(), passwordHash });
      const token = jwt.sign({ sub: user._id.toString() }, config.JWT_SECRET, { expiresIn: '7d' });
      res.json({ user: { id: user._id.toString(), name: user.name, email: user.email, createdAt: user.createdAt }, token });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  } else {
    const store = db.loadFileDB();
    const found = store.users.find(u => u.email === (email || '').toLowerCase());
    if (found) return res.status(400).json({ error: 'Email already registered' });
    const id = uuidv4();
    const passwordHash = bcrypt.hashSync(password, 10);
    const user = { id, name, email: email.toLowerCase(), passwordHash, createdAt: new Date().toISOString() };
    store.users.push(user);
    db.saveFileDB(store);
    const token = jwt.sign({ sub: id }, config.JWT_SECRET, { expiresIn: '7d' });
    res.json({ user: { id: user.id, name: user.name, email: user.email, createdAt: user.createdAt }, token });
  }
});

// Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'email and password required' });
  if (db.isMongo()) {
    const { User } = db.getModels();
    try {
      const user = await User.findOne({ email: email.toLowerCase() });
      if (!user) return res.status(400).json({ error: 'Invalid credentials' });
      const ok = bcrypt.compareSync(password, user.passwordHash);
      if (!ok) return res.status(400).json({ error: 'Invalid credentials' });
      const token = jwt.sign({ sub: user._id.toString() }, config.JWT_SECRET, { expiresIn: '7d' });
      res.json({ user: { id: user._id.toString(), name: user.name, email: user.email, createdAt: user.createdAt }, token });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  } else {
    const store = db.loadFileDB();
    const user = store.users.find(u => u.email === (email || '').toLowerCase());
    if (!user) return res.status(400).json({ error: 'Invalid credentials' });
    const ok = bcrypt.compareSync(password, user.passwordHash);
    if (!ok) return res.status(400).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ sub: user.id }, config.JWT_SECRET, { expiresIn: '7d' });
    res.json({ user: { id: user.id, name: user.name, email: user.email, createdAt: user.createdAt }, token });
  }
});

// Profile
router.get('/profile', authMiddleware, async (req, res) => {
  if (db.isMongo()) {
    const { User } = db.getModels();
    try {
      const user = await User.findById(req.user.id);
      if (!user) return res.status(404).json({ error: 'User not found' });
      res.json({ user: { id: user._id.toString(), name: user.name, email: user.email, createdAt: user.createdAt } });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  } else {
    res.json({ user: req.user });
  }
});

module.exports = router;
