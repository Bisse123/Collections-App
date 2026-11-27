import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { PhotoField } from '../components/PhotoField';
import { createCollection, getCollection, updateCollection } from '../db/repository';
import { usePhotoPicker } from '../hooks/usePhotoPicker';
import { showSaveError } from '../lib/errors';
import { deleteImage } from '../storage/images';
import { colors } from '../theme';
import { styles } from '../styles/screens/collectionForm.styles';

/**
 * Modal for creating a collection, or editing one's name and photo when an `id` route param is
 * given.
 * @returns The screen element.
 */
export default function CollectionFormScreen() {
  const db = useSQLiteContext();
  const params = useLocalSearchParams<{ id?: string }>();
  const collectionId = params.id ? Number(params.id) : null;

  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const photo = usePhotoPicker();
  const { setSavedImageName } = photo;

  useEffect(() => {
    if (collectionId === null) {
      return;
    }
    getCollection(db, collectionId).then((collection) => {
      if (collection) {
        setName(collection.name);
        setSavedImageName(collection.imageName);
      }
    });
  }, [db, collectionId, setSavedImageName]);

  const canSave = name.trim().length > 0 && !saving;

  const handleSave = async () => {
    if (!canSave) {
      return;
    }
    setSaving(true);
    let storedImageName: string | null = null;
    try {
      const savedPhoto = await photo.savePhoto();
      storedImageName = savedPhoto.storedImageName;
      if (collectionId === null) {
        const newId = await createCollection(db, name, savedPhoto.imageName);
        router.replace(`/collection/${newId}`);
      } else {
        await updateCollection(db, collectionId, name, savedPhoto.imageName);
        router.back();
      }
    } catch (error) {
      deleteImage(storedImageName);
      setSaving(false);
      showSaveError(error);
    }
  };

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
    >
      <Stack.Screen options={{ title: collectionId === null ? 'New collection' : 'Edit collection' }} />

      <View style={styles.field}>
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
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Photo</Text>
        <PhotoField previewUri={photo.previewUri} onPress={photo.openMenu} />
      </View>

      <Pressable
        onPress={handleSave}
        disabled={!canSave}
        style={({ pressed }) => [styles.button, !canSave && styles.buttonDisabled, pressed && styles.pressed]}
      >
        <Text style={styles.buttonText}>
          {saving ? 'Saving…' : collectionId === null ? 'Create' : 'Save'}
        </Text>
      </Pressable>
    </ScrollView>
  );
}
