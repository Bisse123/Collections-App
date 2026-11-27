import { Pressable, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, spacing } from '../theme';

interface FabProps {
  label: string;
  onPress: () => void;
}

/**
 * A floating "add" button pinned to the bottom-right corner, kept clear of the device's home
 * indicator.
 * @param props `label` is read by screen readers; `onPress` runs when tapped.
 * @returns The button element.
 */
export function Fab({ label, onPress }: FabProps) {
  const insets = useSafeAreaInsets();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.fab,
        { bottom: insets.bottom + spacing.lg },
        pressed && styles.pressed,
      ]}
    >
      <Text style={styles.plus}>+</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
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
