const express = require('express');
const mongoose = require('mongoose');
const db = require('../utils/db');

const router = express.Router();

// GET /api/leaderboard
// Returns array of { id, name, words, score } sorted by score desc
router.get('/leaderboard', async (req, res) => {
  try {
    if (db.isMongo()) {
      const { Blog, User } = db.getModels();
      const blogs = await Blog.find({}).lean();
      let totalWords = 0;
      const map = {};
      for (const b of blogs) {
        const txt = (b.content || '').trim();
        const words = txt ? txt.split(/\s+/).filter(Boolean).length : 0;
        totalWords += words;
        const aid = b.authorId ? String(b.authorId) : (b.author || 'unknown');
        map[aid] = map[aid] || { id: aid, words: 0, name: null };
        map[aid].words += words;
      }
      // resolve names where possible
      const ids = Object.keys(map).filter(id => mongoose.Types.ObjectId.isValid(id));
      if (ids.length) {
        const users = await User.find({ _id: { $in: ids } }).lean();
        users.forEach(u => { if (map[u._id.toString()]) map[u._id.toString()].name = u.name; });
      }
      const arr = Object.values(map).map(x => ({ id: x.id, name: x.name || x.id, words: x.words, score: totalWords > 0 ? x.words / totalWords : 0 }));
      arr.sort((a,b) => b.score - a.score);
      return res.json(arr);
    } else {
      const store = db.loadFileDB();
      const blogs = store.blogs || [];
      const users = store.users || [];
      let totalWords = 0;
      const map = {};
      for (const b of blogs) {
        const txt = (b.content || '').trim();
        const words = txt ? txt.split(/\s+/).filter(Boolean).length : 0;
        totalWords += words;
        const aid = b.authorId || b.author || 'unknown';
        map[aid] = map[aid] || { id: aid, words: 0, name: null };
        map[aid].words += words;
      }
      for (const u of users) { if (map[u.id]) map[u.id].name = u.name; }
      const arr = Object.values(map).map(x => ({ id: x.id, name: x.name || x.id, words: x.words, score: totalWords > 0 ? x.words / totalWords : 0 }));
      arr.sort((a,b) => b.score - a.score);
      return res.json(arr);
    }
  } catch (err) {
    console.error('leaderboard err', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
