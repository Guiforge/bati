# GitHub Copilot Custom Instructions for Bati

> This file provides context and best practices for AI assistants working on this codebase.

---

## 🏰 Project Overview

**Bati** is a mobile fitness app that transforms workouts into an epic fantasy RPG adventure. Users complete workout "quests" to build their fantasy village, fight bosses, and earn rewards.

### Core Philosophy

- 🎮 **Simple, Fun, Addictive** — Minimal choices, maximum engagement
- 📴 **Offline-First** — Works anywhere, no internet required
- 🏋️ **Sport-Focused** — The workout is the core, RPG elements enhance motivation
- ⚔️ **Fantasy RPG Rewards** — Build your village, fight bosses, earn loot

> "Train like a hero, build like a king."

---

## 🛠️ Tech Stack

| Layer            | Technology              | Purpose                        |
| ---------------- | ----------------------- | ------------------------------ |
| **Framework**    | React Native + Expo SDK | Cross-platform mobile          |
| **UI Library**   | Tamagui                 | Performant styled components   |
| **Navigation**   | Expo Router             | File-based routing             |
| **State**        | Zustand                 | Lightweight state management   |
| **Database**     | SQLite + Drizzle ORM    | Offline-first local storage    |
| **Localization** | i18next                 | Multi-language support (EN/FR) |
| **Testing**      | Jest + jest-expo        | Unit & integration tests       |
| **Linting**      | Biome                   | Fast linter & formatter        |

---

## 📁 Project Structure

```text
batiV3/
├── app/                    # Expo Router screens (file-based routing)
│   ├── _layout.tsx         # Root layout with theme provider
│   ├── (tabs)/             # Tab navigation group
│   ├── exercises/          # Exercise detail routes
│   ├── onboarding/         # Onboarding flow
│   ├── session.tsx         # Active workout screen
│   └── dev.tsx             # Dev tools (DEV only)
├── components/             # Reusable UI components
│   ├── common/             # Shared components (AppButton, Card, etc.)
│   ├── session/            # Session-specific (ActiveExerciseView, RestView, etc.)
│   ├── journal/            # History/stats components
│   └── QuestCarousel/      # Quest browsing
├── db/                     # Database layer (Drizzle ORM)
│   ├── schema.ts           # Table definitions
│   ├── client.ts           # Database client & migrations
│   ├── quests.ts           # Quest queries
│   ├── adventures.ts       # Adventure queries
│   ├── completed.ts        # Completed session queries
│   ├── bossFights.ts       # Boss fight mechanics
│   └── xp.ts               # XP calculations
├── stores/                 # Zustand stores
│   ├── session.ts          # Active session state
│   ├── settings.ts         # User preferences (theme, language, avatar)
│   └── user.ts             # User data (onboarding, village name)
├── constants/              # Static values
│   ├── exerciseColors.ts   # Muscle → color mappings
│   └── avatars.ts          # Avatar options
├── hooks/                  # Custom React hooks
├── locales/                # Translation files (en.json, fr.json)
├── drizzle/                # Database migrations (SQL files)
└── __tests__/              # Test files
```

---

## 🎨 Visual Design System

> **Note**: Refer to [docs/UI_CHECKLIST.md](../docs/UI_CHECKLIST.md) for detailed UI/UX best practices and component checklists.

### Style: Franco-Belgian Comic Book (Bande Dessinée)

- Thick, bold black outlines (3px borders on buttons/cards)
- Saturated, vibrant colors
- Expressive, whimsical fantasy atmosphere
- Inspiration: Asterix, Wakfu, Dragon Quest

### Color Tokens (Tamagui)

| Token         | Usage                             |
| ------------- | --------------------------------- |
| `$primary`    | CTAs, highlights (orange #FF6B35) |
| `$secondary`  | Secondary actions (teal #4ECDC4)  |
| `$background` | Page background                   |
| `$bgLight`    | Card backgrounds                  |
| `$color`      | Primary text                      |

### Pastel Colors (Exercise Categories)

| Muscle    | Token           | Hex     |
| --------- | --------------- | ------- |
| Arms      | `$pastelPink`   | #FFB3BA |
| Back      | `$pastelBlue`   | #BAE1FF |
| Chest     | `$pastelYellow` | #FFFFBA |
| Abs       | `$pastelGreen`  | #BAFFC9 |
| Shoulders | `$pastelPurple` | #D4BAFF |
| Legs      | `$pastelOrange` | #FFF0E5 |

### Component Patterns

```tsx
// Use Tamagui primitives
import { Button, Text, XStack, YStack, Card } from "tamagui";

// Border pattern for buttons
<Button
  bg="$primary"
  borderWidth={3}
  borderColor="$color"
  rounded="$6"
  pressStyle={{ opacity: 0.9, scale: 0.98 }}
>

// Card pattern
<Card bg="$bgLight" p="$4" rounded="$6" borderWidth={3} borderColor="$color">
```

---

## 📱 React Native Best Practices

### Performance

1. **Use `memo` sparingly** — Only when profiling shows re-render issues
2. **Avoid inline functions in lists** — Extract to `useCallback`
3. **Use FlashList** — For long lists (via `@legendapp/list`)
4. **Minimize state updates** — Batch when possible

### Layout

1. **Use YStack/XStack** — Tamagui's flexbox primitives
2. **Safe Areas** — Always wrap with `useSafeAreaInsets()`
3. **Thumb Zones** — Primary actions at bottom of screen (green zone)
4. **Responsive** — Use `useWindowDimensions()` for dynamic layouts

### Animation

```tsx
// Use Tamagui animations
import { AnimatePresence } from "tamagui";

// Entrance animations
<YStack animation="quick" enterStyle={{ opacity: 0, y: 20 }}>
```

### Haptics

```tsx
import * as Haptics from "expo-haptics";

// For button presses
Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

// For success
Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
```

---

## 💾 Database Patterns

### Drizzle ORM

```typescript
// Schema definition (db/schema.ts)
export const exercises = sqliteTable("exercises", {
  id: int().primaryKey({ autoIncrement: true }),
  enName: text().notNull(),
  frName: text().notNull(),
  // ...
});

// Queries (db/exercises.ts)
import { db, schema } from "./client";
import { eq } from "drizzle-orm";

export async function getExerciseById(id: number) {
  const rows = await db
    .select()
    .from(schema.exercises)
    .where(eq(schema.exercises.id, id))
    .limit(1);
  return rows[0] ?? null;
}
```

### Migrations

- Files in `drizzle/` folder: `0000_name.sql`, `0001_name.sql`, etc.
- Must update `drizzle/migrations.js` and `drizzle/meta/_journal.json`
- Run tests after adding migrations

---

## 🔄 State Management (Zustand)

### Store Pattern

```typescript
// stores/session.ts
import { create } from "zustand";

interface SessionState {
  quest: Quest | null;
  status: SessionStatus;
  // ... state

  // Actions
  startSession: (quest: Quest) => void;
  pauseSession: () => void;
}

export const useSessionStore = create<SessionState>((set, get) => ({
  quest: null,
  status: "idle",

  startSession: (quest) => set({ quest, status: "running" }),
  pauseSession: () => set({ status: "paused" }),
}));
```

### Persisted Settings

```typescript
// Settings store persists to SQLite via db/preferences.ts
const { theme, setTheme } = useSettingsStore();
// setTheme updates both Zustand state AND database
```

---

## 🌍 Localization

### Translation Keys

```typescript
import { useTranslation } from "react-i18next";

function MyComponent() {
  const { t } = useTranslation();
  return <Text>{t("session.victory_title")}</Text>;
}
```

### Key Naming Convention

```json
{
  "session": {
    "victory_title": "Quest Complete!",
    "feedback_easy": "Too Easy",
    "feedback_good": "Just Right",
    "feedback_hard": "Challenging"
  },
  "boss": {
    "hp_bar_title": "Boss HP",
    "enraged": "ENRAGED!"
  }
}
```

### Always add both languages

- `locales/en.json` (English)
- `locales/fr.json` (French)

---

## ✅ Testing

### Test Files

- Located in `__tests__/` folder
- Naming: `*.test.ts` or `*.test.tsx`
- Run: `npm test`

### Test Patterns

```typescript
// Database tests
import { db, schema, runMigrations } from "@/db/client";

beforeAll(async () => {
  await runMigrations();
});

afterAll(() => {
  db.close();
});

test("should create exercise", async () => {
  const result = await createExercise({ ... });
  expect(result.id).toBeDefined();
});
```

---

## 🎮 Domain Concepts

### Quest

A workout template with exercises, rounds, and rest periods.

### Adventure

A multi-quest campaign (like a story arc). Can be:

- `kind: "campaign"` — Sequential quests with narrative
- `kind: "boss"` — Boss fight with HP system

### Boss Fight

Epic workout challenge with:

- HP bar that decreases as you complete exercises
- Weakness/resistance muscles (bonus/penalty damage)
- Critical hits when exceeding targets
- Enraged state at low HP

### Session

An active workout in progress:

- States: `idle` → `countdown` → `running` ↔ `resting` ↔ `paused` → `finished`
- Tracks completed exercises, time, XP earned

### Resources (Future)

| Resource | Muscle    | Building      |
| -------- | --------- | ------------- |
| Wood     | Arms      | Archery Range |
| Stone    | Back      | Castle Walls  |
| Fire     | Chest     | Blacksmith    |
| Water    | Abs       | Well          |
| Wind     | Shoulders | Windmill      |
| Grain    | Legs      | Farm          |

---

## 🚫 Code Anti-Patterns to Avoid

1. **No inline styles in components** — Use Tamagui tokens
2. **No hardcoded strings** — Use i18n keys
3. **No `any` types** — Use proper TypeScript types
4. **No direct SQL** — Use Drizzle ORM
5. **No console.log in production** — Use `__DEV__` check
6. **No blocking main thread** — Use async/await properly

---

## ✨ Code Style

### Formatting (Biome)

- Run `npm run format` before committing
- No semicolons (except required)
- Double quotes for strings
- Tabs for indentation

### Naming Conventions

| Type         | Convention                    | Example                         |
| ------------ | ----------------------------- | ------------------------------- |
| Components   | PascalCase                    | `QuestCard.tsx`                 |
| Hooks        | camelCase with `use` prefix   | `useSessionTimer.ts`            |
| Stores       | camelCase with `Store` suffix | `useSessionStore`               |
| DB functions | camelCase, action prefix      | `getQuestById`, `createSession` |
| Constants    | SCREAMING_SNAKE_CASE          | `MAX_ROUNDS`                    |
| Types        | PascalCase                    | `SessionStatus`, `Quest`        |

### Import Order

```typescript
// 1. External packages
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Button, Text, YStack } from "tamagui";

// 2. Internal aliases (@/)
import { AppButton } from "@/components/common/AppButton";
import { useSessionStore } from "@/stores/session";
import type { Quest } from "@/db/quests";
```

---

## 🔧 Common Tasks

### Adding a new screen

1. Create file in `app/` folder (file-based routing)
2. Use `Stack.Screen` for header options
3. Wrap content with safe area handling

### Adding a new database table

1. Define in `db/schema.ts`
2. Create migration in `drizzle/XXXX_name.sql`
3. Update `drizzle/migrations.js` and `_journal.json`
4. Create query functions in `db/tablename.ts`
5. Run tests to verify

### Adding a new component

1. Create in appropriate `components/` subfolder
2. Use Tamagui primitives (YStack, XStack, Text, Button)
3. Apply design tokens ($primary, $bgLight, etc.)
4. Add 3px borders for comic book style

### Adding localization

1. Add key to both `locales/en.json` and `locales/fr.json`
2. Use `t("key.path")` in component
3. Run i18n tests: `npm test -- i18n`

---

## 📋 Checklist for Code Changes

- [ ] TypeScript compiles: `npx tsc --noEmit`
- [ ] Tests pass: `npm test`
- [ ] Biome lint: `npx biome check`
- [ ] Localization complete (EN + FR)
- [ ] Theme consistent (light + dark)
- [ ] Safe areas respected
- [ ] Haptic feedback where appropriate
- [ ] No hardcoded strings
