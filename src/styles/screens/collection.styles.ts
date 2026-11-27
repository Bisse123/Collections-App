import { StyleSheet } from 'react-native';

import { colors, radius, spacing } from '../../theme';

/** Styles for the collection screen (item list, search and tag filters). */
export const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  headerButton: {
    color: colors.accent,
    fontSize: 16,
  },
  list: {
    padding: spacing.lg,
    paddingBottom: 120,
    gap: spacing.sm,
  },
  filters: {
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  searchRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  search: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: 16,
    color: colors.text,
  },
  tagButton: {
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
  },
  tagButtonActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  tagButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  tagButtonTextActive: {
    color: colors.surface,
  },
  selectedTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  segment: {
    flexDirection: 'row',
    backgroundColor: colors.placeholder,
    borderRadius: radius.pill,
    padding: 2,
  },
  segmentOption: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  segmentOptionActive: {
    backgroundColor: colors.surface,
  },
  segmentText: {
    fontSize: 13,
    color: colors.textMuted,
  },
  segmentTextActive: {
    color: colors.text,
    fontWeight: '600',
  },
  clear: {
    color: colors.accent,
    fontSize: 14,
  },
  resultCount: {
    fontSize: 13,
    color: colors.textMuted,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pressed: {
    opacity: 0.8,
  },
  thumb: {
    width: 64,
    height: 64,
    borderRadius: radius.sm,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  description: {
    fontSize: 14,
    color: colors.textMuted,
  },
  tags: {
    fontSize: 13,
    color: colors.accent,
  },
});
