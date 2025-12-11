const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../utils/db');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

router.get('/blogs', async (req, res) => {
  if (db.isMongo()) {
    const { Blog } = db.getModels();
    try {
      const blogs = await Blog.find().sort({ createdAt: -1 }).lean();
      res.json(blogs.map(b => ({ id: b._id.toString(), title: b.title, content: b.content, authorId: b.authorId, createdAt: b.createdAt })));
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  } else {
    const store = db.loadFileDB();
    res.json(store.blogs || []);
  }
});

router.post('/blogs', authMiddleware, async (req, res) => {
  const { title, content } = req.body || {};
  if (!title || !content) return res.status(400).json({ error: 'title and content required' });
  if (db.isMongo()) {
    const { Blog } = db.getModels();
    try {
      const blog = await Blog.create({ title, content, authorId: req.user.id, createdAt: new Date() });
      res.json({ id: blog._id.toString(), title: blog.title, content: blog.content, authorId: blog.authorId, createdAt: blog.createdAt });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  } else {
    const store = db.loadFileDB();
    const blog = { id: uuidv4(), title, content, authorId: req.user.id, createdAt: new Date().toISOString() };
    store.blogs.push(blog);
    db.saveFileDB(store);
    res.json(blog);
  }
});

module.exports = router;
