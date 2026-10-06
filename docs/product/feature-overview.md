---
title: Features Overview
type: product
status: active
updated: 2026-08-14
related: [vision.md, user-guide.md, ../planning/roadmap.md, ../gameplay/progression.md]
sources: [app, db, components]
---

# Features Overview

This document provides a high-level overview of all features in Bati. For detailed documentation, see the linked files.

---

## 🎮 Core Gameplay

### Quests (Workouts)

Single workout sessions with defined exercises.

- **What**: Structured workout templates
- **Contains**: Exercises, rounds, rest periods, targets
- **Duration**: 10-60 minutes typically
- **Doc**: [QUESTS.md](../gameplay/quests.md)

### Adventures (Campaigns)

Multi-quest storylines with narrative.

- **What**: Chained quests with story elements
- **Contains**: 4-8 quests, narrative text, boss fights
- **Duration**: Days to weeks
- **Doc**: [ADVENTURES.md](../gameplay/adventures.md)

### Boss Fights

Epic workout challenges as campaign climaxes.

- **What**: Special quests with HP mechanics
- **Contains**: Boss HP, damage system, special rewards
- **Doc**: [BOSS.md](../gameplay/boss-fights.md)

### Active Session

The workout execution experience.

- **What**: Timer, exercise display, progress tracking
- **Contains**: Exercise view, rest screen, pause, completion
- **Doc**: [SESSION.md](../gameplay/session-flow.md)

### Expeditions (Outings)

Walking, running and riding, measured by GPS, offline.

- **What**: A quest whose every movement is a walk, a run or a ride, with a duration or a distance goal
- **Contains**: Live distance, moving time and pace under a map that follows the hero; a buzz at
  the goal; a recap map; GPX export
- **Pays**: XP on moving time, and leagues that raise the High Road
- **Doc**: [EXPEDITIONS.md](../gameplay/expeditions.md)

### Sharing

A finished session as a picture, an outing as a GPX, a quest the hero wrote as a file.

- **Sessions**: one screen, `app/share.tsx`, reached by a worded "Share" button from the victory
  screen, the journal page and the recap (`components/share/ShareButton.tsx`). It shows the card
  that will be sent (title, date, the figures, the boss that fell, the record that broke, the run's
  line) and captures exactly that view (`react-native-view-shot`). With the map turned on, the hero
  chooses whether the picture carries the map, and the first and last 200 m of the line are left
  off every shared picture, since a run from the front door says where the door is. The same screen exports the GPX (`exportTrack` in `src/gps/trackFile.ts`).
- **Journal thumbnails**: with the map turned on, a run's thumbnail is its line over a still map,
  drawn once by MapLibre's snapshotter and cached (`src/gps/mapThumb.ts`). Both are framed by
  `traceBounds`, so the line lands on its roads.
- **Quests**: a hero's own quest is shared as a `.bati-quest.json` file through the share sheet,
  and imported from the new-quest editor (`src/questFile.ts`). Seed movements travel by name,
  the hero's own travel whole with their photo. The quest and each hero movement carry their
  uuid v7 (migration 0066, also what device sync matches hero content by): a second import of
  the same quest updates it in place, a movement the receiver already has is reused even
  renamed, and the whole import is one transaction. Not a QR code: one photo is ten times what a QR
  code holds. Not a Wi-Fi transfer either: it needs a local server, a third network module and a
  privacy policy change, and Android's Quick Share already carries a file between two phones in
  the room.
  - **Opening one**: tapping the file in a chat, a mail or Files opens Bati (an ACTION_VIEW filter
    on `application/json`, `app/+native-intent.tsx`), and so does the editor's import button,
    through the picker. Both land on one preview (`app/quest-import.tsx`): the hero renames the
    quest, unticks the movements they do not want, and, for a quest they already have, chooses
    between updating it and keeping both. A seed movement this version lacks is shown and left
    out, instead of refusing the whole quest. The extension stays `.json`: chat apps type a file
    by its extension, and `.bati` would arrive as `application/octet-stream`, which only a filter
    claiming every unknown file on the phone could catch.
  - **Trust**: every field of an incoming file is validated. A picture is only ever a
    `data:image` whose header says 1024 px or less, or the name of an image the app ships, never a
    URL the app would then fetch; asset names are looked up as own keys, so `constructor` is the
    placeholder. Texts lose controls and invisible format marks (bidi overrides, zero-width
    spaces), titles and names are capped at 120 and cannot be blank, and every number goes
    through the same clamps as the editors, so an imported quest pays no more than one the hero
    wrote. A code a newer version added (a muscle, a pattern) is dropped where it only labels,
    and asks for an update where it changes what a set is worth.

---

## 🏰 RPG Systems

### Village

Visual representation of your fitness journey.

- **What**: One illustrated scene whose tier and overlays are a pure function of your training
- **Contains**: Automatic visual progression from workouts — no resource spending, no build menu
- **High Road**: the one building leagues raise, and no amount of lifting can
- **Status**: Derived/read-only reward layer (rebuild pending — see doc)
- **Doc**: [progression.md](../gameplay/progression.md)

### XP & Levels

Experience and progression system.

- **What**: Points earned per workout
- **Factors**: Duration, difficulty, completion
- **Levels**: Unlock content and features
- **Status**: Implemented
- **Doc**: [STATISTICS.md](../gameplay/statistics-progress.md)

### Flame (Consistency streak)

Consistency tracking — days the hero held their weekly rhythm, not days they trained.

- **What**: Days the flame stayed lit, derived from the session journal (`db/streaks.ts`). A day
  counts while the trailing week holds the hero's session quota, or the week before it did.
- **Quota**: 2 sessions a week by default (WHO baseline); a `weekly_sessions`
  [oath](../gameplay/oaths.md) raises it to the hero's chosen 2, 3 or 4.
- **Visual**: Flame intensity and day count in the Journal, and the Village scene
- **Behavior**: Rest days cost nothing. One blank week is forgiven, two put the flame out.
- **Status**: Implemented

---

## 📊 Progress Tracking

### Statistics

Comprehensive workout analytics.

- **What**: Charts, metrics, progress views
- **Contains**: Weekly/monthly views, muscle balance, records
- **Status**: Implemented (Journal → Stats tab)
- **Doc**: [STATISTICS.md](../gameplay/statistics-progress.md)

### Workout History

Log of all completed sessions.

- **What**: Past workout records
- **Contains**: Date, duration, XP, exercises
- **Status**: Implemented

### Personal Records

Track personal bests.

- **What**: Best performances tracked
- **Contains**: Max reps, longest sessions, best streaks
- **Status**: Implemented (Journal → Stats tab)

---

## 🎯 Planning Features

### What Home offers next

One action at a time, on Home. Deliberately unnamed in the UI — see the doc for why "Coach" was
dropped.

- **What**: resume an adventure → serve the Oath → cover a lagging muscle → open the gallery
- **Note**: it picks an *action*, never a target. The chosen objective is the Oath, which it now
  reads to decide what to offer
- **Status**: Implemented (Home, `useSmartAction.ts`). The rest/overreach rule
  (`db/restSuggestions.ts`) renders as a line under the stage, never as the primary button
- **Doc**: [coach-planning.md](../gameplay/coach-planning.md)

### Oath (Serment)

The user's single chosen objective.

- **What**: One target the user swears (streak, sessions, exercise PR/volume)
- **Contains**: Ready-made presets or a custom target; progress derived from the journal
- **Where**: Swear from the oath strip at the foot of Home's scene; fulfilment celebrated on the
  victory screen
- **Status**: Implemented
- **Doc**: [oaths.md](../gameplay/oaths.md)

### Notifications

Reminders and alerts.

- **What**: One local reminder for the sworn oath, three idle days after the last session
- **Contains**: A single pending notification, recomputed on launch and after each session
- **Where**: Toggled in Settings; silent when no oath is sworn or permission is denied
- **Status**: Implemented
- **Doc**: [oaths.md](../gameplay/oaths.md#the-reminder-is-one-pending-notification-not-a-system)

---

## 🎨 User Experience

### Exercise Colors

Color-coding by muscle group.

- **What**: Each muscle has a color
- **Purpose**: Quick visual identification
- **Doc**: [EXERCISE_COLORS.md](../design/exercise-colors.md)

### UI Design System

Visual design guidelines.

- **What**: Colors, typography, components, rules
- **Style**: Inked dark-fantasy BD
- **Doc**: [design-system.md](../design/design-system.md)

---

## 🌍 Localization

### Supported Languages

- English (en)
- French (fr)

### Implementation

- UI strings: i18next
- Content: Dual-language fields in database
- Files: `locales/en.json`, `locales/fr.json`

---

## 🛠️ Technical Features

### Offline-First

Every workout works with the phone in flight mode.

- Local SQLite database
- All content stored on device
- No account required
- Three exceptions, each off by default. The map behind an expedition's route, fetched from
  `tiles.openfreemap.org` (OpenStreetMap data served by OpenFreeMap). The tiles requested cover
  the area of the outing, while it happens and on its recap, so switching the map on tells that
  host roughly where the hero goes as they move, with the IP address and the time; not the route
  to the metre, the pace, the training or an identity. Until it is switched on the app makes no
  network request for it, and both maps draw the route on a plain background.
- The version check, a daily anonymous question to `api.github.com` about a newer release.
- Device sync, the database encrypted on the phone and sent to a WebDAV or Nextcloud server the
  hero names (or a Syncthing folder, with no request of Bati's own). Nothing from the database
  leaves any other way except a backup the hero makes, and
  [`.biome/plugins/noJsNetwork.grit`](../../.biome/plugins/noJsNetwork.grit) fails the build on any
  network call outside `src/updateCheck.ts` and `src/cloudSync.ts`.

### Performance

Optimized for mobile.

- Fast load times (<2s target)
- Smooth animations (60fps)
- Battery efficient

### Architecture

Technical stack details.

- **Doc**: [ARCHITECTURE.md](../architecture/technical-architecture.md)

---

## 🚀 Roadmap

There is one, and it is not here: **[roadmap.md](../planning/roadmap.md)**. This section used to
carry a phase list that outlived every phase in it — Phase 1 shipped, Phase 4 never existed, and
"Phase 5: Future" said less than the parking lot it duplicated. A second ranked list is a second
thing to forget to update.

---

## 📖 Documentation Index

| Document | Description |
| -------- | ----------- |
| [VISION.md](vision.md) | Product vision & philosophy |
| [QUESTS.md](../gameplay/quests.md) | Quest (workout) system |
| [ADVENTURES.md](../gameplay/adventures.md) | Multi-quest campaigns |
| [BOSS.md](../gameplay/boss-fights.md) | Boss fight mechanics |
| [SESSION.md](../gameplay/session-flow.md) | Active workout UI |
| [progression.md](../gameplay/progression.md) | XP, village, flame |
| [coach-planning.md](../gameplay/coach-planning.md) | What Home offers next: oath, weak-area & rest rules |
| [STATISTICS.md](../gameplay/statistics-progress.md) | Stats & progress tracking |
| [EXERCISE_COLORS.md](../design/exercise-colors.md) | Color system |
| [design-system.md](../design/design-system.md) | Visual design system |
| [ARCHITECTURE.md](../architecture/technical-architecture.md) | Technical architecture |
| [roadmap.md](../planning/roadmap.md) | Roadmap — open work and the parking lot |
| [QUEST_SESSION_SPEC.md](../gameplay/session-flow.md) | Technical session spec |
