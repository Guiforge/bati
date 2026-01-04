# Village

Your village is your fitness résumé… but drawn like a Franco‑Belgian comic book. It grows automatically from what you *actually* train, session after session.

## Core rules

- **No build menu.** The user never chooses what to build.
- **Your training decides.** Resources earned from workouts are converted into building progression.
- **Muscle buildings still exist.** Arms/back/chest/abs/shoulders/legs remain the core “shape” of the village.

## What’s implemented today (important)

### 1) Resources → Building XP (1:1)

Every resource point gained becomes **building XP** for its associated building.

Example: gain `+12 wood` → the Wood/Arms building gains `+12 XP`.

This is intentionally simple: the RPG layer rewards effort without turning into a second job.

### 2) Tier 2 auto-unlock

Tier 2 buildings are **auto-unlocked the first time you gain any resource** (first loot pickup). No “5 sessions” requirement.

### 3) New training paths

- **Calisthenics → Magic → Wizard Tower**
- **Yoga/Flexibility → Druid → Druid Grove**

Those are progression “flavors” that appear as your training generates the matching resources (see `docs/RESOURCES.md`).

### 4) Loot is visible

The **Loot Room / Chest Room** is where the game *shows* what you earned (your haul from the last session and/or totals).

## Building families (high level)

### Muscle / element buildings

These are the backbone of the village. They represent consistent training volume:

- **Wood** (Arms)
- **Stone** (Back)
- **Fire** (Chest)
- **Water** (Abs)
- **Wind** (Shoulders)
- **Grain** (Legs)

### Special buildings

These appear through specific training styles:

- **Wizard Tower** (from **Mana**, earned via calisthenics / “magic”)
- **Druid Grove** (from **Leaf**, earned via yoga/flexibility / “druid”)
- **Loot Room / Chest Room** (shows loot)

### Boss progression

Boss-related rewards (e.g., `boss_token`) are handled separately from the muscle loop and are used to gate/power special content.

## Why it’s fully automatic

You shouldn’t need to min-max a town planner to get the dopamine hit.

- You work out → you get loot
- Loot becomes village progress
- The village becomes a “training fingerprint” you can *see*

## Notes for future iterations (not promises)

- Costs/spending, construction timers, and manual upgrades are intentionally *not* required for the core loop.
- Visual tiering can be expanded without changing the underlying rule: **train → earn → grow**.
