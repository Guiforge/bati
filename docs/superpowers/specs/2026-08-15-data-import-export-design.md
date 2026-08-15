---
title: Backup & Restore — design
type: technical
status: active
updated: 2026-08-15
related: [../../planning/roadmap.md, ../../legal/privacy.md, ../../meta/wiki-protocol.md]
sources: [db/backup.ts, db/client.ts, db/migrate.ts, db/schemaVersion.ts, src/backupFiles.ts, hooks/useBackup.ts, stores/restore.ts, components/DatabaseProvider.tsx, app/settings.tsx, app/onboarding/presentation.tsx, __tests__/db-backup.test.ts]
---

# Backup & Restore — design

Implements roadmap §4.1, the only P0 in §4. There were testers with a real database and no way to
get it off the phone: no account, no cloud, no backup. A lost phone was a lost year, which made
the app's own claim — history is the permanent source of truth — one broken screen away from
being false.

This document describes what shipped. Where the built system differs from the design that was
approved, the difference is called out, because each one came from something a probe or the test
suite proved wrong.

## The decision that shapes everything else

**The artefact is the SQLite file itself, not a serialisation of it.**

The database is a single file (`bati.v3.db`), and `__drizzle_migrations` already records which
migrations produced it. So the migration chain *is* the format version: no schema to map, no
`version` field to invent, and therefore no `version` field to forget to bump. Restoring an older
backup is a nominal case, because [`db/migrate.ts`](../../../db/migrate.ts) catches it up on the
next launch.

A JSON export was weighed and deferred. It is a nicer artefact for a human, but it costs
enumerating ~14 user tables, ordering foreign keys on insert, and — the real objection — history
rows reference exercise and quest ids that come from seeded content. If that content shifts
between versions, a JSON import can land on references that no longer resolve. A `.db` file
cannot have that problem by construction.

## Non-goals

- **No encryption.** A `.db` on someone's cloud drive is in the clear. This is stated in
  [`docs/legal/privacy.md`](../../legal/privacy.md) and on the in-app privacy screen instead of
  being solved with a passphrase nobody will still have in a year.
- **No merge.** Restore replaces; it does not reconcile two histories. That is §4.18's problem.
- **No automatic or scheduled backup.** Both actions are user-initiated.
- **No network.** `Sharing.shareAsync` hands off to the OS and the app opens no socket.

## How a backup identifies itself

Two SQLite header fields, written by `stampDatabaseIdentity()` and **verified to survive
`VACUUM INTO`**, which is what makes them usable on the way back in:

| Field | Value | Answers |
| --- | --- | --- |
| `application_id` | `0x42415449` ("BATI") | is this file ours? |
| `user_version` | `SCHEMA_VERSION` | is it from a schema generation we can adopt? |

> **Changed from the approved design.** That design proposed sniffing for table names, and
> resolved `SCHEMA_VERSION` as an open question. Both are settled by these two pragmas — and the
> table-sniffing would have been *wrong*: a zero-byte file is a valid SQLite database that
> attaches cleanly and whose `integrity_check` returns "ok". `page_count` and `application_id`
> are what separate it from a real backup.

They are stamped on every launch from `DatabaseProvider`, not from a SQL migration, so
`SCHEMA_VERSION` keeps one source — [`db/schemaVersion.ts`](../../../db/schemaVersion.ts), split
out of `db/client.ts` precisely so that code which must not load `expo-sqlite` can still read it.

## Validation

Everything runs through `ATTACH DATABASE` on the connection that is already open. That is the
single decision this feature turns on: no second database handle, no per-platform file opener, no
injected adapter — and therefore `db/backup.ts` is plain SQL that the Node test suite exercises
for real, through the existing `clientMock` seam.

```ts
type BackupCheck = { ok: true } | { ok: false; reason: BackupRejection };
type BackupRejection = "notSqlite" | "corrupt" | "notBati" | "incompatibleVersion" | "unreadable";
```

Order matters, cheapest first, and each step is pinned by a test:

1. `page_count` — **an empty or vanished candidate** → `unreadable`
2. `integrity_check` — damaged file → `corrupt`
3. `application_id` — not ours → `notBati`
4. `user_version` — another schema generation → `incompatibleVersion`
5. newest `created_at` in `__drizzle_migrations` must be a timestamp this build ships →
   `incompatibleVersion`

Step 1 exists because `ATTACH` *creates* the file when the path is free: a staged copy that
disappeared attaches as a brand-new empty database, and every later check would then describe a
file SQLite invented a moment ago — reporting "a database, but not one Bati wrote" for a file
that is not there. No real backup has zero pages; `VACUUM INTO` always writes at least the schema.

Step 5 checks *membership*, not "less than the maximum". A divergent history whose timestamps
merely happen to be lower is rejected too. It deliberately stops there rather than comparing
hashes: the runner that will process the file afterwards works by timestamp
([`db/migrate.ts`](../../../db/migrate.ts)), and validation that is stricter than the thing it
feeds would reject files the runner handles correctly.

**Errors are classified in one place**, not per step, because SQLite opens an attached file
lazily: a text file is rejected at `ATTACH` sometimes and only at the first page read other
times. The full test suite caught this — the four rejection tests passed in isolation and failed
when run with everything else. Classifying once makes the verdict independent of that timing.

## Import sequence

```text
pick        → File.pickFileAsync                    nothing touched
stage       → copy next to the database             a new file, our name
validate    → ATTACH + 5 checks                     on failure: delete staged, app untouched
──────────── store flips to "restoring"; React unmounts the app ────────────
commit      → close handle → drop sidecars → rename live db to .bak → move staged in
```

Nothing destructive happens before validation passes. Then:

> **Changed twice, and back to the approved design.** The first implementation replaced the
> rename-then-move with a `VACUUM INTO` safety copy plus `move(…, { overwrite: true })`, on the
> reasoning that a copy leaves the original at its path and so opens no failure window. The
> reasoning was wrong about what `overwrite` does: expo-file-system's
> `CopyMoveStrategy.LocalFile.prepareAsDestination` calls `deleteRecursively()` on the destination
> *before* it attempts the rename. The live database is therefore already gone when the rename is
> tried, and if it and its NIO fallback both fail there is nothing left — while the blocking
> screen says nothing was replaced.
>
> So the rename is back, and it is what closes the window rather than what opens it: the old file
> is moved aside to `.bak` under a free name, the staged file is moved into the now-free real
> name, and a failure there moves `.bak` straight back. The window the original design worried
> about is real but recoverable in-process, which is why it still needs no phase markers on disk.
> The rename also *is* the safety copy, so `VACUUM INTO` is left with one caller (export) and the
> `.bak` stops being a file no code ever reads.

**Sidecars are part of the database.** `expo-sqlite`'s own `deleteDatabase` removes the `.db` and
nothing else (verified in `SQLiteModule.kt`), so `-journal`/`-wal`/`-shm` are dropped explicitly
before the swap. A stale journal beside a replaced database gets rolled back into it on the next
launch, which corrupts it. (The app runs in SQLite's default DELETE journal mode — `expo-sqlite`
never sets `journal_mode`, contrary to what the first draft of this document asserted.)

**The `.bak` is never deleted automatically**; the next restore overwrites it. It costs one
database's worth of disk, which is the right price for the file standing between a mis-tap and a
lost year. No UI restores it in this scope.

## Why a restart, and how the ordering is guaranteed

The SQLite handle is opened at module load, and replacing a file under a live handle is undefined
behaviour, so the handle closes first — after which every query throws. Writing a
`reopenDatabase()` would mean reassigning the singleton, remounting the tree, and purging Zustand
stores holding state derived from the old database, with `getRawDb()` still handed to the crash
logger. A stale native handle retained anywhere is a native crash. Five seconds of friction on a
once-a-year operation is the cheaper trade.

That trade is also why **`failed` is a terminal phase with no way back to `idle`**. The handle is
closed by then whether the swap succeeded or rolled back, so returning to the app would render a
tree whose every query throws. The copy for that phase asks for a relaunch rather than offering a
retry the code cannot honour.

The ordering problem — a component querying the database between "start restoring" and "handle
closed" — is solved structurally rather than with a maintenance flag. `stores/restore.ts` holds
the phase; `DatabaseProvider` returns a full-screen notice instead of `children` as soon as it
leaves `idle`, and **the commit runs in that component's effect**. React commits the unmount
before the effect fires, so by the time the file is touched there is nothing left that could
query it. Ordering by construction, not by timing.

## Entry points

```text
hooks/useBackup.ts   → runExport(), runImport(), busy
   ├── app/settings.tsx                 destructive-confirm Alert, then the hook
   └── app/onboarding/presentation.tsx  the hook directly
```

Onboarding is where restore matters most — a new phone, a fresh install — and it costs no extra
code: `hasFinishedOnboarding` lives in `user_preferences`, *inside the database*, so a restored
backup carries it and the routing guard in `app/_layout.tsx` sends the user straight home on the
next launch. No flag to reconcile, no special case.

It sits at the *start* of onboarding, as a quiet secondary link under the primary CTA. Offering it
later would mean asking for a village name that a restore overwrites ten seconds afterwards. There
is no confirmation dialog on that path because no user history exists yet to lose — less code, not
an exception: validation, the `.bak` and the restart screen are all in the shared hook.

## Dependencies

Two, both first-party Expo, both FOSS, neither pulling Play Services:

- `expo-file-system@~57` — staging copy, the swap, **and the picker**
- `expo-sharing@~57` — hands the snapshot to the OS share sheet

> **Changed from the approved design.** `expo-document-picker` was installed and then removed:
> `File.pickFileAsync({ mimeTypes })` in `expo-file-system` already returns
> `{ result, canceled }`, so the third native module had nothing left to do.

`expo-file-system` declares `INTERNET` and two storage permissions in its manifest. The repo's
checked-in `AndroidManifest.xml` already strips `INTERNET` with `tools:node="remove"` and bounds
the storage pair to `maxSdkVersion=32`, so **the built app gains no permission** — which is what
keeps `plugins/withAndroidTrimPermissions.js` and the Exodus report honest.

These are native modules: a fresh dev build is required (`npx expo run:android`).

## Module boundary

| File | Contains | Tested |
| --- | --- | --- |
| `db/backup.ts` | identity, snapshot, validation — SQL only | 100% lines/functions |
| `src/backupFiles.ts` | pick, share, stage, swap — the native edge | by reading |
| `hooks/useBackup.ts` | orchestration + user-facing errors | ordering, re-entry, errors |
| `stores/restore.ts` | the phase the provider watches | — |

`Sharing` and the picker never appear in `db/backup.ts`, which is why the native boundary needs no
mocking: the logic does not cross it.

## Testing

`__tests__/db-backup.test.ts`, 20 cases on better-sqlite3 — which supports `VACUUM INTO` and
`ATTACH`, so the real export and validation paths run rather than stand-ins.

Every rejection was probed against a real damaged file before being written down, and three
results changed the design:

- **an empty file passes `integrity_check`** — hence the identity checks
- **`ATTACH` creates the file it cannot find**, so "the candidate vanished" and "the candidate was
  empty" are the same observation — hence `page_count` ahead of both. The original test only
  covered a missing *parent directory*, which fails at the OS layer and so hid this entirely.
- **zeroing bytes in the header's unused area is not "corrupt" to SQLite** — damage has to land on
  a b-tree page, so the corruption case writes over page 4. A naive corruption test would have
  been green while asserting nothing.

The fixture was also wrong and had to be fixed rather than worked around:
`__tests__/helpers/testDb.ts` applied the `.sql` files but never created `__drizzle_migrations`,
which the app's runner always does — so the test database differed from a real one in exactly the
place validation reads.

## Risk accepted

Import replays the migration runner against a foreign database, and `db/migrate.ts` calls itself
"the riskiest code in the app and the least covered". This feature is the first thing to exercise
that path deliberately.

Recovery from an interrupted process is bounded rather than solved: a failed swap rolls back
in-process and the `.bak` survives it, but there is no startup reconciliation for a process killed
*during* those two renames, and no in-app undo afterwards. Both are cheap to add on top of what is
here if a real report ever needs them.

**One lock covers the whole database.** `ATTACH` and `VACUUM INTO` are illegal inside a
transaction, and an async transaction on a single JS thread is not a critical section — the export
button's handler can run between two of its statements. `serializeOnDatabase()` in `db/client.ts`
queues transactions and backup operations behind one another, which is coarser than it needs to be
and cheap enough to stay that way until a write is slow enough to be felt.
