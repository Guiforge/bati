---
title: Boss Fights
type: system
status: active
updated: 2026-07-18
related: [adventures.md, session-flow.md, progression.md]
sources: [db/bossFights.ts, components/session/BossHpBar.tsx, components/session/BossTauntOverlay.tsx]
---

# Boss Adventures

## Overview

A **Boss** is an adventure with `kind = "boss"`. Boss fights are the climactic ending of adventure campaigns — epic workout challenges that test everything you've trained for.

---

## ⚔️ What Makes It a Boss?

### Current Implementation

- Different label/badge in the UI (skull icon, red accent)
- Different wording: "⚔️ FIGHT BOSS" instead of "Start Quest"
- Same underlying campaign/run system
- Multiple steps (`adventure_steps`)
- Creates a run (`adventure_runs` + `adventure_run_steps`)

### Fantasy Concept

**Boss = A powerful enemy that requires multiple workout sessions to defeat.**

Think of it like a video game boss with phases:

- Phase 1: Warm-up (easier exercises)
- Phase 2: Main Battle (core workout)
- Phase 3: Final Stand (intense finisher)

---

## 🎮 Boss Fight Mechanics

### HP System (Planned)

```text
BOSS: THE IRON GOLEM
HP: ████████████░░░░░░░░ 60/100

"The golem staggers! Keep attacking!"
```

**How HP Works:**

- Boss starts with HP based on total exercise targets
- Each completed rep/second reduces boss HP
- HP persists across sessions if multi-day fight
- Boss defeated when HP reaches 0

### Damage Calculation

```typescript
function calculateDamage(exercise: CompletedExercise): number {
  const baseDamage = exercise.resultValue; // reps or seconds
  const critChance = exercise.resultValue >= exercise.targetMax ? 0.3 : 0;
  const isCrit = Math.random() < critChance;
  
  return isCrit ? baseDamage * 2 : baseDamage;
}
```

**Critical Hits**: Exceeding the target range = chance for critical damage!

---

## 📱 Boss UI Flow

### 1. Boss Introduction

```text
┌─────────────────────────────────────────────┐
│                                             │
│           [🖼️ Boss Illustration]            │
│                                             │
│         👹 THE IRON GOLEM 👹                │
│                                             │
│   "A monstrous construct of pure iron       │
│    blocks your path. Only strength          │
│    can bring it down."                      │
│                                             │
│   HP: ████████████████████ 100              │
│                                             │
│   Weakness: �� Arm exercises                │
│   Resistance: �� Leg exercises              │
│                                             │
├─────────────────────────────────────────────┤
│   Phases: 3    Est. time: 45 min            │
├─────────────────────────────────────────────┤
│          [⚔️ FIGHT BOSS]                    │
└─────────────────────────────────────────────┘
```

### 2. During Battle

```text
┌─────────────────────────────────────────────┐
│  PHASE 2/3         👹 IRON GOLEM            │
│  HP: ████████░░░░░░░░░░ 45/100              │
├─────────────────────────────────────────────┤
│                                             │
│           [🎬 Exercise Animation]           │
│                                             │
│              PUSH-UPS                       │
│                 12 REPS                     │
│                                             │
│         💥 ATTACK POWER: +12               │
│                                             │
├─────────────────────────────────────────────┤
│          [⚔️ ATTACK!]                       │
└─────────────────────────────────────────────┘
```

### 3. Boss Defeated

```text
┌─────────────────────────────────────────────┐
│                                             │
│           🎆 VICTORY! 🎆                    │
│                                             │
│           [💀 Defeated Boss]                │
│                                             │
│   "The Iron Golem crumbles to dust.         │
│    You have proven your strength          │
│                                             │
├─────────────────────────────────────────────┤
│   BOSS REWARD:                              │
│   ⭐ +500 XP                                │
│   🏰 Village banner revealed                │
│                                             │
├─────────────────────────────────────────────┤
│          [🏠 CLAIM REWARDS]                 │
└─────────────────────────────────────────────┘
```

A boss victory is a fact of the session journal — it's not stored as a spendable token.
It adds a permanent banner to the village scene. See
[progression.md](progression.md#village).

---

## 👹 Boss Types

### Standard Bosses (At end of adventures)

| Boss | Theme | Weakness | Reward |
| ---- | ----- | -------- | ------ |
| **Iron Golem** | Strength | Arms | Village banner |
| **Storm Giant** | Endurance | Shoulders | Village banner |
| **Shadow Dragon** | Balance | All muscles | Village banner |
| **Frost Titan** | Core | Abs | Village banner |

### Special Event Bosses

| Boss | Event | Description |
| ---- | ----- | ----------- |
| **Pumpkin King** | Halloween | Limited-time spooky workout |
| **Frost Lord** | Winter | Cold-themed challenges |
| **Sun Champion** | Summer | High-intensity beach body |

### Legendary Bosses (Endgame)

Unlocked by level, not by collecting tokens:

| Boss | Requirement | Difficulty |
| ---- | ----------- | ---------- |
| **The Titan** | High village tier | Extreme |
| **Dragon God** | Highest village tier | Legendary |
| **The Champion** | All adventures complete | Ultimate |

---

## 💾 Database Schema

```sql
-- Boss-specific data (extends adventures)
CREATE TABLE boss_fights (
  id INTEGER PRIMARY KEY,
  adventure_id INTEGER REFERENCES adventures(id),
  total_hp INTEGER NOT NULL,
  current_hp INTEGER NOT NULL,
  weakness_muscle TEXT,           -- Bonus damage from this muscle
  resistance_muscle TEXT,         -- Reduced damage from this muscle
  defeated_at INTEGER,
  updated_at INTEGER
);

-- Boss fight log (tracks damage dealt per session)
CREATE TABLE boss_damage_log (
  id INTEGER PRIMARY KEY,
  boss_fight_id INTEGER REFERENCES boss_fights(id),
  completed_session_id INTEGER,
  damage_dealt INTEGER NOT NULL,
  is_critical INTEGER DEFAULT 0,
  created_at INTEGER
);
```

---

## 🎨 Visual & Audio

### Boss Themes

Each boss has unique:

- **Illustration**: Comic-style boss art
- **Color palette**: Red/black for aggressive, blue for ice, etc.
- **Battle music**: Intense workout beat
- **Victory sound**: Epic fanfare

### Animation States

1. **Idle**: Boss breathing/moving slightly
2. **Hit**: Boss recoils when damage dealt
3. **Enraged**: Below 25% HP, visual change
4. **Defeated**: Dramatic death animation

---

## 🔗 Integration Points

### Starting a Boss Fight

```typescript
async function startBossFight(adventureId: number) {
  const adventure = await getAdventure(adventureId);
  
  // Create boss fight record if doesn't exist
  let bossFight = await getBossFight(adventureId);
  if (!bossFight) {
    bossFight = await createBossFight({
      adventureId,
      totalHp: calculateBossHp(adventure),
      currentHp: calculateBossHp(adventure),
      weakness: adventure.bossWeakness,
      resistance: adventure.bossResistance,
    });
  }
  
  // Start adventure run as normal
  return startAdventureRun(adventureId);
}
```

### Completing an Exercise (Damage)

```typescript
async function dealDamage(bossFightId: number, exercise: CompletedExercise) {
  const bossFight = await getBossFight(bossFightId);
  
  // Calculate damage with weakness/resistance
  let damage = exercise.resultValue;
  if (exercise.muscle === bossFight.weakness) damage *= 1.5;
  if (exercise.muscle === bossFight.resistance) damage *= 0.5;
  
  // Check for critical
  const isCrit = exercise.resultValue >= exercise.targetMax && Math.random() < 0.3;
  if (isCrit) damage *= 2;
  
  // Apply damage
  const newHp = Math.max(0, bossFight.currentHp - damage);
  await updateBossHp(bossFightId, newHp);
  
  // Log the damage
  await logBossDamage(bossFightId, damage, isCrit);
  
  // Check for victory
  if (newHp === 0) {
    await defeatBoss(bossFightId);
  }
  
  return { damage, isCrit, newHp, defeated: newHp === 0 };
}
```

---

## 🎮 Design Philosophy

### Why Boss Fights?

1. **Climactic Goals**: Something to work toward
2. **Visible Progress**: HP bar shows effort accumulating
3. **Epic Rewards**: XP and a permanent village banner
4. **Replayability**: Can refight bosses for better times

### Difficulty Balance

- Boss HP should require ~3-5 sessions to defeat
- Weakness/resistance creates variety, not punishment
- Critical hits reward pushing beyond minimums
- Fleeing mid-fight preserves progress
