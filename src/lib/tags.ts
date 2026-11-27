import type { Item } from '../db/repository';

/** How multiple selected tags combine when filtering. */
export type TagMatchMode = 'any' | 'all';

/**
 * Cleans a single tag: trims whitespace, collapses inner spaces and lowercases it so "Rare" and
 * " rare " count as the same tag.
 * @param tag The raw tag text.
 * @returns The normalized tag, or an empty string if nothing is left.
 */
export function normalizeTag(tag: string): string {
  return tag.trim().replace(/\s+/g, ' ').toLowerCase();
}

/**
 * Normalizes a list of tags and removes blanks and duplicates, keeping first-seen order.
 * @param tags Raw tags in any form.
 * @returns The cleaned, de-duplicated tags.
 */
export function normalizeTags(tags: string[]): string[] {
  const seen = new Set<string>();
  for (const tag of tags) {
    const cleaned = normalizeTag(tag);
    if (cleaned) {
      seen.add(cleaned);
    }
  }
  return [...seen];
}

/**
 * Splits text typed into the tag field on commas into separate tags.
 * @param text Text such as "rare, holo,first edition".
 * @returns The normalized tags found in the text.
 */
export function parseTagText(text: string): string[] {
  return normalizeTags(text.split(','));
}

/**
 * Counts how many items carry each tag.
 * @param items The items to count over.
 * @returns Tag/count pairs sorted by count (highest first), then alphabetically.
 */
export function countTags(items: Item[]): { tag: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const item of items) {
    for (const tag of item.tags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}

/**
 * Filters items by selected tags and a free-text search.
 * @param items All items in the collection.
 * @param selectedTags Tags the user picked. An empty list applies no tag filter.
 * @param mode 'any' keeps items with at least one selected tag; 'all' keeps items with every one.
 * @param query Text matched case-insensitively against title and description. Blank matches all.
 * @returns The items that pass both filters, in their original order.
 */
export function filterItems(
  items: Item[],
  selectedTags: string[],
  mode: TagMatchMode,
  query: string,
): Item[] {
  const needle = query.trim().toLowerCase();
  return items.filter((item) => {
    if (selectedTags.length > 0) {
      const matches =
        mode === 'all'
          ? selectedTags.every((tag) => item.tags.includes(tag))
          : selectedTags.some((tag) => item.tags.includes(tag));
      if (!matches) {
        return false;
      }
    }
    if (needle) {
      const haystack = `${item.title}\n${item.description ?? ''}`.toLowerCase();
      if (!haystack.includes(needle)) {
        return false;
      }
    }
    return true;
  });
}
