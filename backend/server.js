require('dotenv').config({ quiet: true });
const crypto = require('node:crypto');
const path = require('node:path');
const { openDatabase } = require('./src/db');
const { createApp } = require('./src/app');

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '127.0.0.1';
const DB_FILE = process.env.DB_FILE || path.join(__dirname, 'data', 'studytrack.db');

let secret = process.env.JWT_SECRET;
if (!secret) {
  secret = crypto.randomBytes(32).toString('hex');
  console.warn('JWT_SECRET não definido: usando um segredo temporário (sessões caem ao reiniciar).');
}

require('node:fs').mkdirSync(path.dirname(DB_FILE), { recursive: true });
const db = openDatabase(DB_FILE);
const app = createApp({ db, secret, corsOrigin: process.env.CORS_ORIGIN || '*' });

app.listen(PORT, HOST, () => {
  console.log(`🚀 StudyTrack rodando em http://${HOST}:${PORT}`);
});
