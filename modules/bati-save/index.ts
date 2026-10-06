import { requireOptionalNativeModule } from "expo";

/**
 * Android's "Save as", in two calls (see BatiSaveModule.kt): ask where first, write after. The
 * picker comes first because the snapshot is a whole database, and making one for a hero who
 * closes the picker is work, and a plaintext file in app storage, for nothing.
 */
export type BatiSave = {
  /** The URI of the document the hero created, or `null` when they backed out. */
  pickTarget(suggestedName: string): Promise<string | null>;
  /**
   * Writes the file at `sourcePath` into that document and reads back what the provider holds:
   * its name as the provider shows it, and the bytes written. Rejects if the sizes disagree.
   */
  writeTo(uri: string, sourcePath: string): Promise<{ name: string; bytes: number }>;
  /**
   * Deletes the document `pickTarget` created, for a save that failed before anything was
   * written: the picker makes the file first, and an empty one left in Downloads reads as a backup.
   */
  discard(uri: string): Promise<void>;
  /** Copies `text` flagged as sensitive (Android 13+), so the system does not preview it. */
  copySensitive(text: string): Promise<void>;
};

/** What `pickTarget` rejects with on a device that has no app to answer. */
export const NO_FILE_PICKER = "NO_FILE_PICKER";

/** The module, or a throw that names the missing build rather than an undefined call. */
export function batiSave(): BatiSave {
  const native = requireOptionalNativeModule<BatiSave>("BatiSave");
  if (!native) throw new Error("BatiSave native module is not in this build");
  return native;
}
