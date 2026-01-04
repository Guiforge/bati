# Resources

Resources are Bati’s loot: tangible proof that you trained like a hero.

They feed the village automatically (no build decisions), and they make the end-of-session rewards screen feel like opening a treasure chest.

## Resource list

Bati uses a mixed economy: one universal currency, six “element” resources, two style resources, plus a boss currency.

### Universal

- `gold`

### Elements (muscle-linked)

- `wood`
- `stone`
- `fire`
- `water`
- `wind`
- `grain`

### Training-style resources

- `mana` (calisthenics / “magic”)
- `leaf` (yoga & flexibility / “druid”)

### Boss currency

- `boss_token`

## Where the loot shows up

The **Loot Room / Chest Room** is the “receipt” of your session: it displays what you earned (and gives that satisfying open-the-chest moment).

## What’s implemented today (important)

### 1) Resources become building XP (1:1)

Current logic is deliberately straightforward:

- Every resource point gained becomes **building XP** for the associated building.
- Conversion rate is **1:1**.

This means resources are not only “inventory” — they are also the primary driver of village progression.

### 2) Tier 2 auto-unlock

Tier 2 buildings are **auto-unlocked the first time the player gains any resource**.

There is no prompt, no choice, no extra requirement: loot once, and the village starts taking shape.

## How resources map to the village

At a high level:

- The six element resources power the muscle buildings (the classic village backbone).
- `mana` powers the Magic path:
  - **Calisthenics → Magic → Wizard Tower**
- `leaf` powers the Druid path:
  - **Yoga/Flexibility → Druid → Druid Grove**
- `boss_token` supports boss-related progression and special unlocks.

## Design intent

- Readable at a glance: the resource names are intuitive and theme-consistent.
- Offline-first friendly: everything can be computed locally.
- No economy micromanagement: you earn loot by training; the village grows on its own.
