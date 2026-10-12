---
title: Village
type: screen
route: /village
status: active
updated: 2026-10-11
related: [../gameplay/progression.md, ../gameplay/boss-fights.md, ../gameplay/villagers.md]
sources: [app/(tabs)/village.tsx, components/village/, constants/villageAnchors.ts, db/village.ts, db/crest.ts, db/crestRules.ts, db/milestone.ts]
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
     the hero level of the next tier and how many levels away, and a gold bar from the current
     tier's floor to that level (`xpScale`). The bar says what is done ("320 XP done") before its
     middle and what is left ("only 410 XP to go") from it, with level and XP at both ends; with
     nothing done it has no caption and keeps the two ends. On tier 12 the bar goes and the
     sentence is final. A finished village (`isVillageComplete`: tier 12 and every building that
     can top out has) says so inside the same block, then that the deeds are just below, with no
     count.
   - **Next to rise** (`pickNextToRise`): the building with the fewest sessions or outings to go
     by the hero's own recent pace (`pickSessionMilestone` with no `fed` filter, the same function
     as the victory's PROCHAIN line). An estimate past 30 sessions (`MILESTONE_QUIET_AFTER`, read
     through `quietNextMilestone`) is not a goal: it is the milestone *line* that goes quiet, and the
     choice of building falls back to the reps rule below. A runner sees the Grand Chemin, a strength hero the nearest
     muscle. Only when no building has an estimate within that reach does the older rule apply: the rep building
     fewest reps from its next rung, level 0 waiting while any is still rising, then the deed with
     the most of its bar filled. The name is set in the heading font. Rep buildings carry a bar
     of what is done, between the figures of the rung they stand on ("3,000 reps" to "4,000
     reps", `repsRungStart`), and so does every deed bar (leagues, bosses, rematches, routes) from
     the threshold of the rank it stands on, capped at the tally (`deedBarStart`: the lesser of the
     threshold and the count, so a kept rank standing above the new count starts its bar at the
     count and never shows a left end larger than "done"; `deedProgress`), the same figure the
     deed fallback of "Next to rise" ranks by; and a sentence under it, "Rank 4 in about 3 outings." (`milestoneLine`).
     Never a number of reps still to do. A link named after what raises it: quests filtered on that
     muscle, the outings for the High Road, the adventures for the other deeds. When that building
     is unbuilt the title reads **Next to build** and there is no bar. On **day one** (`isDayOne`:
     nothing earned beyond the three starters; a walk counts) it states the rule instead, and links
     to the first quest.
   - **Since your last quest**, only on arrival from a session: each building that rose, and
     "3 → 4".
   - **Families** (`groupFamilies` in `components/village/rows.ts`): Muscles, Styles, Upgrades,
     Deeds, Starter, each labelled with what feeds it. Unbuilt buildings sit in their family, not
     in a locked drawer. A row is the name, the next rung in words, and "rank 2" with pips
     on the building's **real ceiling** (`buildingCeiling`, the only source: 3 for the six upgrades, 5 for the Lair, the Hall and the Arena, 10 for the starters, the volume buildings and the High Road). The pips never exceed five: a building above rank 5 shows five full pips and its rank as a gold number after them.
     The building "Next to rise" already names keeps its row, marked by a gold edge, so it is found
     where it belongs without being read twice. Day one shows the starters and one "Not built yet"
     list; a finished village leads with the deeds and folds the rest into one family.
   - The foot: "Nothing is managed here."

A building has **three states**: unbuilt (the condition in words, no bar, no "level 1 at 1"),
rising (a bar with its unit), at its ceiling (no bar). `getBuildingProgress` returns null for the
first and the last; it is not the bar's percentage, which counts from the rung's threshold. The one exception is the High Road inside its first league, whose whole-league
tally cannot show a first walk and whose bar can.

Below 700 dp of window height the painting is cut to a band 62% of the width tall (starting 20% in),
so the tier block stays above the fold.

## Ranks 6 to 10 (V-03)

Ranks 6 to 10 exist for the starters, the volume buildings and the High Road. The upgrades stay
at 3, the Lair, the Hall and the Arena at 5 (their content is finite). All three scales are set
for "hold for five years": a regular hero (the golden one, 182 sessions a year) reaches rank 10
around year 5. No release carried ranks above 5 before, so they could be fixed freely.

- Volume floors (`buildingLevelThresholds`): 1, 100, 300, 600, 1 000, then **2 400, 4 800, 10 000,
  20 000, 40 000** work units. Ranks 6 and 7 keep the 0.8 scale that puts the state B Forge
  (2 433 chest units) at rank 6, the figure the mock-ups show.
- Starters (`STARTER_RANK_LEVELS` in `db/village.ts`): hero level 18 / 26 / 34 / 42 / 50 for ranks
  6 to 10. Ranks 1 to 5 are still the village tiers 1 to 5 (levels 1, 3, 5, 8, 10). They used to
  follow the tier and ended at level 25, about 18 months.
- High Road: 500 / 1 000 / 2 000 / 3 500 / 5 500 leagues (were 400 / 700 / 1 100 / 1 700 / 2 500).

The painting is not affected: `buildingStage` stops at `BUILDING_STAGE_LEVEL` (5) and ranks 6 to 10
keep the grand art. Nothing is migrated: levels are derived, so a hero's rank can only rise.

## Stones, seasons, motto

Three things the journal and one preference give a village that is years old. None of them is
stored (R111) except the motto; all of them are absent, not empty, when there is nothing to show.

- **Stones** (`Stones`, in the Ramparts' sheet; `db/villageYears.ts`). One per hero level from 21,
  the level engraved. Drawn as rubble stones laid in courses, each row shifted by half a stone, six
  to a row, one `<Svg>` per row. A record has a single gold edge, an Age a second, inner one (told
  apart by shape, not colour); a stone that is both is an Age. The words are limited to the records,
  the Ages and a summary per decade ("Levels 70 to 79: 94 sessions"), and they are by decade
  whatever the length of the wall, so a screen reader hears one label per decade. Beyond 60 stones
  the drawing itself is cut by decade too. A row measures the room it has (`onLayout`) and scales
  down through its `viewBox`: the shifted row is 308 dp and a 320 dp screen gives less. The
  Ramparts row says "N stones".
- **Seasons** (`Banners`). A banner per finished season that held a session, in the colour of the
  hero's animal at the time (neutral without a crest), rows of at most four per village year. The
  section is not mounted before the first banner, and not at all while the years are unread.
- **Motto** (`preferences.getCrestMotto`). Optional, "none" by default. When set, it is written in
  italic under the shield in the crest sheet, which reads it itself (one reader), and nowhere else:
  not in the header.
- The building sheet scrolls back to the top on each opening.

## Deeds

The four tier-4 buildings answer to deeds, and **no finished campaign feeds two of them**:

| Building | Counts | Floors |
|---|---|---|
| Dragon Lair | bosses beaten at least once (`getBossBanners`) | 1, 2, 3, 4, 6 |
| Champion Arena | rematches: boss campaigns finished again after the first victory | 1, 3, 6, 10, 15 |
| Hall of Heroes | finished campaigns that are not a boss (routes), replays included | 1, 2, 4, 7, 10 |
| High Road | leagues covered outside | 1, 15, 40, 90, 200, 500, 1 000, 2 000, 3 500, 5 500 |

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

No villager in the card: VictoryView already picked the one villager a victory gets, and it is a
line in the victory banner. The Village screen itself is the only place the floating `VillagerCameo`
figure is drawn (see [villagers](../gameplay/villagers.md)).

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
signals (lifetime muscle volume, exercise-style volume, deeds, hero level). The
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
move. The detail sheet keeps its handle and the drag (`dismissOnSnapToBottom`): it also closes by its
button, Android back, or a tap on the scrim. Its scroll view carries `onMoveShouldSetResponder`
so the first tap of a button is not cancelled.
Its section headers
("next to build", recent, and the rest) are the shared `SectionLabel` (12/700, 1.5 tracking, ash).
The status-bar scrim pinned outside the scroll (`village-status-scrim`) is invisible at rest,
so the painting runs full-bleed under the clock, and fades in over the first `insets.top + 48` dp
of scroll, the distance the painting's own top scrim takes to leave, up to an opaque `bgDark`: the clock always has one of
the two behind it. Drawn always, it was an opaque band across the top of the painting. Ambient
motes are still `VillageEmbers.tsx`. Everything is
transform and opacity on the UI thread, and all of it stops under reduced motion. Transform and
opacity only is what lets Reanimated's `ANDROID_SYNCHRONOUSLY_UPDATE_UI_PROPS` path (on in
`package.json`) skip the shadow tree commit each frame. Without it, the arrival cost the Fairphone
6 every frame for ten seconds with just two motes lit (performance.md, "An ambient animation with
no end").

The motes climb **once per visit**, not for ever: the last one is out about ten seconds after the
tab opens, and they light again the next time it does. Nine loops that never ended kept the window
from ever being idle, which cost 602 frames in 10 s of a village nobody was touching, 31 % of a
core, and every `uiautomator dump` on this screen (so Maestro and the accessibility readers too).
The reasoning, and why a rest between climbs could not buy the same thing here, is in
[`performance.md`](../architecture/performance.md).

The emblems carry an alpha channel, cut by [`scripts/cutout.py`](../../scripts/cutout.py); an
unbuilt row draws the same emblem as a silhouette through `tintColor`, which needs that alpha.

## The crest, the milestone line and the feasts

"A village that looks like you" (design: [village-personnalisation](../designs/village-personnalisation.md)).

- **Crest** (`Crest`, read by `getCrest`): the animal of the hero's practice, revealed at the 8th
  session that counts (`REVEAL_AT`). Bear for strength, ermine for calisthenics, salmon for yoga,
  stag for running and walking, horse for cycling, boar when no practice reaches 40 % of the first
  eight (its four quarters show the two leading practices). A second animal joins at 30 % of the
  sessions and at least 20; the stage is young, adult at 40 sessions of its practice, venerable at
  200, legendary at 500 (a big feast of its own, `legendary:<practice>`). A hero whose longest flame
  reached Eternal has won the rare coat (`rareCoat`, a fact of the hero, announced once by a card in
  Tonight, `coat:rare`, only when the portrait of that animal's rare coat ships). The crest sheet
  shows the animal's portrait at 144 dp beside the 96 dp shield. Under them a legend says the stage and the coat the portrait wears
  tonight ("A young bear.", "An adult bear, winter coat.", "A legendary bear, cinnamon coat."; keys
  `crest_<animal>_<stage>`, one per animal because German agrees the article, then `coat_rare_<animal>`
  or `coat_winter`). It is written once the slug is read: while it loads the line holds its place and
  says nothing. In Tonight, the rare coat's card and the demoted legendary's card draw their
  portrait at 64 dp (the legendary's through the same `usePortraitSlug` as the sheet and the big
  feast, so both show the same coat that night), the shield when the base has not shipped. When the hero has won the rare
  coat and its portrait ships for the animal at the centre, the sheet also offers the coat choice
  (`crest-coat`): the rare coat (`auto`, the default) or the usual one (`usual`, which cuts the rare
  and keeps winter); the row is absent otherwise. The legendary stage has a big feast of its own, the
  animal's portrait at 192 dp. Winter is read per region (`regionCode`, northern calendar
  December to February, southern June to August, the ermine has none), and the portrait is a
  chain: rare, then winter, then base ([data rules](../testing/data-rules.md) § 9). The shield adds the longest flame and one ring per village year. The hero can pick another
  animal in Settings or from the crest sheet (`crestAnimal`, `auto` goes back to the sessions'
  animal, a hand-picked one carries a small ink diamond). The header line says "A bear watches
  over Brumeval", "now" in the line (en; "depuis aujourd'hui", "seit heute", "desde hoy" in fr, de, es) on the day of the reveal and never for a hand-picked animal.
- **Milestone line** (`milestoneLine`): under a rising building's bar, "Rank 4 in about 3 chest
  sessions." or "in about 3 outings", the mean of the five latest sessions that fed it, rounded
  up. Never a number of reps to do (`village-copy-no-chores`). Absent at the building's ceiling and where
  nothing has fed the building.
- **Feasts** (`rankFeasts`): small is a line in "Tonight", medium a card, large the full-screen
  `/big-feast` route (one per session: epilogue, reveal, an Age, anniversary, tier). A tier
  sentence names the village ("Brumeval becomes a Flourishing City."); an unnamed village has no
  subject, so every tier is a label ("New tier: Village."), and the full screen, whose kicker
  already says "New tier", shows the bare tier name. See [session](session.md) for the victory.
