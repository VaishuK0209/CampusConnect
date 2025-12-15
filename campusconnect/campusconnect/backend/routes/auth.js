const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const config = require('../utils/config');
const db = require('../utils/db');
const authMiddleware = require('../middleware/auth');

const mongoose = require('mongoose');
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
        if (!mongoose.Types.ObjectId.isValid(req.user.id)) return res.status(404).json({ error: 'User not found' });
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ error: 'User not found' });
      res.json({ user: { id: user._id.toString(), name: user.name, email: user.email, bio: user.bio || '', bookmarks: user.bookmarks || [], bookmarksEnabled: !!user.bookmarksEnabled, createdAt: user.createdAt } });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
    } else {
    const store = db.loadFileDB();
    const user = store.users.find(u => u.id === req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    // include notifications count
      const notifications = store.notifications || [];
      const unread = notifications.filter(n => n.recipientId === user.id && !n.read).length;
      res.json({ user: Object.assign({}, req.user, { bookmarks: user.bookmarks || [], bookmarksEnabled: !!user.bookmarksEnabled, unreadNotifications: unread }) });
  }
});

// Public: get any user's public profile by id
router.get('/users/:id', async (req, res) => {
  const id = req.params.id;
  if (db.isMongo()) {
    const { User } = db.getModels();
    try {
      if (!mongoose.Types.ObjectId.isValid(id)) return res.status(404).json({ error: 'User not found' });
      const user = await User.findById(id).lean();
      if (!user) return res.status(404).json({ error: 'User not found' });
      return res.json({ user: { id: user._id.toString(), name: user.name, bio: user.bio || '', createdAt: user.createdAt } });
    } catch (err) { console.error(err); return res.status(500).json({ error: 'Server error' }); }
  } else {
    const store = db.loadFileDB();
    const user = (store.users || []).find(u => u.id === id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    return res.json({ user: { id: user.id, name: user.name, bio: user.bio || '', createdAt: user.createdAt } });
  }
});

// Get bookmarks
router.get('/bookmarks', authMiddleware, async (req, res) => {
  if (db.isMongo()) {
    const { User } = db.getModels();
    try {
      if (!mongoose.Types.ObjectId.isValid(req.user.id)) return res.status(404).json({ error: 'User not found' });
      const user = await User.findById(req.user.id);
      if (!user) return res.status(404).json({ error: 'User not found' });
      res.json({ bookmarks: user.bookmarks || [] });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  } else {
    const store = db.loadFileDB();
    const user = store.users.find(u => u.id === req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ bookmarks: user.bookmarks || [] });
  }
});

// Add bookmark
router.post('/bookmarks', authMiddleware, async (req, res) => {
  const { id, title, href, pinned } = req.body || {};
  if (!id || !title) return res.status(400).json({ error: 'id and title required' });
  const entry = { id, title, href: href || '#', pinned: !!pinned, createdAt: new Date().toISOString() };
  if (db.isMongo()) {
    const { User } = db.getModels();
    try {
      if (!mongoose.Types.ObjectId.isValid(req.user.id)) return res.status(404).json({ error: 'User not found' });
      const user = await User.findById(req.user.id);
      if (!user) return res.status(404).json({ error: 'User not found' });
      // prevent duplicate ids
      const exists = (user.bookmarks || []).some(b => b.id === id);
      if (!exists) user.bookmarks.unshift(entry);
      await user.save();
      res.json({ bookmarks: user.bookmarks });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  } else {
    const store = db.loadFileDB();
    const idx = store.users.findIndex(u => u.id === req.user.id);
    if (idx === -1) return res.status(404).json({ error: 'User not found' });
    store.users[idx].bookmarks = store.users[idx].bookmarks || [];
    const exists = store.users[idx].bookmarks.some(b => b.id === id);
    if (!exists) store.users[idx].bookmarks.unshift(entry);
    db.saveFileDB(store);
    res.json({ bookmarks: store.users[idx].bookmarks });
  }
});

// Update bookmark (e.g., pinned)
router.put('/bookmarks/:id', authMiddleware, async (req, res) => {
  const bmId = req.params.id;
  const { pinned } = req.body || {};
  if (!bmId) return res.status(400).json({ error: 'bookmark id required' });
  if (db.isMongo()) {
    const { User } = db.getModels();
    try {
      if (!mongoose.Types.ObjectId.isValid(req.user.id)) return res.status(404).json({ error: 'User not found' });
      const user = await User.findById(req.user.id);
      if (!user) return res.status(404).json({ error: 'User not found' });
      user.bookmarks = (user.bookmarks || []).map(b => b.id === bmId ? Object.assign({}, b.toObject ? b.toObject() : b, { pinned: typeof pinned === 'boolean' ? pinned : b.pinned }) : b);
      await user.save();
      res.json({ bookmarks: user.bookmarks });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  } else {
    const store = db.loadFileDB();
    const idx = store.users.findIndex(u => u.id === req.user.id);
    if (idx === -1) return res.status(404).json({ error: 'User not found' });
    store.users[idx].bookmarks = (store.users[idx].bookmarks || []).map(b => b.id === bmId ? Object.assign({}, b, { pinned: typeof pinned === 'boolean' ? pinned : b.pinned }) : b);
    db.saveFileDB(store);
    res.json({ bookmarks: store.users[idx].bookmarks });
  }
});

// Remove bookmark
router.delete('/bookmarks/:id', authMiddleware, async (req, res) => {
  const bmId = req.params.id;
  if (!bmId) return res.status(400).json({ error: 'bookmark id required' });
  if (db.isMongo()) {
    const { User } = db.getModels();
    try {
      const user = await User.findById(req.user.id);
      if (!user) return res.status(404).json({ error: 'User not found' });
      user.bookmarks = (user.bookmarks || []).filter(b => b.id !== bmId);
      await user.save();
      res.json({ bookmarks: user.bookmarks });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  } else {
    const store = db.loadFileDB();
    const idx = store.users.findIndex(u => u.id === req.user.id);
    if (idx === -1) return res.status(404).json({ error: 'User not found' });
    store.users[idx].bookmarks = (store.users[idx].bookmarks || []).filter(b => b.id !== bmId);
    db.saveFileDB(store);
    res.json({ bookmarks: store.users[idx].bookmarks });
  }
});

// Update profile (e.g., bio, name)
router.put('/profile', authMiddleware, async (req, res) => {
  const { name, bio } = req.body || {};
  if (db.isMongo()) {
    const { User } = db.getModels();
    try {
      const update = {};
      if (typeof name === 'string') update.name = name;
      if (typeof bio === 'string') update.bio = bio;
      if (!mongoose.Types.ObjectId.isValid(req.user.id)) return res.status(404).json({ error: 'User not found' });
      const user = await User.findByIdAndUpdate(req.user.id, update, { new: true });
      if (!user) return res.status(404).json({ error: 'User not found' });
      res.json({ user: { id: user._id.toString(), name: user.name, email: user.email, bio: user.bio || '', createdAt: user.createdAt } });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
    } else {
    const store = db.loadFileDB();
    const idx = store.users.findIndex(u => u.id === req.user.id);
    if (idx === -1) return res.status(404).json({ error: 'User not found' });
    if (typeof name === 'string') store.users[idx].name = name;
    if (typeof bio === 'string') store.users[idx].bio = bio;
    if (typeof req.body.bookmarksEnabled === 'boolean') store.users[idx].bookmarksEnabled = req.body.bookmarksEnabled;
      // when user disables notifications via profile, honor that if present
      if (typeof req.body.disableNotifications === 'boolean') store.users[idx].notificationsEnabled = !req.body.disableNotifications;
    db.saveFileDB(store);
    const user = store.users[idx];
    res.json({ user: { id: user.id, name: user.name, email: user.email, bio: user.bio || '', bookmarks: user.bookmarks || [], bookmarksEnabled: !!user.bookmarksEnabled, createdAt: user.createdAt } });
  }
});

module.exports = router;
