# AGENTS.md

## Project overview

Bati is a dark-fantasy fitness RPG built with Expo + React Native + Tamagui, using
SQLite + Drizzle for offline-first persistence and Expo Router for navigation.

## Working rules

- Treat the app as **dark-mode only**.
- Prefer Tamagui tokens over hardcoded hex values or inline styles.
- Use the project icon hook instead of importing icons directly.
- Follow [`docs/architecture/performance.md`](docs/architecture/performance.md) for RN
  performance rules (Zustand selectors, list virtualization, Reanimated, images).
- Keep changes small, testable, and aligned with the existing architecture.
- When you touch durable product or technical knowledge, update the docs wiki too.

## Setup

- Install dependencies: `npm install`
- Start the app: `npm start`
- Android: `npm run android`
- iOS: `npm run ios`
- Web: `npm run web`

## Checks

- Type/style check: `npm run check`
- Formatting: `npm run format`
- Tests: `npm test`
- Watch tests: `npm run test:watch`

Run the relevant checks before finishing a change. If you move files or change imports,
run the type/style check again.

## Database commands

- Generate Drizzle output: `npm run db:generate`
- Push the schema: `npm run db:push`

## Docs conventions

- Root docs entry: [`docs/README.md`](docs/README.md)
- Wiki protocol: [`docs/meta/wiki-protocol.md`](docs/meta/wiki-protocol.md)
- Docs contribution guide: [`docs/CONTRIBUTING.md`](docs/CONTRIBUTING.md)

For durable knowledge, keep the docs aligned with the external source-of-truth wiki
under `../proj/wiki/projets/` when it exists.

## Shell usage

- Prefer the repo helper wrapper `rtk` for shell commands when available.
- Read before writing: inspect the relevant file(s) before editing.
- If a command fails because of the environment, stop and diagnose rather than guessing.
