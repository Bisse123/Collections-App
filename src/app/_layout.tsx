import { Stack } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { migrateDatabase } from '../db/migrations';
import { colors } from '../theme';

/**
 * Root of the app: opens the on-device database and sets up the screen stack.
 * @returns The app shell.
 */
export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <SQLiteProvider databaseName="collections.db" onInit={migrateDatabase}>
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
        </Stack>
      </SQLiteProvider>
    </SafeAreaProvider>
  );
}
