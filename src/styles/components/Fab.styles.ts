import { StyleSheet } from 'react-native';

import { colors, spacing } from '../../theme';

/** Styles for `Fab`. */
export const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: spacing.lg,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  pressed: {
    opacity: 0.8,
  },
  plus: {
    color: colors.surface,
    fontSize: 32,
    lineHeight: 34,
    fontWeight: '300',
  },
});
