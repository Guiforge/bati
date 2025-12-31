# Resource System

## Overview

Resources are the core economy of Bati's RPG layer. You earn resources by completing workouts, and they're used to build and upgrade your village.

---

## 💎 Resource Types

### Primary Resources

| Resource | Icon | Earned From | Fantasy Link |
|----------|------|-------------|--------------|
| **Gold** | 🪙 | All workouts | Universal currency |
| **Wood** | 🪵 | Arms exercises | Archery, strength |
| **Stone** | 🪨 | Back exercises | Foundation, endurance |
| **Fire Essence** | 🔥 | Chest exercises | Power, forging |
| **Water** | 💧 | Abs exercises | Flexibility, flow |
| **Wind Essence** | 🌬️ | Shoulder exercises | Agility, freedom |
| **Grain** | 🌾 | Leg exercises | Stamina, grounding |

### Special Resources

| Resource | Icon | Earned From | Use |
|----------|------|-------------|-----|
| **XP** | ⭐ | All workouts | Level progression |
| **Flame** | 🔥 | Daily streak | Unlock special content |
| **Boss Tokens** | 👹 | Defeating bosses | Legendary buildings |

---

## 📊 Earning Formula

### Gold Calculation

```typescript
gold = baseGold + (duration_minutes * 2) + (difficulty_bonus)

// Example: 20 min workout on Medium
// gold = 10 + (20 * 2) + 0 = 50 gold
```

### Material Resources

```typescript
// Based on exercises in the quest
for each exercise:
  resource_type = mapMuscleToResource(exercise.primaryMuscle)
  amount = exercise.targetReps * difficulty_multiplier
```

### Difficulty Multipliers

| Difficulty | XP | Gold | Materials |
|------------|-----|------|-----------|
| Easy | 0.8x | 1.0x | 0.8x |
| Medium | 1.0x | 1.0x | 1.0x |
| Hard | 1.2x | 1.2x | 1.3x |

---

## 🏗️ Resource Usage

### Building Costs (Examples)

| Building | Wood | Stone | Gold | Special |
|----------|------|-------|------|---------|
| Campfire (Starter) | 10 | 5 | 50 | - |
| Archery Range | 100 | 20 | 200 | - |
| Blacksmith | 50 | 100 | 300 | 10 Fire |
| Castle Wall | 30 | 200 | 400 | - |
| Watchtower | 80 | 60 | 250 | - |
| Dragon Lair | 200 | 300 | 1000 | 5 Boss Tokens |

### Upgrade Costs

Each upgrade level increases cost by ~50%:

- Level 1→2: 1.5x base cost
- Level 2→3: 2.25x base cost
- Level 3→4: 3.4x base cost

---

## 💾 Database Schema

```sql
-- Resource inventory
CREATE TABLE resources (
  id INTEGER PRIMARY KEY,
  resource_type TEXT NOT NULL,  -- 'gold', 'wood', 'stone', etc.
  amount INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER
);

-- Resource transaction log (for analytics)
CREATE TABLE resource_transactions (
  id INTEGER PRIMARY KEY,
  resource_type TEXT NOT NULL,
  amount INTEGER NOT NULL,      -- positive = earned, negative = spent
  source TEXT NOT NULL,         -- 'quest', 'adventure', 'building', etc.
  source_id INTEGER,            -- quest_id, adventure_id, etc.
  created_at INTEGER
);
```

---

## 🔗 Integration Points

### After Quest Completion

```typescript
// In completed.ts
async function completeQuest(questId, results) {
  // 1. Calculate XP (existing)
  const xp = computeSessionXp(results);

  // 2. Calculate resources (new)
  const resources = computeSessionResources(quest, results);

  // 3. Save to completed_sessions
  // 4. Update resource inventory
  // 5. Check for building unlocks
  // 6. Trigger victory animation with rewards
}
```

### Victory Screen

```
┌─────────────────────────────────────┐
│        ⚔️ QUEST COMPLETE! ⚔️        │
├─────────────────────────────────────┤
│                                     │
│   +150 XP    ████████░░  Level 5    │
│                                     │
│   LOOT COLLECTED:                   │
│   🪙 +45 Gold                       │
│   🪵 +30 Wood                       │
│   🪨 +15 Stone                      │
│                                     │
│   [Continue to Village]             │
└─────────────────────────────────────┘
```

---

## 🎮 Design Philosophy

### Why This System?

1. **Meaningful Variety** — Different exercises = different resources = balanced village
2. **Visible Progress** — Resources accumulate visibly
3. **No Grinding** — Resources are earned naturally through workouts
4. **Simple Math** — Easy to understand at a glance

### Balancing Principles

1. **Session-Based** — All resources earned during workout, not passive
2. **Proportional to Effort** — Longer/harder = more rewards
3. **No Pay-to-Win** — All resources earned through exercise
4. **Soft Caps** — Diminishing returns on very long sessions (prevent injury)
