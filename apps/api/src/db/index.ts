import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { migrationSql } from './schema.js';

export function createDb() {
  const dbPath = process.env.LITELIZARD_DB_PATH ?? path.resolve(process.cwd(), 'data/litelizard.sqlite3');
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });

  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.exec(migrationSql);
  return db;
}
