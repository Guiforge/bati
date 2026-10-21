# Security audit run 1 fixes: implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the two confirmed findings and the widget-provider lead from the 2026-10-21 security audit, plus the hardening notes worth fixing, on branch `fix/security-audit-run-1`.

**Architecture:** Each fix moves a check to the one place every path goes through: the image sink, not the import path. The migration runner judges a restored file before the swap, not after. The account shape is fixed where it is built. TDD throughout: a failing test that reproduces the audit's observation comes before each change.

**Tech Stack:** Expo 57 / React Native 0.86, TypeScript, expo-sqlite + Drizzle, jest (jest-expo) and the Node harness under `test/node/`, Expo config plugins.

**Spec:** the audit records in the published doc "Bati security audit, run 1" and `~/security-audit-skill/bati/run-1/findings.json` (fingerprints quoted per task).

## Global Constraints

- Work in the worktree `/home/guiforge/Documents/code/bati-security-fixes` on `fix/security-audit-run-1`. Run `npm ci` there once before any check.
- Jest ignores `/.claude/worktrees/` only; this worktree is outside it. Run suites with `nvm exec 24 npx jest <path>`, since CI is on Node 24.
- At most 2 jest/tsc processes at once. Never run `tsc` while a full `npm test` is running.
- No new user-visible copy. Reuse existing `backup.rejected.*` keys. Copy rules from `docs/product/writing.md` apply to any comment that becomes copy.
- No new dependency. No native module change.
- Never write `android/` by hand except where a task says that prebuild output is regenerated. CI diffs `expo prebuild` against the committed `android/`.
- Commits in English, one per task, ending with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Stage only the task's files.
- Checks before the branch is done: `npx tsc --noEmit`, `npx biome check`, `nvm exec 24 npm test`, `npm run deadcode`.

## Review Focus

1. **A hero's own pictures must still show.** A legit `data:image/jpeg` photo for an exercise, quest, adventure, boss, avatar or journal page still renders after task 1. A legacy pre-`customAvatar` avatar stored as a `file://` cache path shows the preset until `portLegacyAvatar` converts it at that launch. Pinned in task 1 by a test on `getAvatarSource` with a `data:` value.
2. **An honest backup from an older Bati must still restore.** Task 2 must not turn every older backup into a refusal. Pinned by a test that restores a file stopped at an earlier migration and expects success, with the file at the newest migration afterwards.
3. **A file that fails to migrate leaves nothing behind.** A refusal from `bringForward` discards the staged file, and no `beginRestore` runs. Pinned in task 2's hook test.
4. **The widget still draws on the launcher.** Task 3 is only kept if the widget renders after the provider stops being exported. Pinned by the emulator step, which is a gate; its expected outcome is the documented fallback. The committed-manifest test only proves what the plugin wrote, so `aapt2` on the built APK stays the real assertion.
5. **Nextcloud sign-in still works with an honest server.** Task 4's explicit account keeps `userId`. Pinned by the existing `cloudSync-login` suite staying green, plus a new test.

---

### Task 1: One image-origin check at the shared sink

Fingerprint `restore-unsanitised-image-uri:constants/assetMap.ts/asUriSource`.

**Files:**
- Modify: `constants/assetMap.ts:605-606`. `asUriSource` becomes exported `carriedPhoto`. Also `getBossAsset` at `:674`.
- Modify: `constants/avatars.ts:59-61` (`getAvatarSource`)
- Modify: `app/settings.tsx:130-133` (render through `getAvatarSource` or `carriedPhoto`)
- Modify: delete the dead `startsWith("http") ? { uri }` branches in `components/quests/QuestExerciseRow.tsx:28`, `components/home/HomeStage.tsx:31`, `app/(tabs)/adventures/index.tsx:51` and `app/(tabs)/adventures/[id].tsx:71`. No migration ever wrote an `http` image; `rg "https?://" drizzle/*.sql` finds none.
- Modify: `components/bosses/BossPictures.tsx:53-55` and `components/common/ImageChoiceField.tsx:179`, to go through `carriedPhoto`. Journal photos (`SessionNotebook.tsx:162`, `SessionCard.tsx:121`) are left alone: `toDataUri` always builds them from a BLOB (`db/sessionPhotos.ts:51-57`), so no writer can put a URL there.
- Create: `src/carriedImage.ts`, which *moves* `imageSize`, `reader`, `jpegSize` and `webpSize` out of `src/questFile.ts`, so the header parser has one owner. It adds `carriedImageSize`.
- Modify: `src/questFile.ts` (`safeImage` imports the parser from there; same behaviour) and `stores/settings.ts:372` (port only legacy paths).
- Create: `__tests__/helpers/pngDataUri.ts` exporting `pngDataUri(width: number, height: number): string`. It builds a real PNG data URI from the 8-byte signature plus an IHDR chunk carrying `width` and `height`, 24 bytes in all. Every new image fixture in this plan uses it.
- Update existing fixtures that the new rule correctly turns red:
  - `__tests__/assetMap.test.ts:37,64,76,89`: `/9j/4AAQSkZJRg==` is 10 bytes and carries no size. Use `pngDataUri(64, 64)`.
  - `__tests__/assetMap.test.ts:159-162` and `__tests__/boss-arena.test.tsx:233-236`: fake `base64,F` and `FRESH` strings become real `pngDataUri` values.
  - `__tests__/assetMap.test.ts:41-46`: the assertions that `file://` and `https://` pass through are inverted, so both now give the placeholder.
- Test: `__tests__/assetMap.test.ts`, `__tests__/constants-edges.test.ts`, `__tests__/boss-arena.test.tsx`, `__tests__/quest-file.test.ts` (unchanged suite stays green), `__tests__/store-settings.test.ts`, `test/node/restore/hostile.test.ts`

**Interfaces:**
- Produces, in `src/carriedImage.ts`:
  - `export function imageSize(bytes: Uint8Array): Size | null`, moved unchanged.
  - `export function carriedImageSize(dataUri: string): Size | null`. It tests only the prefix `/^data:image\/(?:jpeg|png|webp);base64,/`, so no regex scans the whole string on render. It then decodes only the first 4 096 base64 characters after the comma, inside `try` (returning `null` when `atob` throws on characters that are not base64, as `carriedSize` does), and returns `imageSize` of those bytes. A JPEG from ImageManipulator reaches its SOF within a few hundred bytes, and a header past the prefix reads as a 0 side or `null`, which fails closed. There is no EXIF check here: that stays in `safeImage`, for import only.
  - `export const MAX_RENDER_SIDE = 2_048`, with a test that it is at least `JOURNAL_PHOTO_SIDE`, `AVATAR_SIZE` and `MAX_PHOTO_WIDTH`. That headroom covers photos from older app versions whose crop was not enforced, and still refuses the 16000 px case.
- Produces, in `constants/assetMap.ts`: `export function carriedPhoto(value: string | null | undefined): { uri: string } | null`. It returns `{ uri: value }` only when `carriedImageSize(value)` is non-null with both sides between 1 and `MAX_RENDER_SIDE`. Everything else gives `null`: `file:`, `content:`, `http(s):`, `data:text/...`, the empty string, and a 16000 px PNG header.
- `db/preferences.ts`: add `legacyAvatarToPort(): Promise<string | null>`. It returns the device-local legacy `customAvatarUri` value only when no `customAvatar` row exists and the value starts with `file://`; otherwise it returns `null`. A restored `customAvatar` therefore never reaches `portLegacyAvatar`, `File` or ImageManipulator, whatever it holds (`db/preferences.ts:259-262,285-298`).
- `stores/settings.ts:372`: the port runs on `legacyAvatarToPort()`'s value instead of on any value that is not a `data:` URI.

- [ ] **Step 1: Write the failing tests** in `__tests__/assetMap.test.ts`, under `describe("carried pictures only")`:
  - `getExerciseThumb`, `getExerciseAsset`, `getQuestAsset` and `getAdventureAsset` of `"https://attacker.example/p.png"`, `"file:///data/user/0/x/bati.v3.db"`, `"content://x/y"` and `"data:text/html;base64,AAAA"` each equal `require("@/assets/placeholder.webp")`.
  - `getQuestThumb("https://attacker.example/p.png")` is `null`.
  - `getExerciseThumb(pngDataUri(64, 64))` equals `{ uri: pngDataUri(64, 64) }`.
  - `getBossAsset(key, 0, undefined, { fresh: "https://attacker.example/p.png" })` equals `getBossAsset(key, 0)`.
  - `getExerciseThumb(<data:image/png URI whose IHDR says 16000 x 16000>)` is the placeholder. Build it with `pngDataUri(16000, 16000)`.
  - In `__tests__/constants-edges.test.ts`: `getAvatarSource(id, "https://attacker.example/p.png")` equals `getAvatarSource(id, null)`, and `getAvatarSource(id, <a real 256 px JPEG data URI made by the test>)` equals `{ uri: <that value> }`.
  - In `__tests__/store-settings.test.ts`: `"a restored avatar that is a URL is never ported"`. With `customAvatar = "https://attacker.example/p.png"`, or `customAvatar = "file:///data/user/0/x/bati.v3.db"`, `loadFromDatabase` never calls the mocked `portLegacyAvatar`. A legacy `customAvatarUri = "file:///…/picker.jpg"` with no `customAvatar` row still calls it. Add `legacyAvatarToPort` to that suite's `preferences` mock.
  - The store test only proves that the store obeys the stub, so test the rule itself on a real database too: `__tests__/db-preferences.test.ts` (testDb plus `user_preferences` rows), `"only a legacy file path with no customAvatar is ported"`. A `customAvatar` row holding `file://` gives `null`; one holding `https` gives `null`; a legacy `file://` with no `customAvatar` row gives that path; a legacy `content://` gives `null`.
- [ ] **Step 2: Run them and see them fail.** Run `nvm exec 24 npx jest __tests__/assetMap.test.ts __tests__/constants-edges.test.ts`. Expected: FAIL, with the https cases returning `{ uri: ... }`.
- [ ] **Step 3: Implement.**
  1. Move the parser to `src/carriedImage.ts`, then run `__tests__/quest-file.test.ts` and expect it green.
  2. Add `carriedImageSize` and `MAX_RENDER_SIDE`, then `carriedPhoto`.
  3. Route every listed sink through `carriedPhoto`: replace `asUriSource` and delete the `http` branches. In `getBossAsset`, `if (own) return { uri: own }` becomes `const mine = carriedPhoto(own); if (mine) return mine;`.
  4. Narrow the port condition in `stores/settings.ts`.
- [ ] **Step 4: Run them again.** Expected: PASS.
- [ ] **Step 5: Add the restore regression** to `test/node/restore/hostile.test.ts`. Snapshot, then `UPDATE exercises SET imagePath = 'https://attacker.example/p.png'`, then `validateBackup` and `keepDeviceSettings`, then read the row back and assert that `getExerciseThumb(row.imagePath)` is the placeholder. Run it and expect PASS. The test pins the sink, so it passes now and fails if the sink regresses.
- [ ] **Step 6: Commit** with message `fix(images): render only carried data: pictures, whatever wrote the row`.

### Task 2: A restored backup is migrated before the swap, or refused

Fingerprint `restore-older-migration-shape-unchecked:db/backup.ts/inspectAttachedCandidate`.

**Files:**
- Modify: `db/migrate.ts`. Export a runner entry point for a given connection, without the pre-migration backups.
- Modify: `db/client.ts`. Add `withConnectionTo` beside `withIsolatedConnection` (`:155`).
- Modify: `__tests__/helpers/testDb.ts:100`. Mock `withConnectionTo` with better-sqlite3 opened on `path.join(path.dirname(t.sqlite.name), name)`. Use the directory the mock already holds, not `require("expo-sqlite")`: outside `jest.isolateModules`, that `require` resolves jest-expo's module rather than the harness's (`test/node/harness/device.ts:65,71`).
- Modify: `db/backup.ts`. Add `bringForward`, and rewrite the comment at `:178-185` so it says that older files are migrated before the swap. Also make `tableDefinitions` (`:203-206`) compare `type IN ('table', 'index')`. `sqlite_autoindex_*` is already excluded, and indexes are only ever created by migrations (`rg "CREATE INDEX"` finds none outside `drizzle/`). Without this, a crafted backup can keep an extra UNIQUE index, or one named after an index a future migration creates, and the next update fails migration exactly as the finding describes.
- Modify: `__tests__/useBackup.test.tsx:33`. The `@/db/backup` mock factory gains `bringForward: jest.fn(() => Promise.resolve({ ok: true }))`, recorded nowhere, so the existing restore-order tests keep their meaning.
- Modify: `src/backupFiles.ts`. Staging (`:360`, `:507`) and `discardStagedImport` (`:532-534`) also delete `IMPORT_NAME`'s `-wal`, `-shm` and `-journal`, so a stale WAL never sits beside a new candidate.
- Modify: `hooks/useBackup.tsx:211-212` (`checkStaged`)
- Modify: `docs/architecture/data-safety.md`, with one paragraph on the new gate, including: "never edit a shipped index or table statement: honest backups that ran the old text would be refused".
- Test: `test/node/restore/hostile.test.ts`, `__tests__/useBackup.test.tsx`, `__tests__/backupFiles.test.ts`

**Interfaces:**
- Produces, in `db/migrate.ts`:
  - `export function hasPendingMigrations(client: SqliteMigrationClient): Promise<boolean>`, which uses `readLastAppliedAt` and `isPending` against `buildMigrationConfig()`.
  - `export function migrateClient(client: SqliteMigrationClient): Promise<void>`, which is `runMigrationsAsync(client, buildMigrationConfig(), { debug: migrationsDebugEnabled() })`.
  - `ensureMigrations` keeps its behaviour and calls the same internals.
- Produces, in `db/client.ts`: `export type ConnectionTo = Pick<SQLiteDatabase, "execAsync" | "runAsync" | "getFirstAsync" | "getAllAsync">` and `export async function withConnectionTo<T>(name: string, fn: (conn: ConnectionTo) => Promise<T>): Promise<T>`. It is built the way `IsolatedConnection` is, and handed to `migrateClient` with the same cast `ensureMigrations` uses. It opens `openDatabaseAsync(name, { useNewConnection: true })` in the default database directory, where `IMPORT_NAME` already sits (`src/backupFiles.ts:28-31`), then sets `PRAGMA busy_timeout = 5000` and closes the connection in `finally`.
- Produces, in `db/backup.ts`: `export function bringForward(path: string): Promise<BackupCheck>`. It takes the staged *path*, like `validateBackup`, and opens `withConnectionTo(path.slice(path.lastIndexOf("/") + 1))`. React Native has no `node:path`, and the staged path is always `${DB_DIR}/${name}` (`src/backupFiles.ts:118-120`).
  1. Inside `withConnectionTo(name)`, the first statement is `PRAGMA journal_mode = DELETE`. The candidate's header is attacker-controlled and may ask for WAL; this way every migration write lands in the main file before close.
  2. If `hasPendingMigrations` is false, return `{ ok: true }`.
  3. Otherwise run `migrateClient`. Only an error thrown by `migrateClient` (a statement the candidate refuses) becomes `reportError("backup.bringForward", error)` plus `{ ok: false, reason: "incompatibleVersion" }`. An error opening the connection propagates, as a programming or environment fault does elsewhere.
  4. After the connection closes, return `validateBackup(<path of name>)`. The file now claims the newest migration, so `tablesDivergeFromLive` runs.
- The reason stays `incompatibleVersion` on purpose. `bringForward` only migrates a file that claims an *older* migration, and the existing copy, "That backup comes from a version of Bati this one cannot read.", is true of it. `schemaMismatch`'s copy says the file "says it is up to date", which it does not.
- Consumes: `validateBackup` (unchanged; it still runs first, so triggers and views are refused before any migration SQL touches the file).

Not done, on purpose: no "put the `.bak` back" action on the migration-failed screen. Once this gate holds, a restore cannot cause that screen. After an app update it can still appear, and there the `.bak` is a stale pre-restore copy, possibly months old, so offering it would lose data.

- [ ] **Step 1: Write the failing tests** in `test/node/restore/hostile.test.ts`:
  - `"a backup that claims an older migration it cannot reach is refused before the swap"`: an honest snapshot, `DELETE FROM __drizzle_migrations WHERE created_at = (SELECT max(created_at) FROM __drizzle_migrations)`, then expect `await bringForward(stagedPath)` to equal `{ ok: false, reason: "incompatibleVersion" }`, and the harness's `reports` array (`test/node/harness/device.ts:189`) to hold an entry with context `backup.bringForward`. This proves the refusal comes from the migration, not from a failed open, without tying the test to today's newest migration.
  - `"an honest backup from an older Bati is brought forward and restores"`: build a database with `migrate(sqlite, <idx of the second newest entry>)` from `__tests__/helpers/migrateTo.ts`, then stamp it the way every real backup is (`PRAGMA application_id = <BATI_APPLICATION_ID>` and `PRAGMA user_version = <SCHEMA_VERSION>`, both imported from source, not literals). Snapshot it, then expect `bringForward(stagedPath)` to equal `{ ok: true }`, and `max(created_at)` in the staged file to equal the newest journal `when`.
  - Every candidate in these tests is written as `bati-import.tmp.db` in the device's database directory (`path.dirname` of its live file). `hostile.test.ts`'s other cases keep their `staged-*` files.
  - `"bringing forward leaves no side file"`: set the candidate to `PRAGMA journal_mode = WAL` before staging. After `bringForward`, none of `<name>-wal`, `<name>-shm` or `<name>-journal` exists, and the main file holds the new migration row. Run it twice: once with a migration pending, and once with nothing pending.
  - `"an extra index is refused"`: an honest current snapshot plus `CREATE INDEX evil ON user_preferences(updatedAt)` gives `validateBackup` = `{ ok: false, reason: "schemaMismatch" }`. The same at an older migration gives `bringForward` = `{ ok: false, reason: "schemaMismatch" }`.
  - In `__tests__/backupFiles.test.ts`: `"discarding a staged import removes its side files"`. Create `bati-import.tmp.db-wal` and `-shm`, call `discardStagedImport()`, and expect both gone.
- [ ] **Step 2: Run them and see them fail.** Run `nvm exec 24 npx jest --config <node harness config used by test/node> test/node/restore/hostile.test.ts`; the command for `test/node` is in `package.json`. Expected: FAIL, because `bringForward` is not exported.
- [ ] **Step 3: Implement** `withConnectionTo` (with its `testDb.ts` mock), `hasPendingMigrations`, `migrateClient`, `bringForward` and the side-file cleanup, with the signatures above.
- [ ] **Step 4: Run them again.** Expected: PASS. Then run `__tests__/db-backup.test.ts` and `test/node/restore/`, and expect them to stay green.
- [ ] **Step 5: Write the failing hook test** in `__tests__/useBackup.test.tsx`, named `"a staged file bringForward refuses is discarded and never swapped"`. Mock `bringForward` to resolve `{ ok: false, reason: "incompatibleVersion" }`, run `runImport`, then assert:
  - `discardStagedImport` was called once.
  - `keepDeviceSettings` and `beginRestore` were not called.
  - The error toast shows `backup.rejected.incompatibleVersion`.

  Run it and expect FAIL.
- [ ] **Step 6: Wire it.** In `checkStaged`, after `if (!check.ok) return { verdict: check.reason };`, add `const forward = await bringForward(staged); if (!forward.ok) return { verdict: forward.reason };`. Run it again and expect PASS. This is the one road for both the picker and `runAdopt`, so peer restores are covered as well.
- [ ] **Step 7: Update `docs/architecture/data-safety.md`, then commit** with message `fix(restore): migrate a staged backup before the swap and refuse one that cannot be`.

### Task 3: The widget image provider stops being world-readable (gated on the emulator)

Lead `rnwidget-imageprovider-exported:react-native-android-widget/RNWidgetImageProvider`.

**Files:**
- Create: `plugins/withAndroidWidgetImageProvider.js`. It adds `<provider android:name="com.reactnativeandroidwidget.RNWidgetImageProvider" android:authorities="${applicationId}.rnwidget.imageprovider" android:exported="false" android:grantUriPermissions="true" tools:replace="android:exported"/>` to the app manifest, with a header comment stating why.
- Modify: `app.json` (plugins list), plus the regenerated `android/app/src/main/AndroidManifest.xml`
- Test: a new `__tests__/android-widget-provider.test.ts`, which reads the committed `android/app/src/main/AndroidManifest.xml`, as `__tests__/android-adaptive.test.ts` does.

- [ ] **Step 1: Confirm the lead first** (gate). Build the x86_64 release APK in this worktree; the `android-builds` skill has the commands. Then:
  1. `aapt2 dump xmltree --file AndroidManifest.xml <apk> | grep -A4 RNWidgetImageProvider` should show `exported=true` with no permission.
  2. On the `bati-bench` AVD (never the phone), place the Flame widget.
  3. `adb shell content read --uri content://com.guiforge.bati.rnwidget.imageprovider/widget_<id>_mode_light.png` runs as the shell uid, which is another app. Use the widget id from `adb shell dumpsys appwidget`.

  If the PNG comes back, the lead is confirmed: continue. If it does not, record that result in the audit doc and drop this task.
- [ ] **Step 2: Write the failing test** `"the widget image provider is not exported"`. It asserts that the committed manifest holds the `RNWidgetImageProvider` provider with `android:exported="false"` and `tools:replace="android:exported"`. Run it and expect FAIL.
- [ ] **Step 3: Write the plugin**, using `withAndroidManifest` and the `tools` namespace already present in the main manifest. Register it in `app.json`. Regenerate with `npx expo prebuild --platform android --no-install`, and keep only the manifest hunk.
- [ ] **Step 4: Run the test again.** Expected: PASS.
- [ ] **Step 5: Emulator gate.** Rebuild, place the Flame and Weekly widgets, and confirm that both still draw. Then confirm that the `content read` from step 1 now fails with a permission error. Run `cd android && ./gradlew --stop` afterwards. The library draws through `RemoteViews.setImageViewUri` (`RNWidget.java:78,94,104`) and never calls `grantUriPermission`, so expect the launcher to draw blank.

  If it does, revert steps 2 to 4. A real fix needs library code, either granting the home packages or drawing bitmaps, and this repo has no patch tooling; adding patch-package, or vendoring the library, breaks the "no new dependency" rule and F-Droid's build-from-source of an unmodified package.

  Instead: write the upstream issue text (provider exported without permission, proposed fix `exported="false"` plus `grantUriPermission` to the widget host) into `docs/architecture/backup-and-sync.md` § Known risks, with the emulator evidence. Record the lead as confirmed-and-accepted (data: the streak count and weekly dots already on the home screen), and continue with task 4.
- [ ] **Step 6: Commit** with message `fix(android): stop exporting the widget image provider to every app`.

### Task 4: The Nextcloud account is built, not spread

Hardening from the sync hunter (`src/deviceSync.ts:264`, `src/deviceSync.ts:258` vs `:315-318`).

**Files:**
- Modify: `src/cloudSync.ts:122-127` (`loginToNextcloud` builds `{ server, loginName, appPassword }` from string fields only)
- Modify: `src/deviceSync.ts:258-268` (`connectNextcloud`)
- Test: `__tests__/cloudSync-login.test.ts`, `__tests__/deviceSync.test.ts`

**Interfaces:**
- `loginToNextcloud` still returns `Promise<NextcloudAccount | null>`. It throws `Error("Login flow returned no credentials")` when `loginName` or `appPassword` is not a non-empty string.
- In `connectNextcloud`:
  - It throws `InsecureAddressError` for a non-local `http://` server, with the same test as `connectWebDav`. The check comes first, before `loginToNextcloud`, which POSTs at once (`src/cloudSync.ts:99`).
  - It builds `{ kind: "nextcloud", server, loginName, appPassword, userId }` explicitly. `userId` is included only when it is defined.

- [ ] **Step 1: Write the failing tests:**
  - `cloudSync-login`: `"a poll answer cannot add fields to the account"`. The poll returns `{ loginName: "u", appPassword: "p", server: "https://evil.example", kind: "webdav", url: "https://evil.example/dav" }`. The account then has exactly the keys `server`, `loginName`, `appPassword` (plus `userId` if there is one), and `server` is the typed one.
  - `cloudSync-login`: `"a poll answer without credentials is an error"`. The poll returns `{ loginName: 42 }` and the call rejects.
  - `deviceSync`: `"connectNextcloud refuses plain http that is not this phone"`. It rejects with `InsecureAddressError` and makes no request.
- [ ] **Step 2: Run them and see them fail.**
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run them again,** plus `__tests__/cloudSync*.test.ts` and `__tests__/deviceSync.test.ts`. Expected: PASS.
- [ ] **Step 5: Commit** with message `fix(sync): build the Nextcloud account from its two credentials only`.

### Task 5: OS cloud backup requires client-side encryption

The user chose this on 2026-10-21: require encryption.

**Files:**
- Modify: `plugins/withAndroidBackupRules.js`:
  - `<cloud-backup disableIfNoEncryptionCapabilities="true">`, for Android 12 and up.
  - `requireFlags="clientSideEncryption"` on each `<include>` in `full-backup-content`, for Android 9 to 11.
  - `<device-transfer>` stays unchanged.
  - The header comment says why.
- Modify: the regenerated `android/app/src/main/res/xml/bati_backup_rules.xml` and `bati_data_extraction_rules.xml`
- Modify: `plugins/withAndroidNetworkSecurity.js`, with a comment only. User CAs stay trusted, for self-hosters with a private CA; the user decided this on 2026-10-21, and the comment states the MDM/rogue-CA risk and that it is accepted.
- Modify: `docs/architecture/backup-and-sync.md`, with one paragraph covering both.
- Accepted trade-off, also written in the docs: on Android 9 to 11, `requireFlags` must all be set by the transport. A phone-to-phone transfer whose transport does not also set client-side encryption therefore drops the database. On Android 12+ device transfer is governed by `<device-transfer>`, which is unchanged. This follows the user's 2026-10-21 choice to require encryption.
- Test: `__tests__/android-backup-rules.test.ts`

- [ ] **Step 1: Write the failing tests.**
  - `"cloud backup is off where Android cannot encrypt it"`: `bati_data_extraction_rules.xml` contains `<cloud-backup disableIfNoEncryptionCapabilities="true">`.
  - `"full backup includes need client-side encryption"`: each of the 3 includes in `bati_backup_rules.xml` carries `requireFlags="clientSideEncryption"`.
  - The `<device-transfer>` block has no such flag.

  Run them and expect FAIL.
- [ ] **Step 2: Change the plugin and regenerate** with `npx expo prebuild --platform android --no-install`. Keep only the two XML hunks.
- [ ] **Step 3: Run them again.** Expected: PASS.
- [ ] **Step 4: Update the docs, then commit** with message `fix(android): keep the plaintext database out of unencrypted cloud backups`.

### Task 6: An adventure step completes only for its own quest, and only when it is current

Hardening from the deep-link hunter (`db/adventures.ts:901-960`).

**Files:**
- Modify: `db/adventures.ts:901-960` (`completeAdventureRunStep`)
- Modify: `stores/session.ts:2276-2279` (the caller passes the session's quest id)
- Update: every existing `completeAdventureRunStep(...)` call in `__tests__/db-adventures*.test.ts` and `__tests__/store-session.test.ts` passes the step's quest id. Without it they no longer compile.
- Test: `__tests__/db-adventures-campaign.test.ts`

**Interfaces:**
- `completeAdventureRunStep(input: { runStepId: number; completedSessionId: number; questId: number })`. The return type is unchanged.
- When `current.questId !== input.questId`, or the step is not the run's current open step, it returns the same "ordinary training" result as an inactive run: `isFinished: false`, `nextRunStepId: null`, `nextQuestId: null`, and nothing written. The open status is the `AdventureStepStatus` value the run sets on the unlocked step; read `db/schema.ts:474` and `nextRunStep`.

- [ ] **Step 1: Write the failing tests:**
  - `"a session of another quest does not complete the step it names"`: a run with steps A and B, completing step B with A's quest id. Step B stays unfinished, and the result has `nextRunStepId: null`.
  - `"a step that is not yet open cannot be completed"`.

  Run them and expect FAIL.
- [ ] **Step 2: Implement the check, then update the caller.** Run the adventure suites (`__tests__/db-adventures*.test.ts`, `__tests__/store-session.test.ts`) and expect PASS.
  Before writing the check, confirm two things in source:
  - A resumed session (`SavedSessionState`, `stores/session.ts`) still carries the quest id the caller passes.
  - A new run's first step already has the open status.

  Add a test for each: `"a resumed session completes its step"` and `"the first step of a new run completes"`.
- [ ] **Step 2b: Emulator check.** Run `.maestro/adventure-journey.yaml` on the AVD with `--device emulator-5554`, since Maestro ignores `ANDROID_SERIAL`. It enters by the step row and asserts the step statuses, so it proves the guard does not refuse a legitimate completion.
- [ ] **Step 3: Commit** with message `fix(adventures): bind a run step to its quest and its turn`.

### Task 7: Small tightenings

**Files and changes:**
- `src/adventureOrigin.ts`: accept only `"/journal"`, or values starting with `"/journal/"` or `"/journal?"`. Everything else stays as it is.
  - Test (`__tests__/adventureOrigin.test.ts`, created if absent): `"/journalx?y=1"` gives `null`. `"/journal"`, `"/journal/boss"` and `"/journal?tab=x"` pass through unchanged.
- `src/questFile.ts:376` (`safeImage` path branch): also reject values starting with `/`.
  - Test (`__tests__/quest-file.test.ts`): `safeImage("/data/user/0/app/files/a.jpg")` is `null`, and `safeImage("squat")` is `"squat"`.
- `src/backupFiles.ts`: vault unlock stages under a file of its own, so it never shares `IMPORT_NAME` with a restore. This replaces the import-slot lock considered in review rounds 2 and 3: a lock released from several places kept getting freed by the wrong holder.
  - Restores already run one at a time under `restoreStaged`'s module-level `running` guard (`hooks/useBackup.tsx`).
  - Vault unlock only opens its copy to adopt the key and never swaps it in, so it has no reason to touch the restore's file at all.
  - `export type StagingSlot = { readonly name: string; readonly plain: string }` with `export const RESTORE_SLOT = { name: IMPORT_NAME, plain: IMPORT_PLAIN }` and `export const UNLOCK_SLOT = { name: "bati-unlock.tmp.db", plain: "bati-unlock.plain.db" }`.
  - `stageBackupForImport(slot = RESTORE_SLOT)`, `stageBackupFrom(source, slot = RESTORE_SLOT)`, `decryptStagedImport(secret?, slot = RESTORE_SLOT)` and `discardStagedImport(slot = RESTORE_SLOT)` each take the slot. Discard removes the slot's file, its plain file, and their `-wal`, `-shm` and `-journal` (task 2).
  - `src/vaultUnlock.ts` passes `UNLOCK_SLOT` to every one of these calls.
  - `sweepLeftovers` (`components/DatabaseProvider.tsx:66`) discards both slots at launch.
  - The backup rules include the live database by name only, so neither staging file is ever in an OS backup.
  - Tests:
    - In the Node harness (`test/node/`, which has a real fs and the real `backupFiles` through `a.app.unlock` and `a.app.files`, `test/node/harness/device.ts:110-116`), not `__tests__/vaultUnlock.test.ts`, which mocks `@/src/backupFiles` wholesale: `"a vault unlock never touches a staged restore"`. Seed the remembered backup folder first: `unlockWith("folder")` reads `rememberedFolder()` (`src/autoBackup.ts:47-49`), so set the `backupFolderUri` preference to a fake directory holding two sealed copies. If `rememberedFolder` does not work under the harness's fake fs, drive `unlockWith("file")` with a mocked picker result instead; the same assertion holds. Stage a restore file, run `unlockWith("folder", …)` over two sealed copies, then assert that the restore's `bati-import.tmp.db` is byte-identical afterwards and that no unlock file remains.
    - `__tests__/backupFiles.test.ts`: `"discarding one slot leaves the other"`.
- [ ] **Step 1: Write all three failing tests, run them, and see them fail.**
- [ ] **Step 2: Implement.**
- [ ] **Step 3: Run them again** with `__tests__/useBackup.test.tsx` and `__tests__/vaultUnlock.test.ts`. Expected: PASS.
- [ ] **Step 4: Commit** with message `fix: tighten the journal origin and absolute image paths, and stage vault unlocks apart`.

### Task 8: Branch checks and audit record

- [ ] Run `npx tsc --noEmit`, `npx biome check`, `nvm exec 24 npm test` (read `Test Suites:` via `rtk proxy`) and `npm run deadcode`. All must be green.
- [ ] Update the published audit doc. Mark findings 1 and 2 fixed with their commit shas, the widget lead confirmed and fixed (or dropped, and why), and each hardening row fixed or kept as decided.

## Not fixed, on purpose

| Note | Why |
| --- | --- |
| User CAs trusted in release | User decision 2026-10-21: self-hosters with a private CA. Documented in task 5. |
| `sameOriginOrHttps` accepts any https | After task 4, the server's only reach is its own login page and its own poll token. Requiring the same origin breaks Nextcloud behind a proxy whose `overwrite.cli.url` differs. |
| Format 2 replay | Legacy only. Format 3 closes it, and the files are still authenticated and never merged without a choice. |
| `mustJoin` uses host dates | Sync logic change beyond this fix; already recorded in a `ponytail:` note. |
| Plaintext premigrate copies and `.bak` | They are the migration and restore safety net, stay in app-private storage, and are excluded from OS backup. |
| `Math.random` import token | It gates a preview that needs a tap; an attacker app can send its own `content://` anyway. |
| `/dev` route in release | Renders `null`; only read-only queries run. |
| Server text in bug-report mail | The hero reads the mail before sending it. |
| Widget provider prefix check | Library code: `startsWith` without a trailing separator (`RNWidgetImageProvider.java:39-41`), reachable only through a sibling directory whose name starts with `widget_images`, and none exists. It goes into the upstream issue text from task 3. |
| Deferred audit units (secret rotation, reminder extras) | Not audited yet; they are the next audit run, not this branch. |
