---
title: Product Guide
type: product
status: active
updated: 2026-07-18
related: [vision.md, feature-overview.md, ../screens/README.md, ../economy/rewards-and-progression.md]
sources: [app/_layout.tsx, app/(tabs)/index.tsx, app/treasury.tsx, app/(tabs)/village.tsx]
---

# Bati — Product Guide (Non‑Technical)

> Train like a hero, build like a king.

This document explains **what Bati does** and **what each page is for**, using plain language. It avoids implementation details (no code, no tech stack).

---

## What Bati is

**Bati** is a mobile fitness app that turns workouts into a light fantasy RPG journey.

- You complete short, structured workouts called **Quests**.
- You earn **rewards** after each workout.
- Those rewards automatically grow your **Village** (no complex management).
- You can follow multi‑workout storylines called **Adventures**, sometimes ending with a **Boss**.

---

## Core loop (the experience in one line)

Pick a Quest → Train → Earn XP + passive loot → Your village reacts → Repeat

---

## Key concepts (terminology)

- **Quest**: A workout template (a sequence of exercises). One quest = one workout session.
- **Session**: The moment you’re actively doing a quest (the “workout run”).
- **Adventure**: A story campaign made of several quests chained together.
- **Boss**: A special kind of adventure that feels like a finale.
- **XP & Level**: Progress earned by training. XP increases your level.
- **Resources / Loot**: Passive rewards connected to what you trained.
- **Village**: Your “fitness fingerprint” shown as a growing fantasy village.
- **Journal**: Your training history, stats, and progress.

---

## What you earn (rewards)

After workouts, Bati rewards you with:

- **XP**: makes your hero level up.
- **Resources**: themed loot connected to what you trained. In MVP these are read-only feedback, not a shop currency.

### Muscle → Resource → Village growth

Your training focus changes what you earn and which parts of the village grow.

- Arms → **Wood**
- Back → **Stone**
- Chest → **Fire**
- Abs → **Water**
- Shoulders → **Wind**
- Legs → **Grain**

**Important design rule:** village growth is automatic. You don’t “manage” a town—your training decides.

---

## Main features (what the app lets you do)

### 1) Do structured workouts (Quests)

- Browse quests.
- See what a quest contains (exercises, rounds, estimated time).
- Choose a difficulty.
- Start the workout and record completion.

### 2) Follow story campaigns (Adventures)

- Browse adventures.
- Start an adventure run.
- Complete quests step‑by‑step.
- Continue where you left off.

### 3) Track progress (Journal)

- View recent workouts.
- Review detailed results of a past session.
- See progress summaries like levels and training balance.

### 4) View passive loot (Treasury)

- See your current totals for muscle-linked resources.

### 5) See your village (Village)

- A visual representation of your progress and rewards.

### 6) Plan and stay consistent (Goals + Schedule)

- Set a training goal (focus + days per week + session length).
- Get a suggested weekly schedule.
- Receive rest suggestions when needed.

---

## Pages & navigation guide (what each page is for)

Below is a practical “map” of the app, written for non‑technical readers.

### Navigation map (with links)

Start here:

- [Onboarding](../screens/onboarding.md) → [Home](../screens/home.md)

Daily training paths:

- [Home](../screens/home.md) → [Quests Gallery](../screens/quests.md) → [Quest Details](../screens/quest-details.md) → [Session](../screens/session.md) → [Journal](../screens/journal.md)
- [Home](../screens/home.md) → [Adventures Gallery](../screens/adventures.md) → [Adventure Details](../screens/adventure-details.md) → [Quest Details](../screens/quest-details.md) → [Session](../screens/session.md)

Progress & rewards:

- [Home](../screens/home.md) → [Village](../screens/village.md)
- [Home](../screens/home.md) → [Treasury](../screens/treasury.md)
- [Journal](../screens/journal.md) → [Session Details](../screens/session-details.md)

Planning:

- [Home](../screens/home.md) → [Goals](../screens/goals.md) → [Schedule](../screens/schedule.md)

Preferences:

- [Home](../screens/home.md) → [Settings](../screens/settings.md)

### Features by page (quick reference)

- **[Onboarding](../screens/onboarding.md)** → first-time setup: language, avatar, village name.
- **[Home](../screens/home.md)** → continue adventure, quick links, progress snapshot.
- **[Quests Gallery](../screens/quests.md)** → browse workouts, narrow choices, pick a quest.
- **[Quest Details](../screens/quest-details.md)** → understand the workout, choose difficulty, start.
- **[Adventures Gallery](../screens/adventures.md)** → browse campaigns (route/boss/event).
- **[Adventure Details](../screens/adventure-details.md)** → see steps, progress, start/continue next quest.
- **[Session](../screens/session.md)** → do the workout, rest/pause, finish and earn rewards.
- **[Journal](../screens/journal.md)** → stats + history, open past sessions.
- **[Session Details](../screens/session-details.md)** → per-session report (your “receipt”).
- **[Village](../screens/village.md)** → visual progress from training.
- **[Treasury](../screens/treasury.md)** → passive loot totals (resources).
- **[Goals](../screens/goals.md)** → set direction (focus/frequency/duration).
- **[Schedule](../screens/schedule.md)** → weekly view + rest suggestion.
- **[Settings](../screens/settings.md)** → language and preferences.
- **[Credits](../screens/credits.md)** → acknowledgements.

### Onboarding

**Purpose:** help first‑time users set up quickly.

- **Welcome / Start** (`/onboarding`)
  - Introduces the app and begins setup.
- **Presentation** (`/onboarding/presentation`)
  - Explains the vibe and how the app works at a high level.
- **Choose Avatar** (`/onboarding/choose-avatar`)
  - Pick your character identity.
- **Village Name** (`/onboarding/village-name`)
  - Name your village (your “kingdom” / profile flavor).

### Home

**Purpose:** the dashboard to jump back into training.

- **Home** (`/`)
  - Shows your current status at a glance (progress highlights).
  - Quick access to:
    - continuing your current adventure,
    - visiting the village,
    - opening the treasury,
    - seeing a compact overview of stats.

### Quests (workouts)

**Purpose:** browse and start individual workouts.

- **Quests Gallery** (`/quests`)
  - Lists available quests.
  - Helps you find workouts that match your needs.
- **Quest Details** (`/quests/[id]`)
  - Explains what the quest contains.
  - Lets you choose difficulty and start the session.

### Adventures (campaigns)

**Purpose:** do a multi‑quest storyline.

- **Adventures Gallery** (`/adventures`)
  - Lists adventures and highlights what kind they are (standard route / boss / event).
- **Adventure Details** (`/adventures/[id]`)
  - Shows the steps of the campaign.
  - Lets you start or continue your run.
  - Guides you to the next quest step.

### Session (active workout)

**Purpose:** execute the workout.

- **Session** (`/session`)
  - Runs the quest exercise‑by‑exercise.
  - Supports rests and pausing.
  - Ends with a completion moment that records results and rewards.

### Journal (history + stats)

**Purpose:** understand your consistency and progress.

- **Journal** (`/journal`)
  - **Stats**: summaries of your progress (level, balance, suggestions).
  - **History**: a timeline of completed sessions.
- **Session Details** (`/journal/[id]`)
  - A detailed report of one completed session.
  - Useful for checking what you did, how long it took, and results per exercise/round.

### Village

**Purpose:** see the “RPG reward layer” of your training.

- **Village** (`/village`)
  - Visualizes your progress as a growing village.
  - Reinforces the “train → earn → build” loop.

### Treasury

**Purpose:** see passive rewards from training.

- **Treasury** (`/treasury`)
  - Displays your collected muscle resources.
  - Helps users connect training focus with rewards.

### Goals

**Purpose:** set a simple training direction.

- **Goals** (`/goals`)
  - Choose what you want to improve (examples: strength, endurance, flexibility, balanced).
  - Choose frequency (days per week) and session duration.
  - Generates a plan preview and confirms a plan.

### Schedule

**Purpose:** keep your week organized.

- **Schedule** (`/schedule`)
  - Shows a weekly calendar.
  - Includes rest suggestions when appropriate.

### Settings

**Purpose:** personalize the experience.

- **Settings** (`/settings`)
  - Adjust preferences (for example language).

### Credits

**Purpose:** acknowledgements.

- **Credits** (`/credits`)

### Dev tools (internal)

**Purpose:** development/debug utilities.

- **Dev** (`/dev`)
  - Not intended for normal users.

---

## What’s “core” vs “extra” (how to explain Bati in 15 seconds)

If you need a simple pitch:

- **Core:** Bati is a workout app with structured sessions (quests) and progress tracking.
- **Motivation layer:** it wraps the routine in a fantasy journey (adventures + village growth) so you want to come back.
- **Simplicity rule:** no complicated choices—your effort automatically turns into progress.

---

## Supported languages

Bati supports **English** and **French**.
