import type { StoredImage } from '../data/types';

/**
 * Shrinks a picked photo to at most `MAX_PHOTO_SIDE` (see `photoSettings.ts`) pixels on its longest side and encodes it as
 * JPEG. Not available on this platform yet; the website version is in `photos.web.ts`. A phone
 * version could use `expo-image-manipulator`.
 * @param uri The URI the image picker returned.
 * @returns Never resolves; always rejects.
 */
export function preparePhoto(uri: string): Promise<StoredImage> {
  return Promise.reject(new Error('Photos are only supported on the website so far.'));
}
