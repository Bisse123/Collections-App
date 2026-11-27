import { useRef, useState } from 'react';
import { Text, TextInput, View, type TextInputInstance } from 'react-native';

import { normalizeTag, normalizeTags } from '../lib/tags';
import { colors } from '../theme';
import { styles } from '../styles/components/TagEditor.styles';
import { TagChip } from './TagChip';

interface TagEditorProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  /** Tags already used elsewhere in the collection, offered as one-tap suggestions. */
  suggestions: string[];
}

/**
 * Edits a list of tags. The text field holds one tag, which is added when the keyboard's
 * done/checkmark key is pressed; the whole text is the tag, commas included. Leaving the field any
 * other way keeps the typed text without adding it. Adding a tag, typed or tapped from the
 * suggestions, closes the keyboard. Existing tags are removed by tapping them.
 * @param props See `TagEditorProps`.
 * @returns The editor element. Calls `onChange` with the full new tag list on every change.
 */
export function TagEditor({ tags, onChange, suggestions }: TagEditorProps) {
  const [draft, setDraft] = useState('');
  const inputRef = useRef<TextInputInstance>(null);

  const addTag = (tag: string) => {
    const newTags = normalizeTags([...tags, tag]);
    if (newTags.length > tags.length) {
      onChange(newTags);
    }
  };

  const handleSubmitEditing = () => {
    if (normalizeTag(draft)) {
      addTag(draft);
      setDraft('');
    }
  };

  const handleSuggestionPress = (tag: string) => {
    addTag(tag);
    inputRef.current?.blur();
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
        ref={inputRef}
        value={draft}
        onChangeText={setDraft}
        onSubmitEditing={handleSubmitEditing}
        placeholder="Add a tag"
        placeholderTextColor={colors.textMuted}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="done"
        submitBehavior="blurAndSubmit"
        style={styles.input}
      />
      {unusedSuggestions.length > 0 && (
        <>
          <Text style={styles.suggestionLabel}>Used in this collection</Text>
          <View style={styles.chipRow}>
            {unusedSuggestions.map((tag) => (
              <TagChip key={tag} label={`+ ${tag}`} onPress={() => handleSuggestionPress(tag)} />
            ))}
          </View>
        </>
      )}
    </View>
  );
}
