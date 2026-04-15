const express = require('express');
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');
const config = require('../utils/config');
const mongoose = require('mongoose');
const db = require('../utils/db');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// send notification helper
async function sendNotification(recipientId, senderId, message, url) {
  if (db.isMongo()) {
    const Notification = require('../models/Notification');
    try {
      await Notification.create({ recipientId, senderId, message, url });
    } catch (e) { console.error('notify err', e); }
  } else {
    const store = db.loadFileDB();
    store.notifications = store.notifications || [];
    store.notifications.push({ recipientId, senderId, message, url, read: false, createdAt: new Date().toISOString() });
    db.saveFileDB(store);
  }
}

router.get('/blogs', async (req, res) => {
  if (db.isMongo()) {
    const { Blog } = db.getModels();
    try {
      // exclude drafts from public listing
      const blogs = await Blog.find({ draft: { $ne: true } }).sort({ createdAt: -1 }).lean();
        // resolve author names where possible
        let authorMap = {};
        try {
          const { User } = db.getModels();
          const ids = Array.from(new Set(blogs.map(b => b.authorId).filter(Boolean)));
          if (ids.length) {
            const users = await User.find({ _id: { $in: ids } }).lean();
            users.forEach(u => { authorMap[u._id.toString()] = u.name; });
          }
        } catch (e) { /* ignore */ }
        res.json(blogs.map(b => ({ id: b._id.toString(), title: b.title, content: b.content, authorId: b.authorId, authorName: authorMap[b.authorId] || undefined, createdAt: b.createdAt, essential: !!b.essential, mood: b.mood || '', shareUrl: `/blog.html#${b._id.toString()}` })));
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  } else {
    const store = db.loadFileDB();
    const users = store.users || [];
    res.json((store.blogs || []).filter(b => !b.draft).map(b => Object.assign({}, b, { authorName: (users.find(u => u.id === b.authorId) || {}).name, shareUrl: `/blog.html#${b.id}` })));
  }
});

router.post('/blogs', authMiddleware, async (req, res) => {
  const { title, content } = req.body || {};
  if (!title || !content) return res.status(400).json({ error: 'title and content required' });
  if (db.isMongo()) {
    const { Blog } = db.getModels();
    try {
      const blog = await Blog.create({ title, content, authorId: req.user.id, createdAt: new Date(), essential: !!req.body.essential, mood: (req.body.mood || '').toString(), draft: !!req.body.draft });
      // notify followers / send a generic notification to all users (simple approach)
      try {
        const store = db.loadFileDB();
        const allUserIds = db.isMongo() ? null : (store.users || []).map(u => u.id).filter(id => id !== req.user.id);
        if (allUserIds && allUserIds.length) {
          for (const uid of allUserIds) {
            await sendNotification(uid, req.user.id, `${req.user.id} published a new blog: ${title}`, `/blog.html#${blog._id.toString()}`);
          }
        }
      } catch (e) { /* ignore */ }
      res.json({ id: blog._id.toString(), title: blog.title, content: blog.content, authorId: blog.authorId, createdAt: blog.createdAt, essential: !!blog.essential, mood: blog.mood || '' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  } else {
    const store = db.loadFileDB();
    const blog = { id: uuidv4(), title, content, authorId: req.user.id, createdAt: new Date().toISOString(), essential: !!req.body.essential, mood: (req.body.mood || '').toString() };
    store.blogs.push(blog);
    // notify users in file DB
    try {
      const userIds = (store.users || []).map(u => u.id).filter(id => id !== req.user.id);
      for (const uid of userIds) {
        store.notifications = store.notifications || [];
        store.notifications.push({ recipientId: uid, senderId: req.user.id, message: `${req.user.id} published a new blog: ${title}`, url: `/blog.html#${blog.id}`, read: false, createdAt: new Date().toISOString() });
      }
    } catch (e) { /* ignore */ }
    db.saveFileDB(store);
    res.json(blog);
  }
});

// Get single blog
router.get('/blogs/:id', async (req, res) => {
  const id = req.params.id;
  if (db.isMongo()) {
    const { Blog } = db.getModels();
    try {
      if (!mongoose.Types.ObjectId.isValid(id)) return res.status(404).json({ error: 'Not found' });
      const b = await Blog.findById(id).lean();
      if (!b) return res.status(404).json({ error: 'Not found' });
      // try to fetch author name
      let authorName = undefined;
      try { const { User } = db.getModels(); const u = await User.findById(b.authorId).lean(); if (u) authorName = u.name; } catch (e) { /* ignore */ }
      res.json({ id: b._id.toString(), title: b.title, content: b.content, authorId: b.authorId, authorName, createdAt: b.createdAt, essential: !!b.essential, mood: b.mood || '', shareUrl: `/blog.html#${b._id.toString()}` });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  } else {
    const store = db.loadFileDB();
    const users = store.users || [];
    const b = (store.blogs || []).find(x => x.id === id);
    if (!b) return res.status(404).json({ error: 'Not found' });
    res.json(Object.assign({}, b, { authorName: (users.find(u => u.id === b.authorId) || {}).name, shareUrl: `/blog.html#${b.id}` }));
  }
});

// Get blogs for current user
router.get('/myblogs', authMiddleware, async (req, res) => {
  if (db.isMongo()) {
    const { Blog } = db.getModels();
    try {
      const blogs = await Blog.find({ authorId: req.user.id }).sort({ createdAt: -1 }).lean();
      return res.json(blogs.map(b => ({ id: b._id.toString(), title: b.title, content: b.content, authorId: b.authorId, authorName: undefined, createdAt: b.createdAt, essential: !!b.essential, mood: b.mood || '', shareUrl: `/blog.html#${b._id.toString()}` })));
    } catch (err) { console.error(err); return res.status(500).json({ error: 'Server error' }); }
  } else {
    const store = db.loadFileDB();
    const users = store.users || [];
    const mine = (store.blogs || []).filter(b => b.authorId === req.user.id).sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
    return res.json(mine.map(b => Object.assign({}, b, { authorName: (users.find(u => u.id === b.authorId) || {}).name, shareUrl: `/blog.html#${b.id}` })));
  }
});

// Share blog (notify author)
router.post('/blogs/:id/share', authMiddleware, async (req, res) => {
  const id = req.params.id;
  try {
    let authorId = null;
    let title = 'a blog';
    if (db.isMongo()) {
      const { Blog } = db.getModels();
      if (!mongoose.Types.ObjectId.isValid(id)) return res.status(404).json({ error: 'Not found' });
      const b = await Blog.findById(id).lean();
      if (!b) return res.status(404).json({ error: 'Not found' });
      authorId = b.authorId;
      title = b.title;
    } else {
      const store = db.loadFileDB();
      const b = (store.blogs || []).find(x => x.id === id);
      if (!b) return res.status(404).json({ error: 'Not found' });
      authorId = b.authorId;
      title = b.title;
    }

    // don't notify if sharer is the author
    if (authorId === req.user.id) return res.json({ ok: true });

    const url = db.isMongo() ? `/blog.html#${id}` : `/blog.html#${id}`;
    const senderId = req.user.id;
    const message = `${senderId} shared your blog: ${title}`;
    // use helper to save notification
    if (db.isMongo()) {
      const Notification = require('../models/Notification');
      await Notification.create({ recipientId: authorId, senderId, message, url });
    } else {
      const store = db.loadFileDB();
      store.notifications = store.notifications || [];
      store.notifications.push({ recipientId: authorId, senderId, message, url, read: false, createdAt: new Date().toISOString() });
      db.saveFileDB(store);
    }
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update blog (author only)
router.put('/blogs/:id', authMiddleware, async (req, res) => {
  const id = req.params.id;
  const { title, content } = req.body || {};
  if (!title || !content) return res.status(400).json({ error: 'title and content required' });
  if (db.isMongo()) {
    const { Blog } = db.getModels();
    try {
      if (!mongoose.Types.ObjectId.isValid(id)) return res.status(404).json({ error: 'Not found' });
      const blog = await Blog.findById(id);
      if (!blog) return res.status(404).json({ error: 'Not found' });
      if (blog.authorId !== req.user.id) return res.status(403).json({ error: 'Not allowed' });
      blog.title = title;
      blog.content = content;
      if (typeof req.body.essential === 'boolean') blog.essential = req.body.essential;
      if (typeof req.body.mood === 'string') blog.mood = req.body.mood;
      await blog.save();
      res.json({ id: blog._id.toString(), title: blog.title, content: blog.content, authorId: blog.authorId, createdAt: blog.createdAt, essential: !!blog.essential, mood: blog.mood || '' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  } else {
    const store = db.loadFileDB();
    const idx = (store.blogs || []).findIndex(x => x.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Not found' });
    const b = store.blogs[idx];
    if (b.authorId !== req.user.id) return res.status(403).json({ error: 'Not allowed' });
    store.blogs[idx].title = title;
    store.blogs[idx].content = content;
    if (typeof req.body.essential === 'boolean') store.blogs[idx].essential = req.body.essential;
    if (typeof req.body.mood === 'string') store.blogs[idx].mood = req.body.mood;
    db.saveFileDB(store);
    res.json(store.blogs[idx]);
  }
});

module.exports = router;
