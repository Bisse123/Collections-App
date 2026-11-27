import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';

import type { PhotoUpdate } from '../data/collections';
import { preparePhoto } from '../platform/photos';
import { useImageUrl } from './useImageUrl';

/** The photo state of a form, as returned by `usePhotoPicker`. */
export interface PhotoPicker {
  /** URL of the photo to show in the form, or null when there is none. */
  previewUri: string | null;
  /**
   * Opens the photo library (on the web, the file picker, which on phones also offers the camera).
   * Must be called directly from a tap.
   * @returns Resolves once the picker closes. A picked photo becomes the new preview.
   */
  pickPhoto: () => Promise<void>;
  /** Clears the photo from the form. */
  removePhoto: () => void;
  /**
   * Sets the photo already saved for the record being edited.
   * @param imageId The stored image id, or null when the record has no photo.
   */
  setSavedImageId: (imageId: string | null) => void;
  /**
   * Converts the form's photo choice into what the data layer saves. A newly picked photo is
   * shrunk and re-encoded here.
   * @returns What to do with the record's photo.
   * @throws Error when a picked photo cannot be read.
   */
  getPhotoUpdate: () => Promise<PhotoUpdate>;
}

/**
 * Holds the photo being chosen in a form: the one already saved, a newly picked one, or a removal.
 * Nothing is saved until the form saves the result of `getPhotoUpdate`.
 * @returns The form's photo state and the actions that change it.
 */
export function usePhotoPicker(): PhotoPicker {
  const [savedImageId, setSavedImageId] = useState<string | null>(null);
  const [pickedUri, setPickedUri] = useState<string | null>(null);
  const [removed, setRemoved] = useState(false);
  const savedUrl = useImageUrl(removed ? null : savedImageId);

  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
    if (!result.canceled && result.assets.length > 0) {
      setPickedUri(result.assets[0].uri);
      setRemoved(false);
    }
  };

  const removePhoto = () => {
    setPickedUri(null);
    setRemoved(true);
  };

  const getPhotoUpdate = async (): Promise<PhotoUpdate> => {
    if (pickedUri) {
      return { kind: 'replace', image: await preparePhoto(pickedUri) };
    }
    return removed ? { kind: 'remove' } : { kind: 'keep' };
  };

  return {
    previewUri: pickedUri ?? savedUrl,
    pickPhoto,
    removePhoto,
    setSavedImageId,
    getPhotoUpdate,
  };
}
