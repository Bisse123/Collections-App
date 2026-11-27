import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing } from '../theme';

interface EmptyStateProps {
  title: string;
  message: string;
}

/**
 * A centred message shown when a list has nothing to display.
 * @param props `title` is the bold heading; `message` is the hint below it.
 * @returns The empty-state element.
 */
export function EmptyState({ title, message }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: 64,
    gap: spacing.sm,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  message: {
    fontSize: 15,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
