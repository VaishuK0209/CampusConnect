const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../utils/db');
const authMiddleware = require('../middleware/auth');

const mongoose = require('mongoose');
const router = express.Router();

router.get('/challenges', async (req, res) => {
  if (db.isMongo()) {
    const { Challenge } = db.getModels();
    try {
      const challenges = await Challenge.find().sort({ createdAt: -1 }).lean();
      res.json(challenges.map(c => ({ id: c._id.toString(), title: c.title, description: c.description, authorId: c.authorId, participants: c.participants || [], createdAt: c.createdAt })));
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  } else {
    const store = db.loadFileDB();
    res.json(store.challenges || []);
  }
});

router.post('/challenges', authMiddleware, async (req, res) => {
  const { title, description } = req.body || {};
  if (!title || !description) return res.status(400).json({ error: 'title and description required' });
  if (db.isMongo()) {
    const { Challenge } = db.getModels();
    try {
      const challenge = await Challenge.create({ title, description, authorId: req.user.id, createdAt: new Date() });
      res.json({ id: challenge._id.toString(), title: challenge.title, description: challenge.description, authorId: challenge.authorId, createdAt: challenge.createdAt });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  } else {
    const store = db.loadFileDB();
    const challenge = { id: uuidv4(), title, description, authorId: req.user.id, participants: [], createdAt: new Date().toISOString() };
    store.challenges.push(challenge);
    db.saveFileDB(store);
    res.json(challenge);
  }
});

// Join a challenge
router.post('/challenges/:id/join', authMiddleware, async (req, res) => {
  const id = req.params.id;
  if (db.isMongo()) {
    const { Challenge } = db.getModels();
    try {
      if (!mongoose.Types.ObjectId.isValid(id)) return res.status(404).json({ error: 'Challenge not found' });
      const challenge = await Challenge.findById(id);
      if (!challenge) return res.status(404).json({ error: 'Challenge not found' });
      const userId = req.user.id;
      challenge.participants = challenge.participants || [];
      if (challenge.participants.includes(userId)) return res.json({ joined: false, message: 'Already joined' });
      challenge.participants.push(userId);
      await challenge.save();
      return res.json({ joined: true, participants: challenge.participants.length });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Server error' });
    }
  }
  // File DB
  const store = db.loadFileDB();
  const challenge = store.challenges.find(c => c.id === id);
  if (!challenge) return res.status(404).json({ error: 'Challenge not found' });
  challenge.participants = challenge.participants || [];
  const userId = req.user.id || req.user && req.user.id || req.user && req.user.email || req.user.id; // best-effort
  if (challenge.participants.includes(userId)) return res.json({ joined: false, message: 'Already joined' });
  challenge.participants.push(userId);
  db.saveFileDB(store);
  res.json({ joined: true, participants: challenge.participants.length });
});

module.exports = router;
