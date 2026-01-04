# UI Design Guide

## Overview

This document defines the visual design system for Bati, ensuring consistency across all screens and components.

---

## � UX Principles

> Sport-first, rewarding, guided, fun.

### 1. Many Small Rewards 🎁

Users need constant encouragement. Show progress everywhere:

- ✅ XP pop-up after every exercise
- ✅ Loot reveal on victory screen
- ✅ Building upgrades after sessions
- ✅ Streak flame grows daily
- ✅ Progress bars fill visibly

### 2. Image-First, Less Text 🖼️

Show, don't tell:

- Use exercise illustrations over descriptions
- Quest cards: big image, short title
- **Assets over Icons**: Use rich, custom assets (images) instead of generic icons whenever possible to match the comic book style.
- Icons over labels when assets are not available.
- Village is visual, not a list

### 3. Minimal Animations 🎬

Performance matters. Keep it subtle:

- **DO:** Button feedback (100ms scale)
- **DO:** Progress bar fill (smooth)
- **DO:** Confetti on victory (once)
- **DON'T:** Continuous loops
- **DON'T:** Heavy particle effects
- **DON'T:** Blocking animations

### 4. Guided Flow, Not Choices ➡️

This is a sport app, not a game:

- **One primary action** per screen
- Village builds **automatically** (no picking)
- Quest carousel **pre-filtered** for user
- Difficulty adjusts **based on history**

### 5. Sport Focus 🏋️

RPG enhances motivation, never distracts:

- Timer/reps always **largest** on screen
- Exercise name **front and center**
- RPG elements in **secondary position**
- No interrupting popups during workout

### 6. Collecting & Building 🏰

Village reflects the user's training:

- Muscle → Resource → Building (automatic)
- Visual progression without management
- Loot screen shows what you earned
- Flame/streak is a collectible too

---

## �🎨 Visual Identity

### Style: Franco-Belgian Comic Book (BD)

**Key Characteristics:**

- Thick, bold black outlines
- Saturated, vibrant colors
- Expressive characters with big eyes
- Dynamic poses and action lines
- Whimsical fantasy atmosphere

**Inspiration:**

- Asterix & Obelix
- Spirou & Fantasio
- Wakfu (video game art)
- Dragon Quest (character design)

---

## 🎨 Color Palette

### Primary Colors

| Name | Hex | Usage |
|------|-----|-------|
| **Primary** | `#FF6B35` | CTAs, highlights, active states |
| **Secondary** | `#4ECDC4` | Secondary actions, accents |
| **Background** | `#1A1A2E` | Dark theme background |
| **Surface** | `#16213E` | Cards, panels |
| **Text** | `#FFFFFF` | Primary text |
| **TextMuted** | `#A0A0A0` | Secondary text |

### Pastel Colors (Exercise Categories)

| Muscle | Color | Hex | Token |
|--------|-------|-----|-------|
| Arms | Pink | `#FFB3BA` | `$pastelPink` |
| Back | Blue | `#BAE1FF` | `$pastelBlue` |
| Chest | Yellow | `#FFFFBA` | `$pastelYellow` |
| Abs | Green | `#BAFFC9` | `$pastelGreen` |
| Shoulders | Purple | `#D4BAFF` | `$pastelPurple` |
| Legs | Orange | `#FFD4BA` | `$pastelOrange` |

### Semantic Colors

| Name | Hex | Usage |
|------|-----|-------|
| **Success** | `#4CAF50` | Completed, positive |
| **Warning** | `#FF9800` | Caution, attention |
| **Error** | `#F44336` | Destructive, danger |
| **Info** | `#2196F3` | Information |

---

## 📐 Typography

### Font Families

| Usage | Font | Fallback |
|-------|------|----------|
| **Headlines** | Comic Font (TBD) | System Bold |
| **Body** | System Sans | - |
| **Numbers** | Tabular Figures | Monospace |

### Type Scale

| Token | Size | Weight | Usage |
|-------|------|--------|-------|
| `$heading1` | 32px | Bold | Page titles |
| `$heading2` | 24px | Bold | Section titles |
| `$heading3` | 20px | SemiBold | Card titles |
| `$body` | 16px | Regular | Body text |
| `$caption` | 14px | Regular | Helper text |
| `$small` | 12px | Regular | Labels, timestamps |
| `$giant` | 72px | Bold | Timer, rep counter |

---

## 📏 Spacing

### Base Unit: 4px

| Token | Value | Usage |
|-------|-------|-------|
| `$space1` | 4px | Minimal spacing |
| `$space2` | 8px | Tight spacing |
| `$space3` | 12px | Component padding |
| `$space4` | 16px | Standard spacing |
| `$space5` | 20px | Section spacing |
| `$space6` | 24px | Card padding |
| `$space8` | 32px | Section gaps |
| `$space10` | 40px | Large gaps |

---

## 🔲 Components

### Buttons

#### Primary Button

```
┌─────────────────────────────┐
│     ⚔️ START QUEST          │  Height: 56px
│                             │  Border-radius: 16px
└─────────────────────────────┘  Shadow: Medium
```

#### Secondary Button

```
┌─────────────────────────────┐
│     View Details            │  Height: 44px
│                             │  Border-radius: 12px
└─────────────────────────────┘  Border: 2px
```

#### Icon Button

```
    ┌───┐
    │ ⏸️ │   Size: 44x44px
    └───┘   Border-radius: 12px
```

### Cards

#### Quest Card

```
┌─────────────────────────────────────────┐
│  [🖼️ Image]                             │
│                                         │
│  ⚔️ Quest Title                         │
│  Short description text...              │
│                                         │
│  ⏱️ 20 min   💪 Arms   ⚡ Medium        │
└─────────────────────────────────────────┘
```

- Border-radius: 16px
- Shadow: Light
- Padding: 16px

#### Stats Card

```
┌─────────────────┐
│       42        │
│    Sessions     │
│       📊        │
└─────────────────┘
```

### Progress Bar

```
━━━━━━━━━━━━━━●━━━░░░░░░░░░░
    Filled   Current  Empty
```

- Height: 8px
- Border-radius: 4px
- Filled: Primary color
- Empty: Muted background

---

## 📱 Screen Layouts

### Safe Areas

Always respect device safe areas:

- **Top**: Status bar + notch
- **Bottom**: Home indicator
- **Sides**: Edge swipe zones (Android)

### Thumb Zones

```
┌─────────────────────────────┐
│ ████ RED ZONE ████          │  Hard to reach
├─────────────────────────────┤
│                             │
│      YELLOW ZONE            │  Requires stretch
│                             │
├─────────────────────────────┤
│                             │
│      GREEN ZONE             │  Easy reach
│  [Primary Actions Here]     │
└─────────────────────────────┘
```

**Rules:**

- Primary CTAs → Bottom center (Green Zone)
- Navigation → Bottom bar or gestures
- Settings/Menu → Top (less frequent)

### Standard Screen Structure

```
┌─────────────────────────────┐
│ Header (optional)           │ 56px
├─────────────────────────────┤
│                             │
│                             │
│ Content Area                │ Flex
│ (scrollable if needed)      │
│                             │
│                             │
├─────────────────────────────┤
│ Fixed Actions (optional)    │ 80px
└─────────────────────────────┘
│ Navigation Bar              │ 80px
└─────────────────────────────┘
```

---

## ✨ Animations

### Principles

1. **Fast & Snappy**: 200-300ms for interactions
2. **Natural Easing**: `ease-out` for entrances, `ease-in` for exits
3. **Purposeful**: Every animation has meaning
4. **Non-blocking**: Never delay user actions

### Common Animations

| Animation | Duration | Easing | Usage |
|-----------|----------|--------|-------|
| Button Press | 100ms | ease-out | Scale down 0.95 |
| Card Appear | 300ms | ease-out | Fade + slide up |
| Modal Open | 250ms | ease-out | Scale + fade |
| Progress Fill | 500ms | ease-in-out | Width transition |
| Counter Bump | 200ms | spring | Rep counter |

### Celebration Animations

- **Quest Complete**: Confetti burst (2s)
- **Level Up**: XP bar fill + flash (1s)
- **Achievement**: Banner slide + glow (1.5s)

---

## 🎭 Iconography

### Style

- Line icons with 2px stroke
- Rounded caps and joins
- 24x24px base size

### Custom Fantasy Icons

- ⚔️ Quest/Battle
- 🛡️ Defense/Protection
- 🏰 Village/Home
- 🔥 Flame/Streak
- 🗡️ Attack/Strength
- 🧙 Magic/Special
- 👹 Boss/Enemy
- 🏆 Achievement/Victory

---

## 🌓 Dark Theme

Bati uses a **dark theme by default** (better for workout focus).

### Dark Mode Palette

| Element | Color |
|---------|-------|
| Background | `#1A1A2E` |
| Surface | `#16213E` |
| Card | `#0F3460` |
| Elevated | `#1F4287` |
| Text Primary | `#FFFFFF` |
| Text Secondary | `#A0A0A0` |

### Light Mode (Optional Future)

| Element | Color |
|---------|-------|
| Background | `#F5F5F5` |
| Surface | `#FFFFFF` |
| Card | `#FFFFFF` |
| Text Primary | `#1A1A2E` |
| Text Secondary | `#666666` |

---

## 📱 Touch Targets

**Minimum Sizes:**

- Interactive elements: 44x44pt (iOS) / 48x48dp (Android)
- Spacing between targets: 8px minimum
- Text links: Full line height clickable

---

## ♿ Accessibility

### Color Contrast

- Text on background: Minimum 4.5:1 (WCAG AA)
- Large text: Minimum 3:1
- Interactive elements: Minimum 3:1

### Font Sizes

- Support dynamic type
- Minimum body text: 16px
- Never disable zoom

### Motion

- Respect reduced motion preferences
- Provide alternative for essential animations

---

## 🖼️ Image Guidelines

### Exercise Demonstrations

- Format: WebP or GIF for animations
- Aspect ratio: 1:1 (square)
- Style: Illustrated (not photo)
- Background: Transparent or solid color

### Quest Art

- Aspect ratio: 16:9 for headers
- Style: Comic book illustration
- Include action, energy, movement

### Avatar/Characters

- Aspect ratio: 1:1
- Style: Expressive, friendly
- Multiple poses for different contexts
