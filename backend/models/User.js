const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, index: true, unique: true },
  passwordHash: { type: String, required: true },
  bio: { type: String, default: '' },
  bookmarks: [{
    id: { type: String },
    title: { type: String },
    href: { type: String },
    createdAt: { type: Date, default: Date.now }
  }],
  bookmarksEnabled: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.models.User || mongoose.model('User', userSchema);
