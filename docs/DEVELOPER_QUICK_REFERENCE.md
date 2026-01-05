# 🎮 BATI Content Integration — Quick Reference

> **For Developers**: How to use the newly generated content

---

## 🚀 Quick Start

### 1. Import the Asset Map

```typescript
import {
  EXERCISE_ASSETS,
  QUEST_ASSETS,
  BOSS_ASSETS,
  ADVENTURE_ASSETS,
  getExerciseAsset,
  getQuestAsset,
  getBossAsset,
  getAdventureAsset,
} from "@/constants/assetMap";
```

### 2. Use in Components

#### Exercise Image

```tsx
import { Image } from "react-native";
import { getExerciseAsset } from "@/constants/assetMap";

<Image
  source={getExerciseAsset("goblin_squat")}
  style={{ width: 200, height: 200 }}
  resizeMode="contain"
/>
```

#### Quest Cover

```tsx
import { getQuestAsset } from "@/constants/assetMap";

<Image
  source={getQuestAsset("escape_collapsing_mine")}
  style={{ width: "100%", aspectRatio: 16 / 9 }}
  resizeMode="cover"
/>
```

#### Boss Image

```tsx
import { getBossAsset } from "@/constants/assetMap";

<Image
  source={getBossAsset("fire_dragon")}
  style={{ width: 300, height: 300 }}
  resizeMode="contain"
/>
```

---

## 📋 New Exercise IDs (snake_case)

```typescript
const NEW_EXERCISES = [
  "goblin_squat",
  "dragon_pushup",
  "iron_grip_pullup",
  "stone_guardian_plank",
  "shadow_step_lunge",
  "berserker_burpee",
  "monk_mountain_climber",
  "titan_dip",
  "archer_pike_pushup",
  "wall_sentinel_hold",
  "thunder_jumping_jack",
  "paladin_high_knee",
  "wizard_bicycle_crunch",
  "knight_diamond_pushup",
  "ranger_single_leg_deadlift",
  "druid_cobra_stretch",
  "samurai_warrior_pose",
  "rogue_skater_hop",
  "barbarian_overhead_press",
  "alchemist_hollow_body_hold",
];
```

---

## 🗡️ New Quest IDs

```typescript
const NEW_QUESTS = [
  "escape_collapsing_mine",
  "guard_fortress_gate",
  "forge_dragon_blade",
  "climb_titan_tower",
  "arcane_gauntlet",
  "druid_path",
  "sprint_shadowlands",
  "build_stronghold",
  "iron_gauntlet_challenge",
  "morning_champion",
];
```

---

## 🐉 New Boss IDs

```typescript
const NEW_BOSSES = [
  "wind_wraith",      // HP: 400, Weakness: Calf
  "stone_golem",      // HP: 600, Weakness: Back
  "shadow_serpent",   // HP: 350, Weakness: Abs
  "forest_titan",     // HP: 550, Weakness: Calf
  "fire_dragon",      // HP: 800, Weakness: Abs (Resistance: Chest)
];
```

---

## 🏰 New Adventure IDs

```typescript
const NEW_ADVENTURES = [
  "scout_trial",           // 5 quests, cardio focus
  "guardian_oath",         // 6 quests, defense focus
  "monk_enlightenment",    // 4 quests, core/yoga focus
  "ranger_journey",        // 7 quests, endurance focus
  "iron_lord_conquest",    // 8 quests, elite challenge
];
```

---

## 💾 Database Queries

### Get Exercise by ID (with fallback)

```typescript
import { getExerciseById } from "@/db/exercises";

const exercise = await getExerciseById(exerciseId);
if (exercise) {
  const asset = getExerciseAsset(exercise.imagePath.split("/").pop()?.split(".")[0] || "");
}
```

### Get Quest Template

```typescript
import { getQuestTemplate } from "@/db/quests";

const quest = await getQuestTemplate(questId);
// Quest includes exercises array with all details
```

### Get Adventure with Boss Fight

```typescript
import { getAdventureDetails } from "@/db/adventures";
import { getBossFightByAdventure } from "@/db/bossFights";

const adventure = await getAdventureDetails(adventureId);
const bossFight = await getBossFightByAdventure(adventureId);

if (bossFight) {
  const bossAsset = getBossAsset(adventure.enTitle.toLowerCase().replace(/\s/g, "_"));
}
```

---

## 🎨 Styling Guidelines (from Copilot Instructions)

### Color Tokens (Use These, Not Hex)

```typescript
// From tamagui.config.ts
const TOKENS = {
  $bgDark: "#0B0F19",        // Main background
  $primary: "#0D33F2",        // Electric blue actions
  $glassBg: "rgba(...)",      // Card backgrounds
  $text: "#F5F5F5",           // Primary text
  $textSecondary: "#B0B0B0",  // Subtitles
  $primaryGlow: "#0D33F2",    // Button glow effect
};
```

### Component Pattern (Glass Cards)

```tsx
import { YStack, Text } from "tamagui";

<YStack
  bg="$glassBg"
  borderColor="$borderStrong"
  borderWidth={1}
  p="$4"
  borderRadius="$4"
>
  <Text color="$text">Content here</Text>
</YStack>
```

### Icon Usage (REQUIRED)

```typescript
// ❌ DON'T DO THIS:
import { Sword } from "lucide-react-native";

// ✅ DO THIS:
import { useGameIcon } from "@/hooks/useGameIcon";

function MyComponent() {
  const { GameIcon } = useGameIcon();
  return <GameIcon name="sword" size={24} color="$primary" />;
}
```

---

## 🔧 Boss Fight Damage Calculation (Reference)

```typescript
/**
 * Calculate damage dealt to boss based on exercise performance
 */
function calculateBossDamage(params: {
  result: number;          // Reps or seconds performed
  target: number;          // Expected target
  muscle: MuscleCode;      // Exercise muscle group
  weakness: MuscleCode | null;    // Boss weakness
  resistance: MuscleCode | null;  // Boss resistance
}): number {
  let damage = params.result;

  // Critical hit bonus (exceeded target)
  if (params.result >= params.target) {
    damage *= 1.5;
  }

  // Muscle modifier
  if (params.muscle === params.weakness) {
    damage *= 1.5;  // Weakness bonus
  } else if (params.muscle === params.resistance) {
    damage *= 0.5;  // Resistance penalty
  }

  return Math.round(damage);
}
```

---

## 📱 UI Integration Examples

### Exercise Card

```tsx
import { getExerciseAsset } from "@/constants/assetMap";
import { YStack, XStack, Text, Image } from "tamagui";

function ExerciseCard({ exercise }) {
  const asset = getExerciseAsset(exercise.imagePath.split("/").pop()?.split(".")[0]);

  return (
    <YStack bg="$glassBg" borderRadius="$4" p="$4">
      <Image source={asset} width={150} height={150} />
      <Text color="$text" fontSize="$5" fontWeight="bold">
        {exercise.enName}
      </Text>
      <Text color="$textSecondary" fontSize="$3">
        {exercise.enDescription}
      </Text>
    </YStack>
  );
}
```

### Quest Gallery Item

```tsx
import { getQuestAsset } from "@/constants/assetMap";

function QuestGalleryCard({ quest }) {
  const coverAsset = getQuestAsset(quest.enTitle.toLowerCase().replace(/\s/g, "_"));

  return (
    <YStack>
      <Image
        source={coverAsset}
        width="100%"
        aspectRatio={16 / 9}
        borderRadius="$4"
      />
      <Text color="$text" mt="$2">
        {quest.enTitle}
      </Text>
    </YStack>
  );
}
```

### Boss Battle UI

```tsx
import { getBossAsset } from "@/constants/assetMap";
import { ProgressBar } from "@/components/common/ProgressBar";

function BossBattleScreen({ bossFight, adventure }) {
  const bossAsset = getBossAsset("fire_dragon");
  const hpPercent = (bossFight.currentHp / bossFight.totalHp) * 100;

  return (
    <YStack flex={1} bg="$bgDark" p="$4">
      <Image source={bossAsset} width={300} height={300} alignSelf="center" />

      <XStack ai="center" gap="$2" mt="$4">
        <Text color="$text" fontSize="$6" fontWeight="bold">
          HP:
        </Text>
        <YStack flex={1}>
          <ProgressBar
            progress={hpPercent}
            color="$destructive"
            height={20}
          />
          <Text color="$text" fontSize="$3" mt="$1">
            {bossFight.currentHp} / {bossFight.totalHp}
          </Text>
        </YStack>
      </XStack>

      {/* Weakness/Resistance info */}
      <XStack gap="$2" mt="$3">
        <Text color="$success">
          ⚡ Weak to: {bossFight.weaknessMuscle?.toUpperCase()}
        </Text>
        <Text color="$destructive">
          🛡️ Resists: {bossFight.resistanceMuscle?.toUpperCase()}
        </Text>
      </XStack>
    </YStack>
  );
}
```

---

## 🌐 Localization (i18n)

### Exercise Names

```typescript
import { useTranslation } from "react-i18next";

const { i18n } = useTranslation();
const exerciseName = i18n.language === "fr" ? exercise.frName : exercise.enName;
const description = i18n.language === "fr" ? exercise.frDescription : exercise.enDescription;
```

### Quest Titles

```typescript
const questTitle = i18n.language === "fr" ? quest.frTitle : quest.enTitle;
```

---

## ⚠️ Common Pitfalls

### ❌ DON'T

```typescript
// Hardcoded hex colors
<View style={{ backgroundColor: "#0B0F19" }} />

// Direct icon imports
import { Sword } from "lucide-react-native";

// Hardcoded text
<Text>Complete the quest!</Text>

// Missing asset fallback
<Image source={EXERCISE_ASSETS.goblin_squat} /> // Crashes if missing
```

### ✅ DO

```typescript
// Use Tamagui tokens
<YStack bg="$bgDark" />

// Use custom hook
const { GameIcon } = useGameIcon();
<GameIcon name="sword" />

// Use i18n
<Text>{t("quest.complete")}</Text>

// Use helper with fallback
<Image source={getExerciseAsset("goblin_squat")} /> // Falls back to placeholder
```

---

## 🔍 Testing Checklist

- [ ] All 20 new exercises display correctly
- [ ] Quest covers load in gallery
- [ ] Boss images appear in battle screen
- [ ] Adventure covers show in campaign list
- [ ] Fallback images work for missing assets
- [ ] French translations display correctly
- [ ] Icons use `useGameIcon` hook
- [ ] Colors use Tamagui tokens (no hex)
- [ ] Boss damage calculation is accurate
- [ ] Resources earned match muscle groups

---

## 📚 Additional Resources

- **Asset Map**: [constants/assetMap.ts](../constants/assetMap.ts)
- **Content Spec**: [docs/content_generation_complete.md](../docs/content_generation_complete.md)
- **Design Guide**: [docs/best_practice_workout.md](../docs/best_practice_workout.md)
- **Copilot Instructions**: [.github/copilot-instructions.md](../.github/copilot-instructions.md)

---

**Need Help?** Check the docs above or ask in the dev channel.
