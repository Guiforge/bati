import { File, Paths } from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import {
  addSessionPhoto,
  journalPhotoWidth,
  MAX_SESSION_PHOTOS,
  SessionPhotosFullError,
} from "@/db/sessionPhotos";
import { encodePhoto } from "@/src/exercisePhoto";
import { reportError } from "@/src/reportError";

export type PhotoOutcome = "added" | "full" | "denied" | "cancelled";

/**
 * `expo-image-picker` copies the original, EXIF and GPS included, into the app cache. Once the
 * re-encoded photo is in the database that copy is only a leftover, so it goes. Only a file under
 * the app's own cache is ever deleted: a picker that hands back a `content://` or a gallery path
 * must not cost the hero their original.
 */
export function discardPickerCopy(uri: string): void {
  if (!uri.startsWith(Paths.cache.uri)) return;
  try {
    new File(uri).delete();
  } catch (error) {
    reportError("journal.photo.cache", error);
  }
}

/** One picked asset into the database at 1080 px on its longest side, its cache copy discarded. */
async function storeAsset(
  sessionUuid: string,
  asset: { uri: string; width: number; height: number },
): Promise<void> {
  try {
    const image = await encodePhoto(asset.uri, journalPhotoWidth(asset.width, asset.height));
    await addSessionPhoto(sessionUuid, image);
  } finally {
    discardPickerCopy(asset.uri);
  }
}

/**
 * The system photo picker, up to the places left on the session (`live` already there), each pick
 * stored. No permission of its own: the same call as the avatar and exercise photos.
 */
export async function chooseSessionPhotos(
  sessionUuid: string,
  live: number,
): Promise<PhotoOutcome> {
  const room = MAX_SESSION_PHOTOS - live;
  if (room <= 0) return "full";
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) return "denied";

  const picked = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsMultipleSelection: true,
    selectionLimit: room,
    quality: 1,
  });
  if (picked.canceled) return "cancelled";

  let outcome: PhotoOutcome = "cancelled";
  for (const asset of picked.assets) {
    try {
      await storeAsset(sessionUuid, asset);
      outcome = "added";
    } catch (error) {
      if (error instanceof SessionPhotosFullError) return "full";
      throw error;
    }
  }
  return outcome;
}
