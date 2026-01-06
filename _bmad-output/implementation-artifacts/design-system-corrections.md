# Design System Corrections - Hex Color Violations

**Generated:** 2026-01-06  
**Priority:** HIGH  
**Estimated Effort:** 2-3 hours  
**Impact:** Ensures 95%+ design system conformity

---

## Overview

**Issue:** 18 hardcoded hex colors found violating Tamagui design system token usage.

**Goal:** Replace all hex colors with appropriate Tamagui tokens ($primary, $text, $textSecondary, $warning, $success, etc.)

**Files Affected:** 5 files

---

## Task Breakdown

### Task 1: Fix HomeHeader.tsx (1 violation)

**File:** `components/home/HomeHeader.tsx`

**Current Code:**
```tsx
color="#FFD700"  // Gold hardcoded
```

**Action:**
- [ ] Replace `#FFD700` with appropriate token (likely `$warning` or `$gold` if exists)
- [ ] Verify visual consistency after change
- [ ] Test on both iOS and Android

**Estimated Time:** 10 minutes

---

### Task 2: Fix JournalStats.tsx (6 violations)

**File:** `components/journal/JournalStats.tsx`

**Current Code:**
```tsx
color="#6366F1"  // Indigo - likely for primary action/accent
yAxisTextStyle={{ color: "#9CA3AF", fontSize: 10 }}  // Gray - chart axis
xAxisLabelTextStyle={{ color: "#9CA3AF", fontSize: 9 }}  // Gray - chart labels
yAxisTextStyle={{ color: "#9CA3AF", fontSize: 10 }}  // Gray - another axis
color: "#6B7280"  // Darker gray
```

**Challenge:** `react-native-gifted-charts` requires inline styles, doesn't support Tamagui tokens directly.

**Solutions (choose one):**

**Option A: Theme Resolver Function**
```tsx
import { useTheme } from "tamagui";

function JournalStats() {
  const theme = useTheme();
  
  const chartColors = {
    primary: theme.primary.val,
    textSecondary: theme.textSecondary.val,
  };
  
  return (
    <LineChart
      color={chartColors.primary}
      yAxisTextStyle={{ color: chartColors.textSecondary, fontSize: 10 }}
      // ...
    />
  );
}
```

**Option B: Constants File**
```tsx
// constants/chartTheme.ts
import { tokens } from "@tamagui/config";

export const CHART_THEME = {
  primary: tokens.color.primary.val,
  textSecondary: tokens.color.textSecondary.val,
  // ...
};
```

**Actions:**
- [ ] Create chart theme resolver or constants file
- [ ] Replace all 6 hex colors with theme values
- [ ] Verify charts render correctly
- [ ] Test dark mode (already forced, but validate colors)
- [ ] Test on both iOS and Android

**Estimated Time:** 45 minutes

---

### Task 3: Fix DatabaseProvider.tsx (5 violations)

**File:** `components/DatabaseProvider.tsx`

**Current Code:**
```tsx
<Text style={{ color: "#1A1A2E", fontSize: 16, fontWeight: "bold" }}>
<Text style={{ color: "#FF6B35", fontSize: 14 }}>
<Text style={{ color: "#1A1A2E", fontSize: 12, opacity: 0.7 }}>
<Text style={{ color: "#1A1A2E", fontSize: 18, fontWeight: "700" }}>
<Text style={{ color: "#1A1A2E", opacity: 0.6 }}>
```

**Recommended Replacements:**
- `#1A1A2E` → `$text` (dark text on light loading screen)
- `#FF6B35` → `$destructive` or `$error` (error messages)

**Actions:**
- [ ] Convert all `<Text style={...}>` to Tamagui `<Text>` components
- [ ] Replace inline styles with Tamagui props:
  ```tsx
  // Before:
  <Text style={{ color: "#1A1A2E", fontSize: 16, fontWeight: "bold" }}>
  
  // After:
  <Text color="$text" fontSize="$5" fontWeight="bold">
  ```
- [ ] Verify loading screen appearance (rarely seen, but test with slow DB init)
- [ ] Verify error screen appearance (test by forcing DB error)

**Estimated Time:** 30 minutes

---

### Task 4: Fix StreakBadge.tsx (6 violations)

**File:** `components/common/StreakBadge.tsx`

**Current Code:**
```tsx
const MILESTONES = [
  { minDays: 100, name: { en: "Eternal", fr: "Éternel" }, color: "#FFD700", emoji: "🌟" },
  { minDays: 30, name: { en: "Inferno", fr: "Inferno" }, color: "#FF4500", emoji: "🔥" },
  { minDays: 14, name: { en: "Blaze", fr: "Brasier" }, color: "#FF6347", emoji: "🔥" },
  { minDays: 7, name: { en: "Ember", fr: "Braise" }, color: "#FF8C00", emoji: "✨" },
  { minDays: 3, name: { en: "Spark", fr: "Étincelle" }, color: "#FFA500", emoji: "⚡" },
];

fill={streak.isActive ? (milestone?.color ?? "#FF6B35") : "transparent"}
```

**Challenge:** Colors represent progression tiers (gold → orange gradient). Need semantic tokens.

**Recommended Solution:**

**Option A: Define Streak Tokens in tamagui.config.ts**
```tsx
// tamagui.config.ts - Add to color tokens
colors: {
  // ... existing tokens
  streakEternal: "#FFD700",  // Or map to existing $gold
  streakInferno: "#FF4500",
  streakBlaze: "#FF6347",
  streakEmber: "#FF8C00",
  streakSpark: "#FFA500",
}
```

Then use:
```tsx
const MILESTONES = [
  { minDays: 100, color: "$streakEternal", ... },
  // ...
];
```

**Option B: Map to Existing Tokens**
```tsx
const MILESTONES = [
  { minDays: 100, color: "$warning", emoji: "🌟" },  // Gold → warning
  { minDays: 30, color: "$destructive", emoji: "🔥" },  // Red → destructive
  // ...
];
```

**Actions:**
- [ ] Choose approach (A: specific tokens, B: map to existing)
- [ ] If A: Add streak color tokens to tamagui.config.ts
- [ ] Update MILESTONES array to use tokens
- [ ] Update `fill=` logic to resolve token color
- [ ] Visual regression test: verify streak badge colors match design intent
- [ ] Test on both iOS and Android

**Estimated Time:** 30 minutes

---

### Task 5: Fix ProgressionChart.tsx (2 violations)

**File:** `components/session/ProgressionChart.tsx`

**Current Code:**
```tsx
color: "#9CA3AF"  // Gray - axis labels
color: "#9CA3AF"  // Gray - axis text
```

**Action:**
- [ ] Similar to Task 2 (JournalStats), use theme resolver for chart library
- [ ] Replace both grays with `$textSecondary` resolved value
- [ ] Verify chart renders correctly
- [ ] Test on both iOS and Android

**Estimated Time:** 20 minutes

---

## Additional Recommendations (Lower Priority)

### Touch Targets Audit (Priority 2)

**Files to Check:**
- `components/common/Button.tsx` (if exists)
- `components/common/Card.tsx` (when pressable)
- `components/common/IconButton.tsx` (if exists)
- Any `<Pressable>` or `onPress` handlers

**Action:**
- [ ] Audit all pressable components
- [ ] Ensure `minHeight: 44, minWidth: 44` or `hitSlop`
- [ ] Reference: `components/common/Chip.tsx` already has `minHeight: 44` (good example)

**Estimated Time:** 1 hour

---

### Accessibility Labels Completion (Priority 3)

**Current:** 23 accessibility labels found  
**Goal:** All interactive elements labeled

**Action:**
- [ ] Audit all `<Button>`, `<Pressable>`, `<TouchableOpacity>` for `accessibilityLabel`
- [ ] Add `accessibilityRole` where missing
- [ ] Add `accessibilityHint` for complex interactions

**Estimated Time:** 1-2 hours

---

### Chart Library Alternative Evaluation (Future)

**Current:** `react-native-gifted-charts` requires inline styles  
**Issue:** Difficult to maintain design system consistency

**Alternatives to Evaluate:**
1. **victory-native** - More flexible theming
2. **react-native-svg-charts** - SVG-based, easier token integration
3. **Custom SVG charts** - Full control, more work

**Action:** Research and prototype (Phase 6+)

---

## Testing Checklist

After completing all fixes:

- [ ] **Visual Regression**: Compare before/after screenshots
- [ ] **iOS Testing**: Verify all colors render correctly
- [ ] **Android Testing**: Verify all colors render correctly
- [ ] **Dark Mode**: Validate (already forced, but check consistency)
- [ ] **Accessibility**: Run with screen reader, verify contrast
- [ ] **Performance**: Ensure no performance regression from token resolution

---

## Success Metrics

**Before:** 78% design system conformity (18 hex violations)  
**After:** 95%+ design system conformity (0 hex violations in core components)

**Quality Gates:**
- ✅ All hardcoded hex colors replaced with tokens
- ✅ Visual appearance unchanged (no regressions)
- ✅ Code passes Biome linting
- ✅ TypeScript compilation clean
- ✅ No console warnings about deprecated props

---

## Implementation Order

**Recommended Sequence:**

1. **Task 3 (DatabaseProvider)** - Easiest, rarely seen screens
2. **Task 1 (HomeHeader)** - Quick win, visible component
3. **Task 4 (StreakBadge)** - Requires token decision, medium complexity
4. **Task 5 (ProgressionChart)** - Chart lib, medium complexity
5. **Task 2 (JournalStats)** - Chart lib, most complex (6 violations)

**Total Estimated Time:** 2 hours 15 minutes (core fixes)  
**With testing:** 3 hours  
**With additional recommendations:** 5-6 hours

---

## Notes for Implementation

**Best Practices:**
- Commit after each task (atomic commits)
- Test visually after each file change
- Use `git diff` to review color changes
- Keep original hex in commit message for reference

**Example Commit Messages:**
```
fix(design-system): Replace hex colors with tokens in HomeHeader

- Replaced #FFD700 with $warning token
- Verified gold color matches design intent
- Tested on iOS and Android
```

**Token Resolution Helper:**
```tsx
// Helper to debug token values during development
import { useTheme } from "tamagui";

function DebugTokens() {
  const theme = useTheme();
  console.log("Theme tokens:", {
    primary: theme.primary.val,
    text: theme.text.val,
    textSecondary: theme.textSecondary.val,
    // ...
  });
}
```

---

**Questions or clarifications?** Ping Guiforge or architect agent.
