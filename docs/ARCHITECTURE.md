# Technical Architecture

## Overview

Bati is built with a focus on simplicity, performance, and offline-first functionality. This document outlines the technical stack and architectural decisions.

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
| ----- | ---------- | ------- |
| **Framework** | React Native + Expo | Cross-platform mobile |
| **UI Library** | Tamagui | Performant styled components |
| **Navigation** | Expo Router | File-based routing |
| **State** | Zustand | Lightweight state management |
| **Database** | SQLite + Drizzle ORM | Offline-first local storage |
| **Localization** | i18next | Multi-language support |
| **Testing** | Vitest | Unit & integration tests |

---

## 📁 Project Structure

```text
batiV3/
├── app/                    # Expo Router screens
│   ├── _layout.tsx         # Root layout
│   ├── (tabs)/             # Tab navigation
│   │   ├── index.tsx       # Home tab
│   │   ├── quests.tsx      # Quests tab
│   │   └── adventures.tsx  # Adventures tab
│   ├── exercises/          # Exercise routes
│   ├── onboarding/         # Onboarding flow
│   └── session.tsx         # Active workout screen
│
├── components/             # Reusable UI components
│   ├── common/             # Shared components
│   ├── session/            # Session-specific components
│   ├── journal/            # History/stats components
│   └── QuestCarousel/      # Quest browsing
│
├── db/                     # Database layer
│   ├── schema.ts           # Drizzle schema definitions
│   ├── client.ts           # Database client setup
│   ├── quests.ts           # Quest queries
│   ├── adventures.ts       # Adventure queries
│   ├── completed.ts        # Completed session queries
│   ├── exercises.ts        # Exercise queries
│   └── xp.ts               # XP calculations
│
├── stores/                 # Zustand stores
│   ├── session.ts          # Active session state
│   ├── settings.ts         # User preferences
│   ├── theme.ts            # Theme state
│   └── user.ts             # User data
│
├── constants/              # Static values
│   ├── exerciseColors.ts   # Color mappings
│   └── avatars.ts          # Avatar options
│
├── hooks/                  # Custom React hooks
│   └── useSessionTimer.ts  # Timer logic
│
├── locales/                # Translation files
│   ├── en.json             # English
│   └── fr.json             # French
│
├── drizzle/                # Database migrations
│   ├── 0000_*.sql          # Migration files
│   └── migrations.js       # Migration runner
│
├── docs/                   # Documentation
│   ├── VISION.md           # Product vision
│   ├── QUESTS.md           # Quest system
│   └── ...                 # Other docs
│
└── __tests__/              # Test files
    ├── db-*.test.ts        # Database tests
    └── helpers/            # Test utilities
```

---

## 💾 Database Architecture

### SQLite + Drizzle ORM

**Why SQLite?**

- Offline-first (no network required)
- Fast local queries
- Reliable and battle-tested
- Easy to backup/restore

**Why Drizzle?**

- Type-safe queries
- Lightweight (no runtime overhead)
- SQL-like syntax
- Easy migrations

### Core Tables

```sql
-- Exercises (workout building blocks)
exercises
├── id, enName, frName, description
├── difficulty, equipment, imagePath
└── creator, timestamps

-- Quests (workout templates)
quests
├── id, enTitle, frTitle, description
├── rounds, restSeconds, author
└── timestamps

-- Quest exercises (junction)
quest_exercises
├── questId, exerciseId, sortOrder
├── targetType, targetMin, targetMax
└── imagesJson

-- Adventures (multi-quest campaigns)
adventures
├── id, questId (cover), title, description
├── kind, author, sortOrder, isActive
└── timestamps

-- Adventure steps
adventure_steps
├── adventureId, stepIndex, questId
├── narrative (localized)
└── timestamps

-- Completed sessions (history)
completed_sessions
├── questId, performedAt, durationSeconds
├── userLevel, xp
└── timestamps

-- Completed exercises (detail)
completed_exercises
├── sessionId, exerciseId, roundIndex
├── resultValue
└── timestamps
```

### Relationships

```text
exercises ─┬──< exercise_muscles
           └──< quest_exercises >──┬── quests
                                   │
adventures ──< adventure_steps >───┘
           │
           └──< adventure_runs ──< adventure_run_steps

completed_sessions ──< completed_exercises
```

---

## 🔄 State Management

### Zustand Stores

**Session Store** (session.ts)

```typescript
interface SessionState {
  quest: Quest | null;
  status: 'idle' | 'running' | 'resting' | 'paused' | 'finished';
  currentRoundIndex: number;
  currentExerciseIndex: number;
  startTime: number | null;
  totalPausedTime: number;
  exerciseResults: ExerciseResult[];

  // Actions
  startSession: (quest: Quest) => void;
  pauseSession: () => void;
  resumeSession: () => void;
  completeExercise: (result: number) => void;
  finishSession: () => Promise<void>;
}
```

**Settings Store** (settings.ts)

```typescript
interface SettingsState {
  difficulty: DifficultyCode;
  language: 'en' | 'fr';
  soundEnabled: boolean;
  hapticEnabled: boolean;

  setDifficulty: (d: DifficultyCode) => void;
  setLanguage: (l: 'en' | 'fr') => void;
}
```

### Data Flow

```text
User Action
    │
    ▼
Component ──▶ Zustand Store ──▶ SQLite (persist)
    │              │
    │              ▼
    └────────── Re-render
```

---

## 🌍 Localization

### i18next Setup

```typescript
// i18n.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

i18n.use(initReactI18next).init({
  resources: { en, fr },
  lng: 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});
```

### Usage

```tsx
// In components
const { t } = useTranslation();
return <Text>{t('quest.start')}</Text>;

// In locales/en.json
{
  "quest": {
    "start": "Start Quest",
    "complete": "Quest Complete!"
  }
}
```

### Database Content

Content is stored with both languages:

```typescript
// Quest with localized fields
{
  enTitle: "Iron Arms Challenge",
  frTitle: "Défi Bras de Fer",
  enDescription: "Build legendary arm strength",
  frDescription: "Développez une force légendaire dans vos bras"
}
```

---

## 🧪 Testing Strategy

### Test Types

| Type | Location | Purpose |
| ---- | -------- | ------- |
| **Unit** | `__tests__/*.test.ts` | Individual functions |
| **Integration** | `__tests__/db-*.test.ts` | Database operations |
| **Component** | (Future) | UI components |
| **E2E** | (Future) | Full user flows |

### Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- db-quests.test.ts

# Watch mode
npm test -- --watch
```

### Test Database

```typescript
// __tests__/helpers/testDb.ts
export function createTestDatabase() {
  // Creates in-memory SQLite for testing
}
```

---

## ⚡ Performance Considerations

### Image Optimization

- Use WebP format when possible
- Lazy load images outside viewport
- Cache exercise GIFs/images locally

### Database Queries

- Use indexes for frequent queries
- Batch inserts for migrations
- Limit result sets for lists

### React Rendering

- Memoize expensive computations
- Use `useMemo`/`useCallback` appropriately
- Virtualize long lists (FlatList)

### Bundle Size

- Tree-shake unused code
- Lazy load heavy screens
- Monitor with `expo export --dump-sourcemap`

---

## 🔐 Security & Privacy

### Data Storage

- All data stored locally on device
- No cloud sync by default
- No analytics/tracking (by default)

### User Data

- Minimal data collection
- No account required
- Export/delete data easily

### Future Cloud Sync

If implemented:

- End-to-end encryption
- User-controlled sync
- Clear privacy policy

---

## 🚀 Build & Deploy

### Development

```bash
# Start dev server
npx expo start

# Run on Android
npx expo run:android

# Run on iOS
npx expo run:ios
```

### Production Build

```bash
# Build for Android
eas build --platform android

# Build for iOS
eas build --platform ios
```

### Environment Variables

```bash
# .env (development)
EXPO_PUBLIC_ENV=development
EXPO_PUBLIC_DEBUG=true

# .env.production
EXPO_PUBLIC_ENV=production
EXPO_PUBLIC_DEBUG=false
```

---

## 📚 Key Dependencies

| Package | Version | Purpose |
| ------- | ------- | ------- |
| `expo` | ~52.x | Core framework |
| `react-native` | 0.76.x | Mobile runtime |
| `tamagui` | ^1.x | UI components |
| `drizzle-orm` | ^0.30.x | Database ORM |
| `i18next` | ^23.x | Localization |
| `zustand` | ^4.x | State management |
| `expo-sqlite` | ~14.x | SQLite access |
