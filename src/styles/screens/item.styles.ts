import { StyleSheet } from 'react-native';

import { colors, radius, spacing } from '../../theme';

/** Styles for the item detail screen. */
export const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  headerButtons: {
    flexDirection: 'row',
    paddingHorizontal: spacing.sm,
  },
  headerButton: {
    color: colors.accent,
    fontSize: 16,
  },
  image: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: radius.md,
    backgroundColor: colors.placeholder,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  description: {
    fontSize: 16,
    lineHeight: 23,
    color: colors.text,
  },
  deleteButton: {
    marginTop: spacing.xl,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.danger,
  },
  pressed: {
    opacity: 0.7,
  },
  deleteText: {
    color: colors.danger,
    fontSize: 16,
    fontWeight: '600',
  },
});
