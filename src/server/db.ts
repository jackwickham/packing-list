import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';
import { loadConfig } from './config.js';

const config = loadConfig();

const dbDir = path.dirname(config.database.path);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(config.database.path);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    sort_order INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS lists (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    is_template INTEGER NOT NULL DEFAULT 0,
    is_archived INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    list_id INTEGER NOT NULL,
    category_id INTEGER NOT NULL,
    text TEXT NOT NULL,
    is_checked INTEGER NOT NULL DEFAULT 0,
    sort_order INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (list_id) REFERENCES lists(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT
  );

  CREATE INDEX IF NOT EXISTS idx_items_list_id ON items(list_id);
  CREATE INDEX IF NOT EXISTS idx_items_text ON items(text);
`);

const categoryCount = db.prepare('SELECT COUNT(*) as count FROM categories').get() as { count: number };
if (categoryCount.count === 0) {
  const insert = db.prepare('INSERT INTO categories (name, sort_order) VALUES (?, ?)');
  const seed = db.transaction((cats: [string, number][]) => {
    for (const [name, order] of cats) {
      insert.run(name, order);
    }
  });
  seed([
    ['Clothes', 0],
    ['Tech', 1],
    ['Misc', 2],
  ]);
}

export default db;
