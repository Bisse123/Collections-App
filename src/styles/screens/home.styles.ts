import { StyleSheet } from 'react-native';

import { colors, radius, spacing, tileWidths } from '../../theme';

/** Styles for the home screen (collection grid). */
export const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  headerButton: {
    color: colors.accent,
    fontSize: 16,
    paddingHorizontal: spacing.sm,
  },
  list: {
    padding: spacing.lg,
    paddingBottom: 120,
    gap: spacing.lg,
  },
  row: {
    gap: spacing.lg,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardPortrait: {
    flex: 1,
    maxWidth: '50%',
  },
  cardLandscape: {
    width: tileWidths.collection,
  },
  cardSpacer: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
  },
  pressed: {
    opacity: 0.8,
  },
  cover: {
    width: '100%',
    aspectRatio: 1,
  },
  cardText: {
    padding: spacing.md,
    gap: 2,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  count: {
    fontSize: 13,
    color: colors.textMuted,
  },
});
