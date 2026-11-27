import { Text, View } from 'react-native';

import { styles } from '../styles/components/EmptyState.styles';

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
