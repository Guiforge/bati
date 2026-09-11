---
title: Village
type: screen
route: /village
status: active
updated: 2026-09-11
related: [../gameplay/progression.md, ../gameplay/boss-fights.md, ../gameplay/villagers.md]
sources: [app/(tabs)/village.tsx, components/village/, constants/villageAnchors.ts, db/village.ts]
---

# Village (`/village`)

## Purpose

The Village is the **visual reward layer**: the tier painting, reacting to what the hero built, and
under it every building with the next rung it waits on. All of it is a pure function of training
([progression.md](../gameplay/progression.md)). Buildings have levels but nothing is *managed*:
no unlock button, no resource spending, no prestige score. A building levels up because you
trained the muscle it belongs to.

Redesigned 2026-09-11 from the Claude Design project "Village - refonte" (structure 1a, "the living
scene"). The goal the old screen missed: **a building that rises changes the painting**, and every
row can be read without a tap.

## Layout, top to bottom

1. **The painting**, square, edge to edge, with the tier's **anchors** on it
   (`VillageAnchors.tsx`, spots from `constants/villageAnchors.ts`). A building that stands lights
   its spot (gold, a slow flicker), one that has not been built is a dashed plot, the Forge and
   the Campfire smoke once built, and one that just rose pulses a gold ring twice and carries its
   name. Tap anywhere on it for the full painting (`VillageSceneViewer`), uncropped.
2. **Over the painting's foot**: the 7-day focus line (sport emblem at 20 px plus "7-day focus ·
   Legs"), the village's name, "Tier · Level N · Title", and the flame chip with its day count.
3. **The panel**, riding up over the painting's last 14 dp:
   - *Finished* card, only when the village is complete (`isVillageComplete`: tier 12 and every
     building that can top out has). It says so first, then how many deeds are still open.
   - **Next to rise** (`pickNextToRise`): the rep building fewest reps from its next rung, level 0
     excluded (one rep builds any of them, so they would always win). Past the rep buildings, the
     deed with the most of its bar filled. It carries the only bar on the screen outside the detail
     sheet, with its unit at both ends ("60 reps", "level 2 at 100"), and a link to quests already
     filtered on that muscle (or the outings, for the High Road). On **day one** (`isDayOne`:
     nothing earned beyond the three starters; a walk counts) it states the rule instead, and links
     to the first quest.
   - **Since your last quest**, only on arrival from a session: each building that rose, and
     "3 → 4".
   - **Families** (`groupFamilies` in `components/village/rows.ts`): Muscles, Styles, Upgrades,
     Deeds, Starter, each labelled with what feeds it. Unbuilt buildings sit in their family, not
     in a locked drawer. A row is the name, the next rung in words, and "level 2 of 3" with pips
     on the building's **real ceiling** (`buildingCeiling`: 3 for the six upgrades, 5 elsewhere).
     Day one shows the starters and one "Not built yet" list; a finished village leads with the
     deeds and folds the rest into one family.
   - The foot: "Nothing is managed here."

Below 700 dp of window height the painting is cut to a band 62% of the width tall (starting 20% in),
so "Next to rise" stays above the fold.

## The return from a session

The victory screen's "View Village" passes `grown=farm:3:4,barn:1:2` (`formatGrown` /
`parseGrown` in [db/village.ts](../../db/village.ts), one owner for both sides). The village then
plays once: the painting leans in on the first risen building's anchor (if this tier has one), the
return card rises with that building's before and after paintings, and after about five seconds
everything settles. Tapping the card dismisses it. It is keyed on the param string, so a revisit of
the tab never replays it, and a plain tab visit never plays it. Under reduced motion: no lean, no
ring, no smoke, the card is simply there.

No villager in the card: VictoryView already picked the one villager a victory gets, and
`VillagerCameo` is the only place a villager is drawn.

## What left the screen, and where it went

| Was here | Now |
|---|---|
| 56 px dominant-sport disc over the sky | The focus line under the painting |
| "Least trained: chest" | "Next to rise", which says it with a number |
| The daily weather line under the name | The foot of the page, below the families. The design sent it to Home's village band, which the Home redesign (#90) removed. |
| "Built" / "To build" grids | Families |
| Bars without units on every tile | Only on "Next to rise" and in the detail sheet |
| Five pips on upgrades that stop at 3 | Pips on the real ceiling, here and on the victory screen |
| Trophy wall | Defeated bosses: the Journal's `BossesCard`. Achievements were already in `AchievementsCard`. |
| A tile that pulsed once | The return sequence above |

## Implementation notes

Buildings are **derived, never stored**: `getVillageBuildings()` computes every level from existing
signals (lifetime muscle volume, exercise-style volume, deeds, village tier). The
`village_buildings` and `village_stats` tables are seeded but unused.

Every sentence about a building (next rung, what feeds it, level text, bar ends, family, quest link)
comes from `components/village/rows.ts`, so the rows, "Next to rise", the return card and the
detail sheet cannot phrase the same building two ways. `getBuildingProgress()` is still the single
source for "how far to the next level".

**Anchors were placed by eye**, 6 to 12 per tier, on the square `cover` crop the screen shows.
Re-painting a tier means re-placing its anchors. No tier holds all 21 buildings (the Fountain has
no spot on any), and a building with no spot is simply not drawn on the painting. The weakest
placements: tier 8 (`tent` on a sail, `farm` on crates in a boat), tier 10 (`dragon_lair` on the
rock face), tier 12 (the starters on unnamed spires). The phase-1 art the design lists (halos,
smoke plumes, banners, scaffolding) does not exist yet: the anchors are drawn in code.

The painting and its anchors share one `Animated.View`, so they parallax and lean together; the
scrims and the title do not move. Ambient motes are still `VillageEmbers.tsx`. Everything is
transform and opacity on the UI thread, and all of it stops under reduced motion.

The emblems carry an alpha channel, cut by [`scripts/cutout.py`](../../scripts/cutout.py); an
unbuilt row draws the same emblem as a silhouette through `tintColor`, which needs that alpha.
