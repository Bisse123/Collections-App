import { StyleSheet } from 'react-native';

import { colors, radius, spacing } from '../../theme';

/** Styles for the import review screen. */
export const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    gap: spacing.xl,
    paddingBottom: 48,
  },
  intro: {
    gap: spacing.sm,
  },
  heading: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
  },
  body: {
    fontSize: 15,
    lineHeight: 21,
    color: colors.text,
  },
  muted: {
    fontSize: 14,
    color: colors.textMuted,
  },
  section: {
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  listItem: {
    fontSize: 15,
    color: colors.text,
    paddingVertical: spacing.xs,
  },
  card: {
    gap: spacing.xs,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  cardLine: {
    fontSize: 14,
    color: colors.textMuted,
  },
  conflict: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  conflictNote: {
    fontSize: 13,
    color: colors.danger,
  },
  segment: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
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
  options: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  option: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  optionSelected: {
    borderColor: colors.accent,
  },
  radio: {
    width: 20,
    height: 20,
    marginTop: 1,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border,
  },
  radioSelected: {
    borderColor: colors.accent,
    borderWidth: 6,
  },
  optionText: {
    flex: 1,
    gap: 2,
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  optionBody: {
    fontSize: 14,
    color: colors.textMuted,
  },
  button: {
    backgroundColor: colors.accent,
    borderRadius: radius.sm,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  pressed: {
    opacity: 0.8,
  },
  buttonText: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: '600',
  },
});
