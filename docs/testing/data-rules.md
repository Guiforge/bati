---
title: Data rules, as the code implements them
type: technical
status: current
updated: 2026-10-17
related: [../architecture/backup-and-sync.md, ../architecture/data-safety.md]
---

# Data rules, as the code implements them

Purpose: a written statement of what the data code does, so invariant tests are derived from it
and not from guesses. Every rule cites `path:line` (as of the release that ships device sync).
"Invariant" is phrased for a property-based test on simulated devices. Where the code is silent it
says so.

Vocabulary. A *device* is an install: SecureStore identity (`bati.sync.identity`), one SQLite file
`bati.v3.db`, one sealed file `bati-<id>.batb` on the sync remote. A *peer file* is another
device's sealed file. A *tombstone* is a row of `deleted_sessions` or `deleted_content` (hero quests and movements, 0074). *News* is what
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

**R3. `peerChanges = peerOnly + peerDeleted + peerContent + peerEdited + peerGoneContent`; `localChanges = localOnly +
localDeleted + localContent + localEdited + localGoneContent`.** `peerGoneContent` = the peer's content tombstones this device lacks or holds older, `localGoneContent` the reverse; `peerEdited` also counts a session with more XP on the peer, and a tie of two equal non-null stamps goes to the larger content (R9). These new terms (XP, content tombstones, the same-second tie) count only when both newest migrations are equal: a previous-build peer is judged as that build judged it. `peerDeleted` = local sessions the peer tombstoned;
`localDeleted` = peer sessions the local side tombstoned. `peerEdited` = sessions both hold whose
`setsEditedAt` or `feedbackEditedAt` (0072) is later on the peer, `localEdited` the reverse, NULL
reading as 0. A side before 0072 has no stamps: it offers no edit, and every edit the other made
is news it lacks, so a correction keeps a device `diverged` or `behind` rather than `ahead`, and
is never replaced silently by a take. `db/backup.ts` (`compareWithPeer`, `editedLaterIn`).
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
"news" from side X if the other side has no row with the same identity covering it (later, or equal and with content not smaller, R9), unless a tombstone of the other side kills the row (R32): a row deleted there is that side's news, never ours.
`db/backup.ts:269-300`.
Invariant: after a merge in both directions, `peerContent=localContent=0` (modulo R9).

**R6. Content news uses the device wall clock.** `updatedAt` is `new Date()` at write time, seconds
resolution. The "no device clock" claim holds for sessions only. `db/backup.ts:296-300`,
`db/schema.ts:101`, `db/preferences.ts:88`, `db/quests.ts:283`.
Invariant: with skewed clocks, the side with the later `updatedAt` wins hero content, whichever
edit was really last.

**R7. `MERGED_PREFERENCES` = villageName, avatarId, customAvatar, trainingLevel, ownedEquipment, oath,
oathBonusAt, reminderDays, crestAnimal, crestCoat, crestMotto.** `db/backup.ts` (`MERGED_PREFERENCES`). `crestMotto` is a motto id of the closed list in `db/crestMotto.ts` or `none`, same discipline.
`crestAnimal` is `auto` or an animal slug; a missing or unknown value reads as `auto`. Nothing
writes a default (a device that never chose has no row, or two such devices would diverge in
`db-peer-compare`), and going back to the animal the sessions chose writes `auto`, never a delete:
a preference has no tombstone, so a deletion could not beat an older pick on the other device.
`db/preferences.ts` (`getCrestAnimal`, `setCrestAnimal`). The same holds for `oath` and
`ownedEquipment`: breaking the oath (`breakOath`) and setting the equipment back to everything
(`setOwnedEquipment(null)`) write an empty string, which both readers take as absent, and never
delete the row; a delete was undone by the next merge with a device that still held the old one.
`crestCoat` (`getCrestCoat`, `setCrestCoat`; `db-peer-merge` holds the test) is `auto` or `usual` under the same discipline: one choice for the whole
hero, no default written, back to `auto` writes `auto`, an unknown value reads as `auto`. A `db-peer-merge`
test checks that an `auto` written later beats an older `usual`, in both merge directions.
Invariant: only these keys ever change in `user_preferences` through a merge (plus R12); `auto`
written later wins over an older animal on the other device, in both merge directions.

**R8. An undated row (`NULL updatedAt`) reads as date 0 on both sides.** The comparison and the merge read `ifnull(at, 0)` (`db/backup.ts`, `db/merge.ts`), so a NULL is
older than any date and two undated copies are a tie, settled by their content (R9). The column is nullable
(`drizzle/0000_schema.sql:10`).
Invariant: a database compared with a copy of itself shows no news, undated rows included; a dated row is news
against an undated copy of it.

**R9. Equal `updatedAt` with different content is settled by the content, the same on both devices.**
The row, its muscles or slots (movements and quests), a preference's value, a session's sets or its
feedback (for equal non-null stamps) are written as one canonical JSON text with no local ids
(`canonical`, `setsCanon` in `db/backup.ts`), and the larger text, compared as a string, wins in the
comparison and in the merge alike. Equal texts are the same content.
Invariant: two devices that edit the same hero row in the same second hold the larger canonical text
after one merge each way, and compare reports `level` on fresh snapshots. The loser's own fingerprint does not
move, so its file on the server is refreshed only by the next change (`ponytail:` in `heroContent`).

**R10. `stateFingerprint` / peer `fingerprint` = `count(sessions) ':' max(uuid)`, then `':'` and the
sum of both edit stamps when it is not 0 | `max(updatedAt) ':' count` over hero content |
tombstone count | `sum(xpEarned) ':' count ':' max(deletedAt)` over `deleted_content` (0074).** The content
segment also covers the hero's adventures (0075); it is unchanged for a device that has none. An answer
(`answered`) given before merge v2 has three segments and matches the first three of the four (`judge`
in `src/deviceSync.ts`); new answers store the whole. The update bumps the newest migration, so every
device re-uploads and re-judges every peer once, on purpose. `db/backup.ts` (`sessionsStamp`). With no edit the first term is what it was
before 0072, so an answer the hero already gave is not asked again.
Invariant: correcting a set or giving feedback after the save changes the fingerprint, every time:
`nextEditStamp` writes `max(now, stamp + 1)`, so the sum grows even within one second or past a
stamp merged from a phone whose clock runs ahead. Editing `notes` does not; a bonus added to a session changes the fourth segment only; adding
one session changes it; adding a tombstone changes it.

**R11. Never compared and never merged:** derived caches (`streak_*`, achievements), favourites
(`favourite_quests`), quest configs (`quest:<id>:config`), adventure runs, boss fights and boss damage
log (any status, `left` included; the hero's own adventures are no longer in this list, R19), set-aside exercises, `language`, `warmupEnabled`, `prepMode`,
`distanceUnit`, `hapticsEnabled`, `soundEnabled`, `mapTiles`, `villagersEnabled`, `bigFeastsShown`
(a JSON list of the big feasts this phone already showed; it only decides display), `notesSeenVersion`
(the release notes this phone already showed; per device, it only decides which Home notice is up), and every
other preference not in R7. They are excluded by being absent from the whitelist `MERGED_PREFERENCES`
(`db/backup.ts:251-265`), the only list the comparison and the merge read (`db/backup.ts:270-277`,
`db/merge.ts:181`).
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

**R14. A peer session is inserted when new, and its edits taken when later, its larger XP kept.** A peer session is
copied iff its uuid is neither local nor in local tombstones, with all columns except `id`; XP,
`records_json`, `performedAt`, `tzOffsetMin`, `originDevice` and both edit stamps are copied
verbatim. For a session both hold, each stamp is read on its own (NULL as 0, equal non-null stamps go to the larger content, R9) and the larger `xpEarned` wins (`takeLargerXp`, no stamp: a maximum is commutative and idempotent, and earned XP is never taken away):
a later `setsEditedAt` takes the peer's whole set of `completed_exercises` (R16) and keeps this
device's `hasNewRecords` and `records_json`, decided again on the new sets for every movement of
the session (`redecideSessions`); a later `feedbackEditedAt` takes its `feedback`. Every other column stays. After the commit, `redecideAfterChange` decides again the records of the
movements whose figures differ between the two copies, in the session and in every later local
session holding a figure between the old and the new one, as `correctLoggedSet` does; its failure
is reported (`sync.merge.records`) and does not fail the merge that committed.
`db/merge.ts` (`takeEditedSets`, `takeEditedFeedback`, `mergePeer`).
Invariant: a set corrected on A reaches B at B's next merge with A, and B's records follow; a
feedback changed later on B does not carry B's older sets over A's correction.
Invariant: two different corrections of one session stamped in the same second converge on the larger sets text (R9).

**R15. Only the edits that stamp the session propagate.** `correctLoggedSet` (`setsEditedAt`,
written before the value, in one transaction) and `updateSessionFeedback` (`feedbackEditedAt`) do. `addBonusXpToSession` and `markSessionWithNewRecords` run inside the
save, before any snapshot can carry the session, and do not; neither merge nor fingerprint see a
later change to them in R14's stamps, but the larger XP wins (R14) and the fourth fingerprint segment moves (R10).
Invariant: after convergence two devices hold the same `xpEarned` for one uuid, the larger.

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

**R18. Admin exercises are mapped by `enName`, Admin quests and Admin adventures by `enTitle`; any peer Admin row with
no local match aborts the merge.** `db/merge.ts:226-231`.
Invariant: merges between two builds with the same seed content never fail on Admin rows.

**R19. Hero exercises and quests: matched by `uuid`; the strictly newer `updatedAt` overwrites the
whole row and replaces its children (muscles, slots); unmatched rows are inserted.** Fallback to
name only when exactly one side has no uuid, and then the named side's uuid is adopted. Two rows
with distinct uuids are never unified by name. `db/merge.ts:243-270, 290-311, 313-333`.
Invariant: after convergence, for each hero uuid both devices hold the row with the greater
`updatedAt` (a tie: the larger canonical text, R9), and the children of that row.
Hero adventures (0075) follow the same rule: the newer row replaces all its steps, and the `questId` of
the row and of every step is translated through `quest_map`, a quest the other device itself lacks
becoming `0` (R32). Canonical text names a step's quest by identity, not by id.

**R20. Last writer wins per whole row, never per field.** A concurrent edit of two fields of one
quest on two devices keeps one device's version in full. `db/merge.ts:253-256`.
Invariant: merged hero row equals one of the two inputs, never a mixture.

**R21. Preferences in R7 merge by `updatedAt`, whole value.** Peer value taken iff local key is
absent, or peer `updatedAt` is strictly greater, or the dates are equal (NULL as 0) and its value is the larger text; and only if value or timestamp differs. Timestamps
copied verbatim. `ownedEquipment` is a JSON list taken whole: concurrent equipment changes lose
one side, no union. `db/merge.ts:181-188`. A deleted key never travels (an absent row loses to any
row), which is why choosing a preset avatar writes `customAvatar = ""` instead of deleting the
photo (`db/preferences.ts`).
Invariant: for each merged key, post-merge value = value of the input with the greater
updatedAt, local on a tie.

**R22. A device with no sessions, no hero exercises, no hero quests and no hero adventures ("fresh") takes every peer
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

**R25b. The crest is computed, never stored.** The animal, the second one, the stages, the boar's
quarters, the longest flame and the rings are replayed from the journal on every read
(`getCrest`, `db/crest.ts`; the rule is pure, `db/crestRules.ts`). Sessions are those of
`countsAsSession()`, in `performedAt` then `uuid` order; a session's practice is its outing
(`ride`, else `run`) or the style with the most distinct movements done (a tie going to the fixed
order strength, calisthenics, yoga, run, ride), and a workout with none has no practice and is
ignored. First animal at the 8th session with a practice (`n*100 >= 40*8`, else boar); when
several practices reach it, the most recently trained wins, then the fixed order strength,
calisthenics, yoga, run, ride. Second animal from the 9th session on (`n*100 >= 30*total` and
`n >= 20`, kept once in). A boar, from the sessions or picked by hand, never has a second animal
and so no border. The boar's two quarters are the practices in the lead among those actually done;
a hero with a single practice gets that one in both. A pick equal to the animal the sessions give
is no pick: it reads as `auto` (not manual, no diamond), however it arrived (a merge of two devices'
choices included). A pick never moves the stage (Guillaume, 11/10): the centre always wears the
stage of the sessions' animal (its practice's count, every session for a boar), picked or back on
`auto`.
`revealedAt` is the `performedAt` of the 8th session with a practice, so it follows the replay like
everything else.
Rings are whole years from the first session that counts to now (a year without a session
included). The longest flame is the flame level of the longest streak, always measured at
`DEFAULT_WEEKLY_QUOTA` (2), never at the oath's quota: raising an oath must not erase a band
already earned.
Choosing the second animal by hand swaps it with the first, which keeps in the border the stage of
its own practice.
Stages: the boar's counts every session that counts, workouts with no practice included; the
stages of the sessions' first and second animal count their own practice, and a hand-picked animal
wears the first one's.
Invariant: after a merge in both directions both devices read the same crest, ties included;
deleting or adding a session anywhere in the journal replays the whole of it.

### 1.3 Deletion

**R26. Sessions and hero content have tombstones.** `deleted_sessions(uuid PK, deletedAt)`, written by
`deleteSession` inside the delete transaction, only when the row had a uuid. `deleted_content(uuid PK,
deletedAt)` (0074), written by `deleteQuest` and `deleteUserExercise` (`writeContentTombstone`) in the
same transaction as the removal, for hero rows with a uuid, with `deletedAt = max(now, updatedAt + 1)`
(`nextEditStamp`'s rule, so a deletion is never older than the row it removed); a later delete or a
merge keeps the larger `deletedAt`. Rows are never removed by app code. `drizzle/0064_the_sessions_let_go.sql:11`, `db/completed.ts:354-361`.
Invariant: the tombstone set of a device is monotonically non-decreasing between restores.

**R27. Deleting a session removes: its sets, boss damage log (refunding the boss HP, capped at
total, felled boss revived), gps points, reopens the campaign step (unless the run was left, R116).** `db/completed.ts:348-361,
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

**R31. A tombstoned session whose campaign has moved on stays** ("locked"). The merge copied the other device's
tombstone here and `deleteSession` refused, so the session and its tombstone are both here. The comparison does not
count it as the other's news (a session that carries a local tombstone is excluded from `peerDeleted`), so it never
holds this device back from sending; `keptSessions` (`db/merge.ts`) counts them and the sync sheet says how many.
Nothing is deleted for it. `db/merge.ts`, `db/backup.ts`.
Invariant: honourTombstones may leave a tombstoned session in place and never errors; such a session never makes a peer
read as `ahead`, and every other session still reaches every device.

**R32. A deletion of a hero exercise or quest travels, and is honoured by the other device.**
A copy is dead iff its uuid has a tombstone with `deletedAt >= updatedAt` (a tie goes to the
deletion); a copy edited after the deletion is newer and lives, and the tombstone stays and keeps losing to
it. `mergeAuthored` skips a dead row (a dead quest never enters `quest_map`, so the other device's
sessions of it arrive with `questId` NULL and do not recreate it), then `honourTombstones` removes the dead
local quests and movements after the commit (sessions, then quests, then movements). A movement still
in use here (`getExerciseUsage`) is kept. A dead movement named by sets or quest slots that land here
is inserted after all (`resurrect`), so the merge never rolls back on "names rows this device lacks".
`db/merge.ts`, `db/contentTombstone.ts`, `db/quests.ts` (`removeQuest`), `db/exercises.ts` (`removeExercise`).
Invariant: a hero row deleted on A and present on B is gone on both after both merge, unless B edited it
after; a movement used on either side by sets or quest slots stays on both, with its tombstone, and a
second merge changes nothing. Used only by a saved quest choice, it stays on the device that holds the
choice (both copies read dead, `level`). Two kept copies of a dead movement are never written again.
A dead quest named by an incoming adventure step is brought back (`bringNamedQuests`) and kept while an
active adventure or an active run names it (`adventuresUsingQuest`); a step naming a quest the other
device lacks too is written `questId = 0`, so the merge never rolls back on it.

**R33. A restore of an older backup can resurrect sessions, quests and movements deleted since** (it also loses the
tombstones, session and content, that were in the newer file), and another device still holding them offers them back;
a peer that kept the tombstone removes them again at the next merge. `src/backupFiles.ts:522-544`,
`db/merge.ts:139-140, 365-374`.
Invariant: restore(old) then sync with a device that still has the tombstone converges to the
session being absent.

### 1.4 Local to a device

**R34. These are never synchronised and are kept from the current device on restore
(`DEVICE_LOCAL_PREFERENCES`):** deviceId, backupFolderUri, lastAutoBackupDay,
protectDismissedDay, protectDismissals, backupWordsPending, passwordRemindersOn,
passwordCheckStep/Due/Ignored, customAvatarUri (the pre-`customAvatar` cache path), crashLog, errorLog, eventLog, updateCheck,
updateCheckedAt, updateDismissed, updateLatest, notesSeenVersion, languageChosenOn, guidesSeen,
recentCameoLines, comebackGreetedAfter, backupEncryption, syncServer, syncWifiOnly,
reminderAskedAt, reminderStreakFrom, reminderOfferDismissed. `db/backup.ts:420-461`.
`savedSession` is dropped from a restored file and not kept. `db/backup.ts:469`.
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

**R38. Streak caches, `unlocked_achievements` and `bigFeastsShown` travel with a restore** (none
is in R34) but are not compared or merged by sync. That `bigFeastsShown` follows a restore like
`streak_*` is intended: the village spec compares it to those caches. `keepDeviceSettings`
(`db/backup.ts:476-487`) overwrites only `DEVICE_LOCAL_PREFERENCES` (`db/backup.ts:420-461`) and drops
`savedSession` (`db/backup.ts:469`); every other key, these three included, comes from the backup.
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
it was.
`hooks/useBackup.tsx:137-158, 196`, `src/backupCipher.ts:803-829`.

**R46. `keepDeviceSettings` rewrites the staged copy only:** deletes from it every R34 key and
`savedSession`, then copies this device's R34 rows in. `db/backup.ts:476-487`.
Invariant: staged R34 rows == live R34 rows; live DB untouched.

**R47. Copies before a swap:** `backupBeforeRestore` writes a dated pre-restore snapshot
(`bati-export-before-restore-v3-<day>-<HHMMSS>.<ext>`, to the second) into the remembered backup
folder when there is one; for taking a peer's version, `keepThisDeviceOnServer` too when diverged.
If either throws, the restore is abandoned, except when the remembered folder cannot be reached at all (its permission
did not travel to a new phone): that folder is forgotten and the restore goes ahead, the swap keeping its own `.bak`.
With no folder remembered nothing is written.
`src/autoBackup.ts:125-128`, `hooks/useBackup.tsx:69-72, 330-334`, `src/backupFiles.ts:151-156`.
Invariant: if a reachable folder cannot be written, the swap does not run; an unreachable one is forgotten.

**R48. `commitRestore` order:** serialize on the DB queue; close handle (best effort); delete
`-journal` and `-shm` of the live file, and its `-wal` unless the handle did not close (then the `-wal` is parked as
`.bak-wal` with the database, so committed frames are not lost); delete previous `.bak`; rename live to
`bati.v3.db.bak`; rename staged to live; on failure of the last rename move `.bak` back with
overwrite and rethrow. `src/backupFiles.ts:522-544`, `db/client.ts:19-21`.
Invariant: after a failed swap the live file equals the pre-swap file ; after a
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

**R55. Dated copy name:** `bati-<local day>-<first 8 hex of install id>-v<SCHEMA>.<db|batb>`;
untagged form when the keystore is down. The day is the hero's local day (`dayKey`). Through 2.10
the name was `bati-export-<id>-v<SCHEMA>-<local day>`, which the system picker cut to
"bati-export-c…"; pruning and the search for a sealed copy read both forms.
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

**R58. Local plaintext/sealed snapshots in the DB directory** (`bati-export-*` and
`bati-<day>-*`, never `bati-*`, which is also how the sync file starts) are swept before
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
68 entries, idx 0..67 contiguous, `when` strictly increasing (checked 2026-10-05; 76 entries after 0075).
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

## 5. Quest and adventure files

**R66. Export file** = `{kind:'bati-quest', version:1, quest{uuid, title x4, description x4,
rounds, restSeconds, roundRestSeconds, image}, slots[]}`. Official movements travel by English
name; hero movements travel whole (uuid, name, description, image, muscles, style, difficulty,
equipment, pattern, measure, secondsPerRep). No sessions, no hero name. A slot whose exercise is
not in the catalogue is silently dropped; a hero row without uuid throws; the placeholder cover
travels as null. `src/questFile.ts` (`questToFile`).
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
  and slots overwritten, `updatedAt` bumped), for a quest file; inside an adventure file the quest is
  reused as it is (R124). `asCopy` gives it a new uuidv7.
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

**R122. Adventure file** = `{kind:'bati-adventure', version:1, adventure{uuid, title, description,
cover, end}, steps[]}`. Each step is `{quest, narrative, outro}`, the quest a seed one by `enTitle`
(`{official}`) or a hero one as a quest body (`{own: {quest, slots}}`, R66). The adventure's texts are
single strings (the row repeats them in four columns). No run, victory, boss HP, weakness, resistance,
sort order, sender or date. `src/adventureFile.ts`.
Invariant: `parse(write(a))` equals `write(a)`.

**R123. Limits on read:** the file limits of R67; 2 to 8 steps (fewer is `not_an_adventure`, more is
`newer`, and the length is read before any element); title 1 to 60, description 280, narrative and outro
160, cut in UTF-16 units without leaving half a surrogate pair, past 4x refused; `version` > 1 and an
`end.kind` this build lacks give `newer`; `cover` and `end.monster` must be a bare key
(`[a-z0-9_]{1,64}`), so a URL, a picture or a path is `not_an_adventure`, and a well-formed key this build
lacks is the default cover or a route; a step has exactly one of `official` and `own`; fields are read
one by one into a fresh object, so `__proto__` and extra keys change nothing; an embedded quest is held
to R66 to R68.
Invariant: no accepted file yields a row outside the editors' limits.

**R124. Identity on import:** hero quests and movements by uuid; a hero quest already here is reused as
it is, never rewritten on this device (a quest file is what updates a quest); a seed quest by `enTitle`,
and one this build lacks is left out, with at least 2 steps kept and the indexes contiguous; a quest that
names a seed movement this build lacks is left out the same way. The adventure by uuid is updated in
place and brought back if retired, unless a run of it is under way (checked again inside the
transaction), then it is written as a copy under a fresh uuid; `asCopy` gives a fresh uuid. Everything in
one transaction; no `can()` and no quota. Invariant: `import(f); import(f)` leaves the same rows as
`import(f)` (compared by content, the step ids change); a refused or failed import leaves every count
unchanged.

**R125. Bati never writes a file it would refuse:** each hero quest goes through the reader's own
`parseQuestBody` and is written as parsed; one it refuses (a text past 4x its limit, which the quest and
movement editors do not prevent, or 0 slots) stays out and is counted in `stepsLeft`. Pictures, quest
covers included, go in under a byte budget charged `length x occurrences`, covers then movements in step
order, and the walk continues past one that does not fit; one `safeImage` would drop is never sent nor
charged and counts in `leftOut`. The written string is read back by `parseAdventureData` before it
leaves. The hero is told the photos, the steps and the pictures left out before the share sheet opens.
Invariant: for every adventure the editors can save, `parseAdventureData(JSON.parse(json))` does not
throw and `json` is at most `MAX_FILE_BYTES` bytes.

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
(own non-null and different): false; same format: later `modified` wins; no date on either side or equal dates:
larger file name wins. `src/deviceSync.ts:652-662`.
Invariant: for two devices of equal format with distinct non-zero dates or names, exactly one
`mustJoin` is true (no mutual wait, no swap). With no date on either side the larger file name decides, the same
on both devices.

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

## 9. The crest

**R106. The legendary stage is 500 sessions of the practice.** `stageOf` reads the count of
sessions of one practice that `countsAsSession()` accepts: legendary at `LEGENDARY_AT` = 500
(venerable 200, adult 40). The centre and the border each carry their own count. `db/crestRules.ts:63, 99-106`.
Invariant: 499 sessions of a practice is venerable, 500 is legendary, and a deleted session that
takes the count under 500 takes the stage back.

**R107. The rare coat is derived from the longest flame, never stored.** `hasRareCoat` is true when
`getCrest().longestFlame` is level 5 (Eternal, `ETERNAL_FLAME_DAYS` = 100 days of lit flame, pardon
included), the best streak of the whole journal. Deleting sessions can lower the best streak, and
the coat then goes with it: it is taken back, and returns if sessions that restore the flame
return (restore, sync merge). Only `crestCoat` (`auto` or `usual`) is a preference, and it cuts
the rare, not winter. `db/crest.ts:39-65`, `db/crestCoat.ts`, `constants/flame.ts:1-2`.
Invariant: the coat is a function of the journal alone; the same journal on two devices gives
the same coat.

**R108. Winter is a function of the calendar and `regionCode`.** December to February in the north;
June to August when the device region is in the southern list (AO, AR, AU, BO, BR, BW, CL, FJ, FK,
LS, MG, MW, MZ, NA, NZ, PE, PY, SZ, UY, ZA, ZM, ZW). No region, or a region not listed (Indonesia
and Tanzania included), follows the northern calendar. Local time, whole calendar months. The
ermine has no winter portrait. `db/crestCoat.ts:40-56`.
Invariant: for every region and month, `isWinter` is true in exactly three months, those of its
hemisphere's list.

**R109. The portrait is a chain: rare, then winter, then base.** For an adult or more: the
`<animal>-<stage>-rare` slug if the coat is won, `crestCoat` is `auto` and the portrait ships;
else `<animal>-<stage>-winter` if it is winter, the animal is not the ermine and the portrait ships;
else `<animal>-<stage>`. A young animal always wears its base. The rare is never replaced by another
animal or another stage, so the venerable horse (no rare portrait yet) wears winter in winter.
`portraitSlug`, `db/crestCoat.ts:62-80`.
Invariant: the slug is always one of the 57 of the catalogue, and a hero who won the rare never
sees a plainer coat than a hero who did not.

**R110. None of the crest is stored.** Animal, second animal, stage, rare coat and portrait are
read from the journal on each call (`getCrest`, `portraitOf`); what is stored is the hero's chosen
animal, `crestCoat` and `crestMotto`. The cards already shown (`coat:rare`, `legendary:<practice>`,
`age:<n>`, `anniversary:<n>`) are local keys of `bigFeastsShown`, on the phone, and are not synced.
Invariant: restoring a backup or merging a peer's sessions changes the crest by changing the
journal, and by nothing else.

**R111. None of the village's years is stored.** The stones on the ramparts, the season banners
and the Ages are replayed from the journal on each call (`getVillageYears`, rules in
`db/villageYearsRules.ts`); there is no column, no preference and no migration behind them. A
session belongs to the level reached after it, counting the XP of every session before it, the
ones `countsAsSession()` refuses included; only the sessions it accepts are stones, banners or
rungs. The sets of every session are read, a short outing's included, so that a short outing's
value is a standing best (as `previousBest` reads it), but it breaks nothing and first-sees
nothing. A GPS outing (`NON_REP_STYLE`) is never read: its seconds are no record. Every level from 21 up to the highest reached has a stone; a level no session ended on (a
jump over it) takes the stone of the session that crossed it, with that session's fact.
Invariant: the same journal gives the same stones, banners and Ages on any device, whatever order
the sessions were merged in (`db-peer-merge`), and deleting a session takes back what it earned.
A banner stays neutral while there is no crest (fewer than eight practised sessions), whatever its sessions did.

**R113. A movement's progress has one source.** The per-session fold is `sessionBestsSql`
(`db/progress.ts`), and its filters cut sets before the fold, so a reader that cuts on a set's own
time keeps its meaning. "Target reached" is `setMetSql`, `MIN` over a session, neutral sets filtered
by the reader. The record bar is `previousBest` (it decides `records_json` and the session page
shows the same number). `toBeat` is the wall's number, `ladderPosition` is where the hero stands.
Nothing is stored and there is no SQL view (a backup holding one is refused): device sync carries
`completed_exercises` and every device derives the same figures. Per-movement aggregates
(`getMovementRecords`, the oath) stay direct: the session fold is 5-7x slower for them.
Invariant: the same journal gives the same bests, records and rungs on any device, whatever the
merge order (`db-peer-merge`).

**R112. A season is a fixed local window, and the village year counts four seasons from the first session's.**
December to February, March to May, June to August, September to November, cut at local midnight
(`new Date(y, m, 1)`, never UTC); the hemisphere changes the name and nothing else. A season has a
banner once it is over and a session that counts fell in it; the one in progress has none.
Ties never depend on read order: the best record is the biggest relative gain (integer cross
product, no float), then the most recent, then the lower movement id.
The village year is `floor(seasons since the first session's season / 4) + 1`, so a row holds at
most four banners. Invariant: the hemisphere never moves a banner, it only renames it. A timezone
change can move one session to the next or previous season only if it sits near midnight on a
season border; daylight saving is harmless, since the season is read with `getMonth`.

**R114. Entitlement is not data** (`src/plus/source.ts`, `src/plus/access.ts`). Bati+ is read from the
store account, never written to the database, never sealed in a file, never merged. `can()` refuses
creating only: a 6th hero exercise, a 4th counted hero quest (an outing quest does not count), starting
a Bati+ adventure the hero never started. Merge, restore, import of a session and everything that
edits, retires, deletes or plays never ask it. Invariants: after a merge the hero rows are the union as
before, whatever the source; `lockedAdventures()` never contains an adventure with a row in
`adventure_runs`; a locked adventure page starts no run from any of its controls. Source `none` (every
build without a billing module) answers `true` before reading the database.
`__tests__/plus-access.test.ts`, `__tests__/db-peer-merge.test.ts`.

**R116. Deleting a session of a left run never revives the run.** It is "locked" only when a newer
run of that adventure is finished; otherwise "deleted", with the boss refund, and the step's
`completedSessionId` set to NULL (status kept). Invariant: no write ever sets a `left` run back to
`active` or `finished`. `__tests__/db-delete-session.test.ts`.

**R117. A left run counts nowhere.** Every counter reads `finished`, the offer reads `active`, and a
step completed against a run that is not active (left, or a stale step of a finished one) is
ordinary training: no step, no victory. The boss fight is per adventure and keeps its HP; the rematch
reset only follows a finished run. `__tests__/db-adventures-campaign.test.ts`.

**R118. Deeds count the game's adventures only.** `DEED_ADVENTURE` (SQL) and `countsAsDeed` (JS) are
`author <> 'hero'`, one rule in two forms, both reading the exception so a fight restored from a build
before 0075 (no `author`) is the game's. Added to `listFinishedRunSummaries` (the Hall, the Arena, the
banners), `getBossBanners`, `getLegacyDeedLevels`, `getBossKills` (bosses page, lifetime, stats,
Chronicle) and `getStandingBosses`; no Triumph XP on a hero adventure (`payTriumphBonus`), and the
victory says why once. `getFinishedRunCountsByAdventure` (the card's "finie N fois") and
`getKillReport` stay unfiltered on purpose. Invariant: a hero adventure finished any number of times
changes no building level, no boss count and no XP beyond its sessions' own.
`__tests__/db-hero-adventures.test.ts`, `__tests__/store-session.test.ts`.

**R119. A hero adventure is never deleted; retiring is an edit.** `isActive = 0`, nothing removed, no
tombstone, and editing a retired adventure never sets it back to 1. It survives the deletion of a quest
it names only because `foreign_keys` is OFF on a device (the schema says `ON DELETE CASCADE`): the tests
turn the pragma OFF to prove it, and `removeQuest` carries the ceiling. `adventuresUsingQuest` counts
active adventures and active runs only. With a run under way the steps and the end are frozen
(`updateHeroAdventure` ignores them and writes the texts by position). Invariant: after any quest
deletion, every hero adventure, its steps, runs and fight are still there.
`__tests__/db-hero-adventures.test.ts`, `__tests__/db-peer-merge-adventures.test.ts`.

**R120. A run never starts on a step whose quest is gone, and the next step is the next real index.**
`startAdventureRun` refuses (`missingStepQuests`) unless a run is already active; `nextRunStep` reads
`stepIndex > current` in `completeAdventureRunStep` and `reopenCampaignStep`, so a gap never ends a run
early. Invariant: a run finishes only after its last step. `__tests__/db-hero-adventures.test.ts`.

**R121. The boss's weakness and resistance are read from the adventure.** The three `BossFight`
constructors read them from `adventures`, so changing the monster between two playthroughs gives the
next hit the new monster's. The `boss_fights` columns are written at creation and read by nothing.
Invariant: the fight's stats equal its adventure's at the next hit. `__tests__/db-hero-adventures.test.ts`.

**R115. Home's disclosure is read from the journal; the offered step is local.** `disclosure()`
is a pure function of the journal: two devices with the same sessions show the same Home, whatever
order they were merged in. The notice a phone shows (`notesSeenVersion`, `bigFeastsShown`) is
per device and never merged. The first offered session counts as step 1 of the first adventure: that
step is completed with `completedSessionId` NULL, matched by the seeded `enTitle`, and never blocks a
session deletion. It changes no XP and no record. Invariant: deleting that session leaves the step done,
and no migration, table or merged preference sits behind it.
