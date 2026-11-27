import { expect, test, type Page } from '@playwright/test';

import {
  acceptNextDialog,
  addItem,
  addTag,
  choosePhoto,
  createCollection,
  dismissNextDialog,
  openHome,
  rows,
  saveForm,
  PHOTO,
  visibleText,
} from './helpers';

/**
 * Finds an item row in the open collection.
 * @param page The page, showing a collection.
 * @param title The item's title.
 * @returns The row's locator.
 */
function itemRow(page: Page, title: string) {
  return page.getByRole('link', { name: title, exact: true });
}

test.describe('items', () => {
  test.beforeEach(async ({ page }) => {
    await openHome(page);
    await createCollection(page, 'Cards');
  });

  test('adds an item with every field', async ({ page }) => {
    await addItem(page, {
      title: 'Charizard',
      description: 'Base set, holo',
      tags: ['Rare', 'a, b & c'],
      photo: PHOTO,
    });

    const row = itemRow(page, 'Charizard');
    await expect(row).toContainText('Base set, holo');
    await expect(row).toContainText('#rare  #a, b & c');
    await expect(row.locator('img')).toBeVisible();

    await row.click();
    await expect(page.getByRole('heading', { name: 'Charizard' })).toBeVisible();
    await expect(visibleText(page, 'Base set, holo')).toBeVisible();
    await expect(visibleText(page, 'rare')).toBeVisible();
    await expect(visibleText(page, 'a, b & c')).toBeVisible();
    await expect(page.getByRole('img', { name: 'Photo of Charizard' })).toBeVisible();

    await openHome(page);
    await expect(page.getByRole('link', { name: 'Cards' })).toContainText('1 item');
  });

  test('a typed tag is only added when confirmed', async ({ page }) => {
    await page.getByRole('button', { name: 'Add item' }).click();
    await page.getByLabel('Title').fill('Pikachu');
    await page.getByLabel('New tag').fill('draft');
    await page.getByLabel('Title').click();

    await expect(page.getByLabel('New tag')).toHaveValue('draft');
    await expect(visibleText(page, 'draft  ×')).toHaveCount(0);

    await page.getByLabel('New tag').press('Enter');
    await expect(visibleText(page, 'draft  ×')).toBeVisible();
    await expect(page.getByLabel('New tag')).toHaveValue('');
  });

  test('suggests tags already used in the collection', async ({ page }) => {
    await addItem(page, { title: 'Charizard', tags: ['holo'] });
    await page.getByRole('button', { name: 'Add item' }).click();
    await page.getByLabel('Title').fill('Blastoise');
    await visibleText(page, '+ holo').click();
    await expect(visibleText(page, 'holo  ×')).toBeVisible();
    await saveForm(page);

    await expect(itemRow(page, 'Blastoise')).toContainText('#holo');
  });

  test('cannot save an item without a title', async ({ page }) => {
    await page.getByRole('button', { name: 'Add item' }).click();
    await page.getByLabel('Description').fill('No title');
    await expect(page.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  test('edits an item', async ({ page }) => {
    await addItem(page, { title: 'Charizard', description: 'Old text', tags: ['rare', 'holo'], photo: PHOTO });
    await itemRow(page, 'Charizard').click();
    await page.getByRole('button', { name: 'Edit' }).click();

    await expect(page.getByLabel('Title')).toHaveValue('Charizard');
    await page.getByLabel('Title').fill('Charizard (graded)');
    await page.getByLabel('Description').fill('New text');
    await visibleText(page, 'holo  ×').click();
    await addTag(page, 'psa 9');
    await page.getByRole('button', { name: 'Remove photo' }).click();
    await saveForm(page);

    await expect(page.getByRole('heading', { name: 'Charizard (graded)' })).toBeVisible();
    await expect(visibleText(page, 'New text')).toBeVisible();
    await expect(visibleText(page, 'psa 9')).toBeVisible();
    await expect(visibleText(page, 'holo')).toHaveCount(0);
    await expect(page.getByRole('img', { name: 'Photo of Charizard (graded)' })).toHaveCount(0);

    await page.reload();
    await expect(page.getByRole('heading', { name: 'Charizard (graded)' })).toBeVisible();
  });

  test('adds a photo to an existing item', async ({ page }) => {
    await addItem(page, { title: 'Mew' });
    await itemRow(page, 'Mew').click();
    await page.getByRole('button', { name: 'Edit' }).click();
    await choosePhoto(page);
    await saveForm(page);

    await expect(page.getByRole('img', { name: 'Photo of Mew' })).toBeVisible();
  });

  test('deletes an item after confirming', async ({ page }) => {
    await addItem(page, { title: 'Charizard' });
    await addItem(page, { title: 'Pikachu' });
    await itemRow(page, 'Charizard').click();

    const cancelled = dismissNextDialog(page);
    await page.getByRole('button', { name: 'Delete item' }).click();
    expect(await cancelled).toContain('Delete "Charizard"?');
    await expect(page.getByRole('heading', { name: 'Charizard' })).toBeVisible();

    const confirmed = acceptNextDialog(page);
    await page.getByRole('button', { name: 'Delete item' }).click();
    await confirmed;

    await expect(itemRow(page, 'Pikachu')).toBeVisible();
    await expect(itemRow(page, 'Charizard')).toHaveCount(0);
  });

  test('searches items and filters them by tag', async ({ page }) => {
    await addItem(page, { title: 'Charizard', description: 'fire', tags: ['holo', 'rare'] });
    await addItem(page, { title: 'Blastoise', tags: ['holo'] });
    await addItem(page, { title: 'Pikachu', tags: ['common'] });

    await page.getByPlaceholder('Search titles and descriptions').fill('fire');
    await expect(rows(page)).toHaveText([/Charizard/]);
    await page.getByPlaceholder('Search titles and descriptions').fill('');

    await page.getByRole('button', { name: 'Filter by tag' }).click();
    await page.getByPlaceholder('Search tags').fill('ho');
    await expect(page.getByRole('checkbox')).toHaveText([/holo/]);
    await page.getByRole('checkbox', { name: /holo/ }).click();
    await expect(page.getByRole('checkbox', { name: /holo/ })).toBeChecked();
    await page.getByPlaceholder('Search tags').fill('zzz');
    await expect(visibleText(page, 'No tags match “zzz”')).toBeVisible();
    await page.getByRole('button', { name: 'Done' }).click();

    await expect(page.getByRole('button', { name: 'Filter by tag' })).toHaveText('Tags · 1');
    await expect(rows(page)).toHaveText([/Blastoise/, /Charizard/]);
    await expect(visibleText(page, 'Showing 2 of 3')).toBeVisible();

    await visibleText(page, 'holo  ×').click();
    await expect(rows(page)).toHaveCount(3);
  });

  test('shrinks large photos before saving them', async ({ page }) => {
    const dataUrl = await page.evaluate(() => {
      const canvas = document.createElement('canvas');
      canvas.width = 3000;
      canvas.height = 2000;
      const context = canvas.getContext('2d')!;
      context.fillStyle = '#3a7';
      context.fillRect(0, 0, 3000, 2000);
      return canvas.toDataURL('image/png');
    });
    const big = { name: 'big.png', mimeType: 'image/png', buffer: Buffer.from(dataUrl.split(',')[1], 'base64') };

    await addItem(page, { title: 'Poster', photo: big });
    await itemRow(page, 'Poster').click();

    const photo = page.getByRole('img', { name: 'Photo of Poster' });
    await expect(photo).toBeVisible();
    await expect
      .poll(() =>
        photo.evaluate((element) => {
          const img = (element.tagName === 'IMG' ? element : element.querySelector('img')) as HTMLImageElement;
          return [img.naturalWidth, img.naturalHeight];
        }),
      )
      .toEqual([1280, 853]);
  });
});
