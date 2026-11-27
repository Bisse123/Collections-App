/** A collection's own details. Its items are stored separately. */
export interface Collection {
  /** Unique id that stays the same across devices, exports and imports. */
  id: string;
  name: string;
  /** Id of the collection's own photo, or null when it has none. */
  imageId: string | null;
  createdAt: number;
  /** When the collection's name or photo last changed (ms since epoch). */
  updatedAt: number;
}

/** A collection with the extra figures the home screen shows. */
export interface CollectionSummary extends Collection {
  itemCount: number;
  /**
   * Id of the image shown on the collection's card: its own photo when it has one, otherwise the
   * most recently updated item photo.
   */
  coverImageId: string | null;
}

/** One item in a collection. */
export interface Item {
  /** Unique id that stays the same across devices, exports and imports. */
  id: string;
  collectionId: string;
  title: string;
  description: string | null;
  /** Id of the item's photo, or null when it has none. */
  imageId: string | null;
  /** Normalized tags, see `normalizeTags`. */
  tags: string[];
  createdAt: number;
  /** When any of the item's fields last changed (ms since epoch). */
  updatedAt: number;
}

/** A stored photo's file contents. */
export interface StoredImage {
  bytes: Uint8Array;
  /** MIME type such as `image/jpeg`. */
  mimeType: string;
}

/** A set of writes that a store applies all together or not at all. */
export interface StoreChanges {
  putCollections?: Collection[];
  deleteCollectionIds?: string[];
  putItems?: Item[];
  deleteItemIds?: string[];
  putImages?: { id: string; image: StoredImage }[];
  deleteImageIds?: string[];
}

/**
 * Where the app keeps its data. Each platform supplies one implementation; the rest of the app only
 * talks to this interface. Stores do no bookkeeping of their own (timestamps, cascading deletes,
 * unused photos): `src/data/collections.ts` works those out and passes complete changes to `commit`.
 */
export interface CollectionStore {
  /**
   * Lists every collection.
   * @returns All collections, in no particular order.
   */
  listCollections(): Promise<Collection[]>;
  /**
   * Loads one collection.
   * @param id The collection's id.
   * @returns The collection, or null if there is none with that id.
   */
  getCollection(id: string): Promise<Collection | null>;
  /**
   * Lists the items of one collection.
   * @param collectionId The collection's id.
   * @returns Its items, in no particular order. Empty when the collection has none or does not
   * exist.
   */
  listItems(collectionId: string): Promise<Item[]>;
  /**
   * Loads one item.
   * @param id The item's id.
   * @returns The item, or null if there is none with that id.
   */
  getItem(id: string): Promise<Item | null>;
  /**
   * Loads a stored photo's contents.
   * @param id The image's id.
   * @returns The photo, or null if there is none with that id.
   */
  getImage(id: string): Promise<StoredImage | null>;
  /**
   * Gives a URL that an image component can display.
   * @param id The image's id.
   * @returns The URL, or null if there is no image with that id. The URL stays valid until the
   * image is deleted.
   */
  imageUrl(id: string): Promise<string | null>;
  /**
   * Applies a set of writes in one transaction: either all of them are saved or none are.
   * @param changes Records to insert or replace, and ids to delete. Deleting an id that does not
   * exist is not an error.
   * @returns Resolves once the changes are saved.
   */
  commit(changes: StoreChanges): Promise<void>;
}
