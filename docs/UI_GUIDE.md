# 🏰 BATI UI/UX Design Guide (v3)

> **Visual Direction:** "Dark Fantasy Construction" meets "High-Tech RPG HUD".
> **Core Philosophy:** *Fitness is your Fortress.* The UI is the cockpit of your character's evolution.
> **Theme Policy:** **DARK MODE ONLY.** No light theme exists in this universe.

---

## 🧭 1. UX Principles (The "Game Feel")

### 🌌 Immersion First (The Void)

The app is a "portal" to the Bati universe.

- **The Void:** Backgrounds are deep obsidian blue (`#0B0F19`), representing the night sky or dungeon depths.
- **The Glow:** Interactive elements "emit light" (Glow effects). They are not just painted; they are powered.
- **Glassmorphism:** UI panels are sheets of high-tech glass floating over the world.

### 🎁 "Juicy" Feedback

Every interaction must feel physical and rewarding.

- **Press:** Buttons scale down (`0.95`) and dim slightly.
- **Success:** Confetti, screen flashes, and haptic feedback.
- **Progress:** Bars fill with a fluid animation; numbers "tick" up.

### ⚔️ Sport-First Ergonomics

Despite the RPG look, the workout experience is sacred.

- **Green Zone:** Primary actions (Start, Pause, Next) are always at the bottom.
- **Legibility:** Timer and Reps are the largest elements on screen.
- **No Distractions:** During a workout, the "Game" fades back.

---

## 🎨 2. Visual Identity & Tokens

### Color Palette (Dark Mode Only)

| Token | Hex Value | Visual Meaning |
| :--- | :--- | :--- |
| **`$bgDark`** | `#0B0F19` | **The World.** Deepest background. Never pure black. |
| **`$surface`** | `#101322` | **Solid Ground.** Standard cards/panels. |
| **`$glassBg`** | `rgba(16, 19, 34, 0.65)` | **HUD Layers.** Floating panels with blur. |
| **`$primary`** | `#0D33F2` | **Action/Mana.** Main buttons, active states (Electric Blue). |
| **`$primaryGlow`** | `rgba(13, 51, 242, 0.5)` | **Energy.** Shadows behind primary actions. |
| **`$secondary`** | `#DB2777` | **Magic.** Special accents (Magenta). |
| **`$success`** | `#16A34A` | **Victory.** Completed sets/quests. |
| **`$text`** | `#E8ECFF` | **Clarity.** Primary text (Off-white/Ice). |
| **`$textSecondary`** | `#909ACB` | **Lore.** Subtitles, descriptions (Muted Blue-Grey). |

### Typography

- **Headings:** `Space Grotesk` (Bold/700) - Used for Titles, Stats, Logos.
- **Body:** `Noto Sans` (Regular/400) - Used for Instructions, buttons.

---

## 🛡️ 3. Components (The Armory)

### Buttons (RPG Style)

**1. The "Embark" Button (Primary CTA)**

- **Shape:** Pill shape (`radius: $full`).
- **Height:** Large (`$14` / 56px).
- **Style:** Solid `$primary` fill + `$primaryGlow` shadow (spread 20px).
- **Interaction:** Scales to 0.95 on press.

**2. The "Glass" Button (Secondary)**

- **Shape:** Rounded Rectangle (`radius: $4`).
- **Style:** `$glassBg` fill + `$borderStrong` stroke (1px).
- **Text:** `$text` (White).

### Cards (The "Quest Plates")

**1. Glass Card (Standard Container)**
Used for Quest Lists, Stat Blocks, and Inventory.

- **Background:** `$glassBg` (Blur intensity: 10).
- **Border:** `$glassBorder` (1px solid inset).
- **Corner Radius:** `$4` (16px).

### Input Fields

- **Background:** `$surface2` (Darker than card).

- **Text:** `$text`.
- **Focus:** Border glows `$primary`.

---

## 🎭 4. Iconography

We use a custom hook for all RPG icons to ensure consistent styling and asset resolution.

**Usage:**

```typescript
import { useGameIcon } from "@/hooks/useGameIcon";

function MyComponent() {
  const { GameIcon } = useGameIcon();

  return (
    <GameIcon name="sword" size={24} color="$primary" />
  );
}
