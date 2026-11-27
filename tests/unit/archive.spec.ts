import { expect, test } from '@playwright/test';
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';

import {
  ARCHIVE_FORMAT,
  ArchiveError,
  archiveFileName,
  buildArchive,
  parseArchive,
} from '../../src/lib/archive';
import { fakeImage, makeArchive, makeCollection, makeItem } from '../support/fixtures';

/**
 * Builds a ZIP whose collection.json is the given value.
 * @param manifest The value to store as collection.json.
 * @param extra Other files to add, by path.
 * @returns The ZIP's bytes.
 */
function zipWithManifest(manifest: unknown, extra: Record<string, Uint8Array> = {}): Uint8Array {
  return zipSync({ 'collection.json': strToU8(JSON.stringify(manifest)), ...extra });
}

/**
 * Builds a minimal valid collection.json.
 * @param overrides Top-level fields to change.
 * @returns The manifest object.
 */
function manifest(overrides: Record<string, unknown> = {}) {
  return {
    format: ARCHIVE_FORMAT,
    version: 1,
    exportedAt: 1,
    collection: { id: 'col-1', name: 'Cards', image: null, createdAt: 1, updatedAt: 1 },
    items: [],
    ...overrides,
  };
}

test.describe('collection archive', () => {
  test('round-trips a collection with items, tags and photos', () => {
    const archive = makeArchive(
      makeCollection({ imageId: 'img-c' }),
      [
        makeItem('a', { title: 'Charizard', description: 'Holo', tags: ['rare', 'a, b & c'], imageId: 'img-a' }),
        makeItem('b', { title: 'Pikachu' }),
      ],
      { 'img-c': fakeImage(1), 'img-a': fakeImage(2) },
    );

    const parsed = parseArchive(buildArchive(archive));

    expect(parsed.collection).toEqual(archive.collection);
    expect(parsed.items).toEqual(archive.items);
    expect([...parsed.images.keys()].sort()).toEqual(['img-a', 'img-c']);
    expect(parsed.images.get('img-a')).toEqual(fakeImage(2));
  });

  test('stores collection.json and an images folder', () => {
    const bytes = buildArchive(
      makeArchive(makeCollection(), [makeItem('a', { imageId: 'img-a' })], { 'img-a': fakeImage(3) }),
    );
    const files = unzipSync(bytes);

    expect(Object.keys(files).sort()).toEqual(['collection.json', 'images/img-a.jpg']);
    const json = JSON.parse(strFromU8(files['collection.json']));
    expect(json.format).toBe(ARCHIVE_FORMAT);
    expect(json.version).toBe(1);
    expect(json.items[0].image).toBe('images/img-a.jpg');
  });

  test('refuses to export when a referenced photo is missing', () => {
    const archive = makeArchive(makeCollection(), [makeItem('a', { imageId: 'gone' })]);
    expect(() => buildArchive(archive)).toThrow(ArchiveError);
  });

  test('rejects a file that is not a ZIP', () => {
    expect(() => parseArchive(strToU8('hello'))).toThrow(/not a collection file/);
  });

  test('rejects a ZIP without collection.json', () => {
    expect(() => parseArchive(zipSync({ 'other.txt': strToU8('x') }))).toThrow(/not a collection file/);
  });

  test('rejects a different format', () => {
    expect(() => parseArchive(zipWithManifest(manifest({ format: 'something-else' })))).toThrow(
      /not a collection file/,
    );
  });

  test('rejects files from a newer version', () => {
    expect(() => parseArchive(zipWithManifest(manifest({ version: 2 })))).toThrow(/newer version/);
  });

  test('rejects an item whose photo is not in the ZIP', () => {
    const items = [{ id: 'a', title: 'A', description: null, tags: [], image: 'images/a.jpg', createdAt: 1, updatedAt: 1 }];
    expect(() => parseArchive(zipWithManifest(manifest({ items })))).toThrow(/photo for item 1 is missing/);
  });

  test('rejects photo paths outside the images folder', () => {
    const items = [{ id: 'a', title: 'A', description: null, tags: [], image: '../evil.jpg', createdAt: 1, updatedAt: 1 }];
    expect(() => parseArchive(zipWithManifest(manifest({ items }), { '../evil.jpg': new Uint8Array([1]) }))).toThrow(
      ArchiveError,
    );
  });

  test('rejects duplicate item ids and invalid ids', () => {
    const item = { id: 'a', title: 'A', description: null, tags: [], image: null, createdAt: 1, updatedAt: 1 };
    expect(() => parseArchive(zipWithManifest(manifest({ items: [item, item] })))).toThrow(/appears twice/);
    expect(() => parseArchive(zipWithManifest(manifest({ items: [{ ...item, id: 'a/b' }] })))).toThrow(/invalid id/);
  });

  test('rejects items without a title', () => {
    const items = [{ id: 'a', title: '  ', description: null, tags: [], image: null, createdAt: 1, updatedAt: 1 }];
    expect(() => parseArchive(zipWithManifest(manifest({ items })))).toThrow(/title of item 1/);
  });

  test('normalizes tags and trims text from hand-edited files', () => {
    const items = [
      { id: 'a', title: ' A ', description: '  ', tags: [' Rare ', 'rare', 'a, b & c'], image: null, createdAt: 1, updatedAt: 1 },
    ];
    const [item] = parseArchive(zipWithManifest(manifest({ items }))).items;
    expect(item.title).toBe('A');
    expect(item.description).toBeNull();
    expect(item.tags).toEqual(['rare', 'a, b & c']);
    expect(item.collectionId).toBe('col-1');
  });

  test('builds safe file names', () => {
    expect(archiveFileName('Trading cards')).toBe('Trading cards.collection.zip');
    expect(archiveFileName('a/b:c*?')).toBe('abc.collection.zip');
    expect(archiveFileName('???')).toBe('Collection.collection.zip');
  });
});
