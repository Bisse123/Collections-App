import { useEffect, useState } from 'react';

import { imageUrl } from '../data/collections';

/**
 * Looks up the display URL of a stored photo.
 * @param imageId The image's id, or null for none.
 * @returns The URL once loaded; null while loading, when `imageId` is null, or when the image does
 * not exist.
 */
export function useImageUrl(imageId: string | null): string | null {
  const [loaded, setLoaded] = useState<{ id: string; url: string | null } | null>(null);

  useEffect(() => {
    if (!imageId) {
      return;
    }
    let active = true;
    imageUrl(imageId).then(
      (url) => active && setLoaded({ id: imageId, url }),
      () => active && setLoaded({ id: imageId, url: null }),
    );
    return () => {
      active = false;
    };
  }, [imageId]);

  return imageId && loaded?.id === imageId ? loaded.url : null;
}
