---
title: Village
type: screen
route: /village
status: active
updated: 2026-09-14
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

1. **The painting**, square, edge to edge, with nothing drawn on it but the embers. Tap anywhere
   on it for the full painting (`VillageSceneViewer`), uncropped.
2. **Over the painting's foot**: the village's name with the flame chip on the same line, "Tier ·
   Level N · Rank", then the 7-day focus line (sport emblem at 20 px plus "7-day focus · Legs").
   The focus line is last because above the name it sat on the bright top of the painting, and the
   rank stops at "Divine" past level 20 (`getLevelTitle`): it used to carry the level ("Divine 44"), which the line
   already says.
3. **The panel**, riding up over the painting's last 14 dp:
   - **The village tier** (`VillageTier`, `getTierProgress`), first in every state. The village
     follows the hero's level alone, so it answers "when does the painting change" in those terms:
     the hero level of the next tier and how many levels away, an indigo bar from the current
     tier's floor to that level with XP at both ends, and the XP still missing, with "about N
     sessions at this week's pace" when the last seven days had any (`getWeekXpPerSession`). On
     tier 12 the bar goes and the sentence is final. A finished village (`isVillageComplete`: tier
     12 and every building that can top out has) says so inside the same block, then how many
     deeds are still open.
   - **Next to rise** (`pickNextToRise`): the rep building fewest reps from its next rung, level 0
     waiting while any is still rising (one rep builds those). Past the rep buildings, the
     deed with the most of its bar filled. It carries its bar with its unit at both ends ("60
     reps", "100 reps for level 2"), and a link named after what raises it: quests filtered on that
     muscle, the outings for the High Road, the adventures for the other deeds. When that building
     is unbuilt the title reads **Next to build** and there is no bar. On **day one** (`isDayOne`:
     nothing earned beyond the three starters; a walk counts) it states the rule instead, and links
     to the first quest.
   - **Since your last quest**, only on arrival from a session: each building that rose, and
     "3 → 4".
   - **Families** (`groupFamilies` in `components/village/rows.ts`): Muscles, Styles, Upgrades,
     Deeds, Starter, each labelled with what feeds it. Unbuilt buildings sit in their family, not
     in a locked drawer. A row is the name, the next rung in words, and "level 2 of 3" with pips
     on the building's **real ceiling** (`buildingCeiling`: 3 for the six upgrades, 5 elsewhere).
     The building "Next to rise" already names keeps its row, marked by a gold edge, so it is found
     where it belongs without being read twice. Day one shows the starters and one "Not built yet"
     list; a finished village leads with the deeds and folds the rest into one family.
   - The foot: "Nothing is managed here."

A building has **three states**: unbuilt (the condition in words, no bar, no "level 1 at 1"),
rising (a bar with its unit), at its ceiling (no bar). `getBuildingProgress` returns null for the
first and the last. The one exception is the High Road inside its first league, whose whole-league
tally cannot show a first walk and whose bar can.

Below 700 dp of window height the painting is cut to a band 62% of the width tall (starting 20% in),
so the tier block stays above the fold.

## Deeds

The four tier-4 buildings answer to deeds, and **no finished campaign feeds two of them**:

| Building | Counts | Floors |
|---|---|---|
| Dragon Lair | bosses beaten at least once (`getBossBanners`) | 1, 2, 3, 4, 6 |
| Champion Arena | rematches: boss campaigns finished again after the first victory | 1, 3, 6, 10, 15 |
| Hall of Heroes | finished campaigns that are not a boss (routes), replays included | 1, 2, 4, 7, 10 |
| High Road | leagues covered outside | 1, 15, 40, 90, 200 |

Until 2026-09 one boss run raised the lair, the arena (every boss victory) and the hall (every
finished campaign) at once, and the detail sheets said nearly the same sentence three times. The
lair also stopped at five bosses while six exist, so the sixth raised nothing.

The content behind the hall is thin: two routes, no events. Its floors are low for that reason, and
its top still means replaying them.

**Levels already earned are kept.** Levels are derived, so the recut would have lowered some
buildings with nothing on screen to explain it, and the return sequence can only ever show a rise.
[`drizzle/0060`](../../drizzle/0060_the_day_the_deeds_were_recut.sql) writes `deedsRecutAt` to
`user_preferences` at the first launch of the version that ships the recut. Runs finished before
it are also counted under the old rules, and each deed building shows the higher of the two
levels; its next rung and its bar follow the new rules, and the detail sheet says the level was
kept (`kept`), since "level 2" over "0 rematches" reads as a bug otherwise. A run finished after it
feeds only the new count, so the old one is frozen. A fresh install writes the marker before any
run exists and keeps nothing.

The first version pinned a date in the code, set after the release so no run could drop a level.
The adversarial review caught what that cost: every run between the release and that date was
counted both ways for good, and a boss beaten in that window raised the hall and the arena too.
A date fixed in advance cannot be right on both sides of an unknown release day; the migration runs
on the only day that matters on each phone.

One consequence is deliberate: a hero who had beaten five bosses keeps the old lair at 5 of 5, and
the sixth boss raises nothing for them. Everyone else needs all six.

"Next to rise", once the rep buildings are spent, first offers a style never trained, then the deed
with the most of its bar filled, and between deeds equally far along the fewest units left: a kept
hall at 0 of 7 routes loses to a road one walk away.

## The return from a session

The victory screen's "View Village" passes `grown=farm:3:4,barn:1:2` (`formatGrown` /
`parseGrown` in [db/village.ts](../../db/village.ts), one owner for both sides). The village then
plays once: the painting leans in on the first risen building's anchor (if this tier has one), the
return card rises with that building's before and after paintings, and after about five seconds
everything settles. Tapping the card dismisses it. It is keyed on the param string, so a revisit of
the tab never replays it, and a plain tab visit never plays it. Under reduced motion: no lean, the
card is simply there.

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
| Trophy wall | Defeated bosses: the Journal's "Bosses felled" page, each opening its kill report. Achievements: the Journal's own page. |
| A tile that pulsed once | The return sequence above |
| Gold dots on the painting, one per building (shipped in #92) | Removed the same day at the hero's request: the painting stays clean, and the anchors only aim the lean-in |
| A "finished" card above the panel | Inside the tier block, which already announces the last tier |
| "Divine 44" after "Level 44" | The rank alone |

## Implementation notes

Buildings are **derived, never stored**: `getVillageBuildings()` computes every level from existing
signals (lifetime muscle volume, exercise-style volume, deeds, village tier). The
`village_buildings` and `village_stats` tables are seeded but unused.

Every sentence about a building (next rung, what feeds it, level text, bar ends, family, quest link)
comes from `components/village/rows.ts`, so the rows, "Next to rise", the return card and the
detail sheet cannot phrase the same building two ways. `getBuildingProgress()` is still the single
source for "how far to the next level".

**Anchors** (`constants/villageAnchors.ts`) are data only: where each building stands on each
painting, 6 to 12 per tier, placed by eye on the square `cover` crop the screen shows. They aim the
lean-in of the return sequence and draw nothing. Re-painting a tier means re-placing its anchors.
No tier holds all 21 buildings (the Fountain has no spot on any), and a building with no spot gets
no lean, only the card. The weakest placements: tier 8 (`tent` on a sail, `farm` on crates in a
boat), tier 10 (`dragon_lair` on the rock face), tier 12 (the starters on unnamed spires).

The painting parallaxes and leans in inside one `Animated.View`; the scrims and the title do not
move. Ambient motes are still `VillageEmbers.tsx`. Everything is
transform and opacity on the UI thread, and all of it stops under reduced motion.

The emblems carry an alpha channel, cut by [`scripts/cutout.py`](../../scripts/cutout.py); an
unbuilt row draws the same emblem as a silhouette through `tintColor`, which needs that alpha.
