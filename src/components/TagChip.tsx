import { Pressable, Text } from 'react-native';

import { styles } from '../styles/components/TagChip.styles';

interface TagChipProps {
  label: string;
  /** Highlights the chip, e.g. when its tag is part of the active filter. */
  selected?: boolean;
  /** Optional count shown after the label. */
  count?: number;
  /** Shows a trailing "×" to signal that pressing removes the tag. */
  removable?: boolean;
  onPress?: () => void;
}

/**
 * A rounded tag label. Pressable when `onPress` is given.
 * @param props See `TagChipProps`.
 * @returns The chip element.
 */
export function TagChip({ label, selected = false, count, removable = false, onPress }: TagChipProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : 'text'}
      aria-selected={selected}
      style={({ pressed }) => [
        styles.chip,
        selected && styles.chipSelected,
        pressed && styles.chipPressed,
      ]}
    >
      <Text style={[styles.label, selected && styles.labelSelected]}>
        {label}
        {count !== undefined ? ` ${count}` : ''}
        {removable ? '  ×' : ''}
      </Text>
    </Pressable>
  );
}
