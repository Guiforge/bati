---
title: Adventures
type: system
status: active
updated: 2026-10-17
related: [boss-fights.md, quests.md, session-flow.md, progression.md]
sources: [db/adventures.ts, db/heroAdventures.ts, db/adventures-narrative.ts, "app/(tabs)/adventures/index.tsx", "app/(tabs)/adventures/[id].tsx"]
---

# Adventures (Campaigns)

## Overview

An **Adventure** is a **multi-step campaign** made of several quest sessions chained together with narrative elements. Adventures are the main progression system in Bati.

> In this app: **Adventure = Campaign** (a story-driven sequence of quests)

---

## ✍️ Adventures the hero writes

The hero writes their own from the gallery ("Écrire une aventure"): a cover among the bundled ones, a
name, an introduction, **2 to 8 steps** (any quest, the hero's own first in the picker) each with the
words before it and, optionally, on the way back, and an end: a route, or one of the six painted bosses.
Everything is free: no quota, no Bati+ lock, no offer (`db/heroAdventures.ts` is the one writer).

- **A victory on a hero adventure pays only its sessions.** No Triumph XP, no Lair, Arena or Hall level,
  not counted in "bosses vaincus", the Journal or the Chronicle (`DEED_ADVENTURE`), never a standing
  boss; the card still says "finie N fois", and the victory says why once. The farm is closed: writing
  a two-step adventure and finishing it ten times earns nothing a session would not.
- **Editing.** The title, introduction, cover and the words may change at any time. With a playthrough
  under way the steps and the end are frozen until it is finished or left. The monster can be changed
  between two playthroughs and the next fight has the new monster's weakness; a fight kept after a left
  playthrough keeps the pool of the old steps (PARK-1, `ponytail:` in `updateHeroAdventure`).
- **Retiring** is an edit, never a delete: the adventure leaves the gallery, its sessions stay in the
  Journal. It stays listed while a run of it is under way here (retired on another device).
- **A step whose quest is gone** (a content migration removed it, or the hero deleted it) makes the
  adventure unplayable: the page says so and the editor repairs it. A quest an active adventure names
  cannot be deleted; the quest editor says which adventure.
- **Home.** The oath comes before a hero adventure under way; a game adventure under way keeps its
  place before the oath, even when a newer run of the hero's own is active.
- **The zone.** A hero quest used as a step that would work the zone being spared wears a line on the
  detail screen. The game's quests substitute their slots and are never flagged.

---

## 🗺️ What is an Adventure?

Think of adventures as storylines in an RPG:

- A series of connected quests (3-8 typically)
- Narrative text between steps
- Progressive difficulty
- Often ends with a Boss fight
- XP, progress, and story payoff upon completion

---

## 📋 Adventure Structure

### Core Properties

| Property | Type | Description |
| -------- | ---- | ----------- |
| `id` | number | Unique identifier |
| `questId` | number | Cover quest (preview image) |
| `enTitle` / `frTitle` | string | Localized title |
| `enDescription` / `frDescription` | string | Localized description |
| `author` | string | Content creator ("Admin" for built-in) |
| `kind` | string | 'route', 'boss', or 'event' |
| `sortOrder` | number | Display order in gallery |
| `isActive` | boolean | Visibility flag |

### Adventure Steps

Each adventure contains ordered steps:

| Property | Type | Description |
| -------- | ---- | ----------- |
| `adventureId` | number | Parent adventure |
| `stepIndex` | number | Order (0-based) |
| `questId` | number | Quest for this step |
| `enNarrative` / `frNarrative` | string | Story text before quest |

---

## 🎮 Adventure Types

### Route Adventures (Standard)

Regular multi-quest campaigns:

- 4-6 quests chained together
- Progressive difficulty
- Thematic connection
- Standard rewards

### Boss Adventures

Campaigns that end with a boss fight:

- Build up to the boss
- Final step is boss encounter
- Special loot on completion
- See [BOSS.md](boss-fights.md) for details

### Event Adventures (Seasonal)

Limited-time themed content:

- Holiday themes (Halloween, Christmas)
- Special rewards only during event
- May return annually

---

## 🔄 Adventure Runs

When you start an adventure, the app creates an **Adventure Run** to track progress:

### Run Table

```sql
CREATE TABLE adventure_runs (
  id INTEGER PRIMARY KEY,
  adventureId INTEGER REFERENCES adventures(id),
  status TEXT NOT NULL,        -- 'active' | 'finished' | 'left'
  difficultyOverride TEXT,     -- Pins the campaign. Null in practice since the feedback link
                               -- shipped: each step re-reads the suggestion instead.
  startedAt INTEGER,
  finishedAt INTEGER,
  createdAt INTEGER
);
```

### Run Steps

```sql
CREATE TABLE adventure_run_steps (
  id INTEGER PRIMARY KEY,
  runId INTEGER REFERENCES adventure_runs(id),
  stepIndex INTEGER NOT NULL,
  status TEXT NOT NULL,        -- 'locked' | 'active' | 'completed'
  completedSessionId INTEGER,  -- Link to completed quest
  completedAt INTEGER
);
```

### Status Flow

```text
Step 1: [active]   → Complete quest → [completed]
Step 2: [locked]   → Previous done  → [active] → Complete → [completed]
Step 3: [locked]   → Previous done  → [active] → Complete → [completed]
Step 4: [locked]   → Previous done  → [active] → Complete → [completed]
                                                            ↓
Adventure: [active] ────────────────────────────────► [finished]
              │
              └── "Laisser la partie" ──► [left]   (counted nowhere, offered nowhere)
```

---

## �� Database Schema

```sql
-- Adventure campaigns
CREATE TABLE adventures (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  questId INTEGER NOT NULL REFERENCES quests(id),  -- Cover quest
  enTitle TEXT NOT NULL DEFAULT '',
  frTitle TEXT NOT NULL DEFAULT '',
  enDescription TEXT NOT NULL DEFAULT '',
  frDescription TEXT NOT NULL DEFAULT '',
  author TEXT NOT NULL DEFAULT 'Admin',
  sortOrder INTEGER NOT NULL DEFAULT 0,
  kind TEXT NOT NULL DEFAULT 'route',
  isActive INTEGER NOT NULL DEFAULT 1,
  createdAt INTEGER,
  updatedAt INTEGER
);

-- Steps within adventures
CREATE TABLE adventure_steps (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  adventureId INTEGER NOT NULL REFERENCES adventures(id),
  stepIndex INTEGER NOT NULL,
  questId INTEGER NOT NULL REFERENCES quests(id),
  narrative TEXT NOT NULL DEFAULT '',    -- Legacy (deprecated)
  enNarrative TEXT NOT NULL DEFAULT '',
  frNarrative TEXT NOT NULL DEFAULT '',
  createdAt INTEGER,
  updatedAt INTEGER
);

-- Indexes
CREATE INDEX adventure_steps_adv_idx ON adventure_steps(adventureId);
CREATE UNIQUE INDEX adventure_steps_unique ON adventure_steps(adventureId, stepIndex);
```

---

## 📱 UI Integration

### Adventures Gallery

```text
┌─────────────────────────────────────────────┐
│              🗺️ ADVENTURES                  │
├─────────────────────────────────────────────┤
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │ [🖼️ Cover Image]                    │    │
│  │                                     │    │
│  │ ⚔️ THE WARRIOR'S PATH               │    │
│  │ "Forge your strength through..."    │    │
│  │                                     │    │
│  │ 6 quests • ~2 hours • 👹 Boss       │    │
│  │                                     │    │
│  │ ████░░░░░░ 2/6 completed            │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │ [🖼️ Cover Image]                    │    │
│  │ 🛡️ DEFENDER'S TRIAL                 │    │
│  │ Not started                         │    │
│  └─────────────────────────────────────┘    │
│                                             │
└─────────────────────────────────────────────┘
```

### Adventure Detail Screen

```text
┌─────────────────────────────────────────────┐
│              ← Back                         │
├─────────────────────────────────────────────┤
│                                             │
│           [🖼️ Hero Image]                   │
│                                             │
│         ⚔️ THE WARRIOR'S PATH               │
│                                             │
│   "Journey through the ancient training     │
│    grounds to become a true warrior."       │
│                                             │
├─────────────────────────────────────────────┤
│   PROGRESS: 2/6 steps                       │
│   ████████░░░░░░░░░░░░                      │
│                                             │
├─────────────────────────────────────────────┤
│   STEPS                                     │
│                                             │
│   ✅ 1. The First Trial                     │
│        "Your journey begins..."             │
│                                             │
│   ✅ 2. Strength Training                   │
│        "The master awaits..."               │
│                                             │
│   ▶️ 3. The Mountain Path  ← CURRENT        │
│        "Climb higher, grow stronger..."     │
│                                             │
│   🔒 4. Valley of Shadows                   │
│   🔒 5. The Final Test                      │
│   🔒 6. �� The Iron Golem                   │
│                                             │
├─────────────────────────────────────────────┤
│          [CONTINUE ADVENTURE]               │
└─────────────────────────────────────────────┘
```

### Home: Continue Adventure Card

When an adventure is in progress:

```text
┌─────────────────────────────────────────────┐
│   🗺️ CONTINUE YOUR ADVENTURE               │
│                                             │
│   ⚔️ The Warrior's Path                     │
│   Step 3/6: The Mountain Path               │
│                                             │
│   [Continue →]                              │
└─────────────────────────────────────────────┘
```

---

## 🔧 API Functions

### Fetching Adventures

```typescript
// db/adventures.ts

// Get all active adventures
export async function getAdventures(): Promise<Adventure[]>

// Get adventure with all steps
export async function getAdventureById(id: number): Promise<Adventure | null>

// Get user's active adventure run
export async function getActiveAdventureRun(): Promise<AdventureRun | null>
```

### Managing Runs

```typescript
// Start a new adventure
export async function startAdventure(adventureId: number): Promise<AdventureRun>

// Complete current step
export async function completeAdventureStep(
  runId: number,
  completedSessionId: number
): Promise<void>

// Check if adventure is finished
export async function checkAdventureComplete(runId: number): Promise<boolean>
```

---

## 🎯 Narrative System

### Between Steps

Before each quest, display narrative text:

```text
┌─────────────────────────────────────────────┐
│                                             │
│   [🖼️ Atmospheric Image]                    │
│                                             │
│   STEP 3: THE MOUNTAIN PATH                 │
│                                             │
│   "The path grows steeper. Each step        │
│    higher tests your resolve. But the       │
│    view from the summit awaits those        │
│    who persevere."                          │
│                                             │
│   "Today, you climb."                       │
│                                             │
├─────────────────────────────────────────────┤
│          [BEGIN QUEST]                      │
└─────────────────────────────────────────────┘
```

### After Completion

Story continues after finishing:

```text
┌─────────────────────────────────────────────┐
│                                             │
│           🎆 STEP COMPLETE! 🎆              │
│                                             │
│   "You stand atop the mountain, the         │
│    valley spread before you. But your       │
│    journey is not yet over..."              │
│                                             │
│   NEXT: Valley of Shadows                   │
│                                             │
├─────────────────────────────────────────────┤
│   [Continue]  [Return to Village]           │
└─────────────────────────────────────────────┘
```

---

## 🏆 Rewards

### Per-Step Rewards

Same as quest completion: XP based on duration/difficulty.

### Adventure Completion Bonus

Extra rewards for finishing entire adventure:

- Bonus XP (20% of total)
- A village visual milestone for special adventures

Do not make Gold, shops, resources, or manual building upgrades part of adventure rewards
— see [progression.md](progression.md).

### Boss Completion

See [BOSS.md](boss-fights.md) for boss-specific rewards.

---

## 🎮 Design Philosophy

### Why Adventures?

1. **Structured Progression**: Clear path forward
2. **Story Engagement**: Narrative adds meaning
3. **Commitment**: Multi-session goals
4. **Variety**: Different quests in sequence

### Adventure Design Guidelines

- 4-8 steps is ideal length
- Build difficulty gradually
- Include rest/recovery quests
- End with climactic challenge (boss)
- Narrative should motivate, not distract
