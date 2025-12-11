const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../utils/db');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

router.get('/challenges', async (req, res) => {
  if (db.isMongo()) {
    const { Challenge } = db.getModels();
    try {
      const challenges = await Challenge.find().sort({ createdAt: -1 }).lean();
      res.json(challenges.map(c => ({ id: c._id.toString(), title: c.title, description: c.description, authorId: c.authorId, createdAt: c.createdAt })));
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
    const challenge = { id: uuidv4(), title, description, authorId: req.user.id, createdAt: new Date().toISOString() };
    store.challenges.push(challenge);
    db.saveFileDB(store);
    res.json(challenge);
  }
});

module.exports = router;
