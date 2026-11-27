import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { PhotoField } from '../components/PhotoField';
import {
  createCollection,
  deleteCollection,
  getCollection,
  listItems,
  updateCollection,
} from '../data/collections';
import { usePhotoPicker } from '../hooks/usePhotoPicker';
import { showSaveError } from '../lib/errors';
import { confirmAsync } from '../platform/dialogs';
import { colors } from '../theme';
import { styles } from '../styles/screens/collectionForm.styles';

/**
 * Modal for creating a collection, or editing or deleting one when an `id` route param is given.
 * @returns The screen element.
 */
export default function CollectionFormScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const collectionId = params.id ?? null;

  const [name, setName] = useState('');
  const [itemCount, setItemCount] = useState(0);
  const [saving, setSaving] = useState(false);
  const photo = usePhotoPicker();
  const { setSavedImageId } = photo;

  useEffect(() => {
    if (collectionId === null) {
      return;
    }
    getCollection(collectionId).then((collection) => {
      if (collection) {
        setName(collection.name);
        setSavedImageId(collection.imageId);
      }
    });
    listItems(collectionId).then((items) => setItemCount(items.length));
  }, [collectionId, setSavedImageId]);

  const canSave = name.trim().length > 0 && !saving;

  const handleSave = async () => {
    if (!canSave) {
      return;
    }
    setSaving(true);
    try {
      const photoUpdate = await photo.getPhotoUpdate();
      if (collectionId === null) {
        const newId = await createCollection(name, photoUpdate);
        router.replace(`/collection/${newId}`);
      } else {
        await updateCollection(collectionId, name, photoUpdate);
        router.back();
      }
    } catch (error) {
      setSaving(false);
      showSaveError(error);
    }
  };

  const handleDelete = async () => {
    if (collectionId === null) {
      return;
    }
    const confirmed = await confirmAsync({
      title: `Delete "${name}"?`,
      message: `This permanently deletes the collection and its ${itemCount} ${itemCount === 1 ? 'item' : 'items'}, including their photos.`,
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!confirmed) {
      return;
    }
    try {
      await deleteCollection(collectionId);
      router.dismissTo('/');
    } catch (error) {
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
          accessibilityLabel="Name"
          style={styles.input}
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Photo</Text>
        <PhotoField previewUri={photo.previewUri} onPick={photo.pickPhoto} onRemove={photo.removePhoto} />
      </View>

      <Pressable
        onPress={handleSave}
        disabled={!canSave}
        accessibilityRole="button"
        style={({ pressed }) => [styles.button, !canSave && styles.buttonDisabled, pressed && styles.pressed]}
      >
        <Text style={styles.buttonText}>
          {saving ? 'Saving…' : collectionId === null ? 'Create' : 'Save'}
        </Text>
      </Pressable>

      {collectionId !== null && (
        <Pressable
          onPress={handleDelete}
          accessibilityRole="button"
          style={({ pressed }) => [styles.deleteButton, pressed && styles.pressed]}
        >
          <Text style={styles.deleteText}>Delete collection</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}
