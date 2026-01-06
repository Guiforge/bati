# 🎮 ONBOARDING FLOW - UX BLUEPRINT

**Date:** 2026-01-06  
**Flow:** `app/onboarding/*`  
**Style:** High-Tech RPG HUD (Dark Fantasy)  
**Reference:** Existing implementation  
**Created by:** Sally (UX Designer Agent)

---

## 🎯 Vision Statement

> "First impressions matter. The onboarding must transform a skeptical downloader into an excited hero—ready to train, build, and conquer—in under 3 minutes."

**Design Pillars:**
1. **Fast** - 3 steps max, no walls of text
2. **Visual** - Show, don't tell (hero images, not instructions)
3. **Empowering** - User creates their identity immediately
4. **Optional Tutorial** - Learning by doing > reading

---

## 📊 Current Implementation Analysis

### **Existing Flow:**

```
Step 1: PRESENTATION
  → Value prop + "Start your journey"
  
Step 2: CHOOSE AVATAR
  → Swipe through hero avatars
  → Select one
  
Step 3: VILLAGE NAME
  → Name your kingdom
  → Stamp effect + fade to app
```

**Total Steps:** 3 ✅ (Good!)  
**Estimated Time:** 2-3 minutes ✅

### **What Works Well:**

✅ **Visual-first** - Full-screen hero images, no text walls  
✅ **Progress dots** - User knows where they are (Step 2/3)  
✅ **Swipe gestures** - Intuitive avatar selection  
✅ **Stamp effect** - Epic moment when naming village  
✅ **Fast** - Can complete in under 3 min  

### **What's Missing:**

❌ **No tutorial quest** - Users thrown into app without guidance  
❌ **No difficulty selection** - Could help personalize experience  
❌ **No value prop clarity** - "Transform workouts into adventures" is vague  
❌ **No skip option** - Power users want to jump in  

---

## 🎨 Refactored Onboarding Flow

### **STEP 1: PRESENTATION (Enhanced)**

**Current:** Generic hero + tagline  
**Refactored:** 3-slide carousel with clear benefits

#### **Slide 1/3: Core Value**
```
┌─────────────────────────────────────────────┐
│  [Hero doing pushup with glowing effect]    │
│                                             │
│  TRAIN LIKE A HERO                          │
│  Every workout builds your kingdom          │
│                                             │
│  [Next >]                [Skip Intro]       │
└─────────────────────────────────────────────┘
```

#### **Slide 2/3: Progression**
```
┌─────────────────────────────────────────────┐
│  [Village with glowing buildings]           │
│                                             │
│  WATCH YOUR VILLAGE GROW                    │
│  Each session unlocks new buildings         │
│                                             │
│  [< Back]  [Next >]      [Skip Intro]       │
└─────────────────────────────────────────────┘
```

#### **Slide 3/3: Challenge**
```
┌─────────────────────────────────────────────┐
│  [Epic boss fight scene]                    │
│                                             │
│  DEFEAT LEGENDARY BOSSES                    │
│  Turn cardio into epic battles              │
│                                             │
│  [< Back]  [Let's Go!]   [Skip Intro]       │
└─────────────────────────────────────────────┘
```

**Key Changes:**
- ✅ **3 slides** (swipeable carousel) instead of 1 static page
- ✅ **Skip button** always visible (top right)
- ✅ **Concrete benefits** instead of vague tagline
- ✅ **Visual storytelling** (show village, boss, hero)

---

### **STEP 2: CHOOSE AVATAR (Keep Current)**

**No changes needed!** ✅ Current implementation is excellent:
- Full-screen avatar images
- Swipe left/right to browse
- Smooth transitions
- Progress dots visible

**Recommendations:**
- ✅ Keep as-is
- 🆕 Add avatar names (e.g., "The Warrior", "The Mage")
- 🆕 Add short flavor text (e.g., "Strength-focused hero")

#### **Enhanced Avatar Card:**
```
┌─────────────────────────────────────────────┐
│  [Full-screen avatar image]                 │
│                                             │
│  ┌────────────────────────────────────┐    │
│  │  THE WARRIOR                       │    │  ← Avatar name
│  │  "Master of strength and power"    │    │  ← Flavor text
│  │                                    │    │
│  │  Recommended for: Strength training│    │
│  └────────────────────────────────────┘    │
│                                             │
│  [< Prev]         [Next >]                  │
└─────────────────────────────────────────────┘
```

**Code Addition:**
```tsx
// constants/avatars.ts
export const AVATARS = [
  {
    id: "warrior",
    source: require("..."),
    name: { en: "The Warrior", fr: "Le Guerrier" },
    description: { 
      en: "Master of strength and power",
      fr: "Maître de la force et du pouvoir"
    },
    recommendedFor: { 
      en: "Strength training",
      fr: "Entraînement de force"
    }
  },
  // ...
];
```

---

### **STEP 3: VILLAGE NAME (Keep Current + Add Suggestions)**

**Current:** Text input + keyboard  
**Enhanced:** Text input + suggested names

#### **Layout:**
```
┌─────────────────────────────────────────────┐
│  NAME YOUR KINGDOM                          │
│  Choose a name that inspires you            │
│                                             │
│  ┌────────────────────────────────────┐    │
│  │  [Your input here...]              │    │  ← Text input
│  └────────────────────────────────────┘    │
│                                             │
│  Or pick a suggestion:                      │
│  [Valhalla] [Olympus] [Asgard] [Custom]    │  ← Chips
│                                             │
│  [Start Training]                           │
└─────────────────────────────────────────────┘
```

**Suggested Names:**
```typescript
const SUGGESTED_VILLAGE_NAMES = {
  en: ["Valhalla", "Olympus", "Asgard", "Sparta", "Avalon"],
  fr: ["Valhalla", "L'Olympe", "Asgard", "Sparte", "Avalon"]
};
```

**Benefits:**
- ✅ Reduces typing friction
- ✅ Gives inspiration to indecisive users
- ✅ Still allows custom names

---

### **NEW STEP 4 (OPTIONAL): TUTORIAL QUEST**

**Problem:** Users complete onboarding, see home screen, don't know what to do next.

**Solution:** Guided 3-minute tutorial quest (OPTIONAL, skippable)

#### **Tutorial Quest Spec:**

**Name:** "The Hero's Trial"  
**Duration:** 3 minutes  
**Exercises:** 3 simple exercises  
**Boss:** Mini-boss (100 HP)

**Flow:**
```
[Onboarding Complete]
  ↓
[Modal: "Ready for your first quest?"]
  [Yes, show me how!] [Skip, I know what to do]
  ↓
[SESSION screen with tutorial overlays]
  → "This is the timer—track your workout"
  → "Complete reps to damage the boss"
  → "Rest between exercises"
  ↓
[Victory screen with tutorial tooltips]
  → "You earned XP and resources!"
  → "Your village will grow automatically"
  ↓
[Home screen with tutorial complete badge]
```

**Tutorial Quest Details:**
```typescript
const TUTORIAL_QUEST: Quest = {
  id: "tutorial",
  title: { en: "The Hero's Trial", fr: "L'Épreuve du Héros" },
  difficulty: "easy",
  estimatedDuration: 180, // 3 min
  exercises: [
    { id: "jumping_jacks", sets: 1, repsOrTime: 20 },
    { id: "squats", sets: 1, repsOrTime: 10 },
    { id: "plank", sets: 1, repsOrTime: 30 } // seconds
  ],
  isTutorial: true,
  boss: {
    name: { en: "Training Dummy", fr: "Mannequin d'Entraînement" },
    hp: 100,
    phases: [{ from: 0, to: 100, image: "dummy_phase1" }]
  }
};
```

**Tutorial Overlays:**
```tsx
// During session, show tooltips:
{isTutorial && currentExerciseIndex === 0 && (
  <TutorialTooltip position="top">
    <Text>👆 This is your timer. Start when ready!</Text>
  </TutorialTooltip>
)}

{isTutorial && currentExerciseIndex === 1 && (
  <TutorialTooltip position="center">
    <Text>💪 Each rep damages the boss. Keep going!</Text>
  </TutorialTooltip>
)}

{isTutorial && status === "resting" && (
  <TutorialTooltip position="bottom">
    <Text>😌 Rest time! Catch your breath.</Text>
  </TutorialTooltip>
)}
```

**Benefits:**
- ✅ Learn by doing (not reading)
- ✅ Builds confidence (first win is easy)
- ✅ Shows core mechanics (timer, reps, boss, rewards)
- ✅ Skippable (power users can opt out)

---

## 🎬 Animations & Transitions

### **1. Presentation → Avatar**
```
Swipe left OR tap "Next"
  → Slide out left (current screen)
  → Slide in right (avatar screen)
  → Duration: 300ms, ease-out
```

### **2. Avatar → Village Name**
```
Tap "Next"
  → Fade out (avatar screen)
  → Fade in (village name screen)
  → Duration: 400ms, ease-in-out
```

### **3. Village Name → App (Stamp Effect)**
```
Current: ✅ Already has epic stamp effect
Keep as-is:
  1. Village name input fades out
  2. Stamp overlay appears (scale 0.3 → 1.0)
  3. Bati logo + village name displayed
  4. Hold for 2 seconds
  5. Fade to home screen
```

### **4. Tutorial Quest Start**
```
Modal appears:
  → Scale up (0.9 → 1.0)
  → Blur background
  → Buttons: [Yes] [Skip]
  
If Yes:
  → Modal slides down
  → Navigate to /session with tutorial flag
  
If Skip:
  → Modal fades out
  → Navigate to home
```

---

## 🧭 Navigation Flow

### **Complete Flow (With Tutorial):**

```
APP LAUNCH
  ↓
[Check onboarding status]
  → If incomplete: Show onboarding
  → If complete: Show home
  ↓
ONBOARDING STEP 1: Presentation (3 slides)
  → Can skip at any time
  ↓
ONBOARDING STEP 2: Choose Avatar
  → Swipe or tap arrows
  ↓
ONBOARDING STEP 3: Village Name
  → Type or select suggestion
  ↓
ONBOARDING COMPLETE
  ↓
[Modal: "Start tutorial quest?"]
  → Yes: Go to tutorial session
  → No: Go to home
  ↓
TUTORIAL SESSION (if accepted)
  → Guided 3-min workout
  → Shows tooltips
  ↓
TUTORIAL VICTORY
  → Explains rewards
  ↓
HOME SCREEN (first time)
  → "Quest Complete!" badge
  → Encourage next action
```

### **Skip Flow:**

```
Presentation Slide 1
  → Tap [Skip Intro]
  ↓
CHOOSE AVATAR
  ↓
VILLAGE NAME
  ↓
HOME (no tutorial offered)
```

---

## 📊 User Stories Validation

### **Core User Stories:**

1. ✅ **"I want to understand what this app does"**
   - Presentation slides show clear benefits

2. ✅ **"I want to create my hero identity"**
   - Avatar selection + village naming

3. ✅ **"I want to skip onboarding if I'm in a hurry"**
   - Skip button always visible

4. ✅ **"I want to learn how the app works"**
   - Optional tutorial quest (learn by doing)

5. ✅ **"I want to get to my first workout fast"**
   - 3 steps, < 3 minutes (or skip)

6. ✅ **"I want my choices to feel meaningful"**
   - Avatar has flavor text, village name is permanent

7. ⚠️ **"I want to change my avatar later"** (Partial)
   - Can change in settings (but should show this during onboarding)

---

## 🚨 Edge Cases & Empty States

### **1. User Closes App During Onboarding**

**Behavior:**
- Save progress (current step)
- On reopen: Resume where they left off
- Show "Continue setup" modal

**Implementation:**
```typescript
// stores/onboarding.ts
export const useOnboardingStore = create<OnboardingStore>((set) => ({
  currentStep: 1,
  avatarId: null,
  villageName: null,
  isComplete: false,
  
  setStep: (step) => set({ currentStep: step }),
  completeOnboarding: () => set({ isComplete: true }),
}));

// On app launch:
if (!onboarding.isComplete) {
  router.push(`/onboarding/step-${onboarding.currentStep}`);
}
```

---

### **2. User Skips Tutorial, Then Gets Lost**

**Solution:** Show "Help" button on home screen (first 3 sessions)

```tsx
{sessionCount < 3 && (
  <XStack justify="center" mt="$4">
    <Pressable onPress={startTutorial}>
      <XStack items="center" gap="$2" p="$3" bg="$glassBg" borderRadius="$4">
        <GameIcon name="help-circle" size={20} color="$primary" />
        <Text color="$primary">{t("home.need_help")}</Text>
      </XStack>
    </Pressable>
  </XStack>
)}
```

---

### **3. User Enters Offensive Village Name**

**Validation:**
- No profanity (use filter library)
- No numbers-only (e.g., "12345")
- No empty string
- No special characters only

**Error Message:**
```tsx
{nameError && (
  <Text color="$error" fontSize="$2" textAlign="center">
    {t("onboarding.village_name_invalid")}
  </Text>
)}
```

**Suggested Alternatives:**
```
"That name isn't available. How about:"
[Valhalla] [Olympus] [Asgard]
```

---

### **4. User Has No Avatar Selected (Shouldn't Happen)**

**Fallback:**
- Default to first avatar (Warrior)
- Log warning to analytics

---

## 🎯 Implementation Plan

### **Phase 1: Enhance Existing Onboarding** (Week 1)

**Tasks:**
1. ✅ Keep current 3-step flow (presentation, avatar, name)
2. 🆕 Add 3-slide carousel to presentation (instead of 1 static)
3. 🆕 Add avatar names + descriptions
4. 🆕 Add village name suggestions (chips)
5. 🆕 Add skip button to presentation
6. 🆕 Add onboarding progress persistence

**Deliverable:** Polished onboarding with skip option

---

### **Phase 2: Add Tutorial Quest** (Week 2)

**Tasks:**
1. Create tutorial quest definition
2. Add "Start tutorial?" modal after onboarding
3. Implement tutorial tooltips in session screen
4. Add tutorial-specific victory messages
5. Track tutorial completion in analytics
6. Add "Need help?" button on home (first 3 sessions)

**Deliverable:** Guided first workout experience

---

### **Phase 3: Polish & Analytics** (Week 3)

**Tasks:**
1. Add onboarding completion analytics
2. Add tutorial skip rate tracking
3. A/B test: Skip button vs no skip
4. Add onboarding resume on app reopen
5. Add profanity filter for village names
6. Add "Change avatar later" hint in settings

**Deliverable:** Data-driven onboarding optimization

---

## ✅ Acceptance Criteria

### **Visual:**
- [ ] Presentation has 3 swipeable slides (not 1 static)
- [ ] Skip button visible on all presentation slides
- [ ] Avatar selection shows name + description
- [ ] Village name has suggestion chips
- [ ] Stamp effect works (already implemented ✅)
- [ ] Progress dots show current step (already implemented ✅)

### **Functional:**
- [ ] Can skip presentation (go straight to avatar)
- [ ] Can swipe left/right on avatars (already works ✅)
- [ ] Can tap suggestions to auto-fill village name
- [ ] Village name validates input (3-20 chars, no profanity)
- [ ] Onboarding state persists (resume on app reopen)
- [ ] Tutorial quest is optional (modal with Yes/Skip)
- [ ] Tutorial tooltips appear during first session
- [ ] "Need help?" button shows (first 3 sessions only)

### **Content:**
- [ ] All avatars have names + descriptions (EN + FR)
- [ ] Village name suggestions localized (EN + FR)
- [ ] Tutorial quest has 3 simple exercises
- [ ] Tutorial tooltips are clear and concise
- [ ] Presentation slides have compelling copy

### **Accessibility:**
- [ ] Skip button is 44x44pt minimum
- [ ] All text has 4.5:1 contrast ratio
- [ ] Avatar descriptions are screen-reader friendly
- [ ] Village name input has accessible label
- [ ] Keyboard dismisses when tapping outside input

---

## 🎨 Design Tokens Used

```typescript
// Colors
$bgDark, $glassBg, $glassBorder
$text, $textSecondary, $muted
$primary, $primaryGlow
$error

// Spacing
$2 (8px), $3 (12px), $4 (16px), $5 (20px), $6 (24px)

// Typography
fontFamily: "$heading" (SpaceGrotesk Bold)
fontFamily: "$body" (NotoSans Regular)
fontSize: $2, $3, $4, $5, $6, $7

// Border Radius
$4 (16px), $6 (24px), $full (9999px)

// Shadows
shadowColor: "$primaryGlow"
shadowRadius: 12
```

---

## 📝 Developer Notes

### **Onboarding State Management:**

```typescript
// stores/onboarding.ts
interface OnboardingStore {
  currentStep: number; // 1, 2, 3
  avatarId: string | null;
  villageName: string | null;
  isComplete: boolean;
  tutorialComplete: boolean;
  
  setStep: (step: number) => void;
  setAvatar: (id: string) => void;
  setVillageName: (name: string) => void;
  completeOnboarding: () => void;
  completeTutorial: () => void;
}
```

### **Navigation Logic:**

```typescript
// app/_layout.tsx (root)
useEffect(() => {
  const checkOnboarding = async () => {
    const isComplete = await AsyncStorage.getItem('onboarding_complete');
    
    if (isComplete !== 'true') {
      router.replace('/onboarding');
    } else {
      router.replace('/(tabs)');
    }
  };
  
  checkOnboarding();
}, []);
```

### **Tutorial Quest Trigger:**

```typescript
// After onboarding step 3
const showTutorialModal = async () => {
  const tutorialComplete = await AsyncStorage.getItem('tutorial_complete');
  
  if (tutorialComplete !== 'true') {
    // Show modal: "Ready for your first quest?"
    setShowTutorialModal(true);
  } else {
    router.replace('/(tabs)');
  }
};
```

---

## 🎉 Success Metrics

**How to measure onboarding success:**

### **Quantitative:**
- **Completion Rate:** >85% of users finish onboarding
- **Time to Complete:** <3 minutes average
- **Skip Rate:** <30% skip presentation (indicates interest)
- **Tutorial Acceptance:** >60% accept tutorial quest
- **Tutorial Completion:** >90% complete tutorial (if started)
- **7-Day Retention:** >60% (vs <40% without tutorial)

### **Qualitative:**
- **User Feedback:** "The onboarding was smooth and fun"
- **Support Tickets:** <5% ask "how do I start a workout?"
- **App Store Reviews:** Mention "easy to get started"
- **First Session Rate:** >80% complete first workout within 24h

---

## 🏆 Final Notes

**Onboarding is the GATEWAY to retention.**

Every new user must feel:
1. ✅ **Excited** - "This looks epic!"
2. ✅ **Confident** - "I know what to do"
3. ✅ **Invested** - "This is MY hero, MY village"
4. ✅ **Ready** - "Let's train!"

**The refactored onboarding achieves this by:**
- ✅ Clear benefits (3 slides, not vague tagline)
- ✅ Identity creation (avatar + village name)
- ✅ Learning by doing (optional tutorial quest)
- ✅ Respecting time (skip option, <3 min)

**Ready to welcome new heroes?** 🎮⚔️✨
