/**
 * Offers a file to the user to save or share. Not available on this platform yet; the website
 * version is in `files.web.ts`. A phone version could use `expo-sharing`.
 * @param fileName The suggested file name.
 * @param bytes The file's contents.
 * @param mimeType The file's MIME type.
 * @returns Never resolves; always rejects.
 */
export function saveFile(fileName: string, bytes: Uint8Array, mimeType: string): Promise<void> {
  return Promise.reject(new Error('Exporting is only supported on the website so far.'));
}

/**
 * Lets the user choose a file and reads it. Not available on this platform yet; the website
 * version is in `files.web.ts`. A phone version could use `expo-document-picker`.
 * @param accept File types to offer, as in an HTML `accept` attribute.
 * @returns Never resolves; always rejects.
 */
export function pickFile(accept: string): Promise<Uint8Array | null> {
  return Promise.reject(new Error('Importing is only supported on the website so far.'));
}
