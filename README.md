<div align="center">

<a href="https://guiforge.github.io/bati/"><img src="docs/legal/assets/img/og.jpg" alt="Build your body. Build your village." width="100%" /></a>

# Bati

**Train like a hero, build like a king.**

A dark-fantasy fitness RPG. Your workouts are quests, your reps are damage,
and the village you build is made of what you actually lifted.

<a href="https://fdroid.link/#https://guiforge.github.io/bati/fdroid/repo?fingerprint=089db12838d660caf285be855d8e6d023407a50d98051b3843095ea09bba2d97"><img alt="Get it on F-Droid" src="assets/badges/get-it-on-fdroid.png" height="60" /></a>
<a href="https://github.com/Guiforge/bati/releases/latest"><img alt="Get it on GitHub" src="assets/badges/get-it-on-github.png" height="60" /></a>

<br />

**[guiforge.github.io/bati](https://guiforge.github.io/bati/)** — the site, in English and French

[![CI](https://github.com/Guiforge/bati/actions/workflows/ci.yml/badge.svg)](https://github.com/Guiforge/bati/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/Guiforge/bati?label=release&color=0D33F2)](https://github.com/Guiforge/bati/releases/latest)
[![Licence: MIT](https://img.shields.io/badge/licence-MIT-green)](LICENSE)
![No tracking](https://img.shields.io/badge/tracking-none-success)
![Offline first](https://img.shields.io/badge/offline-first-informational)

![Expo 57](https://img.shields.io/badge/Expo-57-000020?logo=expo&logoColor=white)
![React Native 0.86](https://img.shields.io/badge/React_Native-0.86-61DAFB?logo=react&logoColor=black)
![TypeScript strict](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)
![SQLite + Drizzle](https://img.shields.io/badge/SQLite-Drizzle-C5F74F?logo=sqlite&logoColor=black)

</div>

A workout is a quest. Your reps land as damage on a boss. The muscles you actually train raise
the buildings of a village that grows out of what you lifted — not out of what you bought.

Sport first, RPG second: the training logic leads and the game amplifies it. Nothing decorative
gets between you and your next set.

**Nothing leaves your phone.** No account, no servers, no analytics, no ads. Bati makes no network
requests at all — your history lives in a database on your device and nowhere else. That is the
architecture, not a setting you have to find.

## See it

<div align="center">
<table border="0">
<tr>
<td width="25%"><img src="docs/legal/assets/shots/en/1-home.webp" alt="Home: your next session, one tap away" /></td>
<td width="25%"><img src="docs/legal/assets/shots/en/4-session.webp" alt="Mid-session: one exercise, a rep counter and a done button" /></td>
<td width="25%"><img src="docs/legal/assets/shots/en/5-boss.webp" alt="Boss fight: the boss above a health bar and the rep counter" /></td>
<td width="25%"><img src="docs/legal/assets/shots/en/7-village.webp" alt="Village: buildings raised by past sessions" /></td>
</tr>
<tr align="center">
<td><sub>Your next session, one tap away.</sub></td>
<td><sub>One exercise at a time.</sub></td>
<td><sub>Some sessions fight back.</sub></td>
<td><sub>Your reps built all of this.</sub></td>
</tr>
</table>

</div>

## What it does

**Every workout is a quest.** A campaign with a story, chapters and a map — not a list of sets you
tick off. You pick the next quest; it knows what you trained last.

**Your reps land as damage.** Finish a set and the boss takes the hit. The bar moves because you
moved, and the fight is over when the session is.

**Some sessions fight back.** Boss fights close a chapter and ask for a real effort — the one
session in the arc you have to show up for.

**The village is made of what you lifted.** Train shoulders, the forge rises. Nothing in it can be
bought, skipped or rushed; every building is a receipt for work you actually did.

**Years of history, on one screen.** Streaks, records, muscle balance and every session you ever
finished — read from a database on your phone, with nothing to log in to.

**No account, no network.** Bati makes no requests at all. There is no server to leak, no analytics
to opt out of, and no cloud copy of your training. [Privacy policy](https://guiforge.github.io/bati/privacy/).

## A note on this repo

This project is largely written with AI assistance. Saying it up front so you read the code with
that in mind.

This is a fun project. I build it because I enjoy building it, and I lean heavily on AI to write
it.

## Where the art comes from

Every illustration in `assets/` — exercise art, quest and adventure covers, boss portraits,
village buildings, avatars — is **AI-generated**. Nothing is stock, and nothing is traced from a
specific artist's work.

All of it comes from **FLUX.2 by Black Forest Labs**, through our own API account. That detail is
the licence: the FLUX grant over outputs runs to whoever holds the key, so generating through an
aggregator would have left us with art we could not license onward — which is why an earlier
Midjourney-and-Gemini-via-Mammouth set was regenerated from scratch.

Icons are a separate system: game and fantasy icons go through the project's own icon hook,
utility icons come from [`@tamagui/lucide-icons`](https://tamagui.dev).

## Quick start

```bash
npm install
npm start          # Expo dev server
```

Running on a device needs a dev build (`npm run android` / `npm run ios`), because the app uses
native modules — SQLite, audio, an Android home-screen widget.

## Scripts

| | |
| --- | --- |
| `npm start` | Expo dev server |
| `npm run android` / `ios` / `web` | run on a target |
| `npm run check` | Biome + TypeScript |
| `npm test` | Jest |
| `npm run knip` | dead-code check |
| `npm run maestro` | Maestro E2E flows (needs a device) |
| `npm run db:generate` / `db:push` | Drizzle migrations |

## Quality gates

All of these run in CI; the first three also run on commit or push.

- **Biome** — formatting and lint, including a GritQL plugin that rejects raw hex colours
  outside [`constants/rawColors.ts`](constants/rawColors.ts).
- **TypeScript**, strict.
- **Jest** — ~430 tests, with coverage thresholds set just under actual so they catch deletion
  rather than reward padding.
- **Knip** — dead code. At zero; anything it reports is new.
- **Maestro** — end-to-end flows against a real device.

## Project layout

- `app/` — Expo Router screens (file-based routing)
- `components/` — UI, grouped by feature
- `db/` — SQLite + Drizzle domain logic; the source of truth for game rules
- `stores/` — Zustand state (session, settings, user)
- `constants/` — game design constants and the colour palette
- `docs/` — the wiki: product, design, gameplay, architecture, planning
- `.maestro/` — E2E flows
- `plugins/` — local Expo config plugins

## Install it

Everything below is also on [the site](https://guiforge.github.io/bati/#install), in English and French.

### F-Droid — the one that updates itself

**Searching F-Droid for "Bati" will not find it.** The app is not in the main F-Droid catalogue;
it lives in its own repository, and F-Droid only searches repositories you have added. That is a
property of how the client works, not something a setting fixes — submission to the main catalogue
is tracked in [`docs/fdroid.md`](docs/fdroid.md), and the badge above switches to the official
listing once it lands.

Add this repository once and Bati shows up in search, with updates arriving like any other app's:

[**Add the repository to F-Droid**](https://fdroid.link/#https://guiforge.github.io/bati/fdroid/repo?fingerprint=089db12838d660caf285be855d8e6d023407a50d98051b3843095ea09bba2d97)

By hand instead — *Settings → Repositories → +* — paste the address, and check that F-Droid shows
this fingerprint before you accept it:

```
https://guiforge.github.io/bati/fdroid/repo
089D B128 38D6 60CA F285 BE85 5D8E 6D02 3407 A50D 9805 1B38 4309 5EA0 9BBA 2D97
```

That fingerprint is the whole security model of a self-hosted repository: it pins the key every
future update must be signed with. Adding the address without checking it trusts whatever answers
at that URL.

### A plain APK

[Releases](https://github.com/Guiforge/bati/releases) — Android will ask you to allow installs
from an unknown source the first time. Nothing updates itself this way; you download the next one
yourself.

See [`docs/fdroid.md`](docs/fdroid.md) for how the repository is built and signed.

## Contributing

[`CONTRIBUTING.md`](CONTRIBUTING.md) for code, [`docs/CONTRIBUTING.md`](docs/CONTRIBUTING.md) for
the wiki, [`SECURITY.md`](SECURITY.md) to report something that should not be a public issue.
Or just write to **<feedback.bati@proton.me>** — an idea is welcome in whatever form it arrives.

## Licence

[MIT](LICENSE) for the code, [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) for
the artwork in `assets/`.

The illustrations are generated with FLUX.2 by Black Forest Labs through our own API account,
whose licence places no ownership claim on outputs and allows any use. `scripts/provenance.json`
records the model, prompt and seed behind every one of them, so fork away — the art comes with
you, and you can regenerate it yourself.

Two exceptions keep their own terms: the [game-icons.net](https://game-icons.net) set
(CC BY 3.0 / CC0) and the store badges.
