# 🏰 VILLAGE PAGE - REFACTOR BLUEPRINT (High-Tech RPG HUD)

**Date:** 2026-01-06  
**Page:** `app/(tabs)/village.tsx`  
**Style:** High-Tech RPG HUD (Dark Fantasy Construction)  
**Reference:** `docs/VILLAGE.md` + `docs/REWARDS.md`  
**Created by:** Sally (UX Designer Agent)

---

## 🎯 Vision Statement

> "Your village is your fitness fingerprint—a living, breathing monument to every workout you've ever done. Buildings appear automatically, level up with your training, and tell the story of YOUR hero's journey."

**Design Pillars:**
1. **Zero Management** - No build queues, no choices, pure reward
2. **Training Fingerprint** - Village shape reflects YOUR training style
3. **Visual Pride** - Every session = visible village growth
4. **Immediate Feedback** - New building unlocks = epic moment

---

## 🧩 Current Implementation Analysis

### **Existing Components:**
```
components/village/
├── VillageScreen.tsx (20,718 LOC) ← MAIN VIEW
├── VillageAnimations.tsx (4,511 LOC) ← ANIMATIONS
└── ConstructionAnimation.tsx (2,493 LOC) ← BUILD EFFECTS
```

### **Database:**
```typescript
// 8 Muscle Buildings (Tier 2)
archery_range (Arms/Wood), quarry (Back/Stone), forge (Chest/Fire)
well (Abs/Water), windmill (Shoulders/Wind), farm (Legs/Grain)

// 2 Style Buildings (Tier 2)
wizard_tower (Calisthenics/Mana), druid_grove (Yoga/Leaf)

// 6 Advanced Buildings (Tier 3)
watchtower, castle_wall, armory, fountain, observatory, barn

// 3 Legendary Buildings (Tier 4)
dragon_lair, heroes_hall, champion_arena

// 3 Starter Buildings (Tier 1)
campfire, tent, training_dummy
```

**Total:** 22 buildings

### **Progression System:**
- **Tier 1:** Unlocked by default (3 starter buildings)
- **Tier 2:** Auto-unlock on first resource gain OR 50+ reps in muscle
- **Tier 3:** Unlock when Tier 2 prerequisite reaches Level 3
- **Tier 4:** Legendary (boss tokens, special conditions)

### **XP System:**
- 1 Resource = 1 Building XP
- 1 Rep = 1 Building XP (muscle exercises)
- Level thresholds: `[0, 50, 150, 400, 1000]` (5 levels max)

---

## 🚨 Current UX Issues Identified

### **1. Information Overload**
Current implementation shows **ALL 22 buildings in a flat list** (VillageScreen.tsx line ~200).

**Problem:**
- New users see 19 locked buildings = overwhelming
- No clear hierarchy (starter vs advanced)
- Scrolling fatigue

**Recommendation:** Tier-based tabs + progressive disclosure

---

### **2. Building Placement: No User Agency**
Current: Buildings appear in database, shown in list (no map/grid).

**User Story Gap:**
> *"I want to see my village as an actual VILLAGE, not a spreadsheet."*

Current implementation = **List View** (cards)  
Vision = **Isometric Village View** (like Clash of Clans)

**Decision Needed:**
- **Option A:** Keep list (simple, already works)
- **Option B:** Add isometric village map (epic, complex)
- **Option C:** Hybrid: List by default, "View Village Map" button

**Recommendation:** Go with **Option C** for Phase 5.1, then add isometric map in Phase 5.2

---

### **3. Village Stats: Hidden Value**
Database has `villageStats` table:
- `prestigeScore` (calculated but not displayed prominently)
- `totalBuildingsUnlocked` (shown as count)
- `highestBuildingLevel` (not shown)

**Problem:** No emotional payoff for these stats.

**Recommendation:** Add "Village Overview" card at top showing prestige as a score.

---

### **4. Building Details Modal: Incomplete Storytelling**
Current modal shows:
- Level + XP progress
- Unlock condition
- Related muscle/resource

**Missing:**
- ❌ Building lore/flavor text
- ❌ What this building "does" (thematic benefit)
- ❌ Next upgrade preview
- ❌ Historical XP gained per session (chart)

**Recommendation:** Enrich modal with storytelling elements.

---

## 📐 Refactored Layout Structure

### **TIER-BASED NAVIGATION:**

```
┌─────────────────────────────────────────────┐
│  PageHeader: "Village" + [Treasury Icon]    │
└─────────────────────────────────────────────┘
        ↓
┌─────────────────────────────────────────────┐
│  Village Overview Card (Glass)              │
│  ┌─────────────────────────────────────┐   │
│  │  🏰 GLORIOUS KINGDOM                │   │
│  │  Prestige: 1,250 ⭐                 │   │
│  │  Buildings: 12/22                   │   │
│  │  Highest Level: 5                   │   │
│  │  [View on Map]                      │   │
│  └─────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
        ↓ Gap $3
┌─────────────────────────────────────────────┐
│  Tab Selector (Glassmorphism Pills)         │
│  [🏕️ Starter] [💪 Core] [✨ Advanced] [🐉 Legendary]
│       ↑ active                              │
└─────────────────────────────────────────────┘
        ↓ Gap $4
┌─────────────────────────────────────────────┐
│  Building Grid (Filtered by Tab)            │
│                                             │
│  ┌───────────┐  ┌───────────┐              │
│  │ 🏹 LV.3   │  │ ⛏️ LV.2    │              │
│  │ Archery   │  │ Quarry    │              │
│  │ ████░ 80% │  │ ██░░░ 40% │              │
│  └───────────┘  └───────────┘              │
│                                             │
│  ┌───────────┐  ┌───────────┐              │
│  │ 🔒 LOCKED │  │ 🔒 LOCKED │              │
│  │ Forge     │  │ Well      │              │
│  │ Train     │  │ Train abs │              │
│  │ chest     │  └───────────┘              │
│  └───────────┘                              │
└─────────────────────────────────────────────┘
```

---

## 🎨 Component Specifications

### **1. VillageOverviewCard** (NEW)

**Purpose:** Hero moment—show village at a glance with pride stats.

**Visual Specs:**
- Background: `$glassBg` with blur
- Border: 1px `$glassBorder`
- Border Radius: `$6` (24px)
- Padding: `$5` (20px)
- Shadow: `$primaryGlow` (subtle)

**Content:**
```tsx
<GlassCard>
  <YStack gap="$3">
    {/* Village Name */}
    <XStack items="center" justify="space-between">
      <Text 
        fontFamily="$heading" 
        fontSize="$7" 
        color="$text"
      >
        🏰 {villageName || "Your Kingdom"}
      </Text>
      <Pressable onPress={navigateToTreasury}>
        <GameIcon name="coins" size={24} color="$primary" />
      </Pressable>
    </XStack>

    {/* Stats Grid */}
    <XStack gap="$4" justify="space-between">
      <YStack flex={1} items="center" gap="$1">
        <Text fontSize="$8" fontWeight="bold" color="$primary">
          {prestigeScore}
        </Text>
        <Text fontSize="$2" color="$textSecondary">
          {t("village.prestige")}
        </Text>
      </YStack>

      <YStack flex={1} items="center" gap="$1">
        <Text fontSize="$8" fontWeight="bold" color="$text">
          {unlockedCount}/{totalBuildings}
        </Text>
        <Text fontSize="$2" color="$textSecondary">
          {t("village.buildings")}
        </Text>
      </YStack>

      <YStack flex={1} items="center" gap="$1">
        <Text fontSize="$8" fontWeight="bold" color="$text">
          {highestLevel}
        </Text>
        <Text fontSize="$2" color="$textSecondary">
          {t("village.max_level")}
        </Text>
      </YStack>
    </XStack>

    {/* View Map CTA (Phase 5.2) */}
    <HUDButton 
      size="small" 
      variant="secondary"
      onPress={openVillageMap}
      disabled={!mapFeatureEnabled}
    >
      <GameIcon name="map" size={20} />
      <Text>{t("village.view_map")}</Text>
    </HUDButton>
  </YStack>
</GlassCard>
```

**Interaction:**
- Prestige number: Animates when it increases (CountUp effect)
- Treasury icon: Navigates to Treasury modal
- View Map button: Opens isometric village view (Phase 5.2)

---

### **2. TierTabSelector** (NEW)

**Purpose:** Progressive disclosure—show only relevant buildings for current stage.

**Visual Specs:**
- Background: `$glassBg`
- Border Radius: `$full` (pill)
- Active tab: `$primary` background + glow
- Inactive tab: transparent
- Height: 48px

**Tabs:**
```typescript
type VillageTier = "starter" | "core" | "advanced" | "legendary";

const tabs: { id: VillageTier; label: string; icon: string; tier: number }[] = [
  { id: "starter", label: "Starter", icon: "🏕️", tier: 1 },
  { id: "core", label: "Core", icon: "💪", tier: 2 },
  { id: "advanced", label: "Advanced", icon: "✨", tier: 3 },
  { id: "legendary", label: "Legendary", icon: "🐉", tier: 4 },
];
```

**Code Example:**
```tsx
<XStack 
  bg="$glassBg" 
  borderRadius="$full" 
  p="$2" 
  gap="$2"
  borderWidth={1}
  borderColor="$glassBorder"
>
  {tabs.map(tab => (
    <Pressable 
      key={tab.id}
      onPress={() => setActiveTier(tab.id)}
    >
      <XStack
        bg={activeTier === tab.id ? "$primary" : "transparent"}
        borderRadius="$full"
        px="$4"
        py="$2"
        items="center"
        gap="$2"
        shadowColor={activeTier === tab.id ? "$primaryGlow" : undefined}
        shadowRadius={activeTier === tab.id ? 12 : 0}
      >
        <Text fontSize={18}>{tab.icon}</Text>
        <Text 
          color={activeTier === tab.id ? "white" : "$textSecondary"}
          fontWeight={activeTier === tab.id ? "bold" : "normal"}
        >
          {t(`village.tier_${tab.id}`)}
        </Text>
      </XStack>
    </Pressable>
  ))}
</XStack>
```

**Behavior:**
- Default tab: `core` (most relevant for active users)
- Badge on tabs: Show count of unlocked buildings in tier
- Haptic feedback on tab switch

---

### **3. BuildingGridCard** (REFACTORED)

**Current:** Flat list, full-width cards  
**Refactored:** 2-column grid, compact cards

**Visual Specs:**
- Grid: 2 columns, gap `$3`
- Card: `$glassBg`, `$4` border radius
- Card size: Square aspect ratio (or 1.2:1)
- Locked state: 40% opacity, lock icon overlay
- **Image per level:** Building image evolves as level increases

**States:**

#### **A. Unlocked Building Card (with Image Evolution)**
```
┌──────────────────────┐
│   [Building Image]   │  ← Level-specific image (120x120px)
│   Level 3/5          │  ← Level badge overlay
│                      │
│   Archery Range      │  ← Name ($4 size)
│                      │
│   ████████░░ 80%     │  ← XP Progress bar
│   250 / 400 XP       │  ← Numbers ($2 size)
└──────────────────────┘
```

**Image Evolution System:**
Each building has **5 images** (one per level):
- `archery_range_lv1.png` - Basic wooden structure
- `archery_range_lv2.png` - Reinforced with stone
- `archery_range_lv3.png` - Enhanced with banners
- `archery_range_lv4.png` - Advanced with towers
- `archery_range_lv5.png` - Legendary with glow effects

#### **B. Locked Building Card**
```
┌──────────────────────┐
│   🔒 (40% opacity)   │  ← Lock icon
│                      │
│   Forge              │  ← Name (grayed)
│   🔒 Locked          │
│                      │
│   Train chest        │  ← Unlock hint
│   50 reps            │
└──────────────────────┘
```

**Code Example:**
```tsx
<Pressable onPress={() => openBuildingDetails(building)}>
  <GlassCard 
    width="48%" 
    aspectRatio={1.2}
    opacity={building.isUnlocked ? 1 : 0.4}
    pressStyle={{ scale: 0.98 }}
  >
    <YStack flex={1} justify="space-between" p="$3">
      {/* Building Image (Level-specific) */}
      <YStack items="center" mt="$2" position="relative">
        {building.isUnlocked ? (
          <>
            <Image
              source={getBuildingImage(building.buildingType, building.level)}
              style={{ width: 120, height: 120 }}
              contentFit="contain"
            />
            {/* Level Badge Overlay */}
            <YStack
              position="absolute"
              top={4}
              right={4}
              bg="$glassBg"
              borderWidth={1}
              borderColor="$primary"
              borderRadius="$full"
              px="$2"
              py="$1"
            >
              <Text fontSize={10} fontWeight="bold" color="$primary">
                Lv.{building.level}
              </Text>
            </YStack>
          </>
        ) : (
          <YStack
            width={120}
            height={120}
            items="center"
            justify="center"
            bg="$bgDark"
            borderRadius="$4"
            borderWidth={2}
            borderColor="$glassBorder"
            borderStyle="dashed"
          >
            <GameIcon name="lock" size={48} color="$textSecondary" />
          </YStack>
        )}
      </YStack>

      {/* Building Info */}
      <YStack gap="$2">
        <Text 
          fontFamily="$heading" 
          fontSize="$4" 
          color="$text"
          textAlign="center"
        >
          {building.name}
        </Text>

        {building.isUnlocked ? (
          <>
            {/* Level Badge */}
            <XStack justify="center" gap="$1">
              <GameIcon name="star" size={16} color="$primary" />
              <Text fontSize="$3" color="$primary" fontWeight="bold">
                Lv. {building.level}
              </Text>
            </XStack>

            {/* XP Progress */}
            <YStack gap="$1">
              <Progress 
                size="$1" 
                value={xpProgress} 
                bg="$bgDark"
              >
                <Progress.Indicator bg="$primary" />
              </Progress>
              <Text 
                fontSize="$2" 
                color="$textSecondary"
                textAlign="center"
              >
                {building.xp} / {nextThreshold} XP
              </Text>
            </YStack>
          </>
        ) : (
          <>
            {/* Locked Badge */}
            <XStack justify="center" gap="$1">
              <GameIcon name="lock" size={14} color="$textSecondary" />
              <Text fontSize="$2" color="$textSecondary">
                {t("village.locked")}
              </Text>
            </XStack>

            {/* Unlock Hint */}
            <Text 
              fontSize="$2" 
              color="$textSecondary"
              textAlign="center"
            >
              {building.unlockCondition}
            </Text>
          </>
        )}
      </YStack>
    </YStack>
  </GlassCard>
</Pressable>
```

---

### **4. BuildingDetailsModal** (ENHANCED)

**Current:** Basic info (level, XP, unlock condition)  
**Enhanced:** Rich storytelling + progression preview

**Layout:**
```
┌─────────────────────────────────────────────┐
│  [X]                                        │  ← Close button
│                                             │
│        🏹 (emoji 80px)                      │  ← Large emoji
│                                             │
│        ARCHERY RANGE                        │  ← Name ($7)
│        Level 3 • Arms Building              │  ← Subtitle
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │  PROGRESS                           │   │
│  │  ████████████░░░░ 60%               │   │  ← XP bar
│  │  250 / 400 XP to Level 4            │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │  📖 LORE                            │   │
│  │  "Where heroes hone their aim,      │   │  ← Flavor text
│  │   every arrow a testament to        │   │
│  │   your dedication."                 │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │  🎁 LEVEL BONUSES                   │   │
│  │  Level 1: +5% Arms XP               │   │
│  │  Level 2: +10% Arms XP              │   │
│  │  Level 3: +15% Arms XP ✅ (current) │   │
│  │  Level 4: +20% Arms XP 🔒 (next)    │   │
│  │  Level 5: +25% Arms XP 🔒           │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │  📊 STATISTICS                      │   │
│  │  Total XP Earned: 1,250             │   │
│  │  Unlocked: 12 days ago              │   │
│  │  Last Upgraded: 3 days ago          │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  [Close]                                    │
└─────────────────────────────────────────────┘
```

**Key Additions:**

#### **A. Building Lore** (NEW)
Each building gets flavor text:
```typescript
const buildingLore: Record<BuildingCode, { en: string; fr: string }> = {
  archery_range: {
    en: "Where heroes hone their aim, every arrow a testament to your dedication.",
    fr: "Là où les héros affinent leur visée, chaque flèche témoigne de votre dévouement."
  },
  forge: {
    en: "The heart of your kingdom, where iron will meets molten determination.",
    fr: "Le cœur de votre royaume, où la volonté de fer rencontre la détermination ardente."
  },
  // ... etc
};
```

#### **B. Level Bonuses Display** (NEW)
Show what each level unlocks (thematic, not mechanical):
```typescript
const buildingLevelBonuses: Record<number, string> = {
  1: "+5% {resource} production",
  2: "+10% {resource} production",
  3: "+15% {resource} production",
  4: "+20% {resource} production + Prestige Boost",
  5: "+25% {resource} production + Legendary Status",
};
```

*Note:* These are **thematic bonuses**, not actual game mechanics (unless you want to add them later).

#### **C. Building Statistics** (NEW)
Track:
- Total XP earned all-time
- Unlock date
- Last upgrade date
- Times visited (future: engagement metric)

**Code Example:**
```tsx
<Modal visible={isOpen} animationType="slide">
  <YStack flex={1} bg="$bgDark" pt={insets.top} pb={insets.bottom}>
    {/* Close Button */}
    <XStack justify="flex-end" px="$4" py="$2">
      <Pressable onPress={onClose}>
        <GameIcon name="x" size={24} color="$text" />
      </Pressable>
    </XStack>

    <ScrollView>
      <YStack gap="$4" px="$4" pb="$6">
        {/* Building Icon */}
        <YStack items="center" gap="$3">
          <Text fontSize={80}>{building.emoji}</Text>
          <YStack items="center" gap="$1">
            <Text 
              fontFamily="$heading" 
              fontSize="$7" 
              color="$text"
            >
              {building.name}
            </Text>
            <Text fontSize="$3" color="$textSecondary">
              {t("village.level")} {building.level} • {building.category}
            </Text>
          </YStack>
        </YStack>

        {/* Progress Card */}
        <GlassCard>
          <YStack gap="$3">
            <Text fontFamily="$heading" fontSize="$5" color="$text">
              📊 {t("village.progress")}
            </Text>
            <Progress value={xpProgress} size="$2" bg="$bgDark">
              <Progress.Indicator bg="$primary" />
            </Progress>
            <Text fontSize="$3" color="$textSecondary">
              {building.xp} / {nextThreshold} XP {t("village.to_level")} {building.level + 1}
            </Text>
          </YStack>
        </GlassCard>

        {/* Lore Card */}
        <GlassCard>
          <YStack gap="$2">
            <Text fontFamily="$heading" fontSize="$5" color="$text">
              📖 {t("village.lore")}
            </Text>
            <Text fontSize="$3" color="$textSecondary" lineHeight="$5">
              {buildingLore[building.buildingType][language]}
            </Text>
          </YStack>
        </GlassCard>

        {/* Level Bonuses Card */}
        <GlassCard>
          <YStack gap="$3">
            <Text fontFamily="$heading" fontSize="$5" color="$text">
              🎁 {t("village.bonuses")}
            </Text>
            {[1, 2, 3, 4, 5].map(level => (
              <XStack 
                key={level}
                items="center" 
                gap="$2"
                opacity={level > building.level ? 0.5 : 1}
              >
                <Text fontSize="$3" color="$text" width={60}>
                  {t("village.level")} {level}:
                </Text>
                <Text 
                  flex={1} 
                  fontSize="$3" 
                  color={level === building.level ? "$primary" : "$textSecondary"}
                >
                  {buildingLevelBonuses[level]}
                </Text>
                {level === building.level && (
                  <Text fontSize={16}>✅</Text>
                )}
                {level > building.level && (
                  <GameIcon name="lock" size={16} color="$textSecondary" />
                )}
              </XStack>
            ))}
          </YStack>
        </GlassCard>

        {/* Statistics Card */}
        <GlassCard>
          <YStack gap="$2">
            <Text fontFamily="$heading" fontSize="$5" color="$text">
              📊 {t("village.statistics")}
            </Text>
            <StatRow 
              label={t("village.total_xp_earned")} 
              value={building.xp.toString()} 
            />
            <StatRow 
              label={t("village.unlocked")} 
              value={formatRelativeDate(building.unlockedAt)} 
            />
            {building.lastUpgradedAt && (
              <StatRow 
                label={t("village.last_upgraded")} 
                value={formatRelativeDate(building.lastUpgradedAt)} 
              />
            )}
          </YStack>
        </GlassCard>

        {/* Close Button */}
        <HUDButton onPress={onClose}>
          {t("common.close")}
        </HUDButton>
      </YStack>
    </ScrollView>
  </YStack>
</Modal>
```

---

## 🎬 Animations & Feedback

### **1. Building Unlock Animation**

**Trigger:** When Tier 2/3 building unlocks (in VictoryView)

**Sequence:**
```
1. [0.0s] Building card materializes (opacity 0 → 1, scale 0.8 → 1)
2. [0.3s] Confetti burst from card center
3. [0.5s] Glow pulse (2x) on card
4. [1.0s] Toast notification: "🏰 Forge Unlocked!"
5. [1.5s] Haptic celebration pattern
```

**Implementation:**
```tsx
// In VictoryView.tsx, after showing XP/Loot
{buildingUnlocks.map((unlock, index) => (
  <Animated.View
    key={unlock.buildingType}
    entering={FadeIn.delay(index * 500).springify()}
  >
    <GlassCard 
      shadowColor="$primaryGlow"
      shadowRadius={20}
    >
      <YStack items="center" gap="$3" p="$4">
        <Text fontSize={64}>{unlock.emoji}</Text>
        <Text fontFamily="$heading" fontSize="$6" color="$primary">
          {t("village.building_unlocked")}
        </Text>
        <Text fontSize="$4" color="$text">
          {unlock.name}
        </Text>
      </YStack>
    </GlassCard>
  </Animated.View>
))}
```

---

### **2. Building Level Up Animation**

**Trigger:** When building levels up (in VictoryView)

**Sequence:**
```
1. [0.0s] Star burst from building emoji
2. [0.2s] "LEVEL UP!" text appears above building
3. [0.5s] Building emoji scales up briefly (1.0 → 1.3 → 1.0)
4. [0.8s] New level badge pulses
5. [1.0s] Haptic success feedback
```

**Visual:**
```
     ✨ LEVEL UP! ✨
         ↓
       🏹 (scale pulse)
         ↓
    ⭐ LEVEL 4 ⭐
```

---

### **3. Village Prestige Score Animation**

**Trigger:** When prestige score increases (after session)

**Effect:** CountUp animation + glow pulse

```tsx
<CountUp
  from={oldPrestige}
  to={newPrestige}
  duration={1500}
  easing="easeOutExpo"
>
  {(value) => (
    <Text 
      fontSize="$8" 
      fontWeight="bold" 
      color="$primary"
      shadowColor="$primaryGlow"
      shadowRadius={12}
    >
      {Math.round(value)}
    </Text>
  )}
</CountUp>
```

---

## 🧭 Navigation Flows

### **1. From HOME → Village**

**Entry Point:** Bottom tab bar OR Village stats card on home

**User Story:**
> *"After a workout, I want to see my village grow."*

**Flow:**
```
HOME (Victory shown) 
  → Tap "View Village" 
  → VILLAGE page (animates in)
  → Newly unlocked/upgraded buildings pulse
  → User scrolls to see progress
  → Tap building → Details modal
  → Close modal → Back to village or home
```

---

### **2. From VICTORY → Village**

**Entry Point:** "Continue to Village" button in VictoryView

**Flow:**
```
VICTORY screen
  → Shows building unlocks/level ups
  → Tap "Continue to Village"
  → Navigate to Village tab
  → Auto-scroll to newly upgraded building
  → Building pulses briefly to draw attention
```

**Code:**
```tsx
// In VictoryView.tsx
<HUDButton onPress={() => {
  router.push("/(tabs)/village");
  // Pass building ID to auto-scroll
  setTimeout(() => {
    villageRef.current?.scrollToBuildingId(newBuildingId);
  }, 500);
}}>
  {t("victory.continue_to_village")}
</HUDButton>
```

---

### **3. From VILLAGE → Treasury**

**Entry Point:** Treasury icon (top right of VillageOverviewCard)

**User Story:**
> *"I want to see all my resources in one place."*

**Flow:**
```
VILLAGE page
  → Tap Treasury icon (💰)
  → Open Treasury modal (slide up)
  → Shows all resources (gold, wood, stone, etc.)
  → "Earned This Week" chart
  → Close → Back to village
```

---

## 📊 Empty States & Edge Cases

### **1. New User (0 Sessions)**

**State:**
- Only 3 starter buildings (campfire, tent, dummy)
- All Tier 2+ locked
- Prestige: 0

**Message:**
```
┌─────────────────────────────────────────────┐
│  🏕️ YOUR JOURNEY BEGINS                     │
│                                             │
│  Complete your first quest to start         │
│  building your legendary village!           │
│                                             │
│  [Start First Quest]                        │
└─────────────────────────────────────────────┘
```

---

### **2. Intermediate User (5-20 Sessions)**

**State:**
- 3-8 buildings unlocked (mostly Tier 2)
- Some buildings at Level 2-3
- Prestige: 200-800

**UI Focus:**
- Highlight next unlock conditions
- Show "You're close!" hints for near-unlocked buildings
- Encourage balanced training

**Hint Example:**
```
"💡 Train chest 15 more times to unlock the FORGE!"
```

---

### **3. Advanced User (50+ Sessions)**

**State:**
- 12+ buildings unlocked (some Tier 3)
- Multiple Level 4-5 buildings
- Prestige: 2000+

**UI Focus:**
- Show legendary building teasers (Tier 4)
- Prestige leaderboard (future: compare with friends)
- "Master Builder" achievement badges

---

### **4. Balanced Trainer**

**State:**
- All 6 muscle buildings unlocked
- Similar levels across all buildings (2-3)

**Special Message:**
```
"⚖️ BALANCED WARRIOR

Your village reflects perfect symmetry—
a true mark of a well-rounded hero!"
```

---

### **5. Specialist Trainer**

**State:**
- 1-2 buildings at Level 5
- Other buildings at Level 1-2

**Special Message:**
```
"⚡ SPECIALIST

Your Archery Range is LEGENDARY!
But your kingdom could benefit from
diversifying your training..."
```

---

## 🎯 User Stories Validation

### **Core User Stories:**

1. ✅ **"I want to see my village at a glance"**
   - VillageOverviewCard shows key stats

2. ✅ **"I want to know what each building does"**
   - BuildingDetailsModal with lore + bonuses

3. ✅ **"I want to feel proud of my progress"**
   - Prestige score + "Master Builder" title

4. ✅ **"I want to know how to unlock new buildings"**
   - Unlock conditions shown on locked buildings

5. ✅ **"I want to celebrate building upgrades"**
   - Level up animations + confetti

6. ⚠️ **"I want to see my village as an actual village"** (Partial)
   - Phase 5.1: List view ✅
   - Phase 5.2: Isometric map 🚧 (planned)

7. ✅ **"I want to know what comes next"**
   - Next level preview in details modal

8. ✅ **"I want buildings to reflect MY training style"**
   - Muscle-specific buildings + style buildings (wizard, druid)

---

## 🚀 Implementation Plan

### **Phase 5.1: Enhanced List View** (Weeks 1-2)

**Tasks:**
1. Create `VillageOverviewCard` component
2. Create `TierTabSelector` component
3. Refactor `BuildingCard` to grid layout (2-column)
4. Enhance `BuildingDetailsModal` with lore + bonuses + stats
5. Add building unlock/level up animations to VictoryView
6. Add auto-scroll to newly upgraded buildings
7. Add empty states for new users
8. Add special messages for balanced/specialist trainers

**Deliverable:** Polished village experience with rich storytelling

---

### **Phase 5.2: Isometric Village Map** (Weeks 3-4)

**Tasks:**
1. Design isometric building sprites (or use emoji + 3D CSS transforms)
2. Create `VillageMapView` component
3. Implement building placement grid (7x7 or auto-layout)
4. Add pan/zoom gestures
5. Animate building construction (brick-by-brick effect)
6. Add "View as List" toggle
7. Save user's preferred view (map vs list)

**Deliverable:** Epic visual village that users want to screenshot

---

### **Phase 5.3: Polish & Special Features** (Week 5)

**Tasks:**
1. Add prestige leaderboard (compare with friends)
2. Add "Village History" timeline (unlock milestones)
3. Add building visit tracking (engagement metric)
4. Add seasonal themes (e.g., snow in winter)
5. Add village naming/customization
6. Add "Village Tour" tutorial for new users

**Deliverable:** Village becomes a destination, not just a checklist

---

## ✅ Acceptance Criteria

### **Visual:**
- [ ] All cards use `$glassBg` with blur
- [ ] Tier tabs use glassmorphism + glow on active
- [ ] Building cards use 2-column grid
- [ ] Locked buildings have 40% opacity + lock icon
- [ ] Building details modal has rich lore + bonuses
- [ ] Prestige score animates (CountUp effect)
- [ ] Building unlock/level up has confetti + haptics

### **Functional:**
- [ ] Village overview shows prestige, building count, highest level
- [ ] Tier tabs filter buildings correctly
- [ ] Tapping building opens details modal
- [ ] Details modal shows lore, bonuses, stats
- [ ] Treasury icon navigates to treasury
- [ ] "View Map" button is visible (even if disabled for Phase 5.1)
- [ ] Auto-scroll to newly upgraded building works

### **Content:**
- [ ] All 22 buildings have lore text (EN + FR)
- [ ] All buildings have unlock conditions shown
- [ ] Level bonuses are displayed (even if thematic only)
- [ ] Empty state message for new users
- [ ] Special messages for balanced/specialist trainers

### **Accessibility:**
- [ ] All interactive elements are at least 44x44pt
- [ ] Color contrast meets WCAG AA (4.5:1 for text)
- [ ] All icons have accessible labels for screen readers
- [ ] Building cards are keyboard-navigable (if applicable)

---

## 🎨 Design Tokens Used

```typescript
// Colors
$bgDark, $glassBg, $glassBorder
$text, $textSecondary
$primary, $primaryGlow
$success, $warning, $error

// Spacing
$2 (8px), $3 (12px), $4 (16px), $5 (20px), $6 (24px)

// Typography
fontFamily: "$heading" (SpaceGrotesk Bold)
fontFamily: "$body" (NotoSans Regular)
fontSize: $2, $3, $4, $5, $6, $7, $8

// Border Radius
$4 (16px), $6 (24px), $full (9999px)

// Shadows
shadowColor: "$primaryGlow"
shadowRadius: 12, 20
```

---

## 📝 Developer Notes

### **Building Data Structure:**

```typescript
interface VillageBuildingWithMeta {
  id: number;
  buildingType: BuildingCode;
  level: number; // 1-5
  xp: number;
  isUnlocked: boolean;
  unlockedAt: Date | null;
  updatedAt: Date;
  
  // Metadata
  tier: BuildingTier; // 1, 2, 3, 4
  emoji: string;
  relatedMuscle: MuscleCode | null;
  relatedStyle: ExerciseStyle | null;
  unlockCondition: string;
  prerequisiteBuilding: BuildingCode | null;
  prerequisiteLevel: number | null;
  isMaxLevel: boolean; // level === 5
}
```

### **Building Image System:**

```typescript
// utils/buildingImages.ts
import { BuildingCode } from "@/db/schema";

const buildingImages: Record<BuildingCode, Record<number, any>> = {
  archery_range: {
    1: require("@/assets/buildings/archery_range_lv1.png"),
    2: require("@/assets/buildings/archery_range_lv2.png"),
    3: require("@/assets/buildings/archery_range_lv3.png"),
    4: require("@/assets/buildings/archery_range_lv4.png"),
    5: require("@/assets/buildings/archery_range_lv5.png"),
  },
  forge: {
    1: require("@/assets/buildings/forge_lv1.png"),
    2: require("@/assets/buildings/forge_lv2.png"),
    3: require("@/assets/buildings/forge_lv3.png"),
    4: require("@/assets/buildings/forge_lv4.png"),
    5: require("@/assets/buildings/forge_lv5.png"),
  },
  // ... all 22 buildings
};

export function getBuildingImage(buildingType: BuildingCode, level: number) {
  return buildingImages[buildingType]?.[level] || buildingImages[buildingType]?.[1];
}
```

### **Image Asset Structure:**

```
assets/
  buildings/
    ├─ archery_range_lv1.png    (256x256px, basic wooden structure)
    ├─ archery_range_lv2.png    (256x256px, reinforced stone)
    ├─ archery_range_lv3.png    (256x256px, banners + decorations)
    ├─ archery_range_lv4.png    (256x256px, towers + advanced)
    ├─ archery_range_lv5.png    (256x256px, legendary with glow)
    ├─ forge_lv1.png
    ├─ forge_lv2.png
    ├─ forge_lv3.png
    ├─ forge_lv4.png
    ├─ forge_lv5.png
    └─ ... (22 buildings × 5 levels = 110 images)
```

**Image Specifications:**
- **Size:** 256x256px (PNG with transparency)
- **Style:** Isometric view, dark fantasy aesthetic
- **Color Palette:** Matches app tokens (blues, grays, glows)
- **File Size:** <100KB per image (optimized)
- **Naming:** `{building_type}_lv{level}.png`

**Image Evolution Guidelines:**
```
Level 1: Basic structure, minimal detail
Level 2: Reinforced materials, slight enhancement
Level 3: Decorations added (banners, flags, details)
Level 4: Advanced features (towers, extensions)
Level 5: Legendary status (glow effects, epic scale)
```

### **XP Thresholds:**

```typescript
const buildingLevelThresholds = {
  1: 0,
  2: 50,
  3: 150,
  4: 400,
  5: 1000,
};

// To level up from 1→2: Need 50 XP
// To level up from 2→3: Need 150 XP (total, not additional)
// Max level: 5 (no further progression)
```

### **Prestige Calculation:**

```typescript
// When building unlocks: +50 prestige
// When building levels up: +(newLevel * 10) prestige
// Example: Level 1→5 = 10 + 20 + 30 + 40 = 100 prestige
```

---

## 🎉 Success Metrics

**How to measure village page success:**

### **Quantitative:**
- **Visit Rate:** >80% of users visit village after session
- **Dwell Time:** Average 30+ seconds on village page
- **Building Interaction:** >50% of users tap building details
- **Return Rate:** >60% return to village within 24h

### **Qualitative:**
- **User Feedback:** "The village makes me want to work out more"
- **Screenshots:** Users share village progress on social media
- **Retention:** Village page correlates with 7-day retention
- **Pride:** Users reference "their village" in support tickets

---

## 🏆 Final Notes

**Village is the HEART of Bati.**

Every workout should feel like:
> "I'm not just exercising—I'm building a legendary kingdom."

The refactored village page must:
1. ✅ Show progress clearly (overview card + stats)
2. ✅ Tell stories (building lore + bonuses)
3. ✅ Celebrate wins (animations + haptics)
4. ✅ Guide growth (unlock hints + balanced training nudges)
5. ✅ Inspire pride (prestige score + legendary buildings)

**Ready to build the most epic fitness village ever?** 🏰⚔️✨
