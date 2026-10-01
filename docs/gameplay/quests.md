# Quests

## Overview

A **Quest** is a workout template — a structured set of exercises you can run as a training session. In RPG terms, each quest is a "mission" to complete.

---

## 🎯 What is a Quest?

Think of quests as pre-designed workout routines:

- Each quest has a theme (arms, back, full body, etc.)
- Contains a specific set of exercises
- Defines rounds, rest periods, and targets
- Can be standalone or part of an Adventure

---

## 📋 Quest Structure

### Core Properties

| Property | Type | Description |
| -------- | ---- | ----------- |
| `id` | number | Unique identifier |
| `enTitle` / `frTitle` | string | Localized title |
| `enDescription` / `frDescription` | string | Localized description |
| `author` | string | Content creator ("Admin" for built-in) |
| `rounds` | number | How many times to repeat all exercises |
| `restSeconds` | number | Rest between sets (in seconds) |
| `roundRestSeconds` | number \| null | Longer rest taken when a round ends. `null` = no separate round rest, `restSeconds` applies there too |

### Quest Exercises

Each quest contains an ordered list of exercises:

| Property | Type | Description |
| -------- | ---- | ----------- |
| `exerciseId` | number | Reference to exercise |
| `sortOrder` | number | Order in the quest |
| `targetType` | 'reps' or 'time' | How to measure completion |
| `targetMin` | number | Minimum target (reps or seconds) |
| `targetMax` | number | Maximum target (adjusted by difficulty) |
| `imagesJson` | string | JSON array of image paths |

---

## 🎮 Quest Types

### By Focus

| Type | Description | Color |
| ---- | ----------- | ----- |
| **Arms** | Biceps, triceps, forearms | Pink |
| **Back** | Pull-ups, rows, deadlifts | Blue |
| **Chest** | Push-ups, bench, flies | Yellow |
| **Abs** | Core, planks, crunches | Green |
| **Shoulders** | Presses, raises | Purple |
| **Legs** | Squats, lunges, calves | Orange |
| **Full Body** | Mixed muscles | Purple (mixed) |

### By Difficulty

| Difficulty | Target Adjustment | XP Multiplier |
| ---------- | ----------------- | ------------- |
| **Easy** | Targets x0.75 | 0.9x |
| **Medium** | Targets x1.0 | 1.0x |
| **Hard** | Targets x1.25 | 1.2x |

Difficulty moves the *numbers*. It never changes the *movement* — which is why it is not, on its
own, an answer to "this is beyond me". That is the section below.

### The slot serves the rung the hero is on

A quest names a movement; `getQuestById` serves the one the hero is actually working. If the
ladder (`prerequisiteExerciseId`) puts Wall Push-Up under Knee Push-Up under Push-ups, and the
rungs below are not yet behind the hero, the push-up slot runs as Wall Push-Up. The slot carries
`substitutedFor` so both the quest card and the session screen can say "Working up to Push-ups",
and the swap sheet is one tap away for anyone who wants the written movement anyway.

Where the hero stands is the same reading the exercise screen shows, one function for both
(`rungsBehind`, [paths.md](paths.md) § Owning a rung): a rung is behind the hero once it was owned
ever, or once a rung above it was owned ever or has one on-target session in the 56-day window. So
the app never prescribes something it is simultaneously telling the hero to work up to, and a hero
who climbed to push-ups is not served wall push-ups again once those old sessions age out of the
window (rule changed 2026-09-15; before, a level-52 hero was handed Wall Sit, Wall Push-Up and
Dead Bug by Chop Wood).

Four things it never does: override an explicit swap, touch a quest the hero authored themselves,
substitute upward, or carry the quest's own artwork onto a movement it does not depict.

**Why it exists.** [Issue #33](https://github.com/Guiforge/bati/issues/33): a beginner did wall
push-ups on day one and was handed classical push-ups on day two. The only way past was to type
"1" — the lowest the field accepts — which then fed muscle volume, the weak-area read and every
target generated from them. The app had the ladder recorded the whole time; it just was not
reading it when it mattered. A session can now also skip a set outright, which writes no row at
all rather than a number nobody performed.

### A set-aside exercise is never served without saying so

The second reason a slot runs something other than what it names. One action, one verb, "Don't
suggest again" ("Ne plus me proposer"), from three places: the exercise's own page (which is also
how the warm-up preview's rows reach it), a toggle at the top of either Replace sheet (committed
only when the replacement is picked), and a text action on a step of the running warm-up. The
state is "Set aside" ("Écarté"). The list lives in Settings > Set-aside exercises, where each one
can be put back; a slot standing in for one offers "Put X back" in its open panel.

After setting aside, a toast says "X won't be suggested again" with a **Put back** button, except
on the exercise page, whose own button turns into "Put back". Put back returns it to the list and
nothing else: swaps and target numbers dropped when it was set aside stay dropped, and a running
warm-up carries on without the step (the next one includes it). The toast sits at the top, takes
the tap (it used to let taps through to the control under it), and stays longer when it carries a
button.

What it changes:

- **Quest slots.** `loadSlotJournal` resolves the replacement once (`SlotJournal.replaced`, which
  outranks `served`), so the quest screen, Home and every gallery card agree. The replacement is
  `setAsideReplacement`: an easier rung, the same pattern, or the same push/pull family, seed
  content only, never a harder rung, never anything the hero lacks the kit or the rung for, never
  another set-aside one. The caption reads "Instead of X (set aside)".
- **Nothing close enough.** The slot runs as written and says so ("Set aside, nothing close to
  stand in", `QuestExercise.setAsideServed`), with Replace in its panel. Decided 2026-10-01 over
  dropping the slot, which would change the quest's XP, duration and boss damage, and leave a quest
  whose every slot is set aside impossible to start.
- **The hero's own quests** are never substituted, and say so the same way ("your quest keeps it
  as you wrote it").
- **The warm-up.** `unavailableMovements()` includes the list (seed rows only), the wrist step
  included, and a phase that runs out of its own pool fills from `NO_IMPACT` (Squat, Lunge, Bear
  Crawl, Glute Bridge). Everything set aside leaves an empty warm-up, which is skipped.
- **Saved configs.** Swaps to the exercise, and target numbers on slots that name it, are dropped
  when it is set aside (`db/setAside.ts`): a config is applied after the slot is resolved.
- **Before the tap**, the exercise page says what it costs: a rung with a next step stops its path
  there, and an oath on it stops moving.

No category feature: a hero who does not want to jump sets each jump aside when they meet it
(decided 2026-10-01; a "no jumping" or "spare the wrists" toggle would promise what the catalogue
cannot keep, since nothing hands-free stands in for a push-up).

Mid-session, the Replace sheet's toggle swaps the current slot only; another slot of the same
running session that serves the exercise keeps it until the next session is built. The warm-up
action takes every step of the exercise out of the running warm-up, including any already passed,
so Previous cannot walk back onto one.

Left alone: pickers the hero drives by hand (the quest editor, the oath) and the catalogue.

Kept per device: the list stores ids, which differ between devices for seed rows written after
`0035`, so it stays out of `MERGED_PREFERENCES` (see the `ponytail:` on `getSetAsideExercises`).

**Why it exists.** [Issue #145](https://github.com/Guiforge/bati/issues/145): "I can't jump due to
physical limitations", and the only way past the jumps was to skip the whole warm-up, every time.

### By Duration

| Duration | Est. Time | Rounds |
| -------- | --------- | ------ |
| **Quick** | 10-15 min | 1-2 |
| **Standard** | 20-30 min | 3-4 |
| **Epic** | 40-60 min | 5+ |

---

## 💾 Database Schema

```sql
-- Quest templates
CREATE TABLE quests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  enTitle TEXT NOT NULL,
  frTitle TEXT NOT NULL,
  enDescription TEXT NOT NULL,
  frDescription TEXT NOT NULL,
  author TEXT NOT NULL DEFAULT 'Admin',
  rounds INTEGER NOT NULL DEFAULT 1,
  restSeconds INTEGER NOT NULL DEFAULT 30,
  roundRestSeconds INTEGER,
  createdAt INTEGER,
  updatedAt INTEGER
);

-- Exercises within quests
CREATE TABLE quest_exercises (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  questId INTEGER NOT NULL REFERENCES quests(id) ON DELETE CASCADE,
  exerciseId INTEGER NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  sortOrder INTEGER NOT NULL,
  targetType TEXT NOT NULL,      -- 'reps' | 'time'
  targetMin INTEGER NOT NULL,
  targetMax INTEGER NOT NULL,
  imagesJson TEXT NOT NULL DEFAULT '[]'
);

-- Indexes for performance
CREATE INDEX quest_exercises_quest_idx ON quest_exercises(questId);
CREATE UNIQUE INDEX quest_exercises_quest_sort_unique
  ON quest_exercises(questId, sortOrder);
```

---

## 🔧 API Functions

### Fetching Quests

```typescript
// db/quests.ts

// Get all quests with their exercises
export async function getQuests(): Promise<Quest[]>

// Get a single quest by ID
export async function getQuestById(id: number): Promise<Quest | null>

// Get quests filtered by muscle
export async function getQuestsByMuscle(muscle: MuscleCode): Promise<Quest[]>

// Get quests filtered by equipment
export async function getQuestsByEquipment(equipment: EquipmentCode): Promise<Quest[]>
```

### Quest Templates

```typescript
export interface Quest {
  id: number;
  enTitle: string;
  frTitle: string;
  enDescription: string;
  frDescription: string;
  author: string;
  rounds: number;
  restSeconds: number;
  roundRestSeconds: number | null;
  exercises: QuestExercise[];
  createdAt: Date;
  updatedAt: Date;
}

export interface QuestExercise {
  id: number;
  exerciseId: number;
  exercise: Exercise;
  sortOrder: number;
  targetType: 'reps' | 'time';
  targetMin: number;
  targetMax: number;
  images: string[];
}
```

---

## 📱 UI Integration

### Quest Card

```text
┌─────────────────────────────────────────────┐
│  [🖼️ Exercise Preview Image]                │
│                                             │
│  ⚔️ IRON ARMS CHALLENGE                     │
│  "Build legendary arm strength with         │
│   this focused bicep and tricep workout"    │
│                                             │
│  ⏱️ ~20 min  •  🔄 3 rounds  •  💪 Arms     │
└─────────────────────────────────────────────┘
```

### Quest Detail Screen

```text
┌─────────────────────────────────────────────┐
│              ← Back                         │
├─────────────────────────────────────────────┤
│                                             │
│           [🖼️ Hero Image]                   │
│                                             │
│         ⚔️ IRON ARMS CHALLENGE               │
│         "Build legendary arm strength"       │
│                                             │
├─────────────────────────────────────────────┤
│   📊 STATS                                  │
│   Rounds: 3  •  Exercises: 5  •  ~20 min    │
│                                             │
├─────────────────────────────────────────────┤
│   📋 EXERCISES                              │
│   ┌─────────────────────────────────────┐   │
│   │ 1. Push-ups           12-15 reps    │   │
│   │ 2. Diamond Push-ups    8-10 reps    │   │
│   │ 3. Tricep Dips        10-12 reps    │   │
│   │ 4. Bicep Curls        12-15 reps    │   │
│   │ 5. Hammer Curls       10-12 reps    │   │
│   └─────────────────────────────────────┘   │
│                                             │
├─────────────────────────────────────────────┤
│          [🚀 START QUEST]                   │
└─────────────────────────────────────────────┘
```

### Quest Carousel (Home)

The home screen features a swipeable carousel of recommended quests:

- Recently played
- Matching user goals
- New/featured content

---

## 🎯 Running a Quest

### Flow

1. User selects quest from list/carousel
2. Quest detail screen shows overview
3. User taps "Start Quest"
4. Session begins (see [SESSION.md](session-flow.md))
5. On completion, results saved to `completed_sessions`

### Completion Record

```typescript
interface CompletedSession {
  id: number;
  questId: number;
  performedAt: Date;
  durationSeconds: number;
  userLevel: DifficultyCode;
  xp: number;
  exercises: CompletedExercise[];
}

interface CompletedExercise {
  exerciseId: number;
  roundIndex: number;
  resultValue: number;  // Actual reps/seconds completed
}
```

---

## 🛠️ Creating Quests

### Seeding (Built-in Quests)

Quests are seeded via migration files:

```sql
-- drizzle/0008_seed_more_quests.sql
INSERT INTO quests (enTitle, frTitle, enDescription, frDescription, rounds, restSeconds)
VALUES ('Iron Arms', 'Bras de Fer', 'Build arm strength', 'Renforcez vos bras', 3, 30);

INSERT INTO quest_exercises (questId, exerciseId, sortOrder, targetType, targetMin, targetMax)
VALUES
  (1, 1, 0, 'reps', 10, 15),
  (1, 2, 1, 'reps', 8, 12);
```

### User-Created Quests

Written in the app from `app/(tabs)/quests/edit.tsx` (`+` in the gallery header, pencil on a quest
you wrote). It calls `createQuestTemplate` / `updateQuestMeta` / `setQuestExercises` / `deleteQuest`.

- Author is stamped `USER_QUEST_AUTHOR` (`"hero"`). Only those quests expose edit and delete —
  seed content is shared and a content update must never lose to a local edit.
- One target value per exercise (`min === max`), not the range seed content uses: the editor asks
  for a number, not a bracket.
- Title and description are written to both language columns. A quest written in the app has one
  language — the hero's — and a machine translation is not an improvement on that.
- `archetype` stays null, so the gallery shows no archetype chip.

Writes invalidate `listQuestTemplates` and the cached quest detail through
`invalidateQuestTemplates`; the gallery and the detail screen reload on focus.

### Per-Quest Config

What the hero changes on a quest sticks, without touching the shared template: level, rounds, rest
and per-exercise targets live in `user_preferences` under `quest:<id>:config` (see
[`db/questConfig.ts`](../../db/questConfig.ts)).

`applyQuestConfig(quest, config)` folds it into the loaded quest once, so the estimate, the XP
preview and the session that starts all read the same numbers. A level passed in the route (an
adventure step) still wins over the remembered one. Stored values are re-clamped on read — they are
untrusted text from SQLite.

The swap sheet reaches this config from the quest screen, and **only** from there. The same sheet
opened mid-session changes the movement for that session and writes nothing: the two are different
acts. Configuring is posted cold, before starting, because the hero has no parallel bars at home;
a mid-set swap is a correction for tonight, on the movement that just turned out to be out of
reach. Storing the second would pin the slot — `applyQuestConfig` swaps before `currentRungFor`
runs — so the rung substitution above would stop applying to the one slot the hero struggled on.
Costing them a tap next session is the cheaper mistake.

---

## 🎮 Design Philosophy

### Keep It Simple

- Pre-designed quests reduce decision fatigue
- User doesn't need to plan workouts
- Configuring is opt-in: the quest runs as written until the hero opens the settings card

### Balanced Variety

- Mix of muscle groups available
- Different durations for different schedules
- Progressive difficulty options

### RPG Integration

- Quests are "missions" in the fantasy world
- Completing quests earns XP and grows the village
- Quests can be part of Adventures (storylines)
