# Contributing

Bati is a personal project built largely with AI assistance, so the bar for a change is less
"does it work" and more "will the next reader understand why it is like that". Issues and pull
requests are welcome; so is a plain message to **feedback.bati@proton.me** if opening an issue is
more ceremony than your idea deserves.

For documentation specifically, see [`docs/CONTRIBUTING.md`](docs/CONTRIBUTING.md) — this page is
about code.

## Getting set up

```bash
npm install          # also installs the git hooks via prek
npm start            # Expo dev server
```

The app needs a dev build to run on a device (`npm run android` / `npm run ios`): it uses SQLite,
audio, notifications and an Android home-screen widget, none of which work in Expo Go.

## Before you push

```bash
npm run check        # Biome + TypeScript
npm test             # Jest
npm run knip         # dead code
```

All three run in CI, and the hooks run them on commit and push, so a surprise there means
something is off locally rather than in the pipeline.

`npm run maestro` runs the end-to-end flows against a connected Android device. They are worth
running when you touch navigation or the session flow.

## What a good change looks like

The rules that matter are in [`AGENTS.md`](AGENTS.md) under *Quality rules* — every one of them
is a bug that got past a fully green build, and they are short. The three that come up most:

- **Prefer a type over a test.** If a bug would be "we forgot to update the other place", make
  the two places inseparable rather than testing that they agree.
- **Assert state, not navigation.** A test that checks the next screen appeared passes happily
  while the data underneath is wrong.
- **One source per value.** Colours live in `constants/rawColors.ts`; a lint plugin rejects raw
  hex anywhere else. Titles go through `localizedTitle()`.

[`DESIGN.md`](DESIGN.md) holds the visual non-negotiables — dark-only, tokens, one primary action
per screen. [`PRODUCT.md`](PRODUCT.md) says who the app is for and what it deliberately refuses
to be; a feature that fights it will get pushed back on even if the code is good.

## Comments

Write down *why*, not *what*. Many comments here are small post-mortems — "this used to be X, and
here is the bug that caused" — and they are the reason the codebase is navigable at all. If you
cut a corner on purpose, mark it with a `ponytail:` comment naming the ceiling and what would
trigger the real fix; "refactor planned" tells the next reader nothing.

## Commits

Conventional-ish prefixes (`feat`, `fix`, `refactor`, `docs`, `chore`) with a scope, and a
subject that says what changed rather than restating the diff. The body is where the reasoning
goes — it is fine, and encouraged, for it to be longer than the change.

## Releases

Tag-driven, see [`AGENTS.md`](AGENTS.md#branching-and-releases). You almost certainly do not need
to cut one; open a PR and it will go out with the next.
