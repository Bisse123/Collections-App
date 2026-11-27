import { StyleSheet } from 'react-native';

import { colors, radius, spacing } from '../../theme';

/** Styles for `TagEditor`. */
export const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 16,
    color: colors.text,
  },
  suggestionLabel: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
});
