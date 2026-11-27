import type { CollectionStore } from './types';

/**
 * Whether this platform has a store. Only the website has one so far; to support the phone apps,
 * add `store.native.ts` exporting a `CollectionStore` (for example backed by `expo-sqlite`) and set
 * this to true there.
 */
export const storeSupported = false;

/**
 * Rejects every call with an explanation.
 * @returns Never resolves; always rejects.
 */
function unsupported(): Promise<never> {
  return Promise.reject(new Error('Saving data is only supported on the website so far.'));
}

/** The app's data store. On this platform every call rejects; see `storeSupported`. */
export const store: CollectionStore = {
  listCollections: unsupported,
  getCollection: unsupported,
  listItems: unsupported,
  getItem: unsupported,
  getImage: unsupported,
  imageUrl: unsupported,
  commit: unsupported,
};
