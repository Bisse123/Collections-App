import type { Collection, CollectionStore, Item, StoreChanges, StoredImage } from './types';

const DB_NAME = 'collections-app';
const DB_VERSION = 1;
const COLLECTIONS = 'collections';
const ITEMS = 'items';
const IMAGES = 'images';
const ITEMS_BY_COLLECTION = 'byCollection';

interface ImageRecord {
  id: string;
  /** The file's bytes. Stored as an ArrayBuffer because some browsers cannot store Blobs. */
  bytes: ArrayBuffer;
  mimeType: string;
}

/**
 * Wraps an IndexedDB request in a promise.
 * @param request Any IndexedDB request.
 * @returns Resolves with the request's result, or rejects with its error.
 */
function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Waits for an IndexedDB transaction to finish.
 * @param transaction The transaction, after all of its requests have been queued.
 * @returns Resolves once it commits; rejects if it fails or is aborted.
 */
function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error('The browser refused to save the data.'));
    transaction.onabort = () => reject(transaction.error ?? new Error('The browser cancelled the save.'));
  });
}

/**
 * Opens the browser database, creating or upgrading its tables when needed.
 * @returns The open database.
 */
function openDatabase(): Promise<IDBDatabase> {
  const request = indexedDB.open(DB_NAME, DB_VERSION);
  request.onupgradeneeded = () => {
    const db = request.result;
    if (!db.objectStoreNames.contains(COLLECTIONS)) {
      db.createObjectStore(COLLECTIONS, { keyPath: 'id' });
    }
    if (!db.objectStoreNames.contains(ITEMS)) {
      const items = db.createObjectStore(ITEMS, { keyPath: 'id' });
      items.createIndex(ITEMS_BY_COLLECTION, 'collectionId');
    }
    if (!db.objectStoreNames.contains(IMAGES)) {
      db.createObjectStore(IMAGES, { keyPath: 'id' });
    }
  };
  return requestResult(request);
}

/**
 * Asks the browser not to clear this site's data when space runs low. Browsers may say no; the
 * answer is ignored either way.
 * @returns Nothing. May show a browser permission prompt in some browsers.
 */
function requestPersistentStorage(): void {
  navigator.storage?.persist?.().catch(() => undefined);
}

/**
 * Creates the store that keeps everything in the browser's IndexedDB. Photos are stored as raw bytes.
 * @returns A store backed by the `collections-app` IndexedDB database of the current site.
 */
export function createIndexedDbStore(): CollectionStore {
  let database: Promise<IDBDatabase> | null = null;
  const objectUrls = new Map<string, string>();

  /**
   * Opens the database on first use and reuses it afterwards.
   * @returns The open database.
   */
  const db = () => {
    database ??= openDatabase();
    return database;
  };

  /**
   * Runs one read request against a table.
   * @param storeName The table to read.
   * @param run Builds the request from the table.
   * @returns The request's result.
   */
  const read = async <T>(storeName: string, run: (store: IDBObjectStore) => IDBRequest<T>) => {
    const transaction = (await db()).transaction(storeName, 'readonly');
    return requestResult(run(transaction.objectStore(storeName)));
  };

  /**
   * Loads a raw image record.
   * @param id The image's id.
   * @returns The record, or undefined if there is none.
   */
  const getImageRecord = (id: string) =>
    read<ImageRecord | undefined>(IMAGES, (store) => store.get(id));

  return {
    async listCollections() {
      return read<Collection[]>(COLLECTIONS, (store) => store.getAll());
    },

    async getCollection(id) {
      return (await read<Collection | undefined>(COLLECTIONS, (store) => store.get(id))) ?? null;
    },

    async listItems(collectionId) {
      return read<Item[]>(ITEMS, (store) => store.index(ITEMS_BY_COLLECTION).getAll(collectionId));
    },

    async getItem(id) {
      return (await read<Item | undefined>(ITEMS, (store) => store.get(id))) ?? null;
    },

    async getImage(id): Promise<StoredImage | null> {
      const record = await getImageRecord(id);
      if (!record) {
        return null;
      }
      return { bytes: new Uint8Array(record.bytes), mimeType: record.mimeType };
    },

    async imageUrl(id) {
      const cached = objectUrls.get(id);
      if (cached) {
        return cached;
      }
      const record = await getImageRecord(id);
      if (!record) {
        return null;
      }
      const url = URL.createObjectURL(new Blob([record.bytes], { type: record.mimeType }));
      objectUrls.set(id, url);
      return url;
    },

    async commit(changes: StoreChanges) {
      const transaction = (await db()).transaction([COLLECTIONS, ITEMS, IMAGES], 'readwrite');
      const done = transactionDone(transaction);
      const collections = transaction.objectStore(COLLECTIONS);
      const items = transaction.objectStore(ITEMS);
      const images = transaction.objectStore(IMAGES);

      changes.putCollections?.forEach((collection) => collections.put(collection));
      changes.deleteCollectionIds?.forEach((id) => collections.delete(id));
      changes.putItems?.forEach((item) => items.put(item));
      changes.deleteItemIds?.forEach((id) => items.delete(id));
      changes.putImages?.forEach(({ id, image }) => {
        const record: ImageRecord = { id, bytes: image.bytes.slice().buffer, mimeType: image.mimeType };
        images.put(record);
      });
      changes.deleteImageIds?.forEach((id) => images.delete(id));

      await done;
      requestPersistentStorage();

      for (const id of changes.deleteImageIds ?? []) {
        const url = objectUrls.get(id);
        if (url) {
          URL.revokeObjectURL(url);
          objectUrls.delete(id);
        }
      }
    },
  };
}
