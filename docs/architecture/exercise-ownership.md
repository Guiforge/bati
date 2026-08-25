---
title: Who owns an exercise
type: technical
status: active
updated: 2026-08-25
related: [database-api.md, ../planning/roadmap.md, ../../AGENTS.md]
---

# Who owns an exercise

`exercises` holds two populations. `creator` tells them apart: `Admin` is seed content, written by
migrations and updated by them; `hero` is what someone wrote in the app. Every rule on this page
exists because those two share one table.

## The name is the contested namespace, not the id

`exercises.id` is `AUTOINCREMENT` — seeding order. It was never an identity anyone shares: nothing
outside the database references it, and a backup is a `VACUUM INTO` of the whole file
([`db/backup.ts`](../../db/backup.ts)), so ids travel together or not at all. There is no row-level
merge that could get one wrong.

Seed content addresses movements **by `enName`**, and says so: `0032`'s header, `PATH_NAMES` in
[`db/paths.ts`](../../db/paths.ts), `WARMUP_MOVEMENTS` in
[`constants/warmup.ts`](../../constants/warmup.ts). So the name is what can collide.

## Why the unique index is partial

Before `0035` the index was global:

```sql
CREATE UNIQUE INDEX exercises_en_name_unique ON exercises (enName);
```

Seven migrations run bare `INSERT INTO exercises`, and [`db/migrate.ts`](../../db/migrate.ts) runs
the whole journal inside one `BEGIN IMMEDIATE`. So a hero row named *Dead Bug* plus a later content
migration seeding the official *Dead Bug* is:

```
UNIQUE constraint failed: exercises.enName
  -> ROLLBACK
  -> ensureMigrations() throws
  -> the app does not open, and fails identically on every launch
```

No in-app recovery exists for that. `0035` replaces it with one index per population, so the two
namespaces cannot reach each other:

```sql
CREATE UNIQUE INDEX exercises_admin_name_unique ON exercises (enName) WHERE creator = 'Admin';
CREATE UNIQUE INDEX exercises_hero_name_unique  ON exercises (enName) WHERE creator <> 'Admin';
```

A hero may take a name the seed already owns, and a future seed may take a name a hero already
owns. Neither can break the other, and uniqueness still holds *inside* each population — a hero
cannot own two *Dead Bug*s, and neither can the catalogue.

## The one rule every future migration obeys

**Every `UPDATE` or `DELETE` on `exercises` in a migration scopes itself to `creator`.**

`INSERT` needs no guard — the column defaults to `Admin`. `UPDATE` does: `0009` rewrites art
`WHERE enName`, `0023`, `0030` and `0031` rewrite names the same way, and `0018` and `0023` delete
by name. From `0035` on, that predicate can find a row the hero wrote.

[`__tests__/seed-migration-guard.test.ts`](../../__tests__/seed-migration-guard.test.ts) enforces
this by reading `drizzle/*.sql`. Everything below index `35` is exempt, and not on trust: the whole
journal runs before the app is usable, so no hero row can exist while any of them executes. The
exemption is an index cutoff rather than a list of filenames because one cutoff carries one
justification — a list has to be re-justified per entry, and the entry nobody re-justifies is the
one added to silence a failure.

## Deletion is retirement

[`db/client.ts`](../../db/client.ts) issues no `PRAGMA foreign_keys`, so SQLite leaves them **off**
and every `ON DELETE CASCADE` in the schema is decoration. Nine queries `innerJoin` this table:
`db/completed.ts` ×2, `db/muscleBalance.ts` ×3, `db/personalRecords.ts`, `db/village.ts`,
`db/quests.ts` ×2.

Removing a row therefore removes past volume, can drop a village building a level, can erase a
personal record, and can empty a quest — at which point `getQuestById` returns `null` and the quest
reads as "not found". None of it warns.

So `retiredAt` is the normal path, and a hard delete is only allowed for a row nothing has ever
used. `getExerciseUsage(id)` counts `completed_exercises` and `quest_exercises`, and
`deleteUserExercise` refuses on any non-zero. The count is the enforcement, because the constraint
is not. The exercise detail screen shows exactly one of the two buttons, chosen by that same count,
and falls back to **Retire** when it cannot be read.

Note that [`__tests__/helpers/testDb.ts`](../../__tests__/helpers/testDb.ts) *does* turn foreign
keys on. That is deliberately stricter than the device — it catches a bad reference a phone would
swallow — but it means a green test can never be the evidence that a delete is safe.

## Where hiding happens

`listExercises()` **keeps returning retired rows**. [`db/adventures.ts`](../../db/adventures.ts),
[`db/questConfig.ts`](../../db/questConfig.ts) and the quest screen all resolve a quest's exercise
ids out of that one cached list, and a quest holding a retired movement has to keep working.

Hiding belongs at the moment of choosing, and lives once, in `pickableExercises(all)`. Three
surfaces call it: the catalogue (through `filterExercises`, which also has the `retired` facet that
brings them back), the quest editor's picker sheet, and the oath screen.

The cache is invalidated by every writer in [`db/exercises.ts`](../../db/exercises.ts) via
`invalidateExercisesCache()` — its docblock used to say this table was static seed content with no
in-app editing, which stopped being true here. The catalogue screen reloads on focus for the same
reason.

## A hero's picture lives in the row

`imagePath` holds one of three things: a bundled asset path, a bundled illustration key, or a
`data:image/jpeg;base64,…` photo. `getExerciseAsset` / `getExerciseThumb`
([`constants/assetMap.ts`](../../constants/assetMap.ts)) resolve all three, so no screen needs its
own branch — only the detail screen had one, and every other surface showed the placeholder.

The photo is in the row rather than in a file because an export is a `VACUUM INTO` of the database
alone: a `file://` path would survive on this phone and arrive broken on the next one, and
`expo-image-picker`'s own URI lives in a cache directory Android may clear. It is resized to 512 px
before encoding — see the `ponytail:` note in [`src/exercisePhoto.ts`](../../src/exercisePhoto.ts)
for the ceiling and the upgrade path.

## What a hero movement is allowed not to have

`pattern` is nullable and always was — its own schema comment reads *"Null only for user-authored
content"*. `muscles` may be empty. Neither is a bug, and neither is silently absorbed:
`getMuscleBalance()` returns `unclassifiedResults`, and the journal's balance card prints how many
results it is not counting rather than reporting a smaller total and looking confident about it.
The editor's fold says the same thing from the other side, before the hero closes it.

The two content invariants that used to speak for the whole table — *every exercise declares a
pattern*, *every exercise is used by at least one quest* — are scoped to `creator = 'Admin'`. They
are about the catalogue the app ships, not about what someone writes in it.
