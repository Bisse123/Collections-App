import { newId } from '../lib/ids';
import { normalizeTags } from '../lib/tags';
import { store } from './store';
import type { Collection, CollectionSummary, Item, StoreChanges, StoredImage } from './types';

/** What a form wants done with a record's photo when saving. */
export type PhotoUpdate =
  | { kind: 'keep' }
  | { kind: 'remove' }
  | { kind: 'replace'; image: StoredImage };

/** The user-editable fields of an item. */
export interface ItemFields {
  title: string;
  description: string | null;
  tags: string[];
}

/**
 * Works out the image id to save and the image writes and deletes for a photo update.
 * @param currentImageId The record's photo before the save, or null.
 * @param photo What to do with the photo.
 * @returns The record's new image id, plus the store changes for the image itself.
 */
function applyPhotoUpdate(
  currentImageId: string | null,
  photo: PhotoUpdate,
): { imageId: string | null; changes: StoreChanges } {
  if (photo.kind === 'keep') {
    return { imageId: currentImageId, changes: {} };
  }
  const deleteImageIds = currentImageId ? [currentImageId] : [];
  if (photo.kind === 'remove') {
    return { imageId: null, changes: { deleteImageIds } };
  }
  const imageId = newId();
  return { imageId, changes: { putImages: [{ id: imageId, image: photo.image }], deleteImageIds } };
}

/**
 * Lists every collection with its item count and card image.
 * @returns All collections sorted by name, ignoring case.
 */
export async function listCollectionSummaries(): Promise<CollectionSummary[]> {
  const collections = await store.listCollections();
  const summaries = await Promise.all(
    collections.map(async (collection) => {
      const items = await store.listItems(collection.id);
      const newestWithPhoto = items
        .filter((item) => item.imageId)
        .sort((a, b) => b.updatedAt - a.updatedAt)[0];
      return {
        ...collection,
        itemCount: items.length,
        coverImageId: collection.imageId ?? newestWithPhoto?.imageId ?? null,
      };
    }),
  );
  return summaries.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
}

/**
 * Loads one collection's details.
 * @param id The collection's id.
 * @returns The collection, or null if it does not exist.
 */
export function getCollection(id: string): Promise<Collection | null> {
  return store.getCollection(id);
}

/**
 * Creates a new, empty collection.
 * @param name The display name; must be non-blank (it is trimmed).
 * @param photo The collection's photo: `replace` to give it one, anything else for none.
 * @returns The new collection's id.
 */
export async function createCollection(name: string, photo: PhotoUpdate): Promise<string> {
  const now = Date.now();
  const { imageId, changes } = applyPhotoUpdate(null, photo);
  const collection: Collection = { id: newId(), name: name.trim(), imageId, createdAt: now, updatedAt: now };
  await store.commit({ ...changes, putCollections: [collection] });
  return collection.id;
}

/**
 * Saves a collection's name and photo and bumps its `updatedAt`.
 * @param id The collection's id.
 * @param name The new display name; must be non-blank (it is trimmed).
 * @param photo What to do with the collection's photo. A replaced or removed photo is deleted.
 * @returns Resolves once saved.
 * @throws Error when the collection no longer exists.
 */
export async function updateCollection(id: string, name: string, photo: PhotoUpdate): Promise<void> {
  const current = await store.getCollection(id);
  if (!current) {
    throw new Error('This collection no longer exists.');
  }
  const { imageId, changes } = applyPhotoUpdate(current.imageId, photo);
  await store.commit({
    ...changes,
    putCollections: [{ ...current, name: name.trim(), imageId, updatedAt: Date.now() }],
  });
}

/**
 * Deletes a collection with its photo and all of its items and their photos.
 * @param id The collection's id.
 * @returns Resolves once everything is deleted.
 */
export async function deleteCollection(id: string): Promise<void> {
  const [collection, items] = await Promise.all([store.getCollection(id), store.listItems(id)]);
  const imageIds = [collection?.imageId, ...items.map((item) => item.imageId)].filter(
    (imageId): imageId is string => Boolean(imageId),
  );
  await store.commit({
    deleteCollectionIds: [id],
    deleteItemIds: items.map((item) => item.id),
    deleteImageIds: imageIds,
  });
}

/**
 * Lists every item in a collection.
 * @param collectionId The collection's id.
 * @returns The items, most recently updated first.
 */
export async function listItems(collectionId: string): Promise<Item[]> {
  const items = await store.listItems(collectionId);
  return items.sort((a, b) => b.updatedAt - a.updatedAt);
}

/**
 * Loads one item.
 * @param id The item's id.
 * @returns The item, or null if it does not exist.
 */
export function getItem(id: string): Promise<Item | null> {
  return store.getItem(id);
}

/**
 * Creates an item in a collection.
 * @param collectionId The collection to add the item to.
 * @param fields The item's fields. `title` must be non-blank; text is trimmed and tags normalized.
 * @param photo The item's photo: `replace` to give it one, anything else for none.
 * @returns The new item's id.
 */
export async function createItem(
  collectionId: string,
  fields: ItemFields,
  photo: PhotoUpdate,
): Promise<string> {
  const now = Date.now();
  const { imageId, changes } = applyPhotoUpdate(null, photo);
  const item: Item = {
    id: newId(),
    collectionId,
    title: fields.title.trim(),
    description: fields.description?.trim() || null,
    imageId,
    tags: normalizeTags(fields.tags),
    createdAt: now,
    updatedAt: now,
  };
  await store.commit({ ...changes, putItems: [item] });
  return item.id;
}

/**
 * Saves changes to an item and bumps its `updatedAt`.
 * @param id The item's id.
 * @param fields The item's new fields. `title` must be non-blank; text is trimmed and tags
 * normalized.
 * @param photo What to do with the item's photo. A replaced or removed photo is deleted.
 * @returns Resolves once saved.
 * @throws Error when the item no longer exists.
 */
export async function updateItem(id: string, fields: ItemFields, photo: PhotoUpdate): Promise<void> {
  const current = await store.getItem(id);
  if (!current) {
    throw new Error('This item no longer exists.');
  }
  const { imageId, changes } = applyPhotoUpdate(current.imageId, photo);
  await store.commit({
    ...changes,
    putItems: [
      {
        ...current,
        title: fields.title.trim(),
        description: fields.description?.trim() || null,
        imageId,
        tags: normalizeTags(fields.tags),
        updatedAt: Date.now(),
      },
    ],
  });
}

/**
 * Deletes an item and its photo.
 * @param id The item's id.
 * @returns Resolves once deleted.
 */
export async function deleteItem(id: string): Promise<void> {
  const current = await store.getItem(id);
  await store.commit({
    deleteItemIds: [id],
    deleteImageIds: current?.imageId ? [current.imageId] : [],
  });
}

/**
 * Gives a URL for displaying a stored photo.
 * @param imageId The image's id.
 * @returns The URL, or null if the image does not exist.
 */
export function imageUrl(imageId: string): Promise<string | null> {
  return store.imageUrl(imageId);
}
