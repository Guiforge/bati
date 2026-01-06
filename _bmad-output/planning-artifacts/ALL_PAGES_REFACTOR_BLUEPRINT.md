# 📚 BATI - ALL PAGES REFACTOR BLUEPRINTS

**Date:** 2026-01-06  
**Analyst:** Mary (Business Analyst Agent)  
**Project:** Bati v3 - High-Tech RPG HUD Refactor  
**Scope:** All 22 pages (excluding Onboarding)

---

## 📑 Table of Contents

1. [HOME](#1-home) ✅ (See detailed blueprint)
2. [SESSION](#2-session) ✅ (See detailed blueprint)
3. [QUESTS Gallery](#3-quests-gallery)
4. [Quest Details](#4-quest-details)
5. [ADVENTURES Gallery](#5-adventures-gallery)
6. [Adventure Details](#6-adventure-details)
7. [VILLAGE](#7-village)
8. [JOURNAL](#8-journal)
9. [Journal Session Details](#9-journal-session-details)
10. [TREASURY](#10-treasury)
11. [GOALS](#11-goals)
12. [SCHEDULE](#12-schedule)
13. [SETTINGS](#13-settings)
14. [CREDITS](#14-credits)
15. [EXERCISES Details](#15-exercises-details)
16. [DEV Tools](#16-dev-tools)

---

## 🎨 Global Design System (Apply to ALL Pages)

### **Common Elements:**

```tsx
// Page Container Pattern
<YStack flex={1} bg="$bgDark" pt={insets.top} pb={insets.bottom}>
  <PageHeader title="..." onBack={...} />
  <ScrollView>
    {/* Page content in GlassCards */}
  </ScrollView>
</YStack>

// Card Pattern
<GlassCard>
  {/* Content */}
</GlassCard>

// Button Pattern
<HUDButton onPress={...}>
  {/* Action */}
</HUDButton>
```

### **Typography Scale:**
- **Hero Title:** SpaceGrotesk Bold, $8 (48px)
- **Page Title:** SpaceGrotesk Bold, $7 (32px)
- **Card Title:** SpaceGrotesk Bold, $5 (20px)
- **Body:** NotoSans Regular, $4 (18px)
- **Secondary:** NotoSans Regular, $3 (16px), `$textSecondary`

### **Spacing Scale:**
- **Page Padding:** px="$4" (16px)
- **Card Padding:** p="$5" (20px)
- **Gap Between Cards:** gap="$4" (16px)
- **Internal Card Gap:** gap="$3" (12px)

---

## 3. QUESTS GALLERY

### **Current:** `app/(tabs)/quests/index.tsx` (459 LOC)

### **Purpose:**
Browse all available quests (workouts), filter by focus/duration, select one to view details.

### **Layout Structure:**

```
┌─────────────────────────────────────────────┐
│  PageHeader: "Quests" + [Filter Icon]       │
└─────────────────────────────────────────────┘
        ↓
┌─────────────────────────────────────────────┐
│  Filter Bar (Glassmorphism)                 │
│  [💪 All] [Arms] [Legs] [Chest] [Cardio]    │
└─────────────────────────────────────────────┘
        ↓
┌─────────────────────────────────────────────┐
│  Quest Card (GlassCard)                     │
│  ┌─────────────────────────────────────┐   │
│  │ [Quest Image 200x120]               │   │
│  │                                     │   │
│  │ ⚔️ IRON ARMS CHALLENGE               │   │
│  │ "Build legendary arm strength"      │   │
│  │                                     │   │
│  │ 💪 Arms  •  ⏱️ 20 min  •  🔥 Normal  │   │
│  └─────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
        ↓ (Repeat for all quests)
```

### **Visual Specs:**

**Filter Bar:**
- Background: `$glassBg` with blur
- Border: 1px `$glassBorder`
- Border Radius: $full (pill)
- Height: 48px
- Chips: Active = `$primary` bg, Inactive = transparent

**Quest Cards:**
- Background: `$glassBg`
- Border: 1px `$glassBorder`
- Border Radius: $6 (24px)
- Padding: $4
- Press: scale(0.98), glow shadow pulse

**Quest Image:**
- Height: 120px
- Border Radius: $4
- Object fit: cover
- Overlay gradient: bottom fade to black

**Meta Info Row:**
- Icons: 20px via `useGameIcon`
- Text: $3 (16px) `$textSecondary`
- Separator: " • " between items

### **Refactor Tasks:**

1. Replace solid cards with `GlassCard`
2. Update filter chips to glassmorphism style
3. Add glow effect on active filter
4. Standardize quest card layout
5. Add entrance animations (stagger by 100ms)
6. Replace all direct icon imports with `useGameIcon`

### **Code Example:**

```tsx
// Filter Chip Component
function FilterChip({ label, active, onPress }) {
  return (
    <Pressable onPress={onPress}>
      <XStack
        bg={active ? "$primary" : "transparent"}
        borderWidth={1}
        borderColor={active ? "$primary" : "$glassBorder"}
        borderRadius="$full"
        px="$4"
        py="$2"
        shadowColor={active ? "$primaryGlow" : undefined}
        shadowRadius={active ? 12 : 0}
      >
        <Text 
          color={active ? "white" : "$textSecondary"}
          fontWeight={active ? "bold" : "normal"}
        >
          {label}
        </Text>
      </XStack>
    </Pressable>
  );
}

// Quest Card
function QuestCard({ quest }) {
  const { GameIcon } = useGameIcon();
  
  return (
    <GlassCard 
      pressStyle={{ scale: 0.98 }}
      onPress={() => router.push(`/quests/${quest.id}`)}
    >
      <Image source={quest.image} style={styles.questImage} />
      <YStack gap="$2" mt="$3">
        <Text fontFamily="$heading" fontSize="$5" color="$text">
          {quest.title}
        </Text>
        <Text fontSize="$3" color="$textSecondary" numberOfLines={2}>
          {quest.description}
        </Text>
        <XStack items="center" gap="$3" mt="$2">
          <XStack items="center" gap="$1">
            <GameIcon name="muscle" size={20} color="$primary" />
            <Text fontSize="$3" color="$textSecondary">Arms</Text>
          </XStack>
          <Text color="$textSecondary">•</Text>
          <XStack items="center" gap="$1">
            <GameIcon name="clock" size={20} color="$primary" />
            <Text fontSize="$3" color="$textSecondary">20 min</Text>
          </XStack>
        </XStack>
      </YStack>
    </GlassCard>
  );
}
```

---

## 4. QUEST DETAILS

### **Current:** `app/(tabs)/quests/[id].tsx` (499 LOC)

### **Purpose:**
Show full quest details, exercise list, difficulty selection, start button.

### **Layout Structure:**

```
┌─────────────────────────────────────────────┐
│  [← Back]                   [Share Icon]    │
└─────────────────────────────────────────────┘
        ↓
┌─────────────────────────────────────────────┐
│  Hero Image (300px height)                  │
│  Overlay gradient at bottom                 │
└─────────────────────────────────────────────┘
        ↓
┌─────────────────────────────────────────────┐
│  GlassCard: Quest Info                      │
│  ┌─────────────────────────────────────┐   │
│  │  ⚔️ IRON ARMS CHALLENGE               │   │
│  │  "Build legendary arm strength..."   │   │
│  │                                     │   │
│  │  📊 STATS                           │   │
│  │  Rounds: 3  Exercises: 5  ~20 min   │   │
│  └─────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
        ↓
┌─────────────────────────────────────────────┐
│  GlassCard: Difficulty                      │
│  ┌─────────────────────────────────────┐   │
│  │  😅 Easy  [○]                       │   │
│  │  😊 Normal [●] ← selected           │   │
│  │  😤 Hard  [○]                       │   │
│  └─────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
        ↓
┌─────────────────────────────────────────────┐
│  GlassCard: Exercises List                  │
│  ┌─────────────────────────────────────┐   │
│  │  1. Push-ups        12-15 reps      │   │
│  │  2. Diamond Pushups  8-10 reps      │   │
│  │  3. Tricep Dips     10-12 reps      │   │
│  │  ... (expandable)                   │   │
│  └─────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
        ↓
┌─────────────────────────────────────────────┐
│       [�� START QUEST] ← HUDButton          │
└─────────────────────────────────────────────┘
```

### **Visual Specs:**

**Hero Image:**
- Height: 300px
- Gradient overlay: `linear-gradient(to bottom, transparent 50%, $bgDark 100%)`
- Border radius bottom: $6

**Difficulty Selector:**
- Radio buttons styled as glass pills
- Active: `$primary` fill + glow
- Inactive: `$glassBg` + `$glassBorder`

**Exercise List:**
- Each row: XStack with number, name, target
- Dividers: 1px `$glassBorder`
- Expandable: "Show all" button if >5 exercises

**Start Button:**
- Fixed at bottom (safe area aware)
- Width: 90%
- Height: 64px
- Massive glow: 30px spread

### **Refactor Tasks:**

1. Wrap all sections in `GlassCard`
2. Update difficulty selector to glass pills
3. Replace "Start" button with `HUDButton`
4. Add parallax effect on hero image scroll
5. Add exercise count badge (glassmorphism)

---

## 5. ADVENTURES GALLERY

### **Current:** `app/(tabs)/adventures/index.tsx` (326 LOC)

### **Purpose:**
Browse available adventures (campaigns), see progress on active ones.

### **Layout:**

```
┌─────────────────────────────────────────────┐
│  PageHeader: "Adventures"                   │
└─────────────────────────────────────────────┘
        ↓
┌─────────────────────────────────────────────┐
│  Active Adventure Card (If any)             │
│  ┌─────────────────────────────────────┐   │
│  │  [Image] THE WARRIOR'S PATH         │   │
│  │  ████████░░░░ Step 4/6              │   │
│  │  [CONTINUE →]                       │   │
│  └─────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
        ↓
┌─────────────────────────────────────────────┐
│  Adventure Card                             │
│  ┌─────────────────────────────────────┐   │
│  │  [Cover Image]                      │   │
│  │  👹 THE IRON GOLEM                  │   │ ← Boss badge
│  │  "Defeat the iron golem..."         │   │
│  │  6 quests • Boss fight              │   │
│  └─────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

### **Visual Specs:**

**Boss Badge:**
- Position: absolute top-right
- Background: `$error` (red)
- Border: 2px white
- Icon: 👹 skull
- Size: 40x40px
- Glow: red shadow

**Progress Bar (Active):**
- Segmented by steps
- Fill: `$primary`
- Track: `$glassBg`

### **Refactor:**
- Replace cards with `GlassCard`
- Add boss badge component
- Enhance active card with extra glow

---

## 6. ADVENTURE DETAILS

### **Current:** `app/(tabs)/adventures/[id].tsx` (407 LOC)

### **Layout:**

```
┌─────────────────────────────────────────────┐
│  Hero Image + Title Overlay                 │
└─────────────────────────────────────────────┘
        ↓
┌─────────────────────────────────────────────┐
│  GlassCard: Adventure Info                  │
│  Description, total steps, estimated time   │
└─────────────────────────────────────────────┘
        ↓
┌─────────────────────────────────────────────┐
│  Steps List (Glassmorphism)                 │
│  ┌─────────────────────────────────────┐   │
│  │  ✅ Step 1: Warm-up (COMPLETED)     │   │
│  │  🔵 Step 2: Core Battle (ACTIVE)    │   │
│  │  🔒 Step 3: Boss Fight (LOCKED)     │   │
│  └─────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
        ↓
┌─────────────────────────────────────────────┐
│  [START STEP / CONTINUE] ← HUDButton        │
└─────────────────────────────────────────────┘
```

### **Refactor:**
- Glass cards for steps
- State colors: `$success` (done), `$primary` (active), `$glassBorder` (locked)
- Boss step has skull icon + red accent

---

## 7. VILLAGE

### **Current:** `app/(tabs)/village.tsx` (LOC unknown)

### **Purpose:**
Visual representation of training progress through village buildings.

### **CRITICAL:** This is the MOST VISUAL page - needs custom design!

### **Layout Option A: Isometric View (Ambitious)**

```
┌─────────────────────────────────────────────┐
│  PageHeader: "Village"  [Prestige: 1,234]   │
└─────────────────────────────────────────────┘
        ↓
┌─────────────────────────────────────────────┐
│                                             │
│    [Isometric Village Canvas]              │
│     - Buildings positioned in grid         │
│     - Tap building for detail modal        │
│     - Animated flame in center             │
│     - Fog of war for locked buildings      │
│                                             │
└─────────────────────────────────────────────┘
        ↓
┌─────────────────────────────────────────────┐
│  Buildings List (Fallback/Secondary)        │
│  Grouped by Tier                            │
└─────────────────────────────────────────────┘
```

### **Layout Option B: Card Grid (Realistic)**

```
┌─────────────────────────────────────────────┐
│  Stats Card (Glass)                         │
│  Prestige: 1,234  •  12/19 Buildings        │
└─────────────────────────────────────────────┘
        ↓
┌─────────────────────────────────────────────┐
│  Flame Card (Center, Animated)              │
│  🔥 Streak: 7 days • Inferno                │
└─────────────────────────────────────────────┘
        ↓
┌─────────────────────────────────────────────┐
│  TIER 1: FOUNDATIONS                        │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐   │
│  │ 🏕️ Camp  │ │ ⛺ Tent   │ │ 🎯 Dummy │   │
│  │ Level 3  │ │ Level 2  │ │ Level 1  │   │
│  │ ███░░    │ │ ██░░░    │ │ █░░░░    │   │
│  └──────────┘ └──────────┘ └──────────┘   │
└─────────────────────────────────────────────┘
        ↓
┌─────────────────────────────────────────────┐
│  TIER 2: ECONOMY                            │
│  (Similar grid of buildings)                │
└─────────────────────────────────────────────┘
```

### **Visual Specs:**

**Building Card:**
- Background: `$glassBg`
- Icon: 64x64px emoji or image
- Name: $4 bold
- Level: $3 `$textSecondary`
- Progress bar: XP to next level
- Lock overlay: blur + lock icon if locked

**Tap → Detail Modal:**
```
┌─────────────────────────────────────────────┐
│  [Close X]                                  │
│  🏰 ARCHERY RANGE                           │
│                                             │
│  Level 2 → Level 3                          │
│  Progress: ████████░░ 80%                   │
│                                             │
│  Unlocked by: 100 Wood earned               │
│  Next level: 200 Wood total                 │
│                                             │
│  "A place to train precision and focus."    │
└─────────────────────────────────────────────┘
```

### **Flame Animation:**
- Custom React Native Animated component
- Pulsing scale + opacity
- Color based on streak milestone
- Tap → Journal (streak details)

### **Refactor Tasks:**

1. **Option B (Realistic):** Implement card grid
2. Create `BuildingCard` component
3. Create `BuildingDetailModal` component
4. Implement `FlameFlicker` animation
5. Group buildings by tier
6. Add construction animation on unlock (already exists!)

**Option A (Ambitious):** Would require React Native Skia or custom canvas - save for Phase 5.

---

## 8. JOURNAL

### **Current:** `app/(tabs)/journal/index.tsx` (192 LOC)

### **Purpose:**
View training history, stats summary, personal records.

### **Layout:**

```
┌─────────────────────────────────────────────┐
│  PageHeader: "Journal"                      │
└─────────────────────────────────────────────┘
        ↓
┌─────────────────────────────────────────────┐
│  Stats Summary Card (Glass)                 │
│  ┌─────────────────────────────────────┐   │
│  │  Level 12 • Warrior                 │   │
│  │  ████████████░░░░ 75% to Level 13   │   │
│  │                                     │   │
│  │  🔥 7 days  ⚔️ 42 sessions  🏆 8,450 XP│  │
│  └─────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
        ↓
┌─────────────────────────────────────────────┐
│  Monthly Calendar Card (Glass)              │
│  ┌─────────────────────────────────────┐   │
│  │  January 2026    [< >]              │   │
│  │  M  T  W  T  F  S  S                │   │
│  │  1  2  3  4● 5● 6  7                │   │
│  │  (● = workout day, glowing)         │   │
│  └─────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
        ↓
┌─────────────────────────────────────────────┐
│  Recent Sessions List                       │
│  ┌─────────────────────────────────────┐   │
│  │  TODAY                              │   │
│  │  ┌───────────────────────────────┐  │   │
│  │  │ ⚔️ Iron Arms Challenge        │  │   │
│  │  │ 18:32 • 180 XP • Normal       │  │   │
│  │  └───────────────────────────────┘  │   │
│  │                                     │   │
│  │  YESTERDAY                          │   │
│  │  ┌───────────────────────────────┐  │   │
│  │  │ 🛡️ Defender's Trial            │  │   │
│  │  │ 22:15 • 220 XP • Hard         │  │   │
│  │  └───────────────────────────────┘  │   │
│  └─────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

### **Visual Specs:**

**Calendar:**
- Grid: 7 columns
- Day cell: 40x40px
- Workout day: `$primary` bg + glow
- Today: border `$primary`
- Empty day: `$glassBorder`

**Session Card:**
- Background: `$glassBg`
- Icon: Quest icon 48x48
- Title: $4 bold
- Meta: $3 `$textSecondary`
- Tap → Session details

### **Refactor:**
- Wrap all in `GlassCard`
- Update calendar to glassmorphism
- Session cards already decent, just update bg

---

## 9. JOURNAL SESSION DETAILS

### **Current:** `app/(tabs)/journal/[id].tsx` (356 LOC)

### **Purpose:**
Detailed view of a past workout session.

### **Layout:**

```
┌─────────────────────────────────────────────┐
│  [← Back]                                   │
└─────────────────────────────────────────────┘
        ↓
┌─────────────────────────────────────────────┐
│  Session Summary Card (Glass)               │
│  ⚔️ Iron Arms Challenge                     │
│  January 6, 2026 • 10:30 AM                 │
│                                             │
│  ⏱️ 18:32  •  ⭐ +180 XP  •  😊 Normal       │
└─────────────────────────────────────────────┘
        ↓
┌─────────────────────────────────────────────┐
│  Loot Earned Card (Glass)                   │
│  🪙 +50 Gold  🪵 +30 Wood                    │
└─────────────────────────────────────────────┘
        ↓
┌─────────────────────────────────────────────┐
│  Exercises Breakdown Card (Glass)           │
│  ┌─────────────────────────────────────┐   │
│  │  ROUND 1                            │   │
│  │  Push-ups: 15 reps ✅               │   │
│  │  Diamond: 10 reps ✅                │   │
│  │  ...                                │   │
│  │                                     │   │
│  │  ROUND 2                            │   │
│  │  Push-ups: 14 reps                  │   │
│  │  ...                                │   │
│  └─────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

### **Refactor:**
- All cards → `GlassCard`
- Exercise results with color coding (hit target = green, missed = orange)
- Add "Share" button (share workout summary)

---

## 10. TREASURY

### **Current:** `app/treasury.tsx` (126 LOC)

### **Purpose:**
View all collected resources (gold, materials).

### **Layout:**

```
┌─────────────────────────────────────────────┐
│  PageHeader: "Treasury"                     │
└─────────────────────────────────────────────┘
        ↓
┌─────────────────────────────────────────────┐
│  Total Wealth Card (Glass, Prominent)       │
│  ┌─────────────────────────────────────┐   │
│  │  💰 TOTAL WEALTH                    │   │
│  │  1,234 🪙 Gold                      │   │
│  └─────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
        ↓
┌─────────────────────────────────────────────┐
│  Resources Grid                             │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐   │
│  │ 🪵 Wood  │ │ 🪨 Stone │ │ 🔥 Fire  │   │
│  │   320    │ │   180    │ │   95     │   │
│  └──────────┘ └──────────┘ └──────────┘   │
│                                             │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐   │
│  │ 💧 Water │ │ 🌬️ Wind  │ │ 🌾 Grain │   │
│  │   210    │ │   150    │ │   275    │   │
│  └──────────┘ └──────────┘ └──────────┘   │
└─────────────────────────────────────────────┘
        ↓
┌─────────────────────────────────────────────┐
│  Recent Earnings (Optional)                 │
│  Last 5 workouts earned resources...        │
└─────────────────────────────────────────────┘
```

### **Visual Specs:**

**Resource Card:**
- Background: `$glassBg`
- Size: ~100x100px
- Icon: 48x48
- Amount: $6 bold, resource color
- Name: $3 `$textSecondary`

### **Refactor:**
- Make gold card larger + glowing
- Resource cards in 3-column grid
- Add subtle pulse animation on resource cards

---

## 11. GOALS

### **Current:** `app/goals.tsx` (493 LOC)

### **Purpose:**
Set training goals (focus, frequency, duration).

### **Layout:**

```
┌─────────────────────────────────────────────┐
│  PageHeader: "Goals"                        │
└─────────────────────────────────────────────┘
        ↓
┌─────────────────────────────────────────────┐
│  Current Goal Card (if set)                 │
│  ┌─────────────────────────────────────┐   │
│  │  🎯 STRENGTH FOCUS                  │   │
│  │  5 sessions/week • 30 min each      │   │
│  │  ████████░░ 4/5 this week           │   │
│  └─────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
        ↓
┌─────────────────────────────────────────────┐
│  Set New Goal Form (Glass Cards)            │
│  ┌─────────────────────────────────────┐   │
│  │  CHOOSE FOCUS                       │   │
│  │  [💪 Strength] [🏃 Endurance]       │   │
│  │  [🤸 Flexibility] [⚖️ Balanced]     │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │  SESSIONS PER WEEK                  │   │
│  │  [3] [4] [5] [6] [7]                │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │  SESSION DURATION                   │   │
│  │  [15 min] [30 min] [45 min] [60 min]│   │
│  └─────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
        ↓
┌─────────────────────────────────────────────┐
│  [SAVE GOAL] ← HUDButton                    │
└─────────────────────────────────────────────┘
```

### **Refactor:**
- All sections in `GlassCard`
- Selection chips: glassmorphism + glow when active
- Progress bar: segmented by days

---

## 12. SCHEDULE

### **Current:** `app/schedule.tsx` (LOC unknown)

### **Purpose:**
View weekly training schedule based on goal.

### **Layout:**

```
┌─────────────────────────────────────────────┐
│  PageHeader: "Schedule"                     │
└─────────────────────────────────────────────┘
        ↓
┌─────────────────────────────────────────────┐
│  Week Selector (Glass)                      │
│  [<]  Week of Jan 6-12, 2026  [>]           │
└─────────────────────────────────────────────┘
        ↓
┌─────────────────────────────────────────────┐
│  Day Cards                                  │
│  ┌─────────────────────────────────────┐   │
│  │  MONDAY ✅ (COMPLETED)               │   │
│  │  Iron Arms Challenge                │   │
│  │  Completed at 10:30 AM              │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │  TUESDAY 🔵 (TODAY)                  │   │
│  │  Suggested: Leg Power               │   │
│  │  [START WORKOUT]                    │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │  WEDNESDAY 🔒 (PLANNED)              │   │
│  │  Suggested: Core Crusher            │   │
│  └─────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

### **Refactor:**
- Day cards: `GlassCard`
- State colors: `$success` (done), `$primary` (today), `$glassBorder` (future)
- Week selector: glass pill with arrows

---

## 13. SETTINGS

### **Current:** `app/settings.tsx` (195 LOC)

### **Purpose:**
App preferences (language, difficulty, avatar, etc.).

### **Layout:**

```
┌─────────────────────────────────────────────┐
│  PageHeader: "Settings"                     │
└─────────────────────────────────────────────┘
        ↓
┌─────────────────────────────────────────────┐
│  Profile Card (Glass)                       │
│  ┌─────────────────────────────────────┐   │
│  │  [Avatar]  Guiforge                 │   │
│  │  Level 12 • Warrior                 │   │
│  │  [Edit Profile]                     │   │
│  └─────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
        ↓
┌─────────────────────────────────────────────┐
│  Settings List (Glass Cards)                │
│  ┌─────────────────────────────────────┐   │
│  │  🌐 Language          English [>]   │   │
│  └─────────────────────────────────────┘   │
│  ┌─────────────────────────────────────┐   │
│  │  ⚔️ Default Difficulty  Normal [>]  │   │
│  └─────────────────────────────────────┘   │
│  ┌─────────────────────────────────────┐   │
│  │  🔊 Sound Effects      [Toggle]     │   │
│  └─────────────────────────────────────┘   │
│  ┌─────────────────────────────────────┐   │
│  │  📳 Haptic Feedback    [Toggle]     │   │
│  └─────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
        ↓
┌─────────────────────────────────────────────┐
│  Danger Zone (Glass, red accent)            │
│  [Reset Progress] [Delete Account]          │
└─────────────────────────────────────────────┘
```

### **Refactor:**
- All cards: `GlassCard`
- Toggles: Custom glass toggle component
- Danger zone: Red border + red text

---

## 14. CREDITS

### **Current:** `app/credits.tsx` (142 LOC)

### **Purpose:**
Acknowledgements, licenses, version info.

### **Simple refactor:**
- Wrap in `GlassCard`
- Center text
- Add logo at top
- Version at bottom

---

## 15. EXERCISES DETAILS

### **Current:** `app/exercises/[id].tsx` (251 LOC)

### **Purpose:**
Show exercise details, instructions, animation.

### **Layout:**

```
┌─────────────────────────────────────────────┐
│  [← Back]                                   │
└─────────────────────────────────────────────┘
        ↓
┌─────────────────────────────────────────────┐
│  Exercise Animation (Looping)               │
│  300px height                               │
└─────────────────────────────────────────────┘
        ↓
┌─────────────────────────────────────────────┐
│  Info Card (Glass)                          │
│  PUSH-UPS                                   │
│  Targets: Arms, Chest                       │
│  Difficulty: ⚡️⚡️⚡️ (3/5)                   │
│  Equipment: None                            │
└─────────────────────────────────────────────┘
        ↓
┌─────────────────────────────────────────────┐
│  Instructions Card (Glass)                  │
│  HOW TO DO IT                               │
│  1. Start in plank position...              │
│  2. Lower your body...                      │
│  3. Push back up...                         │
└─────────────────────────────────────────────┘
```

### **Refactor:**
- Info + Instructions in `GlassCard`
- Difficulty as star rating (glassmorphism stars)

---

## 16. DEV TOOLS

### **Current:** `app/dev.tsx` (278 LOC)

### **Purpose:**
Developer utilities (reset DB, view data, etc.).

### **Keep simple:**
- Wrap in `GlassCard`
- Red buttons for destructive actions
- Only visible in DEV mode

---

## 📊 MASTER REFACTOR PRIORITY

### **Tier 1 (CRITICAL - Do First):**
1. ✅ HOME (Done - see detailed blueprint)
2. ✅ SESSION (Done - see detailed blueprint)
3. QUESTS Gallery (high traffic)
4. Quest Details (conversion point)
5. VILLAGE (most visual, signature feature)

### **Tier 2 (IMPORTANT - Do Second):**
6. ADVENTURES Gallery
7. Adventure Details
8. JOURNAL
9. TREASURY
10. GOALS

### **Tier 3 (NICE TO HAVE - Do Third):**
11. Schedule
12. Journal Session Details
13. Settings
14. Exercises Details

### **Tier 4 (LOW PRIORITY - Do Last):**
15. Credits
16. DEV Tools

---

## 🚀 Implementation Strategy

### **Sprint 1 (Weeks 1-2): Core Components + HOME + SESSION**
- Create all core components (GlassCard, HUDButton, etc.)
- Refactor HOME page completely
- Refactor SESSION page completely
- **Deliverable:** Users can navigate home and complete workouts with new UI

### **Sprint 2 (Weeks 3-4): Quest Flow**
- Refactor QUESTS Gallery
- Refactor Quest Details
- Refactor ADVENTURES Gallery
- Refactor Adventure Details
- **Deliverable:** Users can browse and start quests/adventures

### **Sprint 3 (Weeks 5-6): Rewards & Progress**
- Refactor VILLAGE (big effort!)
- Refactor TREASURY
- Refactor JOURNAL
- **Deliverable:** Users can see all progress/rewards

### **Sprint 4 (Week 7): Planning & Settings**
- Refactor GOALS
- Refactor SCHEDULE
- Refactor SETTINGS
- **Deliverable:** Users can plan workouts and configure app

### **Sprint 5 (Week 8): Polish & Secondary**
- Refactor Journal Details
- Refactor Exercise Details
- Refactor Credits
- Final polish, bug fixes, performance
- **Deliverable:** COMPLETE REFACTOR DONE

---

## ✅ Universal Acceptance Criteria (All Pages)

### **Visual:**
- [ ] Background is `$bgDark` (The Void)
- [ ] All cards use `$glassBg` with blur effect
- [ ] All borders use `$glassBorder` (1px)
- [ ] All icons via `useGameIcon()` hook
- [ ] Typography: SpaceGrotesk (titles), NotoSans (body)
- [ ] All colors from Tamagui tokens (no hardcoded hex)

### **Functional:**
- [ ] All text uses i18n (t() function)
- [ ] Safe area insets respected
- [ ] Loading states visible
- [ ] Error states handled gracefully
- [ ] Navigation works correctly

### **Interaction:**
- [ ] Buttons scale on press (0.95-0.98)
- [ ] Haptic feedback on important actions
- [ ] Animations run at 60fps
- [ ] No layout shift on data load

### **Code Quality:**
- [ ] TypeScript strict mode passes
- [ ] No console warnings
- [ ] Components are reusable
- [ ] No duplicate code

---

## 📝 Final Notes

**Total Pages:** 16 (excluding Onboarding)  
**Estimated Effort:** 8 weeks (1 developer, full-time)  
**Quick Wins:** HOME + SESSION (2 weeks) = 80% of user-facing impact

**Next Steps:**
1. Review this blueprint with team
2. Create tasks in project management tool
3. Start with Sprint 1 (Core Components + HOME + SESSION)
4. Iterate based on feedback

---

**Ready to build the most epic fitness RPG HUD ever?** 🎮⚔️🔥

