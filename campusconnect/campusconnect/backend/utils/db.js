const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const config = require('./config');

let useMongo = false;
let Models = { User: null, Blog: null, Challenge: null };

const DB_PATH = config.DATA_PATH;

function loadFileDB() {
  try {
    const raw = fs.readFileSync(DB_PATH, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    const init = { users: [], blogs: [], challenges: [] };
    fs.writeFileSync(DB_PATH, JSON.stringify(init, null, 2));
    return init;
  }
}

function saveFileDB(db) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

async function init() {
  const uri = config.MONGODB_URI;
  if (!uri) return; // stay in file mode
  try {
    await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
    // load models
    Models.User = require(path.join(__dirname, '..', 'models', 'User'));
    Models.Blog = require(path.join(__dirname, '..', 'models', 'Blog'));
    Models.Challenge = require(path.join(__dirname, '..', 'models', 'Challenge'));
    useMongo = true;
    console.log('db: connected to MongoDB');
  } catch (err) {
    console.error('db: failed to connect to MongoDB, falling back to file DB -', err.message);
    useMongo = false;
  }
}

module.exports = {
  init,
  isMongo: () => useMongo,
  getModels: () => Models,
  loadFileDB,
  saveFileDB
};
