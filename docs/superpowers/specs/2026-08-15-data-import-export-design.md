---
title: Backup & Restore — design
type: technical
status: draft
updated: 2026-08-15
related: [../../planning/roadmap.md, ../../architecture/performance.md, ../../meta/wiki-protocol.md]
sources: [db/client.ts, db/migrate.ts, db/preferences.ts, components/DatabaseProvider.tsx, app/_layout.tsx, app/settings.tsx, app/onboarding/presentation.tsx]
---

# Backup & Restore — design

Implements roadmap §4.1, the only P0 in §4. There are testers with a real database and no way
to get it off the phone: no account, no cloud, no backup. A lost phone is a lost year, which
makes the app's own claim — history is the permanent source of truth — one broken screen away
from being false.

## The decision that shapes everything else

**The artefact is the SQLite file itself, not a serialisation of it.**

The roadmap already argued this and the code confirms it. The database is a single file
(`bati.v3.db`, [`db/client.ts`](../../../db/client.ts)), and `__drizzle_migrations` already
records which migrations produced it. So the migration chain *is* the format version: there is
no schema to map, no `version` field to invent, and therefore no `version` field to forget to
bump. Restoring an older backup is a nominal case, because
[`db/migrate.ts`](../../../db/migrate.ts) catches it up on the next launch.

A JSON export was considered and rejected for now. It is a nicer artefact for a human, but it
costs enumerating ~14 user tables, ordering foreign keys on insert, and — the real objection —
history rows reference exercise and quest ids that come from seeded content. If that content
shifts between versions, a JSON import can land on references that no longer resolve. The `.db`
file cannot have that problem by construction. Revisit only when someone asks to read their data
outside the app.

## Non-goals

- **No encryption.** A `.db` dropped on Drive is in the clear. Adding a passphrase costs a heavy
  crypto dependency to protect a secret nobody will still have in a year. This belongs in the
  privacy policy, not in the code.
- **No merge.** Restore replaces; it does not reconcile two histories. Merging rows keyed by
  autoincrement ids across two devices is §4.18's problem, not this one.
- **No automatic or scheduled backup.** The user exports when they choose to.
- **No network.** This is the first feature that *could* leave the device and it does not:
  `Sharing.shareAsync` hands off to the OS and the app opens no socket.

## Format

| Concern | Resolution |
| --- | --- |
| Consistent snapshot | `VACUUM INTO '<path>'` — one atomic SQL statement, compacted output. |
| Schema version | `__drizzle_migrations`, already present. |
| Encoding | Binary. Only the filename is text: ASCII, dated — `bati-v3-2026-08-15.db`. |
| Readability | SQLite is a standard format any tool opens. |

`VACUUM INTO` rather than a file copy is not a detail. The database is opened with
`enableChangeListener: true` and runs in WAL mode; copying the file byte-for-byte under a live
handle can miss writes that have not been checkpointed. `VACUUM INTO` produces a consistent,
self-contained snapshot with no checkpoint dance, and `better-sqlite3` supports it too — so the
Node test suite exercises the real export path rather than a stand-in.

The filename carries `SCHEMA_VERSION` for the human reading their file manager. Validation never
trusts it; it reads the file's contents.

## Validation

Cheapest check first, stop at the first failure. All four run against the temporary copy, never
the picker's own URI — checks 2 through 4 need to open the file, and opening a document-provider
URI directly is not portable. `validateBackup` returns a discriminated union and never throws —
the caller translates a `reason`, it does not compose a message.

```ts
type BackupCheck =
  | { ok: true; migratedAt: number }
  | { ok: false; reason: "notSqlite" | "corrupt" | "notBati" | "tooNew" };
```

1. **`notSqlite`** — the first 16 bytes are not `SQLite format 3\0`. Catches "the user picked a
   photo".
2. **`corrupt`** — `PRAGMA integrity_check` fails. Catches a truncated download or a bad copy.
3. **`notBati`** — Bati's tables (`completed_quest`, `__drizzle_migrations`) are absent. It is a
   real SQLite database, just somebody else's.
4. **`tooNew`** — the last applied migration postdates every migration this build knows about.
   The backup came from a newer version of the app; refuse rather than guess.

A backup taken under a different `SCHEMA_VERSION` is refused, consistent with the doctrine
already written at [`db/client.ts:5`](../../../db/client.ts) — a version bump means the old file
is deliberately orphaned, so silently adopting it would contradict the one rule that mechanism
has.

## Import sequence

Ordering is the substance of this section. Nothing destructive happens until validation has
passed.

```text
picker → copy to  bati-import-tmp.db        nothing destructive yet
       → open + validate                    on failure: delete tmp, app untouched
       → close the main handle
       → rename  bati.v3.db → bati.v3.db.bak   the safety net
       → rename  bati-import-tmp.db → bati.v3.db
       → blocking restart screen
```

A rejected file leaves the app perfectly usable — not even a restart. The `.bak` is what makes
the destructive half reversible: a user who restores the wrong file has not lost the right one.

**The `.bak` is never deleted automatically** — the next import overwrites it, and that is its
whole lifecycle. It costs one database's worth of disk permanently, which is the correct price
for the one file standing between a mis-tap and a lost year. No UI restores it in this scope:
recovery means pulling it off the device. Worth a `ponytail:` comment at the rename, with
"expose a one-tap undo" as the upgrade if anyone ever needs it.

**Why a restart.** The SQLite handle is opened at module load
([`db/client.ts`](../../../db/client.ts)) and replacing a file under a live handle is undefined
behaviour, so the handle must close first — after which every query throws. A `reopenDatabase()`
is name-dropped in a comment at `db/client.ts:65` but does not exist, and writing it means
reassigning the singleton, remounting the tree, and purging Zustand stores holding state derived
from the old database, with `getRawDb()` still handed out to the crash logger. A stale native
handle retained anywhere is a native crash, which is the least pleasant class of bug to diagnose
on a device. Five seconds of friction on an operation performed once a year is the cheaper trade.

**The blocking screen lives in `DatabaseProvider`**, not in the screen that triggered the import.
That component already renders a full-screen "the database is unusable" state for migration
failure ([`components/DatabaseProvider.tsx`](../../../components/DatabaseProvider.tsx)); this is
the same need, and it wraps the whole tree, so a back gesture cannot escape it. A modal mounted
inside Settings can.

## Entry points

Two, sharing one writer.

```text
hooks/useImportBackup.ts   → pickAndImport(), busy
   ├── app/settings.tsx                 destructive-confirm Alert, then the hook
   └── app/onboarding/presentation.tsx  the hook directly
```

**Settings** gets a new section with two rows (`SettingRow` already exists in that file). Export
ends in a `Toast`, already imported there.

**Onboarding** is where restore matters most — a new phone, a fresh install — and it costs no
extra code. `hasFinishedOnboarding` is stored *in the database*
([`db/preferences.ts:63`](../../../db/preferences.ts), table `user_preferences`), so a restored
backup carries `hasFinishedOnboarding=true` and the routing guard at
[`app/_layout.tsx:110`](../../../app/_layout.tsx) sends the user straight home on the next
launch. No flag to reconcile, no special case.

The offer belongs on `presentation.tsx`, as a quiet secondary link under the primary CTA — the
familiar "I already have an account" placement. It goes at the *start* of onboarding: offering it
at the end would mean making the user pick a village name that is overwritten ten seconds later.

There is no confirmation dialog on the onboarding path because there is nothing to overwrite.
That is less code, not an exception: validation, the `.bak`, and the restart screen all live in
the hook and are identical on both paths.

## Dependencies

Three, all first-party Expo, all FOSS, none pulling Play Services — which matters for the F-Droid
build.

- `expo-file-system@~57` — copy the picked file, rename over the database
- `expo-sharing@~57` — hand the snapshot to the OS share sheet
- `expo-document-picker@~57` — pick the backup to restore

These are native modules, so **a fresh dev build is required** (`npx expo run:android`); a JS
reload will not pick them up.

## Module boundary

`db/backup.ts` holds the logic and imports nothing from Expo except `expo-sqlite`, which keeps it
runnable in the Node test suite:

```ts
exportDatabase(): Promise<string>            // VACUUM INTO → snapshot path
validateBackup(path): Promise<BackupCheck>   // never throws
importDatabase(path): Promise<void>          // validate → close → .bak → replace
```

`Sharing` and `DocumentPicker` stay in the hook and the screens. The native boundary needs no
mocking because the logic never crosses it.

## Testing

`__tests__/db-backup.test.ts`, on `better-sqlite3` via the existing
[`__tests__/helpers/testDb.ts`](../../../__tests__/helpers/testDb.ts):

- export produces a file that opens and carries the same row counts
- a valid backup validates `ok: true`
- a truncated file, and a plain text file → `notSqlite`
- bytes overwritten mid-file → `corrupt`
- a valid SQLite database that is not Bati's → `notBati`
- a migration timestamp ahead of this build → `tooNew`
- a successful import leaves the `.bak` in place
- a restored backup yields `hasFinishedOnboarding = "true"` — the guarantee that a new phone does
  not walk back through onboarding
- a rejected import leaves the original database byte-identical

Per AGENTS.md: these assert state, not navigation. The onboarding test reads the restored
preference rather than checking that a screen appeared.

## Risk accepted

Import replays the migration runner against a foreign database, and
[`db/migrate.ts:63`](../../../db/migrate.ts) calls itself "the riskiest code in the app and the
least covered". This feature is the first thing to exercise that path deliberately, which is both
the risk and the reason it finally gets tested.

## Follow-ups

- Roadmap §4.1 marked shipped; §4.18 (multi-device sync) and §1 (desktop) both list this as their
  prerequisite.
- `docs/legal/` privacy policy: state that the export is unencrypted and that the app does not
  transmit it.
