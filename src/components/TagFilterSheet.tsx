import { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { normalizeTag } from '../lib/tags';
import { colors } from '../theme';
import { styles } from '../styles/components/TagFilterSheet.styles';

interface TagFilterSheetProps {
  /** Shows the sheet while true. */
  visible: boolean;
  /** Every tag in the collection with how many items carry it, in display order. */
  tagCounts: { tag: string; count: number }[];
  /** Tags currently used as filters. */
  selectedTags: string[];
  /** Called with a tag to switch it on or off as a filter. */
  onToggleTag: (tag: string) => void;
  /** Called to switch off every tag filter. */
  onClear: () => void;
  /** Called when the sheet should close (Done, swipe down or the Android back button). */
  onClose: () => void;
}

/**
 * A sheet listing every tag of a collection, with a search field that narrows the list, for
 * switching tag filters on and off.
 * @param props See `TagFilterSheetProps`.
 * @returns The sheet element. Clears its own search text when closed.
 */
export function TagFilterSheet({
  visible,
  tagCounts,
  selectedTags,
  onToggleTag,
  onClear,
  onClose,
}: TagFilterSheetProps) {
  const [query, setQuery] = useState('');

  const visibleTags = useMemo(() => {
    const needle = normalizeTag(query);
    return needle ? tagCounts.filter(({ tag }) => tag.includes(needle)) : tagCounts;
  }, [tagCounts, query]);

  const handleClose = () => {
    setQuery('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <SafeAreaView style={styles.sheet} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Text style={styles.title}>Filter by tag</Text>
          <Pressable onPress={handleClose} hitSlop={8}>
            <Text style={styles.done}>Done</Text>
          </Pressable>
        </View>

        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search tags"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="while-editing"
          returnKeyType="search"
          style={styles.search}
        />

        <View style={styles.summary}>
          <Text style={styles.summaryText}>
            {selectedTags.length === 0 ? 'No tags selected' : `${selectedTags.length} selected`}
          </Text>
          {selectedTags.length > 0 && (
            <Pressable onPress={onClear} hitSlop={8}>
              <Text style={styles.clear}>Clear all</Text>
            </Pressable>
          )}
        </View>

        <FlatList
          data={visibleTags}
          keyExtractor={({ tag }) => tag}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.empty}>No tags match “{query.trim()}”</Text>}
          renderItem={({ item: { tag, count } }) => {
            const selected = selectedTags.includes(tag);
            return (
              <Pressable
                onPress={() => onToggleTag(tag)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: selected }}
                style={({ pressed }) => [styles.row, pressed && styles.pressed]}
              >
                <View style={[styles.check, selected && styles.checkSelected]}>
                  {selected && <Text style={styles.checkMark}>✓</Text>}
                </View>
                <Text style={styles.tag} numberOfLines={2}>
                  {tag}
                </Text>
                <Text style={styles.count}>{count}</Text>
              </Pressable>
            );
          }}
        />
      </SafeAreaView>
    </Modal>
  );
}
