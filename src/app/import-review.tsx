import { router, Stack } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { EmptyState } from '../components/EmptyState';
import { applyImport, getPendingImport, setPendingImport } from '../data/importExport';
import { showSaveError } from '../lib/errors';
import { defaultImportChoices, describeItemChange, type ImportChoices } from '../lib/importDiff';
import { confirmAsync } from '../platform/dialogs';
import { styles } from '../styles/screens/importReview.styles';

/**
 * Formats a timestamp for showing when something was last edited.
 * @param time Milliseconds since epoch.
 * @returns A short local date and time, e.g. "3 May 2026, 14:02".
 */
function formatTime(time: number): string {
  return new Date(time).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

/**
 * Formats an item count.
 * @param count How many items.
 * @returns "1 item" or "<count> items".
 */
function itemCount(count: number): string {
  return `${count} ${count === 1 ? 'item' : 'items'}`;
}

/**
 * A titled block of the review.
 * @param props `title` is the heading; `children` is the content.
 * @returns The section element.
 */
function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle} accessibilityRole="header">
        {title}
      </Text>
      {children}
    </View>
  );
}

/**
 * Two-option switch for picking which version of something to keep, shown when this device has the
 * newer edit.
 * @param props `keepLocal` is the current pick; `onChange` receives the new pick; `localTime` and
 * `fileTime` are the two versions' edit times; `label` names the thing for screen readers.
 * @returns The picker element.
 */
function VersionPicker({
  keepLocal,
  onChange,
  localTime,
  fileTime,
  label,
}: {
  keepLocal: boolean;
  onChange: (keepLocal: boolean) => void;
  localTime: number;
  fileTime: number;
  label: string;
}) {
  return (
    <View style={styles.conflict}>
      <Text style={styles.conflictNote}>
        {`Edited on this device ${formatTime(localTime)}, after the file's version (${formatTime(fileTime)}).`}
      </Text>
      <View style={styles.segment} accessibilityRole="radiogroup" accessibilityLabel={label}>
        {[
          { value: false, text: "Use the file's" },
          { value: true, text: "Keep this device's" },
        ].map((option) => {
          const selected = keepLocal === option.value;
          return (
            <Pressable
              key={option.text}
              onPress={() => onChange(option.value)}
              accessibilityRole="radio"
              aria-checked={selected}
              style={[styles.segmentOption, selected && styles.segmentOptionActive]}
            >
              <Text style={[styles.segmentText, selected && styles.segmentTextActive]}>{option.text}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/**
 * Review screen for an import: shows what the chosen file would add, change and remove, lets the
 * user decide, then saves. Reads the import prepared by the home screen's Import button.
 * @returns The screen element.
 */
export default function ImportReviewScreen() {
  const [prepared] = useState(getPendingImport);
  const [choices, setChoices] = useState<ImportChoices | null>(() =>
    prepared ? defaultImportChoices(prepared.review) : null,
  );
  const [saving, setSaving] = useState(false);

  if (!prepared || !choices) {
    return (
      <>
        <Stack.Screen options={{ title: 'Import collection' }} />
        <EmptyState title="Nothing to import" message="Choose a file with Import on the home screen." />
      </>
    );
  }

  const { review } = prepared;
  const isUpToDate =
    review.local !== null &&
    !review.details &&
    review.added.length === 0 &&
    review.changed.length === 0 &&
    review.localOnly.length === 0;

  const setKeepLocalItem = (itemId: string, keepLocal: boolean) => {
    const keepLocalItemIds = new Set(choices.keepLocalItemIds);
    if (keepLocal) {
      keepLocalItemIds.add(itemId);
    } else {
      keepLocalItemIds.delete(itemId);
    }
    setChoices({ ...choices, keepLocalItemIds });
  };

  const handleImport = async () => {
    if (isUpToDate) {
      setPendingImport(null);
      router.back();
      return;
    }
    if (choices.removeLocalOnly && review.localOnly.length > 0) {
      const confirmed = await confirmAsync({
        title: `Delete ${itemCount(review.localOnly.length)}?`,
        message: `${itemCount(review.localOnly.length)} that ${review.localOnly.length === 1 ? 'is' : 'are'} only on this device will be permanently deleted, including their photos.`,
        confirmLabel: 'Delete and import',
        destructive: true,
      });
      if (!confirmed) {
        return;
      }
    }
    setSaving(true);
    try {
      const collectionId = await applyImport(prepared, choices);
      setPendingImport(null);
      router.replace(`/collection/${collectionId}`);
    } catch (error) {
      setSaving(false);
      showSaveError(error);
    }
  };

  const buttonLabel = isUpToDate ? 'Done' : review.local ? 'Update collection' : 'Import collection';

  return (
    <ScrollView contentContainerStyle={styles.content} contentInsetAdjustmentBehavior="automatic">
      <Stack.Screen options={{ title: 'Import collection' }} />

      {review.local === null ? (
        <View style={styles.intro}>
          <Text style={styles.heading}>{review.incoming.name}</Text>
          <Text style={styles.body}>
            This is a new collection. Importing adds it with {itemCount(review.added.length)}.
          </Text>
        </View>
      ) : (
        <View style={styles.intro}>
          <Text style={styles.heading}>{review.local.name}</Text>
          <Text style={styles.body}>
            {isUpToDate
              ? 'This collection is already up to date with the file. Nothing will change.'
              : 'This collection is already on this device. Here is what the file would change.'}
          </Text>
        </View>
      )}

      {review.details && (
        <Section title="Collection details">
          {review.details.nameChanged && (
            <Text style={styles.body}>
              {`Name: "${review.details.local.name}" → "${review.details.incoming.name}"`}
            </Text>
          )}
          {review.details.photoChanged && <Text style={styles.body}>Photo changed</Text>}
          {review.details.localIsNewer && (
            <VersionPicker
              keepLocal={choices.keepLocalDetails}
              onChange={(keepLocalDetails) => setChoices({ ...choices, keepLocalDetails })}
              localTime={review.details.local.updatedAt}
              fileTime={review.details.incoming.updatedAt}
              label="Collection details version"
            />
          )}
        </Section>
      )}

      {review.local !== null && review.added.length > 0 && (
        <Section title={`New items (${review.added.length})`}>
          {review.added.map((item) => (
            <Text key={item.id} style={styles.listItem}>
              {item.title}
            </Text>
          ))}
        </Section>
      )}

      {review.changed.length > 0 && (
        <Section title={`Changed items (${review.changed.length})`}>
          {review.changed.map((change) => (
            <View key={change.local.id} style={styles.card} testID={`changed-${change.local.id}`}>
              <Text style={styles.cardTitle}>{change.incoming.title}</Text>
              {describeItemChange(change).map((line) => (
                <Text key={line} style={styles.cardLine}>
                  {line}
                </Text>
              ))}
              {change.localIsNewer && (
                <VersionPicker
                  keepLocal={choices.keepLocalItemIds.has(change.local.id)}
                  onChange={(keepLocal) => setKeepLocalItem(change.local.id, keepLocal)}
                  localTime={change.local.updatedAt}
                  fileTime={change.incoming.updatedAt}
                  label={`Version of ${change.incoming.title}`}
                />
              )}
            </View>
          ))}
        </Section>
      )}

      {review.localOnly.length > 0 && (
        <Section title={`Only on this device (${review.localOnly.length})`}>
          {review.localOnly.map((item) => (
            <Text key={item.id} style={styles.listItem}>
              {item.title}
            </Text>
          ))}
          <View style={styles.options} accessibilityRole="radiogroup" accessibilityLabel="Items only on this device">
            {[
              {
                remove: false,
                title: 'Keep them',
                text: 'Add the new items and update the changed ones. Items only on this device stay.',
              },
              {
                remove: true,
                title: 'Remove them',
                text: 'Make the collection match the file. Items only on this device are deleted.',
              },
            ].map((option) => {
              const selected = choices.removeLocalOnly === option.remove;
              return (
                <Pressable
                  key={option.title}
                  onPress={() => setChoices({ ...choices, removeLocalOnly: option.remove })}
                  accessibilityRole="radio"
                  aria-checked={selected}
                  accessibilityLabel={option.title}
                  style={[styles.option, selected && styles.optionSelected]}
                >
                  <View style={[styles.radio, selected && styles.radioSelected]} />
                  <View style={styles.optionText}>
                    <Text style={styles.optionTitle}>{option.title}</Text>
                    <Text style={styles.optionBody}>{option.text}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </Section>
      )}

      {review.unchangedCount > 0 && (
        <Text style={styles.muted}>{itemCount(review.unchangedCount)} unchanged.</Text>
      )}

      <Pressable
        onPress={handleImport}
        disabled={saving}
        accessibilityRole="button"
        style={({ pressed }) => [styles.button, saving && styles.buttonDisabled, pressed && styles.pressed]}
      >
        <Text style={styles.buttonText}>{saving ? 'Importing…' : buttonLabel}</Text>
      </Pressable>
    </ScrollView>
  );
}
