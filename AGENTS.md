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
- Dead code: `npm run knip`

Run the relevant checks before finishing a change. If you move files or change imports,
run the type/style check again.

## Quality rules

Every rule below is a bug that shipped past a fully green `tsc` + `biome` + test suite.
The full account is in [`audit.md`](audit.md); these are the habits that come out of it.

- **Prefer a type over a test.** When a bug is "we forgot to update the other place", make the
  two places inseparable instead of testing that they agree — `SavedSessionState` is
  `Pick<SessionState, …>`, so persisting a new field is a compile error until both sides
  match. A type costs nothing to run and cannot rot.
- **Assert state, not navigation.** A test that taps through a flow and checks the next screen
  appeared passes while the data underneath is wrong. `.maestro/session-interruptions.yaml`
  performed two boss-damage bugs and passed, because it only asserted that the UI came back.
- **Test the path the app actually calls.** Coverage counts dead code as covered:
  `saveSessionState()` had five tests and no callers, which is exactly how its payload drifted
  from the real writer's without anyone noticing. Run `npm run knip` before trusting a green bar.
- **One writer per piece of state.** Two functions serialising the same thing will diverge.
- **One source per value.** A `language === "fr" ? …` copied fourteen times gets forgotten the
  fifteenth — use `localizedTitle()`. Colours live in `constants/rawColors.ts` and nowhere else;
  a lint plugin rejects raw hex everywhere but that file.
- **Never write game state before the thing that earned it exists.** Boss damage written during
  a session survived quitting and was double-counted when a round restarted. Bank it in memory,
  commit it in `saveSession`.
- **A silent `catch` is a bug you find weeks late.** Use `reportError(context, error)`. If the
  silence is deliberate — a dismissed share sheet is not a failure — write down why; an empty
  block is a lint error.
- **Coverage thresholds sit just under actual**, so they catch deletion. They are a ratchet,
  not a target: raise them when coverage rises, never lower them to make a build pass.
- **Mark a deliberate shortcut with a `ponytail:` comment** naming its ceiling and what would
  trigger the real fix. "Refactor planned" tells the next reader nothing.

### Known debt

- `db/index.ts` is excluded from `knip` because it re-exports ~60 symbols of which a third are
  used. Worth trimming to what callers actually import, then removing the exclusion.
- `components/session/SessionRecoveryCard.tsx` is not mounted anywhere: crash recovery works
  end to end but has no way into the UI.

## Git hooks

Managed by [prek](https://github.com/j178/prek) via [`.pre-commit-config.yaml`](.pre-commit-config.yaml).
`npm install` runs `prek install`, which writes the shims into `.git/hooks`.

- **pre-commit**: file hygiene, `gitleaks` secret scan, `biome check --write` on staged
  files, `tsc --noEmit` when a `.ts`/`.tsx` is staged.
- **pre-push**: `npm test`.

- Run everything by hand: `npx prek run --all-files`
- Skip once: `git commit --no-verify`
- Coming from the old husky setup? Run `git config --unset core.hooksPath` once.

Unlike lint-staged, prek does not re-stage files it rewrote: the commit fails with
"files were modified by this hook", so `git add` the fixes and commit again.

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
