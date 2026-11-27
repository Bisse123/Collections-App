import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { PhotoField } from '../components/PhotoField';
import { TagEditor } from '../components/TagEditor';
import { createItem, getItem, listItems, updateItem } from '../data/collections';
import { usePhotoPicker } from '../hooks/usePhotoPicker';
import { showSaveError } from '../lib/errors';
import { countTags } from '../lib/tags';
import { colors } from '../theme';
import { styles } from '../styles/screens/itemForm.styles';

/**
 * Modal for adding an item to a collection, or editing one when an `itemId` route param is given.
 * Requires a `collectionId` route param.
 * @returns The screen element.
 */
export default function ItemFormScreen() {
  const params = useLocalSearchParams<{ collectionId: string; itemId?: string }>();
  const collectionId = params.collectionId;
  const itemId = params.itemId ?? null;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const photo = usePhotoPicker();
  const { setSavedImageId } = photo;

  useEffect(() => {
    listItems(collectionId).then((items) =>
      setSuggestions(countTags(items).map(({ tag }) => tag)),
    );
    if (itemId === null) {
      return;
    }
    getItem(itemId).then((item) => {
      if (item) {
        setTitle(item.title);
        setDescription(item.description ?? '');
        setTags(item.tags);
        setSavedImageId(item.imageId);
      }
    });
  }, [collectionId, itemId, setSavedImageId]);

  const canSave = title.trim().length > 0 && !saving;

  const handleSave = async () => {
    if (!canSave) {
      return;
    }
    setSaving(true);
    try {
      const photoUpdate = await photo.getPhotoUpdate();
      const fields = { title, description: description.trim() || null, tags };
      if (itemId === null) {
        await createItem(collectionId, fields, photoUpdate);
      } else {
        await updateItem(itemId, fields, photoUpdate);
      }
      router.back();
    } catch (error) {
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
      <Stack.Screen options={{ title: itemId === null ? 'New item' : 'Edit item' }} />

      <View style={styles.field}>
        <Text style={styles.label}>Title</Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          accessibilityLabel="Title"
          placeholder="Required"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Description</Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          accessibilityLabel="Description"
          placeholder="Optional"
          placeholderTextColor={colors.textMuted}
          multiline
          textAlignVertical="top"
          style={[styles.input, styles.multiline]}
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Tags</Text>
        <TagEditor tags={tags} onChange={setTags} suggestions={suggestions} />
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
        <Text style={styles.buttonText}>{saving ? 'Saving…' : 'Save'}</Text>
      </Pressable>
    </ScrollView>
  );
}
