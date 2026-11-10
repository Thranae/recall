import dotenv from 'dotenv';
dotenv.config();

import { createClient, Client } from '@libsql/client/web';
import nodeModule from 'module';
import path from 'path';
import fs from 'fs';

let tursoClient: Client | null = null;
export function getTursoClient(): Client | null {
  const tursoUrl = process.env.TURSO_DATABASE_URL;
  const tursoAuthToken = process.env.TURSO_AUTH_TOKEN;
  if (!tursoUrl) return null;
  if (!tursoClient) {
    tursoClient = createClient({
      url: tursoUrl,
      authToken: tursoAuthToken,
    });
  }
  return tursoClient;
}

export function isUsingTurso(): boolean {
  return Boolean(process.env.TURSO_DATABASE_URL);
}

let localDb: any = null;
function getLocalDb() {
  if (localDb) return localDb;
  try {
    const nodeRequire = typeof require !== 'undefined' ? require : nodeModule.createRequire(import.meta.url);
    const { DatabaseSync } = nodeRequire('node:sqlite');
    const isVercel = Boolean(process.env.VERCEL);
    const DB_DIR = isVercel
      ? path.resolve('/tmp', 'recall-data')
      : path.resolve(process.cwd(), 'data');

    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }

    const DB_PATH = path.join(DB_DIR, 'recall.db');
    localDb = new DatabaseSync(DB_PATH);
    localDb.exec('PRAGMA foreign_keys = OFF;');
    return localDb;
  } catch (err) {
    console.warn('Local SQLite unavailable or failed to initialize:', err);
    return null;
  }
}

export const db = {
  get isTurso() {
    return isUsingTurso();
  },

  async all<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    const client = getTursoClient();
    if (client) {
      const res = await client.execute({ sql, args: params });
      return res.rows as unknown as T[];
    }
    const local = getLocalDb();
    if (local) {
      return local.prepare(sql).all(...params) as T[];
    }
    return [];
  },

  async get<T = any>(sql: string, params: any[] = []): Promise<T | undefined> {
    const client = getTursoClient();
    if (client) {
      const res = await client.execute({ sql, args: params });
      return (res.rows[0] as unknown as T) || undefined;
    }
    const local = getLocalDb();
    if (local) {
      return (local.prepare(sql).get(...params) as T) || undefined;
    }
    return undefined;
  },

  async run(sql: string, params: any[] = []): Promise<{ changes: number; rowsAffected: number; lastInsertRowid: any }> {
    const client = getTursoClient();
    if (client) {
      const res = await client.execute({ sql, args: params });
      return {
        changes: res.rowsAffected,
        rowsAffected: res.rowsAffected,
        lastInsertRowid: res.lastInsertRowid ? Number(res.lastInsertRowid) : 0,
      };
    }
    const local = getLocalDb();
    if (local) {
      const res = local.prepare(sql).run(...params);
      return {
        changes: res.changes,
        rowsAffected: res.changes,
        lastInsertRowid: res.lastInsertRowid,
      };
    }
    return { changes: 0, rowsAffected: 0, lastInsertRowid: 0 };
  },

  async exec(sql: string): Promise<void> {
    const client = getTursoClient();
    if (client) {
      await client.executeMultiple(sql);
    } else {
      const local = getLocalDb();
      if (local) local.exec(sql);
    }
  },

  prepare(sql: string) {
    return {
      all: async (...args: any[]): Promise<any[]> => {
        const flat = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
        return db.all(sql, flat);
      },
      get: async (...args: any[]): Promise<any> => {
        const flat = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
        return db.get(sql, flat);
      },
      run: async (...args: any[]): Promise<any> => {
        const flat = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
        return db.run(sql, flat);
      },
    };
  },
};

const SCHEMA_DDL = `
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT,
    name TEXT NOT NULL,
    avatar_url TEXT,
    google_id TEXT,
    is_verified INTEGER DEFAULT 1,
    otp_code TEXT,
    otp_expires TEXT,
    created_at TEXT NOT NULL
  );

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
    image_data TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_screenshots_user_id ON screenshots(user_id);
  CREATE INDEX IF NOT EXISTS idx_screenshots_category ON screenshots(category);
  CREATE INDEX IF NOT EXISTS idx_screenshots_status ON screenshots(processing_status);

  CREATE TABLE IF NOT EXISTS extracted_messages (
    id TEXT PRIMARY KEY,
    screenshot_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    sequence_number INTEGER NOT NULL,
    message_text TEXT NOT NULL,
    sender_side TEXT NOT NULL,
    sender_label TEXT,
    confidence REAL NOT NULL,
    bounding_box TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_messages_screenshot ON extracted_messages(screenshot_id);
  CREATE INDEX IF NOT EXISTS idx_messages_user ON extracted_messages(user_id);
  CREATE INDEX IF NOT EXISTS idx_messages_seq ON extracted_messages(screenshot_id, sequence_number);

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
    raw_extracted_text TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_game_screenshot ON game_results(screenshot_id);
  CREATE INDEX IF NOT EXISTS idx_game_user ON game_results(user_id);
  CREATE INDEX IF NOT EXISTS idx_game_kills ON game_results(kills);

  CREATE VIRTUAL TABLE IF NOT EXISTS screenshots_fts USING fts5(
    screenshot_id UNINDEXED,
    user_id UNINDEXED,
    ocr_text,
    visual_description,
    tags,
    category UNINDEXED
  );
`;

export async function initDatabase(): Promise<void> {
  const client = getTursoClient();
  if (client) {
    try {
      await client.executeMultiple(SCHEMA_DDL);
      console.log('⚡ Turso Cloud SQLite Database connected and verified at:', process.env.TURSO_DATABASE_URL);
    } catch (err) {
      console.error('Failed to initialize Turso database:', err);
    }
  } else {
    try {
      const local = getLocalDb();
      if (local) {
        local.exec('PRAGMA foreign_keys = OFF;');
        local.exec(SCHEMA_DDL);
        console.log('✅ Local SQLite database initialized');
      }
    } catch (err) {
      console.warn('Local SQLite initialization notice:', err);
    }
  }
}
