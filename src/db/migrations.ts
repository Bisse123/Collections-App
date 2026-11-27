import type { SQLiteDatabase } from 'expo-sqlite';

const SCHEMA_VERSION = 2;

/**
 * Brings the on-device database schema up to the current version. Runs on every app start and
 * does nothing when the schema is already current.
 * @param db The open app database.
 * @returns Resolves once the schema is current. Creates any missing tables, indexes and columns,
 * enables foreign keys for this connection and sets `PRAGMA user_version`.
 */
export async function migrateDatabase(db: SQLiteDatabase): Promise<void> {
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');

  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const currentVersion = row?.user_version ?? 0;
  if (currentVersion >= SCHEMA_VERSION) {
    return;
  }

  if (currentVersion < 1) {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS collections (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        collection_id INTEGER NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        description TEXT,
        image_name TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_items_collection ON items(collection_id);

      CREATE TABLE IF NOT EXISTS item_tags (
        item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
        tag TEXT NOT NULL,
        PRIMARY KEY (item_id, tag)
      );
    `);
  }

  if (currentVersion < 2) {
    await db.execAsync('ALTER TABLE collections ADD COLUMN image_name TEXT;');
  }

  await db.execAsync(`PRAGMA user_version = ${SCHEMA_VERSION}`);
}
