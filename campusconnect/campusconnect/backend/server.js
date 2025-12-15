const express = require('express');
const path = require('path');
const cors = require('cors');
const config = require('./utils/config');
const db = require('./utils/db');

const authRoutes = require('./routes/auth');
const blogsRoutes = require('./routes/blogs');
const challengesRoutes = require('./routes/challenges');
const notificationsRoutes = require('./routes/notifications');

const app = express();
app.use(cors());
app.use(express.json());

// API routes
app.use('/api', authRoutes);
app.use('/api', blogsRoutes);
app.use('/api', challengesRoutes);
app.use('/api', notificationsRoutes);

// Health
app.get('/api/health', (req, res) => res.json({ ok: true }));

// Serve frontend static files (optional convenience)
app.use(express.static(path.join(__dirname, '..', 'frontend')));

async function start() {
  await db.init();
  const PORT = config.PORT || 4000;
  app.listen(PORT, () => {
    console.log(`CampusConnect backend listening on port ${PORT}`);
    if (db.isMongo()) console.log('Using MongoDB storage'); else console.log('Using file-based storage (backend/data.json)');
  });
}

start().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
