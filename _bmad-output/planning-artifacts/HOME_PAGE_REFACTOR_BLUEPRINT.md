# 🏠 HOME PAGE - REFACTOR BLUEPRINT (High-Tech RPG HUD)

**Date:** 2026-01-06
**Page:** `app/(tabs)/index.tsx`
**Style:** High-Tech RPG HUD (Dark Fantasy Construction)
**Reference:** `docs/pages/home.md`

---

## 🎯 Vision Statement

> "Home is the cockpit of your hero. A glowing HUD floating in the void, showing your status at a glance, with ONE obvious action: Continue your journey."

**Design Pillars:**

1. **Glassmorphism** - Floating panels over the void
2. **Glow Effects** - Electric blue energy emanating from interactive elements
3. **Minimal Friction** - One tap to resume training
4. **Visual Hierarchy** - Most important = biggest + glowing

---

## 📐 Layout Structure (Visual Blueprint)

```
┌─────────────────────────────────────────────┐
│  🟦 HEADER (Compact, Glowing)               │ ← HUDHeader
│  [Avatar💫] Guiforge  Lvl 12 • Warrior      │
│  ═══════════════░░░░ 75% XP                 │
│  🔥3  ⚔️42  🏆156                            │
└─────────────────────────────────────────────┘

       ↓ Gap: $5 (20px)

┌─────────────────────────────────────────────┐
│  🟦 HERO CARD (Main CTA, GLOWING)           │ ← AdventureHeroCard
│                                             │
│     [⚔️ Boss Image with Phase Effects]     │
│                                             │
│     THE WARRIOR'S PATH                      │
│     "Defeat the Iron Golem"                 │
│                                             │
│     ███████████░░ Step 4/6                  │
│                                             │
│     [▶ CONTINUE ADVENTURE] ← Glow shadow    │
│                                             │
└─────────────────────────────────────────────┘

       ↓ Gap: $4 (16px)

┌─────────────────────────────────────────────┐
│  🟦 QUICK STATS (2 Cards Side-by-Side)      │
│                                             │
│  ┌─────────────┐  ┌────────────────────┐   │
│  │ 🏰 VILLAGE  │  │ 💰 TREASURY         │   │
│  │ Glorious    │  │ 1,234 🪙           │   │
│  │ Kingdom     │  │ +6 resources       │   │
│  └─────────────┘  └────────────────────┘   │
└─────────────────────────────────────────────┘

       ↓ Gap: $4

┌─────────────────────────────────────────────┐
│  🟦 GOALS CARD (If goal active)             │
│                                             │
│  🎯 Weekly Goal: Strength Focus             │
│  ████████░░ 4/5 sessions this week          │
│                                             │
└─────────────────────────────────────────────┘

       ↓ FLOATING ABOVE BOTTOM

┌─────────────────────────────────────────────┐
│                                             │
│     ╔═══════════════════════════╗           │
│     ║  🗺️   🏰   📖   ⚙️       ║ ← FloatingNav
│     ║ Quests Village Journal Settings ║
│     ╚═══════════════════════════╝           │
│                                             │
└─────────────────────────────────────────────┘
```

---

## 🧩 Component Breakdown

### **1. HUDHeader** (New Component)

**File:** `components/home/HUDHeader.tsx`

**Purpose:** Compact hero identity with glowing accents

**Visual Specs:**

- Background: `$bgDark` (no card bg, blends with page)
- Avatar: 56px circular with `$primaryGlow` shadow (8px spread)
- Name: SpaceGrotesk Bold, $6 (24px), `$text`
- Level: NotoSans Regular, $3 (16px), `$textSecondary`
  - XP Bar: Height 6px, `$primary` fill, glassmorphism track
- Stats Row: 3 mini stat chips (Flame, Sessions, Total XP)

**Interactions:**

- Avatar tap → Settings
- Stats chips tap → Journal

**Code Structure:**

```tsx
<YStack bg="$bgDark" pt="$3" px="$4" gap="$3">
  <XStack items="center" gap="$3">
    <Avatar
      size={56}
      borderWidth={2}
      borderColor="$primary"
      shadowColor="$primaryGlow"
      shadowRadius={8}
    />
    <YStack flex={1}>
      <Text fontFamily="$heading" fontSize="$6" color="$text">
        {villageName}
      </Text>
      <Text fontSize="$3" color="$textSecondary">
        Lvl {level} • {title}
      </Text>
      <XPBar progress={xpProgress} />
    </YStack>
  </XStack>

  <XStack gap="$2" pb="$2">
    <StatChip icon="flame" value={streak} label="streak" />
    <StatChip icon="sword" value={sessions} label="sessions" />
    <StatChip icon="trophy" value={totalXP} label="XP" />
  </XStack>
</YStack>
```

---

### **2. AdventureHeroCard** (Refactor Existing)

**File:** `components/home/AdventureHeroCard.tsx` (already exists at 7.7K)

**Purpose:** MAIN CTA - Continue adventure or start new quest

**Visual Specs:**

- Background: `$glassBg` with blur(10)
- Border: 2px `$primary` (not glassBorder - stronger)
- Shadow: `$primaryGlow` spread 20px, offset (0, 8)
- Border Radius: $6 (24px)
- Padding: $5 (20px)

**Content Hierarchy:**

1. **Boss/Quest Image** (if available): 200px height, rounded $4
2. **Title**: SpaceGrotesk Bold, $7 (32px), `$text`, uppercase
3. **Subtitle**: NotoSans Regular, $4 (18px), `$textSecondary`
4. **Progress Bar** (if adventure): Segmented by steps, `$primary` fill
5. **CTA Button**: HUDButton (see specs below)

**States:**

- **Active Adventure**: Shows current step, "CONTINUE ADVENTURE"
- **No Adventure**: Shows suggested quest, "START QUEST"
- **Goal Active**: Shows next planned session, "START WORKOUT"

**Interactions:**

- Entire card pressable (scale 0.98)
- Button has extra glow on press

**Code Changes:**

```tsx
// BEFORE (current)
<YStack bg="$bgLight" borderWidth={1} borderColor="#dcdcdc">

// AFTER (refactored)
<YStack
  bg="$glassBg"
  borderWidth={2}
  borderColor="$primary"
  shadowColor="$primaryGlow"
  shadowRadius={20}
  shadowOffset={{ width: 0, height: 8 }}
  borderRadius="$6"
  p="$5"
  pressStyle={{ scale: 0.98 }}
  animation="quick"
>
```

---

### **3. QuickStatsRow** (New Component)

**File:** `components/home/QuickStatsRow.tsx`

**Purpose:** Village + Treasury cards side-by-side

**Visual Specs:**

- 2 cards in XStack with gap $3
- Each card: `$glassBg`, border `$glassBorder`, radius $5
- Icons: 48px, colored by type (castle = green, chest = gold)
- Text: Title $4, Value $6 bold

**Layout:**

```tsx
<XStack gap="$3" px="$4">
  <GlassCard
    flex={1}
    onPress={() => router.push('/(tabs)/village')}
  >
    <GameIcon name="castle" size={48} color="$success" />
    <Text fontSize="$4" color="$textSecondary">Village</Text>
    <Text fontSize="$6" fontWeight="bold" color="$text">
      {prestigeLevel}
    </Text>
  </GlassCard>

  <GlassCard
    flex={1}
    onPress={() => router.push('/treasury')}
  >
    <GameIcon name="chest" size={48} color="$resourceGold" />
    <Text fontSize="$4" color="$textSecondary">Treasury</Text>
    <Text fontSize="$6" fontWeight="bold" color="$text">
      {goldAmount} 🪙
    </Text>
  </GlassCard>
</XStack>
```

---

### **4. GoalProgressCard** (Conditional)

**File:** `components/home/GoalProgressCard.tsx`

**Purpose:** Show weekly goal progress (only if goal active)

**Visual Specs:**

- `$glassBg` card with `$glassBorder`
- Progress bar: Segmented by days, filled with `$success`
- Icon: Target 🎯 (32px)

**Show When:**

```tsx
{hasActiveGoal && <GoalProgressCard />}
```

---

### **5. FloatingNav** (New Component) 🚀

**File:** `components/core/FloatingNav.tsx`

**Purpose:** Bottom navigation bar (replaces hidden tabs)

**Visual Specs:**

- Position: Absolute bottom, centered horizontally
- Background: `$glassBg` with heavy blur (15)
- Border: 1px `$primary`, glow shadow
- Border Radius: $full (pill shape)
- Height: 64px
- Width: 90% screen width (max 400px)
- Padding: $2

**Items:**

```tsx
const navItems = [
  { icon: 'map', label: 'Quests', route: '/(tabs)/quests' },
  { icon: 'castle', label: 'Village', route: '/(tabs)/village' },
  { icon: 'book', label: 'Journal', route: '/(tabs)/journal' },
  { icon: 'settings', label: 'Settings', route: '/settings' },
];
```

**Interaction:**

- Active item: `$primary` color + scale 1.1
- Inactive: `$textSecondary` opacity 0.6
- Tap: scale 0.95, haptic feedback

**Code:**

```tsx
<XStack
  position="absolute"
  bottom={20}
  left="5%"
  right="5%"
  maxWidth={400}
  bg="$glassBg"
  borderWidth={1}
  borderColor="$primary"
  borderRadius="$full"
  shadowColor="$primaryGlow"
  shadowRadius={16}
  shadowOffset={{ width: 0, height: 8 }}
  height={64}
  items="center"
  justifyContent="space-around"
  px="$2"
>
  {navItems.map(item => (
    <NavButton key={item.route} {...item} />
  ))}
</XStack>
```

---

## 🎨 Core Components Needed (Create First)

### **A. GlassCard** (Base Component)

**File:** `components/core/GlassCard.tsx`

```tsx
import { Card, type CardProps } from 'tamagui';

export function GlassCard(props: CardProps) {
  return (
    <Card
      bg="$glassBg"
      borderWidth={1}
      borderColor="$glassBorder"
      borderRadius="$5"
      p="$4"
      pressStyle={{ scale: 0.98, opacity: 0.9 }}
      animation="quick"
      {...props}
    />
  );
}
```

---

### **B. HUDButton** (Primary CTA)

**File:** `components/core/HUDButton.tsx`

```tsx
import { Button, type ButtonProps } from 'tamagui';

export function HUDButton({ children, ...props }: ButtonProps) {
  return (
    <Button
      bg="$primary"
      color="white"
      fontSize="$5"
      fontWeight="bold"
      fontFamily="$heading"
      textTransform="uppercase"
      letterSpacing={2}
      borderRadius="$full"
      height={56}
      shadowColor="$primaryGlow"
      shadowRadius={20}
      shadowOffset={{ width: 0, height: 8 }}
      shadowOpacity={1}
      pressStyle={{
        scale: 0.95,
        shadowRadius: 30,
      }}
      animation="quick"
      {...props}
    >
      {children}
    </Button>
  );
}
```

---

### **C. StatChip** (Mini Stat Display)

**File:** `components/core/StatChip.tsx`

```tsx
import { XStack, Text } from 'tamagui';
import { GameIcon } from '@/components/common/GameIcon';

interface StatChipProps {
  icon: string;
  value: number;
  label: string;
}

export function StatChip({ icon, value, label }: StatChipProps) {
  return (
    <XStack
      bg="$glassBg"
      borderWidth={1}
      borderColor="$glassBorder"
      borderRadius="$4"
      px="$3"
      py="$2"
      items="center"
      gap="$2"
      flex={1}
    >
      <GameIcon name={icon} size={20} />
      <Text fontSize="$5" fontWeight="bold" color="$text">
        {value}
      </Text>
      <Text fontSize="$2" color="$textSecondary" textTransform="uppercase">
        {label}
      </Text>
    </XStack>
  );
}
```

---

## 🔄 Refactor Steps (Implementation Order)

### **Phase 1: Core Components (Day 1)**

1. Create `components/core/` folder
2. Implement `GlassCard.tsx`
3. Implement `HUDButton.tsx`
4. Implement `StatChip.tsx`
5. Test in Storybook or dev screen

### **Phase 2: Header (Day 2)**

1. Create `HUDHeader.tsx`
2. Replace `HomeHeader.tsx` usage
3. Add glow effects to avatar
4. Implement stat chips row
5. Test responsiveness

### **Phase 3: Hero Card (Day 3)**

1. Refactor `AdventureHeroCard.tsx`
2. Replace bg/border with glass system
3. Add `$primaryGlow` shadow
4. Replace Button with HUDButton
5. Test all states (adventure/no adventure/goal)

### **Phase 4: Quick Stats (Day 4)**

1. Create `QuickStatsRow.tsx`
2. Refactor Village + Treasury cards
3. Use GlassCard component
4. Add tap animations

### **Phase 5: Floating Nav (Day 5)**

1. Create `FloatingNav.tsx`
2. Implement nav items
3. Add active state logic
4. Position at bottom with safe area
5. Test navigation

### **Phase 6: Page Assembly (Day 6)**

1. Refactor `app/(tabs)/index.tsx`
2. Replace old components with new ones
3. Add FloatingNav
4. Adjust spacing/gaps
5. Remove old unused code

### **Phase 7: Polish (Day 7)**

1. Add haptic feedback
2. Fine-tune animations
3. Test on real device
4. Screenshot comparisons
5. Performance check (60fps?)

---

## ✅ Acceptance Criteria

### Visual

- [ ] All cards use `$glassBg` background
- [ ] Avatar has `$primaryGlow` shadow
- [ ] Main CTA button glows with 20px spread
- [ ] Floating nav visible at bottom
- [ ] All icons via `useGameIcon()` hook
- [ ] Typography: SpaceGrotesk for titles, NotoSans for body

### Functional

- [ ] Avatar tap → Settings
- [ ] Hero card tap → Continue adventure/quest
- [ ] Village card tap → Village page
- [ ] Treasury card tap → Treasury page
- [ ] Floating nav items navigate correctly
- [ ] Active nav item highlighted

### Interaction

- [ ] All pressable elements scale to 0.95-0.98
- [ ] Haptic feedback on important taps
- [ ] Animations run at 60fps
- [ ] No layout shift on data load

### Code Quality

- [ ] No hardcoded colors (all tokens)
- [ ] No direct lucide-icon imports
- [ ] All text uses i18n
- [ ] TypeScript strict mode passes
- [ ] Components exported from index

---

## 📊 Before/After Comparison

### Current Issues

- ❌ No glassmorphism (solid backgrounds)
- ❌ No glow effects
- ❌ Weak visual hierarchy
- ❌ Hidden tabs, no visible nav
- ❌ Cards don't feel "HUD-like"

### After Refactor

- ✅ Glass panels floating over void
- ✅ Electric blue glows on interactive elements
- ✅ Clear hero card as main CTA
- ✅ Floating nav for quick access
- ✅ High-tech RPG HUD aesthetic

---

## 🎯 Success Metrics

**User Experience:**

- Time to start workout: <2 taps from home
- Visual appeal: "Wow factor" on first load
- Clarity: Obvious what to do next

**Technical:**

- Load time: <500ms to interactive
- FPS: Solid 60fps on animations
- Bundle size: +10KB max from new components

---

## 📝 Notes for Implementation

1. **Safe Area:** Use `useSafeAreaInsets()` for FloatingNav bottom position
2. **Blur Support:** iOS has native blur, Android may need fallback
3. **Performance:** Memoize GameIcon calls (heavy operation)
4. **Accessibility:** Add `accessibilityLabel` to all interactive elements
5. **Testing:** Test on iPhone SE (small screen) and iPad (large)

---

**Ready to implement? Start with Phase 1 (Core Components)!** 🚀
