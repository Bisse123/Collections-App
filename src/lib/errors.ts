import { showMessage } from '../platform/dialogs';
import { ArchiveError } from './archive';

const STORAGE_FULL_PATTERN = /QuotaExceeded|quota|database or disk is full|ENOSPC|no space left/i;

/**
 * Turns an error into a message the user can act on.
 * @param error Whatever was thrown.
 * @param action What was being attempted, e.g. "saving", for the generic message.
 * @returns The message of an `ArchiveError` as is, a storage-full message when storage ran out,
 * otherwise a generic message that includes the original error text.
 */
export function describeError(error: unknown, action: string): string {
  if (error instanceof ArchiveError) {
    return error.message;
  }
  const text =
    error instanceof Error ? `${error.name === 'Error' ? '' : `${error.name}: `}${error.message}` : String(error);
  if (STORAGE_FULL_PATTERN.test(text)) {
    return 'There is no storage space left for this site, so this could not be saved. Delete some photos or collections, or free up space on your device, and try again.';
  }
  return `Something went wrong while ${action}.\n\n${text}`;
}

/**
 * Shows a save error to the user.
 * @param error Whatever was thrown.
 * @returns Nothing. Opens a dialog.
 */
export function showSaveError(error: unknown): void {
  showMessage('Could not save', describeError(error, 'saving'));
}
