import { expect, test, type Browser, type Page } from '@playwright/test';

import { buildArchive, parseArchive, type CollectionArchive } from '../../src/lib/archive';
import {
  acceptNextDialog,
  addItem,
  chooseImportFile,
  createCollection,
  exportOpenCollection,
  openHome,
  PHOTO,
  rows,
  saveForm,
  stubShareSheet,
  visibleText,
} from './helpers';

/**
 * Sets up a collection with three items (one with a photo, one with tags) and exports it.
 * @param page The page, showing the home screen.
 * @returns The collection's id, the exported file and its parsed contents. The page ends on the
 * collection screen.
 */
async function createAndExport(page: Page) {
  const id = await createCollection(page, 'Cards', PHOTO);
  await addItem(page, { title: 'Alpha', description: 'First', tags: ['rare', 'a, b & c'] });
  await addItem(page, { title: 'Beta' });
  await addItem(page, { title: 'Gamma', photo: PHOTO });
  const file = await exportOpenCollection(page);
  return { id, file, archive: parseArchive(file.bytes) };
}

/**
 * Opens a second, empty browser profile, like another device visiting the site.
 * @param browser The test's browser.
 * @param baseURL The site's address.
 * @returns A page on the home screen of the new profile.
 */
async function openOtherDevice(browser: Browser, baseURL: string | undefined): Promise<Page> {
  const context = await browser.newContext({ baseURL });
  const page = await context.newPage();
  await openHome(page);
  return page;
}

/**
 * Finds an item in an archive by title.
 * @param archive The archive.
 * @param title The item's title.
 * @returns The item.
 */
function itemByTitle(archive: CollectionArchive, title: string) {
  const item = archive.items.find((candidate) => candidate.title === title);
  if (!item) {
    throw new Error(`No item called ${title}`);
  }
  return item;
}

test.describe('export', () => {
  test.beforeEach(async ({ page }) => {
    await stubShareSheet(page);
    await openHome(page);
  });

  test('exports a ZIP with the collection, its items, tags and photos', async ({ page }) => {
    const { id, file, archive } = await createAndExport(page);

    expect(file.name).toBe('Cards.collection.zip');
    expect(archive.collection.id).toBe(id);
    expect(archive.collection.name).toBe('Cards');
    expect(archive.collection.imageId).not.toBeNull();
    expect(archive.items.map((item) => item.title).sort()).toEqual(['Alpha', 'Beta', 'Gamma']);
    expect(itemByTitle(archive, 'Alpha')).toMatchObject({ description: 'First', tags: ['rare', 'a, b & c'] });
    expect(itemByTitle(archive, 'Gamma').imageId).not.toBeNull();
    expect(archive.images.size).toBe(2);
    for (const image of archive.images.values()) {
      expect(image.mimeType).toBe('image/jpeg');
      expect([...image.bytes.slice(0, 2)]).toEqual([0xff, 0xd8]);
    }
  });

  test('downloads on computers and opens the share sheet on phones', async ({ page, isMobile }) => {
    await createCollection(page, 'Cards');
    const file = await exportOpenCollection(page);
    expect(file.via).toBe(isMobile ? 'share' : 'download');
  });
});

test.describe('import', () => {
  test.beforeEach(async ({ page }) => {
    await stubShareSheet(page);
    await openHome(page);
  });

  test('imports a new collection on another device, keeping its id', async ({ page, browser, baseURL }) => {
    const { id, file } = await createAndExport(page);
    const other = await openOtherDevice(browser, baseURL);

    await chooseImportFile(other, file.name, file.bytes);
    await expect(visibleText(other, 'This is a new collection. Importing adds it with 3 items.')).toBeVisible();
    await other.getByRole('button', { name: 'Import collection' }).click();

    await expect(other).toHaveURL(new RegExp(`/collection/${id}$`));
    await expect(rows(other)).toHaveCount(3);
    await expect(other.getByRole('link', { name: 'Alpha' })).toContainText('#rare  #a, b & c');
    await expect(other.getByRole('link', { name: 'Gamma' }).locator('img')).toBeVisible();

    await openHome(other);
    const card = other.getByRole('link', { name: 'Cards' });
    await expect(card).toContainText('3 items');
    await expect(card.locator('img')).toBeVisible();
    await other.context().close();
  });

  test('importing the same file again changes nothing', async ({ page }) => {
    const { file } = await createAndExport(page);
    await openHome(page);

    await chooseImportFile(page, file.name, file.bytes);
    await expect(visibleText(page, /already up to date/)).toBeVisible();
    await page.getByRole('button', { name: 'Done' }).click();
    await expect(page.getByRole('link', { name: 'Cards' })).toContainText('3 items');
  });

  test('recognises the collection by id and shows the differences', async ({ page }) => {
    const { file, archive } = await createAndExport(page);
    const later = Date.now() + 60_000;
    const alpha = itemByTitle(archive, 'Alpha');
    const changed = buildArchive({
      ...archive,
      collection: { ...archive.collection, name: 'Cards v2', updatedAt: later },
      items: [
        { ...alpha, title: 'Alpha (graded)', tags: ['rare', 'psa 9'], updatedAt: later },
        itemByTitle(archive, 'Beta'),
        { ...alpha, id: 'new-item-delta', title: 'Delta', tags: [], description: null, createdAt: later, updatedAt: later },
      ],
    });
    await openHome(page);

    await chooseImportFile(page, file.name, changed);

    await expect(page.getByRole('heading', { name: 'Collection details' })).toBeVisible();
    await expect(visibleText(page, 'Name: "Cards" → "Cards v2"')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'New items (1)' })).toBeVisible();
    await expect(visibleText(page, 'Delta')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Changed items (1)' })).toBeVisible();
    await expect(visibleText(page, 'Title: "Alpha" → "Alpha (graded)"')).toBeVisible();
    await expect(visibleText(page, 'Tags: +psa 9, −a, b & c')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Only on this device (1)' })).toBeVisible();
    await expect(visibleText(page, 'Gamma')).toBeVisible();
    await expect(visibleText(page, '1 item unchanged.')).toBeVisible();
    await expect(page.getByRole('radiogroup', { name: /Version of/ })).toHaveCount(0);
  });

  test('"keep them" adds new items, updates changed ones and keeps the rest', async ({ page }) => {
    const { id, file, archive } = await createAndExport(page);
    const later = Date.now() + 60_000;
    const changed = buildArchive({
      ...archive,
      collection: { ...archive.collection, name: 'Cards v2', updatedAt: later },
      items: [
        { ...itemByTitle(archive, 'Alpha'), title: 'Alpha (graded)', updatedAt: later },
        { ...itemByTitle(archive, 'Beta'), id: 'new-item-delta', title: 'Delta', createdAt: later, updatedAt: later },
      ],
    });
    await openHome(page);

    await chooseImportFile(page, file.name, changed);
    await expect(page.getByRole('radio', { name: 'Keep them' })).toBeChecked();
    await page.getByRole('button', { name: 'Update collection' }).click();

    await expect(page).toHaveURL(new RegExp(`/collection/${id}$`));
    await expect(visibleText(page, 'Cards v2')).toBeVisible();
    await expect(rows(page)).toHaveCount(4);
    for (const title of ['Alpha (graded)', 'Beta', 'Gamma', 'Delta']) {
      await expect(page.getByRole('link', { name: title })).toBeVisible();
    }
  });

  test('"remove them" makes the collection match the file', async ({ page }) => {
    const { file, archive } = await createAndExport(page);
    const onlyAlpha = buildArchive({ ...archive, items: [itemByTitle(archive, 'Alpha')] });
    await openHome(page);

    await chooseImportFile(page, file.name, onlyAlpha);
    await expect(page.getByRole('heading', { name: 'Only on this device (2)' })).toBeVisible();
    await page.getByRole('radio', { name: 'Remove them' }).click();
    const confirm = acceptNextDialog(page);
    await page.getByRole('button', { name: 'Update collection' }).click();
    expect(await confirm).toContain('Delete 2 items?');

    await expect(rows(page)).toHaveCount(1);
    await expect(page.getByRole('link', { name: 'Alpha' })).toBeVisible();
  });

  test('lets the user pick when this device has the newer edit', async ({ page }) => {
    const { file, archive } = await createAndExport(page);
    await page.getByRole('link', { name: 'Beta' }).click();
    await page.getByRole('button', { name: 'Edit' }).click();
    await page.getByLabel('Title').fill('Beta (mine)');
    await saveForm(page);

    const older = buildArchive({
      ...archive,
      items: archive.items.map((item) => (item.title === 'Beta' ? { ...item, title: 'Beta (theirs)' } : item)),
    });
    await openHome(page);
    await chooseImportFile(page, file.name, older);

    const picker = page.getByRole('radiogroup', { name: 'Version of Beta (theirs)' });
    await expect(picker).toBeVisible();
    await expect(visibleText(page, /^Edited on this device .*, after the file's version/)).toBeVisible();
    await expect(picker.getByRole('radio', { name: "Keep this device's" })).toBeChecked();
    await page.getByRole('button', { name: 'Update collection' }).click();
    await expect(page.getByRole('link', { name: 'Beta (mine)' })).toBeVisible();

    await openHome(page);
    await chooseImportFile(page, file.name, older);
    await page.getByRole('radiogroup', { name: 'Version of Beta (theirs)' }).getByRole('radio', { name: "Use the file's" }).click();
    await page.getByRole('button', { name: 'Update collection' }).click();
    await expect(page.getByRole('link', { name: 'Beta (theirs)' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Beta (mine)' })).toHaveCount(0);
  });

  test('imported photos survive the round trip', async ({ page, browser, baseURL }) => {
    const { file } = await createAndExport(page);
    const other = await openOtherDevice(browser, baseURL);
    await chooseImportFile(other, file.name, file.bytes);
    await other.getByRole('button', { name: 'Import collection' }).click();
    await expect(rows(other)).toHaveCount(3);

    await stubShareSheet(other);
    const again = await exportOpenCollection(other);
    const original = parseArchive(file.bytes);
    const roundTripped = parseArchive(again.bytes);
    expect(roundTripped.collection).toEqual(original.collection);
    expect(roundTripped.items.map((item) => item.id).sort()).toEqual(original.items.map((item) => item.id).sort());
    for (const [imageId, image] of original.images) {
      expect(roundTripped.images.get(imageId)?.bytes).toEqual(image.bytes);
    }
    await other.context().close();
  });

  test('rejects a file that is not a collection export', async ({ page }) => {
    const message = acceptNextDialog(page);
    await chooseImportFile(page, 'notes.zip', new TextEncoder().encode('just some text'));
    expect(await message).toContain('This is not a collection file');
    await expect(page.getByRole('button', { name: 'New collection' })).toBeVisible();
  });
});
