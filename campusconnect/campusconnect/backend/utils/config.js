require('dotenv').config();
const path = require('path');

module.exports = {
  PORT: process.env.PORT || 4000,
  JWT_SECRET: process.env.JWT_SECRET || 'dev_jwt_secret_change_me',
  MONGODB_URI: process.env.MONGODB_URI || '',
  DATA_PATH: path.join(__dirname, '..', 'data.json')
};
