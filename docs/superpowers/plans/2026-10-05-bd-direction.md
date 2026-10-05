# BD Direction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move Bati's chrome to the inked dark-fantasy BD language the owner validated on 2026-10-05: cold ink ground, bone text, one braise accent, Alegreya titles, panel frames, récitatif and phylactère, no decorative emoji in the touched surfaces.

**Architecture:** Every colour stays in `constants/rawColors.ts` and reaches components through Tamagui tokens; the refresh is a change of values plus a few rules enforced by types, tests and a lint plugin. Shared components (`components/common/`) carry the shape changes so feature screens inherit them. Two small new components (`Recitatif`, the phylactère styling in the villager components) carry the BD codes.

**Tech Stack:** Expo SDK 57, React Native 0.86, Tamagui 2.7 (v4 config), expo-font with `@expo-google-fonts/*` per-weight subpaths, jest 30 + @testing-library/react-native 14, Biome with GritQL plugins.

**Spec:** `docs/superpowers/specs/2026-10-05-bd-direction-design.md` (read it first; every value below comes from its tables and its 11 rules).

## Global Constraints

- Work in `/home/guiforge/Documents/code/bati/.claude/worktrees/design-system`, branch `worktree-design-system`. Never `cd` elsewhere.
- Git through `/usr/bin/git` (a hook rewrites plain `git` and breaks it in worktrees). Stage only the files your task lists (`/usr/bin/git add <paths>`), never `-A`.
- Search with `rg`, never `grep -r`.
- Tests in this worktree: `rtk proxy npx jest --testPathIgnorePatterns /node_modules/ <paths or patterns>` (jest ignores `/.claude/worktrees/` by default; this flag overrides it; `rtk proxy` keeps the real `Test Suites:` line, which the rtk summary hides). Read the `Test Suites:` line, not only `Tests:`.
- Types: `rtk proxy npx tsc --noEmit`. Lint: `rtk proxy npx biome check <paths>`. Dead code: `npm run deadcode`. Never run `tsc` and jest at the same time (heavy suites OOM).
- Colours: no hex or rgba literal outside `constants/rawColors.ts` (the lint plugin enforces hex; Task 4 extends it to rgba). Components use tokens (`bg="$surface"`), never values.
- Copy: no em dash anywhere a reader sees it, in any language. French says `tu`. Straight apostrophe, real ellipsis.
- Icons: game-icons.net art only through `GameIcon` / `useGameIcon`; Lucide only through `components/icons.ts`.
- React Compiler is on: do not add `useMemo` / `useCallback` by hand.
- Tap targets stay at least 44 px. Meaning never by colour alone. Reduced motion must keep working (`useReducedMotion`).
- Commit messages in English, ending with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. If the pre-commit hook rewrites files ("files were modified by this hook"), `git add` them and commit again.
- Coverage thresholds are a ratchet (`package.json` `jest.coverageThreshold`): never lower them. `constants/` must stay at 93% lines.

## Review Focus

1. **A label on a fill that the refresh made unreadable.** Any `bg="$success" | "$error" | "$warning" | "$resourceGold"` with light text, or `bg="$primary"` with `$text` instead of `$onPrimary`. Expect dark (`$bgDark`) text on the first four and `$onPrimary` on primary. Pinned by the fill-pairs test (Task 1) and the fill-label scan (Task 2).
2. **A digit set in Alegreya.** Old-style figures make a timer jump. The only heading-font digits today are the warm-up timer (`WarmupView.tsx:205`). Pinned in Task 5.
3. **A screen that still shows the old blue night.** Gradients and text shadows that retyped `rgba(11, 15, 25, x)` / `rgba(6, 8, 18, x)` by hand fade to the old ground over the new one. Pinned by the rgba lint rule (Task 4).
4. **Meaning lost with the magenta.** Boss HP mid-state, weakness, "hard", records and adventure status must still differ from their neighbours, and not by colour alone where they did not before. Pinned by Task 2's call-site table and its tests.
5. **A pressed seal button that jumps the layout.** The press must translate, not change border width. Pinned in Task 3.

---

### Task 1: The palette

**Files:**
- Modify: `constants/rawColors.ts` (whole palette object and `DIFFICULTY_COLORS` comment)
- Modify: `tamagui.config.ts` (the `dark` / `light` themes' `onPrimary`; nothing else)
- Modify: `app.json:5,21,44` (`#0B0F19` → `#0C0D11`)
- Modify: `android/app/src/main/res/values/colors.xml:2-4` (the three `#0B0F19` → `#0C0D11`; leave `colorPrimary`)
- Modify: `__tests__/color-contrast.test.ts`
- Create: `__tests__/raw-colors-fade.test.ts`

**Interfaces:**
- Produces: `rawColors.onPrimary` (`#FFF4E6`), `rawColors.primaryEdge` (`#7A2905`), theme key `$onPrimary` = `rawColors.onPrimary` in `dark` and `light`, `fade(hex: string, alpha: number): string` exported from `constants/rawColors.ts`. `rawColors.secondary` still exists after this task (Task 2 removes it).

- [ ] **Step 1: Write the failing tests**

Create `__tests__/raw-colors-fade.test.ts`:

```ts
import { fade, rawColors } from "@/constants/rawColors";

describe("fade", () => {
  it("turns a token into the rgba a gradient needs", () => {
    expect(fade("#0C0D11", 0.92)).toBe("rgba(12, 13, 17, 0.92)");
  });

  it("agrees with the overlays written in the palette", () => {
    expect(fade(rawColors.bgDark, 0.92)).toBe(rawColors.bgOverlay);
    expect(fade(rawColors.bgDark, 0.72)).toBe(rawColors.bgOverlaySoft);
    expect(fade(rawColors.bgDark, 0)).toBe(rawColors.bgDarkClear);
  });
});
```

In `__tests__/color-contrast.test.ts`, add after `ACCENT_TOKENS`:

```ts
/**
 * A fill and the label written on it, each pair chosen by hand. The 2026-10 refresh made the
 * states and the gold light enough that light text on them fails (2.0 to 3.6:1), so those take
 * the ink; only the braise fill takes a light label.
 */
const FILL_LABELS = [
  ["onPrimary", "primary"],
  ["bgDark", "success"],
  ["bgDark", "error"],
  ["bgDark", "warning"],
  ["bgDark", "resourceGold"],
] as const;
```

and inside `describe("colour contrast", ...)`, before the scan test:

```ts
  it.each(FILL_LABELS)("$%s on a $%s fill clears AA for body text", (label, fill) => {
    expect(contrast(value(label), value(fill))).toBeGreaterThanOrEqual(AA_TEXT);
  });
```

and in the scan, make the declared set include the labels:

```ts
    const declared = new Set<string>([
      ...TEXT_TOKENS,
      ...ACCENT_TOKENS,
      ...FILL_LABELS.map(([label]) => label),
    ]);
```

Also add `"onPrimary"` to `TEXT_TOKENS` (it is light enough for any dark surface, 14:1, and a label may land beside its fill).

- [ ] **Step 2: Run them to verify they fail**

Run: `rtk proxy npx jest --testPathIgnorePatterns /node_modules/ __tests__/raw-colors-fade.test.ts __tests__/color-contrast.test.ts`
Expected: FAIL: `fade` is not exported; `$onPrimary` resolves to `text`; `$bgDark` on `$success` fails with the old green.

- [ ] **Step 3: Rewrite the palette**

In `constants/rawColors.ts`, replace everything from `export const rawColors = {` to the end of the object with the block below, and add `fade` after it. Keep the file's header comment and the `DifficultyCode` import; keep `DIFFICULTY_COLORS` as it is but replace its first comment line with `Difficulty has one colour per level, everywhere: easy success, medium the braise, hard error.`

```ts
// The braise as text: one value, three roles. Fire is the brand's light, and a caution in amber
// was indistinguishable from the gold under deuteranopia (spec 2026-10-05, rule table).
const BRAISE_LIGHT = "#F08A4B";

export const rawColors = {
  // --- Core ---
  // The braise: the warm light every illustration already has (an axe in a sunbeam, a window,
  // a forge), on the cold ink night around it. A fill colour; text on it is `onPrimary`.
  primary: "#C2410C",
  /**
   * The braise light enough to read as text or an icon on any of our dark surfaces (6.5:1 at
   * worst, on surface2). `primary` itself is a fill: 3.75:1 on bgDark, fine for a shape, never
   * for a sentence.
   */
  primaryText: BRAISE_LIGHT,
  primaryHover: "#D4501A",
  primaryPress: "#9A3412",
  /** The seal button's bottom edge: the fill in shadow. */
  primaryEdge: "#7A2905",
  /** The label on a `primary` fill: 4.77:1. */
  onPrimary: "#FFF4E6",
  // Removed in Task 2 of the 2026-10 refresh; kept until its last consumer moves.
  secondary: "#DB2777",
  success: "#6DB57A",
  warning: BRAISE_LIGHT,
  error: "#F0595D",

  // --- Immersive backgrounds ---
  // Ink, barely cool: measured on the art (quest #373637, Ombre-Lovée #282A35) and the logo
  // (#3B4D5E). A warm or saturated ground makes the paintings look dirty or imported.
  bgDark: "#0C0D11", // The Void
  bgOverlay: "rgba(12, 13, 17, 0.92)",
  // Lighter than the one above, for what has to sit on artwork and still let it through: the
  // scrim that keeps the status bar readable over the village painting.
  bgOverlaySoft: "rgba(12, 13, 17, 0.72)",
  // Behind a bottom sheet that asks something (components/common/FormSheet.tsx).
  sheetScrim: "rgba(0, 0, 0, 0.5)",

  // --- Surfaces ---
  surface: "#15171C",
  surface2: "#1D2027",

  // --- Glass ---
  glassBg: "rgba(21, 23, 28, 0.65)",
  glassBorder: "rgba(236, 228, 212, 0.14)",
  // `resourceGold` at a fifth: the hairline that marks the oath strip as progression on Home
  // without a full gold rule competing with the XP bar.
  goldHairline: "rgba(226, 181, 74, 0.22)",

  // --- Text ---
  text: "#ECE4D4", // Bone
  textSecondary: "#A89C88", // Ash
  // Icons and tints only (widget, recap trace, village rows): 4.08:1 on bgDark, under body AA.
  muted: "#6B707B",

  // --- Effects ---
  borderStrong: "#363A44",
  shadowColor: "#000000",
  primaryGlow: "rgba(194, 65, 12, 0.45)",

  // --- Boss phases ---
  // The room the fight happens in, darkening and reddening as the boss loses. Phase 1 uses
  // `bgDark`; these are its wounded, critical and enraged siblings.
  bossPhase2: "#170F1D",
  bossPhase3: "#1F0E18",
  bossPhase4: "#280B12",

  // --- The recap map ---
  /** Water must read as depth against `bgDark`, never as the blue every mapping app uses. */
  mapWater: "#0E1730",
  /** Wood and park, one wash: a texture at recap zoom, not a status. */
  mapWood: "#101E1B",

  // --- Legacy mapping (safety net) ---
  bgLight: "#15171C",
  pastelBlue: "#18202A",
  pastelPink: "#2A1719", // an error tint since the magenta left
  pastelGreen: "#16261B",
  pastelYellow: "#2A2413",
  pastelPurple: "#261A33",
  pastelOrange: "#2B1B12",

  // --- Resources ---
  // Only the two that are drawn. The other resources are white game-icons glyphs, like inked
  // vignettes; their five colours had no consumer and were removed (2026-10).
  resourceGold: "#E2B54A", // patinated gold: progression, XP, rewards
  resourceFire: BRAISE_LIGHT,

  white: "#FFFFFF",
  black: "#000000",

  // --- The Journal's ramps ---
  // The Journal is drawn with Nocturne's structure (Inter, borderless surfaces, fading rules,
  // one accent) on Bati's own colours. Five steps of its gold, two inks for empty marks.
  gold100: "#F7ECCF",
  gold300: "#EDCB76",
  gold600: "#B08A2E",
  gold700: "#5E4A1E",
  gold800: "#362C15",
  gold900: "#211B0E",
  ink800: "#262A33",
  ink900: "#101217",
  /** `glassBorder` at nothing: the ends of a fading rule. Transparent black would grey it. */
  glassBorderClear: "rgba(236, 228, 212, 0)",
  /** `bgDark` at nothing: where a painting's fade starts. */
  bgDarkClear: "rgba(12, 13, 17, 0)",
} as const;

/**
 * A palette colour (`#rrggbb`) at `alpha`, for the few consumers that need a string rather than
 * a token: gradients and React Native text shadows. One source per value: a hand-typed rgba of
 * the ground is how the old fades kept the 2025 blue after the palette moved.
 */
export function fade(hex: string, alpha: number): string {
  const n = Number.parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}
```

- [ ] **Step 4: Point the theme's `onPrimary` at the new raw colour**

In `tamagui.config.ts`, in BOTH the first theme block (around line 141) and the second (around line 156), replace `onPrimary: tokens.color.text,` with `onPrimary: tokens.color.onPrimary,`. Leave the `dark_journal` block's `onPrimary: tokens.color.bgDark` as it is.

- [ ] **Step 5: The native ground**

`app.json`: replace the three `"#0B0F19"` with `"#0C0D11"`. `android/app/src/main/res/values/colors.xml`: replace the three `#0B0F19` with `#0C0D11` (prebuild writes exactly what app.json says; CI's prebuild-and-diff step checks they agree).

- [ ] **Step 6: Run the tests to verify they pass**

Run: `rtk proxy npx jest --testPathIgnorePatterns /node_modules/ __tests__/raw-colors-fade.test.ts __tests__/color-contrast.test.ts __tests__/tamagui-theme-border.test.ts __tests__/nocturne-danger.test.tsx __tests__/input-placeholder-colour.test.tsx __tests__/boss-arena.test.tsx`
Expected: PASS. If a `TEXT_TOKENS` pair fails, report the token and the measured ratio: do not change a value or lower a floor to make it pass.

Then `rtk proxy npx tsc --noEmit`: expected clean (the five removed resource tokens had no consumers; if one appears, report it).

- [ ] **Step 7: Commit**

```bash
/usr/bin/git add constants/rawColors.ts tamagui.config.ts app.json android/app/src/main/res/values/colors.xml __tests__/color-contrast.test.ts __tests__/raw-colors-fade.test.ts
/usr/bin/git commit -m "Move the palette to ink, bone and braise

Cold ink ground measured on the art, bone text, the braise as the one
accent, patinated gold, natural states with dark labels on their fills.
Adds onPrimary, primaryEdge and fade(); drops five resource colours that
nothing drew.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Retire the magenta, give every use its meaning

**Files:**
- Modify: `components/common/AppButton.tsx` (drop `"secondary"` from `AppButtonVariant` and its branches)
- Modify: `components/common/Chip.tsx`, `components/common/Tag.tsx` (drop the `secondary` tone)
- Modify every call site the type errors list (expected: `app/dev.tsx`, `app/credits.tsx`, `app/exercises/index.tsx`, `app/exercises/[id].tsx`, `components/settings/SyncSetupSheet.tsx`, `components/settings/EncryptionSheet.tsx`, `app/(tabs)/adventures/index.tsx`, `app/(tabs)/adventures/[id].tsx`, `app/(tabs)/quests/index.tsx`, `app/(tabs)/quests/[id].tsx`, `components/quests/QuestConfigCard.tsx`, `components/quests/QuestExerciseRow.tsx`)
- Modify the direct `$secondary` sites: `app/onboarding/training-level.tsx:116,118`, `components/session/VictoryView.tsx:653`, `components/session/NewRecordsBadge.tsx:37,39`, `components/session/SessionRewards.tsx:84,86`, `components/session/BossArena.tsx:469,525,533`, `components/session/ProgressionChart.tsx:188`, `components/adventures/BossPanel.tsx:37,147`, `app/(tabs)/adventures/[id].tsx:115`, `app/(tabs)/quests/[id].tsx:135`
- Modify: `components/session/RestView.tsx:193`, `components/quests/WarmupPreview.tsx:88` (`$warning` flame → `$resourceFire`)
- Modify: `constants/rawColors.ts` (delete `secondary`), `tamagui.config.ts:180` (delete the `dark_journal` `secondary` key), `__tests__/color-contrast.test.ts` (drop `"secondary"` from `ACCENT_TOKENS`, rewrite its comment)
- Create: `__tests__/fill-labels.test.ts`

**Interfaces:**
- Consumes: `$onPrimary`, `$bgDark`, `$primaryText`, `$resourceGold`, `$resourceFire` (Task 1).
- Produces: `AppButtonVariant = "primary" | "outline"`; Chip and Tag tones without `"secondary"`. `$secondary` no longer exists anywhere.

- [ ] **Step 1: Write the failing test**

Create `__tests__/fill-labels.test.ts`. It pins rule 1 of the spec across the source, the same trade `color-contrast.test.ts` makes (a text scan):

```ts
import * as fs from "node:fs";
import * as path from "node:path";

/**
 * Rule 1 of the 2026-10 refresh: the states and the gold are light fills, so what is written on
 * them is ink. A JSX element that paints one of those fills and names a light label in the same
 * opening tag is the bug this catches (the quest screen's "Hard" chip shipped white on magenta,
 * and moved to the error fill with it).
 *
 * ponytail: per-tag text scan. It misses a label set on a child `<Text>`; the contrast test's
 * FILL_LABELS pairs are the floor for those. A rendered assertion needs the layout pass jest
 * does not run.
 */
const LIGHT_FILLS = ["success", "error", "warning", "resourceGold"];
const LIGHT_LABELS = ["text", "white", "onPrimary", "textSecondary"];

function sourceFiles(): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.tsx$/.test(entry.name)) out.push(full);
    }
  };
  for (const d of ["app", "components"]) walk(path.resolve(__dirname, "..", d));
  return out;
}

describe("labels on light fills", () => {
  it("no opening tag puts a light label on a state or gold fill", () => {
    const offenders: string[] = [];
    for (const file of sourceFiles()) {
      const source = fs.readFileSync(file, "utf8");
      for (const tag of source.matchAll(/<[A-Z][\w.]*\s[^<>]*?>/gs)) {
        const body = tag[0];
        const fill = body.match(/\b(?:bg|backgroundColor)="\$(\w+)"/)?.[1];
        const label = body.match(/\bcolor="\$(\w+)"/)?.[1];
        if (fill && label && LIGHT_FILLS.includes(fill) && LIGHT_LABELS.includes(label)) {
          offenders.push(`${path.relative(process.cwd(), file)}: $${label} on $${fill}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it("the magenta is gone", () => {
    const left = sourceFiles().filter((f) => /\$secondary\b/.test(fs.readFileSync(f, "utf8")));
    expect(left.map((f) => path.relative(process.cwd(), f))).toEqual([]);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `rtk proxy npx jest --testPathIgnorePatterns /node_modules/ __tests__/fill-labels.test.ts`
Expected: FAIL, listing the `$secondary` files (and any light label on a state fill).

- [ ] **Step 3: Remove the variant and the tones, let the compiler list the call sites**

`components/common/AppButton.tsx`: `type AppButtonVariant = "primary" | "outline";`, delete the two `if (variant === "secondary")` lines. `components/common/Chip.tsx` and `components/common/Tag.tsx`: delete `"secondary"` from the tone union and its branch (Tag's was `$pastelPink`). Then run `rtk proxy npx tsc --noEmit` and fix each error with this table:

| Call site | Was | Becomes |
|---|---|---|
| every `AppButton variant="secondary"` (20 sites, `app/dev.tsx` included) | magenta button | `variant="outline"` (one primary per screen; the second action is outline) |
| Chip `tone="secondary"` at `quests/index.tsx:280,287,714`, `exercises/index.tsx:393`, `adventures/[id].tsx:617` | magenta chip | remove the `tone` prop (neutral default); if the chip states a duration, keep or add the `Clock` icon from `@/components/icons` so it reads without colour |
| Tag `tone="secondary"` at `adventures/[id].tsx:98` (status active) | pink tag | `tone="primary"` |
| every other Tag `tone="secondary"` (`adventures/[id].tsx:492,581`, `quests/[id].tsx:653,785,795`, `QuestConfigCard.tsx:249`, `QuestExerciseRow.tsx:110,277,293`, `exercises/[id].tsx:500`) | pink tag | remove the `tone` prop (neutral default) |

- [ ] **Step 4: Reassign the direct uses by meaning**

| File:line | Was | Becomes |
|---|---|---|
| `app/onboarding/training-level.tsx:116,118` (selected level) | `bg`/`borderColor` `$secondary` | `$primary`; the label inside the selected card becomes `$onPrimary` |
| `components/session/VictoryView.tsx:653` (feedback "hard") | `accent: "$secondary"` | `accent: "$error"` |
| `components/session/NewRecordsBadge.tsx:37,39` (record icons) | `$secondary` | `$resourceGold` |
| `components/session/SessionRewards.tsx:84,86` (Clock, TrendingUp) | `$secondary` | `$resourceGold` |
| `components/session/BossArena.tsx:469,525,533` (weakness Target, Swords) | `$secondary` | `$primaryText` |
| `components/session/ProgressionChart.tsx:188` (average figure) | `$secondary` | `$text` |
| `components/adventures/BossPanel.tsx:37` (HP colour) | `isEnraged ? "$error" : hpPercent < 50 ? "$secondary" : "$success"` | the same mapping `BossArena` uses for its HP: `isEnraged ? "$error" : "$resourceFire"` (read `BossArena.tsx` around line 193 and copy its rule exactly; one source per value) |
| `components/adventures/BossPanel.tsx:147` (weakness Target) | `$secondary` | `$primaryText` |
| `app/(tabs)/adventures/[id].tsx:115` (`STATUS_COLOR.active`) | `$secondary` | `$primaryText`; and `completed` becomes `$resourceGold` if it is not already |
| `app/(tabs)/quests/[id].tsx:135` (`LEVEL_CHIP_COLORS[Hard]`) | `{ bg: "$secondary", text: "$white" }` | `{ bg: "$error", text: "$bgDark" }`; check the Easy and Medium entries: Easy on `$success` takes `$bgDark`, Medium on `$primary` takes `$onPrimary` |
| `components/session/RestView.tsx:193`, `components/quests/WarmupPreview.tsx:88` (flame icons) | `$warning` | `$resourceFire` |

Then fix every light label on a state or gold fill the new test reports (expected: the session "Terminer" past target on `$success`, the destructive `ConfirmDialog` label on `$error`): make the label `$bgDark`.

- [ ] **Step 5: Delete the token**

`constants/rawColors.ts`: delete the `secondary` line and its comment. `tamagui.config.ts`: delete `secondary: tokens.color.gold600,` from `dark_journal`. `__tests__/color-contrast.test.ts`: `const ACCENT_TOKENS = ["error", "danger"] as const;` and change the comment above it to: `WCAG AA for a meaningful icon, and for large text: short bold labels and glyphs, never a paragraph.`

- [ ] **Step 6: Run everything this touched**

Run: `rtk proxy npx tsc --noEmit` (expected clean), then
`rtk proxy npx jest --testPathIgnorePatterns /node_modules/ __tests__/fill-labels.test.ts __tests__/color-contrast.test.ts __tests__/victory-view.test.tsx __tests__/boss-arena.test.tsx __tests__/quest-exercise-row.test.tsx __tests__/filter-rail.test.tsx __tests__/testid-passthrough.test.tsx`
Expected: PASS. Then `rtk proxy npx jest --testPathIgnorePatterns /node_modules/ adventure quest training` and read `Test Suites:`.

- [ ] **Step 7: Commit**

```bash
/usr/bin/git add -u components app constants tamagui.config.ts __tests__/color-contrast.test.ts
/usr/bin/git add __tests__/fill-labels.test.ts
/usr/bin/git status --short   # only the files of this task
/usr/bin/git commit -m "Retire the magenta: every use takes the colour of its meaning

Records and rewards go gold, the boss's weakness and an adventure in
progress go braise, hard goes red, a selected level takes the primary
fill, plain counts go neutral. The second button style becomes outline.
Labels on the light state and gold fills are ink.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Panels and the seal button

**Files:**
- Modify: `components/common/Card.tsx` (no shadow, `$3`, drop the `flat` prop)
- Modify: the 4 `flat` callers: `app/(tabs)/quests/index.tsx:254`, `app/(tabs)/adventures/index.tsx:192`, `components/journal/SessionCard.tsx:116` (verify path with `rg -l "SessionCard" components`), `components/session/ExpeditionSummary.tsx:94` (verify path)
- Modify: `components/common/AppButton.tsx` (seal), `components/common/Chip.tsx:33` (radii), `components/common/Tag.tsx:35` (radius)
- Modify: `components/common/FormSheet.tsx:71`, `components/village/VillageDetailSheet.tsx:180`, `components/session/OutingGoalSheet.tsx:118-125`, `components/quests/ExercisePickerSheet.tsx:146-157` (sheet tops; verify each path with `rg -l "Sheet.Frame"`)
- Create: `__tests__/app-button-seal.test.tsx`

**Interfaces:**
- Consumes: `$onPrimary`, `$primaryEdge` (Task 1).
- Produces: `Card` props without `flat`; `AppButton` primary renders the seal. Tamagui v4 radius tokens used: `$1` = 3, `$3` = 7, `$6` = 16 (check `node_modules/@tamagui/config` v4 radius table once; if `$3` is not 7, use the token whose value is 7 and say so in the commit).

- [ ] **Step 1: Write the failing test**

Create `__tests__/app-button-seal.test.tsx`. Mirror the provider setup of `__tests__/testid-passthrough.test.tsx` (read it first; copy its imports and its render wrapper verbatim):

```tsx
import { render, screen } from "@testing-library/react-native";
import { AppButton } from "@/components/common/AppButton";
// + the same TamaguiProvider wrapper testid-passthrough.test.tsx uses

describe("AppButton, the seal", () => {
  it("writes its label in onPrimary on the braise", async () => {
    await render(<Wrapper><AppButton testID="seal">Voir la quête</AppButton></Wrapper>);
    const flat = StyleSheet.flatten(screen.getByTestId("seal").props.style);
    expect(flat.borderBottomWidth).toBe(3);
    expect(flat.borderBottomColor).toBe(rawColors.primaryEdge);
    expect(screen.getByText("Voir la quête")).toHaveStyle({ color: rawColors.onPrimary });
  });

  it("keeps the outline variant flat and bone", async () => {
    await render(<Wrapper><AppButton testID="out" variant="outline">Keep it</AppButton></Wrapper>);
    const flat = StyleSheet.flatten(screen.getByTestId("out").props.style);
    expect(flat.borderBottomWidth ?? 1).toBe(1);
    expect(screen.getByText("Keep it")).toHaveStyle({ color: rawColors.text });
  });
});
```

(`StyleSheet` from `react-native`, `rawColors` from `@/constants/rawColors`. If Tamagui resolves the label colour on an inner node, assert on the node `getByText` returns; adjust the query, never the expectation.)

- [ ] **Step 2: Run it to verify it fails**

Run: `rtk proxy npx jest --testPathIgnorePatterns /node_modules/ __tests__/app-button-seal.test.tsx`
Expected: FAIL (no bottom edge; label is `$text`).

- [ ] **Step 3: The seal**

In `components/common/AppButton.tsx`:
- `getColor`: `outline` → `"$text"`, primary → `"$onPrimary"`.
- Props on `<Button>`: `rounded="$3"`; `fontFamily="$heading"`; for the primary variant only (when no `backgroundColor` override), `borderBottomWidth={3}` and `borderBottomColor="$primaryEdge"`; `pressStyle` for primary: `{ y: 2, borderBottomColor: "$primary", opacity: 0.95 }` (a translate, never a border-width change, so nothing below moves); for outline keep `{ opacity: 0.9, scale: 0.98 }`.
- Remove `transition="quick"` from the primary press so it is immediate; keep it for outline.
- `AppIconButton` stays a circle (`rounded={22}` on a 44 square): leave it.

- [ ] **Step 4: Panels**

`components/common/Card.tsx`: remove the shadow props block (`shadowColor`, `shadowRadius`, `shadowOpacity`, `shadowOffset`, `elevation` if any) and the `flat` prop from its props type; `rounded="$3"`; border stays 1 `$borderStrong`. Remove `flat` from its 4 callers (the compiler lists them).
`components/common/Chip.tsx:33`: pressable `rounded="$3"` (was `$10`), static `rounded="$1"` (was `$4`). `components/common/Tag.tsx:35`: `rounded="$1"`.
Each `Sheet.Frame` listed above: add `borderTopLeftRadius="$6" borderTopRightRadius="$6"`.
Inputs (18 `<Input` sites, no radius of their own): in `tamagui.config.ts`, extend the existing `defaultProps: { Input: { placeholderTextColor: "$textSecondary" } }` to `{ placeholderTextColor: "$textSecondary", rounded: "$3" }`, so every field follows the scale without touching the 18 sites. `__tests__/input-placeholder-colour.test.tsx` must stay green.
`ConfirmDialog` is a `Card` and inherits all of this; touch nothing there.

- [ ] **Step 5: Run the tests**

Run: `rtk proxy npx tsc --noEmit`, then `rtk proxy npx jest --testPathIgnorePatterns /node_modules/ __tests__/app-button-seal.test.tsx __tests__/testid-passthrough.test.tsx __tests__/filter-rail.test.tsx __tests__/quest-exercise-row.test.tsx confirm form-sheet`
Expected: PASS; read `Test Suites:`.

- [ ] **Step 6: Commit**

```bash
/usr/bin/git add -u components app
/usr/bin/git add __tests__/app-button-seal.test.tsx
/usr/bin/git status --short
/usr/bin/git commit -m "Panels and the seal: frames instead of shadows, one radius for what you touch

Cards lose a drop shadow that was invisible on the ink ground and cost a
pass per card. Cards, buttons and pressable chips share 7 px, tags 3 px,
sheet tops 16 px. The primary button gets a bottom edge and an onPrimary
label in the title font; pressing translates it, so nothing reflows.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: One source for every translucent colour

**Files:**
- Modify (rgba of the old ground typed by hand): `components/home/HomeStage.tsx:102-104`, `components/home/QuickActions.tsx:375`, `components/session/VictoryView.tsx:456`, `components/adventures/NarrativeModal.tsx:50`, `app/onboarding/village-setup.tsx:74,78`, `app/onboarding/training-level.tsx:70,74`, `app/onboarding/presentation.tsx:57,61`, `app/onboarding/first-session.tsx:99,103`
- Modify (text shadows): `components/session/ExerciseHero.tsx:127`, `components/session/CountdownView.tsx:24`, `components/session/ActiveExerciseView.tsx:384,404`, and the `rgba(0,0,0,0.5)` shadows in the four onboarding files (`village-setup.tsx:101,116,125`, `training-level.tsx:87,96,143`, `presentation.tsx:79`, `first-session.tsx:115,124`)
- Modify (sheet scrims typed by hand): `components/village/VillageDetailSheet.tsx:174`, `components/session/OutingGoalSheet.tsx:118`, `components/quests/ExercisePickerSheet.tsx:146` (verify paths with `rg -l 'rgba\(0,\s*0,\s*0,\s*0\.5\)'`)
- Modify: `.biome/plugins/noRawHexColor.grit` (also reject rgba/rgb string literals)
- Test: the lint rule itself (Step 1)

**Interfaces:**
- Consumes: `fade` and `rawColors` from `@/constants/rawColors` (Task 1).

- [ ] **Step 1: Extend the lint rule first, watch it fail**

Read `.biome/plugins/noRawHexColor.grit` and its header. Extend its pattern so a string literal whose value starts with `rgba(` or `rgb(` is reported with the same exemptions (`*rawColors*`, `__tests__`), and update the header comment to say rgba is covered since 2026-10. Then run:
`rtk proxy npx biome check app components src`
Expected: FAIL, listing exactly the literals above (if it lists others, they are in scope too; if the plugin cannot express it, report back with what you tried before changing approach).

- [ ] **Step 2: Replace each literal**

- `rgba(11, 15, 25, a)` (the old bgDark) → `fade(rawColors.bgDark, a)`.
- `rgba(6, 8, 18, a)` (the old shadowColor) → `fade(rawColors.shadowColor, a)`.
- Text shadow `rgba(0, 0, 0, 0.5)` → `fade(rawColors.black, 0.5)`.
- Sheet overlay `bg="rgba(0,0,0,0.5)"` → `bg="$sheetScrim"`.
Add `import { fade, rawColors } from "@/constants/rawColors";` where missing (keep import order Biome wants).

- [ ] **Step 3: Verify**

Run: `rtk proxy npx biome check app components src .biome` (expected clean), `rtk proxy npx tsc --noEmit`, then `rtk proxy npx jest --testPathIgnorePatterns /node_modules/ onboarding victory home exercise-hero countdown active-exercise narrative`
Expected: PASS; read `Test Suites:`.

- [ ] **Step 4: Commit**

```bash
/usr/bin/git add -u components app .biome
/usr/bin/git status --short
/usr/bin/git commit -m "Derive every gradient and text shadow from the palette

Eleven fades and shadows retyped the old ground by hand and would have
kept the blue night over the new ink. They call fade() now, sheets use
sheetScrim, and the colour lint rejects rgba literals as it does hex.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Alegreya for titles, never for digits

**Files:**
- Modify: `package.json` / `package-lock.json` (add `@expo-google-fonts/alegreya`, remove `@expo-google-fonts/space-grotesk`)
- Modify: `app/_layout.tsx:10-12,87-90` (font imports and `useFonts` keys)
- Modify: `tamagui.config.ts:10-40` (`headingFont`)
- Modify: `components/session/WarmupView.tsx:205` (timer digits in `$body`)
- Modify: `app/onboarding/presentation.tsx:78` (drop `letterSpacing={4}` on the "Bati" H1)
- Modify: `scripts/generate-feature-graphic.py:36-37` (font path)
- Create: `__tests__/heading-font.test.ts`

**Interfaces:**
- Produces: heading font family keys `Alegreya` (=400), `Alegreya_400Regular`, `Alegreya_700Bold`, `Alegreya_800ExtraBold` registered by `useFonts`, matched by `headingFont.face`.

- [ ] **Step 1: Install and check the licence gate**

Run: `npx expo install @expo-google-fonts/alegreya` then `npm uninstall @expo-google-fonts/space-grotesk`.
Check the files exist: `ls node_modules/@expo-google-fonts/alegreya/400Regular node_modules/@expo-google-fonts/alegreya/700Bold node_modules/@expo-google-fonts/alegreya/800ExtraBold`.
Licence (MIT AND OFL-1.1, allowed): run the CI command from `.github/workflows/ci.yml` (`npx license-checker-rseidelsohn --production --excludePrivatePackages --summary --failOn "…"` with the exact `--failOn` list from the workflow). Expected: exit 0.

- [ ] **Step 2: Write the failing test**

Create `__tests__/heading-font.test.ts`:

```ts
import * as fs from "node:fs";
import * as path from "node:path";
import config from "@/tamagui.config";

describe("the title font", () => {
  const heading = config.fonts.heading;

  it("is Alegreya, untracked", () => {
    expect(heading.family).toBe("Alegreya");
    for (const v of Object.values(heading.letterSpacing ?? {})) expect(v).toBe(0);
  });

  it("maps every weight it declares to a face the root layout loads", () => {
    const layout = fs.readFileSync(path.resolve(__dirname, "../app/_layout.tsx"), "utf8");
    for (const face of Object.values(heading.face ?? {})) {
      expect(layout).toContain((face as { normal: string }).normal);
    }
  });

  /**
   * Alegreya's default figures are old-style: in a timer, 0:23 bobs up and down. Digits are set
   * in the body font. The warm-up timer was the one heading-font number in the app.
   */
  it("never sets the warm-up timer", () => {
    const warmup = fs.readFileSync(path.resolve(__dirname, "../components/session/WarmupView.tsx"), "utf8");
    const timer = warmup.slice(warmup.indexOf("formatTime(remainingSeconds)") - 400, warmup.indexOf("formatTime(remainingSeconds)"));
    expect(timer).toContain('fontFamily="$body"');
  });
});
```

Run: `rtk proxy npx jest --testPathIgnorePatterns /node_modules/ __tests__/heading-font.test.ts`
Expected: FAIL (family is SpaceGrotesk).

- [ ] **Step 3: Load the faces**

`app/_layout.tsx`: replace the three Space Grotesk imports with

```ts
import { Alegreya_400Regular } from "@expo-google-fonts/alegreya/400Regular";
import { Alegreya_700Bold } from "@expo-google-fonts/alegreya/700Bold";
import { Alegreya_800ExtraBold } from "@expo-google-fonts/alegreya/800ExtraBold";
```

(sorted where Biome wants them) and in `useFonts` replace the three SpaceGrotesk keys with

```ts
    Alegreya: Alegreya_400Regular,
    Alegreya_400Regular,
    Alegreya_700Bold,
    Alegreya_800ExtraBold,
```

- [ ] **Step 4: The heading font**

`tamagui.config.ts`, replace `headingFont` with:

```ts
// Alegreya: a calligraphic book serif, the voice of a chronicle rather than a dashboard (design
// review 2026-10-05). Its x-height is small, so the scale sits about one step above Space
// Grotesk's. Never tracked, never used for a digit: its figures are old-style and a timer set in
// it jumps. Numbers stay in the body font.
const headingFont = createFont({
  family: "Alegreya",
  size: {
    1: 15,
    2: 20,
    3: 26,
    4: 35,
    5: 44,
    6: 52,
    true: 20,
  },
  lineHeight: {
    1: 20,
    2: 26,
    3: 32,
    4: 42,
    5: 52,
  },
  weight: {
    4: "400",
    7: "700",
  },
  letterSpacing: {
    4: 0,
    5: 0,
  },
  face: {
    400: { normal: "Alegreya_400Regular" },
    700: { normal: "Alegreya_700Bold" },
    800: { normal: "Alegreya_800ExtraBold" },
  },
});
```

`components/session/WarmupView.tsx:205`: add `fontFamily="$body"` to the timer `H1` (as `RestView.tsx:226` does) and `fontVariant={["tabular-nums"]}` if the neighbouring digit displays use it.
`app/onboarding/presentation.tsx:78`: remove `letterSpacing={4}`.
`scripts/generate-feature-graphic.py:36-37`: point `FONT` at `"@expo-google-fonts" / "alegreya" / "800ExtraBold" / "Alegreya_800ExtraBold.ttf"`.

- [ ] **Step 5: Verify**

Run: `rtk proxy npx jest --testPathIgnorePatterns /node_modules/ __tests__/heading-font.test.ts warmup onboarding`, `rtk proxy npx tsc --noEmit`, `npm run deadcode` (space-grotesk must not be reported; alegreya must not be reported as unused).
Expected: all clean. Record the three `.ttf` sizes (`ls -l node_modules/@expo-google-fonts/alegreya/*/*.ttf`) in the commit message; the APK ratchet is 55 MiB and the orchestrator measures it on the release build.

- [ ] **Step 6: Commit**

```bash
/usr/bin/git add package.json package-lock.json app/_layout.tsx tamagui.config.ts components/session/WarmupView.tsx app/onboarding/presentation.tsx scripts/generate-feature-graphic.py __tests__/heading-font.test.ts
/usr/bin/git commit -m "Set titles in Alegreya, keep every digit in Noto Sans

A chronicle serif for the titles, one step larger for its small x-height,
untracked. The warm-up timer was the one number in the heading font and
moves to the body font: Alegreya's figures are old-style.
Faces shipped: 400, 700, 800 (<sizes>).

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Récitatif, phylactère, glyphs

**Files:**
- Create: `components/common/Recitatif.tsx`
- Modify: `components/home/HomeStage.tsx:124` (the quest title H3 becomes a `Recitatif` pinned top-left of the art; the hero frame takes `borderWidth={1.5}` and `$3` radius where it draws its 16 px frame)
- Modify: `components/session/VictoryView.tsx:449-500` (the bottom title block: kicker + title inside a `Recitatif` pinned bottom-left; hero frame `borderWidth={1.5}`)
- Modify: `components/session/VictoryView.tsx:651-671` (feedback emoji → `GameIcon`)
- Modify: `app/(tabs)/quests/index.tsx:76-80,275` (`questEmoji` → `questGlyph` returning a `GameIconName`)
- Modify: `app/(tabs)/adventures/index.tsx:211` (🗺️ fallback → `GameIcon name="scroll"`)
- Modify: `components/chorus/VillagerCameo.tsx:112-120`, `components/chorus/VillagerLine.tsx:45` (phylactère)
- Modify: `biome.json` (add `Recitatif` to `noReactNativeRawText`'s `skip` list if it renders children inside a `<Text>`)
- Test: `__tests__/recitatif.test.tsx` (create), `__tests__/victory-view.test.tsx`, `__tests__/villager-cameo.test.tsx`, `__tests__/villager-line.test.tsx` (extend)

**Interfaces:**
- Consumes: tokens from Task 1, `$3` / `$1` radius from Task 3, heading font from Task 5, `GameIcon` (`components/common/GameIcon.tsx`) with names from `hooks/useGameIcon.ts` (`wind` is the feather, `sword` the crossed swords, `flame` the fire silhouette, `scroll`, `wood` the axe, `lightning`).
- Produces: `export function Recitatif({ children, testID }: { children: ReactNode; testID?: string })`, a self-sizing cartouche; the caller positions it.

- [ ] **Step 1: Write the failing tests**

`__tests__/recitatif.test.tsx` (copy the provider wrapper from `testid-passthrough.test.tsx`):

```tsx
it("draws an ink cartouche in the title font", async () => {
  await render(<Wrapper><Recitatif testID="r">Couper du bois</Recitatif></Wrapper>);
  const box = StyleSheet.flatten(screen.getByTestId("r").props.style);
  expect(box.backgroundColor).toBe(rawColors.bgDark);
  expect(box.borderColor).toBe(rawColors.borderStrong);
  expect(screen.getByText("Couper du bois")).toHaveStyle({ color: rawColors.text });
});
```

In `__tests__/victory-view.test.tsx`, add:

```tsx
it("asks how it went with glyphs, not emoji", async () => {
  // render VictoryView exactly as the existing feedback tests do (copy their setup)
  for (const emoji of ["😊", "💪", "😤"]) expect(screen.queryByText(emoji)).toBeNull();
  // the three options stay reachable by their accessibility labels, as the existing tests press them
});
```

In `__tests__/villager-cameo.test.tsx` and `__tests__/villager-line.test.tsx`, add one test each asserting the spoken line's container has `backgroundColor` `rawColors.text` and the line's text colour `rawColors.bgDark` (find the bubble through the testID the component already exposes; if none, add `testID="villager-bubble"` in the component).

Run: `rtk proxy npx jest --testPathIgnorePatterns /node_modules/ recitatif victory-view villager-cameo villager-line`
Expected: FAIL.

- [ ] **Step 2: The récitatif**

`components/common/Recitatif.tsx`:

```tsx
import type { ReactNode } from "react";
import { Text, YStack } from "tamagui";

/**
 * The BD caption box: a title over a painting sits in an ink cartouche pinned to an edge of the
 * art, instead of white letters on a gradient. Legible on any illustration, and the image stays
 * whole. The caller positions it (absolute, at the edge it wants); this only draws the box.
 */
export function Recitatif({ children, testID }: { children: ReactNode; testID?: string }) {
  return (
    <YStack
      testID={testID}
      self="flex-start"
      bg="$bgDark"
      borderWidth={1}
      borderColor="$borderStrong"
      rounded="$1"
      px="$2"
      py="$1"
    >
      <Text fontFamily="$heading" fontWeight="700" fontSize="$3" color="$text">
        {children}
      </Text>
    </YStack>
  );
}
```

HomeStage: replace the title `H3` in the bottom stack with a `Recitatif` in an absolute container at `t="$3" l="$3"` over the image; keep the meta text, pills and button in the bottom stack (and its gradient, which they still need). Keep the title's accessibility (it is the card's heading: pass `accessibilityRole="header"` through if the H3 had it, by wrapping in the same role).
VictoryView: the kicker ("QUÊTE ACCOMPLIE !") stays as small body text above the cartouche; the title moves into a `Recitatif` at the bottom-left of the image; the gradient can lighten to the first two stops since the title no longer needs it (keep it if the kicker becomes unreadable: check on device in the final review).

- [ ] **Step 3: The glyphs**

`VictoryView.tsx:651-653`:

```ts
    { value: "easy", glyph: "wind", accent: "$success" },
    { value: "good", glyph: "sword", accent: "$primaryText" },
    { value: "hard", glyph: "flame", accent: "$error" },
```

and render `<GameIcon name={glyph} size={22} color={selected ? accent : "$text"} />` where `<Text fontSize={20}>{emoji}</Text>` was (read how `selected`/accent is applied today and keep that logic; keep the visible label under the glyph). The option labels stay (meaning not by glyph alone).
`app/(tabs)/quests/index.tsx`: rename `questEmoji` to `questGlyph`, returning `"flame"` (rounds ≥ 4), `"sword"` (exercises ≥ 4), else `"wood"`; at :275 render `<GameIcon name={questGlyph(q)} size={44} color="$textSecondary" />`.
`app/(tabs)/adventures/index.tsx:211`: `<GameIcon name="scroll" size={44} color="$textSecondary" />`.

- [ ] **Step 4: The phylactère**

`VillagerCameo.tsx:112-120`: the bubble `Card` becomes a `YStack` (no Card: no frame, no shadow) with `bg="$text"`, `rounded="$1"`, `p="$3"`, `self="flex-start"`, `testID="villager-bubble"`, and a tail: a sibling `View` absolutely placed at the bubble's bottom-left, `width={0} height={0}`, `borderTopWidth={9}`, `borderRightWidth={12}`, `borderTopColor="$text"`, `borderRightColor="transparent"`, offset `b={-9} l={0}` (or toward the figure's side if the figure sits on the right: read the layout). The name becomes `color="$ink800"` (11:1 on bone), the line `color="$bgDark"`. Keep the typed / untyped (transparent) split exactly as it is.
`VillagerLine.tsx:45`: same fill, text and radius on its line container (`{ bg: "$text", rounded: "$1", p: "$2" }`), the line text `$bgDark`, and the tail pointing at the 44 px face. Do not change any size or the slot height the existing tests pin.

- [ ] **Step 5: Verify**

Run: `rtk proxy npx jest --testPathIgnorePatterns /node_modules/ recitatif victory villager home quests adventures guide-seen home-drag`, `rtk proxy npx tsc --noEmit`, `rtk proxy npx biome check components app`, `npm run deadcode`.
Expected: PASS and clean; read `Test Suites:`.

- [ ] **Step 6: Commit**

```bash
/usr/bin/git add components/common/Recitatif.tsx __tests__/recitatif.test.tsx
/usr/bin/git add -u components app __tests__ biome.json
/usr/bin/git status --short
/usr/bin/git commit -m "Speak BD: caption boxes on the art, speech bubbles for villagers, glyphs

A quest title over its painting sits in an ink cartouche instead of white
on a gradient. Villagers speak in bone bubbles with a tail. The end of
session asks how it went with the game's own glyphs, and quest and
adventure covers fall back to glyphs instead of emoji.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: The docs say what the code does

**Files:**
- Modify: `DESIGN.md` (front-matter colours, typography, rounded; prose that names Space Grotesk, indigo, magenta, the five resources, shadows)
- Modify: `docs/design/design-system.md` (same snapshot)
- Modify: `PRODUCT.md` only if a sentence contradicts the spec (it describes a "high-tech fantasy HUD": align it to "inked dark-fantasy BD" in one sentence, nothing else)

- [ ] **Step 1: Rewrite the snapshots from the code, not from memory**

Read `constants/rawColors.ts`, `tamagui.config.ts` and the spec. In `DESIGN.md` front-matter: every colour key with its new value, `secondary` and the five resources removed, `on-primary` and `primary-edge` added; `typography`: display/headline/title/label families become `Alegreya, Georgia, serif` with the new sizes from `headingFont`, and the label style moves to `NotoSans` 700 with letter spacing 2px; `rounded`: `tag: 3px ($1)`, `md: 7px ($3, cards, buttons, pressable chips)`, `sheet: 16px ($6)`, `full`. In the prose: replace every sentence about indigo, magenta, Space Grotesk, the pastel-pink secondary tag, shadows on cards, and resource colours, with the spec's rules 1 to 11 in the doc's own voice. Same for `docs/design/design-system.md`.

- [ ] **Step 2: Verify no stale value survives**

Run: `rg -n -i '4A3FD6|8177F7|DB2777|FFD700|0B0F19|SpaceGrotesk|Space Grotesk|magenta|indigo' DESIGN.md docs/design PRODUCT.md`
Expected: no match (a historical mention inside a dated "Changes" note is acceptable if the doc already keeps such a log; say so in the commit).

- [ ] **Step 3: Commit**

```bash
/usr/bin/git add DESIGN.md docs/design/design-system.md PRODUCT.md
/usr/bin/git commit -m "Document the BD direction: ink, bone, braise, Alegreya, panels

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Final gate (orchestrator, not a subagent task)

1. Full suite under CI's Node: `nvm exec 24 rtk proxy npx jest --testPathIgnorePatterns /node_modules/` (alone, nothing else running); `npx tsc --noEmit`; `npx biome ci --error-on-warnings`; `npm run deadcode`; `npx expo-doctor`.
2. Device check (the `device-check` skill): release build on the emulator, screenshots of Home, Quests, a session (active exercise, rest, warm-up timer), a boss fight, Victory, Village with a villager cameo, Journal, Settings, the onboarding first page. Compare against `fastlane/metadata/android/fr-FR/images/phoneScreenshots/`. APK size under 55 MiB.
3. Whole-branch review by a fresh Opus reviewer against the spec and the Review Focus list.
4. Then: update the Design System artifact "Bati" to the shipped code, resume the Claude Design sync, run `/design-review`.
