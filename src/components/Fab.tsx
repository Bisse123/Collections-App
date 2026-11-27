import { Pressable, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { spacing } from '../theme';
import { styles } from '../styles/components/Fab.styles';

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
