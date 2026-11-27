import { Image } from 'expo-image';
import { Pressable, Text, View } from 'react-native';

import { styles } from '../styles/components/PhotoField.styles';

interface PhotoFieldProps {
  /** URL of the photo to show, or null to show the "add photo" hint. */
  previewUri: string | null;
  /** Called when the box is tapped; should open the photo picker. */
  onPick: () => void;
  /** Called when "Remove photo" is tapped. */
  onRemove: () => void;
}

/**
 * A tappable 4:3 box for a form's optional photo: shows the photo, or an "add photo" hint, with a
 * "Remove photo" link below it when there is a photo.
 * @param props See `PhotoFieldProps`.
 * @returns The photo field element.
 */
export function PhotoField({ previewUri, onPick, onRemove }: PhotoFieldProps) {
  return (
    <View style={styles.container}>
      <Pressable
        onPress={onPick}
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
      {previewUri && (
        <Pressable onPress={onRemove} accessibilityRole="button" hitSlop={8} style={styles.removeButton}>
          <Text style={styles.removeText}>Remove photo</Text>
        </Pressable>
      )}
    </View>
  );
}
