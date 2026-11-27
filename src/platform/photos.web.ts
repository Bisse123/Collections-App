import type { StoredImage } from '../data/types';
import { MAX_PHOTO_SIDE, PHOTO_QUALITY } from './photoSettings';

/**
 * Shrinks a picked photo to at most `MAX_PHOTO_SIDE` pixels on its longest side and encodes it as
 * JPEG, using a canvas. Photos that are already small are re-encoded but not enlarged.
 * @param uri The URI the image picker returned (a `blob:` or `data:` URL on the web).
 * @returns The JPEG's bytes and MIME type.
 * @throws Error when the browser cannot read the image.
 */
export async function preparePhoto(uri: string): Promise<StoredImage> {
  const source = await (await fetch(uri)).blob();
  const bitmap = await createImageBitmap(source);
  const scale = Math.min(1, MAX_PHOTO_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('This browser cannot process photos.');
  }
  context.fillStyle = '#FFFFFF';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const jpeg = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('The photo could not be converted.'))),
      'image/jpeg',
      PHOTO_QUALITY,
    ),
  );
  return { bytes: new Uint8Array(await jpeg.arrayBuffer()), mimeType: 'image/jpeg' };
}
