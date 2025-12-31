# Adventures (Campaigns)

An **Adventure** is a **multi-step campaign** made of several quest sessions chained together with a bit of narrative.

> In this app: **Adventure = campaign** (not a single quest wrapper).

## What an Adventure contains

An adventure includes:

- **Kind**: `route` | `boss` | `event`
- **Author** (`author`): content attribution (defaults to `Admin` for seeded content)
- **Localized title + description** (English + French)
- **Cover quest**: the quest used as the adventure “card” preview
- **Steps**: ordered list of step quests + narrative blurbs

Database tables involved:

- `adventures`: base metadata (title/description/kind/cover quest)
- `adventure_steps`: the step list (`stepIndex`, `questId`, `narrative`)

## Runs: tracking campaign progress

When you start an adventure, the app creates an **Adventure Run**:

- `adventure_runs`: one row per playthrough (status, difficulty override, timestamps)
- `adventure_run_steps`: one row per step per run (locked/active/completed)

Completing a session for the **active step** advances the run to the next step. When the last step is completed, the run is marked finished.

## UI behavior

- The **Adventures tab** lists only **multi-step** adventures.
- The **Adventure details** screen shows the steps and lets you start/continue a run.
- **Home** can show a “Continue your adventure” card when a run is in progress.
