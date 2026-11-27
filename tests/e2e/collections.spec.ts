import { expect, test } from '@playwright/test';

import {
  acceptNextDialog,
  choosePhoto,
  createCollection,
  dismissNextDialog,
  openHome,
  rows,
  saveForm,
  PHOTO,
  visibleText,
} from './helpers';

test.describe('collections', () => {
  test.beforeEach(async ({ page }) => {
    await openHome(page);
  });

  test('shows an empty state on the first visit', async ({ page }) => {
    await expect(visibleText(page, 'No collections yet')).toBeVisible();
  });

  test('creates a collection', async ({ page }) => {
    await createCollection(page, 'Trading cards');
    await expect(visibleText(page, 'Nothing here yet')).toBeVisible();

    await openHome(page);
    const card = page.getByRole('link', { name: 'Trading cards' });
    await expect(card).toBeVisible();
    await expect(card).toContainText('0 items');
    await expect(card).toContainText('T');
  });

  test('creates a collection with a photo shown on its card', async ({ page }) => {
    await createCollection(page, 'Plants', PHOTO);

    await openHome(page);
    await expect(page.getByRole('link', { name: 'Plants' }).locator('img')).toBeVisible();
  });

  test('renames a collection and removes its photo', async ({ page }) => {
    await createCollection(page, 'Vinyl', PHOTO);

    await page.getByRole('button', { name: 'Edit' }).click();
    await expect(page.getByLabel('Name', { exact: true })).toHaveValue('Vinyl');
    await expect(page.getByRole('button', { name: 'Change photo' })).toBeVisible();
    await page.getByLabel('Name', { exact: true }).fill('Records');
    await page.getByRole('button', { name: 'Remove photo' }).click();
    await expect(page.getByRole('button', { name: 'Add photo' })).toBeVisible();
    await saveForm(page);

    await expect(visibleText(page, 'Records')).toBeVisible();
    await openHome(page);
    const card = page.getByRole('link', { name: 'Records' });
    await expect(card).toBeVisible();
    await expect(card.locator('img')).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Vinyl' })).toHaveCount(0);
  });

  test('replaces a collection photo', async ({ page }) => {
    await createCollection(page, 'Coins');
    await page.getByRole('button', { name: 'Edit' }).click();
    await choosePhoto(page);
    await saveForm(page);

    await openHome(page);
    await expect(page.getByRole('link', { name: 'Coins' }).locator('img')).toBeVisible();
  });

  test('cancelling the delete confirmation keeps the collection', async ({ page }) => {
    await createCollection(page, 'Stamps');
    await page.getByRole('button', { name: 'Edit' }).click();

    const message = dismissNextDialog(page);
    await page.getByRole('button', { name: 'Delete collection' }).click();
    expect(await message).toContain('Delete "Stamps"?');

    await saveForm(page);
    await openHome(page);
    await expect(page.getByRole('link', { name: 'Stamps' })).toBeVisible();
  });

  test('deletes a collection', async ({ page }) => {
    await createCollection(page, 'Stamps');
    await page.getByRole('button', { name: 'Edit' }).click();

    const message = acceptNextDialog(page);
    await page.getByRole('button', { name: 'Delete collection' }).click();
    expect(await message).toContain('0 items');

    await expect(visibleText(page, 'No collections yet')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Stamps' })).toHaveCount(0);
  });

  test('keeps data after a reload and opens deep links directly', async ({ page }) => {
    const id = await createCollection(page, 'Comics');

    await page.reload();
    await expect(visibleText(page, 'Comics')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Add item' })).toBeVisible();

    await page.goto(`collection/${id}`);
    await expect(visibleText(page, 'Comics')).toBeVisible();

    await openHome(page);
    await expect(page.getByRole('link', { name: 'Comics' })).toBeVisible();
  });

  test('lists collections alphabetically', async ({ page }) => {
    await createCollection(page, 'zebra figures');
    await openHome(page);
    await createCollection(page, 'Apples');
    await openHome(page);
    await createCollection(page, 'mugs');
    await openHome(page);

    await expect(rows(page)).toHaveText([/Apples/, /mugs/, /zebra figures/]);
  });
});
