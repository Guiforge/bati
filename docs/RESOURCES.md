# Resource System

## Overview

Resources are the core economy of Bati's RPG layer. You earn resources by completing workouts, and they're used to build and upgrade your village.

**Simplified Design**: We use only 3 resources to keep the game simple and fun.

---

## 💎 Resource Types

### Primary Resources

| Resource | Icon | Earned From | Use |
|----------|------|-------------|-----|
| **Gold** | 🪙 | All workouts (based on duration) | Universal currency for buildings |
| **Essence** | ✨ | All exercises (based on reps/time) | Material for construction |
| **Boss Token** | 👹 | Defeating bosses | Legendary buildings |

### XP (Separate System)

| Resource | Icon | Earned From | Use |
|----------|------|-------------|-----|
| **XP** | ⭐ | All workouts | Level progression |

---

## 📊 Earning Formula

### Gold Calculation

```typescript
gold = baseGold + (duration_minutes * 2)

// Example: 20 min workout on Medium
// gold = 10 + (20 * 2) = 50 gold
```

### Essence Calculation

```typescript
// All muscles now generate essence
for each exercise:
  essence += exercise.targetReps * difficulty_multiplier
```

### Difficulty Multipliers

| Difficulty | XP | Gold | Essence |
|------------|-----|------|---------|
| Easy | 0.8x | 0.8x | 0.8x |
| Medium | 1.0x | 1.0x | 1.0x |
| Hard | 1.2x | 1.2x | 1.2x |

---

## 🏗️ Resource Usage

### Building Costs (Examples)

| Building | Essence | Gold | Special |
|----------|---------|------|---------|
| Campfire (Starter) | 15 | 50 | - |
| Archery Range | 120 | 200 | - |
| Forge | 150 | 300 | - |
| Castle Wall | 200 | 400 | - |
| Watchtower | 140 | 250 | - |
| Dragon Lair | 500 | 1000 | 5 Boss Tokens |

### Upgrade Costs

Each upgrade level increases cost by ~50%:

- Level 1→2: 1.5x base cost
- Level 2→3: 2.25x base cost
- Level 3→4: 3.4x base cost

---

## 💾 Database Schema

```sql
-- Resource inventory (simplified: gold, essence, boss_token)
CREATE TABLE resource_inventory (
  id INTEGER PRIMARY KEY,
  resource TEXT NOT NULL,  -- 'gold', 'essence', 'boss_token'
  amount INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER
);

-- Resource transaction log (for analytics)
CREATE TABLE resource_transactions (
  id INTEGER PRIMARY KEY,
  resource TEXT NOT NULL,
  amount INTEGER NOT NULL,      -- positive = earned, negative = spent
  transaction_type TEXT NOT NULL, -- 'earned', 'spent', 'bonus'
  completed_session_id INTEGER,
  reason TEXT,
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

  // 2. Calculate resources (simplified: gold + essence)
  const loot = previewSessionLoot(results);

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
│   ✨ +80 Essence                    │
│                                     │
│   [Continue to Village]             │
└─────────────────────────────────────┘
```

---

## 🎮 Design Philosophy

### Why Simplified Resources?

1. **Easy to Understand** — 3 resources instead of 8
2. **No Mental Overhead** — Just workout and earn
3. **Visible Progress** — Resources accumulate visibly
4. **No Grinding** — Resources are earned naturally through workouts

### Balancing Principles

1. **Session-Based** — All resources earned during workout, not passive
2. **Proportional to Effort** — Longer/harder = more rewards
3. **No Pay-to-Win** — All resources earned through exercise
4. **Soft Caps** — Diminishing returns on very long sessions (prevent injury)
