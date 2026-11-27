import type { ConfirmOptions } from './dialogs';

/**
 * Asks the user to confirm an action with the browser's confirm dialog. Browsers label its buttons
 * themselves, so `confirmLabel` and `destructive` are not shown.
 * @param options What the dialog says.
 * @returns True when the user pressed OK, false when they cancelled.
 */
export function confirmAsync(options: ConfirmOptions): Promise<boolean> {
  const text = options.message ? `${options.title}\n\n${options.message}` : options.title;
  return Promise.resolve(window.confirm(text));
}

/**
 * Shows a message with the browser's alert dialog.
 * @param title The heading.
 * @param message The text below it.
 * @returns Nothing. Blocks the page until the user presses OK.
 */
export function showMessage(title: string, message: string): void {
  window.alert(`${title}\n\n${message}`);
}
