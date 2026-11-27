import type { Collection, Item, StoreChanges } from '../data/types';
import type { CollectionArchive } from './archive';

/** An item field that can differ between this device and an import file. */
export type ChangedField = 'title' | 'description' | 'tags' | 'photo';

/** An item that exists both on this device and in the file, with different contents. */
export interface ItemChange {
  local: Item;
  incoming: Item;
  /** Which fields differ, in display order. */
  fields: ChangedField[];
  /**
   * True when this device's version was edited after the file's version. The user then picks which
   * version to keep; otherwise the file's version is used.
   */
  localIsNewer: boolean;
}

/** How the collection's own name and photo differ between this device and the file. */
export interface DetailsChange {
  local: Collection;
  incoming: Collection;
  nameChanged: boolean;
  photoChanged: boolean;
  /** True when this device's name/photo were edited after the file's; the user then picks. */
  localIsNewer: boolean;
}

/** Everything an import would change, for showing to the user before applying it. */
export interface ImportReview {
  /** The matching collection on this device, or null when the file's collection is new here. */
  local: Collection | null;
  /** Every item of the matching collection on this device (empty for a new collection). */
  localItems: Item[];
  incoming: Collection;
  /** Name/photo differences, or null when they are the same (or the collection is new). */
  details: DetailsChange | null;
  /** Items in the file that are not on this device. */
  added: Item[];
  changed: ItemChange[];
  /** Items on this device that are not in the file. */
  localOnly: Item[];
  /** How many items are the same on both sides. */
  unchangedCount: number;
}

/** What the user decided on the review screen. */
export interface ImportChoices {
  /** True deletes the items that are only on this device; false keeps them. */
  removeLocalOnly: boolean;
  /**
   * Ids of changed items to leave as they are on this device. Only honoured for items whose
   * `localIsNewer` is true; every other changed item takes the file's version.
   */
  keepLocalItemIds: ReadonlySet<string>;
  /** True keeps this device's name and photo. Only honoured when `details.localIsNewer` is true. */
  keepLocalDetails: boolean;
}

/**
 * Checks whether two tag lists hold the same tags, ignoring order.
 * @param a First list of normalized tags.
 * @param b Second list of normalized tags.
 * @returns True when both hold exactly the same tags.
 */
function sameTags(a: string[], b: string[]): boolean {
  if (a.length !== b.length) {
    return false;
  }
  const set = new Set(a);
  return b.every((tag) => set.has(tag));
}

/**
 * Lists the fields that differ between two versions of an item.
 * @param local This device's version.
 * @param incoming The file's version.
 * @returns The differing fields; empty when the versions match.
 */
function changedFields(local: Item, incoming: Item): ChangedField[] {
  const fields: ChangedField[] = [];
  if (local.title !== incoming.title) {
    fields.push('title');
  }
  if ((local.description ?? null) !== (incoming.description ?? null)) {
    fields.push('description');
  }
  if (!sameTags(local.tags, incoming.tags)) {
    fields.push('tags');
  }
  if (local.imageId !== incoming.imageId) {
    fields.push('photo');
  }
  return fields;
}

/**
 * Compares an import file with what is on this device.
 * @param local The collection with the file's collection id on this device, with all of its items,
 * or null when there is none.
 * @param archive The parsed import file.
 * @returns The differences, grouped for the review screen. Items keep the file's order.
 */
export function reviewImport(
  local: { collection: Collection; items: Item[] } | null,
  archive: CollectionArchive,
): ImportReview {
  if (!local) {
    return {
      local: null,
      localItems: [],
      incoming: archive.collection,
      details: null,
      added: archive.items,
      changed: [],
      localOnly: [],
      unchangedCount: 0,
    };
  }

  const localById = new Map(local.items.map((item) => [item.id, item]));
  const incomingIds = new Set(archive.items.map((item) => item.id));
  const added: Item[] = [];
  const changed: ItemChange[] = [];
  let unchangedCount = 0;

  for (const incoming of archive.items) {
    const localItem = localById.get(incoming.id);
    if (!localItem) {
      added.push(incoming);
      continue;
    }
    const fields = changedFields(localItem, incoming);
    if (fields.length === 0) {
      unchangedCount += 1;
    } else {
      changed.push({ local: localItem, incoming, fields, localIsNewer: localItem.updatedAt > incoming.updatedAt });
    }
  }

  const nameChanged = local.collection.name !== archive.collection.name;
  const photoChanged = local.collection.imageId !== archive.collection.imageId;
  const details: DetailsChange | null =
    nameChanged || photoChanged
      ? {
          local: local.collection,
          incoming: archive.collection,
          nameChanged,
          photoChanged,
          localIsNewer: local.collection.updatedAt > archive.collection.updatedAt,
        }
      : null;

  return {
    local: local.collection,
    localItems: local.items,
    incoming: archive.collection,
    details,
    added,
    changed,
    localOnly: local.items.filter((item) => !incomingIds.has(item.id)),
    unchangedCount,
  };
}

/**
 * Describes how an item differs between this device and the file, one line per changed field.
 * @param change The changed item.
 * @returns Lines such as `Title: "Old" → "New"`, `Tags: +rare, −common`, `Photo changed`.
 */
export function describeItemChange(change: ItemChange): string[] {
  const { local, incoming } = change;
  return change.fields.map((field) => {
    switch (field) {
      case 'title':
        return `Title: "${local.title}" → "${incoming.title}"`;
      case 'description':
        if (!local.description) {
          return 'Description added';
        }
        return incoming.description ? 'Description changed' : 'Description removed';
      case 'tags': {
        const added = incoming.tags.filter((tag) => !local.tags.includes(tag)).map((tag) => `+${tag}`);
        const removed = local.tags.filter((tag) => !incoming.tags.includes(tag)).map((tag) => `−${tag}`);
        return `Tags: ${[...added, ...removed].join(', ')}`;
      }
      case 'photo':
        if (!local.imageId) {
          return 'Photo added';
        }
        return incoming.imageId ? 'Photo changed' : 'Photo removed';
    }
  });
}

/**
 * The choices the review screen starts with: keep items that are only on this device, and where
 * this device has the newer edit, keep this device's version.
 * @param review The import's review.
 * @returns The starting choices.
 */
export function defaultImportChoices(review: ImportReview): ImportChoices {
  return {
    removeLocalOnly: false,
    keepLocalItemIds: new Set(review.changed.filter((change) => change.localIsNewer).map((change) => change.local.id)),
    keepLocalDetails: review.details?.localIsNewer ?? false,
  };
}

/**
 * Works out the exact store writes for an import.
 * @param review The import's review, from `reviewImport`.
 * @param archive The parsed import file the review was made from.
 * @param choices What the user decided.
 * @returns The changes to commit in one transaction: records to write with the file's ids and
 * timestamps, items to delete, photos to add, and photos that nothing refers to any more.
 */
export function planImport(
  review: ImportReview,
  archive: CollectionArchive,
  choices: ImportChoices,
): StoreChanges {
  const putCollections: Collection[] = [];
  if (!review.local) {
    putCollections.push(archive.collection);
  } else if (review.details && !(review.details.localIsNewer && choices.keepLocalDetails)) {
    putCollections.push(archive.collection);
  }

  const putItems: Item[] = [
    ...review.added,
    ...review.changed
      .filter((change) => !(change.localIsNewer && choices.keepLocalItemIds.has(change.local.id)))
      .map((change) => change.incoming),
  ];
  const deleteItemIds = choices.removeLocalOnly ? review.localOnly.map((item) => item.id) : [];

  const imagesBefore = new Set<string>();
  const finalCollection = putCollections[0] ?? review.local;
  const finalItems = new Map(review.localItems.map((item) => [item.id, item]));
  for (const record of [review.local, ...review.localItems]) {
    if (record?.imageId) {
      imagesBefore.add(record.imageId);
    }
  }
  for (const item of putItems) {
    finalItems.set(item.id, item);
  }
  for (const id of deleteItemIds) {
    finalItems.delete(id);
  }
  const imagesAfter = new Set<string>();
  for (const record of [finalCollection, ...finalItems.values()]) {
    if (record?.imageId) {
      imagesAfter.add(record.imageId);
    }
  }

  const putImages = [...imagesAfter]
    .filter((id) => !imagesBefore.has(id))
    .map((id) => {
      const image = archive.images.get(id);
      if (!image) {
        throw new Error(`The photo ${id} is missing from the import file.`);
      }
      return { id, image };
    });

  return {
    putCollections,
    putItems,
    deleteItemIds,
    putImages,
    deleteImageIds: [...imagesBefore].filter((id) => !imagesAfter.has(id)),
  };
}
