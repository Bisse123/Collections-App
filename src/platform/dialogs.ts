import { Alert } from 'react-native';

/** What a confirmation dialog says. */
export interface ConfirmOptions {
  title: string;
  message?: string;
  /** Label of the button that confirms, e.g. "Delete". */
  confirmLabel: string;
  /** True styles the confirm button as destructive where the platform supports it. */
  destructive?: boolean;
}

/**
 * Asks the user to confirm an action with a native alert.
 * @param options What the dialog says.
 * @returns True when the user confirmed, false when they cancelled.
 */
export function confirmAsync(options: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert(
      options.title,
      options.message,
      [
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
        {
          text: options.confirmLabel,
          style: options.destructive ? 'destructive' : 'default',
          onPress: () => resolve(true),
        },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
}

/**
 * Shows a message with an OK button.
 * @param title The heading.
 * @param message The text below it.
 * @returns Nothing. Opens a native alert.
 */
export function showMessage(title: string, message: string): void {
  Alert.alert(title, message);
}
