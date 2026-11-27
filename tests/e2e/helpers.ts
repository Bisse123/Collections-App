import { readFile } from 'node:fs/promises';

import { expect, type Locator, type Page } from '@playwright/test';

import { TINY_PNG } from '../support/fixtures';

/** A file to hand to the browser's file picker. */
export interface UploadFile {
  name: string;
  mimeType: string;
  buffer: Buffer;
}

/** A small valid PNG photo. */
export const PHOTO: UploadFile = { name: 'photo.png', mimeType: 'image/png', buffer: TINY_PNG };

/** Fields for `addItem`. */
export interface NewItem {
  title: string;
  description?: string;
  tags?: string[];
  photo?: UploadFile;
}

/**
 * Finds visible text. Screens lower in the navigation stack stay in the page but hidden, so plain
 * text lookups can match them too.
 * @param page The page.
 * @param text The exact text.
 * @returns A locator for the first visible element with that text.
 */
export function visibleText(page: Page, text: string | RegExp): Locator {
  return page.getByText(text, { exact: typeof text === 'string' }).filter({ visible: true }).first();
}

/**
 * Presses Save in the open form and waits until saving has finished and the form has closed.
 * @param page The page, showing a collection or item form.
 * @returns Resolves once neither "Save" nor "Saving…" is on screen.
 */
export async function saveForm(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByRole('button', { name: /^(Save|Saving…)$/ })).toHaveCount(0);
}

/**
 * Lists the item rows (or collection cards) on screen, leaving out the header's back link.
 * @param page The page.
 * @returns A locator matching every visible link that has text.
 */
export function rows(page: Page): Locator {
  return page.getByRole('link').filter({ hasText: /\S/ });
}

/**
 * Opens the home screen and waits for it to load. A first load parses all of the site's code, which
 * can take a while when several browsers run at once, so it gets a longer timeout.
 * @param page The page.
 * @returns Resolves once the "New collection" button is visible.
 */
export async function openHome(page: Page): Promise<void> {
  await page.goto('./');
  await expect(page.getByRole('button', { name: 'New collection' })).toBeVisible({ timeout: 30_000 });
}

/**
 * Accepts the next browser dialog (confirm or alert) and records its text.
 * @param page The page.
 * @returns A promise of the dialog's message, resolved once it has been accepted.
 */
export function acceptNextDialog(page: Page): Promise<string> {
  return new Promise((resolve) => {
    page.once('dialog', async (dialog) => {
      const message = dialog.message();
      await dialog.accept();
      resolve(message);
    });
  });
}

/**
 * Dismisses (cancels) the next browser dialog.
 * @param page The page.
 * @returns A promise of the dialog's message, resolved once it has been dismissed.
 */
export function dismissNextDialog(page: Page): Promise<string> {
  return new Promise((resolve) => {
    page.once('dialog', async (dialog) => {
      const message = dialog.message();
      await dialog.dismiss();
      resolve(message);
    });
  });
}

/**
 * Picks a photo in the open form through the file picker.
 * @param page The page, showing a collection or item form.
 * @param photo The file to pick.
 * @returns Resolves once the form shows the photo.
 */
export async function choosePhoto(page: Page, photo: UploadFile = PHOTO): Promise<void> {
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: /^(Add photo|Change photo)$/ }).click();
  await (await chooser).setFiles(photo);
  await expect(page.getByRole('button', { name: 'Change photo' })).toBeVisible();
}

/**
 * Creates a collection from the home screen.
 * @param page The page, showing the home screen.
 * @param name The collection's name.
 * @param photo A photo to give it, or undefined for none.
 * @returns The new collection's id, read from the URL. The page ends on the collection screen.
 */
export async function createCollection(page: Page, name: string, photo?: UploadFile): Promise<string> {
  await page.getByRole('button', { name: 'New collection' }).click();
  await page.getByLabel('Name', { exact: true }).fill(name);
  if (photo) {
    await choosePhoto(page, photo);
  }
  await page.getByRole('button', { name: 'Create' }).click();
  await expect(page).toHaveURL(/\/collection\/[0-9a-f-]{36}$/);
  await expect(page.getByRole('button', { name: 'Add item' })).toBeVisible();
  return page.url().split('/').pop()!;
}

/**
 * Adds an item from the collection screen.
 * @param page The page, showing a collection.
 * @param item The item's fields. Tags are typed one at a time and confirmed with Enter.
 * @returns Resolves once the page is back on the collection screen showing the item.
 */
export async function addItem(page: Page, item: NewItem): Promise<void> {
  await page.getByRole('button', { name: 'Add item' }).click();
  await page.getByLabel('Title').fill(item.title);
  if (item.description) {
    await page.getByLabel('Description').fill(item.description);
  }
  for (const tag of item.tags ?? []) {
    await addTag(page, tag);
  }
  if (item.photo) {
    await choosePhoto(page, item.photo);
  }
  await saveForm(page);
  await expect(page.getByRole('button', { name: 'Add item' })).toBeVisible();
  await expect(visibleText(page, item.title)).toBeVisible();
}

/**
 * Types a tag into the item form's tag field and confirms it with Enter.
 * @param page The page, showing the item form.
 * @param tag The tag text.
 * @returns Resolves once the tag chip is shown.
 */
export async function addTag(page: Page, tag: string): Promise<void> {
  const field = page.getByLabel('New tag');
  await field.fill(tag);
  await field.press('Enter');
  await expect(visibleText(page, `${tag.toLowerCase()}  ×`)).toBeVisible();
}

/**
 * Makes `navigator.share` record shared files instead of opening a share sheet, so phone-sized
 * test runs can capture an export. Must be called before the page loads.
 * @param page The page.
 * @returns Resolves once the stub is installed for future page loads.
 */
export async function stubShareSheet(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const target = window as unknown as { __sharedFile?: { name: string; bytes: number[] } };
    Object.defineProperty(navigator, 'canShare', { configurable: true, value: () => true });
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: async ({ files }: { files: File[] }) => {
        const file = files[0];
        target.__sharedFile = { name: file.name, bytes: Array.from(new Uint8Array(await file.arrayBuffer())) };
      },
    });
  });
}

/**
 * Exports the open collection and captures the file, whether the app downloads it (desktop) or
 * shares it (touch devices; requires `stubShareSheet`).
 * @param page The page, showing a collection.
 * @returns The exported file's name and bytes, and how it was delivered.
 */
export async function exportOpenCollection(
  page: Page,
): Promise<{ name: string; bytes: Uint8Array; via: 'download' | 'share' }> {
  const download = page.waitForEvent('download').then(async (file) => ({
    name: file.suggestedFilename(),
    bytes: new Uint8Array(await readFile(await file.path())),
    via: 'download' as const,
  }));
  const shared = page
    .waitForFunction(() => (window as unknown as { __sharedFile?: unknown }).__sharedFile)
    .then(async (handle) => {
      const value = (await handle.jsonValue()) as { name: string; bytes: number[] };
      return { name: value.name, bytes: new Uint8Array(value.bytes), via: 'share' as const };
    });
  download.catch(() => undefined);
  shared.catch(() => undefined);
  await page.getByRole('button', { name: 'Export' }).click();
  return Promise.race([download, shared]);
}

/**
 * Starts an import from the home screen with the given file.
 * @param page The page, showing the home screen.
 * @param name The file name to give the file.
 * @param bytes The file's contents.
 * @returns Resolves once the file has been handed to the picker.
 */
export async function chooseImportFile(page: Page, name: string, bytes: Uint8Array): Promise<void> {
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Import' }).click();
  await (await chooser).setFiles({ name, mimeType: 'application/zip', buffer: Buffer.from(bytes) });
}
