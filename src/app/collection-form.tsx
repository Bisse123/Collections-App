import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { createCollection, getCollection, renameCollection } from '../db/repository';
import { showSaveError } from '../lib/errors';
import { colors, radius, spacing } from '../theme';

/**
 * Modal for creating a collection, or renaming one when an `id` route param is given.
 * @returns The screen element.
 */
export default function CollectionFormScreen() {
  const db = useSQLiteContext();
  const params = useLocalSearchParams<{ id?: string }>();
  const collectionId = params.id ? Number(params.id) : null;

  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (collectionId === null) {
      return;
    }
    getCollection(db, collectionId).then((collection) => {
      if (collection) {
        setName(collection.name);
      }
    });
  }, [db, collectionId]);

  const canSave = name.trim().length > 0 && !saving;

  const handleSave = async () => {
    if (!canSave) {
      return;
    }
    setSaving(true);
    try {
      if (collectionId === null) {
        const newId = await createCollection(db, name);
        router.replace(`/collection/${newId}`);
      } else {
        await renameCollection(db, collectionId, name);
        router.back();
      }
    } catch (error) {
      setSaving(false);
      showSaveError(error);
    }
  };

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: collectionId === null ? 'New collection' : 'Rename collection' }} />
      <Text style={styles.label}>Name</Text>
      <TextInput
        value={name}
        onChangeText={setName}
        onSubmitEditing={handleSave}
        placeholder="e.g. Trading cards"
        placeholderTextColor={colors.textMuted}
        autoFocus
        returnKeyType="done"
        style={styles.input}
      />
      <Pressable
        onPress={handleSave}
        disabled={!canSave}
        style={({ pressed }) => [styles.button, !canSave && styles.buttonDisabled, pressed && styles.pressed]}
      >
        <Text style={styles.buttonText}>{collectionId === null ? 'Create' : 'Save'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMuted,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 16,
    color: colors.text,
  },
  button: {
    marginTop: spacing.lg,
    backgroundColor: colors.accent,
    borderRadius: radius.sm,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  pressed: {
    opacity: 0.8,
  },
  buttonText: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: '600',
  },
});
