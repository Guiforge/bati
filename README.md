# Bati

> Train like a hero, build like a king.

Bati is a dark-fantasy fitness RPG built with **Expo + React Native + Tamagui**.
Workouts drive progression; the app turns your training into quests, adventures, stats,
and a village that reflects your effort.

## What this repo is

- **Mobile app** with file-based routing (`app/`)
- **Offline-first** data layer with SQLite + Drizzle
- **Dark-only UI** using Tamagui tokens and a custom game-icon hook
- **Docs wiki** under `docs/` for durable product, design, and implementation knowledge

## Quick start

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npm start
   ```

3. Run the main checks

   ```bash
   npm run check
   npm test
   ```

## Useful scripts

- `npm start` — Expo dev server
- `npm run android` — run on Android
- `npm run ios` — run on iOS
- `npm run web` — web preview
- `npm run check` — Biome + TypeScript
- `npm run format` — format with Biome
- `npm test` — Jest test suite
- `npm run db:generate` — generate Drizzle migrations/types
- `npm run db:push` — push schema to local SQLite target

## Project layout

- `app/` — Expo Router screens and navigation
- `components/` — reusable UI components
- `db/` — SQLite / Drizzle domain logic
- `hooks/` — shared hooks
- `stores/` — Zustand state
- `constants/` — game design constants
- `docs/` — living documentation and wiki
- `scripts/` — helper scripts

## Documentation

- Start at [`docs/README.md`](docs/README.md)
- Wiki protocol: [`docs/meta/wiki-protocol.md`](docs/meta/wiki-protocol.md)
- Repo docs conventions: [`docs/CONTRIBUTING.md`](docs/CONTRIBUTING.md)

## Notes for contributors

- Keep the app dark-mode only.
- Prefer Tamagui tokens over hex values.
- Use the project’s icon hook instead of direct icon imports.
- Keep docs in sync when product or architecture decisions change.
