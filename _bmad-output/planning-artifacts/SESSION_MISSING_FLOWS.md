# 🎮 SESSION MISSING FLOWS SPECIFICATION

**Date:** 2026-01-06  
**Issue:** Critical user flows missing from session experience  
**Missing:** Modify Exercise, Share Victory  
**Created by:** Sally (UX Designer Agent)

---

## 🎯 Problem Statement

> "Users encounter real-world situations during workouts that the current session flow doesn't handle: injuries requiring exercise modification, and the desire to share epic victories with friends."

**User Stories Not Addressed:**
1. ❌ **"I can't do this exercise (injury/equipment)"** → No modify/skip option
2. ❌ **"I want to share my victory"** → No sharing feature

---

## 🚨 Current Session Flow Gaps

### **Gap 1: Exercise Modification**

**Scenario:**
```
User starts "Iron Arms" quest
  ↓
Exercise 2: Pull-ups (10 reps)
  ↓
User: "I don't have a pull-up bar!"
  ↓
Current options:
  - [Resume] [End Workout] ← No modify option!
  ↓
User forced to:
  - Skip quest entirely
  - OR do exercise incorrectly
  - OR quit app in frustration
```

**Impact:**
- **Accessibility Issue:** Users with injuries excluded
- **Equipment Issue:** Users without gear can't complete quests
- **Retention Risk:** Frustrated users abandon app

---

### **Gap 2: Victory Sharing**

**Scenario:**
```
User completes epic boss fight
  ↓
Victory screen: XP + Loot + Level up
  ↓
User: "This is amazing, I want to share this!"
  ↓
Current options:
  - [Continue to Village] [View Details] ← No share option!
  ↓
User must:
  - Take manual screenshot
  - Leave app, open social media
  - Upload manually
```

**Impact:**
- **Viral Growth Lost:** No easy sharing = no word-of-mouth
- **User Pride Unshared:** Epic moments stay private
- **Engagement Missed:** Users want to celebrate publicly

---

## ✅ Solution 1: Exercise Modification Flow

### **Entry Point: PausedOverlay**

**Enhanced Paused Menu:**

```
┌─────────────────────────────────────────────┐
│           ⏸️ PAUSED                         │
├─────────────────────────────────────────────┤
│                                             │
│  Current Exercise:                          │
│  PULL-UPS • 10 reps                         │
│                                             │
│  [Resume Workout]                           │  ← Primary action
│                                             │
│  [Modify This Exercise]                     │  ← NEW
│                                             │
│  [Skip This Exercise]                       │  ← NEW
│                                             │
│  [End Workout]                              │  ← Destructive
│                                             │
└─────────────────────────────────────────────┘
```

---

### **Modify Exercise Modal**

**Layout:**

```
┌─────────────────────────────────────────────┐
│  MODIFY EXERCISE              [X]           │
├─────────────────────────────────────────────┤
│                                             │
│  Can't do Pull-ups?                         │
│  Choose an alternative:                     │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │  🔄 ASSISTED PULL-UPS                │   │  ← Easier variant
│  │  Same muscles, easier difficulty     │   │
│  │  [Select]                            │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │  🔄 INVERTED ROWS                    │   │  ← Alternative
│  │  Similar muscles, different form     │   │
│  │  [Select]                            │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │  🔄 NEGATIVE PULL-UPS                │   │  ← Progression
│  │  Build toward full pull-ups          │   │
│  │  [Select]                            │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  OR                                         │
│                                             │
│  [Skip This Exercise]                       │  ← Last resort
│                                             │
└─────────────────────────────────────────────┘
```

---

### **Exercise Alternative System**

**Database Schema:**

```typescript
// Exercise alternatives (in exercises table)
interface Exercise {
  id: number;
  name: string;
  // ... existing fields
  
  // NEW FIELDS:
  alternatives?: number[];  // IDs of alternative exercises
  easierVariant?: number;   // ID of easier version
  harderVariant?: number;   // ID of harder version
}

// Example:
{
  id: 42,
  name: "Pull-ups",
  alternatives: [43, 44],      // [Inverted Rows, Assisted Pull-ups]
  easierVariant: 44,           // Assisted Pull-ups
  harderVariant: 45,           // Weighted Pull-ups
}
```

---

### **Alternative Selection Logic**

```typescript
function getExerciseAlternatives(exerciseId: number): ExerciseAlternative[] {
  const exercise = getExerciseById(exerciseId);
  const alternatives: ExerciseAlternative[] = [];

  // 1. Easier variant (if exists)
  if (exercise.easierVariant) {
    const easier = getExerciseById(exercise.easierVariant);
    alternatives.push({
      id: easier.id,
      name: easier.name,
      type: "easier",
      icon: "🔽",
      description: t("exercise.easier_variant"),
    });
  }

  // 2. Alternative exercises (same muscles, different form)
  if (exercise.alternatives) {
    exercise.alternatives.forEach(altId => {
      const alt = getExerciseById(altId);
      alternatives.push({
        id: alt.id,
        name: alt.name,
        type: "alternative",
        icon: "🔄",
        description: t("exercise.alternative"),
      });
    });
  }

  // 3. Harder variant (for advanced users)
  if (exercise.harderVariant) {
    const harder = getExerciseById(exercise.harderVariant);
    alternatives.push({
      id: harder.id,
      name: harder.name,
      type: "harder",
      icon: "🔼",
      description: t("exercise.harder_variant"),
    });
  }

  return alternatives;
}
```

---

### **Modify Exercise Flow**

```
User taps [Pause] during active exercise
  ↓
PausedOverlay shows menu
  ↓
User taps [Modify This Exercise]
  ↓
ModifyExerciseModal opens
  ↓
Load alternatives for current exercise
  ↓
Display 2-3 alternatives + skip option
  ↓
User selects alternative:
  ↓
  Option A: [Select Alternative]
    → Replace exercise in session
    → Save modification to history
    → Resume workout with new exercise
    → Victory screen shows: "Modified: Pull-ups → Inverted Rows"
  
  Option B: [Skip This Exercise]
    → Mark exercise as skipped
    → Move to next exercise or rest
    → Victory screen shows: "Skipped: 1 exercise"
    → Boss damage reduced proportionally
```

---

### **Code Implementation**

**ModifyExerciseModal Component:**

```tsx
import { Modal, ScrollView } from "react-native";
import { YStack, XStack, Text } from "tamagui";
import { GlassCard } from "@/components/common/GlassCard";
import { HUDButton } from "@/components/common/HUDButton";

interface ModifyExerciseModalProps {
  visible: boolean;
  exercise: Exercise;
  onSelect: (alternativeId: number) => void;
  onSkip: () => void;
  onClose: () => void;
}

export function ModifyExerciseModal({
  visible,
  exercise,
  onSelect,
  onSkip,
  onClose
}: ModifyExerciseModalProps) {
  const { t } = useTranslation();
  const alternatives = getExerciseAlternatives(exercise.id);

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <YStack flex={1} bg="rgba(0,0,0,0.8)" justify="center" px="$4">
        <GlassCard maxHeight="80%">
          <YStack gap="$4" p="$4">
            {/* Header */}
            <XStack justify="space-between" items="center">
              <Text fontFamily="$heading" fontSize="$6" color="$text">
                {t("session.modify_exercise")}
              </Text>
              <Pressable onPress={onClose}>
                <GameIcon name="x" size={24} color="$textSecondary" />
              </Pressable>
            </XStack>

            {/* Current Exercise */}
            <YStack gap="$2">
              <Text fontSize="$3" color="$textSecondary">
                {t("session.current_exercise")}:
              </Text>
              <Text fontSize="$5" fontWeight="bold" color="$text">
                {exercise.name}
              </Text>
              <Text fontSize="$3" color="$textSecondary">
                {t("session.cant_do_exercise")}
              </Text>
            </YStack>

            {/* Alternatives List */}
            <ScrollView maxHeight={400}>
              <YStack gap="$3">
                {alternatives.map(alt => (
                  <AlternativeCard
                    key={alt.id}
                    alternative={alt}
                    onSelect={() => onSelect(alt.id)}
                  />
                ))}
              </YStack>
            </ScrollView>

            {/* Skip Option */}
            <YStack gap="$2" mt="$4">
              <Text fontSize="$3" color="$textSecondary" textAlign="center">
                {t("session.or")}
              </Text>
              <HUDButton
                variant="secondary"
                onPress={onSkip}
              >
                {t("session.skip_exercise")}
              </HUDButton>
            </YStack>
          </YStack>
        </GlassCard>
      </YStack>
    </Modal>
  );
}

function AlternativeCard({ alternative, onSelect }) {
  const { t } = useTranslation();

  return (
    <Pressable onPress={onSelect}>
      <GlassCard pressStyle={{ scale: 0.98 }}>
        <XStack items="center" gap="$3" p="$4">
          <Text fontSize={32}>{alternative.icon}</Text>
          <YStack flex={1} gap="$1">
            <Text fontSize="$4" fontWeight="bold" color="$text">
              {alternative.name}
            </Text>
            <Text fontSize="$3" color="$textSecondary">
              {alternative.description}
            </Text>
          </YStack>
          <HUDButton size="small">
            {t("common.select")}
          </HUDButton>
        </XStack>
      </GlassCard>
    </Pressable>
  );
}
```

---

### **Session Store Integration**

```typescript
// stores/session.ts
interface SessionStore {
  // ... existing fields
  
  modifiedExercises: Map<number, number>;  // original ID → replacement ID
  skippedExercises: Set<number>;           // exercise IDs
  
  modifyExercise: (originalId: number, replacementId: number) => void;
  skipExercise: (exerciseId: number) => void;
}

// Implementation:
modifyExercise: (originalId, replacementId) => {
  set(state => {
    const newModified = new Map(state.modifiedExercises);
    newModified.set(originalId, replacementId);
    
    // Replace exercise in current session
    const exercises = [...state.quest.exercises];
    const index = exercises.findIndex(e => e.id === originalId);
    if (index !== -1) {
      exercises[index] = getExerciseById(replacementId);
    }
    
    return {
      modifiedExercises: newModified,
      quest: { ...state.quest, exercises },
      status: "running", // Resume
    };
  });
},

skipExercise: (exerciseId) => {
  set(state => {
    const newSkipped = new Set(state.skippedExercises);
    newSkipped.add(exerciseId);
    
    // Move to next exercise
    return {
      skippedExercises: newSkipped,
      currentExerciseIndex: state.currentExerciseIndex + 1,
      status: "resting", // Go to rest
    };
  });
},
```

---

## ✅ Solution 2: Victory Sharing Flow

### **Entry Point: VictoryView**

**Enhanced Victory Screen:**

```
┌─────────────────────────────────────────────┐
│           ⚔️ QUEST COMPLETE! ⚔️             │
├─────────────────────────────────────────────┤
│                                             │
│  +150 XP   Level 5 ████░░                   │
│                                             │
│  LOOT:                                      │
│  🪙 +45  🪵 +30  🪨 +15                     │
│                                             │
│  🏰 Forge upgraded! (Lv.3)                  │
│                                             │
│  [Share Victory] 📤                         │  ← NEW
│                                             │
│  [Continue to Village]                      │
│                                             │
└─────────────────────────────────────────────┘
```

---

### **Share Victory Modal**

**Layout:**

```
┌─────────────────────────────────────────────┐
│  SHARE VICTORY                [X]           │
├─────────────────────────────────────────────┤
│                                             │
│  Preview:                                   │
│  ┌─────────────────────────────────────┐   │
│  │  [Shareable Image]                  │   │  ← Generated image
│  │                                     │   │
│  │  💪 QUEST COMPLETE!                 │   │
│  │  "Iron Arms Challenge"              │   │
│  │                                     │   │
│  │  Level 12 Warrior                   │   │
│  │  +150 XP • 3 buildings upgraded     │   │
│  │                                     │   │
│  │  🏰 Bati - Train like a hero        │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  [📱 Share to Social]                       │  ← Opens share sheet
│  [💾 Save to Photos]                        │  ← Save locally
│  [📋 Copy Stats]                            │  ← Copy text
│                                             │
└─────────────────────────────────────────────┘
```

---

### **Shareable Image Generation**

**Template Types:**

**Type 1: Quest Complete**
```
┌─────────────────────────────────┐
│  [Background: Dark gradient]    │
│                                 │
│  ⚔️ QUEST COMPLETE!             │
│                                 │
│  "Iron Arms Challenge"          │
│                                 │
│  🏆 Level 12 Warrior            │
│  ⚡ +150 XP earned              │
│  🏰 3 buildings upgraded         │
│                                 │
│  [Bati Logo]                    │
│  Train like a hero              │
└─────────────────────────────────┘
```

**Type 2: Boss Defeated**
```
┌─────────────────────────────────┐
│  [Background: Boss image]       │
│                                 │
│  🐉 BOSS DEFEATED!              │
│                                 │
│  "The Iron Golem"               │
│                                 │
│  💪 Guiforge - Level 12         │
│  ⚔️ 450 damage dealt            │
│  🏆 Legendary victory!          │
│                                 │
│  [Bati Logo]                    │
└─────────────────────────────────┘
```

**Type 3: Level Up**
```
┌─────────────────────────────────┐
│  [Background: Glow effects]     │
│                                 │
│  ✨ LEVEL UP! ✨               │
│                                 │
│  Level 12 → Level 13            │
│                                 │
│  💪 Guiforge                    │
│  🏰 Glorious Kingdom            │
│  🔥 12-day streak               │
│                                 │
│  [Bati Logo]                    │
│  Train like a hero              │
└─────────────────────────────────┘
```

---

### **Code Implementation**

**ShareVictoryModal Component:**

```tsx
import { Modal, Share, Platform } from "react-native";
import ViewShot from "react-native-view-shot";
import * as MediaLibrary from "expo-media-library";

export function ShareVictoryModal({
  visible,
  victoryData,
  onClose
}: ShareVictoryModalProps) {
  const { t } = useTranslation();
  const viewShotRef = useRef<ViewShot>(null);
  const [imageUri, setImageUri] = useState<string | null>(null);

  // Generate shareable image
  const captureImage = async () => {
    if (!viewShotRef.current) return;
    
    const uri = await viewShotRef.current.capture();
    setImageUri(uri);
  };

  useEffect(() => {
    if (visible) {
      captureImage();
    }
  }, [visible]);

  const handleShare = async () => {
    if (!imageUri) return;

    try {
      await Share.share({
        message: `💪 I just completed "${victoryData.questTitle}" on Bati! Train like a hero: [app link]`,
        url: imageUri, // iOS
        title: "Bati Victory"
      }, {
        dialogTitle: t("share.share_victory"),
        subject: "Check out my workout!", // Email subject
      });
    } catch (error) {
      console.error(error);
    }
  };

  const handleSave = async () => {
    if (!imageUri) return;

    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status !== "granted") {
      alert(t("share.permission_denied"));
      return;
    }

    await MediaLibrary.saveToLibraryAsync(imageUri);
    alert(t("share.saved_to_photos"));
  };

  const handleCopyStats = () => {
    const text = `
💪 Quest Complete: "${victoryData.questTitle}"
⚡ +${victoryData.xp} XP earned
🏆 Level ${victoryData.level}
🏰 ${victoryData.buildingsUpgraded} buildings upgraded
    `.trim();
    
    Clipboard.setString(text);
    alert(t("share.copied"));
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <YStack flex={1} bg="rgba(0,0,0,0.9)" justify="center" px="$4">
        <GlassCard>
          <YStack gap="$4" p="$4">
            {/* Header */}
            <XStack justify="space-between" items="center">
              <Text fontFamily="$heading" fontSize="$6" color="$text">
                {t("share.share_victory")}
              </Text>
              <Pressable onPress={onClose}>
                <GameIcon name="x" size={24} color="$textSecondary" />
              </Pressable>
            </XStack>

            {/* Preview */}
            <YStack items="center">
              <Text fontSize="$3" color="$textSecondary" mb="$2">
                {t("share.preview")}
              </Text>
              
              {/* Hidden ViewShot for image generation */}
              <ViewShot
                ref={viewShotRef}
                options={{ format: "png", quality: 1.0 }}
                style={{ opacity: 0, position: "absolute" }}
              >
                <ShareableImage data={victoryData} />
              </ViewShot>

              {/* Visible Preview */}
              {imageUri && (
                <Image
                  source={{ uri: imageUri }}
                  style={{ width: 300, height: 400, borderRadius: 16 }}
                  contentFit="contain"
                />
              )}
            </YStack>

            {/* Actions */}
            <YStack gap="$3">
              <HUDButton onPress={handleShare}>
                <GameIcon name="share" size={20} />
                <Text>{t("share.share_to_social")}</Text>
              </HUDButton>

              <HUDButton variant="secondary" onPress={handleSave}>
                <GameIcon name="download" size={20} />
                <Text>{t("share.save_to_photos")}</Text>
              </HUDButton>

              <HUDButton variant="secondary" onPress={handleCopyStats}>
                <GameIcon name="copy" size={20} />
                <Text>{t("share.copy_stats")}</Text>
              </HUDButton>
            </YStack>
          </YStack>
        </GlassCard>
      </YStack>
    </Modal>
  );
}
```

---

**ShareableImage Component:**

```tsx
function ShareableImage({ data }: { data: VictoryData }) {
  return (
    <YStack
      width={1080}  // Instagram/social optimal size
      height={1350}
      bg="$bgDark"
      items="center"
      justify="center"
      p="$8"
    >
      {/* Background Gradient */}
      <LinearGradient
        colors={["#0D33F2", "#101323"]}
        style={StyleSheet.absoluteFill}
      />

      {/* Content */}
      <YStack items="center" gap="$6">
        {/* Icon */}
        <Text fontSize={120}>⚔️</Text>

        {/* Title */}
        <Text
          fontFamily="$heading"
          fontSize={64}
          color="white"
          textAlign="center"
          textShadowColor="rgba(0,0,0,0.5)"
          textShadowRadius={12}
        >
          {data.isBoss ? "BOSS DEFEATED!" : "QUEST COMPLETE!"}
        </Text>

        {/* Quest Name */}
        <Text
          fontFamily="$body"
          fontSize={48}
          color="$text"
          textAlign="center"
        >
          "{data.questTitle}"
        </Text>

        {/* Stats */}
        <YStack items="center" gap="$3" mt="$4">
          <Text fontSize={36} color="$text">
            🏆 Level {data.level} {data.className}
          </Text>
          <Text fontSize={36} color="$primary">
            ⚡ +{data.xp} XP earned
          </Text>
          {data.buildingsUpgraded > 0 && (
            <Text fontSize={36} color="$text">
              🏰 {data.buildingsUpgraded} buildings upgraded
            </Text>
          )}
        </YStack>

        {/* Footer */}
        <YStack items="center" gap="$2" mt="$6">
          <Image
            source={require("@/assets/app-icon.png")}
            style={{ width: 80, height: 80, borderRadius: 16 }}
          />
          <Text fontSize={32} color="$textSecondary">
            Bati - Train like a hero
          </Text>
        </YStack>
      </YStack>
    </YStack>
  );
}
```

---

## ✅ Acceptance Criteria

### **Exercise Modification:**
- [ ] "Modify Exercise" button in paused menu
- [ ] Modal shows 2-3 alternatives for current exercise
- [ ] Can select easier/harder variant
- [ ] Can skip exercise as last resort
- [ ] Modified exercise tracked in session history
- [ ] Victory screen shows modifications made
- [ ] Boss damage adjusted for skipped exercises

### **Victory Sharing:**
- [ ] "Share Victory" button on victory screen
- [ ] Generates shareable image (1080x1350px)
- [ ] Image includes: quest name, XP, level, stats
- [ ] Can share to social media (opens share sheet)
- [ ] Can save to photos (with permission)
- [ ] Can copy stats as text
- [ ] Works on iOS + Android

---

## 🎯 User Stories Validation

1. ✅ **"I can't do this exercise (injury)"**
   - Modify exercise flow with alternatives

2. ✅ **"I don't have equipment for this exercise"**
   - Alternative exercises suggested

3. ✅ **"I want to skip this exercise"**
   - Skip option available (but not encouraged)

4. ✅ **"I want to share my epic victory"**
   - Share button generates beautiful image

5. ✅ **"I want to save my workout stats"**
   - Save to photos or copy text

6. ✅ **"I want friends to see my progress"**
   - Easy sharing to social media

---

## 🏆 Success Metrics

**Exercise Modification:**
- **Usage Rate:** >10% of sessions use modify feature
- **Skip Rate:** <5% skip exercises (most use alternatives)
- **Completion Rate:** +15% (users don't quit due to injury)

**Victory Sharing:**
- **Share Rate:** >20% of victories shared
- **Viral Coefficient:** 0.3+ (3 shares = 1 new user)
- **Social Proof:** +25% app downloads from shared images

---

## 📝 Final Notes

**These flows are CRITICAL for:**
1. **Accessibility** - Users with limitations can still train
2. **Retention** - Users don't quit due to equipment issues
3. **Growth** - Social sharing drives viral acquisition

**Missing these = losing users.** ⚠️

**Ready to complete the session experience!** 🎮✨
