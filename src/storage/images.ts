import { Directory, File, Paths } from 'expo-file-system';

const IMAGE_DIRECTORY_NAME = 'images';

/** Free space (bytes) the device must have left before the app stores another image. */
export const MIN_FREE_BYTES = 50 * 1024 * 1024;

/**
 * Thrown when the device is too low on free space to safely store another image.
 */
export class StorageFullError extends Error {
  /**
   * Creates the error with a user-facing message.
   */
  constructor() {
    super('Your phone is almost out of storage. Free up some space and try again.');
    this.name = 'StorageFullError';
  }
}

/**
 * Returns the app's private image folder, creating it if it does not exist yet.
 * @returns The folder inside the app's document directory that holds item images.
 */
function imageDirectory(): Directory {
  const directory = new Directory(Paths.document, IMAGE_DIRECTORY_NAME);
  if (!directory.exists) {
    directory.create({ intermediates: true });
  }
  return directory;
}

/**
 * Builds a unique file name for a new image.
 * @param extension The extension to keep, including the leading dot (e.g. `.jpg`). An empty string
 * falls back to `.jpg`.
 * @returns A file name that does not collide with existing images.
 */
function newImageName(extension: string): string {
  const random = Math.random().toString(36).slice(2, 10);
  return `${Date.now()}-${random}${extension || '.jpg'}`;
}

/**
 * Copies a picked image into the app's private storage so it survives the picker's cache being
 * cleared.
 * @param sourceUri The `file://` URI returned by the image picker.
 * @returns The stored image's file name, which is what the database keeps. Writes a new file to
 * the app's image folder.
 * @throws StorageFullError when the device has less than `MIN_FREE_BYTES` free.
 */
export async function storeImage(sourceUri: string): Promise<string> {
  if (Paths.availableDiskSpace < MIN_FREE_BYTES) {
    throw new StorageFullError();
  }

  const source = new File(sourceUri);
  const destination = new File(imageDirectory(), newImageName(source.extension));
  try {
    await source.copy(destination);
  } catch (error) {
    if (destination.exists) {
      destination.delete();
    }
    throw error;
  }
  return destination.name;
}

/**
 * Resolves a stored image's file name to a URI that image components can display. The absolute
 * path is rebuilt each time because the app's document folder can move between app updates on iOS.
 * @param imageName The file name returned by `storeImage`.
 * @returns A `file://` URI for the image.
 */
export function imageUri(imageName: string): string {
  return new File(Paths.document, IMAGE_DIRECTORY_NAME, imageName).uri;
}

/**
 * Deletes a stored image if it exists. Failures are swallowed because a leftover file is harmless.
 * @param imageName The file name returned by `storeImage`, or null/undefined to do nothing.
 * @returns Nothing. Removes the file from the app's image folder.
 */
export function deleteImage(imageName: string | null | undefined): void {
  if (!imageName) {
    return;
  }
  try {
    const file = new File(Paths.document, IMAGE_DIRECTORY_NAME, imageName);
    if (file.exists) {
      file.delete();
    }
  } catch {
    // A file that cannot be deleted only costs disk space.
  }
}
