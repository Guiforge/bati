import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Android's own backup is how a new phone gets its hero back with nobody lifting a finger, and
 * `plugins/withAndroidBackupRules.js` is what decides what it carries. Pinned on the committed
 * prebuild output, like the manifest test beside it, because the failure is silent: a dependency
 * that ships its own allow-list (expo-secure-store does) would stop the database travelling, and
 * nothing would say so until someone changed phones.
 */
const res = join(__dirname, "..", "android", "app", "src", "main");
const read = (file: string) => readFileSync(join(res, file), "utf8");

test("the manifest points Android's backup at our rules and nobody else's", () => {
  const manifest = read("AndroidManifest.xml");
  expect(manifest).toContain('android:allowBackup="true"');
  expect(manifest).toContain('android:fullBackupContent="@xml/bati_backup_rules"');
  expect(manifest).toContain('android:dataExtractionRules="@xml/bati_data_extraction_rules"');
});

test.each([
  ["res/xml/bati_backup_rules.xml", 1],
  ["res/xml/bati_data_extraction_rules.xml", 2],
])("%s carries the database and never the backup key", (file, sections) => {
  const rules = read(file);
  const count = (needle: string) => rules.split(needle).length - 1;

  // Once per section: cloud backup and device transfer must agree, or a phone-to-phone move
  // and a restore from the cloud would bring back different heroes.
  expect(count('<include domain="file" path="SQLite/"/>')).toBe(sections);
  expect(count('<exclude domain="sharedpref" path="SecureStore"/>')).toBe(sections);
});
