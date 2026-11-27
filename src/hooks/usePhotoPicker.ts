import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Alert } from 'react-native';

import { imageUri, storeImage } from '../storage/images';

const PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  allowsEditing: true,
  quality: 0.7,
};

/** What `savePhoto` produced. */
export interface SavedPhoto {
  /** The photo's file name to store in the database, or null when the form has no photo. */
  imageName: string | null;
  /**
   * The file `savePhoto` just wrote, or null when it wrote none. Pass it to `deleteImage` if the
   * rest of the save fails, so the file is not left behind.
   */
  storedImageName: string | null;
}

/** The photo state of a form, as returned by `usePhotoPicker`. */
export interface PhotoPicker {
  /** URI of the photo to show in the form, or null when there is none. */
  previewUri: string | null;
  /** Opens the take / choose / remove photo menu. */
  openMenu: () => void;
  /**
   * Sets the photo already saved for the record being edited.
   * @param imageName The stored file name, or null when the record has no photo.
   */
  setSavedImageName: (imageName: string | null) => void;
  /**
   * Copies a newly picked photo into the app's storage.
   * @returns The photo to save with the record. Writes a file only when a new photo was picked.
   * @throws StorageFullError when the device is too low on free space.
   */
  savePhoto: () => Promise<SavedPhoto>;
}

/**
 * Holds the photo being chosen in a form: the one already saved, a newly picked one, or a removal.
 * Nothing is written to storage until `savePhoto` is called.
 * @returns The form's photo state and the actions that change it.
 */
export function usePhotoPicker(): PhotoPicker {
  const [savedImageName, setSavedImageName] = useState<string | null>(null);
  const [pickedImageUri, setPickedImageUri] = useState<string | null>(null);
  const [imageRemoved, setImageRemoved] = useState(false);

  const previewUri =
    pickedImageUri ?? (savedImageName && !imageRemoved ? imageUri(savedImageName) : null);

  const handlePickedResult = (result: ImagePicker.ImagePickerResult) => {
    if (!result.canceled && result.assets.length > 0) {
      setPickedImageUri(result.assets[0].uri);
      setImageRemoved(false);
    }
  };

  const handleTakePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Camera access needed', 'Allow camera access in your phone settings to take photos.');
      return;
    }
    handlePickedResult(await ImagePicker.launchCameraAsync(PICKER_OPTIONS));
  };

  const handleChooseFromLibrary = async () => {
    handlePickedResult(await ImagePicker.launchImageLibraryAsync(PICKER_OPTIONS));
  };

  const openMenu = () => {
    const buttons: Parameters<typeof Alert.alert>[2] = [
      { text: 'Take photo', onPress: handleTakePhoto },
      { text: 'Choose from library', onPress: handleChooseFromLibrary },
    ];
    if (previewUri) {
      buttons.push({
        text: 'Remove photo',
        style: 'destructive',
        onPress: () => {
          setPickedImageUri(null);
          setImageRemoved(true);
        },
      });
    }
    buttons.push({ text: 'Cancel', style: 'cancel' });
    Alert.alert('Photo', undefined, buttons);
  };

  const savePhoto = async (): Promise<SavedPhoto> => {
    if (pickedImageUri) {
      const storedImageName = await storeImage(pickedImageUri);
      return { imageName: storedImageName, storedImageName };
    }
    return { imageName: imageRemoved ? null : savedImageName, storedImageName: null };
  };

  return { previewUri, openMenu, setSavedImageName, savePhoto };
}
