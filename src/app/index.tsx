import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { EmptyState } from '../components/EmptyState';
import { Fab } from '../components/Fab';
import { Thumbnail } from '../components/Thumbnail';
import { deleteCollection, listCollections, type Collection } from '../db/repository';
import { showSaveError } from '../lib/errors';
import { colors, radius, spacing } from '../theme';

/**
 * Home screen: a grid of all collections. Tap to open one, long-press to rename or delete.
 * @returns The screen element.
 */
export default function CollectionsScreen() {
  const db = useSQLiteContext();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    setCollections(await listCollections(db));
    setLoaded(true);
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const handleLongPress = (collection: Collection) => {
    Alert.alert(collection.name, undefined, [
      {
        text: 'Rename',
        onPress: () =>
          router.push({ pathname: '/collection-form', params: { id: String(collection.id) } }),
      },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => confirmDelete(collection),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const confirmDelete = (collection: Collection) => {
    Alert.alert(
      `Delete "${collection.name}"?`,
      `This permanently deletes the collection and its ${collection.itemCount} item(s), including their photos.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteCollection(db, collection.id);
              await load();
            } catch (error) {
              showSaveError(error);
            }
          },
        },
      ],
    );
  };

  return (
    <View style={styles.screen}>
      <FlatList
        data={collections}
        keyExtractor={(collection) => String(collection.id)}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          loaded ? (
            <EmptyState
              title="No collections yet"
              message="Tap + to start your first collection — cards, plants, vinyl, anything."
            />
          ) : undefined
        }
        renderItem={({ item: collection }) => (
          <Pressable
            style={({ pressed }) => [styles.card, pressed && styles.pressed]}
            onPress={() => router.push(`/collection/${collection.id}`)}
            onLongPress={() => handleLongPress(collection)}
          >
            <Thumbnail
              imageName={collection.coverImage}
              fallbackText={collection.name}
              style={styles.cover}
            />
            <View style={styles.cardText}>
              <Text style={styles.name} numberOfLines={1}>
                {collection.name}
              </Text>
              <Text style={styles.count}>
                {collection.itemCount} {collection.itemCount === 1 ? 'item' : 'items'}
              </Text>
            </View>
          </Pressable>
        )}
      />
      <Fab label="New collection" onPress={() => router.push('/collection-form')} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  list: {
    padding: spacing.lg,
    paddingBottom: 120,
    gap: spacing.lg,
  },
  row: {
    gap: spacing.lg,
  },
  card: {
    flex: 1,
    maxWidth: '50%',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  pressed: {
    opacity: 0.8,
  },
  cover: {
    width: '100%',
    aspectRatio: 1,
  },
  cardText: {
    padding: spacing.md,
    gap: 2,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  count: {
    fontSize: 13,
    color: colors.textMuted,
  },
});
