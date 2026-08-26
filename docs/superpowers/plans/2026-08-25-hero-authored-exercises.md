# Hero-Authored Exercises Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a hero write their own exercises into the same catalogue as the seeded ones without any chance of a future content update bricking the app, and let anyone read what a movement is with the timer stopped.

**Architecture:** `exercises` keeps one table and grows a second population, told apart by the `creator` column that already exists. The global unique index on `enName` is replaced by two partial ones, one per population, so hero names and official names can never collide. Deletion becomes retirement, because foreign keys are off on the device and nine `innerJoin`s would otherwise turn a delete into a silent rewrite of the hero's own history. The instructions feature is separate and ships first.

**Tech Stack:** Expo + React Native + Tamagui, SQLite via `expo-sqlite` + Drizzle, Zustand stores, Jest with `better-sqlite3` for the DB suite, i18next with `locales/en.json` + `locales/fr.json`.

**Spec:** [`docs/superpowers/specs/2026-08-25-hero-authored-exercises-design.md`](../specs/2026-08-25-hero-authored-exercises-design.md)

## Global Constraints

- **Dark mode only.** Never add a light-mode branch.
- **Tamagui tokens only** (`$text`, `$surface`, `$primaryText`, `$4`, …). A raw hex outside `constants/rawColors.ts` is rejected by `.biome/plugins/noRawHexColors.grit`.
- **No `!` non-null assertion, anywhere.** Under `noUncheckedIndexedAccess`, narrow with `assert(x)` from `node:assert/strict` in tests, `?.` inside `expect()`.
- **No `enum`, no `namespace`** (`erasableSyntaxOnly`). Use `as const` objects.
- **No silent `catch`.** Use `reportError(context, error)` from `@/src/reportError`, or write down why the silence is deliberate — an empty block is a lint error.
- **Every user-visible string is an i18n key**, added to **both** `locales/en.json` and `locales/fr.json`. `__tests__/i18n-keys.test.ts` fails on a key present in one file only.
- **French copy uses tutoiement** (`tu`, not `vous`) — migration `0029` converted the whole corpus.
- **One name per concept:** a hero-authored exercise writes its single name into `enName` **and** `frName`, its single description into `enDescription` **and** `frDescription`.
- `USER_EXERCISE_CREATOR = "hero"` mirrors `USER_QUEST_AUTHOR = "hero"` in `db/quests.ts`. `ADMIN_CREATOR = "Admin"` is the seed value already in the schema default.
- **`SCHEMA_VERSION` does not change.** Bumping it opens a brand-new empty database file and orphans the hero's data — read its docblock in `db/schemaVersion.ts` before touching it.
- Run `npm run check` and `npm test` before every commit. `npx prek run --all-files` runs the same hooks the pre-commit shim does.
- Commits are `type(scope): subject` (`feat(exercises): …`, `fix(session): …`, `docs(spec): …`).

---

## File Structure

| File | Responsibility |
| --- | --- |
| `hooks/useSessionInstructions.ts` | **new** — the one reader of "what movement is on screen right now", for running, resting and warm-up |
| `components/session/PausedOverlay.tsx` | shows that movement's art, name and full description above the buttons |
| `components/session/WarmupView.tsx` | stops truncating the description; resolves names against seed rows only |
| `db/schema.ts` | `retiredAt` column, two partial unique indexes |
| `drizzle/0035_hero_exercises.sql` + `drizzle/meta/_journal.json` + `drizzle/migrations.js` | the migration, its journal entry and its import |
| `db/exercises.ts` | `Exercise.retiredAt`, `ADMIN_CREATOR`, `officialByName`, `pickableExercises`, the four writers, `getExerciseUsage`, `invalidateExercisesCache` |
| `db/muscleBalance.ts` | `unclassifiedResults` — volume the muscle bars cannot show |
| `components/journal/MuscleBalanceCard.tsx` | one line saying so |
| `app/exercises/new.tsx` | **new** — the editor, create and edit |
| `app/exercises/index.tsx` + `constants/exerciseFilters.ts` | a "Mine" facet, a hero badge, the "+" entry point |
| `app/exercises/[id].tsx` | Edit / Retire / Delete for hero rows |
| `constants/assetMap.ts` | `getExerciseAsset` / `getExerciseThumb` understand a URI or a data URI |
| `__tests__/seed-migration-guard.test.ts` | **new** — the ratchet that keeps rule 2 true |

---

# Phase 0 — Instructions with the clock stopped

Ships alone. No schema change. Answers half the user's message.

### Task 1: `useSessionInstructions` + the paused overlay shows the movement

**Files:**
- Create: `hooks/useSessionInstructions.ts`
- Modify: `components/session/PausedOverlay.tsx`
- Modify: `locales/en.json`, `locales/fr.json`
- Test: `__tests__/paused-overlay.test.tsx` (new)

**Interfaces:**
- Consumes: `useSessionStore` (`stores/session.ts`) fields `status`, `prePauseStatus`, `quest`, `currentExerciseIndex`, `warmupSequence`, `warmupIndex`; `listExercises()` from `db/exercises`; `useSettingsStore(s => s.language)`.
- Produces:
  ```ts
  export type SessionInstruction = {
    imagePath: string;
    name: string;
    description: string;
  };
  export function useSessionInstructions(): SessionInstruction | null;
  ```

**Background the implementer needs:**

- `app/session.tsx` renders `<PausedOverlay />` as a sibling on top of the active view, and computes `displayStatus = status === "paused" ? prePauseStatus : status`. So when paused, `prePauseStatus` is the real state.
- During **rest**, `currentExerciseIndex` already points at the *next* exercise — `completeExercise` advances it before switching to `resting`, so the UI can say "Up Next". That means running and resting can share one branch, and during a rest the overlay usefully shows what is coming.
- During **warm-up**, `warmupSequence[warmupIndex].exerciseName` is an `enName` that has to be looked up in the catalogue. `WarmupView` does that today with `listExercises()`; the hook takes over so there is only one copy.
- `Quest.exercises[i].exercise` is a full `Exercise` (see `db/quests.ts`), so the running branch needs no query at all.

- [ ] **Step 1: Write the failing test**

Create `__tests__/paused-overlay.test.tsx`:

```tsx
import { render, screen, waitFor } from "@testing-library/react-native";

import { PausedOverlay } from "@/components/session/PausedOverlay";

const exercise = {
  id: 1,
  enName: "Dead Bug",
  frName: "Dead Bug",
  enDescription: "Lie on your back, arms up, and lower one arm and the opposite leg.",
  frDescription: "Allonge-toi sur le dos, bras tendus, descends un bras et la jambe opposée.",
  imagePath: "assets/images/exercises/dead_bug.webp",
  creator: "Admin",
  difficulty: "medium",
  equipment: "none",
  style: "strength",
  secondsPerRep: 3,
  muscles: ["abs"],
  pattern: "core",
  prerequisiteExerciseId: null,
  retiredAt: null,
};

const state = {
  status: "paused",
  prePauseStatus: "running",
  quest: { exercises: [{ exercise, target: { type: "reps", value: 10 } }] },
  currentExerciseIndex: 0,
  warmupSequence: [],
  warmupIndex: 0,
  resumeSession: jest.fn(),
  restartRound: jest.fn(),
  quitSession: jest.fn(),
};

jest.mock("@/stores/session", () => ({
  useSessionStore: (selector: (s: unknown) => unknown) => selector(state),
}));

jest.mock("@/db/exercises", () => ({
  listExercises: () => Promise.resolve([exercise]),
}));

describe("PausedOverlay", () => {
  test("shows the current movement's full instructions while paused", async () => {
    render(<PausedOverlay />);

    await waitFor(() => {
      expect(screen.getByText("Dead Bug")).toBeTruthy();
    });
    // The whole description, not a truncated head — the clock is stopped, reading is free.
    expect(screen.getByText(exercise.enDescription)).toBeTruthy();
  });

  test("shows the warm-up movement when the pause happened during the warm-up", async () => {
    state.prePauseStatus = "warmup";
    state.warmupSequence = [{ exerciseName: "Dead Bug", seconds: 30 }] as never;

    render(<PausedOverlay />);

    await waitFor(() => {
      expect(screen.getByText(exercise.enDescription)).toBeTruthy();
    });
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx jest __tests__/paused-overlay.test.tsx`
Expected: FAIL — `Unable to find an element with text: Dead Bug`.

- [ ] **Step 3: Write the hook**

Create `hooks/useSessionInstructions.ts`:

```ts
import { useEffect, useState } from "react";

import { type Exercise, listExercises } from "@/db/exercises";
import { reportError } from "@/src/reportError";
import { useSessionStore } from "@/stores/session";
import { useSettingsStore } from "@/stores/settings";

/**
 * What movement the session is on, in the shape a screen renders it.
 *
 * One reader for three states, because "which exercise is this?" was about to be written a
 * second time in `PausedOverlay` and the first copy (`WarmupView`) resolves a warm-up step by
 * name against the catalogue — a lookup with a rule attached (seed rows only, see
 * `officialByName`) that must not exist twice.
 *
 * Resting is deliberately the same branch as running: `completeExercise` advances
 * `currentExerciseIndex` before switching to "resting", so during a rest this is the movement
 * about to start — which is exactly the one worth reading about.
 */
export type SessionInstruction = {
  imagePath: string;
  name: string;
  description: string;
};

export function useSessionInstructions(): SessionInstruction | null {
  const language = useSettingsStore((s) => s.language);
  const status = useSessionStore((s) => s.status);
  const prePauseStatus = useSessionStore((s) => s.prePauseStatus);
  const quest = useSessionStore((s) => s.quest);
  const currentExerciseIndex = useSessionStore((s) => s.currentExerciseIndex);
  const warmupSequence = useSessionStore((s) => s.warmupSequence);
  const warmupIndex = useSessionStore((s) => s.warmupIndex);

  const effective = status === "paused" ? prePauseStatus : status;
  const warmupName = effective === "warmup" ? warmupSequence[warmupIndex]?.exerciseName : undefined;

  const [catalogue, setCatalogue] = useState<Exercise[]>([]);

  useEffect(() => {
    if (!warmupName) return;
    let cancelled = false;
    listExercises()
      .then((all) => {
        if (!cancelled) setCatalogue(all);
      })
      .catch((error) => {
        // The warm-up still runs on the English label from `constants/warmup.ts`; only the
        // description and the art are lost, and the step is 30 seconds long.
        reportError("session.instructions", error);
      });
    return () => {
      cancelled = true;
    };
  }, [warmupName]);

  const describe = (ex: Exercise): SessionInstruction => ({
    imagePath: ex.imagePath,
    name: language === "fr" ? ex.frName : ex.enName,
    description: language === "fr" ? ex.frDescription : ex.enDescription,
  });

  if (warmupName) {
    const found = catalogue.find((e) => e.enName === warmupName);
    return found ? describe(found) : null;
  }

  const current = quest?.exercises[currentExerciseIndex];
  return current ? describe(current.exercise) : null;
}
```

- [ ] **Step 4: Render it in the overlay**

In `components/session/PausedOverlay.tsx`, add the imports:

```tsx
import { Image } from "expo-image";
import { ScrollView } from "react-native";
import { getExerciseAsset } from "@/constants/assetMap";
import { useSessionInstructions } from "@/hooks/useSessionInstructions";
```

Call the hook next to the other store reads (before the `if (status !== "paused") return null;` guard, so hook order is unconditional):

```tsx
const instruction = useSessionInstructions();
```

and insert this block inside the `<Card>`'s `<YStack gap="$3" items="center">`, between the
`paused_subtitle` `<Paragraph>` and the `<YStack width="100%" gap="$3" pt="$2">` that holds the
buttons:

```tsx
{instruction ? (
  <YStack width="100%" gap="$2" items="center" pt="$2">
    <Image
      source={getExerciseAsset(instruction.imagePath)}
      style={{ width: 120, height: 120, borderRadius: 12 }}
      contentFit="cover"
    />
    <Text fontWeight="700" fontSize={16} color="$text" style={{ textAlign: "center" }}>
      {instruction.name}
    </Text>
    {/* The clock is stopped, so this is the one place the whole description fits. It scrolls
        rather than growing, or a long movement pushes "resume" off a small screen. */}
    <ScrollView style={{ maxHeight: 160, width: "100%" }} showsVerticalScrollIndicator={false}>
      <Text fontSize={14} color="$textSecondary" lineHeight={20}>
        {instruction.description}
      </Text>
    </ScrollView>
  </YStack>
) : null}
```

- [ ] **Step 5: Run the test and watch it pass**

Run: `npx jest __tests__/paused-overlay.test.tsx`
Expected: PASS, both cases.

- [ ] **Step 6: Run the whole suite and the type check**

Run: `npm test && npm run check`
Expected: PASS. `__tests__/screen-cues.test.tsx` and `__tests__/testid-passthrough.test.tsx` both touch session screens — if either fails, the overlay's new subtree is the cause, not a flake.

- [ ] **Step 7: Commit**

```bash
git add hooks/useSessionInstructions.ts components/session/PausedOverlay.tsx __tests__/paused-overlay.test.tsx
git commit -m "feat(session): the pause shows what the movement is

A user wrote in: they did not know what a dead bug was and the timer kept
counting down while they worked it out. Pausing now answers the question it
created — art, name and the full description, with the clock stopped."
```

---

### Task 2: the warm-up stops truncating, and resolves seed rows only

**Files:**
- Modify: `components/session/WarmupView.tsx:70-135`
- Test: `__tests__/warmup-view.test.tsx` (new)

**Interfaces:**
- Consumes: `useSessionInstructions()` from Task 1.
- Produces: nothing new.

**Background:** `WarmupView` currently renders the description with `numberOfLines={3}` and finds
its exercise with `catalogue.find((e) => e.enName === step.exerciseName)`. Both change. The
untruncated text goes in a `ScrollView` with a `maxHeight`: the warm-up column is a fixed-height
sibling stack, and in React Native `flexShrink` is 0 by default, so growing text pushes the timer
past the bottom edge — the same trap `ActiveExerciseView` documents above its own `ScrollView`.

- [ ] **Step 1: Write the failing test**

Create `__tests__/warmup-view.test.tsx`:

```tsx
import { render, screen, waitFor } from "@testing-library/react-native";

import { WarmupView } from "@/components/session/WarmupView";

const LONG = "Lie on your back. ".repeat(20).trim();

const exercise = {
  id: 1,
  enName: "Dead Bug",
  frName: "Dead Bug",
  enDescription: LONG,
  frDescription: LONG,
  imagePath: "assets/images/exercises/dead_bug.webp",
  creator: "Admin",
  difficulty: "medium",
  equipment: "none",
  style: "strength",
  secondsPerRep: 3,
  muscles: ["abs"],
  pattern: "core",
  prerequisiteExerciseId: null,
  retiredAt: null,
};

jest.mock("@/db/exercises", () => ({ listExercises: () => Promise.resolve([exercise]) }));
jest.mock("@/hooks/useSessionTimer", () => ({
  formatTime: (s: number) => String(s),
  useSessionTimer: () => ({ remainingSeconds: 30, progress: 0 }),
}));
jest.mock("@/stores/session", () => ({
  useSessionStore: (selector: (s: unknown) => unknown) =>
    selector({
      status: "warmup",
      prePauseStatus: null,
      quest: null,
      currentExerciseIndex: 0,
      warmupIndex: 0,
      warmupSequence: [{ exerciseName: "Dead Bug", seconds: 30 }],
      nextWarmupStep: jest.fn(),
      previousWarmupStep: jest.fn(),
      skipWarmup: jest.fn(),
      pauseSession: jest.fn(),
    }),
}));

describe("WarmupView", () => {
  test("shows the whole description, not a truncated head", async () => {
    render(<WarmupView />);

    await waitFor(() => {
      expect(screen.getByText("Dead Bug")).toBeTruthy();
    });

    const description = screen.getByText(LONG);
    // numberOfLines is what cut the instructions off mid-sentence while the clock ran.
    expect(description.props.numberOfLines).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx jest __tests__/warmup-view.test.tsx`
Expected: FAIL — `expect(received).toBeUndefined()` with `received: 3`.

- [ ] **Step 3: Untruncate and scroll**

In `components/session/WarmupView.tsx`, replace the description block:

```tsx
{description ? (
  <Text
    fontSize={14}
    color="$textSecondary"
    lineHeight={20}
    numberOfLines={3}
    style={{ textAlign: "center" }}
  >
    {description}
  </Text>
) : null}
```

with:

```tsx
{/* Not truncated, and scrolling rather than growing: this column's siblings are
    fixed-height and RN's flexShrink is 0, so a long movement would otherwise push the
    timer off the bottom edge. */}
{description ? (
  <ScrollView style={{ maxHeight: 120 }} showsVerticalScrollIndicator={false}>
    <Text fontSize={14} color="$textSecondary" lineHeight={20} style={{ textAlign: "center" }}>
      {description}
    </Text>
  </ScrollView>
) : null}
```

and add `import { ScrollView } from "react-native";` to the imports.

- [ ] **Step 4: Run the test and watch it pass**

Run: `npx jest __tests__/warmup-view.test.tsx`
Expected: PASS.

- [ ] **Step 5: Run the suite and the type check**

Run: `npm test && npm run check`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add components/session/WarmupView.tsx __tests__/warmup-view.test.tsx
git commit -m "fix(session): the warm-up stops cutting the instructions at three lines

The one screen whose whole job is teaching a movement was the one showing the
least of it."
```

---

# Phase 1 — Defuse the migration bomb

No feature attached. Worth shipping on its own: the bomb is already armed for anyone who ever gets a hero row, and this is what makes Phase 2 safe to write.

### Task 3: partial unique indexes and `retiredAt`

**Files:**
- Modify: `db/schema.ts:72-114`
- Create: `drizzle/0035_hero_exercises.sql`
- Modify: `drizzle/meta/_journal.json`, `drizzle/migrations.js`
- Modify: `db/exercises.ts` (the `Exercise` type and its two builders)
- Test: `__tests__/db-exercises-partition.test.ts` (new)

**Interfaces:**
- Produces:
  ```ts
  // db/exercises.ts
  export type Exercise = { /* …existing fields… */ retiredAt: Date | null };
  ```
  Adding the field to the type is deliberate: `fetchExercises` and `getExerciseById` both build
  `Exercise` object literals, so the compiler lists every construction site that has to carry it.

- [ ] **Step 1: Write the failing test**

Create `__tests__/db-exercises-partition.test.ts`:

```ts
import { clientMock, createTestDb } from "./helpers/testDb";

/**
 * The bomb this migration defuses: `exercises_en_name_unique` was global, seven seed migrations
 * `INSERT INTO exercises` bare, and `db/migrate.ts` runs the whole journal in one
 * BEGIN IMMEDIATE. A hero-named "Dead Bug" plus a future official "Dead Bug" is an app that
 * never opens again on that phone.
 */
describe("exercises name partition", () => {
  const t = createTestDb();

  beforeAll(() => {
    jest.resetModules();
    jest.doMock("../db/client", () => clientMock(t));
  });

  afterAll(() => {
    t.close();
  });

  const insert = (enName: string, creator: string) =>
    t.sqlite
      .prepare(
        `INSERT INTO exercises (enName, frName, enDescription, frDescription, creator)
         VALUES (?, ?, '', '', ?)`,
      )
      .run(enName, enName, creator);

  test("a hero may take a name an official exercise already owns", () => {
    expect(() => insert("Squat", "hero")).not.toThrow();
  });

  test("a later seed may take a name a hero already owns — this is the migration bomb", () => {
    insert("Chigong Punch", "hero");
    // Exactly the statement shape every seed migration uses.
    expect(() => insert("Chigong Punch", "Admin")).not.toThrow();
  });

  test("a hero cannot own the same name twice", () => {
    insert("Archer Squat", "hero");
    expect(() => insert("Archer Squat", "hero")).toThrow(/UNIQUE/i);
  });

  test("seed content still cannot own the same name twice", () => {
    expect(() => insert("Squat", "Admin")).toThrow(/UNIQUE/i);
  });

  test("retiredAt exists and defaults to null", async () => {
    const { listExercises } = require("../db/exercises") as typeof import("../db/exercises");
    const all = await listExercises();
    const squat = all.find((e) => e.enName === "Squat" && e.creator === "Admin");
    expect(squat?.retiredAt).toBeNull();
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx jest __tests__/db-exercises-partition.test.ts`
Expected: FAIL on the first test — `UNIQUE constraint failed: exercises.enName`.

- [ ] **Step 3: Change the schema**

In `db/schema.ts`, add `sql` to the imports:

```ts
import { sql } from "drizzle-orm";
```

Add the column inside the `exercises` table definition, after `secondsPerRep`:

```ts
    // Retired, not deleted. Foreign keys are off on the device (db/client.ts issues no
    // `PRAGMA foreign_keys`), and nine queries `innerJoin` this table — a hard delete would
    // silently remove past volume, a village level and a personal record. Hero rows are
    // retired instead; only a row nothing has ever used is really deleted.
    retiredAt: int({ mode: "timestamp" }),
```

Replace the index block:

```ts
  (table) => ({
    enNameUnique: uniqueIndex("exercises_en_name_unique").on(table.enName),
  }),
```

with:

```ts
  (table) => ({
    // Two populations, two namespaces. A hero may name a movement "Dead Bug" whether or not an
    // official one exists, and a future content migration may seed "Dead Bug" whether or not a
    // hero took it. One global index made the second case an app that never opens again.
    adminNameUnique: uniqueIndex("exercises_admin_name_unique")
      .on(table.enName)
      .where(sql`${table.creator} = 'Admin'`),
    heroNameUnique: uniqueIndex("exercises_hero_name_unique")
      .on(table.enName)
      .where(sql`${table.creator} <> 'Admin'`),
  }),
```

- [ ] **Step 4: Write the migration**

Create `drizzle/0035_hero_exercises.sql`:

```sql
-- Two populations in one table.
--
-- `creator` has been on this table since `0000` and has never been load-bearing: everything was
-- 'Admin'. It becomes the partition key here, because the thing that actually collides between
-- seed content and hero content is the *name*, not the id.
--
-- Ids were never an identity anyone shares: they are AUTOINCREMENT seeding order, nothing
-- outside the database references them, and a backup is a `VACUUM INTO` of the whole file, so
-- there is no row-level merge that could get them wrong. Seed content addresses movements by
-- `enName` (see `0032`'s header, `db/paths.ts`, `constants/warmup.ts`) — so the name is the
-- contested namespace, and this is where it gets split in two.
--
-- `retiredAt`: foreign keys are off on the device and nine queries `innerJoin` this table, so a
-- hard delete rewrites the hero's own history. Hero rows are retired instead.
ALTER TABLE `exercises` ADD `retiredAt` integer;
--> statement-breakpoint
DROP INDEX `exercises_en_name_unique`;
--> statement-breakpoint
CREATE UNIQUE INDEX `exercises_admin_name_unique` ON `exercises` (`enName`) WHERE `creator` = 'Admin';
--> statement-breakpoint
CREATE UNIQUE INDEX `exercises_hero_name_unique` ON `exercises` (`enName`) WHERE `creator` <> 'Admin';
```

Append to the `entries` array in `drizzle/meta/_journal.json`:

```json
    {
      "idx": 35,
      "version": "6",
      "when": 1787112000000,
      "tag": "0035_hero_exercises",
      "breakpoints": true
    }
```

In `drizzle/migrations.js`, add `import m0035 from "./0035_hero_exercises.sql";` after the `m0034`
import and `m0035,` after `m0034,` in the exported `migrations` object.

- [ ] **Step 5: Carry `retiredAt` through the row type**

In `db/exercises.ts`, add to the `Exercise` type after `prerequisiteExerciseId`:

```ts
  /** Set when a hero retires their own movement. Seed rows are always null. */
  retiredAt: Date | null;
```

Add `retiredAt: exercises.retiredAt,` to the `.select({…})` of **both** `fetchExercises` and
`getExerciseById`, and `retiredAt: r.retiredAt ?? null,` / `retiredAt: first.retiredAt ?? null,`
to the two object literals they build. The type change makes the compiler point at each one.

- [ ] **Step 6: Run the test and watch it pass**

Run: `npx jest __tests__/db-exercises-partition.test.ts`
Expected: PASS, all five.

- [ ] **Step 7: Run the suite and the type check**

Run: `npm test && npm run check`
Expected: PASS. `__tests__/db-migrate.test.ts` and `__tests__/db-backup.test.ts` both read the
journal — a mismatched `idx`/`tag` shows up there first.

- [ ] **Step 8: Commit**

```bash
git add db/schema.ts db/exercises.ts drizzle/0035_hero_exercises.sql drizzle/meta/_journal.json drizzle/migrations.js __tests__/db-exercises-partition.test.ts
git commit -m "feat(db): split the exercise name space between seed content and the hero

The unique index on enName was global while seven seed migrations INSERT into
this table bare, inside one BEGIN IMMEDIATE. A hero-authored name that a later
content update also seeds would have rolled the whole journal back on every
launch — an app that never opens again, with no in-app recovery. Two partial
indexes, one per creator, and the two populations stop being able to collide."
```

---

### Task 4: the ratchet that keeps migrations off hero rows

**Files:**
- Create: `__tests__/seed-migration-guard.test.ts`

**Interfaces:**
- Consumes: nothing. Reads `drizzle/*.sql` from disk, like `__tests__/fdroid-scanignore.test.ts`
  and `__tests__/changelog.test.ts` already do.
- Produces: nothing. It is a gate.

**Background:** `0023`, `0029`, `0030` and `0031` do `UPDATE exercises SET … WHERE enName = '…'`
with no owner filter, and `0018` does a `DELETE`. Those five are safe **forever**, not merely
tolerated: `db/migrate.ts` runs the entire journal before the app is usable, so no hero row can
exist while they execute. Everything written from `0035` on runs on a database that may already
hold hero rows, and must say so.

- [ ] **Step 1: Write the failing test**

Create `__tests__/seed-migration-guard.test.ts`:

```ts
import fs from "node:fs";
import path from "node:path";

/**
 * Rule 2 of the two-population model (see the 0035 header): every migration statement that
 * writes to `exercises` scopes itself to `creator`.
 *
 * `INSERT` needs no guard — the column defaults to 'Admin'. `UPDATE` and `DELETE` do: without
 * one they would rewrite or remove a hero's row because it happens to share a name with the
 * seed row the migration meant.
 *
 * This is a ratchet. Add a justification, never widen the list to make a build pass.
 */
const DRIZZLE = path.join(process.cwd(), "drizzle");

/**
 * Written before the partition existed. Safe forever rather than grandfathered on trust: the
 * whole journal runs before the app is usable, so no hero row can exist while they execute.
 */
const PRE_PARTITION = new Set([
  "0018_delete_dumbbell_exercise.sql",
  "0023_official_exercise_names.sql",
  "0029_fr_tutoiement.sql",
  "0030_fr_exercise_casing.sql",
  "0031_fr_exercise_names.sql",
]);

/** `UPDATE exercises …` / `DELETE FROM exercises …`, up to the statement's end. */
const WRITES = /(UPDATE\s+`?exercises`?|DELETE\s+FROM\s+`?exercises`?)[\s\S]*?;/gi;

function sqlFiles(): string[] {
  return fs
    .readdirSync(DRIZZLE)
    .filter((f) => f.endsWith(".sql"))
    .sort();
}

describe("seed migrations never touch hero rows", () => {
  test("every UPDATE or DELETE on `exercises` scopes itself to creator", () => {
    const offenders: string[] = [];

    for (const file of sqlFiles()) {
      if (PRE_PARTITION.has(file)) continue;
      const sql = fs.readFileSync(path.join(DRIZZLE, file), "utf8");

      for (const [statement] of sql.matchAll(WRITES)) {
        if (!/creator/i.test(statement)) {
          offenders.push(`${file}: ${statement.slice(0, 90).replace(/\s+/g, " ")}`);
        }
      }
    }

    expect(offenders).toEqual([]);
  });

  test("the grandfathered list only names files that exist", () => {
    const present = new Set(sqlFiles());
    expect([...PRE_PARTITION].filter((f) => !present.has(f))).toEqual([]);
  });
});
```

- [ ] **Step 2: Run it and confirm it passes on today's tree**

Run: `npx jest __tests__/seed-migration-guard.test.ts`
Expected: PASS. If it fails, a migration between `0018` and `0034` writes to `exercises` and is
missing from `PRE_PARTITION` — add it *with* the reason, do not loosen the regex.

- [ ] **Step 3: Prove the guard actually catches something**

Temporarily append to `drizzle/0035_hero_exercises.sql`:

```sql
--> statement-breakpoint
UPDATE `exercises` SET `frName` = 'Squat' WHERE `enName` = 'Squat';
```

Run: `npx jest __tests__/seed-migration-guard.test.ts`
Expected: FAIL, listing `0035_hero_exercises.sql`. **Then delete those two lines again** and
re-run to confirm PASS. A guard nobody has watched fail is a guard nobody knows works.

- [ ] **Step 4: Write the rule down where the next author reads it**

In `AGENTS.md`, under **Quality rules**, add:

```markdown
- **Seed content and hero content share one table.** `exercises` holds both, told apart by
  `creator` ('Admin' vs 'hero'), and the unique index on `enName` is partial *per population* —
  a hero naming a movement can never make a future content migration fail, and a future
  migration can never take a name away from a hero. The price is one rule: every migration
  statement that `UPDATE`s or `DELETE`s `exercises` scopes itself to `creator`.
  `__tests__/seed-migration-guard.test.ts` fails on any that does not, and grandfathers the five
  that ran before hero rows could exist.
```

- [ ] **Step 5: Commit**

```bash
git add __tests__/seed-migration-guard.test.ts AGENTS.md
git commit -m "test(db): a migration may no longer rewrite a hero's exercise

The partition stops the INSERTs from colliding. This stops the UPDATEs from
clobbering: 0023, 0029, 0030 and 0031 all rewrite exercises WHERE enName, and
from 0035 on that statement can find a row the hero wrote."
```

---

### Task 5: name lookups resolve seed rows only

**Files:**
- Modify: `db/exercises.ts`
- Modify: `components/session/WarmupView.tsx`, `hooks/useSessionInstructions.ts`
- Test: `__tests__/db-exercises-partition.test.ts` (extend)

**Interfaces:**
- Produces:
  ```ts
  export const ADMIN_CREATOR = "Admin";
  export const USER_EXERCISE_CREATOR = "hero";
  export function isUserExercise(ex: Pick<Exercise, "creator">): boolean;
  export function officialByName(catalogue: Exercise[], enName: string): Exercise | undefined;
  ```

**Background:** `constants/warmup.ts` prescribes movements **by `enName`** and says so in its own
docblock. Once a hero can own a name, a bare `find(e => e.enName === name)` can resolve to their
row — and the warm-up would then teach a hero their own half-written note instead of the seeded
movement. `db/oaths.ts` resolves by `exerciseId` and `db/paths.ts` walks
`prerequisiteExerciseId`, which no hero row carries, so neither needs this. The helper exists so
the rule has one home when the second caller arrives.

- [ ] **Step 1: Write the failing test**

Append to `__tests__/db-exercises-partition.test.ts`:

```ts
describe("officialByName", () => {
  test("prefers the seed row when a hero owns the same name", async () => {
    const { listExercises, officialByName, isUserExercise } =
      require("../db/exercises") as typeof import("../db/exercises");

    const all = await listExercises();
    const found = officialByName(all, "Squat");

    expect(found?.enName).toBe("Squat");
    expect(found ? isUserExercise(found) : true).toBe(false);
  });

  test("returns undefined for a name only a hero owns", async () => {
    const { listExercises, officialByName } =
      require("../db/exercises") as typeof import("../db/exercises");

    const all = await listExercises();
    expect(officialByName(all, "Chigong Punch")).toBeUndefined();
  });
});
```

(The earlier cases in this file already inserted a hero `Squat` and a hero `Chigong Punch`.)

- [ ] **Step 2: Run it and watch it fail**

Run: `npx jest __tests__/db-exercises-partition.test.ts`
Expected: FAIL — `officialByName is not a function`.

- [ ] **Step 3: Implement**

In `db/exercises.ts`, below the `Exercise` type:

```ts
/** The `creator` seed content carries. The column has defaulted to it since `0000`. */
export const ADMIN_CREATOR = "Admin";

/**
 * Stamped on exercises written in the app, exactly as `USER_QUEST_AUTHOR` is on quests: only
 * rows carrying this may be edited or retired from the UI, so a content update can never
 * clobber the hero's work and the hero can never edit the seed.
 */
export const USER_EXERCISE_CREATOR = "hero";

export function isUserExercise(ex: Pick<Exercise, "creator">): boolean {
  return ex.creator !== ADMIN_CREATOR;
}

/**
 * Resolve a movement the *content* named — the warm-up prescribes by `enName`
 * (`constants/warmup.ts`), and once a hero owns names too, a bare `find` on `enName` can land
 * on their row. Pure: it reads the list `listExercises()` already caches, so this costs no query.
 */
export function officialByName(catalogue: Exercise[], enName: string): Exercise | undefined {
  return catalogue.find((e) => e.enName === enName && e.creator === ADMIN_CREATOR);
}
```

In `components/session/WarmupView.tsx`, replace the three bare lookups:

```tsx
const found = catalogue.find((e) => e.enName === enName);
```
```tsx
const exercise = catalogue.find((e) => e.enName === step.exerciseName);
```
```tsx
const nextExercise = nextStep ? catalogue.find((e) => e.enName === nextStep.exerciseName) : undefined;
```

with `officialByName(catalogue, …)` calls, and add `officialByName` to the existing
`@/db/exercises` import.

In `hooks/useSessionInstructions.ts`, replace `catalogue.find((e) => e.enName === warmupName)`
with `officialByName(catalogue, warmupName)` and add it to the import.

- [ ] **Step 4: Run the test and watch it pass**

Run: `npx jest __tests__/db-exercises-partition.test.ts __tests__/warmup-view.test.tsx __tests__/paused-overlay.test.tsx`
Expected: PASS.

- [ ] **Step 5: Run the suite and the type check**

Run: `npm test && npm run check`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add db/exercises.ts components/session/WarmupView.tsx hooks/useSessionInstructions.ts __tests__/db-exercises-partition.test.ts
git commit -m "feat(db): the warm-up resolves the seeded movement, not a same-named hero one

constants/warmup.ts prescribes by enName and says so. Now that a hero can own
a name, that lookup needed an owner."
```

---

# Phase 2 — Authoring

### Task 6: the writers

**Files:**
- Modify: `db/exercises.ts`
- Test: `__tests__/db-exercises-authoring.test.ts` (new)

**Interfaces:**
- Consumes: `ADMIN_CREATOR`, `USER_EXERCISE_CREATOR`, `Exercise` (Task 5).
- Produces:
  ```ts
  export type UserExerciseDraft = {
    /** One name for both locales — the row is bilingual, the hero is not. */
    name: string;
    /** One description for both locales. */
    description: string;
  } & Pick<
    Exercise,
    "muscles" | "style" | "difficulty" | "equipment" | "pattern" | "secondsPerRep" | "imagePath"
  >;

  export const DEFAULT_USER_EXERCISE_DRAFT: Omit<UserExerciseDraft, "name" | "description">;

  export function createUserExercise(draft: UserExerciseDraft): Promise<number>;
  export function updateUserExercise(id: number, draft: UserExerciseDraft): Promise<void>;
  export function retireUserExercise(id: number): Promise<void>;
  export function deleteUserExercise(id: number): Promise<void>;

  export type ExerciseUsage = { completedRows: number; questRows: number };
  export function getExerciseUsage(id: number): Promise<ExerciseUsage>;

  export function pickableExercises(all: Exercise[]): Exercise[];
  export function invalidateExercisesCache(): void;
  ```

**Background the implementer needs:**

- `listExercises()` is promise-cached module-wide and its docblock says "static seed content (no
  in-app editing)". That comment is now wrong and the cache needs `invalidateExercisesCache()`,
  called by every writer here — `db/quests.ts` does the same for `questTemplatesCache`.
- `listExercises()` must keep returning **retired rows**, because `db/adventures.ts`,
  `db/questConfig.ts` and `app/(tabs)/quests/[id].tsx` all resolve a quest's exercises out of
  that same cached list. Hiding happens only where the hero *picks*, which is what
  `pickableExercises()` is for.
- `createQuestTemplate` in `db/quests.ts` is the model for `.returning({ id })` plus a
  select-by-name fallback. Copy that shape.

- [ ] **Step 1: Write the failing test**

Create `__tests__/db-exercises-authoring.test.ts`:

```ts
import assert from "node:assert/strict";

import { clientMock, createTestDb } from "./helpers/testDb";

describe("hero-authored exercises", () => {
  const t = createTestDb();

  beforeAll(() => {
    jest.resetModules();
    jest.doMock("../db/client", () => clientMock(t));
  });

  afterAll(() => {
    t.close();
  });

  const draft = (name: string) => {
    const { DEFAULT_USER_EXERCISE_DRAFT } =
      require("../db/exercises") as typeof import("../db/exercises");
    return { ...DEFAULT_USER_EXERCISE_DRAFT, name, description: `How to do ${name}.` };
  };

  test("a created exercise is in the catalogue immediately, without a reload", async () => {
    const { createUserExercise, listExercises } =
      require("../db/exercises") as typeof import("../db/exercises");

    const before = await listExercises();
    const id = await createUserExercise({ ...draft("Archer Squat"), muscles: ["legs"] });
    const after = await listExercises();

    expect(after.length).toBe(before.length + 1);
    const created = after.find((e) => e.id === id);
    assert(created);
    // One input, both locales — nothing in the app should ever show an empty French name.
    expect(created.enName).toBe("Archer Squat");
    expect(created.frName).toBe("Archer Squat");
    expect(created.enDescription).toBe(created.frDescription);
    expect(created.creator).toBe("hero");
    expect(created.muscles).toEqual(["legs"]);
    expect(created.retiredAt).toBeNull();
  });

  test("an edit rewrites both locales and replaces the muscle tags", async () => {
    const { createUserExercise, updateUserExercise, getExerciseById } =
      require("../db/exercises") as typeof import("../db/exercises");

    const id = await createUserExercise({ ...draft("Punch"), muscles: ["arms"] });
    await updateUserExercise(id, { ...draft("Straight Punch"), muscles: ["arms", "shoulder"] });

    const updated = await getExerciseById(id);
    expect(updated?.enName).toBe("Straight Punch");
    expect(updated?.frName).toBe("Straight Punch");
    expect(updated?.muscles.sort()).toEqual(["arms", "shoulder"]);
  });

  test("seed content cannot be edited or retired through these writers", async () => {
    const { listExercises, updateUserExercise, retireUserExercise } =
      require("../db/exercises") as typeof import("../db/exercises");

    const all = await listExercises();
    const squat = all.find((e) => e.enName === "Squat" && e.creator === "Admin");
    assert(squat);

    await expect(updateUserExercise(squat.id, draft("Squat"))).rejects.toThrow(/not hero-authored/i);
    await expect(retireUserExercise(squat.id)).rejects.toThrow(/not hero-authored/i);
  });

  test("an unused exercise is really deleted", async () => {
    const { createUserExercise, deleteUserExercise, getExerciseById, getExerciseUsage } =
      require("../db/exercises") as typeof import("../db/exercises");

    const id = await createUserExercise(draft("Typo"));
    expect(await getExerciseUsage(id)).toEqual({ completedRows: 0, questRows: 0 });

    await deleteUserExercise(id);
    expect(await getExerciseById(id)).toBeNull();
  });

  test("an exercise with history is refused for deletion and retired instead", async () => {
    const { createUserExercise, deleteUserExercise, retireUserExercise, getExerciseUsage } =
      require("../db/exercises") as typeof import("../db/exercises");

    const id = await createUserExercise(draft("Horse Stance"));

    t.sqlite
      .prepare("INSERT INTO sessions (questId, startedAt, status) VALUES (NULL, ?, 'completed')")
      .run(Date.now());
    const sessionId = t.sqlite.prepare("SELECT MAX(id) AS id FROM sessions").get() as {
      id: number;
    };
    t.sqlite
      .prepare(
        `INSERT INTO completed_exercises
           (sessionId, exerciseId, roundIndex, sortOrder, resultType, resultValue, performedAt)
         VALUES (?, ?, 0, 0, 'reps', 10, ?)`,
      )
      .run(sessionId.id, id, Date.now());

    expect((await getExerciseUsage(id)).completedRows).toBe(1);
    await expect(deleteUserExercise(id)).rejects.toThrow(/in use/i);

    await retireUserExercise(id);
  });

  test("retiring hides the movement from pickers and keeps it in history", async () => {
    const { listExercises, pickableExercises } =
      require("../db/exercises") as typeof import("../db/exercises");

    const all = await listExercises();
    const retired = all.find((e) => e.enName === "Horse Stance");
    // Still in the list every quest, adventure and journal screen resolves ids against…
    expect(retired?.retiredAt).toBeInstanceOf(Date);
    // …and gone from the one place the hero chooses.
    expect(pickableExercises(all).some((e) => e.enName === "Horse Stance")).toBe(false);
  });
});
```

Before writing the implementation, confirm the two column names this test hard-codes:

Run: `sqlite3 :memory: ".read drizzle/0000_schema.sql" ".schema sessions" ".schema completed_exercises"`
or read `db/schema.ts`'s `sessions` and `completedExercises` definitions. If a column differs
(`status`, `startedAt`, `resultType`, `resultValue`, `performedAt`), fix the test's SQL to match
the schema — the schema is the source, not this plan.

- [ ] **Step 2: Run it and watch it fail**

Run: `npx jest __tests__/db-exercises-authoring.test.ts`
Expected: FAIL — `createUserExercise is not a function`.

- [ ] **Step 3: Implement the writers**

In `db/exercises.ts`, add `count` to the `drizzle-orm` import (`eq` is already there), and append:

```ts
/**
 * What a hero owns on an exercise.
 *
 * `Pick`ed from `Exercise` rather than spelled out, so a new column on the table is a compile
 * error here until someone decides whether the hero sets it — the same trick `SavedSessionState`
 * plays on the session store.
 */
export type UserExerciseDraft = {
  /** One name for both locales — the row is bilingual, the hero is not. */
  name: string;
  /** One description for both locales. */
  description: string;
} & Pick<
  Exercise,
  "muscles" | "style" | "difficulty" | "equipment" | "pattern" | "secondsPerRep" | "imagePath"
>;

/**
 * What the fold in the editor starts at — the table's own defaults, restated once so the screen
 * and the writer cannot disagree about them. `muscles: []` is a real answer, not a missing one:
 * an unclassified movement is counted nowhere and `getMuscleBalance` says so out loud.
 */
export const DEFAULT_USER_EXERCISE_DRAFT: Omit<UserExerciseDraft, "name" | "description"> = {
  muscles: [],
  style: "strength",
  difficulty: "medium",
  equipment: "none",
  pattern: null,
  secondsPerRep: 3,
  imagePath: "assets/placeholder.webp",
};

/** Drops the cached catalogue. Every writer below calls it; nothing else should have to. */
export function invalidateExercisesCache(): void {
  exercisesCache = null;
}

/**
 * The rows a hero may choose from — the catalogue, the quest editor's picker, the oath screen.
 *
 * `listExercises()` deliberately keeps returning retired rows: `db/adventures.ts`,
 * `db/questConfig.ts` and the quest screen all resolve a quest's exercise ids out of that same
 * cached list, and a quest holding a retired movement has to keep working. Hiding belongs at
 * the moment of choosing, which is here, once.
 */
export function pickableExercises(all: Exercise[]): Exercise[] {
  return all.filter((e) => e.retiredAt === null);
}

async function assertHeroAuthored(id: number): Promise<void> {
  const rows = await db
    .select({ creator: exercises.creator })
    .from(exercises)
    .where(eq(exercises.id, id))
    .limit(1);
  const row = rows[0];
  if (!row) throw new Error(`Exercise ${id} not found`);
  if (row.creator === ADMIN_CREATOR) {
    throw new Error(`Exercise ${id} is not hero-authored — seed content is not editable`);
  }
}

async function writeMuscles(exerciseId: number, muscles: MuscleCode[]): Promise<void> {
  await db.delete(exerciseMuscles).where(eq(exerciseMuscles.exerciseId, exerciseId));
  if (muscles.length === 0) return;
  await db
    .insert(exerciseMuscles)
    .values([...new Set(muscles)].map((muscle) => ({ exerciseId, muscle })));
}

export async function createUserExercise(draft: UserExerciseDraft): Promise<number> {
  // `.returning()` rather than "select the newest row with this name": the same id race
  // `createQuestTemplate` documents, and here two rows really can share a name across creators.
  const inserted = await db
    .insert(exercises)
    .values({
      enName: draft.name,
      frName: draft.name,
      enDescription: draft.description,
      frDescription: draft.description,
      imagePath: draft.imagePath,
      creator: USER_EXERCISE_CREATOR,
      difficulty: draft.difficulty,
      equipment: draft.equipment,
      style: draft.style,
      pattern: draft.pattern,
      secondsPerRep: draft.secondsPerRep,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning({ id: exercises.id });

  const id = inserted[0]?.id;
  if (id == null) throw new Error("Failed to create exercise");

  await writeMuscles(id, draft.muscles);
  invalidateExercisesCache();
  return id;
}

export async function updateUserExercise(id: number, draft: UserExerciseDraft): Promise<void> {
  await assertHeroAuthored(id);

  await db
    .update(exercises)
    .set({
      enName: draft.name,
      frName: draft.name,
      enDescription: draft.description,
      frDescription: draft.description,
      imagePath: draft.imagePath,
      difficulty: draft.difficulty,
      equipment: draft.equipment,
      style: draft.style,
      pattern: draft.pattern,
      secondsPerRep: draft.secondsPerRep,
      updatedAt: new Date(),
    })
    .where(eq(exercises.id, id));

  await writeMuscles(id, draft.muscles);
  invalidateExercisesCache();
}

export type ExerciseUsage = { completedRows: number; questRows: number };

/** What a delete would take with it. Both counts are zero or the row is retired, not removed. */
export async function getExerciseUsage(id: number): Promise<ExerciseUsage> {
  const [completedRows, questRows] = await Promise.all([
    db
      .select({ n: count() })
      .from(schema.completedExercises)
      .where(eq(schema.completedExercises.exerciseId, id)),
    db
      .select({ n: count() })
      .from(schema.questExercises)
      .where(eq(schema.questExercises.exerciseId, id)),
  ]);

  return {
    completedRows: completedRows[0]?.n ?? 0,
    questRows: questRows[0]?.n ?? 0,
  };
}

export async function retireUserExercise(id: number): Promise<void> {
  await assertHeroAuthored(id);
  await db.update(exercises).set({ retiredAt: new Date() }).where(eq(exercises.id, id));
  invalidateExercisesCache();
}

/**
 * Only ever the movement nothing has used — the typo made ten seconds ago.
 *
 * Foreign keys are off on the device, so SQLite would not stop this; nine queries `innerJoin`
 * this table, so it would silently take past volume, a village level and a personal record with
 * it. The count is the enforcement.
 */
export async function deleteUserExercise(id: number): Promise<void> {
  await assertHeroAuthored(id);

  const usage = await getExerciseUsage(id);
  if (usage.completedRows > 0 || usage.questRows > 0) {
    throw new Error(
      `Exercise ${id} is in use (${usage.completedRows} results, ${usage.questRows} quest slots) — retire it instead`,
    );
  }

  await db.delete(exerciseMuscles).where(eq(exerciseMuscles.exerciseId, id));
  await db.delete(exercises).where(eq(exercises.id, id));
  invalidateExercisesCache();
}
```

Also fix the now-false comment above `exercisesCache`:

```ts
// One fetch shared by every screen that mounts (quest/adventure galleries, adventure details) —
// re-querying per navigation was the biggest source of the post-navigation loading flash. The
// hero can now write to this table, so every writer in this file calls
// `invalidateExercisesCache()`; the list still includes retired rows, because quests resolve
// their exercise ids against it (see `pickableExercises`).
```

- [ ] **Step 4: Run the test and watch it pass**

Run: `npx jest __tests__/db-exercises-authoring.test.ts`
Expected: PASS, all six.

- [ ] **Step 5: Run the suite and the type check**

Run: `npm test && npm run check`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add db/exercises.ts __tests__/db-exercises-authoring.test.ts
git commit -m "feat(db): create, edit, retire and delete a hero-authored exercise

Delete is the narrow case, not the default: foreign keys are off on the device
and nine queries innerJoin this table, so removing a movement someone has
already trained would quietly rewrite their volume, their village and their
records. Retire covers everything the hero has used; delete covers the typo."
```

---

### Task 7: unclassified volume is counted out loud

**Files:**
- Modify: `db/muscleBalance.ts` (the `MuscleBalance` type and `computeMuscleBalance`)
- Modify: `components/journal/MuscleBalanceCard.tsx`
- Modify: `locales/en.json`, `locales/fr.json`
- Test: `__tests__/db-muscleBalance.test.ts` (extend)

**Interfaces:**
- Consumes: `createUserExercise` (Task 6).
- Produces: `MuscleBalance.unclassifiedResults: number`.

**Background:** the balance query `innerJoin`s `exercise_muscles`, so a movement with no muscle
tag contributes to no bar — and to no total. Before hero rows that was impossible; now the card
would report a smaller number and look confident about it. Counting it separately and printing
one line is the same rule this codebase applies to loading states: a screen that cannot know must
not assert.

- [ ] **Step 1: Write the failing test**

Append to `__tests__/db-muscleBalance.test.ts`, inside its existing `describe` so it reuses that
file's `t` and its `jest.doMock("../db/client", …)`. Read the top of the file first: if it mocks
`db/client` per-test rather than in a `beforeAll`, `createUserExercise` must be `require`d after
the same mock is in place, or it will write to a different database than the one the assertion
reads.

```ts
test("results from an unclassified hero exercise are counted, and named", async () => {
  const { createUserExercise, DEFAULT_USER_EXERCISE_DRAFT } =
    require("../db/exercises") as typeof import("../db/exercises");
  const { getMuscleBalance } = require("../db/muscleBalance") as typeof import("../db/muscleBalance");
  const { clearShortLivedQueries } =
    require("../db/queryCache") as typeof import("../db/queryCache");

  const id = await createUserExercise({
    ...DEFAULT_USER_EXERCISE_DRAFT,
    name: "Qi Gong Flow",
    description: "Move slowly.",
    muscles: [],
  });

  t.sqlite
    .prepare("INSERT INTO sessions (questId, startedAt, status) VALUES (NULL, ?, 'completed')")
    .run(Date.now());
  const session = t.sqlite.prepare("SELECT MAX(id) AS id FROM sessions").get() as { id: number };
  t.sqlite
    .prepare(
      `INSERT INTO completed_exercises
         (sessionId, exerciseId, roundIndex, sortOrder, resultType, resultValue, performedAt)
       VALUES (?, ?, 0, 0, 'reps', 12, ?)`,
    )
    .run(session.id, id, Date.now());

  clearShortLivedQueries();
  const balance = await getMuscleBalance("all");

  expect(balance.unclassifiedResults).toBe(1);
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx jest __tests__/db-muscleBalance.test.ts`
Expected: FAIL — `expect(received).toBe(1)` with `received: undefined`.

- [ ] **Step 3: Count it**

In `db/muscleBalance.ts`, add to the `MuscleBalance` type:

```ts
  /**
   * Results whose exercise carries no muscle tag — hero-authored movements where the hero left
   * the fold closed. The bars above cannot show them and their volume is in no total, so the
   * card says so rather than quietly reporting a smaller number.
   */
  unclassifiedResults: number;
```

In `computeMuscleBalance`, alongside the existing aggregate, add:

```ts
  const unclassifiedRows = await db
    .select({ n: count() })
    .from(completedExercises)
    .innerJoin(exercises, eq(exercises.id, completedExercises.exerciseId))
    .leftJoin(exerciseMuscles, eq(exerciseMuscles.exerciseId, exercises.id))
    .where(and(isNull(exerciseMuscles.muscle), gte(completedExercises.performedAt, startDate)));
```

and put `unclassifiedResults: unclassifiedRows[0]?.n ?? 0,` into the returned object. Import
`count` and `isNull` from `drizzle-orm` if they are not already imported, and match the existing
date-window predicate in that function rather than copying the `gte` above verbatim — the period
boundary already has one writer there.

- [ ] **Step 4: Say it on the card**

Add to `locales/en.json` under `journal`:

```json
"unclassified_volume_one": "{{count}} result from an exercise with no muscles set isn't counted here.",
"unclassified_volume_other": "{{count}} results from exercises with no muscles set aren't counted here."
```

and to `locales/fr.json`:

```json
"unclassified_volume_one": "{{count}} résultat vient d'un exercice sans muscles renseignés : il n'est pas compté ici.",
"unclassified_volume_other": "{{count}} résultats viennent d'exercices sans muscles renseignés : ils ne sont pas comptés ici."
```

In `components/journal/MuscleBalanceCard.tsx`, insert directly **above** the `pullDeficit ? (`
block:

```tsx
{balance.unclassifiedResults > 0 ? (
  <Text fontSize={12} color="$text" opacity={0.7}>
    {t("journal.unclassified_volume", { count: balance.unclassifiedResults })}
  </Text>
) : null}
```

(Use whatever local name the component already binds the `MuscleBalance` to; `balance` here is
illustrative — read the top of the file and match it.)

- [ ] **Step 5: Run the tests and watch them pass**

Run: `npx jest __tests__/db-muscleBalance.test.ts __tests__/i18n-keys.test.ts`
Expected: PASS. The i18n test fails if either locale file is missing one of the two plural forms.

- [ ] **Step 6: Run the suite and the type check**

Run: `npm test && npm run check`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add db/muscleBalance.ts components/journal/MuscleBalanceCard.tsx locales/en.json locales/fr.json __tests__/db-muscleBalance.test.ts
git commit -m "feat(journal): the balance card says what it is not counting

A hero-authored movement with no muscle tags joins to no bar and to no total.
Reporting the smaller number silently is the same lie a loading state tells
when it renders a zero."
```

---

### Task 8: the editor screen

**Files:**
- Create: `app/exercises/new.tsx`
- Modify: `app/exercises/_layout.tsx`
- Modify: `locales/en.json`, `locales/fr.json`
- Test: `__tests__/exercise-editor.test.tsx` (new)

**Interfaces:**
- Consumes: `createUserExercise`, `updateUserExercise`, `DEFAULT_USER_EXERCISE_DRAFT`,
  `UserExerciseDraft`, `getExerciseById`, `isUserExercise` (Tasks 5–6).
- Produces: route `/exercises/new`, optionally with `?id=<n>` to edit.

**Background:** `app/(tabs)/quests/edit.tsx` is the model for everything here — the same
`useLocalSearchParams` create-or-edit split, the same `Card` + `Input` + `Chip` + `Stepper`
vocabulary from `components/common/`, the same `useToast` for the failure path, the same
`reportError` in the catch. Read it before writing this. Do not invent new form primitives.

The form is deliberately two fields with a fold. Target type (reps vs time) is **not** here: it
lives on `quest_exercises` and the quest editor already asks for it.

- [ ] **Step 1: Write the failing test**

Create `__tests__/exercise-editor.test.tsx`:

```tsx
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";

const createUserExercise = jest.fn().mockResolvedValue(42);

jest.mock("@/db/exercises", () => ({
  createUserExercise,
  updateUserExercise: jest.fn(),
  getExerciseById: jest.fn().mockResolvedValue(null),
  isUserExercise: () => true,
  DEFAULT_USER_EXERCISE_DRAFT: {
    muscles: [],
    style: "strength",
    difficulty: "medium",
    equipment: "none",
    pattern: null,
    secondsPerRep: 3,
    imagePath: "assets/placeholder.webp",
  },
}));

const back = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ back, replace: jest.fn(), push: jest.fn() }),
  useLocalSearchParams: () => ({}),
  useNavigation: () => ({ setOptions: jest.fn() }),
}));

import ExerciseEditor from "@/app/exercises/new";

describe("exercise editor", () => {
  beforeEach(() => {
    createUserExercise.mockClear();
  });

  test("saving writes the name into both locales and nothing else is required", async () => {
    render(<ExerciseEditor />);

    fireEvent.changeText(screen.getByTestId("exercise-name"), "Archer Squat");
    fireEvent.changeText(screen.getByTestId("exercise-description"), "Wide stance, shift over one leg.");
    fireEvent.press(screen.getByTestId("exercise-save"));

    await waitFor(() => {
      expect(createUserExercise).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Archer Squat",
          description: "Wide stance, shift over one leg.",
          muscles: [],
        }),
      );
    });
  });

  test("a blank name cannot be saved", async () => {
    render(<ExerciseEditor />);

    fireEvent.changeText(screen.getByTestId("exercise-name"), "   ");
    fireEvent.press(screen.getByTestId("exercise-save"));

    await waitFor(() => {
      expect(createUserExercise).not.toHaveBeenCalled();
    });
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx jest __tests__/exercise-editor.test.tsx`
Expected: FAIL — cannot resolve `@/app/exercises/new`.

- [ ] **Step 3: Add the i18n keys**

`locales/en.json`, under a new `exercise_editor` object:

```json
"exercise_editor": {
  "title_new": "New movement",
  "title_edit": "Edit movement",
  "name_label": "Name",
  "name_placeholder": "Archer squat",
  "description_label": "How to do it",
  "description_placeholder": "Wide stance, shift your weight over one leg, keep the other straight.",
  "details": "Details",
  "details_hint": "Optional. Without muscles, this movement doesn't raise your village and doesn't show in your balance.",
  "muscles": "Muscles",
  "style": "Style",
  "difficulty": "Difficulty",
  "equipment": "Equipment",
  "pattern": "Movement family",
  "pattern_none": "Unset",
  "seconds_per_rep": "Seconds per rep",
  "save": "Save",
  "name_required": "Give the movement a name.",
  "name_taken": "You already have a movement with this name.",
  "save_failed": "Could not save the movement."
}
```

`locales/fr.json`, same keys, tutoiement:

```json
"exercise_editor": {
  "title_new": "Nouveau mouvement",
  "title_edit": "Modifier le mouvement",
  "name_label": "Nom",
  "name_placeholder": "Squat de l'archer",
  "description_label": "Comment le faire",
  "description_placeholder": "Pieds larges, transfère ton poids sur une jambe, garde l'autre tendue.",
  "details": "Détails",
  "details_hint": "Facultatif. Sans muscles, ce mouvement ne fait pas monter ton village et n'apparaît pas dans ton équilibre.",
  "muscles": "Muscles",
  "style": "Style",
  "difficulty": "Difficulté",
  "equipment": "Matériel",
  "pattern": "Famille de mouvement",
  "pattern_none": "Non défini",
  "seconds_per_rep": "Secondes par répétition",
  "save": "Enregistrer",
  "name_required": "Donne un nom à ce mouvement.",
  "name_taken": "Tu as déjà un mouvement de ce nom.",
  "save_failed": "Impossible d'enregistrer le mouvement."
}
```

- [ ] **Step 4: Write the screen**

Create `app/exercises/new.tsx`:

```tsx
import { ChevronDown, ChevronUp } from "@tamagui/lucide-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Input, Text, XStack, YStack } from "tamagui";

import { AppButton } from "@/components/common/AppButton";
import { Card } from "@/components/common/Card";
import { Chip } from "@/components/common/Chip";
import { Stepper } from "@/components/common/Stepper";
import { useToast } from "@/components/common/Toast";
import { EQUIPMENT_LABELS } from "@/db/equipment";
import {
  createUserExercise,
  DEFAULT_USER_EXERCISE_DRAFT,
  getExerciseById,
  isUserExercise,
  updateUserExercise,
  type UserExerciseDraft,
} from "@/db/exercises";
import { MUSCLE_LABELS } from "@/db/muscles";
import {
  difficultyCodes,
  equipmentCodes,
  exerciseStyles,
  movementPatterns,
  muscleCodes,
  type MuscleCode,
} from "@/db/schema";
import { reportError } from "@/src/reportError";
import { useSettingsStore } from "@/stores/settings";

/**
 * Two fields, and a fold.
 *
 * The minimum a movement needs to exist is a name and how to do it; everything else has a
 * schema default that is honest on its own. The fold's own subtitle says what leaving it closed
 * costs, because an exercise with no muscles is counted nowhere — and `getMuscleBalance` prints
 * the same fact from the other side.
 *
 * Target type (reps vs time) is deliberately absent: it lives on `quest_exercises`, and the
 * quest editor already asks for it once per slot.
 */
export default function ExerciseEditor() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const language = useSettingsStore((s) => s.language);
  const { showError } = useToast();

  const params = useLocalSearchParams<{ id?: string }>();
  const editingId = params.id ? Number(params.id) : null;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [details, setDetails] = useState<Omit<UserExerciseDraft, "name" | "description">>(
    DEFAULT_USER_EXERCISE_DRAFT,
  );
  const [showDetails, setShowDetails] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editingId === null || Number.isNaN(editingId)) return;
    let cancelled = false;
    getExerciseById(editingId)
      .then((ex) => {
        if (cancelled || !ex || !isUserExercise(ex)) return;
        setName(ex.enName);
        setDescription(ex.enDescription);
        setDetails({
          muscles: ex.muscles,
          style: ex.style,
          difficulty: ex.difficulty,
          equipment: ex.equipment,
          pattern: ex.pattern,
          secondsPerRep: ex.secondsPerRep,
          imagePath: ex.imagePath,
        });
      })
      .catch((error) => reportError("exercises.editor.load", error));
    return () => {
      cancelled = true;
    };
  }, [editingId]);

  const toggleMuscle = (muscle: MuscleCode) =>
    setDetails((d) => ({
      ...d,
      muscles: d.muscles.includes(muscle)
        ? d.muscles.filter((m) => m !== muscle)
        : [...d.muscles, muscle],
    }));

  const handleSave = useCallback(async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      showError(t("exercise_editor.name_required"));
      return;
    }

    setSaving(true);
    try {
      const draft: UserExerciseDraft = {
        ...details,
        name: trimmedName,
        description: description.trim(),
      };
      if (editingId === null) await createUserExercise(draft);
      else await updateUserExercise(editingId, draft);
      router.back();
    } catch (error) {
      reportError("exercises.editor.save", error);
      // The only save failure a hero can act on: the partial unique index on their own names.
      const message = String(error);
      showError(
        /UNIQUE/i.test(message) ? t("exercise_editor.name_taken") : t("exercise_editor.save_failed"),
      );
    } finally {
      setSaving(false);
    }
  }, [details, description, editingId, name, router, showError, t]);

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32, gap: 16 }}
    >
      <Card>
        <YStack gap="$3">
          <Text fontWeight="700" fontSize={13} color="$textSecondary">
            {t("exercise_editor.name_label")}
          </Text>
          <Input
            testID="exercise-name"
            value={name}
            onChangeText={setName}
            placeholder={t("exercise_editor.name_placeholder")}
          />

          <Text fontWeight="700" fontSize={13} color="$textSecondary">
            {t("exercise_editor.description_label")}
          </Text>
          <Input
            testID="exercise-description"
            value={description}
            onChangeText={setDescription}
            placeholder={t("exercise_editor.description_placeholder")}
            multiline
            numberOfLines={4}
            height={110}
          />
        </YStack>
      </Card>

      <Card>
        <Pressable
          onPress={() => setShowDetails((v) => !v)}
          accessibilityRole="button"
          accessibilityState={{ expanded: showDetails }}
        >
          <XStack items="center" justify="space-between">
            <Text fontWeight="700" fontSize={13} color="$textSecondary">
              {t("exercise_editor.details")}
            </Text>
            {showDetails ? (
              <ChevronUp size={16} color="$textSecondary" />
            ) : (
              <ChevronDown size={16} color="$textSecondary" />
            )}
          </XStack>
        </Pressable>

        <Text fontSize={12} color="$textSecondary" opacity={0.8} pt="$2">
          {t("exercise_editor.details_hint")}
        </Text>

        {showDetails ? (
          <YStack gap="$4" pt="$3">
            <YStack gap="$2">
              <Text fontSize={12} color="$textSecondary">
                {t("exercise_editor.muscles")}
              </Text>
              <XStack gap="$2" flexWrap="wrap">
                {muscleCodes.map((muscle) => (
                  <Chip
                    key={muscle}
                    testID={`exercise-muscle-${muscle}`}
                    selected={details.muscles.includes(muscle)}
                    onPress={() => toggleMuscle(muscle)}
                  >
                    {MUSCLE_LABELS[muscle][language]}
                  </Chip>
                ))}
              </XStack>
            </YStack>

            <YStack gap="$2">
              <Text fontSize={12} color="$textSecondary">
                {t("exercise_editor.style")}
              </Text>
              <XStack gap="$2" flexWrap="wrap">
                {exerciseStyles.map((style) => (
                  <Chip
                    key={style}
                    selected={details.style === style}
                    onPress={() => setDetails((d) => ({ ...d, style }))}
                  >
                    {t(`exercise_style.${style}`, style)}
                  </Chip>
                ))}
              </XStack>
            </YStack>

            <YStack gap="$2">
              <Text fontSize={12} color="$textSecondary">
                {t("exercise_editor.difficulty")}
              </Text>
              <XStack gap="$2" flexWrap="wrap">
                {difficultyCodes.map((difficulty) => (
                  <Chip
                    key={difficulty}
                    selected={details.difficulty === difficulty}
                    onPress={() => setDetails((d) => ({ ...d, difficulty }))}
                  >
                    {t(`difficulty.${difficulty}`, difficulty)}
                  </Chip>
                ))}
              </XStack>
            </YStack>

            <YStack gap="$2">
              <Text fontSize={12} color="$textSecondary">
                {t("exercise_editor.equipment")}
              </Text>
              <XStack gap="$2" flexWrap="wrap">
                {equipmentCodes.map((equipment) => (
                  <Chip
                    key={equipment}
                    selected={details.equipment === equipment}
                    onPress={() => setDetails((d) => ({ ...d, equipment }))}
                  >
                    {EQUIPMENT_LABELS[equipment][language]}
                  </Chip>
                ))}
              </XStack>
            </YStack>

            <YStack gap="$2">
              <Text fontSize={12} color="$textSecondary">
                {t("exercise_editor.pattern")}
              </Text>
              <XStack gap="$2" flexWrap="wrap">
                <Chip
                  selected={details.pattern === null}
                  onPress={() => setDetails((d) => ({ ...d, pattern: null }))}
                >
                  {t("exercise_editor.pattern_none")}
                </Chip>
                {movementPatterns.map((pattern) => (
                  <Chip
                    key={pattern}
                    selected={details.pattern === pattern}
                    onPress={() => setDetails((d) => ({ ...d, pattern }))}
                  >
                    {t(`pattern.${pattern}`, pattern)}
                  </Chip>
                ))}
              </XStack>
            </YStack>

            <YStack gap="$2">
              <Text fontSize={12} color="$textSecondary">
                {t("exercise_editor.seconds_per_rep")}
              </Text>
              <Stepper
                value={details.secondsPerRep}
                min={1}
                max={30}
                onChange={(secondsPerRep) => setDetails((d) => ({ ...d, secondsPerRep }))}
              />
            </YStack>
          </YStack>
        ) : null}
      </Card>

      <AppButton
        testID="exercise-save"
        variant="primary"
        disabled={saving}
        onPress={handleSave}
        accessibilityRole="button"
        accessibilityLabel={t("exercise_editor.save")}
      >
        {t("exercise_editor.save")}
      </AppButton>
    </ScrollView>
  );
}
```

Before running: open `components/common/Chip.tsx` and `components/common/Stepper.tsx` and match
their real prop names (`selected` / `active`, `onChange` / `onValueChange`, whether `Stepper`
takes `min`/`max`). Match the file, not this plan. Likewise check `db/muscles.ts` and
`db/equipment.ts` for the actual shape of `MUSCLE_LABELS` / `EQUIPMENT_LABELS`, and reuse
whatever key `app/exercises/index.tsx` already uses for the pattern and difficulty labels rather
than inventing `pattern.*` / `difficulty.*` if those keys do not exist — that screen already
renders all three vocabularies.

Register the route in `app/exercises/_layout.tsx` next to the existing screens, with
`options={{ title: … }}` matching how `[id]` does it.

- [ ] **Step 5: Run the test and watch it pass**

Run: `npx jest __tests__/exercise-editor.test.tsx __tests__/i18n-keys.test.ts`
Expected: PASS.

- [ ] **Step 6: Run the suite and the type check**

Run: `npm test && npm run check`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add app/exercises/new.tsx app/exercises/_layout.tsx locales/en.json locales/fr.json __tests__/exercise-editor.test.tsx
git commit -m "feat(exercises): a hero can write their own movement

Two fields and a fold. A name and how to do it is enough to exist; the fold
says out loud what leaving it closed costs, because a movement with no muscles
is counted nowhere."
```

---

### Task 9: the catalogue shows, filters and manages hero movements

**Files:**
- Modify: `constants/exerciseFilters.ts`
- Modify: `app/exercises/index.tsx`
- Modify: `app/exercises/[id].tsx`
- Modify: `components/quests/ExercisePickerSheet.tsx`, `app/oath.tsx`
- Modify: `locales/en.json`, `locales/fr.json`
- Test: `__tests__/exercise-filters.test.ts` (extend)

**Interfaces:**
- Consumes: `pickableExercises`, `isUserExercise`, `retireUserExercise`, `deleteUserExercise`,
  `getExerciseUsage` (Tasks 5–6).
- Produces: `ExerciseFilters.mine: boolean` and `ExerciseFilters.retired: boolean`.

- [ ] **Step 1: Write the failing test**

Append to `__tests__/exercise-filters.test.ts`:

```ts
describe("hero-authored facets", () => {
  const seed = {
    id: 1,
    enName: "Squat",
    frName: "Squat",
    enDescription: "",
    frDescription: "",
    imagePath: "",
    creator: "Admin",
    difficulty: "medium",
    equipment: "none",
    style: "strength",
    secondsPerRep: 3,
    muscles: ["legs"],
    pattern: "squat",
    prerequisiteExerciseId: null,
    retiredAt: null,
  } as const;

  const mine = { ...seed, id: 2, enName: "Archer Squat", frName: "Archer Squat", creator: "hero" };
  const retired = { ...mine, id: 3, enName: "Old Note", frName: "Old Note", retiredAt: new Date() };

  const all = [seed, mine, retired];

  test("`mine` keeps only hero-authored movements", () => {
    const { filterExercises, NO_EXERCISE_FILTERS } =
      require("@/constants/exerciseFilters") as typeof import("@/constants/exerciseFilters");

    const result = filterExercises(all, { ...NO_EXERCISE_FILTERS, mine: true }, "en", new Map());
    expect(result.map((e) => e.enName)).toEqual(["Archer Squat"]);
  });

  test("retired movements are hidden until asked for", () => {
    const { filterExercises, NO_EXERCISE_FILTERS } =
      require("@/constants/exerciseFilters") as typeof import("@/constants/exerciseFilters");

    expect(
      filterExercises(all, NO_EXERCISE_FILTERS, "en", new Map()).map((e) => e.enName),
    ).toEqual(["Squat", "Archer Squat"]);

    expect(
      filterExercises(all, { ...NO_EXERCISE_FILTERS, retired: true }, "en", new Map()).map(
        (e) => e.enName,
      ),
    ).toEqual(["Old Note"]);
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx jest __tests__/exercise-filters.test.ts`
Expected: FAIL — the object literal has no `mine` property.

- [ ] **Step 3: Add the facets**

In `constants/exerciseFilters.ts`, add to `ExerciseFilters`:

```ts
  /** Only what the hero wrote themselves. */
  mine: boolean;
  /** Retired movements are out of every list until this is on — this is how they come back. */
  retired: boolean;
```

`mine: false, retired: false,` in `NO_EXERCISE_FILTERS`, and in `filterExercises`, add two
clauses to the predicate:

```ts
      (filters.retired ? e.retiredAt !== null : e.retiredAt === null) &&
      (!filters.mine || e.creator !== "Admin") &&
```

Import `ADMIN_CREATOR` from `@/db/exercises` and use it rather than the literal.

- [ ] **Step 4: Wire the catalogue**

In `app/exercises/index.tsx`, add the two toggles beside the existing handlers:

```tsx
const toggleMine = () => setFilters((f) => ({ ...f, mine: !f.mine }));
const toggleRetired = () => setFilters((f) => ({ ...f, retired: !f.retired }));

/** Only offer the two hero facets once there is hero content to filter. */
const hasHeroExercises = exercises.some((e) => e.creator !== ADMIN_CREATOR);
```

and append one more group to `railGroups`, before the trailing
`.filter((g) => g.chips.length > 0)` — which already drops it when the hero has written nothing:

```tsx
    {
      key: "mine",
      label: t("exercises.filter_group_mine", "Yours"),
      chips: hasHeroExercises
        ? [
            {
              key: "mine-only",
              label: t("exercises.mine"),
              active: filters.mine,
              onPress: toggleMine,
            },
            {
              key: "retired-only",
              label: t("exercises.retired"),
              active: filters.retired,
              onPress: toggleRetired,
            },
          ]
        : [],
    },
```

`ExerciseRow` already takes a `caption?: ReactNode` — the catalogue passes `LeadsToCaption` into
it today. The badge shares that slot rather than adding a prop:

```tsx
/** "Yours" — the one thing a row has to say about a movement the hero wrote. */
const MineCaption = ({ label }: { label: string }) => (
  <Text fontSize={12} color="$primaryText" fontWeight="700">
    {label}
  </Text>
);
```

and in `renderItem`, replace the `caption` line with:

```tsx
          caption={
            item.creator !== ADMIN_CREATOR ? (
              <MineCaption label={t("exercises.hero_badge")} />
            ) : nextName ? (
              <LeadsToCaption name={nextName} />
            ) : undefined
          }
```

A hero movement carries no ladder, so the two captions can never both apply — but write the
condition in that order anyway, because the day one does, "yours" is the more useful of the two.

Add the entry point to the header, next to the search `Input`:

```tsx
<AppIconButton
  testID="exercise-create"
  icon={<Plus size={20} color="$primaryText" />}
  onPress={() => router.push("/exercises/new" as never)}
  accessibilityLabel={t("exercise_editor.title_new")}
/>
```

with `Plus` added to the `@tamagui/lucide-icons` import and `ADMIN_CREATOR` to the
`@/db/exercises` one.

- [ ] **Step 5: Wire the two pickers that do not go through `filterExercises`**

In `components/quests/ExercisePickerSheet.tsx` and `app/oath.tsx`, wrap the list they build from
`listExercises()`:

```tsx
setCatalogue(pickableExercises(all));
```

(match each file's own setter name). These two never call `filterExercises`, so they need the
rule explicitly — that is the whole reason `pickableExercises` is an exported function and not
just another clause in the predicate.

- [ ] **Step 6: The detail screen gets Edit, Retire and Delete**

In `app/exercises/[id].tsx`, for a row where `isUserExercise(exercise)`, add three actions:
Edit (`router.push({ pathname: "/exercises/new", params: { id } })`), Retire, and Delete. Decide
between the last two with `getExerciseUsage(id)`: both counts zero shows Delete, otherwise show
Retire. Confirm Delete with `Alert.alert`, exactly as `PausedOverlay` confirms quitting a session.

- [ ] **Step 7: The strings**

New keys in both locale files:

```json
"exercises": {
  "mine": "Mine",
  "filter_group_mine": "Yours",
  "retired": "Retired",
  "hero_badge": "Yours",
  "edit": "Edit",
  "retire": "Retire",
  "retire_body": "It leaves the lists you pick from. Your past sessions, records and village keep it.",
  "delete": "Delete",
  "delete_confirm_title": "Delete this movement?",
  "delete_confirm_body": "You have never used it, so nothing else changes."
}
```

French:

```json
"exercises": {
  "mine": "Les miens",
  "filter_group_mine": "À toi",
  "retired": "Retirés",
  "hero_badge": "À toi",
  "edit": "Modifier",
  "retire": "Retirer",
  "retire_body": "Il quitte les listes où tu choisis. Tes séances passées, tes records et ton village le gardent.",
  "delete": "Supprimer",
  "delete_confirm_title": "Supprimer ce mouvement ?",
  "delete_confirm_body": "Tu ne l'as jamais utilisé, donc rien d'autre ne change."
}
```

(Merge into the existing `exercises` object in each file if one is already there — do not create
a second key of the same name.)

- [ ] **Step 8: Run the tests and watch them pass**

Run: `npx jest __tests__/exercise-filters.test.ts __tests__/exercise-catalogue.test.tsx __tests__/filter-rail.test.tsx __tests__/i18n-keys.test.ts`
Expected: PASS.

- [ ] **Step 9: Run the suite and the type check**

Run: `npm test && npm run check`
Expected: PASS.

- [ ] **Step 10: Commit**

```bash
git add constants/exerciseFilters.ts app/exercises components/quests/ExercisePickerSheet.tsx app/oath.tsx locales __tests__/exercise-filters.test.ts
git commit -m "feat(exercises): the catalogue shows what the hero wrote, and lets them retire it

Retired rows leave every list you pick from and stay in every list that reads
history — which is the whole difference between retiring and deleting."
```

---

### Task 10: the content invariants keep meaning what they meant

**Files:**
- Modify: `__tests__/content-invariants.test.ts`

**Interfaces:** none.

**Background:** two invariants there — *"every exercise declares a movement pattern"* and
*"every exercise in the catalogue is used by at least one quest"* — were written when every row
was seed content. A hero row legitimately breaks both. They run against a freshly-migrated test
database today, so they pass; scoping them now is what stops a future test that seeds a hero row
from being "fixed" by weakening the rule.

- [ ] **Step 1: Scope both to seed content**

In each of those two tests, filter the exercise list before asserting:

```ts
const seeded = all.filter((e) => e.creator === "Admin");
```

and assert over `seeded`. Add one comment above the first:

```ts
// Seed content only. `exercises` holds two populations since `0035`, and a hero-authored
// movement is allowed to have no pattern and to belong to no quest — these rules are about the
// catalogue the app ships, not about what someone writes in it.
```

- [ ] **Step 2: Run it and confirm it still passes**

Run: `npx jest __tests__/content-invariants.test.ts`
Expected: PASS, with the same number of tests as before.

- [ ] **Step 3: Fix the test helper's false claim**

`__tests__/helpers/testDb.ts` runs `sqlite.pragma("foreign_keys = ON")` under the comment *"Keep
SQLite behavior close to the app DB"* — but the app issues no such pragma, so on a device
foreign keys are **off**. Leave the pragma (a stricter test database is a feature) and correct
the comment:

```ts
  // Stricter than the app on purpose: db/client.ts issues no `PRAGMA foreign_keys`, so on a
  // device the ON DELETE clauses in the schema do nothing. Enforcing them here catches a bad
  // reference in a test that the device would swallow — but never assume the app enforces one.
  // This is why `deleteUserExercise` counts rows instead of trusting a constraint.
  sqlite.pragma("foreign_keys = ON");
```

- [ ] **Step 4: Commit**

```bash
git add __tests__/content-invariants.test.ts __tests__/helpers/testDb.ts
git commit -m "test: content invariants are about the catalogue we ship, not what a hero writes"
```

---

# Phase 3 — Art

### Task 11: one resolver understands a URI

**Files:**
- Modify: `constants/assetMap.ts:518-537`
- Modify: `app/exercises/[id].tsx:29`
- Test: `__tests__/assetMap.test.ts` (extend)

**Interfaces:**
- Produces: `getExerciseAsset(id: string)` and `getExerciseThumb(id: string)` return
  `{ uri: string }` for anything that looks like a URI, and the bundled `require()` otherwise.

**Background:** only `app/exercises/[id].tsx` knows this trick today
(`path?.startsWith("http") ? { uri: path } : getExerciseAsset(path ?? "")`). `WarmupView`,
`ActiveExerciseView`, `ExerciseRow` and the new paused overlay all call the resolver directly and
would show the placeholder for a hero's photo. Absorbing it into the resolver is what makes one
source of this rule instead of five.

- [ ] **Step 1: Write the failing test**

Append to `__tests__/assetMap.test.ts`:

```ts
test("a URI or data URI resolves to itself, not the placeholder", () => {
  const dataUri = "data:image/jpeg;base64,/9j/4AAQSkZJRg==";
  expect(getExerciseAsset(dataUri)).toEqual({ uri: dataUri });
  expect(getExerciseThumb(dataUri)).toEqual({ uri: dataUri });
  expect(getExerciseAsset("file:///data/user/0/x.jpg")).toEqual({
    uri: "file:///data/user/0/x.jpg",
  });
  expect(getExerciseAsset("https://example.test/x.jpg")).toEqual({
    uri: "https://example.test/x.jpg",
  });
});

test("a bundled path still resolves to the bundled asset", () => {
  expect(getExerciseAsset("assets/images/exercises/squat.png")).toBe(EXERCISE_ASSETS.squat);
});
```

Add `getExerciseThumb` and `EXERCISE_ASSETS` to that file's import if they are not already there.

- [ ] **Step 2: Run it and watch it fail**

Run: `npx jest __tests__/assetMap.test.ts`
Expected: FAIL — the data URI resolves to the placeholder `require()`.

- [ ] **Step 3: Teach the resolver**

In `constants/assetMap.ts`, above `getExerciseAsset`:

```ts
/**
 * A hero-authored movement carries its picture in the row, either as a bundled path it picked
 * from the catalogue's art or as a `data:` URI of a photo (see `0035` and the exercise editor).
 * The resolver takes both, so the five screens that render an exercise do not each need to know.
 */
function asUriSource(id: string): { uri: string } | null {
  return /^(data:|file:|content:|https?:)/.test(id) ? { uri: id } : null;
}
```

and make both getters start with `return asUriSource(id) ?? (…existing lookup…);`.

Then simplify `app/exercises/[id].tsx:29` to call `getExerciseAsset(path ?? "")` with no ternary,
and delete the local helper it defined.

- [ ] **Step 4: Run the tests and watch them pass**

Run: `npx jest __tests__/assetMap.test.ts`
Expected: PASS.

- [ ] **Step 5: Run the suite and the type check**

Run: `npm test && npm run check`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add constants/assetMap.ts app/exercises/[id].tsx __tests__/assetMap.test.ts
git commit -m "refactor(assets): the exercise resolver understands a URI, so five screens don't have to"
```

---

### Task 12: pick an illustration, or a photo

**Files:**
- Modify: `package.json` (add `expo-image-manipulator`)
- Create: `components/exercises/ExerciseImagePicker.tsx`
- Modify: `app/exercises/new.tsx`
- Modify: `__tests__/android-permissions.test.ts`
- Modify: `locales/en.json`, `locales/fr.json`
- Test: `__tests__/exercise-image-picker.test.tsx` (new)

**Interfaces:**
- Consumes: `EXERCISE_THUMB_ASSETS` from `constants/assetMap.ts`, `UserExerciseDraft.imagePath`.
- Produces:
  ```ts
  export function ExerciseImagePicker(props: {
    value: string;
    onChange: (imagePath: string) => void;
  }): JSX.Element;

  /** Exported for the test: picker URI -> a `data:` URI small enough to live in a row. */
  export function encodePhoto(uri: string): Promise<string>;
  ```

**Background:** the picture goes **in the row**, as a `data:` URI, because a backup is a
`VACUUM INTO` of the database file alone — a `file://` path would survive on this phone and
arrive broken on the next one, and `expo-image-picker`'s own URI lives in a cache directory
Android may clear. `app/settings.tsx` is the model for the permission flow, including the
"silently-declined permission used to make this row do nothing, forever" branch.

- [ ] **Step 1: Add the dependency the Expo way**

Run: `npx expo install expo-image-manipulator`
Then: `npx expo-doctor`
Expected: 20/20 green. `expo install` picks the version in this SDK's matrix, which is what keeps
doctor green — never add it with `npm install` and a hand-written range.

- [ ] **Step 2: Widen the permission justification**

In `__tests__/android-permissions.test.ts`, change the `READ_EXTERNAL_STORAGE` entry to:

```ts
  "android.permission.READ_EXTERNAL_STORAGE":
    "expo-image-picker, capped at maxSdkVersion 32 — picking an avatar photo, picking a photo " +
    "for a hero-authored exercise, and reading a backup file the hero chose.",
```

Run: `npx jest __tests__/android-permissions.test.ts`
Expected: PASS, and no new permission appears. `expo-image-manipulator` declares none; if the
test reports one, stop and read it rather than adding it to `ALLOWED`.

- [ ] **Step 3: Write the failing test**

Create `__tests__/exercise-image-picker.test.tsx`:

```tsx
const manipulate = jest.fn().mockResolvedValue({ base64: "QUJD" });

jest.mock("expo-image-manipulator", () => ({
  manipulateAsync: manipulate,
  SaveFormat: { JPEG: "jpeg" },
}));

import { encodePhoto } from "@/components/exercises/ExerciseImagePicker";

describe("encodePhoto", () => {
  test("resizes before encoding, and returns a data URI", async () => {
    const result = await encodePhoto("file:///tmp/huge.jpg");

    expect(manipulate).toHaveBeenCalledWith(
      "file:///tmp/huge.jpg",
      [{ resize: { width: 512 } }],
      expect.objectContaining({ base64: true }),
    );
    expect(result).toBe("data:image/jpeg;base64,QUJD");
  });

  test("throws rather than storing an unbounded blob when encoding gives nothing", async () => {
    manipulate.mockResolvedValueOnce({ base64: undefined });
    await expect(encodePhoto("file:///tmp/x.jpg")).rejects.toThrow();
  });
});
```

- [ ] **Step 4: Run it and watch it fail**

Run: `npx jest __tests__/exercise-image-picker.test.tsx`
Expected: FAIL — cannot resolve `@/components/exercises/ExerciseImagePicker`.

- [ ] **Step 5: Write the component**

Create `components/exercises/ExerciseImagePicker.tsx`:

```tsx
import { Image } from "expo-image";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView } from "react-native";
import { Text, XStack, YStack } from "tamagui";

import { AppButton } from "@/components/common/AppButton";
import { EXERCISE_THUMB_ASSETS, getExerciseThumb } from "@/constants/assetMap";
import { useToast } from "@/components/common/Toast";
import { reportError } from "@/src/reportError";

/** Wide enough to read on a session hero, small enough that fifty of them stay a couple of MB. */
const MAX_WIDTH = 512;

/**
 * A photo becomes part of the row, not a file beside it.
 *
 * A backup is `VACUUM INTO` of the database alone (`db/backup.ts`), so a `file://` path would
 * survive on this phone and arrive broken on the next one — and the picker's own URI lives in a
 * cache directory Android may clear underneath it.
 *
 * ponytail: the picture lives in the row so the backup carries it. Ceiling: row size — 512 px at
 * q0.6 is ~40 KB, so fifty of them is ~2 MB, and every automatic backup pays it. If someone ever
 * fills a catalogue this way, move the blobs to their own table and teach the exporter about a
 * second file.
 */
export async function encodePhoto(uri: string): Promise<string> {
  const result = await ImageManipulator.manipulateAsync(uri, [{ resize: { width: MAX_WIDTH } }], {
    compress: 0.6,
    format: ImageManipulator.SaveFormat.JPEG,
    base64: true,
  });
  if (!result.base64) throw new Error("Image encoding returned no data");
  return `data:image/jpeg;base64,${result.base64}`;
}

const ILLUSTRATIONS = Object.keys(EXERCISE_THUMB_ASSETS);

export function ExerciseImagePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (imagePath: string) => void;
}) {
  const { t } = useTranslation();
  const { showError } = useToast();
  const [busy, setBusy] = useState(false);

  const pickPhoto = async () => {
    setBusy(true);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        // A silently-declined permission used to make the avatar row do nothing, forever.
        showError(t("settings.photos_denied"));
        return;
      }

      const picked = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });
      if (picked.canceled) return;

      const asset = picked.assets[0];
      if (!asset) return;
      onChange(await encodePhoto(asset.uri));
    } catch (error) {
      reportError("exercises.image", error);
      showError(t("exercise_editor.image_failed"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <YStack gap="$3">
      <Text fontSize={12} color="$textSecondary">
        {t("exercise_editor.image")}
      </Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <XStack gap="$2">
          {ILLUSTRATIONS.map((key) => (
            <YStack
              key={key}
              onPress={() => onChange(key)}
              borderWidth={2}
              borderColor={value === key ? "$primaryText" : "transparent"}
              rounded="$4"
              overflow="hidden"
            >
              <Image
                source={getExerciseThumb(key)}
                style={{ width: 64, height: 64 }}
                contentFit="cover"
              />
            </YStack>
          ))}
        </XStack>
      </ScrollView>

      <AppButton
        testID="exercise-photo"
        variant="outline"
        disabled={busy}
        onPress={pickPhoto}
        accessibilityRole="button"
        accessibilityLabel={t("exercise_editor.image_from_photos")}
      >
        {t("exercise_editor.image_from_photos")}
      </AppButton>
    </YStack>
  );
}
```

- [ ] **Step 6: Put it in the fold**

In `app/exercises/new.tsx`, inside the `showDetails` block, below the seconds-per-rep stepper:

```tsx
<ExerciseImagePicker
  value={details.imagePath}
  onChange={(imagePath) => setDetails((d) => ({ ...d, imagePath }))}
/>
```

Add three keys to each locale file — `exercise_editor.image`,
`exercise_editor.image_from_photos`, `exercise_editor.image_failed`:

```json
"image": "Picture",
"image_from_photos": "Use a photo",
"image_failed": "Could not read that picture."
```

```json
"image": "Image",
"image_from_photos": "Utiliser une photo",
"image_failed": "Impossible de lire cette image."
```

Confirm `settings.photos_denied` exists in both locale files (it does — `app/settings.tsx` uses
it) before reusing the key.

- [ ] **Step 7: Run the tests and watch them pass**

Run: `npx jest __tests__/exercise-image-picker.test.tsx __tests__/android-permissions.test.ts __tests__/i18n-keys.test.ts __tests__/exercise-editor.test.tsx`
Expected: PASS. `exercise-editor.test.tsx` will need `expo-image-manipulator` and
`expo-image-picker` mocked at the top now that the editor imports the picker; add the same
`jest.mock` blocks the new test uses.

- [ ] **Step 8: Run the suite, the type check and doctor**

Run: `npm test && npm run check && npx expo-doctor && npm run deadcode`
Expected: all green. `npm run deadcode` matters here specifically: a picker exported and never
mounted is exactly the "control wired to nothing" the quality rules warn about.

- [ ] **Step 9: Commit**

```bash
git add package.json package-lock.json components/exercises/ExerciseImagePicker.tsx app/exercises/new.tsx __tests__ locales
git commit -m "feat(exercises): a hero movement gets art — a bundled illustration or a photo

The photo lives in the row rather than beside it, because a backup is a
VACUUM INTO of the database alone: a file path would survive on this phone and
arrive broken on the next one. Resized to 512 px first, so fifty of them stay a
couple of megabytes rather than fifty."
```

---

### Task 13: the docs stop saying this was refused

**Files:**
- Modify: `docs/planning/roadmap.md` (§ *Scanned and refused*)
- Create: `docs/architecture/exercise-ownership.md`
- Modify: `docs/architecture/README.md`, `docs/README.md`

**Interfaces:** none.

- [ ] **Step 1: Rewrite the roadmap line**

In `docs/planning/roadmap.md`, the § *Scanned and refused* table row beginning
**"Hero-authored exercises (GymMane…"** — replace its "Refused because" cell with:

```markdown
**Shipped 2026-08.** The refusal read: *"no art, no muscle mapping, no pattern and no XP weight,
so it breaks the village, the boss and the estimate at once."* Three of the four were wrong when
checked against the code — XP is duration-only (`db/xp.ts`), the estimate reads a `secondsPerRep`
that has a `NOT NULL DEFAULT 3`, and `exercises.pattern` was already nullable with the comment
*"Null only for user-authored content"*. The fourth was right: art is the reason it took a
picture picker. What the refusal missed entirely is the thing that made it urgent — the global
unique index on `enName` meant a hero-authored name colliding with a later seed would have
bricked the app on that device. See `docs/architecture/exercise-ownership.md`.
```

Keep the row in the table. A refusal that quietly disappears teaches nothing, which is what that
whole section exists to prevent.

- [ ] **Step 2: Write the architecture page**

Create `docs/architecture/exercise-ownership.md`. Read `docs/architecture/database-api.md` first
and match its frontmatter and tone; the content is this:

````markdown
---
title: Who owns an exercise
type: technical
status: active
updated: 2026-08-25
related: [database-api.md, ../planning/roadmap.md, ../../AGENTS.md]
---

# Who owns an exercise

`exercises` holds two populations. `creator` tells them apart: `'Admin'` is seed content, written
by migrations and updated by them; `'hero'` is what someone wrote in the app. Every rule on this
page exists because those two share one table.

## The name is the contested namespace, not the id

`exercises.id` is `AUTOINCREMENT` — seeding order. It was never an identity anyone shares:
nothing outside the database references it, and a backup is a `VACUUM INTO` of the whole file
(`db/backup.ts`), so ids travel together or not at all. There is no row-level merge that could
get one wrong.

Seed content addresses movements **by `enName`**, and says so: `0032`'s header, `PATH_NAMES` in
`db/paths.ts`, `WARMUP_MOVEMENTS` in `constants/warmup.ts`. So the name is what can collide.

## Why the unique index is partial

Before `0035` the index was global:

```sql
CREATE UNIQUE INDEX exercises_en_name_unique ON exercises (enName);
```

Seven migrations run bare `INSERT INTO exercises`, and `db/migrate.ts` runs the whole journal
inside one `BEGIN IMMEDIATE`. So a hero row named *Dead Bug* plus a later content migration
seeding the official *Dead Bug* is:

```
UNIQUE constraint failed: exercises.enName
  -> ROLLBACK
  -> ensureMigrations() throws
  -> the app does not open, and will fail identically on every launch
```

No in-app recovery exists for that. `0035` replaces it with one index per population, so the two
namespaces cannot reach each other:

```sql
CREATE UNIQUE INDEX exercises_admin_name_unique ON exercises (enName) WHERE creator = 'Admin';
CREATE UNIQUE INDEX exercises_hero_name_unique  ON exercises (enName) WHERE creator <> 'Admin';
```

A hero may take a name the seed already owns, and a future seed may take a name a hero already
owns. Neither can break the other, and uniqueness still holds *inside* each population.

## The one rule every future migration obeys

**Every `UPDATE` or `DELETE` on `exercises` in a migration scopes itself to `creator`.**

`INSERT` needs no guard — the column defaults to `'Admin'`. `UPDATE` does: `0023`, `0029`,
`0030` and `0031` all rewrite rows `WHERE enName = '…'`, and from `0035` on that predicate can
find a row the hero wrote.

`__tests__/seed-migration-guard.test.ts` enforces this by reading `drizzle/*.sql`. It
grandfathers five files — `0018`, `0023`, `0029`, `0030`, `0031` — which are safe forever rather
than tolerated: the whole journal runs before the app is usable, so no hero row can exist while
they execute. It is a ratchet; add a justification, never widen the list to make a build pass.

## Deletion is retirement

`db/client.ts` issues no `PRAGMA foreign_keys`, so SQLite leaves them **off** and every
`ON DELETE CASCADE` in the schema is decoration. Nine queries `innerJoin` this table:
`db/completed.ts` ×2, `db/muscleBalance.ts` ×3, `db/personalRecords.ts`, `db/village.ts`,
`db/quests.ts` ×2.

Removing a row therefore removes past volume, can drop a village building a level, can erase a
personal record, and can empty a quest — at which point `getQuestById` returns `null` and the
quest reads as "not found". None of it warns.

So `retiredAt` is the normal path, and a hard delete is only allowed for a row nothing has ever
used. `getExerciseUsage(id)` counts `completed_exercises` and `quest_exercises`, and
`deleteUserExercise` refuses on any non-zero. The count is the enforcement, because the
constraint is not.

Note that `__tests__/helpers/testDb.ts` *does* turn foreign keys on. That is deliberately
stricter than the device — it catches a bad reference a phone would swallow — but it means a
test can never be the evidence that a delete is safe.

## Where hiding happens

`listExercises()` **keeps returning retired rows**. `db/adventures.ts`, `db/questConfig.ts` and
the quest screen all resolve a quest's exercise ids out of that one cached list, and a quest
holding a retired movement has to keep working.

Hiding belongs at the moment of choosing, and lives once, in `pickableExercises(all)`. Three
surfaces call it: the catalogue (through `filterExercises`), the quest editor's picker sheet, and
the oath screen.

The cache is invalidated by every writer in `db/exercises.ts` via `invalidateExercisesCache()` —
its docblock used to say this table was static seed content with no in-app editing, which stopped
being true here.

## A hero's picture lives in the row

`imagePath` holds one of three things: a bundled asset path, a bundled illustration key, or a
`data:image/jpeg;base64,…` photo. `getExerciseAsset` / `getExerciseThumb` resolve all three.

The photo is in the row rather than in a file because an export is a `VACUUM INTO` of the
database alone: a `file://` path would survive on this phone and arrive broken on the next one,
and `expo-image-picker`'s own URI lives in a cache directory Android may clear. It is resized to
512 px before encoding — see the `ponytail:` note in `components/exercises/ExerciseImagePicker.tsx`
for the ceiling and the upgrade path.

## What a hero movement is allowed not to have

`pattern` is nullable and always was — its own schema comment reads *"Null only for user-authored
content"*. `muscles` may be empty. Neither is a bug, and neither is silently absorbed:
`getMuscleBalance()` returns `unclassifiedResults` and the journal's balance card prints how many
results it is not counting, rather than reporting a smaller total and looking confident about it.
````

- [ ] **Step 3: Update the catalogs**

Add the page to `docs/architecture/README.md` and to the root `docs/README.md` catalog. The wiki
protocol (`docs/meta/wiki-protocol.md`) says the catalog is updated on every add.

- [ ] **Step 4: Commit**

```bash
git add docs/
git commit -m "docs: hero-authored exercises, and why the refusal was reopened"
```

---

## Verification before calling this done

- [ ] `npm test` — full suite green.
- [ ] `npm run check` — types and Biome green.
- [ ] `npm run deadcode` — nothing new orphaned. Every writer in `db/exercises.ts` has a caller,
      and `ExerciseImagePicker` is mounted.
- [ ] `npx expo-doctor` — 20/20.
- [ ] `npx prek run --all-files`.
- [ ] **On a device**, with `npx expo run:android` then `npx expo start --dev-client`:
  - create a movement with the fold closed → it appears in the catalogue under "Mine" and can be
    added to a quest;
  - run a session with it, then try to delete it → the app offers Retire, not Delete;
  - retire it → it leaves the picker and the journal still shows the session;
  - open the journal's balance card → the unclassified line is there and its count is right;
  - pause mid-exercise → the movement's art, name and full description are readable;
  - export a backup, wipe app data, restore → the hero movement and its photo both come back.

The last one is the only check that proves the picture-in-the-row decision, and no test can run it.
