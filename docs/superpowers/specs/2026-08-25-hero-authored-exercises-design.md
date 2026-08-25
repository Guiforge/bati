---
title: Hero-authored exercises, and instructions you can read with the clock stopped
type: technical
status: draft
updated: 2026-08-25
related: [../../planning/roadmap.md, ../../architecture/database-api.md, ../../../AGENTS.md]
---

# Hero-authored exercises, and instructions you can read with the clock stopped

> Design spec. Two features from one user message; they ship apart and are written together
> because the second one is what makes the first one usable.

## Where this came from

A user wrote in. Two asks, in their words:

1. *"I would love to have the option to input my own exercises… I would use it to make a quest
   based on Chigong moves. There are some punches, archer squats, and things like that which I
   think lend themselves well to the theme."*
2. *"I didn't know what the dead bug exercise was and the timer kept counting down while I was
   trying to figure it out. Or maybe make it so the pause button allows you to still see the
   instructions for the exercise?"*

Walking, running and cycling were also asked for. **Out of scope here** — distance work needs a
target unit the schema does not have (`quest_target_types` is `reps | time`) and a GPS story the
guardrails refuse. This spec is about *authoring movements*, which is the part the rest of the
request rests on anyway.

## What the audit found

Five things, in the order they matter.

### 1. There is already a migration bomb, and it is the real conflict

[`db/schema.ts`](../../../db/schema.ts) puts a **global** unique index on `enName`:

```ts
enNameUnique: uniqueIndex("exercises_en_name_unique").on(table.enName),
```

Seven migrations run bare `INSERT INTO exercises` — no `OR IGNORE` — and
[`db/migrate.ts`](../../../db/migrate.ts) runs the whole journal inside one `BEGIN IMMEDIATE`.

So: a hero creates *Dead Bug* today; a content migration seeds the official *Dead Bug* tomorrow;
the `INSERT` hits the unique index; the transaction rolls back; `ensureMigrations` throws; and
**the app never opens again on that phone**. There is no in-app recovery — the migration will
fail identically on every launch.

Four migrations are worse in a quieter way. `0023`, `0029`, `0030` and `0031` do
`UPDATE exercises SET … WHERE enName = '…'` with no owner filter: they would rewrite a hero's
row because it happens to share a name.

**This is what "avoid conflicts" means here.** Not ids.

### 2. Ids were never the identity, and are already unstable

`exercises.id` is `AUTOINCREMENT` — seeding order. The moment a hero row lands between two
content updates, the id of an official exercise diverges from the id it has on another device.
That is already fine, because:

- nothing outside the database references an exercise id;
- backup/restore is `VACUUM INTO` of the whole file ([`db/backup.ts`](../../../db/backup.ts)), so
  ids travel together or not at all — there is no row-level merge to get wrong;
- seed content already addresses movements **by `enName`** and says so out loud:
  `0032`'s header, [`db/paths.ts`](../../../db/paths.ts) (`PATH_NAMES`), `OATH_PRESETS`,
  [`constants/warmup.ts`](../../../constants/warmup.ts) (`WARMUP_MOVEMENTS`).

The contested namespace is names. Any design that partitions ids and leaves names alone has
solved the wrong problem.

### 3. Deleting an exercise silently rewrites history

No `PRAGMA foreign_keys = ON` is issued anywhere ([`db/client.ts`](../../../db/client.ts)), so
SQLite leaves foreign keys off and every `ON DELETE CASCADE` in the schema is decoration. Nine
queries `innerJoin` on `exercises`:

| File | What breaks when a row disappears |
| --- | --- |
| `db/completed.ts` ×2 | past sessions lose the exercise |
| `db/muscleBalance.ts` ×3 | volume, weak areas, pattern balance under-count |
| `db/personalRecords.ts` | the record vanishes |
| `db/village.ts` | a building can drop a level |
| `db/quests.ts` ×2 | the exercise leaves the quest; an emptied quest makes `getQuestById` return `null` — "quest not found" |

A hard delete is therefore a retroactive edit of the hero's own history, with no warning.

### 4. The exercise cache is documented as the opposite of this feature

```ts
// Exercise definitions are static seed content (no in-app editing), so every screen that
// mounts … can share one fetch
let exercisesCache: Promise<Exercise[]> | null = null;
```

It needs the invalidation `questTemplatesCache` already has.

### 5. The roadmap refused this feature, and three of its four reasons are answerable

`docs/planning/roadmap.md` § *Scanned and refused*:

> **Hero-authored exercises** — Parked… a home-made exercise has no art, no muscle mapping, no
> pattern and no XP weight, so it breaks the village, the boss and the estimate at once.

Checked against the code:

| Claim | Reality |
| --- | --- |
| no XP weight | XP is duration-only ([`db/xp.ts`](../../../db/xp.ts)). Nothing to weight. |
| breaks the estimate | `estimate.ts` reads `secondsPerRep`, which has a `NOT NULL DEFAULT 3`. |
| no muscle mapping | `exercise_muscles` is a join table the hero can fill. Empty is *visible*, not fatal — see §3.3. |
| no pattern | `exercises.pattern` is already nullable and its own comment says *"Null only for user-authored content"*. The schema reserved the seat. |
| no art | **True.** §3.4 is the answer. |

The refusal is not wrong to have existed; it is now out of date. The roadmap line gets rewritten,
not worked around.

## Design

### 3.1 Two populations in one table

`exercises.creator` already exists (`NOT NULL DEFAULT 'Admin'`). It becomes load-bearing.

```sql
DROP INDEX `exercises_en_name_unique`;
CREATE UNIQUE INDEX `exercises_admin_name_unique` ON `exercises` (`enName`) WHERE `creator` = 'Admin';
CREATE UNIQUE INDEX `exercises_hero_name_unique`  ON `exercises` (`enName`) WHERE `creator` <> 'Admin';
```

Partial indexes have been in SQLite since 3.8.0 and Drizzle's sqlite index builder supports
`.where()`, so this is expressible in `db/schema.ts` and generated normally.

Three rules follow, and together they *are* the conflict model:

1. **Two namespaces.** A hero may name a movement *Dead Bug* whether or not an official one
   exists, and a future migration may seed *Dead Bug* whether or not a hero took it. Neither can
   break the other. Uniqueness still holds inside each population, so a hero cannot own two
   *Dead Bug*s.
2. **Every migration statement touching `exercises` carries `creator = 'Admin'`.** Not a
   convention — a test that reads `drizzle/*.sql` and fails on an `UPDATE`/`DELETE` on
   `exercises` without the guard. `INSERT` needs no guard: the column defaults to `Admin`.
3. **Name lookups are official by default.** `officialByName(catalogue, enName)` — a pure helper
   over the already-cached list, not a query — instead of a bare
   `find(e => e.enName === name)` that could resolve to the hero's row. The warm-up is its only
   caller today (`db/oaths.ts` resolves by id, and `db/paths.ts` walks `prerequisiteExerciseId`,
   which no hero row carries). It exists so the rule has one home when the second caller arrives.

Rule 2 is grandfathered for the migrations that predate it — `0018` deletes, `0023`/`0029`/`0030`/`0031`
update — and for any other pre-partition writer the guard turns up. They are safe forever, not merely tolerated: every
migration runs before the app is usable, so no hero row can exist while they execute.

**Rejected: a separate `custom_exercises` table.** Total isolation and zero migration risk, but
the nine `innerJoin`s, the muscle balance, the village, the records and the quest editor all
become `UNION`s. Biggest diff of any option, and it splits one piece of state across two writers —
the failure mode `AGENTS.md` names first.

**Rejected: a reserved id range** (hero rows at `id >= 1_000_000`, or negative). The intuitive
answer to "don't let the ids collide", and it fixes nothing: the unique index is on the name, and
`creator` already answers "is this mine?" without arithmetic.

### 3.2 Retirement, not deletion

New nullable column `exercises.retiredAt` (`int`, timestamp mode, same as every other date here).

- `listExercises()` and every picker filter `retiredAt IS NULL`.
- **Hard delete is allowed only when the row is unused**: zero rows in `completed_exercises` and
  zero in `quest_exercises`. One count query behind `getExerciseUsage(id)`. This is what lets a
  typo made ten seconds ago actually disappear.
- Otherwise the action is **Retire**: gone from everywhere you *choose* an exercise, intact
  everywhere the app *reads history* — volume, village level, personal records, past sessions.

Fifteen lines, and the entire class of "my history changed by itself" bugs never opens.

### 3.3 The form: two fields, plus a fold

Target type (`reps | time`) lives on `quest_exercises`, not on the exercise — the quest editor
already asks for it. So the minimum really is two fields:

| Field | Written to |
| --- | --- |
| Name | `enName` **and** `frName` |
| Description | `enDescription` **and** `frDescription` |

One input per concept, copied into both locales: the row is bilingual, the hero is not. A hero
who wants both writes the language they use; nothing in the app degrades, because
`localizedName()` reads whichever column the current language points at.

Folded under **Details**, all optional, all defaulting to what the schema already defaults to:
muscles (`[]`), style (`strength`), difficulty (`medium`), equipment (`none`), pattern (`null`),
seconds per rep (`3`), image (§3.4).

**The consequence is stated, not hidden.** An exercise with no muscles contributes to no muscle
in the balance and to no village building. Two places say so:

- the fold's own subtitle — *"without muscles, this movement does not raise your village"*;
- `getMuscleBalance()` gains an `unclassifiedResults` count, and the balance card prints
  *"N results from unclassified exercises are not counted here"* instead of quietly reporting a
  smaller total.

That second one is the rule this codebase already has about loading states, applied to missing
data: a screen that cannot know must not assert.

Typed so it cannot drift:

```ts
/** What a hero owns on an exercise. Derived from `Exercise`, so a new column is a compile
 *  error here until someone decides whether the hero sets it. */
export type UserExerciseDraft = {
  /** One name for both locales. */
  name: string;
  /** One description for both locales. */
  description: string;
} & Pick<
  Exercise,
  "muscles" | "style" | "difficulty" | "equipment" | "pattern" | "secondsPerRep" | "imagePath"
>;
```

### 3.4 Art: both sources, and it travels with the backup

Two ways to give a hero-authored movement a picture:

- **Pick a bundled illustration.** ~60 already ship in the APK. `imagePath` stays a string, the
  export carries it for free, and the result sits beside the authored content without looking
  broken. Zero bytes, zero permissions, zero dependencies.
- **Pick a photo.** `expo-image-picker` is already a dependency ([`app/settings.tsx`](../../../app/settings.tsx)
  uses it for the avatar).

The photo is stored **in the row**, as `data:image/jpeg;base64,…` in `imagePath`. The reason is
the backup: an export is `VACUUM INTO` of the database file alone, so a `file://` path would
survive on the phone and arrive broken on the next one — and the picker's own URI lives in a
cache directory Android may clear underneath it. In the row, the picture is part of the thing the
app already promises to carry.

That costs one dependency, `expo-image-manipulator` (an official Expo module, declares no
Android permission), to resize to 512 px before encoding. Without it a 4000 px photo bloats the
database *and* every automatic backup written before every update.

```ts
// ponytail: the picture lives in the row so the backup carries it. Ceiling: row size — 512 px
// at q0.6 is ~40 KB, so fifty of them is ~2 MB. If someone ever fills a catalogue this way,
// move the blobs to their own table and teach the exporter about a second file.
```

**One resolver.** Today only [`app/exercises/[id].tsx`](../../../app/exercises/[id].tsx) knows how
to render a URI:

```tsx
path?.startsWith("http") ? { uri: path } : getExerciseAsset(path ?? "")
```

`WarmupView` and `ActiveExerciseView` call `getExerciseAsset` directly and would show the
placeholder. `getExerciseAsset` / `getExerciseThumb` absorb the URI case themselves, and the call
site above collapses into them. One source per value.

Permissions: the `READ_EXTERNAL_STORAGE` justification in
[`__tests__/android-permissions.test.ts`](../../../__tests__/android-permissions.test.ts) widens
to name the exercise photo. The ratchet is edited deliberately, in the same commit as the reason.

### 3.5 Instructions with the clock stopped

Half of this already exists: `ActiveExerciseView` has a collapsible *how to do it*. What is
missing is exactly what the user described.

- **`PausedOverlay` shows the movement.** Illustration, name and the **full** description of
  whatever the session was on, above the existing buttons, inside a `ScrollView`. During the
  warm-up (`prePauseStatus === "warmup"`) it shows the warm-up step instead. This is the user's
  own proposal, and it is the one place where reading is free: the timer is stopped.
- **`WarmupView` stops truncating.** `numberOfLines={3}` goes, and the description gets the same
  scroll container — without it a long description pushes the timer off the bottom, which is the
  exact trap [`ActiveExerciseView`](../../../components/session/ActiveExerciseView.tsx) documents
  at its own `ScrollView`.
- **One reader.** `PausedOverlay` must not grow a second copy of the warm-up's
  name-to-catalogue lookup. A `useSessionInstructions()` hook returns
  `{ imagePath, name, description } | null` for both states, and both screens call it.

**No briefing page.** A screen listing the movements before the warm-up is one more step between
"start" and starting, which is the friction the roadmap's §7 spends its budget removing. The
paused overlay answers the same need at the moment it is actually felt.

## Non-goals

- Walking, running, cycling — no distance unit, no GPS.
- A pre-session briefing page.
- Sharing hero-authored exercises between heroes (needs a transport; the roadmap's §7 refuses a network).
- Hero movements in the warm-up pools. [`constants/warmup.ts`](../../../constants/warmup.ts)
  encodes RAMP with rising intensity and calls that ordering "the protocol, not a preference".
- Hero-authored *quest art, bosses or adventures*.
- Turning `PRAGMA foreign_keys` on. It is a real latent bug (audit finding 3) and enabling it would start
  enforcing constraints against a corpus that may already hold orphans. Its own change, its own
  audit.

## Schema changes

One migration, `0035_hero_exercises.sql`:

```sql
ALTER TABLE `exercises` ADD `retiredAt` integer;
--> statement-breakpoint
DROP INDEX `exercises_en_name_unique`;
--> statement-breakpoint
CREATE UNIQUE INDEX `exercises_admin_name_unique` ON `exercises` (`enName`) WHERE `creator` = 'Admin';
--> statement-breakpoint
CREATE UNIQUE INDEX `exercises_hero_name_unique` ON `exercises` (`enName`) WHERE `creator` <> 'Admin';
```

Generated by `npm run db:generate` from `db/schema.ts` if drizzle-kit diffs the partial indexes
correctly; hand-written in the house style if it does not — the repo hand-writes migrations
already, and `db/migrate.ts` reads the journal, not the generator.

`SCHEMA_VERSION` in [`db/schemaVersion.ts`](../../../db/schemaVersion.ts) **does not** bump. Its
own docblock says a bump opens a *new empty database file* and orphans the old one — it is for
breaking changes that need a fresh start, not for a migration. An older build refusing this
build's backup is already handled by `knownMigrationTimes()` in `db/backup.ts`, which rejects a
snapshot carrying a migration it has never heard of.

## Public surface

In `db/exercises.ts` — one writer, mirroring `USER_QUEST_AUTHOR` / `isUserQuest` in
[`db/quests.ts`](../../../db/quests.ts):

```ts
export const USER_EXERCISE_CREATOR = "hero";
export function isUserExercise(ex: Pick<Exercise, "creator">): boolean;

export function createUserExercise(draft: UserExerciseDraft): Promise<number>;
export function updateUserExercise(id: number, draft: UserExerciseDraft): Promise<void>;
export function retireUserExercise(id: number): Promise<void>;
export function deleteUserExercise(id: number): Promise<void>; // throws when used

export type ExerciseUsage = { completedRows: number; questRows: number };
export function getExerciseUsage(id: number): Promise<ExerciseUsage>;

/** Seed content only. Pure — it reads the list `listExercises()` already cached. */
export const ADMIN_CREATOR = "Admin";
export function officialByName(catalogue: Exercise[], enName: string): Exercise | undefined;

export function invalidateExercisesCache(): void;
```

## Files touched

| Area | File | Change |
| --- | --- | --- |
| schema | `db/schema.ts`, `drizzle/0035_hero_exercises.sql` | `retiredAt`, partial indexes |
| data | `db/exercises.ts` | writers, usage count, `officialByName`, cache invalidation |
| data | `db/muscleBalance.ts` | `unclassifiedResults` |
| lookups | `components/session/WarmupView.tsx`, `db/paths.ts` readers | resolve through `officialByName` |
| screen | `app/exercises/new.tsx` (new), `app/exercises/[id].tsx` | create/edit/retire, mirroring `app/(tabs)/quests/edit.tsx` |
| screen | `app/exercises/index.tsx`, `constants/exerciseFilters.ts` | "mine" filter, hero badge |
| art | `constants/assetMap.ts` | URI-aware `getExerciseAsset` / `getExerciseThumb` |
| session | `components/session/PausedOverlay.tsx`, `WarmupView.tsx`, `hooks/useSessionInstructions.ts` (new) | §3.5 |
| guard | `__tests__/android-permissions.test.ts` | widened justification |
| i18n | `locales/*` | new keys |

## Tests — one per risk

| Risk | Test |
| --- | --- |
| the migration bomb | a seed-shaped `INSERT` of an official name **succeeds** while a hero row holds that name |
| a hero owns two identical names | rejected by `exercises_hero_name_unique` |
| a future migration clobbers a hero row | the `drizzle/*.sql` guard: no un-scoped `UPDATE`/`DELETE` on `exercises` outside the grandfathered set |
| deletion rewrites history | retiring keeps the row out of pickers **and** keeps past volume, village level and records identical |
| deletion of an unused row | allowed, and the row is gone |
| the cache lies after an edit | create → `listExercises()` contains it without a reload |
| unclassified volume is silently dropped | `getMuscleBalance().unclassifiedResults` counts it |
| the paused overlay | paused mid-exercise → the description is on screen; paused mid-warm-up → the warm-up movement's is |

Assertions are on **state**, not on navigation, per `AGENTS.md`. The `content-invariants` suite
scopes its "every exercise declares a pattern" and "every exercise is used by a quest" rules to
`creator = 'Admin'`, so they keep meaning what they meant.

## Phasing

Each phase ships alone and is worth shipping alone.

| Phase | Contents | Why it can go first |
| --- | --- | --- |
| **0 — Instructions** | `PausedOverlay`, `WarmupView`, `useSessionInstructions` | answers half the user's message with two files and no schema change |
| **1 — Defuse** | migration, partial indexes, `retiredAt`, `officialByName`, the SQL guard test | fixes a bomb that is already armed, with no feature attached |
| **2 — Author** | writers, the editor screen, the catalogue filter, cache invalidation, `unclassifiedResults` | the feature, on a base that cannot brick |
| **3 — Art** | URI-aware resolver, illustration picker, photo + resize | the last of the roadmap's four objections |

## Docs to update

- `docs/planning/roadmap.md` § *Scanned and refused* — rewrite the **Hero-authored exercises**
  line: three of its four reasons are answered above, the fourth is phase 3. It moves from
  *parked* to *shipped*, with the reasoning kept, because a refusal that quietly disappears
  teaches nothing.
- `docs/architecture/` — a page on the two-population rule: what `creator` means, why the
  namespaces are partitioned, and the one rule every future content migration obeys.
- `AGENTS.md` § *Quality rules* — one bullet: seed content and hero content share `exercises`,
  so every migration statement touching it filters on `creator`.
