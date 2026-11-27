import { Image } from 'expo-image';
import { Pressable, Text } from 'react-native';

import { styles } from '../styles/components/PhotoField.styles';

interface PhotoFieldProps {
  /** URI of the photo to show, or null to show the "add photo" hint. */
  previewUri: string | null;
  onPress: () => void;
}

/**
 * A tappable 4:3 box for a form's optional photo: shows the photo, or an "add photo" hint.
 * @param props `previewUri` is the photo to show; `onPress` runs when tapped, typically opening
 * the photo menu from `usePhotoPicker`.
 * @returns The photo box element.
 */
export function PhotoField({ previewUri, onPress }: PhotoFieldProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={previewUri ? 'Change photo' : 'Add photo'}
      style={({ pressed }) => [styles.box, pressed && styles.pressed]}
    >
      {previewUri ? (
        <Image source={{ uri: previewUri }} style={styles.image} contentFit="cover" />
      ) : (
        <Text style={styles.hint}>+ Add photo (optional)</Text>
      )}
    </Pressable>
  );
}
