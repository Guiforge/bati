import { File } from "expo-file-system";
// The module, not the `@/db` barrel, for the reason `src/updateCheck.ts` gives: this runs at launch.
import { deletePreference, preferences } from "@/db/preferences";
import { encodePhoto } from "@/src/exercisePhoto";

/** An avatar is drawn at 96 px at most; 256 keeps it sharp at 3x and near 30 KB as base64. */
export const AVATAR_SIZE = 256;

/** The picker's square crop, as the data URI the `customAvatar` preference stores. */
export function encodeAvatar(uri: string): Promise<string> {
  return encodePhoto(uri, AVATAR_SIZE);
}

/**
 * Converts an avatar stored before `customAvatar` existed: a path into the image picker's cache,
 * which Android may purge and no backup carried. Returns what the hero should now see: the data
 * URI, or null when the file is already gone (there is nothing left to save, and the broken path
 * only ever drew an empty circle).
 *
 * Throws when the file is there but will not encode, leaving the old path in place to retry on
 * the next launch.
 */
export async function portLegacyAvatar(path: string): Promise<string | null> {
  if (!new File(path).exists) {
    // A delete, not `setCustomAvatarUri(null)`: that writes a dated "preset chosen" that would
    // win a merge against a photo the hero really picked on another phone.
    await deletePreference("customAvatarUri");
    return null;
  }
  const portable = await encodeAvatar(path);
  await preferences.setCustomAvatarUri(portable);
  return portable;
}
