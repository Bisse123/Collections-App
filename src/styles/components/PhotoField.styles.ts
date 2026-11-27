import { StyleSheet } from 'react-native';

import { colors, radius } from '../../theme';

/** Styles for `PhotoField`. */
export const styles = StyleSheet.create({
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
});
