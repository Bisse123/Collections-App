import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { TagEditor } from '../components/TagEditor';
import { createItem, getItem, listItems, updateItem } from '../db/repository';
import { showSaveError } from '../lib/errors';
import { countTags } from '../lib/tags';
import { deleteImage, imageUri, storeImage } from '../storage/images';
import { colors, radius, spacing } from '../theme';

const PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  allowsEditing: true,
  quality: 0.7,
};

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
  const [savedImageName, setSavedImageName] = useState<string | null>(null);
  const [pickedImageUri, setPickedImageUri] = useState<string | null>(null);
  const [imageRemoved, setImageRemoved] = useState(false);
  const [saving, setSaving] = useState(false);

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
  }, [db, collectionId, itemId]);

  const previewUri =
    pickedImageUri ?? (savedImageName && !imageRemoved ? imageUri(savedImageName) : null);
  const canSave = title.trim().length > 0 && !saving;

  const handlePickedResult = (result: ImagePicker.ImagePickerResult) => {
    if (!result.canceled && result.assets.length > 0) {
      setPickedImageUri(result.assets[0].uri);
      setImageRemoved(false);
    }
  };

  const handleTakePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Camera access needed', 'Allow camera access in your phone settings to take photos.');
      return;
    }
    handlePickedResult(await ImagePicker.launchCameraAsync(PICKER_OPTIONS));
  };

  const handleChooseFromLibrary = async () => {
    handlePickedResult(await ImagePicker.launchImageLibraryAsync(PICKER_OPTIONS));
  };

  const handleImagePress = () => {
    const buttons: Parameters<typeof Alert.alert>[2] = [
      { text: 'Take photo', onPress: handleTakePhoto },
      { text: 'Choose from library', onPress: handleChooseFromLibrary },
    ];
    if (previewUri) {
      buttons.push({
        text: 'Remove photo',
        style: 'destructive',
        onPress: () => {
          setPickedImageUri(null);
          setImageRemoved(true);
        },
      });
    }
    buttons.push({ text: 'Cancel', style: 'cancel' });
    Alert.alert('Photo', undefined, buttons);
  };

  const handleSave = async () => {
    if (!canSave) {
      return;
    }
    setSaving(true);
    let newImageName: string | null = null;
    try {
      if (pickedImageUri) {
        newImageName = await storeImage(pickedImageUri);
      }
      const input = {
        title,
        description: description.trim() || null,
        imageName: newImageName ?? (imageRemoved ? null : savedImageName),
        tags,
      };
      if (itemId === null) {
        await createItem(db, collectionId, input);
      } else {
        await updateItem(db, itemId, input);
      }
      router.back();
    } catch (error) {
      deleteImage(newImageName);
      setSaving(false);
      showSaveError(error);
    }
  };

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
    >
      <Stack.Screen options={{ title: itemId === null ? 'New item' : 'Edit item' }} />

      <Pressable onPress={handleImagePress} style={({ pressed }) => [styles.imageBox, pressed && styles.pressed]}>
        {previewUri ? (
          <Image source={{ uri: previewUri }} style={styles.image} contentFit="cover" />
        ) : (
          <Text style={styles.imageHint}>+ Add photo (optional)</Text>
        )}
      </Pressable>

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

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
    paddingBottom: 48,
  },
  imageBox: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: radius.md,
    backgroundColor: colors.placeholder,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageHint: {
    fontSize: 16,
    color: colors.textMuted,
  },
  field: {
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
  multiline: {
    minHeight: 100,
  },
  button: {
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
