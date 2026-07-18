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
| **Easy** | Use targetMin | 0.8x |
| **Medium** | Average of min/max | 1.0x |
| **Hard** | Use targetMax | 1.2x |

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

### User-Created Quests (Future)

```typescript
// Future: Allow users to create custom quests
interface CreateQuestInput {
  title: string;          // User's language
  description: string;
  exercises: {
    exerciseId: number;
    targetType: 'reps' | 'time';
    targetMin: number;
    targetMax: number;
  }[];
  rounds: number;
  restSeconds: number;
}
```

---

## 🎮 Design Philosophy

### Keep It Simple

- Pre-designed quests reduce decision fatigue
- User doesn't need to plan workouts
- Focus on doing, not configuring

### Balanced Variety

- Mix of muscle groups available
- Different durations for different schedules
- Progressive difficulty options

### RPG Integration

- Quests are "missions" in the fantasy world
- Completing quests earns resources
- Quests can be part of Adventures (storylines)
