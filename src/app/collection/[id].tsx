import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, Text, TextInput, View } from 'react-native';

import { EmptyState } from '../../components/EmptyState';
import { Fab } from '../../components/Fab';
import { TagChip } from '../../components/TagChip';
import { TagFilterSheet } from '../../components/TagFilterSheet';
import { Thumbnail } from '../../components/Thumbnail';
import { getCollection, listItems, type Collection, type Item } from '../../db/repository';
import { countTags, filterItems, type TagMatchMode } from '../../lib/tags';
import { colors } from '../../theme';
import { styles } from '../../styles/screens/collection.styles';

/**
 * One collection's items, with a text search and tag filters.
 * @returns The screen element.
 */
export default function CollectionScreen() {
  const db = useSQLiteContext();
  const { id } = useLocalSearchParams<{ id: string }>();
  const collectionId = Number(id);

  const [collection, setCollection] = useState<Collection | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [matchMode, setMatchMode] = useState<TagMatchMode>('any');
  const [tagSheetOpen, setTagSheetOpen] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      Promise.all([getCollection(db, collectionId), listItems(db, collectionId)]).then(
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
      );
      return () => {
        active = false;
      };
    }, [db, collectionId]),
  );

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
          <Pressable onPress={() => setSelectedTags([])} hitSlop={8}>
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
            <Pressable
              hitSlop={8}
              onPress={() =>
                router.push({ pathname: '/collection-form', params: { id: String(collectionId) } })
              }
            >
              <Text style={styles.headerButton}>Edit</Text>
            </Pressable>
          ),
        }}
      />
      <FlatList
        data={visibleItems}
        keyExtractor={(item) => String(item.id)}
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
            style={({ pressed }) => [styles.row, pressed && styles.pressed]}
            onPress={() => router.push(`/item/${item.id}`)}
          >
            <Thumbnail imageName={item.imageName} fallbackText={item.title} style={styles.thumb} />
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
          router.push({ pathname: '/item-form', params: { collectionId: String(collectionId) } })
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
