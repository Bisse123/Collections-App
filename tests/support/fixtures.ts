import type { Collection, Item, StoredImage } from '../../src/data/types';
import type { CollectionArchive } from '../../src/lib/archive';

/** A valid 1×1 red PNG. */
export const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

/**
 * Builds a stored image with recognisable bytes.
 * @param marker A byte value to fill it with, so different images differ.
 * @returns A fake JPEG image (the bytes are not a real JPEG; archive code does not decode them).
 */
export function fakeImage(marker: number): StoredImage {
  return { bytes: new Uint8Array([0xff, 0xd8, marker, marker, 0xff, 0xd9]), mimeType: 'image/jpeg' };
}

/**
 * Builds a collection record.
 * @param overrides Fields to change from the defaults.
 * @returns The collection.
 */
export function makeCollection(overrides: Partial<Collection> = {}): Collection {
  return {
    id: 'col-1',
    name: 'Trading cards',
    imageId: null,
    createdAt: 1_000,
    updatedAt: 1_000,
    ...overrides,
  };
}

/**
 * Builds an item record in collection `col-1`.
 * @param id The item's id.
 * @param overrides Fields to change from the defaults.
 * @returns The item.
 */
export function makeItem(id: string, overrides: Partial<Item> = {}): Item {
  return {
    id,
    collectionId: 'col-1',
    title: `Item ${id}`,
    description: null,
    imageId: null,
    tags: [],
    createdAt: 1_000,
    updatedAt: 1_000,
    ...overrides,
  };
}

/**
 * Builds an archive from records, collecting the images they reference.
 * @param collection The collection.
 * @param items Its items.
 * @param images Every image the records reference, by id.
 * @returns The archive.
 */
export function makeArchive(
  collection: Collection,
  items: Item[],
  images: Record<string, StoredImage> = {},
): CollectionArchive {
  return { exportedAt: 5_000, collection, items, images: new Map(Object.entries(images)) };
}
