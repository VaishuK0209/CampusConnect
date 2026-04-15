const express = require('express');
const db = require('../utils/db');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// List notifications for current user
router.get('/notifications', authMiddleware, async (req, res) => {
  if (db.isMongo()) {
    const Notification = require('../models/Notification');
    try {
      const list = await Notification.find({ recipientId: req.user.id }).sort({ createdAt: -1 }).lean();
      res.json({ notifications: list });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
  } else {
    const store = db.loadFileDB();
    const list = (store.notifications || []).filter(n => n.recipientId === req.user.id).sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json({ notifications: list });
  }
});

// Dismiss a notification
router.delete('/notifications/:id', authMiddleware, async (req, res) => {
  const id = req.params.id;
  if (!id) return res.status(400).json({ error: 'id required' });
  if (db.isMongo()) {
    const Notification = require('../models/Notification');
    try {
      await Notification.deleteOne({ _id: id, recipientId: req.user.id });
      res.json({ ok: true });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
  } else {
    const store = db.loadFileDB();
    store.notifications = (store.notifications || []).filter(n => !(n.recipientId === req.user.id && (n.id === id || n._id === id)));
    db.saveFileDB(store);
    res.json({ ok: true });
  }
});

module.exports = router;
