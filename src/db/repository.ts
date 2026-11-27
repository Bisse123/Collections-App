import type { SQLiteDatabase } from 'expo-sqlite';

import { normalizeTags } from '../lib/tags';
import { deleteImage } from '../storage/images';

export interface Collection {
  id: number;
  name: string;
  createdAt: number;
  itemCount: number;
  /** File name of the photo chosen for the collection itself; resolve with `imageUri`. */
  imageName: string | null;
  /**
   * File name of the image shown on the collection's card: its own photo when it has one,
   * otherwise the most recently updated item image.
   */
  coverImage: string | null;
}

const COLLECTION_COLUMNS = `
  c.id,
  c.name,
  c.created_at AS createdAt,
  c.image_name AS imageName,
  (SELECT COUNT(*) FROM items i WHERE i.collection_id = c.id) AS itemCount,
  COALESCE(
    c.image_name,
    (SELECT i.image_name FROM items i
      WHERE i.collection_id = c.id AND i.image_name IS NOT NULL
      ORDER BY i.updated_at DESC LIMIT 1)
  ) AS coverImage`;

export interface Item {
  id: number;
  collectionId: number;
  title: string;
  description: string | null;
  /** File name inside the app's image folder; resolve with `imageUri`. */
  imageName: string | null;
  tags: string[];
  createdAt: number;
  updatedAt: number;
}

/** The user-editable fields of an item. */
export interface ItemInput {
  title: string;
  description: string | null;
  imageName: string | null;
  tags: string[];
}

interface ItemRow {
  id: number;
  collectionId: number;
  title: string;
  description: string | null;
  imageName: string | null;
  createdAt: number;
  updatedAt: number;
}

const ITEM_COLUMNS = `
  id,
  collection_id AS collectionId,
  title,
  description,
  image_name AS imageName,
  created_at AS createdAt,
  updated_at AS updatedAt`;

/**
 * Lists every collection with its item count and a cover image.
 * @param db The app database.
 * @returns All collections sorted by name, case-insensitively.
 */
export async function listCollections(db: SQLiteDatabase): Promise<Collection[]> {
  return db.getAllAsync<Collection>(
    `SELECT ${COLLECTION_COLUMNS} FROM collections c ORDER BY c.name COLLATE NOCASE`,
  );
}

/**
 * Loads one collection.
 * @param db The app database.
 * @param id The collection's id.
 * @returns The collection, or null if it does not exist.
 */
export async function getCollection(db: SQLiteDatabase, id: number): Promise<Collection | null> {
  return db.getFirstAsync<Collection>(
    `SELECT ${COLLECTION_COLUMNS} FROM collections c WHERE c.id = ?`,
    id,
  );
}

/**
 * Creates a new, empty collection.
 * @param db The app database.
 * @param name The collection's display name; must be non-blank (it is trimmed).
 * @param imageName File name of the collection's photo from `storeImage`, or null for none.
 * @returns The new collection's id. Inserts a row into `collections`.
 */
export async function createCollection(
  db: SQLiteDatabase,
  name: string,
  imageName: string | null,
): Promise<number> {
  const result = await db.runAsync(
    'INSERT INTO collections (name, image_name, created_at) VALUES (?, ?, ?)',
    name.trim(),
    imageName,
    Date.now(),
  );
  return result.lastInsertRowId;
}

/**
 * Saves a collection's name and photo.
 * @param db The app database.
 * @param id The collection's id.
 * @param name The new display name; must be non-blank (it is trimmed).
 * @param imageName File name of the collection's photo from `storeImage`, or null for none.
 * @returns Resolves once saved. Updates the row in `collections` and deletes the previous photo
 * file if the photo was replaced or removed.
 */
export async function updateCollection(
  db: SQLiteDatabase,
  id: number,
  name: string,
  imageName: string | null,
): Promise<void> {
  const previous = await db.getFirstAsync<{ imageName: string | null }>(
    'SELECT image_name AS imageName FROM collections WHERE id = ?',
    id,
  );
  await db.runAsync(
    'UPDATE collections SET name = ?, image_name = ? WHERE id = ?',
    name.trim(),
    imageName,
    id,
  );
  if (previous?.imageName && previous.imageName !== imageName) {
    deleteImage(previous.imageName);
  }
}

/**
 * Deletes a collection together with its photo and all of its items, their tags and their images.
 * @param db The app database.
 * @param id The collection's id.
 * @returns Resolves once deleted. Removes database rows and image files.
 */
export async function deleteCollection(db: SQLiteDatabase, id: number): Promise<void> {
  const images = await db.getAllAsync<{ imageName: string }>(
    `SELECT image_name AS imageName FROM items WHERE collection_id = ? AND image_name IS NOT NULL
    UNION ALL
    SELECT image_name FROM collections WHERE id = ? AND image_name IS NOT NULL`,
    id,
    id,
  );
  await db.runAsync('DELETE FROM collections WHERE id = ?', id);
  images.forEach(({ imageName }) => deleteImage(imageName));
}

/**
 * Lists every item in a collection with its tags.
 * @param db The app database.
 * @param collectionId The collection's id.
 * @returns The items, most recently updated first.
 */
export async function listItems(db: SQLiteDatabase, collectionId: number): Promise<Item[]> {
  const rows = await db.getAllAsync<ItemRow>(
    `SELECT ${ITEM_COLUMNS} FROM items WHERE collection_id = ? ORDER BY updated_at DESC`,
    collectionId,
  );
  const tagRows = await db.getAllAsync<{ itemId: number; tag: string }>(
    `SELECT t.item_id AS itemId, t.tag
    FROM item_tags t JOIN items i ON i.id = t.item_id
    WHERE i.collection_id = ?
    ORDER BY t.tag`,
    collectionId,
  );

  const tagsByItem = new Map<number, string[]>();
  for (const { itemId, tag } of tagRows) {
    const tags = tagsByItem.get(itemId) ?? [];
    tags.push(tag);
    tagsByItem.set(itemId, tags);
  }
  return rows.map((row) => ({ ...row, tags: tagsByItem.get(row.id) ?? [] }));
}

/**
 * Loads one item with its tags.
 * @param db The app database.
 * @param id The item's id.
 * @returns The item, or null if it does not exist.
 */
export async function getItem(db: SQLiteDatabase, id: number): Promise<Item | null> {
  const row = await db.getFirstAsync<ItemRow>(`SELECT ${ITEM_COLUMNS} FROM items WHERE id = ?`, id);
  if (!row) {
    return null;
  }
  const tagRows = await db.getAllAsync<{ tag: string }>(
    'SELECT tag FROM item_tags WHERE item_id = ? ORDER BY tag',
    id,
  );
  return { ...row, tags: tagRows.map(({ tag }) => tag) };
}

/**
 * Creates an item in a collection.
 * @param db The app database.
 * @param collectionId The collection to add the item to.
 * @param input The item's fields. `title` must be non-blank; tags are normalized and de-duplicated.
 * @returns The new item's id. Inserts into `items` and `item_tags` in one transaction.
 */
export async function createItem(
  db: SQLiteDatabase,
  collectionId: number,
  input: ItemInput,
): Promise<number> {
  const now = Date.now();
  let itemId = 0;
  await db.withExclusiveTransactionAsync(async (txn) => {
    const result = await txn.runAsync(
      `INSERT INTO items (collection_id, title, description, image_name, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)`,
      collectionId,
      input.title.trim(),
      input.description?.trim() || null,
      input.imageName,
      now,
      now,
    );
    itemId = result.lastInsertRowId;
    for (const tag of normalizeTags(input.tags)) {
      await txn.runAsync('INSERT INTO item_tags (item_id, tag) VALUES (?, ?)', itemId, tag);
    }
  });
  return itemId;
}

/**
 * Saves changes to an item, replacing all of its tags.
 * @param db The app database.
 * @param id The item's id.
 * @param input The item's new fields. `title` must be non-blank; tags are normalized and
 * de-duplicated.
 * @returns Resolves once saved. Updates `items` and `item_tags` in one transaction and deletes the
 * previous image file if the image was replaced or removed.
 */
export async function updateItem(db: SQLiteDatabase, id: number, input: ItemInput): Promise<void> {
  const previous = await db.getFirstAsync<{ imageName: string | null }>(
    'SELECT image_name AS imageName FROM items WHERE id = ?',
    id,
  );
  await db.withExclusiveTransactionAsync(async (txn) => {
    await txn.runAsync(
      'UPDATE items SET title = ?, description = ?, image_name = ?, updated_at = ? WHERE id = ?',
      input.title.trim(),
      input.description?.trim() || null,
      input.imageName,
      Date.now(),
      id,
    );
    await txn.runAsync('DELETE FROM item_tags WHERE item_id = ?', id);
    for (const tag of normalizeTags(input.tags)) {
      await txn.runAsync('INSERT INTO item_tags (item_id, tag) VALUES (?, ?)', id, tag);
    }
  });
  if (previous?.imageName && previous.imageName !== input.imageName) {
    deleteImage(previous.imageName);
  }
}

/**
 * Deletes an item, its tags and its image.
 * @param db The app database.
 * @param id The item's id.
 * @returns Resolves once deleted. Removes database rows and the image file.
 */
export async function deleteItem(db: SQLiteDatabase, id: number): Promise<void> {
  const previous = await db.getFirstAsync<{ imageName: string | null }>(
    'SELECT image_name AS imageName FROM items WHERE id = ?',
    id,
  );
  await db.runAsync('DELETE FROM items WHERE id = ?', id);
  deleteImage(previous?.imageName);
}
