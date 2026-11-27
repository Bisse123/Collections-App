import { StyleSheet } from 'react-native';

import { colors, radius, spacing } from '../../theme';

/** Styles for `PhotoField`. */
export const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  box: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: radius.md,
    backgroundColor: colors.placeholder,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  pressed: {
    opacity: 0.8,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  hint: {
    fontSize: 16,
    color: colors.textMuted,
  },
  removeButton: {
    alignSelf: 'flex-start',
  },
  removeText: {
    fontSize: 14,
    color: colors.danger,
  },
});
