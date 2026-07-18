# GitHub Copilot Custom Instructions for Bati

> **Context**: You are an AI assistant working on "Bati", a React Native fitness RPG app. Your goal is to generate code that adheres to the specific architecture, design system, and patterns defined below.

---

## 🏰 Project Overview

**Bati** is a mobile fitness app that transforms workouts into an epic fantasy RPG adventure.

### Core Philosophy

- **Dark Mode Only**: The app is immersive. There is NO light theme.
- **Offline-First**: Local SQLite database.
- **Sport-Focused**: Workout logic comes first, RPG elements enhance motivation.
- **Visual Style**: Dark Fantasy / High-Tech HUD.

---

## 🛠️ Tech Stack & Architecture

- **Framework**: React Native + Expo SDK
- **UI**: Tamagui (Styled components, Tokens)
- **Router**: Expo Router (File-based)
- **State**: Zustand
- **DB**: SQLite + Drizzle ORM
- **i18n**: i18next (EN/FR)

---

## 🎨 Visual Design System (Crucial)

**Style**: Dark Immersive. Deep blue backgrounds, electric blue accents, glowing effects.

### Component Patterns

Always use Tamagui primitives (`YStack`, `XStack`, `Text`, `Button`).

**1. Buttons & Cards (The RPG Look)**

- **Glows**: Primary actions must have a shadow/glow (`shadowColor="$primaryGlow"`).
- **Glassmorphism**: Cards use `$glassBg` with a thin border.
- **Rounding**: Generally `$4` (16px) for cards, `$full` for main buttons.

```tsx
// Example Glass Card
<YStack
  bg="$glassBg"
  borderColor="$borderStrong"
  borderWidth={1}
  p="$4"
  borderRadius="$4"
>
  {/* content */}
</YStack>
```

### Color Tokens (Tamagui)

**Strict Rule**: Do not use hex codes directly. Use these tokens:

| Token            | Usage                                    |
| :--------------- | :--------------------------------------- |
| `$bgDark`        | **Main Background** (Deep Obsidian)      |
| `$primary`       | **Main Actions** (Electric Blue #0D33F2) |
| `$glassBg`       | **Card Backgrounds** (Semi-transparent)  |
| `$text`          | **Primary Text** (Off-white)             |
| `$textSecondary` | **Subtitles** (Muted Blue-Grey)          |

### Icons (Custom Hook)

**Strict Rule**: Do not import icons from `lucide-react-native` directly. You must use the project's custom hook.

```typescript
import { useGameIcon } from "@/hooks/useGameIcon";

// Inside component:
const { GameIcon } = useGameIcon();
<GameIcon name="sword" size={24} color="$primary" />;
```

---

## 🚫 Anti-Patterns (Do Not Do This)

1.  **No Light Theme logic**: Do not write `colorScheme === 'light' ? ... : ...`. Assume dark mode always.
2.  **No inline styles**: Use Tamagui props (`p="$4"`, `bg="$bgDark"`).
3.  **No hardcoded text**: Always use `t()`.
4.  **No direct Icon imports**: Use `@/hooks/useGameIcon`.

---

## 🎮 Domain Glossary

- **Quest**: A workout template (exercises + rounds).
- **Boss Fight**: A workout where exercise reps deal damage to a Boss HP bar.
- **Resources**: Wood, Stone, etc., earned by working specific muscles.

---

## ✨ Code Style

- **Formatting**: Biome (double quotes).
- **Naming**: `PascalCase` for Components.
- **Imports**: External imports first, then internal alias (`@/`) imports.

---

## 📚 Documentation (LLM Wiki)

The `docs/` folder is maintained as a **Karpathy-style LLM wiki**. When you add or change
durable knowledge (decisions, patterns, features, gotchas), follow the protocol in
[`docs/WIKI.md`](../docs/WIKI.md):

1. Update the right page (or create one in the correct category).
2. Fix cross-links; keep the catalog [`docs/README.md`](../docs/README.md) accurate.
3. Append an entry to [`docs/log.md`](../docs/log.md).

Read `docs/README.md` first to locate relevant pages; cite them with `[Text](FILE.md)`.
Ground every claim in the codebase or `docs/raw/` — never invent.

