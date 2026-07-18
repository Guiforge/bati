---
name: Bati
description: A minimal, ludic fitness RPG that turns strength training into a dark-fantasy quest.
colors:
  primary: "#0D33F2"
  primary-hover: "#2E5CFF"
  primary-press: "#0A25B0"
  primary-glow: "rgba(13, 51, 242, 0.45)"
  secondary: "#DB2777"
  success: "#16A34A"
  error: "#FF1744"
  bg-void: "#0B0F19"
  bg-overlay: "rgba(11, 15, 25, 0.92)"
  surface: "#101322"
  surface-raised: "#151A2E"
  glass-bg: "rgba(16, 19, 34, 0.65)"
  glass-border: "rgba(232, 236, 255, 0.14)"
  border-strong: "#2A3360"
  text: "#E8ECFF"
  text-secondary: "#909ACB"
  muted: "#64748B"
  shadow: "#060812"
  resource-gold: "#FFD700"
  resource-wood: "#8B4513"
  resource-stone: "#808080"
  resource-fire: "#FF6B35"
  resource-water: "#4ECDC4"
  resource-wind: "#C9B1FF"
  resource-grain: "#DAA520"
typography:
  display:
    fontFamily: "SpaceGrotesk, system-ui, sans-serif"
    fontSize: "48px"
    fontWeight: 700
    lineHeight: "50px"
    letterSpacing: "0"
  headline:
    fontFamily: "SpaceGrotesk, system-ui, sans-serif"
    fontSize: "32px"
    fontWeight: 700
    lineHeight: "40px"
    letterSpacing: "0"
  title:
    fontFamily: "SpaceGrotesk, system-ui, sans-serif"
    fontSize: "24px"
    fontWeight: 700
    lineHeight: "32px"
    letterSpacing: "0"
  body:
    fontFamily: "NotoSans, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: "24px"
    letterSpacing: "0"
  label:
    fontFamily: "SpaceGrotesk, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 700
    lineHeight: "20px"
    letterSpacing: "4px"
rounded:
  sm: "$4"
  md: "$8"
  pill: "$10"
  full: "9999px"
spacing:
  xs: "$1"
  sm: "$2"
  md: "$3"
  lg: "$4"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.bg-void}"
    rounded: "{rounded.md}"
    padding: "0 16px"
    height: "48px"
  button-secondary:
    backgroundColor: "{colors.secondary}"
    textColor: "#FFFFFF"
    rounded: "{rounded.md}"
    padding: "0 16px"
    height: "48px"
  button-outline:
    backgroundColor: "{colors.bg-overlay}"
    textColor: "{colors.text}"
    rounded: "{rounded.md}"
    padding: "0 16px"
    height: "48px"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.md}"
    padding: "16px"
  chip:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.pill}"
    padding: "8px 12px"
---

# Design System: Bati

## 1. Overview

**Creative North Star: "The Hero's HUD"**

Bati looks like the heads-up display of a fantasy warrior gearing up for a fight, rendered on high-tech glass. The world is deep obsidian blue, lit by a single electric-blue signal that behaves like a power source: it glows, it presses, it marks the one action that matters. Nothing is decorative for its own sake. A user opens Bati mid-workout, phone in one hand, and the interface has to read instantly and get out of the way, so the epic is loud where it motivates and silent everywhere else.

The system rejects the two failure modes named in the product brief. It is not a cluttered, stat-heavy gym app: charts and numbers never bury the next action. It is not a cartoonish kids' game: no bright mascots, no bouncy-everything, no candy palette. And it is not corporate or clinical: there is no light theme, no flat white dashboard, no health-app sterility. The immersion is real dark fantasy carried by deep backgrounds, confident weight, and a disciplined accent, not a spreadsheet with a game skin bolted on.

Surfaces are high-contrast and physical. Cards and buttons wear a heavy 3px off-white edge with a hard, offset "sticker" shadow, so elements feel stamped onto the void rather than floating in soft blur. A parallel glass-and-glow vocabulary exists for atmospheric surfaces (overlays, ambient panels). The two are deliberate registers, not a contradiction: hard-edged for the things you act on, glass for the things you look through.

**Key Characteristics:**
- Always dark: one obsidian-blue world across iOS and Android, no light mode, no per-OS reskin.
- One electric-blue signal reserved for the primary action.
- Heavy off-white borders and hard offset shadows on interactive surfaces.
- Two type voices: Space Grotesk (heroic) over Noto Sans (legible).
- Meaning never rides on color alone; icons and labels back every state.

## 2. Colors

A deep-blue night lit by a single electric signal, with a small cast of resource hues reserved strictly for the RPG economy.

### Primary
- **Electric Blue** (#0D33F2): The one signal. Primary buttons, active states, the single most important action on any screen. Its rarity is the point; it should read as power, not paint. `primary-hover` (#2E5CFF) and `primary-press` (#0A25B0) are its only siblings, plus **Primary Glow** (rgba(13,51,242,0.45)) for the shadow/halo under a hero action.

### Secondary
- **Magenta** (#DB2777): A secondary accent for alternate actions and contrast moments. Used sparingly; never competes with Electric Blue for "the" action on a screen.

### Tertiary
- **Quest Success** (#16A34A) and **Alert Red** (#FF1744): State colors for confirmation and danger. Always paired with an icon or label, never color-only.
- **Resource Palette**: Gold (#FFD700), Wood (#8B4513), Stone (#808080), Fire (#FF6B35), Water (#4ECDC4), Wind (#C9B1FF), Grain (#DAA520). Reserved exclusively for the resource/village economy so a hue reliably maps to a resource.

### Neutral
- **The Void** (#0B0F19): Main app background. Deep obsidian blue.
- **Surface** (#101322) / **Surface Raised** (#151A2E): Card and layered panel backgrounds.
- **Glass** (bg rgba(16,19,34,0.65), border rgba(232,236,255,0.14)): Atmospheric, translucent panels only.
- **Text** (#E8ECFF): Primary off-white text. **Text Secondary** (#909ACB): Subtitles and muted labels. **Muted** (#64748B): The quietest tier; only on large or non-essential text where it still clears contrast.
- **Border Strong** (#2A3360): Structural dividers on dark surfaces.

### Named Rules
**The One Signal Rule.** Electric Blue marks a single primary action per screen. If two things are blue, the user can't tell which to press. Everything else is neutral, secondary, or a resource hue.

**The Reserved Resource Rule.** The resource palette (gold, wood, stone, fire, water, wind, grain) is never borrowed for decoration. A resource color always means that resource.

## 3. Typography

**Display Font:** Space Grotesk (with system-ui, sans-serif fallback)
**Body Font:** Noto Sans (with system-ui, sans-serif fallback)

**Character:** A geometric-grotesk display against a neutral humanist body. Space Grotesk carries the heroic, HUD-like voice for headings and stat callouts; Noto Sans stays quiet and highly legible for reading, with broad multilingual coverage for EN/FR. The pairing contrasts on the humanist/geometric axis, so the two never blur together.

### Hierarchy
- **Display** (Bold 700, 48px, 50px line-height): Hero and logo moments only, e.g. a boss name or level-up screen.
- **Headline** (Bold 700, 32px, 40px line-height): Screen titles.
- **Title** (Bold 700, 24px, 32px line-height): Section and card headings.
- **Body** (Regular 400, 16px, 24px line-height): Reading text and descriptions. Cap long prose around 65–75 characters per line.
- **Label** (Bold 700, 14px, letter-spacing 4px, often uppercase): Widely tracked HUD-style labels, stat tags, eyebrow-style meta. This is where the tracked-caps treatment belongs; keep it out of body copy.

### Named Rules
**The Tracked-Caps-Are-Labels Rule.** The wide 4px tracking is a label device, not a heading device. Use it for small HUD labels and stat chips; never stretch it across a paragraph or a long title.

## 4. Elevation

Bati uses two distinct depth strategies, chosen by whether a surface is acted on or looked through. Interactive surfaces (buttons, cards, chips) use a **hard sticker shadow**: a zero-blur, offset shadow in near-black, which stamps the element crisply onto the void. Atmospheric surfaces use **glass and glow**: translucent glass backgrounds with a thin light border, plus a colored halo under the primary action. There is no soft, diffuse Material drop-shadow anywhere; depth is either a hard stamp or a light glow.

### Shadow Vocabulary
- **Sticker shadow** (`shadowColor: #060812; shadowRadius: 0; shadowOffset: {0, 6}`): Cards and raised interactive surfaces. Hard-edged, no blur.
- **Primary glow** (`shadowColor: rgba(13,51,242,0.45)`): The halo under the single primary action, signaling it's "powered on".

### Named Rules
**The Hard-or-Glow Rule.** Depth is a hard offset stamp on things you touch, or a colored glow on the one thing you should touch. Never a soft grey blur; that reads as generic Material and breaks the HUD world.

## 5. Components

### Buttons
- **Shape:** Rounded rectangle at token `$8` (`rounded.md`); pressable icon buttons are full circles (44×44).
- **Primary:** Electric Blue background, deep-void text (#0B0F19), a heavy 3px off-white border (`$color`), weight 900 at 20px. Full-width by default.
- **Secondary:** Magenta background, white text, same border and weight.
- **Outline:** Overlay/transparent background, off-white text and border.
- **Press:** `opacity 0.9, scale 0.98` via the `quick` spring; no hover state on native.
- **Icon button:** 44×44 circle, raised surface background, same 3px border, honoring the 44pt minimum tap target.

### Chips / Tags
- **Style:** Tone-driven background (default surface, or primary/secondary/success), off-white or void text depending on tone, 3px-family border in `$color`.
- **State:** Pressable chips use pill radius (`$10`), a 2px border, and enforce a 44px min height; static tags use `$4` radius, 1px border, and sit at 0.92 opacity to read as passive.

### Cards / Containers
- **Corner Style:** `$8` (`rounded.md`).
- **Background:** Surface (#101322).
- **Shadow Strategy:** Hard sticker shadow (see Elevation), offset {0, 6}, zero blur, in near-black.
- **Border:** Heavy 3px in off-white `$color`.
- **Internal Padding:** `$4`.
- **Glass variant:** For atmospheric panels, swap to `glass-bg` with the thin `glass-border` and drop the hard shadow.

### Navigation
- **Style:** Bottom tab bar (Expo Router `(tabs)`), dark surface over the void, Space Grotesk labels. Active tab carries the Electric Blue signal plus an icon; inactive tabs use Text Secondary. State is never color-only, the active icon shape reinforces it.

### Icons (Signature)
- **GameIcon**: All iconography flows through the `useGameIcon` hook / `GameIcon` component sourcing game-icons.net white SVGs, sized in px and tinted with tokens (e.g. `$primary`). Never import from `lucide-react-native` directly; the custom set is what makes the world feel like a game HUD.

## 6. Do's and Don'ts

### Do:
- **Do** reserve Electric Blue (#0D33F2) for a single primary action per screen; back it with Primary Glow when it's the hero action.
- **Do** keep everything dark: The Void (#0B0F19) is the only body background. Assume dark mode always.
- **Do** use Tamagui tokens (`p="$4"`, `bg="$bgDark"`, `color="$text"`) instead of hex codes or inline styles.
- **Do** route every icon through `@/hooks/useGameIcon` / `GameIcon`.
- **Do** pair every state (success, error, resource, active tab) with an icon or label so meaning never depends on color alone.
- **Do** use the hard sticker shadow (zero blur, offset) on interactive surfaces and glass only on atmospheric panels.
- **Do** keep tap targets at 44pt minimum and honor reduced-motion with a calmer or instant alternative to the spring animations.
- **Do** wrap all user-facing text in `t()` (i18next, EN/FR).

### Don't:
- **Don't** build a light theme or write `colorScheme === 'light' ? … : …`. There is no light mode.
- **Don't** turn Bati into a cluttered, stat-heavy gym app: charts and numbers must never bury the next action.
- **Don't** make it cartoonish: no bright mascots, no candy palette, no bouncy-everything.
- **Don't** go corporate or clinical: no flat white dashboards, no health-app sterility.
- **Don't** use soft grey Material drop-shadows; depth is a hard stamp or a colored glow.
- **Don't** borrow a resource hue (gold, wood, stone, fire, water, wind, grain) for decoration.
- **Don't** import icons from `lucide-react-native` directly or hardcode hex colors and inline styles.
- **Don't** stretch the 4px tracked-caps label treatment across body copy or long titles.
