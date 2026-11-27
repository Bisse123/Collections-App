import { Alert } from 'react-native';

import { StorageFullError } from '../storage/images';

const STORAGE_FULL_PATTERN = /SQLITE_FULL|database or disk is full|ENOSPC|no space left/i;

/**
 * Turns an error from a save into a message the user can act on.
 * @param error Whatever was thrown.
 * @returns A storage-full message when the device ran out of space, otherwise a generic message
 * that includes the original error text.
 */
export function describeSaveError(error: unknown): string {
  if (error instanceof StorageFullError) {
    return error.message;
  }
  const text = error instanceof Error ? error.message : String(error);
  if (STORAGE_FULL_PATTERN.test(text)) {
    return 'Your phone is out of storage, so this could not be saved. Free up some space and try again.';
  }
  return `Something went wrong while saving.\n\n${text}`;
}

/**
 * Shows a save error to the user in an alert.
 * @param error Whatever was thrown.
 * @returns Nothing. Opens a native alert dialog.
 */
export function showSaveError(error: unknown): void {
  Alert.alert('Could not save', describeSaveError(error));
}
