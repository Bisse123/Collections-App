import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { normalizeTags, parseTagText } from '../lib/tags';
import { colors, radius, spacing } from '../theme';
import { TagChip } from './TagChip';

interface TagEditorProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  /** Tags already used elsewhere in the collection, offered as one-tap suggestions. */
  suggestions: string[];
}

/**
 * Edits a list of tags. Typing a comma or pressing return turns the typed text into tags; existing
 * tags are removed by tapping them; suggestions are added by tapping them.
 * @param props See `TagEditorProps`.
 * @returns The editor element. Calls `onChange` with the full new tag list on every change.
 */
export function TagEditor({ tags, onChange, suggestions }: TagEditorProps) {
  const [draft, setDraft] = useState('');

  const addTags = (newTags: string[]) => {
    if (newTags.length > 0) {
      onChange(normalizeTags([...tags, ...newTags]));
    }
  };

  const handleChangeText = (text: string) => {
    if (text.includes(',')) {
      const parts = text.split(',');
      const remainder = parts.pop() ?? '';
      addTags(parseTagText(parts.join(',')));
      setDraft(remainder);
    } else {
      setDraft(text);
    }
  };

  const handleSubmit = () => {
    addTags(parseTagText(draft));
    setDraft('');
  };

  const unusedSuggestions = suggestions.filter((tag) => !tags.includes(tag));

  return (
    <View style={styles.container}>
      {tags.length > 0 && (
        <View style={styles.chipRow}>
          {tags.map((tag) => (
            <TagChip
              key={tag}
              label={tag}
              selected
              removable
              onPress={() => onChange(tags.filter((t) => t !== tag))}
            />
          ))}
        </View>
      )}
      <TextInput
        value={draft}
        onChangeText={handleChangeText}
        onSubmitEditing={handleSubmit}
        onBlur={handleSubmit}
        placeholder="Add tags, separated by commas"
        placeholderTextColor={colors.textMuted}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="done"
        submitBehavior="submit"
        style={styles.input}
      />
      {unusedSuggestions.length > 0 && (
        <>
          <Text style={styles.suggestionLabel}>Used in this collection</Text>
          <View style={styles.chipRow}>
            {unusedSuggestions.map((tag) => (
              <TagChip key={tag} label={`+ ${tag}`} onPress={() => addTags([tag])} />
            ))}
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
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
  suggestionLabel: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
});
