import { ImageManipulator, SaveFormat } from "expo-image-manipulator";

/** Wide enough to read as a session hero, small enough that fifty of them stay a couple of MB. */
export const MAX_PHOTO_WIDTH = 512;

/**
 * A hero's photo becomes part of the exercise row, not a file beside it.
 *
 * A backup is `VACUUM INTO` of the database alone (`db/backup.ts`), so a `file://` path would
 * survive on this phone and arrive broken on the next one — and `expo-image-picker`'s own URI
 * lives in a cache directory Android may clear underneath it. `getExerciseAsset` renders the
 * resulting data URI like any other source.
 *
 * ponytail: the picture lives in the row so the backup carries it. Ceiling: row size — 512 px at
 * compress 0.6 is ~40 KB, so fifty of them is ~2 MB, and every automatic backup pays it. If
 * someone ever fills a catalogue this way, move the blobs to their own table and teach the
 * exporter about a second file.
 */
export async function encodePhoto(uri: string): Promise<string> {
  // Resize first, or a 4000 px photo bloats the database and every backup with it.
  const image = await ImageManipulator.manipulate(uri)
    .resize({ width: MAX_PHOTO_WIDTH })
    .renderAsync();

  const saved = await image.saveAsync({ compress: 0.6, format: SaveFormat.JPEG, base64: true });

  if (!saved.base64) throw new Error("Image encoding returned no data");
  return `data:image/jpeg;base64,${saved.base64}`;
}
