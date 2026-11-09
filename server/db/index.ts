import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';

const isVercel = Boolean(process.env.VERCEL);
const DB_DIR = isVercel
  ? path.resolve('/tmp', 'recall-data')
  : path.resolve(process.cwd(), 'data');

if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const DB_PATH = path.join(DB_DIR, 'recall.db');

// If in serverless Vercel environment and seed DB exists, copy into /tmp on cold start
if (isVercel && !fs.existsSync(DB_PATH)) {
  const sourceDb = path.resolve(process.cwd(), 'data', 'recall.db');
  if (fs.existsSync(sourceDb)) {
    try {
      fs.copyFileSync(sourceDb, DB_PATH);
    } catch (e) {
      console.warn('Could not copy seed DB to /tmp in Vercel:', e);
    }
  }
}

export const db = new DatabaseSync(DB_PATH);

// Initialize database tables and full-text search indexes
export function initDatabase() {
  // Enforce foreign keys and WAL mode for reliability
  db.exec('PRAGMA foreign_keys = ON;');

  // 1. Users Table (Supports standard email/password and Google SSO)
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT,
      name TEXT NOT NULL,
      avatar_url TEXT,
      google_id TEXT,
      created_at TEXT NOT NULL
    );
  `);

  // Migrate schema safely if columns do not exist yet
  try {
    db.exec('ALTER TABLE users ADD COLUMN avatar_url TEXT;');
  } catch {}
  try {
    db.exec('ALTER TABLE users ADD COLUMN google_id TEXT;');
  } catch {}

  // 2. Screenshots Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS screenshots (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      storage_key TEXT NOT NULL,
      original_filename TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      width INTEGER,
      height INTEGER,
      file_size INTEGER NOT NULL,
      captured_at TEXT,
      uploaded_at TEXT NOT NULL,
      category TEXT NOT NULL,
      processing_status TEXT NOT NULL,
      processing_error TEXT,
      ocr_text TEXT,
      visual_description TEXT,
      text_embedding TEXT,
      tags TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // Index on user_id, category, status for fast queries
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_screenshots_user_id ON screenshots(user_id);
    CREATE INDEX IF NOT EXISTS idx_screenshots_category ON screenshots(category);
    CREATE INDEX IF NOT EXISTS idx_screenshots_status ON screenshots(processing_status);
  `);

  // 3. Extracted Messages Table (For conversation-aware search)
  db.exec(`
    CREATE TABLE IF NOT EXISTS extracted_messages (
      id TEXT PRIMARY KEY,
      screenshot_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      sequence_number INTEGER NOT NULL,
      message_text TEXT NOT NULL,
      sender_side TEXT NOT NULL,
      sender_label TEXT,
      confidence REAL NOT NULL,
      bounding_box TEXT,
      FOREIGN KEY (screenshot_id) REFERENCES screenshots(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_messages_screenshot ON extracted_messages(screenshot_id);
    CREATE INDEX IF NOT EXISTS idx_messages_user ON extracted_messages(user_id);
    CREATE INDEX IF NOT EXISTS idx_messages_seq ON extracted_messages(screenshot_id, sequence_number);
  `);

  // 4. Game Results Table (For structured game-stat search, e.g. BGMI)
  db.exec(`
    CREATE TABLE IF NOT EXISTS game_results (
      id TEXT PRIMARY KEY,
      screenshot_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      game_name TEXT NOT NULL,
      mode TEXT,
      map_name TEXT,
      kills INTEGER,
      score INTEGER,
      rank TEXT,
      damage INTEGER,
      match_date TEXT,
      extraction_confidence REAL NOT NULL,
      raw_extracted_text TEXT,
      FOREIGN KEY (screenshot_id) REFERENCES screenshots(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_game_screenshot ON game_results(screenshot_id);
    CREATE INDEX IF NOT EXISTS idx_game_user ON game_results(user_id);
    CREATE INDEX IF NOT EXISTS idx_game_kills ON game_results(kills);
  `);

  // 5. FTS5 Virtual Table for full-text search across OCR & visual description
  try {
    db.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS screenshots_fts USING fts5(
        screenshot_id UNINDEXED,
        user_id UNINDEXED,
        ocr_text,
        visual_description,
        tags,
        category UNINDEXED
      );
    `);
  } catch (err) {
    console.warn('FTS5 table initialization notice:', err);
  }

  console.log('✅ SQLite database initialized at:', DB_PATH);
}

