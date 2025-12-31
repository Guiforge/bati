# Quests

A **Quest** is a workout template: a structured set of exercises you can run as a training session.

## What a Quest contains

A quest template typically includes:

- **Title + description** (English + French)
- **Author** (`author`): content attribution (defaults to `Admin` for seeded content)
- **Rounds**: how many times the workout loop repeats
- **Rest**: rest time between rounds (in seconds)
- **Exercises**: an ordered list of exercises, each with a target range (reps / time / etc.)

In the database layer, quests are stored in `quests` and their exercise rows live in `quest_exercises`.

## Running a Quest

When you complete a quest session, the app records a **Completed Session** (see `db/completed.ts`). This stores:

- which quest you performed
- when you performed it
- the per-exercise results
- duration and XP earned

That history is used to power progress views and charts.

## Where it shows up in the app

- **Home**: a “Pick a quest” carousel/section
- **Quests tab**: browse all quests, filter by muscles/equipment
- **Session**: running a quest is the core workout flow
