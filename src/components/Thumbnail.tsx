import { Image } from 'expo-image';
import { Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { useImageUrl } from '../hooks/useImageUrl';
import { styles } from '../styles/components/Thumbnail.styles';

interface ThumbnailProps {
  /** Stored image id, or null to show the placeholder. */
  imageId: string | null;
  /** Text whose first letter is shown when there is no image. */
  fallbackText: string;
  style: StyleProp<ViewStyle>;
}

/**
 * Shows a stored image, or a placeholder with the first letter of `fallbackText` when there is none.
 * @param props See `ThumbnailProps`. `style` must give the thumbnail a size.
 * @returns The thumbnail element.
 */
export function Thumbnail({ imageId, fallbackText, style }: ThumbnailProps) {
  const url = useImageUrl(imageId);
  if (imageId) {
    return (
      <View style={[styles.frame, style]}>
        {url && <Image source={{ uri: url }} style={styles.fill} contentFit="cover" transition={150} />}
      </View>
    );
  }
  return (
    <View style={[styles.frame, styles.placeholder, style]}>
      <Text style={styles.letter}>{fallbackText.trim().charAt(0).toUpperCase() || '?'}</Text>
    </View>
  );
}
