import * as SQLite from 'expo-sqlite';
import { CREATE_TABLES, SCHEMA_VERSION } from './schema';

let _db: SQLite.SQLiteDatabase | null = null;

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (_db) return _db;

  const db = await SQLite.openDatabaseAsync('aria.db');

  await db.execAsync('PRAGMA journal_mode = WAL;');
  await db.execAsync('PRAGMA foreign_keys = ON;');

  // Run schema creation
  await db.execAsync(CREATE_TABLES);

  // Track schema version for future migrations
  await db.execAsync(
    `INSERT OR IGNORE INTO settings (key, value) VALUES ('schema_version', '${SCHEMA_VERSION}');`
  );

  _db = db;
  return db;
}
