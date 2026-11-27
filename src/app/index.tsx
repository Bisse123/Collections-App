import { router, Stack, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';

import { EmptyState } from '../components/EmptyState';
import { Fab } from '../components/Fab';
import { Thumbnail } from '../components/Thumbnail';
import { listCollectionSummaries } from '../data/collections';
import { prepareImport, setPendingImport } from '../data/importExport';
import type { CollectionSummary } from '../data/types';
import { useGridLayout } from '../hooks/useGridLayout';
import { describeError } from '../lib/errors';
import { showMessage } from '../platform/dialogs';
import { pickFile } from '../platform/files';
import { styles } from '../styles/screens/home.styles';
import { spacing, tileWidths } from '../theme';

/** File types offered when importing a collection. */
const IMPORT_FILE_TYPES = '.zip,application/zip,application/x-zip-compressed';

/**
 * Pads a list with empty cells so its last row is full, which keeps a stretched tile on its own in
 * the last row from growing wider than the tiles above it.
 * @param collections The collections to show.
 * @param columns Tiles per row.
 * @returns The collections followed by enough nulls to complete the last row.
 */
function fillLastRow(collections: CollectionSummary[], columns: number): (CollectionSummary | null)[] {
  const remainder = collections.length % columns;
  return remainder === 0 ? collections : [...collections, ...Array<null>(columns - remainder).fill(null)];
}

/**
 * Home screen: a grid of all collections, with an Import button. Tap a collection to open it,
 * long-press to edit it. Portrait windows show two stretched tiles per row; landscape windows show
 * as many fixed-size tiles as fit.
 * @returns The screen element.
 */
export default function CollectionsScreen() {
  const [collections, setCollections] = useState<CollectionSummary[]>([]);
  const [loaded, setLoaded] = useState(false);
  const layout = useGridLayout({
    tileWidth: tileWidths.collection,
    gap: spacing.lg,
    padding: spacing.lg,
    portraitColumns: 2,
  });

  useFocusEffect(
    useCallback(() => {
      let active = true;
      listCollectionSummaries().then(
        (summaries) => {
          if (active) {
            setCollections(summaries);
            setLoaded(true);
          }
        },
        (error) => showMessage('Could not load your collections', describeError(error, 'loading')),
      );
      return () => {
        active = false;
      };
    }, []),
  );

  const handleImportPress = async () => {
    let bytes: Uint8Array | null;
    try {
      bytes = await pickFile(IMPORT_FILE_TYPES);
    } catch (error) {
      showMessage('Could not import', describeError(error, 'opening the file'));
      return;
    }
    if (!bytes) {
      return;
    }
    try {
      setPendingImport(await prepareImport(bytes));
      router.push('/import-review');
    } catch (error) {
      showMessage('Could not import', describeError(error, 'reading the file'));
    }
  };

  return (
    <View style={styles.screen}>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable onPress={handleImportPress} hitSlop={8} accessibilityRole="button">
              <Text style={styles.headerButton}>Import</Text>
            </Pressable>
          ),
        }}
      />
      <FlatList
        key={`columns-${layout.columns}`}
        data={layout.landscape ? collections : fillLastRow(collections, layout.columns)}
        keyExtractor={(collection, index) => collection?.id ?? `empty-${index}`}
        numColumns={layout.columns}
        columnWrapperStyle={layout.columns > 1 ? styles.row : undefined}
        contentContainerStyle={styles.list}
        contentInsetAdjustmentBehavior="automatic"
        ListEmptyComponent={
          loaded ? (
            <EmptyState
              title="No collections yet"
              message="Tap + to start your first collection — cards, plants, vinyl, anything. Or import one you exported earlier."
            />
          ) : undefined
        }
        renderItem={({ item: collection }) =>
          collection === null ? (
            <View style={[styles.card, styles.cardPortrait, styles.cardSpacer]} aria-hidden />
          ) : (
            <Pressable
              style={({ pressed }) => [
                styles.card,
                layout.landscape ? styles.cardLandscape : styles.cardPortrait,
                pressed && styles.pressed,
              ]}
              onPress={() => router.push(`/collection/${collection.id}`)}
              onLongPress={() => router.push({ pathname: '/collection-form', params: { id: collection.id } })}
              accessibilityRole="link"
              accessibilityLabel={collection.name}
            >
              <Thumbnail imageId={collection.coverImageId} fallbackText={collection.name} style={styles.cover} />
              <View style={styles.cardText}>
                <Text style={styles.name} numberOfLines={1}>
                  {collection.name}
                </Text>
                <Text style={styles.count}>
                  {collection.itemCount} {collection.itemCount === 1 ? 'item' : 'items'}
                </Text>
              </View>
            </Pressable>
          )
        }
      />
      <Fab label="New collection" onPress={() => router.push('/collection-form')} />
    </View>
  );
}
