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

- **What**: Auto-built village based on workout history
- **Contains**: Buildings, upgrades, visual progression
- **Status**: Planned (Phase 2)
- **Doc**: [VILLAGE.md](../economy/rewards-and-progression.md)

### Resources

Currency and materials for the RPG layer.

- **What**: Gold, Wood, Stone, etc.
- **Earned**: Through workout completion
- **Used**: Building village (automatic)
- **Status**: Planned (Phase 2)
- **Doc**: [RESOURCES.md](../economy/rewards-and-progression.md)

### XP & Levels

Experience and progression system.

- **What**: Points earned per workout
- **Factors**: Duration, difficulty, completion
- **Levels**: Unlock content and features
- **Status**: Implemented
- **Doc**: [STATISTICS.md](../gameplay/statistics-progress.md)

### Flame (Streak)

Daily workout streak tracking.

- **What**: Consecutive workout days
- **Visual**: Growing flame in village
- **Rewards**: Streak milestones
- **Status**: Planned (Phase 2)

---

## 📊 Progress Tracking

### Statistics

Comprehensive workout analytics.

- **What**: Charts, metrics, progress views
- **Contains**: Weekly/monthly views, muscle balance, records
- **Status**: Planned (Phase 4)
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
- **Status**: Planned (Phase 4)

---

## 🎯 Planning Features

### Coach

Goal setting and auto-planning.

- **What**: Set goals, get auto-generated plans
- **Contains**: Goal types, adventure generation, scheduling
- **Status**: Planned (Phase 3)
- **Doc**: [COACH.md](../gameplay/coach-planning.md)

### Notifications

Reminders and alerts.

- **What**: Workout reminders, streak warnings
- **Contains**: Scheduled notifications, motivational messages
- **Status**: Planned (Phase 3)

---

## 🎨 User Experience

### Exercise Colors

Color-coding by muscle group.

- **What**: Each muscle has a color
- **Purpose**: Quick visual identification
- **Doc**: [EXERCISE_COLORS.md](../design/exercise-colors.md)

### UI Design System

Visual design guidelines.

- **What**: Colors, typography, components
- **Style**: Franco-Belgian comic book
- **Doc**: [UI_GUIDE.md](../design/ui-guide.md)

### Mobile Ergonomics

Touch-friendly design.

- **What**: Thumb zone optimization, safe areas
- **Doc**: [MOBILE.md](../design/mobile-ux-handbook.md)

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

### Phase 2: Village & Economy 🏗️

- Resource system
- Village view
- Auto-building
- Streak/Flame system

### Phase 3: Coach & Planning

- Goal setting
- Auto-generated plans
- Notifications

### Phase 4: Statistics

- Charts and analytics
- Personal records
- Achievements

### Phase 5: Future

- Social features
- GPS/outdoor quests
- Smartwatch integration
- Cloud sync

**Full roadmap**: [FUTURE.md](../planning/future-roadmap.md)

---

## 📖 Documentation Index

| Document | Description |
| -------- | ----------- |
| [VISION.md](vision.md) | Product vision & philosophy |
| [QUESTS.md](../gameplay/quests.md) | Quest (workout) system |
| [ADVENTURES.md](../gameplay/adventures.md) | Multi-quest campaigns |
| [BOSS.md](../gameplay/boss-fights.md) | Boss fight mechanics |
| [SESSION.md](../gameplay/session-flow.md) | Active workout UI |
| [VILLAGE.md](../economy/rewards-and-progression.md) | Village & building system |
| [RESOURCES.md](../economy/rewards-and-progression.md) | Resource economy |
| [COACH.md](../gameplay/coach-planning.md) | Goal setting & planning |
| [STATISTICS.md](../gameplay/statistics-progress.md) | Stats & progress tracking |
| [EXERCISE_COLORS.md](../design/exercise-colors.md) | Color system |
| [UI_GUIDE.md](../design/ui-guide.md) | Visual design system |
| [ARCHITECTURE.md](../architecture/technical-architecture.md) | Technical architecture |
| [FUTURE.md](../planning/future-roadmap.md) | Future roadmap |
| [QUEST_SESSION_SPEC.md](../gameplay/session-flow.md) | Technical session spec |
| [MOBILE.md](../design/mobile-ux-handbook.md) | Mobile UX best practices |
| [IMAGE_PROMPTS.md](../content/image-prompts.md) | AI image generation prompts |
