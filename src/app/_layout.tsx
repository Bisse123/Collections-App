import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { EmptyState } from '../components/EmptyState';
import { storeSupported } from '../data/store';
import { colors } from '../theme';

/**
 * Root of the app: sets up the screen stack. On platforms without a data store (the phone apps, so
 * far) it shows a notice instead.
 * @returns The app shell.
 */
export default function RootLayout() {
  if (!storeSupported) {
    return (
      <SafeAreaProvider>
        <EmptyState
          title="Use the website"
          message="Collections currently runs in the browser only. Open the website to use it."
        />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerTintColor: colors.accent,
          headerTitleStyle: { color: colors.text },
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="index" options={{ title: 'Collections' }} />
        <Stack.Screen name="collection/[id]" options={{ title: '' }} />
        <Stack.Screen name="item/[id]" options={{ title: '' }} />
        <Stack.Screen name="collection-form" options={{ presentation: 'modal' }} />
        <Stack.Screen name="item-form" options={{ presentation: 'modal' }} />
        <Stack.Screen name="import-review" options={{ presentation: 'modal', title: 'Import collection' }} />
      </Stack>
    </SafeAreaProvider>
  );
}
