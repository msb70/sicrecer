// Secretos de migración: <proyecto>/.sicrecer/ (gitignored). Fallback: $SICRECER_DIR o ~/.sicrecer
const fs = require('fs'), path = require('path');
module.exports = (proyecto) => {
  const dirs = [process.env.SICRECER_DIR, path.join(proyecto, '.sicrecer'), path.join(process.env.HOME || '', '.sicrecer')].filter(Boolean);
  const leer = (f) => { for (const d of dirs) { const p = path.join(d, f); if (fs.existsSync(p)) return fs.readFileSync(p, 'utf8').trim(); } throw new Error(`falta ${f} en ${dirs.join(' | ')}`); };
  const { Client } = require(path.join(proyecto, 'node_modules', 'pg'));
  return {
    Client,
    supabase: () => ({ host: 'aws-0-us-east-1.pooler.supabase.com', port: 5432, database: 'postgres',
      user: 'postgres.lvarzwnrreiqwflhooul', password: leer('supabase.pass'), ssl: { rejectUnauthorized: false } }),
    neon: () => ({ connectionString: leer('neon.url'), ssl: { rejectUnauthorized: false } }),
  };
};
