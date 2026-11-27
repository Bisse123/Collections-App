import { expect, test } from '@playwright/test';

import {
  defaultImportChoices,
  describeItemChange,
  planImport,
  reviewImport,
  type ImportChoices,
} from '../../src/lib/importDiff';
import { fakeImage, makeArchive, makeCollection, makeItem } from '../support/fixtures';

const FILE_WINS: ImportChoices = {
  removeLocalOnly: false,
  keepLocalItemIds: new Set(),
  keepLocalDetails: false,
};

test.describe('import review', () => {
  test('a collection that is not on this device is new', () => {
    const archive = makeArchive(makeCollection(), [makeItem('a'), makeItem('b')]);
    const review = reviewImport(null, archive);

    expect(review.local).toBeNull();
    expect(review.added.map((item) => item.id)).toEqual(['a', 'b']);
    expect(review.changed).toEqual([]);
    expect(review.localOnly).toEqual([]);
  });

  test('sorts items into new, changed, unchanged and only-on-this-device', () => {
    const local = {
      collection: makeCollection(),
      items: [makeItem('same'), makeItem('edited'), makeItem('mine')],
    };
    const archive = makeArchive(makeCollection(), [
      makeItem('same'),
      makeItem('edited', { title: 'New title', updatedAt: 2_000 }),
      makeItem('new'),
    ]);

    const review = reviewImport(local, archive);

    expect(review.added.map((item) => item.id)).toEqual(['new']);
    expect(review.changed.map((change) => change.local.id)).toEqual(['edited']);
    expect(review.changed[0].fields).toEqual(['title']);
    expect(review.changed[0].localIsNewer).toBe(false);
    expect(review.localOnly.map((item) => item.id)).toEqual(['mine']);
    expect(review.unchangedCount).toBe(1);
    expect(review.details).toBeNull();
  });

  test('matches items by id even when the name and title differ', () => {
    const local = { collection: makeCollection({ name: 'Old name' }), items: [makeItem('a', { title: 'Old' })] };
    const archive = makeArchive(makeCollection({ name: 'New name' }), [makeItem('a', { title: 'New' })]);

    const review = reviewImport(local, archive);

    expect(review.details?.nameChanged).toBe(true);
    expect(review.changed).toHaveLength(1);
    expect(review.added).toHaveLength(0);
  });

  test('ignores tag order and timestamps when comparing', () => {
    const local = { collection: makeCollection(), items: [makeItem('a', { tags: ['x', 'y'], updatedAt: 9_000 })] };
    const archive = makeArchive(makeCollection(), [makeItem('a', { tags: ['y', 'x'], updatedAt: 1_000 })]);

    expect(reviewImport(local, archive).unchangedCount).toBe(1);
  });

  test('flags items edited on this device after the file version', () => {
    const local = { collection: makeCollection(), items: [makeItem('a', { title: 'Mine', updatedAt: 3_000 })] };
    const archive = makeArchive(makeCollection(), [makeItem('a', { title: 'Theirs', updatedAt: 2_000 })]);

    const review = reviewImport(local, archive);

    expect(review.changed[0].localIsNewer).toBe(true);
    expect(defaultImportChoices(review).keepLocalItemIds.has('a')).toBe(true);
  });

  test('describes changes field by field', () => {
    const local = {
      collection: makeCollection(),
      items: [makeItem('a', { title: 'Old', tags: ['keep', 'gone'], imageId: 'img-1' })],
    };
    const archive = makeArchive(
      makeCollection(),
      [makeItem('a', { title: 'New', description: 'Now described', tags: ['keep', 'added'], imageId: null })],
      {},
    );

    expect(describeItemChange(reviewImport(local, archive).changed[0])).toEqual([
      'Title: "Old" → "New"',
      'Description added',
      'Tags: +added, −gone',
      'Photo removed',
    ]);
  });
});

test.describe('import plan', () => {
  test('a new collection writes the collection, its items and their photos', () => {
    const archive = makeArchive(
      makeCollection({ imageId: 'img-c' }),
      [makeItem('a', { imageId: 'img-a' }), makeItem('b')],
      { 'img-c': fakeImage(1), 'img-a': fakeImage(2) },
    );

    const changes = planImport(reviewImport(null, archive), archive, FILE_WINS);

    expect(changes.putCollections).toEqual([archive.collection]);
    expect(changes.putItems?.map((item) => item.id)).toEqual(['a', 'b']);
    expect(changes.putImages?.map((image) => image.id).sort()).toEqual(['img-a', 'img-c']);
    expect(changes.deleteItemIds).toEqual([]);
    expect(changes.deleteImageIds).toEqual([]);
  });

  test('"keep them" adds and updates but keeps items only on this device', () => {
    const local = { collection: makeCollection(), items: [makeItem('edited'), makeItem('mine')] };
    const archive = makeArchive(makeCollection(), [
      makeItem('edited', { title: 'Updated', updatedAt: 2_000 }),
      makeItem('new'),
    ]);

    const changes = planImport(reviewImport(local, archive), archive, FILE_WINS);

    expect(changes.putItems?.map((item) => `${item.id}:${item.title}`)).toEqual(['new:Item new', 'edited:Updated']);
    expect(changes.deleteItemIds).toEqual([]);
    expect(changes.putCollections).toEqual([]);
  });

  test('"remove them" also deletes items only on this device and their photos', () => {
    const local = {
      collection: makeCollection(),
      items: [makeItem('kept'), makeItem('mine', { imageId: 'img-mine' })],
    };
    const archive = makeArchive(makeCollection(), [makeItem('kept')]);

    const changes = planImport(reviewImport(local, archive), archive, { ...FILE_WINS, removeLocalOnly: true });

    expect(changes.deleteItemIds).toEqual(['mine']);
    expect(changes.deleteImageIds).toEqual(['img-mine']);
  });

  test('keeping this device\'s newer version leaves the item alone', () => {
    const local = { collection: makeCollection(), items: [makeItem('a', { title: 'Mine', updatedAt: 3_000 })] };
    const archive = makeArchive(makeCollection(), [makeItem('a', { title: 'Theirs', updatedAt: 2_000 })]);
    const review = reviewImport(local, archive);

    const kept = planImport(review, archive, defaultImportChoices(review));
    const replaced = planImport(review, archive, { ...defaultImportChoices(review), keepLocalItemIds: new Set() });

    expect(kept.putItems).toEqual([]);
    expect(replaced.putItems?.[0].title).toBe('Theirs');
  });

  test('the file always wins when it has the newer edit', () => {
    const local = { collection: makeCollection(), items: [makeItem('a', { title: 'Mine', updatedAt: 1_000 })] };
    const archive = makeArchive(makeCollection(), [makeItem('a', { title: 'Theirs', updatedAt: 2_000 })]);
    const review = reviewImport(local, archive);

    const changes = planImport(review, archive, { ...FILE_WINS, keepLocalItemIds: new Set(['a']) });

    expect(changes.putItems?.[0].title).toBe('Theirs');
  });

  test('collection name follows the same rule', () => {
    const local = { collection: makeCollection({ name: 'Mine', updatedAt: 3_000 }), items: [] };
    const archive = makeArchive(makeCollection({ name: 'Theirs', updatedAt: 2_000 }), []);
    const review = reviewImport(local, archive);

    expect(review.details?.localIsNewer).toBe(true);
    expect(planImport(review, archive, defaultImportChoices(review)).putCollections).toEqual([]);
    expect(planImport(review, archive, FILE_WINS).putCollections?.[0].name).toBe('Theirs');
  });

  test('replacing a photo stores the new one and deletes the old one', () => {
    const local = { collection: makeCollection(), items: [makeItem('a', { imageId: 'img-old' })] };
    const archive = makeArchive(makeCollection(), [makeItem('a', { imageId: 'img-new', updatedAt: 2_000 })], {
      'img-new': fakeImage(9),
    });

    const changes = planImport(reviewImport(local, archive), archive, FILE_WINS);

    expect(changes.putImages?.map((image) => image.id)).toEqual(['img-new']);
    expect(changes.deleteImageIds).toEqual(['img-old']);
  });

  test('photos already on this device are not written again', () => {
    const local = { collection: makeCollection(), items: [makeItem('a', { imageId: 'img-1' })] };
    const archive = makeArchive(
      makeCollection(),
      [makeItem('a', { imageId: 'img-1', title: 'Renamed', updatedAt: 2_000 })],
      { 'img-1': fakeImage(1) },
    );

    const changes = planImport(reviewImport(local, archive), archive, FILE_WINS);

    expect(changes.putImages).toEqual([]);
    expect(changes.deleteImageIds).toEqual([]);
  });
});
