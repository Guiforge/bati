---
title: Exercise Colors
type: design
status: active
updated: 2026-07-18
related: [design-system.md, ../gameplay/quests.md]
sources: [constants/exerciseColors.ts]
---

# Exercise Types & Colors

Each exercise type is associated with a color based on its primary muscle group — visual
consistency across the app, and a quick way to identify workout focus.

---

## 🎨 Color Mapping

### Muscle → Color

| Muscle Group | Color Name | Token | Hex |
| ------------ | ---------- | ----- | --- |
| **Arms** | Pastel Pink | `$pastelPink` | `#FFB3BA` |
| **Back** | Pastel Blue | `$pastelBlue` | `#BAE1FF` |
| **Chest** | Pastel Yellow | `$pastelYellow` | `#FFFFBA` |
| **Abs** | Pastel Green | `$pastelGreen` | `#BAFFC9` |
| **Shoulders** | Pastel Purple | `$pastelPurple` | `#D4BAFF` |
| **Legs/Calf** | Pastel Orange | `$pastelOrange` | `#FFD4BA` |

### Target Type → Color (Fallback)

When muscle is not specified:

| Target Type | Color |
| ----------- | ----- |
| **Reps** | Pastel Yellow |
| **Time** | Pastel Blue |
| **Mixed** | Pastel Purple |
| **Default** | Gray |

---

## 🎯 Quest Color Determination

A quest's color is determined by the **dominant exercise type** in the quest.

### Algorithm

```typescript
function getQuestColor(quest: Quest): ExerciseColorKey {
  const muscleCount = new Map<MuscleCode, number>();

  for (const exercise of quest.exercises) {
    const muscle = exercise.primaryMuscle;
    muscleCount.set(muscle, (muscleCount.get(muscle) ?? 0) + 1);
  }

  // Find the most common muscle
  let maxMuscle: MuscleCode | null = null;
  let maxCount = 0;

  for (const [muscle, count] of muscleCount) {
    if (count > maxCount) {
      maxCount = count;
      maxMuscle = muscle;
    }
  }

  // If tied or mixed, return 'mixed'
  const muscles = Array.from(muscleCount.keys());
  if (muscles.length > 2 && maxCount < quest.exercises.length * 0.5) {
    return 'mixed';
  }

  return maxMuscle ?? 'default';
}
```

### Examples

| Quest | Exercises | Dominant | Color |
| ----- | --------- | -------- | ----- |
| "Iron Arms" | 4 arms, 1 chest | Arms | Pink |
| "Full Body" | 2 each muscle | Mixed | Purple |
| "Core Crusher" | 5 abs | Abs | Green |
| "Push Day" | 3 chest, 2 shoulder | Chest | Yellow |

---

## 📱 Visual Application

### Quest Cards

```text
┌─────────────────────────────────────────────┐
│  ╔═══════════════════════════════════════╗  │
│  ║                                       ║  │
│  ║         [Quest Image]                 ║  │
│  ║                                       ║  │
│  ╚═══════════════════════════════════════╝  │
│  ┌───────────────────────────────────────┐  │
│  │ 💪 IRON ARMS CHALLENGE               │  │ ← Pink accent
│  │ Build legendary arm strength          │  │
│  │                                       │  │
│  │ ⏱️ 20 min  •  🔄 3 rounds             │  │
│  └───────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

### During Session

- Background tint matches current exercise color
- Progress bar uses accent color
- Subtle color transition between exercises

---

## 🔧 Implementation

### Color Tokens (Tamagui)

```typescript
// tamagui.config.ts
const tokens = createTokens({
  color: {
    pastelPink: '#FFB3BA',
    pastelBlue: '#BAE1FF',
    pastelYellow: '#FFFFBA',
    pastelGreen: '#BAFFC9',
    pastelPurple: '#D4BAFF',
    pastelOrange: '#FFD4BA',
  },
});
```

### Color Utility Functions

```typescript
// constants/exerciseColors.ts

export function getExerciseColorKey(input: {
  muscles?: readonly MuscleCode[];
  targetType?: QuestTargetType;
}): ExerciseColorKey {
  const muscles = input.muscles ?? [];
  if (muscles.length > 0) return muscles[0];
  if (input.targetType) return input.targetType;
  return 'default';
}

export function getExerciseColorTokens(key: ExerciseColorKey): ExerciseColorTokens {
  // Returns { bg, accent, text } tokens for the color
}

export function getQuestPrimaryColor(quest: Quest): ColorTokens {
  const colorKey = computeQuestColorKey(quest);
  return getExerciseColorTokens(colorKey).bg;
}
```

---

## 🎨 Accessibility

Color is never the only signal — pair with the exercise name/icon (per
[design-system.md](design-system.md) §2). Pastels are chosen for contrast against the
dark-only background and to stay distinguishable for colorblind users; no per-condition
color-blind mode is planned (YAGNI — revisit if user feedback asks for it).
