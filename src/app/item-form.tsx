import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { PhotoField } from '../components/PhotoField';
import { TagEditor } from '../components/TagEditor';
import { createItem, getItem, listItems, updateItem } from '../db/repository';
import { usePhotoPicker } from '../hooks/usePhotoPicker';
import { showSaveError } from '../lib/errors';
import { countTags } from '../lib/tags';
import { deleteImage } from '../storage/images';
import { colors } from '../theme';
import { styles } from '../styles/screens/itemForm.styles';

/**
 * Modal for adding an item to a collection, or editing one when an `itemId` route param is given.
 * Requires a `collectionId` route param.
 * @returns The screen element.
 */
export default function ItemFormScreen() {
  const db = useSQLiteContext();
  const params = useLocalSearchParams<{ collectionId: string; itemId?: string }>();
  const collectionId = Number(params.collectionId);
  const itemId = params.itemId ? Number(params.itemId) : null;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const photo = usePhotoPicker();
  const { setSavedImageName } = photo;

  useEffect(() => {
    listItems(db, collectionId).then((items) =>
      setSuggestions(countTags(items).map(({ tag }) => tag)),
    );
    if (itemId === null) {
      return;
    }
    getItem(db, itemId).then((item) => {
      if (item) {
        setTitle(item.title);
        setDescription(item.description ?? '');
        setTags(item.tags);
        setSavedImageName(item.imageName);
      }
    });
  }, [db, collectionId, itemId, setSavedImageName]);

  const canSave = title.trim().length > 0 && !saving;

  const handleSave = async () => {
    if (!canSave) {
      return;
    }
    setSaving(true);
    let storedImageName: string | null = null;
    try {
      const savedPhoto = await photo.savePhoto();
      storedImageName = savedPhoto.storedImageName;
      const input = {
        title,
        description: description.trim() || null,
        imageName: savedPhoto.imageName,
        tags,
      };
      if (itemId === null) {
        await createItem(db, collectionId, input);
      } else {
        await updateItem(db, itemId, input);
      }
      router.back();
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
      <Stack.Screen options={{ title: itemId === null ? 'New item' : 'Edit item' }} />

      <View style={styles.field}>
        <Text style={styles.label}>Title</Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
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
        <PhotoField previewUri={photo.previewUri} onPress={photo.openMenu} />
      </View>

      <Pressable
        onPress={handleSave}
        disabled={!canSave}
        style={({ pressed }) => [styles.button, !canSave && styles.buttonDisabled, pressed && styles.pressed]}
      >
        <Text style={styles.buttonText}>{saving ? 'Saving…' : 'Save'}</Text>
      </Pressable>
    </ScrollView>
  );
}
