import { expect, test } from '@playwright/test';

import { gridLayout } from '../../src/lib/layout';

const COLLECTIONS = { tileWidth: 180, gap: 16, padding: 16, portraitColumns: 2 };

test.describe('grid layout', () => {
  test('portrait windows use the portrait column count', () => {
    expect(gridLayout(390, 844, COLLECTIONS)).toEqual({ landscape: false, columns: 2 });
    expect(gridLayout(800, 1000, COLLECTIONS)).toEqual({ landscape: false, columns: 2 });
  });

  test('a square window counts as portrait', () => {
    expect(gridLayout(700, 700, COLLECTIONS).landscape).toBe(false);
  });

  test('landscape windows fit as many fixed-width tiles as there is room for', () => {
    expect(gridLayout(1280, 720, COLLECTIONS)).toEqual({ landscape: true, columns: 6 });
    expect(gridLayout(844, 390, COLLECTIONS)).toEqual({ landscape: true, columns: 4 });
  });

  test('a tile that exactly fits counts', () => {
    expect(gridLayout(16 + 180 + 16 + 180 + 16, 100, COLLECTIONS).columns).toBe(2);
    expect(gridLayout(16 + 180 + 16 + 180 + 15, 100, COLLECTIONS).columns).toBe(1);
  });

  test('always has at least one column', () => {
    expect(gridLayout(150, 100, COLLECTIONS).columns).toBe(1);
  });
});
