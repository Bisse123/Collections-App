import { StyleSheet } from 'react-native';

import { colors } from '../../theme';

/** Styles for `Thumbnail`. */
export const styles = StyleSheet.create({
  frame: {
    overflow: 'hidden',
    backgroundColor: colors.placeholder,
  },
  fill: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  letter: {
    fontSize: 28,
    fontWeight: '600',
    color: colors.textMuted,
  },
});
