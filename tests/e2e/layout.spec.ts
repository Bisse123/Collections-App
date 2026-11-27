import { expect, test, type Locator, type Page } from '@playwright/test';

import { addItem, createCollection, openHome, rows } from './helpers';

const LANDSCAPE = { width: 1280, height: 720 };
const PORTRAIT = { width: 500, height: 900 };

/**
 * Waits for a number of elements to be on screen and measures them all in one step, so a list
 * that re-renders (for example after a resize) cannot change between measurements.
 * @param locator The elements to measure.
 * @param count How many there should be.
 * @returns Each element's position and size, in document order.
 */
async function boxes(locator: Locator, count: number) {
  await expect(locator).toHaveCount(count);
  return locator.evaluateAll((elements) =>
    elements.map((element) => {
      const rect = element.getBoundingClientRect();
      return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
    }),
  );
}

/**
 * Counts how many distinct rows a set of boxes sits in.
 * @param measured The boxes.
 * @returns The number of different top edges.
 */
function rowCount(measured: { y: number }[]): number {
  return new Set(measured.map((box) => Math.round(box.y))).size;
}

/**
 * Creates collections from the home screen and returns to it.
 * @param page The page, showing the home screen.
 * @param names The collections' names.
 * @returns Resolves once the page is back on the home screen.
 */
async function createCollections(page: Page, names: string[]): Promise<void> {
  for (const name of names) {
    await createCollection(page, name);
    await openHome(page);
  }
}

test.describe('layout', () => {
  test('landscape shows fixed-size collection tiles, as many per row as fit', async ({ page }) => {
    await page.setViewportSize(LANDSCAPE);
    await openHome(page);
    await createCollections(page, ['A', 'B', 'C', 'D', 'E', 'F', 'G']);

    const measured = await boxes(rows(page), 7);
    for (const box of measured) {
      expect(box.width).toBeCloseTo(180, 0);
    }
    expect(rowCount(measured.slice(0, 6))).toBe(1);
    expect(measured[6].y).toBeGreaterThan(measured[0].y);
  });

  test('portrait shows two stretched collection tiles per row', async ({ page }) => {
    await page.setViewportSize(PORTRAIT);
    await openHome(page);
    await createCollections(page, ['A', 'B', 'C']);

    const measured = await boxes(rows(page), 3);
    const expectedWidth = (PORTRAIT.width - 16 * 3) / 2;
    for (const box of measured) {
      expect(box.width).toBeCloseTo(expectedWidth, 0);
    }
    expect(rowCount(measured)).toBe(2);
  });

  test('rotating switches between the layouts', async ({ page }) => {
    await page.setViewportSize(PORTRAIT);
    await openHome(page);
    await createCollections(page, ['A', 'B', 'C']);
    expect(rowCount(await boxes(rows(page), 3))).toBe(2);

    await page.setViewportSize(LANDSCAPE);
    await expect.poll(async () => rowCount(await boxes(rows(page), 3))).toBe(1);
    expect((await boxes(rows(page), 3))[0].width).toBeCloseTo(180, 0);
  });

  test('landscape shows items in fixed-width columns; portrait in one full-width column', async ({ page }) => {
    await page.setViewportSize(LANDSCAPE);
    await openHome(page);
    await createCollection(page, 'Cards');
    for (const title of ['One', 'Two', 'Three', 'Four']) {
      await addItem(page, { title });
    }

    const landscape = await boxes(rows(page), 4);
    for (const box of landscape) {
      expect(box.width).toBeCloseTo(360, 0);
    }
    expect(rowCount(landscape.slice(0, 3))).toBe(1);
    expect(landscape[3].y).toBeGreaterThan(landscape[0].y);

    await page.setViewportSize(PORTRAIT);
    await expect.poll(async () => rowCount(await boxes(rows(page), 4))).toBe(4);
    for (const box of await boxes(rows(page), 4)) {
      expect(box.width).toBeCloseTo(PORTRAIT.width - 32, 0);
    }
  });
});
