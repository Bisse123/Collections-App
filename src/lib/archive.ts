import { strFromU8, strToU8, unzipSync, zipSync, type Zippable } from 'fflate';

import type { Collection, Item, StoredImage } from '../data/types';
import { normalizeTags } from './tags';

/** Value of `format` in `collection.json`; identifies files made by this app. */
export const ARCHIVE_FORMAT = 'collections-app/collection';
/** Newest `collection.json` version this code writes and reads. */
export const ARCHIVE_VERSION = 1;

const MANIFEST_NAME = 'collection.json';
const MAX_FILE_BYTES = 50 * 1024 * 1024;
const ID_PATTERN = /^[A-Za-z0-9-]{1,64}$/;
const IMAGE_PATH_PATTERN = /^images\/([A-Za-z0-9-]{1,64})\.(jpg|jpeg|png|webp|gif)$/;
const EXTENSION_BY_TYPE: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};
const TYPE_BY_EXTENSION: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
};

/** One collection with its items and photos, as stored in an export file. */
export interface CollectionArchive {
  /** When the file was made (ms since epoch). */
  exportedAt: number;
  collection: Collection;
  /** The items; each one's `collectionId` is `collection.id`. */
  items: Item[];
  /** Every photo referenced by the collection or its items, by image id. */
  images: Map<string, StoredImage>;
}

/** Thrown when a file is not a valid collection export. The message is shown to the user. */
export class ArchiveError extends Error {
  /**
   * Creates the error.
   * @param message What is wrong with the file, phrased for the user.
   */
  constructor(message: string) {
    super(message);
    this.name = 'ArchiveError';
  }
}

/**
 * Builds the path a photo is stored at inside the ZIP.
 * @param imageId The image's id.
 * @param image The photo, whose MIME type picks the extension.
 * @returns A path such as `images/<id>.jpg`.
 */
function imagePath(imageId: string, image: StoredImage): string {
  return `images/${imageId}.${EXTENSION_BY_TYPE[image.mimeType] ?? 'jpg'}`;
}

/**
 * Packs a collection, its items and their photos into a ZIP file: `collection.json` plus an
 * `images/` folder.
 * @param archive The collection to pack. Every image id it references must be in `images`.
 * @returns The ZIP file's bytes.
 * @throws ArchiveError when a referenced photo is missing from `images`.
 */
export function buildArchive(archive: CollectionArchive): Uint8Array {
  const files: Zippable = {};
  /**
   * Adds a photo to the ZIP.
   * @param imageId The photo's id, or null for none.
   * @returns The photo's path inside the ZIP, or null for none.
   */
  const pathFor = (imageId: string | null) => {
    if (!imageId) {
      return null;
    }
    const image = archive.images.get(imageId);
    if (!image) {
      throw new ArchiveError(`A photo (${imageId}) is missing, so the collection could not be exported.`);
    }
    const path = imagePath(imageId, image);
    files[path] = [image.bytes, { level: 0 }];
    return path;
  };

  const { collection } = archive;
  const manifest = {
    format: ARCHIVE_FORMAT,
    version: ARCHIVE_VERSION,
    exportedAt: archive.exportedAt,
    collection: {
      id: collection.id,
      name: collection.name,
      image: pathFor(collection.imageId),
      createdAt: collection.createdAt,
      updatedAt: collection.updatedAt,
    },
    items: archive.items.map((item) => ({
      id: item.id,
      title: item.title,
      description: item.description,
      tags: item.tags,
      image: pathFor(item.imageId),
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    })),
  };
  files[MANIFEST_NAME] = strToU8(JSON.stringify(manifest, null, 2));
  return zipSync(files);
}

/**
 * Checks that a value is a plain object.
 * @param value Anything.
 * @param what How to name the value in the error message.
 * @returns The value, typed as a record.
 * @throws ArchiveError when it is not an object.
 */
function expectObject(value: unknown, what: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new ArchiveError(`The file is damaged: ${what} is missing.`);
  }
  return value as Record<string, unknown>;
}

/**
 * Checks that a value is an id made of letters, digits and dashes.
 * @param value Anything.
 * @param what How to name the value in the error message.
 * @returns The id.
 * @throws ArchiveError when it is not a valid id.
 */
function expectId(value: unknown, what: string): string {
  if (typeof value !== 'string' || !ID_PATTERN.test(value)) {
    throw new ArchiveError(`The file is damaged: ${what} has an invalid id.`);
  }
  return value;
}

/**
 * Checks that a value is a non-blank string.
 * @param value Anything.
 * @param what How to name the value in the error message.
 * @returns The trimmed string.
 * @throws ArchiveError when it is not a non-blank string.
 */
function expectText(value: unknown, what: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new ArchiveError(`The file is damaged: ${what} is missing.`);
  }
  return value.trim();
}

/**
 * Checks that a value is a timestamp.
 * @param value Anything.
 * @param what How to name the value in the error message.
 * @returns The timestamp in ms since epoch.
 * @throws ArchiveError when it is not a finite number.
 */
function expectTime(value: unknown, what: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new ArchiveError(`The file is damaged: ${what} has an invalid date.`);
  }
  return value;
}

/**
 * Reads a collection export made by `buildArchive`.
 * @param bytes The ZIP file's contents.
 * @returns The collection, items and photos in the file. Tags are normalized and text trimmed.
 * @throws ArchiveError when the file is not a ZIP, is not a collection export, was made by a newer
 * version of the app, or is damaged.
 */
export function parseArchive(bytes: Uint8Array): CollectionArchive {
  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(bytes, {
      filter: (file) =>
        (file.name === MANIFEST_NAME || IMAGE_PATH_PATTERN.test(file.name)) &&
        file.originalSize <= MAX_FILE_BYTES,
    });
  } catch {
    throw new ArchiveError('This is not a collection file. Choose a .zip file exported from Collections.');
  }

  const manifestBytes = files[MANIFEST_NAME];
  if (!manifestBytes) {
    throw new ArchiveError('This is not a collection file. Choose a .zip file exported from Collections.');
  }
  let manifestValue: unknown;
  try {
    manifestValue = JSON.parse(strFromU8(manifestBytes));
  } catch {
    throw new ArchiveError('The file is damaged: collection.json could not be read.');
  }
  const manifest = expectObject(manifestValue, 'collection.json');
  if (manifest.format !== ARCHIVE_FORMAT) {
    throw new ArchiveError('This is not a collection file. Choose a .zip file exported from Collections.');
  }
  if (typeof manifest.version !== 'number' || manifest.version > ARCHIVE_VERSION) {
    throw new ArchiveError('This file was made by a newer version of Collections. Update the app and try again.');
  }

  const images = new Map<string, StoredImage>();
  /**
   * Reads a photo reference and collects the photo into `images`.
   * @param value The `image` field: a path inside the ZIP, or null/undefined for none.
   * @param what How to name the owner in the error message.
   * @returns The photo's image id, or null for none.
   * @throws ArchiveError when the path is invalid or the photo is not in the ZIP.
   */
  const readImage = (value: unknown, what: string): string | null => {
    if (value === null || value === undefined) {
      return null;
    }
    const match = typeof value === 'string' ? IMAGE_PATH_PATTERN.exec(value) : null;
    const data = match ? files[value as string] : undefined;
    if (!match || !data) {
      throw new ArchiveError(`The file is damaged: the photo for ${what} is missing.`);
    }
    images.set(match[1], { bytes: data, mimeType: TYPE_BY_EXTENSION[match[2]] });
    return match[1];
  };

  const rawCollection = expectObject(manifest.collection, 'the collection');
  const collection: Collection = {
    id: expectId(rawCollection.id, 'the collection'),
    name: expectText(rawCollection.name, 'the collection name'),
    imageId: readImage(rawCollection.image, 'the collection'),
    createdAt: expectTime(rawCollection.createdAt, 'the collection'),
    updatedAt: expectTime(rawCollection.updatedAt, 'the collection'),
  };

  if (!Array.isArray(manifest.items)) {
    throw new ArchiveError('The file is damaged: the item list is missing.');
  }
  const seenIds = new Set<string>();
  const items = manifest.items.map((value, index): Item => {
    const raw = expectObject(value, `item ${index + 1}`);
    const what = `item ${index + 1}`;
    const id = expectId(raw.id, what);
    if (seenIds.has(id)) {
      throw new ArchiveError(`The file is damaged: ${what} appears twice.`);
    }
    seenIds.add(id);
    if (raw.description !== null && raw.description !== undefined && typeof raw.description !== 'string') {
      throw new ArchiveError(`The file is damaged: the description of ${what} is invalid.`);
    }
    if (!Array.isArray(raw.tags) || raw.tags.some((tag) => typeof tag !== 'string')) {
      throw new ArchiveError(`The file is damaged: the tags of ${what} are invalid.`);
    }
    return {
      id,
      collectionId: collection.id,
      title: expectText(raw.title, `the title of ${what}`),
      description: typeof raw.description === 'string' ? raw.description.trim() || null : null,
      imageId: readImage(raw.image, what),
      tags: normalizeTags(raw.tags as string[]),
      createdAt: expectTime(raw.createdAt, what),
      updatedAt: expectTime(raw.updatedAt, what),
    };
  });

  return {
    exportedAt: typeof manifest.exportedAt === 'number' ? manifest.exportedAt : 0,
    collection,
    items,
    images,
  };
}

/**
 * Builds a file name for exporting a collection.
 * @param collectionName The collection's display name.
 * @returns A name safe on every common file system, such as `Trading cards.collection.zip`.
 */
export function archiveFileName(collectionName: string): string {
  const safe = collectionName.replace(/[\\/:*?"<>|\u0000-\u001f]/g, '').trim().slice(0, 80);
  return `${safe || 'Collection'}.collection.zip`;
}
