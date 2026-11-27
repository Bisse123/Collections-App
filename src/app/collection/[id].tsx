import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, Text, TextInput, View } from 'react-native';

import { EmptyState } from '../../components/EmptyState';
import { Fab } from '../../components/Fab';
import { TagChip } from '../../components/TagChip';
import { TagFilterSheet } from '../../components/TagFilterSheet';
import { Thumbnail } from '../../components/Thumbnail';
import { getCollection, listItems } from '../../data/collections';
import { exportCollection } from '../../data/importExport';
import type { Collection, Item } from '../../data/types';
import { useGridLayout } from '../../hooks/useGridLayout';
import { describeError } from '../../lib/errors';
import { countTags, filterItems, type TagMatchMode } from '../../lib/tags';
import { showMessage } from '../../platform/dialogs';
import { saveFile } from '../../platform/files';
import { colors, spacing, tileWidths } from '../../theme';
import { styles } from '../../styles/screens/collection.styles';

/**
 * One collection's items, with a text search, tag filters, and Export and Edit buttons. Portrait
 * windows list the items in one full-width column; landscape windows show as many fixed-width
 * columns as fit.
 * @returns The screen element.
 */
export default function CollectionScreen() {
  const { id: collectionId } = useLocalSearchParams<{ id: string }>();

  const [collection, setCollection] = useState<Collection | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [matchMode, setMatchMode] = useState<TagMatchMode>('any');
  const [tagSheetOpen, setTagSheetOpen] = useState(false);
  const layout = useGridLayout({
    tileWidth: tileWidths.item,
    gap: spacing.sm,
    padding: spacing.lg,
    portraitColumns: 1,
  });

  useFocusEffect(
    useCallback(() => {
      let active = true;
      Promise.all([getCollection(collectionId), listItems(collectionId)]).then(
        ([loadedCollection, loadedItems]) => {
          if (!active) {
            return;
          }
          setCollection(loadedCollection);
          setItems(loadedItems);
          setLoaded(true);
          const existingTags = new Set(loadedItems.flatMap((item) => item.tags));
          setSelectedTags((current) => current.filter((tag) => existingTags.has(tag)));
        },
        (error) => showMessage('Could not load this collection', describeError(error, 'loading')),
      );
      return () => {
        active = false;
      };
    }, [collectionId]),
  );

  const handleExportPress = async () => {
    try {
      const { fileName, bytes } = await exportCollection(collectionId);
      await saveFile(fileName, bytes, 'application/zip');
    } catch (error) {
      showMessage('Could not export', describeError(error, 'exporting'));
    }
  };

  const tagCounts = useMemo(() => countTags(items), [items]);
  const visibleItems = useMemo(
    () => filterItems(items, selectedTags, matchMode, query),
    [items, selectedTags, matchMode, query],
  );
  const isFiltering = selectedTags.length > 0 || query.trim().length > 0;

  const toggleTag = (tag: string) => {
    setSelectedTags((current) =>
      current.includes(tag) ? current.filter((t) => t !== tag) : [...current, tag],
    );
  };

  const header = (
    <View style={styles.filters}>
      <View style={styles.searchRow}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search titles and descriptions"
          placeholderTextColor={colors.textMuted}
          clearButtonMode="while-editing"
          style={styles.search}
        />
        {tagCounts.length > 0 && (
          <Pressable
            onPress={() => setTagSheetOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Filter by tag"
            style={({ pressed }) => [
              styles.tagButton,
              selectedTags.length > 0 && styles.tagButtonActive,
              pressed && styles.pressed,
            ]}
          >
            <Text style={[styles.tagButtonText, selectedTags.length > 0 && styles.tagButtonTextActive]}>
              {selectedTags.length > 0 ? `Tags · ${selectedTags.length}` : 'Tags'}
            </Text>
          </Pressable>
        )}
      </View>
      {selectedTags.length > 0 && (
        <View style={styles.selectedTags}>
          {selectedTags.map((tag) => (
            <TagChip key={tag} label={tag} selected removable onPress={() => toggleTag(tag)} />
          ))}
        </View>
      )}
      {selectedTags.length > 0 && (
        <View style={styles.filterBar}>
          {selectedTags.length > 1 ? (
            <View style={styles.segment}>
              {(['any', 'all'] as const).map((mode) => (
                <Pressable
                  key={mode}
                  onPress={() => setMatchMode(mode)}
                  style={[styles.segmentOption, matchMode === mode && styles.segmentOptionActive]}
                >
                  <Text style={[styles.segmentText, matchMode === mode && styles.segmentTextActive]}>
                    {mode === 'any' ? 'Match any' : 'Match all'}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : (
            <View />
          )}
          <Pressable onPress={() => setSelectedTags([])} hitSlop={8} accessibilityRole="button">
            <Text style={styles.clear}>Clear tags</Text>
          </Pressable>
        </View>
      )}
      {isFiltering && items.length > 0 && (
        <Text style={styles.resultCount}>
          Showing {visibleItems.length} of {items.length}
        </Text>
      )}
    </View>
  );

  return (
    <View style={styles.screen}>
      <Stack.Screen
        options={{
          title: collection?.name ?? '',
          headerRight: () => (
            <View style={styles.headerButtons}>
              <Pressable hitSlop={8} onPress={handleExportPress} accessibilityRole="button">
                <Text style={styles.headerButton}>Export</Text>
              </Pressable>
              <Pressable
                hitSlop={8}
                accessibilityRole="button"
                onPress={() => router.push({ pathname: '/collection-form', params: { id: collectionId } })}
              >
                <Text style={styles.headerButton}>Edit</Text>
              </Pressable>
            </View>
          ),
        }}
      />
      <FlatList
        key={`columns-${layout.columns}`}
        numColumns={layout.columns}
        columnWrapperStyle={layout.columns > 1 ? styles.columns : undefined}
        data={visibleItems}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={items.length > 0 ? header : undefined}
        contentContainerStyle={styles.list}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          !loaded ? undefined : items.length === 0 ? (
            <EmptyState title="Nothing here yet" message="Tap + to add the first item." />
          ) : (
            <EmptyState title="No matches" message="Try other tags or a different search." />
          )
        }
        renderItem={({ item }) => (
          <Pressable
            style={({ pressed }) => [styles.row, layout.landscape && styles.rowLandscape, pressed && styles.pressed]}
            onPress={() => router.push(`/item/${item.id}`)}
            accessibilityRole="link"
            accessibilityLabel={item.title}
          >
            <Thumbnail imageId={item.imageId} fallbackText={item.title} style={styles.thumb} />
            <View style={styles.rowText}>
              <Text style={styles.title} numberOfLines={1}>
                {item.title}
              </Text>
              {item.description ? (
                <Text style={styles.description} numberOfLines={1}>
                  {item.description}
                </Text>
              ) : null}
              {item.tags.length > 0 && (
                <Text style={styles.tags} numberOfLines={1}>
                  {item.tags.map((tag) => `#${tag}`).join('  ')}
                </Text>
              )}
            </View>
          </Pressable>
        )}
      />
      <Fab
        label="Add item"
        onPress={() =>
          router.push({ pathname: '/item-form', params: { collectionId } })
        }
      />
      <TagFilterSheet
        visible={tagSheetOpen}
        tagCounts={tagCounts}
        selectedTags={selectedTags}
        onToggleTag={toggleTag}
        onClear={() => setSelectedTags([])}
        onClose={() => setTagSheetOpen(false)}
      />
    </View>
  );
}
