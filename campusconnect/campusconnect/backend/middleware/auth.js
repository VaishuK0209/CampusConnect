const jwt = require('jsonwebtoken');
const config = require('../utils/config');
const db = require('../utils/db');

async function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ error: 'Missing token' });
  const token = auth.slice(7);
  try {
    const payload = jwt.verify(token, config.JWT_SECRET);
    if (db.isMongo()) {
      // attach minimal user info (id) for routes to lookup
      req.user = { id: payload.sub };
      return next();
    }
    // file DB mode
    const store = db.loadFileDB();
    const user = store.users.find(u => u.id === payload.sub);
    if (!user) return res.status(401).json({ error: 'Invalid token' });
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

module.exports = authMiddleware;
