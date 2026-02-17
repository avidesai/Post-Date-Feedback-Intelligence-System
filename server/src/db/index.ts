import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { config } from '../config';
import { SCHEMA } from './schema';

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (db) return db;

  // make sure the data directory exists
  const dbDir = path.dirname(config.dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  db = new Database(config.dbPath);

  // sqlite pragmas for better perf
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  return db;
}

export function initDb(): void {
  const database = getDb();
  // run the schema - all CREATE IF NOT EXISTS so its safe to run multiple times
  database.exec(SCHEMA);

  // migrations for existing databases
  try {
    database.exec('ALTER TABLE feedback ADD COLUMN dimension_snippets TEXT');
  } catch {
    // column already exists, ignore
  }

  console.log('Database initialized');
}

// for tests - close and reset
export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}
