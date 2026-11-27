/**
 * Offers a file to the user. On touch devices that can share files (most phones) this opens the
 * share sheet, so the file can go to Files, Drive, AirDrop, a chat and so on. Everywhere else, or
 * if sharing is refused, the browser downloads it.
 * @param fileName The suggested file name.
 * @param bytes The file's contents.
 * @param mimeType The file's MIME type.
 * @returns Resolves once the share sheet closes or the download starts. Resolves without saving
 * when the user cancels the share sheet.
 */
export async function saveFile(fileName: string, bytes: Uint8Array, mimeType: string): Promise<void> {
  const file = new File([bytes as Uint8Array<ArrayBuffer>], fileName, { type: mimeType });
  const isTouchDevice = window.matchMedia?.('(pointer: coarse)').matches ?? false;
  if (isTouchDevice && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: fileName });
      return;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return;
      }
    }
  }

  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/**
 * Lets the user choose one file with the browser's file picker and reads it. Must be called
 * directly from a tap or click, or mobile browsers block the picker.
 * @param accept File types to offer, as in an HTML `accept` attribute (e.g. `.zip`).
 * @returns The file's contents, or null when the user cancels. In browsers that do not report a
 * cancel, the promise stays pending instead.
 */
export function pickFile(accept: string): Promise<Uint8Array | null> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.style.display = 'none';
    input.addEventListener('change', () => {
      const file = input.files?.[0];
      input.remove();
      if (!file) {
        resolve(null);
        return;
      }
      file.arrayBuffer().then((buffer) => resolve(new Uint8Array(buffer)), reject);
    });
    input.addEventListener('cancel', () => {
      input.remove();
      resolve(null);
    });
    document.body.appendChild(input);
    input.click();
  });
}
