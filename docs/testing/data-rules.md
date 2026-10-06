---
title: Data rules, as the code implements them
type: technical
status: draft
updated: 2026-10-05
related: [../architecture/backup-and-sync.md, ../architecture/data-safety.md]
---

# Data rules, as the code implements them

Purpose: a written statement of what the data code does, so invariant tests are derived from it
and not from guesses. Every rule cites `path:line` (lines as of branch `bench-green`, 2026-10-05).
"Invariant" is phrased for a property-based test on simulated devices. Where the code is silent it
says so; where code and docs disagree it is listed under "Contradictions between code and plan".

Vocabulary. A *device* is an install: SecureStore identity (`bati.sync.identity`), one SQLite file
`bati.v3.db`, one sealed file `bati-<id>.batb` on the sync remote. A *peer file* is another
device's sealed file. A *tombstone* is a row of `deleted_sessions`. *News* is what
`compareWithPeer` counts.

---

## 1. Merge

### 1.1 What counts as news, and the fingerprint

**R1. Session identity is the `uuid` column, nothing else.** Sessions are compared and merged by
`completed_sessions.uuid`; rows with a NULL uuid are invisible to compare and to merge.
`db/backup.ts:339-340`, `db/merge.ts:137-140`. Unique index `db/schema.ts:550`.
Invariant: two sessions with different uuids are never unified, same uuid are never duplicated;
sessions with NULL uuid are never copied between devices.

**R2. `peerOnly` = peer sessions whose uuid is neither local nor in the local tombstones;
`localOnly` = local sessions whose uuid is neither in the peer nor in the peer tombstones.**
`db/backup.ts:345-348`.
Invariant: a session deleted (tombstoned) on side X is never counted as news from the other side.

**R3. `peerChanges = peerOnly + peerDeleted + peerContent`; `localChanges = localOnly +
localDeleted + localContent`.** `peerDeleted` = local sessions the peer tombstoned;
`localDeleted` = peer sessions the local side tombstoned. `db/backup.ts:349-350, 364-365`.
Invariant: state is `ahead` iff peerChanges>0 and localChanges=0, `diverged` iff both>0,
`behind` iff only local>0, `level` iff both 0 (see R4).

**R4. State of a readable, validated peer.** `peerChanges=0` gives `behind` if `localChanges>0`
else `level`; `peerChanges>0` gives `diverged` if `localChanges>0` else `ahead`.
`src/deviceSync.ts:795-799`.
Invariant: compare is antisymmetric: `ahead` on A about B implies B sees A as `behind`
(sessions and tombstones), except for the content axis, see R6.

**R5. Hero content compared** = hero exercises (`creator='hero'`), hero quests (`author='hero'`),
and preferences in `MERGED_PREFERENCES`, as `(identity, updatedAt)` rows. Identity is `uuid`
(fallback name) when both databases have the `uuid` column (0066), else names only. A row is
"news" from side X if the other side has no row with the same identity and `updatedAt >=` it.
`db/backup.ts:259-285`.
Invariant: after a merge in both directions, `peerContent=localContent=0` (modulo R8, R9).

**R6. Content news uses the device wall clock.** `updatedAt` is `new Date()` at write time, seconds
resolution. The "no device clock" claim holds for sessions only. `db/backup.ts:282-285`,
`db/schema.ts:101`, `db/preferences.ts:88`, `db/quests.ts:283`.
Invariant: with skewed clocks, the side with the later `updatedAt` wins hero content, whichever
edit was really last (see Contradictions C4).

**R7. `MERGED_PREFERENCES` = villageName, avatarId, trainingLevel, ownedEquipment, oath,
reminderDays.** `db/backup.ts:243-252`.
Invariant: only these keys ever change in `user_preferences` through a merge (plus R12).

**R8. `NULL updatedAt` is news forever on the compare side and never merged.** The compare
predicate `y.at >= x.at` is NULL when either is NULL, so NOT EXISTS is true (`db/backup.ts:284`);
the merge predicate `p.updatedAt > l.updatedAt` is NULL, false (`db/merge.ts:184`). The column is
nullable (`drizzle/0000_schema.sql:10`). The code does not say whether any migration writes a
merged key with NULL.
Invariant (to test, may fail): for any peer row with NULL updatedAt, a completed merge leaves
`peerContent=0`.

**R9. Equal `updatedAt` with different content is a permanent silent divergence.** Compare says
no news both ways (`>=`, `db/backup.ts:284`); merge keeps local (strict `>`, `db/merge.ts:246,
184`).
Invariant: two devices that edit the same hero row in the same second hold different values after
any number of syncs, and compare reports `level`.

**R10. `stateFingerprint` / peer `fingerprint` = `count(sessions) ':' max(uuid)` | `max(updatedAt)
':' count` over hero content | tombstone count.** `db/backup.ts:355-358, 370, 383-389`. It does
not read session columns other than uuid.
Invariant: editing any field of an existing session (notes, feedback, xpEarned) leaves the
fingerprint unchanged; adding one session changes it; adding a tombstone changes it.

**R11. Never compared and never merged:** derived caches (`streak_*`, achievements), favourites
(`favourite_quests`), quest configs (`quest:<id>:config`), campaigns, boss fights and boss damage
log, adventure runs, set-aside exercises, `language`, `warmupEnabled`, `prepMode`,
`distanceUnit`, `hapticsEnabled`, `soundEnabled`, `mapTiles`, `villagersEnabled`, and every other
preference not in R7. `db/backup.ts:236-242`, `db/merge.ts:38-40`, `db/preferences.ts:318-320`.
Invariant: after any merge, the local value of each of these keys is byte-identical to before.

### 1.2 What the merge does

**R12. Merge is refused unless both databases have the same newest migration.**
`max(created_at)` of `__drizzle_migrations` must be equal, else `{merged:false}`; the prompt then
falls back to the take-or-keep question. `db/merge.ts:51-55`, `components/SyncPrompt.tsx:168-171`.
Invariant: devices on different migrations never get a row-level merge.

**R13. A merge is one `BEGIN IMMEDIATE` transaction on its own connection, rolled back whole on any
error.** Unmapped exercise or quest, a set naming an unknown exercise, an Admin row missing here
all throw. `db/merge.ts:57-66, 150-155, 229-231, 323-327`.
Invariant: when `mergePeer` throws, the database (every table) is byte-identical to before.

**R14. Sessions are only ever inserted, never updated.** A peer session is copied iff its uuid is
neither local nor in local tombstones, with all columns except `id`; XP, `records_json`,
`performedAt`, `tzOffsetMin`, `originDevice` are copied verbatim. `db/merge.ts:137-148`.
Invariant: for every uuid present on both devices before a merge, the local row is unchanged
after it (so a later edit on one device does not reach the other: R15).

**R15. Edits to an existing session are never propagated.** `addBonusXpToSession`,
`updateSessionFeedback`, `markSessionWithNewRecords` mutate rows after the save
(`db/completed.ts:282-317`); neither merge nor fingerprint see it (R10, R14). The code does not
say this is intended.
Invariant (current behaviour): after convergence two devices may hold different `xpEarned` for the
same uuid.

**R16. A merged session's children are copied under new local ids.** Sets (`completed_exercises`)
are remapped through `sess_map` and `ex_map`; `gps_points` (keyed by session uuid and `t`) are
copied with `INSERT OR IGNORE`; `records_json` exercise ids are rewritten via `ex_map`; `questId`
is remapped through `quest_map`, becoming NULL when no mapping exists. `db/merge.ts:144-168,
336-354`; nullable column `db/schema.ts:436`.
Invariant: after merge, every merged session has the same number of sets and gps points as at the
source, and every `completed_exercises.exerciseId` resolves to a local exercise row.

**R17. Ids: local rows keep their ids; the peer's get fresh ones.** `db/merge.ts:28-30, 145,
158-162`.
Invariant: no pre-existing local primary key changes in a merge.

**R18. Admin exercises are mapped by `enName`, Admin quests by `enTitle`; any peer Admin row with
no local match aborts the merge.** `db/merge.ts:226-231`.
Invariant: merges between two builds with the same seed content never fail on Admin rows.

**R19. Hero exercises and quests: matched by `uuid`; the strictly newer `updatedAt` overwrites the
whole row and replaces its children (muscles, slots); unmatched rows are inserted.** Fallback to
name only when exactly one side has no uuid, and then the named side's uuid is adopted. Two rows
with distinct uuids are never unified by name. `db/merge.ts:243-270, 290-311, 313-333`.
Invariant: after convergence, for each hero uuid both devices hold the row with the greater
`updatedAt` (ties: R9), and the children of that row.

**R20. Last writer wins per whole row, never per field.** A concurrent edit of two fields of one
quest on two devices keeps one device's version in full. `db/merge.ts:253-256`.
Invariant: merged hero row equals one of the two inputs, never a mixture.

**R21. Preferences in R7 merge by `updatedAt`, whole value.** Peer value taken iff local key is
absent, or peer `updatedAt` is strictly greater; and only if value or timestamp differs. Timestamps
copied verbatim. `ownedEquipment` is a JSON list taken whole: concurrent equipment changes lose
one side, no union. `db/merge.ts:181-188`.
Invariant: for each merged key, post-merge value = value of the input with the greater
updatedAt, local on a tie.

**R22. A device with no sessions, no hero exercises and no hero quests ("fresh") takes every peer
preference in R7 regardless of dates.** `db/merge.ts:105-108, 184`.
Invariant: merging a populated peer into an empty device yields the peer's R7 values.

**R23. `hasFinishedOnboarding='true'` travels one way only:** copied from peer when the peer has
it true and local has not. It is not in `MERGED_PREFERENCES`. `db/merge.ts:190-200`.
Invariant: a merge never turns local onboarding from true to false.

**R24. `exercises.prerequisiteExerciseId` is written NULL then translated** through `ex_map` for
rows the merge wrote. `db/merge.ts:116, 121-126`.
Invariant: a written exercise's prerequisite resolves to a local exercise or NULL.

**R25. A second merge of the same peer finds nothing:** timestamps and uuids are copied verbatim.
`db/merge.ts:35-36`.
Invariant (idempotence): `merge(A,B); merge(A,B)` equals `merge(A,B)`; and after
`merge(A,B); merge(B,A)` both devices have compare `level` against each other.

### 1.3 Deletion

**R26. Only sessions have tombstones.** `deleted_sessions(uuid PK, deletedAt)`, written by
`deleteSession` inside the delete transaction, only when the row had a uuid. Rows are never
removed by app code. `drizzle/0064_the_sessions_let_go.sql:11`, `db/completed.ts:354-361`.
Invariant: the tombstone set of a device is monotonically non-decreasing between restores.

**R27. Deleting a session removes: its sets, boss damage log (refunding the boss HP, capped at
total, felled boss revived), gps points, reopens the campaign step.** `db/completed.ts:348-361,
428-445`.
Invariant: after delete, no row of `completed_exercises`, `boss_damage_log`, `gps_points`
references the session; boss `currentHp <= totalHp`.

**R28. `deleteSession` of a session that does not exist returns "deleted" and writes no
tombstone; of a campaign-locked session returns "locked" and writes nothing.**
`db/completed.ts:347-348`.
Invariant: a tombstone exists for uuid U iff a local delete of a row with uuid U succeeded.

**R29. Tombstones merge by union** (`INSERT OR IGNORE`), and are honoured on the receiving device
after the merge by deleting every local session whose uuid is tombstoned, through `deleteSession`.
`db/merge.ts:173-179, 365-374`, `src/deviceSync.ts:908-911`.
Invariant: after convergence, every device's sessions = union of all sessions minus the union of
all tombstones; every device's tombstones = the union.

**R30. A merge never inserts a session the receiver tombstoned, and a tombstone received removes
the receiver's own copy.** `db/merge.ts:139-140, 367`.
Invariant: a deleted session cannot reappear through sync; a deletion can remove a session
another device created (its copy, never the other device's own file).

**R31. A tombstoned session whose campaign has moved on stays** ("locked"); compare then counts it
as `peerDeleted` forever, harmlessly (no change, no reload), but the state stays `ahead`.
`db/merge.ts:361-363`, `db/backup.ts:350`.
Invariant: honourTombstones may leave a tombstoned session in place; it never errors.

**R32. Deletion of hero exercises and quests does not propagate and is undone by sync.**
`deleteUserExercise` (only when unused) and `deleteQuest` delete the row with no tombstone; the
other device still holds the row, sees it as news for itself, and the merge re-inserts it.
`db/exercises.ts:1154-1170`, `db/quests.ts:936-939`, `db/merge.ts:243-252`. Listed as not done in
`docs/architecture/backup-and-sync.md:367-368`.
Invariant (current behaviour): a hero row deleted on A and present on B exists on A again after
A merges B.

**R33. A restore of an older backup can resurrect sessions deleted since** (it also loses the
tombstones that were in the newer file), and another device still holding them offers them back;
a peer that kept the tombstone removes them again at the next merge. `src/backupFiles.ts:522-544`,
`db/merge.ts:139-140, 365-374`.
Invariant: restore(old) then sync with a device that still has the tombstone converges to the
session being absent.

### 1.4 Local to a device

**R34. These are never synchronised and are kept from the current device on restore
(`DEVICE_LOCAL_PREFERENCES`):** deviceId, backupFolderUri, lastAutoBackupDay,
protectDismissedDay, protectDismissals, backupWordsPending, passwordRemindersOn,
passwordCheckStep/Due/Ignored, customAvatarUri, crashLog, errorLog, updateCheck,
updateCheckedAt, updateDismissed, updateLatest, notesSeenVersion, languageChosenOn, guidesSeen,
recentCameoLines, comebackGreetedAfter, backupEncryption, syncServer, syncWifiOnly,
reminderAskedAt, reminderStreakFrom, reminderOfferDismissed. `db/backup.ts:402-442`.
`savedSession` is dropped from a restored file and not kept. `db/backup.ts:450`.
Invariant: after restore, each key above has the value it had before the restore, or is absent
if it was absent; `savedSession` is absent.

**R35. Outside the database, device-local by construction (SecureStore, never in the DB, never in
Android's backup):** vault key and slots (`bati.backup.vault`), keyring, recovery key, install id
and sealing counter (`bati.sync.identity`), sync account, answered, uploaded, ownEtag, verdicts,
counters, forgotten, merged, lastMerge, health, and the vault-update clock
`bati.vault.firstSeen` / `bati.vault.updateOffered`.
`src/backupCipher.ts:98-105`, `src/installId.ts:18-19`, `src/deviceSync.ts:76-97, 219, 859-861`,
`src/vaultUpdateDelay.ts:21-23`.
Invariant: restore and merge change none of these keys.

**R36. The "14-day" date is `bati.vault.firstSeen`** (epoch ms, first launch of this version on
this device). `vaultUpdateOffered` is false before 14 days, persists true once shown. A clock moved
back before day 14 keeps it hidden; an unreadable keystore answers false. `src/vaultUpdateDelay.ts
:14, 28-61`. The delay only hides the Settings line: nothing stops a v2 vault joining a v3 peer
sooner (R70).
Invariant: `vaultUpdateOffered(now)` is monotone: once true, always true.

**R37. The Android backup carries only `bati.v3.db`, `-wal`, `-shm`** (no SecureStore, no `.bak`,
no imports, no gpx files). `plugins/withAndroidBackupRules.js:51-53`.
Invariant: the set of files matched by the include rules is exactly those three.

**R38. Streak caches and `unlocked_achievements` travel with a restore** (they are not in R34)
but are not compared or merged by sync. `db/backup.ts:236-242`.
Invariant: restore replaces them with the backup's values.

---

## 2. Restore

**R39. One road for every door** (picker, onboarding, taking a peer): stage, decrypt, validate,
`keepDeviceSettings`, copies, `beginRestore`, `commitRestore`, reload. One at a time in the whole
app (module-level `running`). `hooks/useBackup.tsx:52, 308-345`, `src/backupFiles.ts:324-328`.
Invariant: two concurrent restore requests result in exactly one swap.

**R40. Nothing destructive happens before `beginRestore`.** Every failure before it discards the
staged files and leaves the live database untouched. `hooks/useBackup.tsx:316-342`.
Invariant: for each failing step before the swap, live DB bytes are identical before and after.

**R41. `validateBackup` checks, in this order:** (1) `integrity_check = ok` else `corrupt`;
(2) `page_count > 0` else `unreadable`; (3) `application_id = 0x42415449` else `notBati`;
(4) `user_version = SCHEMA_VERSION (3)` else `incompatibleVersion`; (4b) any trigger or view
in the file else `schemaMismatch` (added 6f4eac7e: no migration makes either); (5) newest
`__drizzle_migrations.created_at` is a `when` of this build's journal else `incompatibleVersion`;
(6) only if that newest equals this build's newest: every table's flattened `CREATE` text equals
the live one, same count, else `schemaMismatch`. ATTACH errors map to `notSqlite` ("not a
database"), `corrupt` ("malformed"/"corrupt"), else `unreadable`. It never throws for a bad file.
`db/backup.ts:134-183, 119-126, 223-232`.
Invariant: each corruption class yields the stated reason; validate is pure (no change to the file
or live DB).

**R42. Validation does not check:** that older history is contiguous, other `__drizzle_migrations`
rows, foreign keys, row content, or the file's extension. An older backup (newest migration known,
not latest) is accepted with any table shapes; the runner catches it up at the next launch.
`db/backup.ts:157-181`.
The code does not say what happens if an older backup has an inconsistent history.

**R43. A backup from a newer app version is refused, not touched.** Newer plaintext: unknown
newest migration (or a different `user_version`) gives `incompatibleVersion`; a sealed file of a
format above 3 gives `newerVersion` ("update Bati") at import, in sync (state `newerVersion`) and
at connection (`serverState` kind `newerVersion`). `db/backup.ts:153-168`,
`src/backupCipher.ts:670-678`, `src/deviceSync.ts:747, 987`, `hooks/useBackup.tsx:185`.
Invariant: a file of format >3 never changes any local state, never reads as "wrong password".

**R44. Decryption failure mapping at import:** body fails its tag or the file exceeds 256 MiB
throws and is reported `corrupt`; heap too small for Argon2 is `lowMemory` (stops, not "damaged");
`needsSecret`/`wrongSecret` loop on the password sheet; cancel returns `cancelled` and shows
nothing. `src/backupFiles.ts:481-490`, `hooks/useBackup.tsx:173-200`.
Invariant: a truncated sealed file never reaches validate as valid.

**R45. A password-opened file may join the vault, but only after asking** (primary iff encryption
is off here and the hero accepts; with encryption on, it is only remembered in the keyring).
It happens after the copies of R47 are kept, so a restore abandoned for want of a copy leaves the vault as
it was (S2, fixed in 5aaf6a83).
`hooks/useBackup.tsx:137-158, 196`, `src/backupCipher.ts:803-829`.

**R46. `keepDeviceSettings` rewrites the staged copy only:** deletes from it every R34 key and
`savedSession`, then copies this device's R34 rows in. `db/backup.ts:457-468`.
Invariant: staged R34 rows == live R34 rows; live DB untouched.

**R47. Copies before a swap:** `backupBeforeRestore` writes a dated pre-restore snapshot
(`bati-export-before-restore-v3-<day>-<HHMMSS>.<ext>`, to the second) into the remembered backup
folder when there is one; for taking a peer's version, `keepThisDeviceOnServer` too when diverged.
If either throws, the restore is abandoned. With no folder remembered nothing is written.
`src/autoBackup.ts:125-128`, `hooks/useBackup.tsx:69-72, 330-334`, `src/backupFiles.ts:151-156`.
Invariant: if a remembered folder cannot be written, the swap does not run (see S4).

**R48. `commitRestore` order:** serialize on the DB queue; close handle (best effort); delete
`-journal`, `-wal`, `-shm` of the live file; delete previous `.bak`; rename live to
`bati.v3.db.bak`; rename staged to live; on failure of the last rename move `.bak` back with
overwrite and rethrow. `src/backupFiles.ts:522-544`, `db/client.ts:19-21`.
Invariant: after a failed swap the live file equals the pre-swap file (modulo S6); after a
successful swap a `.bak` equal to the pre-swap file exists.

**R49. Startup repair:** no live file and a `.bak` present means the `.bak` is moved back before
opening. `db/client.ts:28-33, 61`.
Invariant: kill between the two renames then relaunch yields the pre-restore database.

**R50. After a successful swap the JS runtime reloads;** on failure the phase is `failed` and
there is no way back to `idle` (a relaunch is needed). `components/DatabaseProvider.tsx:148-164`,
`stores/restore.ts:19-21, 44-48`.
Invariant: commit runs at most once per process (`claimCommit`).

**R51. What a restore replaces:** the whole database (sessions, tombstones, hero content, every
preference outside R34, campaigns, favourites, configs, caches). What it keeps: R34 values, all
SecureStore (R35), `.bak` (now the old DB), premigrate copies, dated copies in the folder, gps
`.gpx` files, the install id (so peers see the same device with a restored history).
Invariant: sessions after restore == sessions in the backup, exactly.

**R52. Leftovers at launch:** plaintext imports and peer scratch are swept once per process.
`components/DatabaseProvider.tsx:60-70`.
Invariant: after a cold start no `bati-import*.tmp.db` or `bati-peer-*` file exists.

---

## 3. Copies, snapshots, auto backup

**R53. Every snapshot is `VACUUM INTO` on an isolated connection, queued with DB transactions.**
Snapshots are written one at a time. `db/client.ts:131-135, 262-270`, `src/backupFiles.ts:165-171`.
Invariant: a snapshot is a consistent database (integrity ok, application_id and user_version set).

**R54. Identity is stamped, not migrated:** `application_id` and `user_version` are written at
every launch after migrations, only if different. A DB the widget created first has no stamp until
the app opens. `db/backup.ts:78-87`, `components/DatabaseProvider.tsx:101`.
Invariant: a snapshot taken after app start validates `ok` against the same build.

**R55. Dated copy name:** `bati-export-<first 8 hex of install id>-v<SCHEMA>-<local day>.<db|batb>`;
untagged form when the keystore is down. The day is the hero's local day (`dayKey`).
`src/backupFiles.ts:140-142`, `src/installId.ts:75-82`.
Invariant: two devices writing the same folder on the same day produce different names.

**R56. Prune keeps the 5 newest dated copies of this device's tag, by day, never another
device's, never the untagged, never `before-restore` copies, never copies dated after today.**
Sorted on the captured date, not the name. Runs only after a successful copy into a folder
(`saveBackupToFolder`), and a failure of the prune never fails the backup. `src/backupFiles.ts
:58, 78-82, 377-401, 418-434`.
Invariant: after a folder write, count(own dated copies with day <= today) <= 5, the newest 5
survive, and every other file in the folder is untouched.

**R57. The prune does not apply to sync's kept copies** (`bati-<id>-kept-...`): the code never
deletes them (not even on disconnect). It does not say how many accumulate. `src/deviceSync.ts
:841-856`.

**R58. Local plaintext/sealed snapshots in the DB directory** (`bati-export-*`) are swept before
every new snapshot, so at most one stale snapshot exists. `src/backupFiles.ts:185-190`.

**R59. Encryption gates every write:** status `locked` (wish on, no key) refuses to write any
snapshot; `on` seals; `off` writes plaintext. A failed seal leaves the plaintext scratch removed.
`src/backupFiles.ts:195-206, 258-276`, `src/backupCipher.ts:328-331`.
Invariant: when encryption is wanted, no plaintext snapshot is ever written; no scratch plaintext
survives a failed seal.

**R60. Auto backup (folder).** Daily: once per day at launch iff `lastAutoBackupDay != today`;
the day is stamped only after the write; failure is reported, retried next launch, never disables
the feature. Before migrations: when a migration is pending and a folder is remembered, writes a
copy; any failure there turns auto backup OFF. Enable: the folder is remembered only after its
first write succeeded. `src/autoBackup.ts:94-104, 137-162, 205-218`.
Invariant: lastAutoBackupDay never names a day with no successful write.

**R61. Pre-migration private copies:** `premigrate.db` (newest) and `premigrate.prev.db`, two
generations, written via a temp name and rename, before `BEGIN IMMEDIATE`, skipped on a fresh
install and when another process already migrated; a failure never stops the update. They are
not touched by validate or restore. `src/backupFiles.ts:103-129`, `db/migrate.ts:258-270`.
Invariant: after an update there are two premigrate files whose content is the DB before the last
two updates; no partial file under those names.

---

## 4. Migrations

**R62. The DB file name carries `SCHEMA_VERSION` (3):** a bump opens a new empty file and re-runs
everything; the old file is orphaned. `db/client.ts:16-19`, `db/schemaVersion.ts:12`.

**R63. The runner skips by timestamp:** an entry runs iff `lastAppliedAt < entry.when`; so journal
`when` must be strictly increasing and a lower `when` added later never runs. Today the journal has
68 entries, idx 0..67 contiguous, `when` strictly increasing (checked 2026-10-05).
`db/migrate.ts:50-52`, `drizzle/meta/_journal.json`.
Invariant: for all i, `when[i] > when[i-1]` and `idx[i] = i`.

**R64. All pending migrations run in one `BEGIN IMMEDIATE`... `COMMIT`; any statement failure
rolls the whole batch back** and the app shows the migration error screen; a failed promise is not
cached, so the next call retries. `db/migrate.ts:169-177, 274-276`.
Invariant: after a failed migration the database equals the pre-migration database (no partial
tables, no `__drizzle_migrations` row).

**R65. Migrations are hand-written; destructive SQL needs `-- destructive-ok: <reason>` above
idx 66; two new migrations in a release need `-- multi-migration-ok:`.** Seed migrations scope
every statement touching `exercises` to `creator`. `AGENTS.md`, `__tests__/migration-destructive-guard
.test.ts:21`, `scripts/check-release-migrations.sh:6`. `docs/architecture/data-safety.md:28-34`.

---

## 5. Quest import and export

**R66. Export file** = `{kind:'bati-quest', version:1, quest{uuid, title x4, description x4,
rounds, restSeconds, roundRestSeconds, image}, slots[]}`. Official movements travel by English
name; hero movements travel whole (uuid, name, description, image, muscles, style, difficulty,
equipment, pattern, measure, secondsPerRep). No sessions, no hero name. A slot whose exercise is
not in the catalogue is silently dropped; a hero row without uuid throws; the placeholder cover
travels as null. `src/questFile.ts:54, 139-183`.
Invariant: `parse(export(q))` equals the exported structure.

**R67. Limits on read:** file <= 8,000,000 bytes (declared size and text length), `content://`
URIs only; 1 to 40 slots; names <= 120 chars; texts <= 2,000; any string longer than 4x its max is
refused, not cut; control and invisible format characters removed (ZWJ and ZWNJ kept); numbers
clamped to the editors' ranges; `version` > 1 gives `newer`; a code string not in this build's
lists gives `newer`, a non-string gives `not_a_quest`; a muscle code unknown is dropped; unknown
pattern becomes none. `src/questFile.ts:57-64, 215-283, 365-433, 628-640`.
Invariant: no accepted file produces a row outside the clamp ranges or with an empty title.

**R68. Photos:** only `data:image/(jpeg|png|webp);base64` up to 400,000 chars and at most 1024 px
per side by header, or a bare relative asset path (`[A-Za-z0-9_-./]+`, no `..`); everything else
(URL, `file:`, `content:`, oversized, unreadable header) becomes `null` (quest cover: no cover;
movement: placeholder). `src/questFile.ts:57, 62, 348-363, 372`.
Invariant: no accepted image string contains a scheme other than `data:`.

**R69. Identity on import:** quest and hero movements are recognised by uuid, never by name.
- Same quest uuid as one of the receiver's hero quests: updated in place (id, history kept; head
  and slots overwritten, `updatedAt` bumped). `asCopy` gives it a new uuidv7.
- Same movement uuid: the receiver's row is used as is (the file does not edit it), unretired if
  retired; the slot style is the receiver's.
- Same name, different uuid: a second quest or movement (hero names have no unique index).
- Same movement uuid twice in a file: one row.
- Official movement unknown to this build: whole import refused `unknown_movement`; the preview
  lets the hero drop that slot (`keep`).
- All writes in one transaction, caches invalidated after, rollback leaves no orphan movement.
- A second import of the same file: `updated: true`, same content, newer `updatedAt`.
`src/questFile.ts:495-507, 531-621`, `db/exercises.ts:985-1025`, `db/schema.ts:175-186`.
Invariant: import(f); import(f) leaves the same quests, slots and movements as import(f), with
the quest count unchanged; a failing import leaves counts unchanged.

**R70b. A borrowed uuid overwrites the receiver's quest** (documented and previewed); an Admin
quest is never overwritten (only `isUserQuest` rows match). `src/questFile.ts:525-527, 545`.

---

## 6. GPX export

**R71. What is written:** GPX 1.1, creator Bati, one `<trk>`, `<name>` = file name (escaped),
`<desc>Bati distance: <round metres> m</desc>`, one `<trkseg>` per stretch split by `breaksRun`
(fix farther than 200 m from the previous, gap over 30 s, or negative elapsed time). Per point:
`lat`, `lon` with 6 decimals; `<ele>` in metres, 1 decimal, omitted when null; `<time>` always,
ISO 8601 UTC (`Z`); `<extensions>` with `gpxtpx:speed` in m/s, 2 decimals, omitted when null.
Child order ele, time, extensions. Accuracy and barometric height are not exported. `src/gps/gpx.ts
:28-92`, `src/gps/track.ts:298-303`, `src/gps/trackFile.ts:73`.
Invariant: round trip of a fix list parses to the same points within 1e-6 deg, 0.05 m, 0.005 m/s;
no coordinate contains `e`; every `trkpt` has a `time`.

**R72. Units in storage vs export:** DB stores `latE7`, `lonE7`, `eleCm`, `speedCms`, `t` (epoch
ms), `distFromPrevCm`; export divides back (`/1e7`, `/100`). `db/gps.ts:20-40`.

**R73. File name** `bati-<UTC ISO of the first fix, : and . replaced by ->.gpx` in
`<documents>/gps-tracks/`; re-exporting the same outing overwrites its file; the header distance
is recomputed from the exported fixes, not read from the session row. Empty fix list exports
nothing. Timezone: the file carries UTC only; the session's local offset (`tzOffsetMin`,
`db/schema.ts:106`) is not exported, and the file name's date is UTC while the hero's "day" is
local. `src/gps/trackFile.ts:24-26, 66-73`.
Invariant: two exports of the same fixes are byte-identical.

---

## 7. Sync state machine

### 7.1 Files, names, formats

**R74. One file per device, `bati-<install id>.batb`, written only by that device;** nothing ever
deletes another device's file. Peer pattern `^bati-[0-9a-f-]{36}\.batb$`; excluded: own file,
`.upload` temporaries, `-kept-` copies, Syncthing temporaries and conflict files. `src/installId.ts
:53-54`, `src/deviceSync.ts:423-425`, `src/folderSync.ts:5-14`.
Invariant: sync never issues a delete or overwrite on a name other than its own file, its
temporary, its kept copies, or `bati-diagnostic.upload`.

**R75. A file is a peer's only if its name equals the install id inside it (v3).**
`nameIsId`; a copy renamed to another device's name is `unreadable`. `src/deviceSync.ts:473-490`.

**R76. At most 16 peers are read** after removing forgotten ones, in listing order (not newest
first); files over 256 MiB are `unreadable`. `src/deviceSync.ts:104, 450, 780`. The code does not
say which 16 when more are live.

**R77. Formats.** A build reads 2 and 3 forever; seals only in its vault's format; a vault never
goes back; a file of a version above 3 is `newerVersion`. `CIPHER_READS = 3` is part of the stamp
of every kept verdict and of the upload marker. `src/backupCipher.ts:59-65, 646, 670-678,
812-816`.
Invariant: `vaultFormat` is non-decreasing over any sequence of joins and password changes (until
`disableEncryption`).

### 7.2 Verdicts

**R78. Verdict of one peer file** (`judge`), in this order:
1. fetch fails, or size differs from the listing: exception, that peer is skipped this sync (R100);
2. size > 256 MiB: `unreadable` (kept);
3. opening throws: `unreadable` (not kept);
4. not an opened Bati file (plain SQLite, wrong magic, v3 header unreadable, no usable slot):
   `unreadable` (kept);
5. format > 3: `newerVersion` (kept);
6. needs a secret: `replayed` if the file names an install whose higher counter this phone saw,
   else `locked` with its format;
7. opened with a keyring key: `oldKey` (kept), never merged, counters untouched;
8. v3 opened with the own key: name mismatch or counter above 2^53-1: `unreadable`; counter below
   the stored one: `replayed` (kept); else `fresh`, counter stored if higher;
9. `validateBackup` not ok (includes newer migration): `unreadable`;
10. compare: R4.
Then: `locked` becomes `oldKey` if its format is below this vault's, else stays `locked` if
`mustJoin`, else `waiting`. A comparison whose fingerprint was answered becomes `level`; an
`unreadable` whose etag was marked seen becomes `level`.
`src/deviceSync.ts:615-641, 597-612, 742-803`.
Invariant: each class of file maps to exactly one verdict; `replayed`, `oldKey`, `newerVersion`,
`unreadable` never reach the merge.

**R79. Kept verdicts** (`level`, `behind`, `unreadable`, `oldKey`, `newerVersion`, `replayed`) are
stored with stamp `<etag>#<local state>`; same stamp means the file is not downloaded again. Local
state = `stateFingerprint # sealingHeader # BUILD_MIGRATIONS # CIPHER_READS`. A verdict whose open
threw is not kept. `src/deviceSync.ts:363-365, 581-590, 615-625, 572-577`.
Invariant: an idle launch (nothing changed anywhere) downloads zero peer files.

**R80. Anti-replay (v3).** Counter `reserveCounter` is read-incremented-saved in SecureStore
before sealing, under a lock; a crash spends a number, never reuses one. A file with a counter
lower than the stored one for that name is `replayed`; equal is accepted. Counters are stored only
for files that opened under the phone's own key, never from keyring files, never from files that
needed a secret (`claimsToBeOlder` can only ignore, never record). v2 files have no counter and no
replay protection. `src/installId.ts:96-110`, `src/deviceSync.ts:486-503, 733-740`.
Invariant: per name, the stored counter is non-decreasing; sealing counters strictly increase,
also across concurrent seals.

**R81. `mustJoin(peer, own, peerFormat, ownFormat)`:** higher peer format: join (true); lower or
(own non-null and different): false; same format: if either file has no server date, true for
both; else later `modified` wins; equal dates: larger file name wins. `src/deviceSync.ts:652-662`.
Invariant: for two devices of equal format with distinct non-zero dates or names, exactly one
`mustJoin` is true (no mutual wait, no swap). With a zero date on either side both are true (S11).

**R82. A `locked` peer: if its format is lower than ours it is `oldKey`** (never joined, never
waited for), if higher we join it, if equal the later file wins. `src/deviceSync.ts:606-611`.

**R83. Joining.** `serverState`: no visible peer files: `empty`; any file of a newer format:
`newerVersion`; else candidates ordered by format, then `modified`, then larger name; a candidate
the phone's own vault already opens means `ready`; a locked best candidate means `needsSecret`
unless our own file is on the server and `mustJoin` is false (then `ready`). Candidates of a
format below our own vault are not offered. Files that fail to read are skipped; if files exist
and none could be read the call throws instead of answering `empty`. `joinPeer` tries the secret
on locked files of the top format first, the named one first; a read failure on every candidate
throws, it is not "wrong password". `src/deviceSync.ts:954-1096`.
Invariant: a device never starts a second vault when a readable sealed file of a vault it could
join exists; a device never joins a lower format.

**R84. Joining = `joinKey`.** Primary only if `asPrimary` and (no previous vault or previous
format <= source format). Previous key goes to the keyring; the header/slots become ours;
`backupEncryption=on`; `backupWordsPending` and the recovery key are dropped. Otherwise the key is
only remembered. `src/backupCipher.ts:803-829`.
Invariant: after joinKey, every key ever held on this phone since the last disable is in
`{own} union keyring`.

**R85. Slot adoption.** When a file opens under the own key, each slot of that file replaces ours
of the same kind iff unreadable-by-reader slots are excluded and (we have none, or higher
generation, or equal generation and the smaller `raw` string). New words from elsewhere forget the
locally kept recovery key. Lower generations never replace. `src/backupCipher.ts:491-513`.
Invariant: two devices that exchange files converge to the same slot per kind (the max gen, ties
by smaller raw) and never to a lower gen than before.

**R86. Password and words.** A new password is a new key (old key to keyring), with new words;
"I do not remember it" (`rewrapPassword`) and new words (`rewrapWords`) keep the key and bump the
slot generation; password at least 15 NFC characters. `src/backupCipher.ts:344-350, 384-479`.
Invariant: after `changePassword`, files sealed before still open on this phone; after
`rewrapPassword`, the master key is unchanged.

**R87. Forgetting a peer** hides that file for its current etag and drops its counter, answer and
verdict; a new etag brings it back; the file is never deleted. The forgotten list is pruned to
entries still matching a listed etag. `src/deviceSync.ts:437-470`.
Invariant: forget(peer) causes no remote change; the peer reappears after it writes again.

**R88. Disconnect** clears all sync stores (account, answered, uploaded, ownEtag, verdicts,
counters, forgotten, merged, lastMerge, health), the `syncServer` preference, peer scratch and any
pending snapshot; it leaves the install id, vault, keyring and remote files. A Nextcloud app
password is revoked best effort. `src/deviceSync.ts:323-342`.

### 7.3 What is uploaded and when

**R89. Sync needs encryption `on`;** otherwise it throws `Sync needs encryption on` before any
network call, and the writer refuses plaintext too. `src/deviceSync.ts:527`,
`src/backupFiles.ts:286-292`.
Invariant: no unsealed bytes are ever passed to the remote.

**R90. Order in `syncNow`:** list; clear peer scratch; judge each peer; persist verdicts; decide
hold-back; upload. `src/deviceSync.ts:523-561`.

**R91. Hold-back.** No upload if any peer is `ahead` or `locked`; none if any peer is `diverged`
and this device has never uploaded to this remote (marker lacks `<remote id>#`). `src/deviceSync.ts
:678-684, 350-356`.
Invariant: while a peer is `ahead`, the local file on the remote is not replaced.

**R92. `uploadIfNeeded`.** Upload iff the marker (`<remote>#<local state>`) differs, or our file
is not listed, or its etag differs from the one this device stored after its last upload
(replaced behind our back). Uses a pending launch snapshot when not `snapshotFirst`, else seals
anew. Writes `<name>.upload`, `MOVE` (server without MOVE: 405 or 501 falls back to direct PUT,
temp deleted best effort), then `PROPFIND Depth 0` must show the final file at the sent size
(mismatch: error 409), only then are marker and ownEtag written. A folder remote copies over the
final name and has no etag. `src/deviceSync.ts:694-718`, `src/cloudSync.ts:486-547`,
`src/folderSync.ts:71-81`.
Invariant: the marker names a state only if the remote verifiably held a file at that size; a
failed upload leaves the marker unchanged.

**R93. A re-upload happens when the key changed** (join, password) even with unchanged history,
because `sealingHeader` is in the state. `src/deviceSync.ts:363-365`, `src/backupCipher.ts:290-296`.

**R94. The launch half seals the snapshot only if sync is on, encryption on, and the marker
differs;** it never throws. `src/deviceSync.ts:371-380`.

**R95. Kept copy.** The first merge with each peer name uploads this device's whole history as
`bati-<id>-kept-<yyyymmddThhmmss>-<4 hex>.batb` before merging (and before taking a peer's version
when diverged); the name is remembered in `bati.sync.merged`. `src/deviceSync.ts:841-856,
899-927`.
Invariant: a first merge leaves exactly one new kept file whose content equals the pre-merge
state.

**R96. A merge reloads the app only if `changes > 0`** (sessions + other rows + honoured
tombstones); `changes = 0` leaves the prompt silent. `components/SyncPrompt.tsx:173-185`.

**R97. Prompt policy.** `ahead` and `diverged` are merged, not asked, unless the merge refuses
(different build or exception), then the hero chooses take or keep (keep is remembered by
fingerprint). A device with zero sessions and a peer with sessions is asked first ("found your
hero"; "not mine" is remembered). `locked` asks for the password; `unreadable` and `newerVersion`
announce; `replayed` toasts. Never during a running session. `components/SyncPrompt.tsx:217-238,
128-186`.

---

## 8. Error handling

**R98. `failureOf` classification:** `DavAuthError` (HTTP 401 or 403 from listing, folder or upload)
gives `credentials`; `DavHttpError` 507 gives `storage`, any other status (400, 404, 409, 423,
5xx) gives `server` with the status; messages matching certificate, CertPath, SSLHandshake,
SSLPeerUnverified, trust anchor give `certificate`; network request failed, unable to resolve
host, unknownhost, timeout, timed out, failed to connect, connection refused, econnrefused,
aborted give `offline`; the string `Sync needs encryption on` gives `encryption`; else `unknown`.
Requests time out after 15 s (abort gives `offline`). `src/cloudSync.ts:58, 199-256`,
`stores/sync.ts:50-54`.
Invariant: every error kind maps to the stated word; classification does not read the body.

**R99. A failure of the list or the upload aborts the whole sync with that failure.** Nothing
local changes (markers and verdict store unchanged for the failing step; verdicts already saved
for the loop stay). Health records `failure` and keeps `failingSince`; a success clears both.
`src/deviceSync.ts:530, 555, 709-717`, `stores/sync.ts:93-109`, `src/deviceSync.ts:234-243`.
Invariant: after any network failure the local DB is byte-identical.

**R100. A failure on one peer file is swallowed:** a ghost listing entry, 403 or 423, a cut
download (size mismatch with the listing), a native download error: reported to the error trail,
that peer is absent from the result, sync continues and may upload, and the run is recorded as a
success. Not kept as a verdict, so it is retried at the next sync. `src/deviceSync.ts:543-554`,
`stores/sync.ts:93-100`. A cut download with no listed size fails later at the tag, giving
`unreadable` (said once if marked).
Invariant: a persistent per-file failure never blocks this device's upload and never alters local
data.

**R101. List and upload specifics.** Listing always asks `MKCOL` first (401 and 403 error, other
statuses ignored), then `PROPFIND Depth 1` must be 207, else a refusal (reason from Sabre's
`<s:message>` appended); an empty answer is an empty list, never inferred from an error (so a
missing mount never deletes anything). Folder and subfolder entries are skipped. Etag missing:
`lastmodified|size` stands in. `src/cloudSync.ts:262-289, 431-454`.

**R102. Upload failures:** PUT non-2xx: 401/403 `credentials`, 507 `storage`, other `server`;
MOVE refused other than 405/501: error; verification 404: error; size mismatch: 409 `server`. The
`.upload` file may remain on the server and is never read as a peer. `src/cloudSync.ts:497-546`.
Invariant: no failure leaves a truncated file under a peer name.

**R103. Folder transport:** `read` of a missing file throws; `write` is a plain copy (not
atomic); no etag, time and size stand in; mtime is the writer's clock. `src/folderSync.ts:38-82`.

**R104. A Nextcloud or WebDAV account is remembered only after the folder was created and listed;**
a refusal leaves a non-persisted `candidate` for the connection test. Plain HTTP only to
localhost. `src/deviceSync.ts:246-316`, `src/cloudSync.ts:75-77`.

**R105. Lost sync detection:** the `syncServer` preference without a SecureStore account means
sync was lost (not stopped). `src/deviceSync.ts:191-195, 329`.

---

## 9. Contradictions between code and plan

C1. **Upload temporary suffix.** Doc: "A file goes up as `….batb.part`" (`docs/architecture/
backup-and-sync.md:285-288`). Code: `.upload`, because Nextcloud refuses `.part` with a 400
(`src/cloudSync.ts:52, 495`). Doc is stale.

C2. **premigrate generations.** Doc: `premigrate.db` "replaced at the next update"
(`docs/architecture/data-safety.md:49-51`). Code keeps two: `premigrate.db` and
`premigrate.prev.db` (`src/backupFiles.ts:103-106, 121-124`).

C3. **"Unreadable is announced once per file".** Doc `backup-and-sync.md:326-328` and the comment at
`src/deviceSync.ts:633`. Code only silences state `unreadable` (`:634-636`); `newerVersion`, the
usual reason, is announced by the same dialog (`components/SyncPrompt.tsx:219`) and
`rememberUnreadable` stores a mark that `judge` never consults for it; the per-process `offered`
list resets at launch. So it re-announces at every launch until the app is updated. `replayed`
re-toasts the same way (`:218`). Possible bug (S3).

C4. **"No device clock takes part."** `src/deviceSync.ts:61-62`, `db/backup.ts:299`. Sessions yes;
hero content and the R7 preferences are compared and merged by device-clock `updatedAt`
(`db/backup.ts:282-285`, `db/merge.ts:182-185, 246`).

C5. **Keyring "every key this phone has ever held stays".** `src/backupCipher.ts:60-61`, doc rule 4
(`backup-and-sync.md:216-217`). `disableEncryption` deletes the keyring
(`src/backupCipher.ts:519`), as well as the vault and recovery key.

C6. **Slot tie-break.** Comments say "the smaller install id wins" (`src/backupCipher.ts:262-266,
485-486`). Code compares `theirs.raw < mine.raw` (`:505`), the slot's serialized bytes; the stored
`writer` is not consulted.

C7. **Nothing would be lost by taking an `ahead` peer.** `components/SyncPrompt.tsx:133-137` (no
kept copy). `ahead` is computed on a view that ignores campaigns, boss fights, quest configs,
favourites, set-aside list and non-merged preferences (R11), all replaced by the take (R51). Only
reached when merge refuses (R12); a folder copy and the `.bak` still exist when a folder is set.

C8. **What each side lacks lists six items.** Doc `backup-and-sync.md:299-302` names village name,
avatar, level, equipment, oath; code adds `reminderDays` (`db/backup.ts:250-251`).

C9. **"Password of the most recently written one."** Doc `backup-and-sync.md:289-291`. Code orders
by format first, then date, then larger name (`src/deviceSync.ts:1005-1006`), and refuses lower
formats than the phone's own.

C10. **Android backup "carries `bati.v<N>.db` and its journal".** Doc `:42`. Rules include the
`-wal` and `-shm` sidecars (`plugins/withAndroidBackupRules.js:51-53`); there is no `-journal` as
the DB is in WAL (`db/client.ts:75`), though `commitRestore` deletes a `-journal` too.

C11. **Vault delay.** `src/vaultUpdateDelay.ts:5-12` says a v2 vault "keeps writing format 2" for
14 days. Nothing enforces that: only the Settings line is hidden (`hooks/useBackupEncryption.ts
:84-92`); a v2 vault that joins a v3 peer becomes v3 at once (`src/backupCipher.ts:812-824`).
Probably intended (doc says so at `backup-and-sync.md:147-149`), but the delay does not protect
that path.

C12. **Outdated header comment.** `src/backupCipher.ts:13-21, 40-43` still describe the model as
PBKDF2 and a 64-character recovery key and one header layout; the rules in the same file are
format 3 first.

---

## 10. The code does not say

- Whether kept copies on the remote (`-kept-`) are ever pruned: no code does.
- Which 16 peer files are read when more than 16 live ones exist (listing order).
- Behaviour of validate for an older backup with an inconsistent history (R42).
- Whether any migration writes a merged preference or hero row with NULL `updatedAt` (R8).
- How two edits to one hero row in the same second reconcile (R9).
- What happens to `savedSession` (an interrupted session) on a merge: nothing, it is local.
- A limit on the number of tombstones or any pruning of them.
- Merging campaigns, boss progress, quest configs, favourites, achievements: explicitly "local in
  this version" (`db/merge.ts:38-40`), no plan in code.
- Whether a session's `uuid` can ever be NULL after migration 0038 and what then happens (R1).
- Timezone handling of merged sessions beyond copying `tzOffsetMin`.
- Conflict on `exercises.uuid` unique index if a peer row's uuid equals a local row by another
  identity: R19 avoids it for the cases described; others roll back the merge each sync
  (`db/merge.ts:286-289`).
- Rate limits, retry/backoff, and cancellation of an in-flight sync.

---

## 11. Suspected bugs (for a human to decide)

Status on `bench-green` (2026-10-06): **fixed, each with a test and a mutant**: S1 (`df2d8e63`, M43), S2 (`5aaf6a83`,
M47), S10 (`2d7605ea`, M44, M45), S11 (`ca40d2ef`, M46); also fixed, each with a unit test: S3/C3 (announced once per file version), S4 (a folder that cannot be reached any
more no longer blocks a restore; unverified on a device), S5/C7 (copy first), S6 (a handle that did not close parks its
WAL with the database), S8 first half (an undated row reads as date 0 in the comparison, as in the merge). **Frozen on
purpose**: S7 (as 2.9.0 did), S9 (first copy wins, with a test). **S13 fixed**: a session the other device deleted that this one keeps (its campaign moved past it, `deleteSession`
answers "locked") stays here, nothing is deleted, it no longer reads as the other's news so it never holds back the
send, and the sync sheet says how many are kept (`keptSessions`). Pinned by `__tests__/db-peer-compare.test.ts`,
`db-peer-merge.test.ts`, `deviceSync.test.ts`, `SyncStatusSheet.test.tsx`, mutants M61 and M62, and the random model's
`lockedDelete` event. **Accepted, documented, planned for merge v2** (`docs/planning/roadmap.md` 4.18b): S8 second half
(two edits of one row in the same second keep both versions) and S12 (`ownedEquipment` is last writer wins, no union).
Found since by the Node stage, not listed below: Apache's weak etag flicker (`d779adc2`, M42), a temporary upload name
locked by a cut upload on Nextcloud and rclone (`68f55ead`, M41), a backup carrying a trigger or a view accepted
(`6f4eac7e`, M48), GPX with a control character in the name or a longitude rounding to 180 (`92a9b521`, M49, M50).

S1. **Stale pending snapshot reuse.** `uploadIfNeeded` reuses `bati-sync-out.batb` sealed at
launch when `snapshotFirst` is false (`src/deviceSync.ts:709`) but writes the marker for the
current state (`:712`). `vaultUpdateBlockers` calls `syncNow({snapshotFirst:false})`
(`:511`); if the launch sync held back (peer `ahead`/`locked`) the pending file is never deleted,
a session finished since launch is missing from it, and the marker then says it was uploaded.
Peers do not see that session until the next state change.

S2. **Restore abandoned after the vault was changed.** `offerJoin` can make a foreign key primary
(SecureStore) at `hooks/useBackup.tsx:196`, before `copiesKept` can still abort the restore
(`:330-334`). The DB is untouched but the vault is not "exactly the previous one".

S3. **Newer-version and replay peers are announced at every launch** (C3).

S4. **Stale `backupFolderUri` blocks restore.** `backupBeforeRestore` throws when the remembered
folder cannot be written (`src/autoBackup.ts:125-128`), which abandons the restore
(`hooks/useBackup.tsx:70`). A DB Android restored onto a new phone carries the old phone's
`backupFolderUri` (R34 only protects from a *restore*), whose permission did not travel; nothing
clears it except a failing pre-migration copy (`autoBackup.ts:160`). Unverified on a device.

S5. **Take of an `ahead` peer without a kept copy** (C7).

S6. **WAL deleted before parking.** `commitRestore` deletes `-wal` and `-shm` of the live file
after a best-effort close (`src/backupFiles.ts:526-528`, `db/client.ts:188-203`). If the close
failed silently with committed frames still in the WAL, those are discarded from the file that
becomes `.bak` and from the rollback target. Low likelihood.

S7. **Hero content deleted on one device returns** (R32), including a quest the hero deleted on
purpose; sessions of that quest on the peer re-create it through `quest_map`.

S8. **Permanent `ahead` from NULL `updatedAt`** (R8) and **silent divergence on equal
`updatedAt`** (R9).

S9. **Session edits do not converge** (R15): oath bonus XP or feedback applied after the other
device already copied the session leaves two values for one uuid forever, and `xpEarned` feeds
level and village.

S10. **Per-peer failures are recorded as a successful sync** (R100): every peer file can fail
(a 403 on all of them) and Home still reads "up to date".

S11. **`mustJoin` with a missing server date returns true for both devices**
(`src/deviceSync.ts:659`): both ask to join the other, the vault swap the comment says it avoids.
Needs a server without `getlastmodified` or an unreadable mtime.

S12. **`ownedEquipment` is a whole-value last-writer-wins JSON** (R21): concurrent changes lose one
side, no union.

S13. **`ahead` held forever by a locked session** (R31): a peer holding a tombstoned
campaign-locked session stays `ahead` and that device never uploads until it records something
new.


## 12. Found by the random nights

**C13 (fixed). A vault this device left could be elected by the others.** After a new password a device keeps the old
key for reading only (`viaKeyring`, state `oldKey`: a vault it has left) and never joins that vault again. The other
devices choose which vault to join by the server's file dates (`mustJoin`), so when their own file was as new as the
one the first device sent after its new password (the same second: the server's dates have one), they kept the old vault
and waited for that device to join it. Each side was waiting for the other, for good, with nothing saying so. Fixed in
`uploadIfNeeded`: a device that sees an `oldKey` peer file as new as its own or newer sends its own again
(`vaultLeftIsNewer`), so that its vault is the newest and the others join it. Pinned by `__tests__/deviceSync.test.ts`
("a vault this device left whose file is as new as its own"), by `test/node/sync/lagging-listing.test.ts` and by mutant
M60. The same split could happen without a tie when the listing was late (a device uploads under the old key after the
new one was sent): that case is also repaired by the same send.
