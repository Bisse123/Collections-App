import { StyleSheet } from 'react-native';

import { colors, radius, spacing } from '../../theme';

/** Styles for `TagFilterSheet`. */
export const styles = StyleSheet.create({
  sheet: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  done: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.accent,
  },
  search: {
    marginHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: 16,
    color: colors.text,
  },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  summaryText: {
    fontSize: 13,
    color: colors.textMuted,
  },
  clear: {
    fontSize: 14,
    color: colors.accent,
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  pressed: {
    opacity: 0.6,
  },
  check: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkSelected: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  checkMark: {
    color: colors.surface,
    fontSize: 13,
    fontWeight: '700',
  },
  tag: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
  },
  count: {
    fontSize: 14,
    color: colors.textMuted,
  },
  empty: {
    paddingVertical: spacing.xl,
    textAlign: 'center',
    fontSize: 15,
    color: colors.textMuted,
  },
});
