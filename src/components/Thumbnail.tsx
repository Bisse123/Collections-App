import { Image } from 'expo-image';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { imageUri } from '../storage/images';
import { colors } from '../theme';

interface ThumbnailProps {
  /** Stored image file name, or null to show the placeholder. */
  imageName: string | null;
  /** Text whose first letter is shown when there is no image. */
  fallbackText: string;
  style: StyleProp<ViewStyle>;
}

/**
 * Shows a stored image, or a placeholder with the first letter of `fallbackText` when there is none.
 * @param props See `ThumbnailProps`. `style` must give the thumbnail a size.
 * @returns The thumbnail element.
 */
export function Thumbnail({ imageName, fallbackText, style }: ThumbnailProps) {
  if (imageName) {
    return (
      <View style={[styles.frame, style]}>
        <Image source={{ uri: imageUri(imageName) }} style={styles.fill} contentFit="cover" transition={150} />
      </View>
    );
  }
  return (
    <View style={[styles.frame, styles.placeholder, style]}>
      <Text style={styles.letter}>{fallbackText.trim().charAt(0).toUpperCase() || '?'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
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
