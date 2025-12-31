# Village System

## Overview

Your village is the visual representation of your fitness journey. It grows automatically based on the workouts you complete, creating a unique "fitness fingerprint" for each user.

---

## 🏰 Core Concept

**Your village reflects YOUR training style:**

- Train arms a lot? → Impressive Archery Range
- Focus on back? → Massive Castle Walls
- Balanced training? → Well-rounded village

**Key Principle**: The user does NOT choose what to build. Buildings appear and upgrade automatically based on workout history.

---

## 🏗️ Building Categories

### Tier 1: Starter Buildings (Unlocked by default)

| Building | Visual | Related Muscle | Function |
|----------|--------|----------------|----------|
| **Campfire** | 🔥 | All | Village center, streak tracking |
| **Tent** | ⛺ | All | Your hero's home |
| **Training Dummy** | 🎯 | All | First quest marker |

### Tier 2: Basic Buildings (Unlocked after 5 sessions)

| Building | Visual | Related Muscle | Unlock Condition |
|----------|--------|----------------|------------------|
| **Archery Range** | 🏹 | Arms | 50+ arm exercise reps |
| **Stone Quarry** | ⛏️ | Back | 50+ back exercise reps |
| **Forge** | 🔨 | Chest | 50+ chest exercise reps |
| **Well** | 💧 | Abs | 50+ abs exercise reps |
| **Windmill** | 🌬️ | Shoulder | 50+ shoulder exercise reps |
| **Farm** | 🌾 | Legs | 50+ leg exercise reps |

### Tier 3: Advanced Buildings (Require Level 10+)

| Building | Visual | Related Muscle | Unlock Condition |
|----------|--------|----------------|------------------|
| **Watchtower** | 🗼 | Arms | Archery Range Lvl 3 |
| **Castle Wall** | 🏰 | Back | Stone Quarry Lvl 3 |
| **Armory** | ⚔️ | Chest | Forge Lvl 3 |
| **Fountain** | ⛲ | Abs | Well Lvl 3 |
| **Observatory** | 🔭 | Shoulder | Windmill Lvl 3 |
| **Barn** | 🏚️ | Legs | Farm Lvl 3 |

### Tier 4: Legendary Buildings (Boss rewards)

| Building | Visual | Unlock |
|----------|--------|--------|
| **Dragon Lair** | 🐉 | Defeat Fire Dragon |
| **Hero's Hall** | 🏆 | Complete 50 adventures |
| **Wizard Tower** | 🧙 | Defeat Archmage Boss |
| **Champion Arena** | ⚔️ | Defeat 10 bosses |

---

## 📈 Building Levels

Each building has 5 levels. Higher levels:

1. Look more impressive (visual upgrade)
2. May unlock new features (future)
3. Contribute to village "prestige score"

### Level Progression

| Level | XP Required | Visual Change |
|-------|-------------|---------------|
| 1 | 0 | Basic structure |
| 2 | 100 | Minor improvements |
| 3 | 300 | Notable upgrade |
| 4 | 600 | Major upgrade |
| 5 | 1000 | Legendary version |

**Building XP** accumulates separately from player XP:

- Each relevant exercise adds XP to associated buildings
- Example: 10 push-ups → +10 XP to Forge

---

## 🖼️ Village View UI

### Layout

```
┌─────────────────────────────────────────────────┐
│                  [☀️ Day/Night]                 │
├─────────────────────────────────────────────────┤
│                                                 │
│        🗼          🏰          🔭               │
│                                                 │
│    🏹        [🔥 Village Center]       🌬️       │
│                    ⛺                           │
│        ⚔️          ⛲          🏚️               │
│                                                 │
│    ⛏️                              🌾           │
│                                                 │
├─────────────────────────────────────────────────┤
│  Village: "Stronghold"    Level: 12    ⭐ 2450  │
│  [View Stats]  [Start Quest]  [Adventures]     │
└─────────────────────────────────────────────────┘
```

### Interactions

- **Tap Building** → Show building details, level, related stats
- **Long Press** → Show "Upgrade Preview" (what you need to level up)
- **Swipe** → Rotate/pan village view
- **Pinch** → Zoom in/out

---

## 💾 Database Schema

```sql
-- Village buildings
CREATE TABLE village_buildings (
  id INTEGER PRIMARY KEY,
  building_type TEXT NOT NULL,      -- 'archery_range', 'forge', etc.
  level INTEGER NOT NULL DEFAULT 1,
  xp INTEGER NOT NULL DEFAULT 0,    -- Progress toward next level
  unlocked_at INTEGER,              -- Timestamp when first unlocked
  updated_at INTEGER
);

-- Village stats
CREATE TABLE village_stats (
  id INTEGER PRIMARY KEY,
  prestige_score INTEGER DEFAULT 0,
  total_buildings INTEGER DEFAULT 0,
  highest_building_level INTEGER DEFAULT 1,
  updated_at INTEGER
);
```

---

## 🔗 Integration Points

### After Quest Completion

```typescript
async function updateVillage(completedSession) {
  // 1. Get exercises from completed session
  const exercises = await getSessionExercises(completedSession.id);

  // 2. For each exercise, add XP to related building
  for (const exercise of exercises) {
    const muscle = exercise.primaryMuscle;
    const buildingType = mapMuscleToBuilding(muscle);

    await addBuildingXp(buildingType, exercise.resultValue);
  }

  // 3. Check for level ups
  const levelUps = await checkBuildingLevelUps();

  // 4. Check for new building unlocks
  const newBuildings = await checkBuildingUnlocks();

  // 5. Return for animation
  return { levelUps, newBuildings };
}
```

### Muscle → Building Mapping

```typescript
const muscleToBuilding: Record<MuscleCode, string> = {
  arms: 'archery_range',
  back: 'castle_wall',
  chest: 'forge',
  abs: 'well',
  shoulder: 'windmill',
  calf: 'farm',  // Grouped with legs
};
```

---

## 🎨 Visual Design

### Style Guidelines

- **Comic Book Aesthetic** — Thick outlines, bold colors
- **Isometric View** — 2.5D perspective for village
- **Day/Night Cycle** — Based on local time
- **Weather Effects** — Optional visual flair

### Building States

1. **Locked** — Grayed out silhouette with lock icon
2. **Unlocking** — Construction animation when first built
3. **Active** — Full color, slight animation (smoke, flags moving)
4. **Upgrading** — Sparkle effect when leveling up

---

## 🎮 Design Philosophy

### Why Auto-Build?

1. **Reduced Cognitive Load** — User focuses on workouts, not building decisions
2. **Authentic Reflection** — Village truly represents training style
3. **Motivation Through Discovery** — "What will I unlock next?"
4. **Balanced Encouragement** — Notice weak areas visually

### Future Ideas

- **Village Themes** — Unlock different visual styles (Medieval, Asian, Futuristic)
- **Decorations** — Cosmetic items for personalization
- **Seasonal Events** — Special buildings during holidays
