---
title: Technical Architecture
type: technical
status: active
updated: 2026-07-18
related: [README.md, database-api.md, ../meta/wiki-protocol.md]
sources: [package.json, app, components, db, stores, hooks, src, __tests__]
---

# Technical Architecture

## Summary

Bati is an Expo + React Native app with file-based routing, Tamagui UI, Zustand state, and
SQLite/Drizzle persistence. The app is offline-first and dark-only; workout history is the durable
source from which progression systems are derived.

## Tech stack

| Layer | Current package/config | Purpose |
| --- | --- | --- |
| Framework | `expo` `~54.0.30`, React `19.1.0`, React Native `0.81.5` | Mobile app runtime |
| Navigation | `expo-router` `~6.0.21` | File-based routes in `app/` |
| UI | `tamagui` / `@tamagui/*` `^1.142.0` | Tokenized dark UI primitives |
| State | `zustand` `^5.0.9` | Session, settings, and user state |
| Database | `expo-sqlite` `~16.0.10`, `drizzle-orm` `^0.45.1` | Offline-first local persistence |
| Localization | `i18next`, `react-i18next`, `expo-localization` | English/French UI and content |
| Testing | `jest` + `jest-expo` | Unit/integration tests in `__tests__/` |
| Formatting/checks | Biome + TypeScript | `npm run check` |

## Project structure

```text
bati/
├── app/                         # Expo Router screens/navigation
│   ├── _layout.tsx              # Root providers, dark-only theme, onboarding redirect
│   ├── (tabs)/                  # Main tabs
│   │   ├── index.tsx            # Home
│   │   ├── quests/index.tsx     # Quest gallery
│   │   ├── quests/[id].tsx      # Quest details
│   │   ├── adventures/index.tsx # Adventure gallery
│   │   ├── adventures/[id].tsx  # Adventure details
│   │   ├── village.tsx          # Village tab
│   │   └── journal/             # History + session details
│   ├── exercises/[id].tsx       # Exercise details
│   ├── onboarding/              # First-run flow
│   ├── session.tsx              # Active workout
│   ├── goals.tsx                # Goal setup
│   ├── schedule.tsx             # Weekly schedule/rest guidance
│   ├── treasury.tsx             # Passive resource receipt
│   ├── settings.tsx             # Preferences
│   └── credits.tsx              # Attributions
│
├── components/                  # Reusable and screen-specific UI
│   ├── common/
│   ├── home/
│   ├── session/
│   ├── journal/
│   ├── goals/
│   ├── scheduling/
│   └── village/
│
├── db/                          # Drizzle schema + domain APIs
│   ├── schema.ts
│   ├── client.ts
│   ├── quests.ts
│   ├── adventures.ts
│   ├── bossFights.ts
│   ├── completed.ts
│   ├── exercises.ts
│   ├── resources.ts
│   ├── buildings.ts
│   ├── preferences.ts
│   └── index.ts                 # Public DB barrel exports
│
├── stores/                      # Zustand stores
│   ├── session.ts               # Active workout/session persistence flow
│   ├── settings.ts              # Language, avatar, haptics, sound, motion, notifications
│   └── user.ts                  # Onboarding + village name
│
├── hooks/                       # Shared hooks
├── src/                         # Shared UI/i18n helpers
├── constants/                   # Static game/design data
├── locales/                     # en/fr translations
├── drizzle/                     # SQL migrations/seeds
├── docs/                        # LLM wiki / source-of-truth docs
└── __tests__/                   # Jest tests
```

## Architecture decisions

### Dark-only UI

`app/_layout.tsx` forces the product UI into the dark theme. `stores/settings.ts` still persists a
`theme` preference for compatibility/dev tooling, but the runtime product behavior is dark-only.

### Offline-first persistence

SQLite is the local source of truth. Drizzle defines schema and typed queries; domain modules in
`db/` expose focused APIs and are re-exported through `db/index.ts`.

### State ownership

| Store | Owns | Persists through |
| --- | --- | --- |
| `stores/session.ts` | Active quest, timers, exercise results, boss damage, save-session flow | `db/completed.ts`, resources/buildings/streaks/records APIs, session recovery preference |
| `stores/settings.ts` | Language, avatar, sound, haptics, reduced motion, notifications | `db/preferences.ts` |
| `stores/user.ts` | Onboarding completion and village name | `db/preferences.ts` |

### Reward scope

The code has resources and Treasury visibility, but the product source of truth treats them as
passive/read-only MVP feedback. Gold-first spending, shops, and manual building management are Phase
2+ concepts unless re-approved in [roadmap-alignment.md](../planning/roadmap-alignment.md).

## Core data model

| Table | Purpose |
| --- | --- |
| `user_preferences` | Onboarding and settings key/value store |
| `exercises`, `exercise_muscles` | Exercise catalog and muscle mapping |
| `quests`, `quest_exercises` | Workout templates and ordered exercise targets |
| `adventures`, `adventure_steps`, `adventure_runs`, `adventure_run_steps` | Campaign content and run progress |
| `completed_sessions`, `completed_exercises` | Workout history and per-exercise results |
| `boss_fights`, `boss_damage_log` | Boss HP and damage history |
| `resource_inventory`, `resource_transactions` | Passive reward totals/logs |
| `village_buildings`, `village_stats` | Village reward state/cache |
| `goals`, `goal_progress`, `scheduled_sessions` | Planning and scheduling |

## Development commands

| Command | Purpose |
| --- | --- |
| `npm start` | Expo dev server |
| `npm run android` / `npm run ios` / `npm run web` | Platform runs |
| `npm run check` | Biome write/check + TypeScript no-emit |
| `npm test` | Jest suite |
| `npm run db:generate` | Generate Drizzle migrations |
| `npm run db:push` | Push schema to local SQLite target |

## Testing

Tests live in `__tests__/` and use `jest-expo`. Most current coverage is domain/database logic:
quests, adventures, completed sessions, resources, scheduling, goals, achievements, XP, and related
helpers.

## Privacy and data boundaries

- No account is required.
- Workout history and settings are local-first.
- Cloud sync, social features, and analytics are not part of the current architecture.

## Related

- [database-api.md](database-api.md) — DB module reference
- [roadmap-alignment.md](../planning/roadmap-alignment.md) — product scope decisions
- [design-system.md](../design/design-system.md) — dark-only UI and token rules
