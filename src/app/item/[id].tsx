import { Image } from 'expo-image';
import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { EmptyState } from '../../components/EmptyState';
import { TagChip } from '../../components/TagChip';
import { deleteItem, getItem } from '../../data/collections';
import type { Item } from '../../data/types';
import { useImageUrl } from '../../hooks/useImageUrl';
import { showSaveError } from '../../lib/errors';
import { confirmAsync } from '../../platform/dialogs';
import { styles } from '../../styles/screens/item.styles';

/**
 * Full view of one item: image, title, description and tags, with edit and delete.
 * @returns The screen element.
 */
export default function ItemScreen() {
  const { id: itemId } = useLocalSearchParams<{ id: string }>();

  const [item, setItem] = useState<Item | null>(null);
  const [loaded, setLoaded] = useState(false);
  const imageUrl = useImageUrl(item?.imageId ?? null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      getItem(itemId).then((loadedItem) => {
        if (active) {
          setItem(loadedItem);
          setLoaded(true);
        }
      });
      return () => {
        active = false;
      };
    }, [itemId]),
  );

  const handleDelete = async () => {
    if (!item) {
      return;
    }
    const confirmed = await confirmAsync({
      title: `Delete "${item.title}"?`,
      message: 'This permanently deletes the item and its photo.',
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!confirmed) {
      return;
    }
    try {
      await deleteItem(item.id);
      router.back();
    } catch (error) {
      showSaveError(error);
    }
  };

  if (loaded && !item) {
    return <EmptyState title="Item not found" message="It may have been deleted." />;
  }

  return (
    <ScrollView contentContainerStyle={styles.content} contentInsetAdjustmentBehavior="automatic">
      <Stack.Screen
        options={{
          title: '',
          headerRight: () => (
            <View style={styles.headerButtons}>
              <Pressable
                hitSlop={8}
                accessibilityRole="button"
                disabled={!item}
                onPress={() =>
                  item &&
                  router.push({
                    pathname: '/item-form',
                    params: { collectionId: item.collectionId, itemId: item.id },
                  })
                }
              >
                <Text style={styles.headerButton}>Edit</Text>
              </Pressable>
            </View>
          ),
        }}
      />
      {item && (
        <>
          {item.imageId && (
            <Image
              source={imageUrl ? { uri: imageUrl } : undefined}
              style={styles.image}
              contentFit="cover"
              transition={150}
              accessibilityLabel={`Photo of ${item.title}`}
            />
          )}
          <Text style={styles.title} accessibilityRole="header">
            {item.title}
          </Text>
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
            accessibilityRole="button"
            style={({ pressed }) => [styles.deleteButton, pressed && styles.pressed]}
          >
            <Text style={styles.deleteText}>Delete item</Text>
          </Pressable>
        </>
      )}
    </ScrollView>
  );
}
