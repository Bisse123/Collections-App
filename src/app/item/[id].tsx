import { Image } from 'expo-image';
import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { EmptyState } from '../../components/EmptyState';
import { TagChip } from '../../components/TagChip';
import { deleteItem, getItem, type Item } from '../../db/repository';
import { showSaveError } from '../../lib/errors';
import { imageUri } from '../../storage/images';
import { colors, radius, spacing } from '../../theme';

/**
 * Full view of one item: image, title, description and tags, with edit and delete.
 * @returns The screen element.
 */
export default function ItemScreen() {
  const db = useSQLiteContext();
  const { id } = useLocalSearchParams<{ id: string }>();
  const itemId = Number(id);

  const [item, setItem] = useState<Item | null>(null);
  const [loaded, setLoaded] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      getItem(db, itemId).then((loadedItem) => {
        if (active) {
          setItem(loadedItem);
          setLoaded(true);
        }
      });
      return () => {
        active = false;
      };
    }, [db, itemId]),
  );

  const handleDelete = () => {
    if (!item) {
      return;
    }
    Alert.alert(`Delete "${item.title}"?`, 'This permanently deletes the item and its photo.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteItem(db, item.id);
            router.back();
          } catch (error) {
            showSaveError(error);
          }
        },
      },
    ]);
  };

  if (loaded && !item) {
    return <EmptyState title="Item not found" message="It may have been deleted." />;
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Stack.Screen
        options={{
          title: '',
          headerRight: () =>
            item ? (
              <Pressable
                hitSlop={8}
                onPress={() =>
                  router.push({
                    pathname: '/item-form',
                    params: { collectionId: String(item.collectionId), itemId: String(item.id) },
                  })
                }
              >
                <Text style={styles.headerButton}>Edit</Text>
              </Pressable>
            ) : null,
        }}
      />
      {item && (
        <>
          {item.imageName && (
            <Image
              source={{ uri: imageUri(item.imageName) }}
              style={styles.image}
              contentFit="cover"
              transition={150}
            />
          )}
          <Text style={styles.title}>{item.title}</Text>
          {item.tags.length > 0 && (
            <View style={styles.tagRow}>
              {item.tags.map((tag) => (
                <TagChip key={tag} label={tag} />
              ))}
            </View>
          )}
          {item.description ? <Text style={styles.description}>{item.description}</Text> : null}
          <Pressable
            onPress={handleDelete}
            style={({ pressed }) => [styles.deleteButton, pressed && styles.pressed]}
          >
            <Text style={styles.deleteText}>Delete item</Text>
          </Pressable>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  headerButton: {
    color: colors.accent,
    fontSize: 16,
  },
  image: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: radius.md,
    backgroundColor: colors.placeholder,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  description: {
    fontSize: 16,
    lineHeight: 23,
    color: colors.text,
  },
  deleteButton: {
    marginTop: spacing.xl,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.danger,
  },
  pressed: {
    opacity: 0.7,
  },
  deleteText: {
    color: colors.danger,
    fontSize: 16,
    fontWeight: '600',
  },
});
