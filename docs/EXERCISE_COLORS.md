# Exercise Types & Colors

## Overview

Each exercise type is associated with a color based on its primary muscle group. This creates visual consistency across the app and helps users quickly identify workout focus areas.

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

### Village Buildings

Building colors match their associated muscle:

| Building | Muscle | Color Theme |
| -------- | ------ | ----------- |
| Archery Range | Arms | Pink wood tones |
| Castle Wall | Back | Blue stone |
| Forge | Chest | Yellow/Orange flames |
| Well | Abs | Green water accents |
| Windmill | Shoulders | Purple sails |
| Farm | Legs | Orange harvest |

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

### Color Contrast

All pastel colors are designed to:

- Work on both light and dark backgrounds
- Have sufficient contrast with black text
- Be distinguishable for colorblind users

### Colorblind Modes (Future)

For users with color vision deficiency:

- **Deuteranopia**: Adjust green/red
- **Protanopia**: Adjust red perception
- **Tritanopia**: Adjust blue/yellow

Alternative: Use patterns/icons in addition to colors.

---

## 💡 Design Rationale

### Why Colors?

1. **Quick Recognition**: Instantly know workout focus
2. **Visual Variety**: Each quest looks distinct
3. **Memory Association**: Color helps recall workouts
4. **Motivation**: Vibrant colors feel energetic

### Why Pastels?

1. **Friendly Aesthetic**: Matches comic book style
2. **Eye Comfort**: Less strain during workouts
3. **Versatility**: Works on light and dark themes
4. **Accessibility**: Easier for colorblind users
