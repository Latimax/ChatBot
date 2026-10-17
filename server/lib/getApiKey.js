import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function getApiKey() {
  // If explicitly set to empty string (e.g. in tests), honor it
  if (process.env.GROQ_API_KEY === '') {
    return '';
  }

  // If already set in process.env and nonempty
  if (typeof process.env.GROQ_API_KEY === 'string' && process.env.GROQ_API_KEY.trim()) {
    return process.env.GROQ_API_KEY.trim().replace(/^["']|["']$/g, '');
  }

  // Otherwise dynamically re-read server/.env and root .env to pick up file changes
  dotenv.config({ path: path.resolve(__dirname, '../.env'), override: true });
  dotenv.config({ path: path.resolve(__dirname, '../../.env'), override: false });

  let key = process.env.GROQ_API_KEY;
  if (typeof key === 'string') {
    key = key.trim().replace(/^["']|["']$/g, ''); // strip any accidental outer quotes
    if (key.length > 0) return key;
  }
  return '';
}
