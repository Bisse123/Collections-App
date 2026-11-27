import { archiveFileName, buildArchive, parseArchive, type CollectionArchive } from '../lib/archive';
import { planImport, reviewImport, type ImportChoices, type ImportReview } from '../lib/importDiff';
import { store } from './store';
import type { StoredImage } from './types';

/** An import file that has been read and compared with this device, waiting for the user. */
export interface PreparedImport {
  archive: CollectionArchive;
  review: ImportReview;
}

let pendingImport: PreparedImport | null = null;

/**
 * Packs a collection into an export file.
 * @param collectionId The collection to export.
 * @returns The file name to offer and the ZIP file's bytes.
 * @throws Error when the collection does not exist; ArchiveError when a photo is missing.
 */
export async function exportCollection(
  collectionId: string,
): Promise<{ fileName: string; bytes: Uint8Array }> {
  const collection = await store.getCollection(collectionId);
  if (!collection) {
    throw new Error('This collection no longer exists.');
  }
  const items = await store.listItems(collectionId);
  items.sort((a, b) => a.createdAt - b.createdAt);

  const images = new Map<string, StoredImage>();
  const imageIds = [collection.imageId, ...items.map((item) => item.imageId)].filter(
    (id): id is string => Boolean(id),
  );
  for (const id of imageIds) {
    const image = await store.getImage(id);
    if (image) {
      images.set(id, image);
    }
  }

  const bytes = buildArchive({ exportedAt: Date.now(), collection, items, images });
  return { fileName: archiveFileName(collection.name), bytes };
}

/**
 * Reads an import file and compares it with this device.
 * @param bytes The chosen file's contents.
 * @returns The parsed file and its review. Nothing is saved yet.
 * @throws ArchiveError when the file is not a valid collection export.
 */
export async function prepareImport(bytes: Uint8Array): Promise<PreparedImport> {
  const archive = parseArchive(bytes);
  const collection = await store.getCollection(archive.collection.id);
  const local = collection ? { collection, items: await store.listItems(collection.id) } : null;
  return { archive, review: reviewImport(local, archive) };
}

/**
 * Saves an import in one transaction, as decided on the review screen.
 * @param prepared The import from `prepareImport`.
 * @param choices What the user decided.
 * @returns The imported collection's id.
 */
export async function applyImport(prepared: PreparedImport, choices: ImportChoices): Promise<string> {
  await store.commit(planImport(prepared.review, prepared.archive, choices));
  return prepared.archive.collection.id;
}

/**
 * Hands a prepared import to the review screen.
 * @param prepared The import to review, or null to clear it.
 * @returns Nothing. Replaces any import already waiting.
 */
export function setPendingImport(prepared: PreparedImport | null): void {
  pendingImport = prepared;
}

/**
 * Gives the import waiting for review.
 * @returns The waiting import, or null when there is none (for example after a page reload).
 */
export function getPendingImport(): PreparedImport | null {
  return pendingImport;
}
