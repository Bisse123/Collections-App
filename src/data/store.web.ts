import { createIndexedDbStore } from './indexedDbStore';
import type { CollectionStore } from './types';

/** Whether this platform has a store. The website keeps its data in IndexedDB. */
export const storeSupported = true;

/** The app's data store, kept in this browser's IndexedDB. */
export const store: CollectionStore = createIndexedDbStore();
