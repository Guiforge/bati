---
title: Features Overview
type: product
status: active
updated: 2026-07-28
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

---

## 🏰 RPG Systems

### Village

Visual representation of your fitness journey.

- **What**: One illustrated scene whose tier and overlays are a pure function of your training
- **Contains**: Automatic visual progression from workouts — no buildings, no resources
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
- **Visual**: Flame intensity shown on Home (`StatsOverview`) and the Village scene
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

### Coach

A reactive nudge on Home.

- **What**: One action at a time — resume an adventure, or a lagging-muscle quest suggestion
- **Note**: Never echoes a weekly-goal count; the chosen objective is the Oath
- **Status**: Implemented (Home, `useSmartAction.ts`). The rest/overreach rule
  (`db/restSuggestions.ts`) is written and tested but **not wired to any surface**
- **Doc**: [coach-planning.md](../gameplay/coach-planning.md)

### Oath (Serment)

The user's single chosen objective.

- **What**: One target the user swears (streak, sessions, exercise PR/volume)
- **Contains**: Ready-made presets or a custom target; progress derived from the journal
- **Where**: Swear from the Home Oath card; fulfilment celebrated on the victory screen
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
- **Style**: Dark-fantasy / high-tech HUD
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

Works without internet connection.

- Local SQLite database
- All content stored on device
- No account required

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

### Phase 1: Core Loop ✅ (Current)

- Quests, Sessions, Adventures, Bosses
- XP system, Exercise colors
- Localization (EN/FR)

### Phase 2: Coach

- Weekly goal + weak-area + rest rules (see [coach-planning.md](../gameplay/coach-planning.md))
- Weekly suggested-quest list, if user feedback asks for more direction

### Phase 3: Statistics polish

- Muscle balance, personal records, sessions/week, calendar (all derived — see [statistics-progress.md](../gameplay/statistics-progress.md))

### Phase 5: Future

- Social features
- GPS/outdoor quests
- Smartwatch integration
- Cloud sync

**Full roadmap**: [roadmap.md](../planning/roadmap.md)

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
| [COACH.md](../gameplay/coach-planning.md) | Weekly goal, weak-area & rest nudges |
| [STATISTICS.md](../gameplay/statistics-progress.md) | Stats & progress tracking |
| [EXERCISE_COLORS.md](../design/exercise-colors.md) | Color system |
| [design-system.md](../design/design-system.md) | Visual design system |
| [ARCHITECTURE.md](../architecture/technical-architecture.md) | Technical architecture |
| [roadmap.md](../planning/roadmap.md) | Roadmap — open work and the parking lot |
| [QUEST_SESSION_SPEC.md](../gameplay/session-flow.md) | Technical session spec |
| [IMAGE_PROMPTS.md](../content/image-prompts.md) | AI image generation prompts |
