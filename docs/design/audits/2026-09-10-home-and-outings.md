---
title: Design audit, starting a session and setting up an outing
type: design
status: active
updated: 2026-09-10
related: [2026-09-10.md, ../audit-protocol.md]
---

# Design audit, starting a session and setting up an outing

The brief, from the person who owns the product: *"sur la partie home, je trouve que le départ des
quêtes et leur modification quand ce sont des 'sorties' extérieures ne sont pas ergonomiques."*
Two surfaces then: how a session gets started from Home, and how an outdoor outing gets configured
before it starts. Not a complaint about how it looks. A complaint about the number of moves, and
about the outdoor case feeling bolted on.

Built on [2026-09-10.md](2026-09-10.md), which already covers Home's day-one card (§2.10) and the
quest detail's dilution (§3, "Choosing what to do"). Nothing here repeats those.

Sources: shots `01`, `02`, `03`, `08`, `09`, `10` of the seeded English run; the source of
[`OutsideBand.tsx`](../../../components/home/OutsideBand.tsx),
[`useSmartAction.ts`](../../../components/home/useSmartAction.ts),
[`edit.tsx`](<../../../app/(tabs)/quests/edit.tsx>),
[`QuestConfigCard.tsx`](../../../components/quests/QuestConfigCard.tsx) and
[`OutingGoalSheet.tsx`](../../../components/quests/OutingGoalSheet.tsx).
`13-quest-editor.png` is **still** the Expo dev menu, as §7 of the earlier audit recorded, so every
editor finding below comes from the code and says so.

**One flow is fine and is not the problem.** `OutingGoalSheet` is the right screen: presets in the
hero's own vocabulary (20 / 30 / 45 / 60 min, 5 km / 10 km / half), it opens on the tab of the goal
that would actually run, and its input survives a French comma. The wound is everything between
Home and it, and the fact that what it writes does not survive the trip back.

---

## The moves, counted

**Starting the workout Home is already offering.** 2 taps, 2 screens.

1. Open the app. Home's stage names the quest, its art, "3 exercises · Circuit · ≈ 10 min" and why
   it was picked (shot 01).
2. Tap **See the quest**. Lands on `/quests/{id}`.
3. Tap **Start Quest**, pinned in the bottom bar, no scroll needed (shot 09).

Mid-week, the hero needs step 3. Step 2 is a screen that re-prints the four facts already read on
Home, then adds a level row, a config card and a card per movement.

**Starting a different workout.** 3 taps minimum plus a hunt, 5 with a filter.

1. Home → tab **Quests**.
2. Optional: open one of Duration / Type / Muscles / Equipment, then tap a chip. +2 taps.
3. Scroll the 37-card list. At roughly three cards per screen (shot 08), that is up to a dozen
   swipes.
4. Tap the card → detail. 5. Tap **Start Quest**.

Mid-week the hero almost always wants a workout they have already done. Nothing on this path is
about that.

**Starting an outing at the distance or duration wanted today.** 5 taps, 3 surfaces, 2 scrolls.

1. Home → tap **Set up** in the band header (shot 01).
2. Tap the tile → `/quests/{id}?from=home`.
3. Scroll to **Adjust this quest**. Open by default on an outing (`singleControl`), but below the
   cover, the title card and the tag row.
4. Tap **Set up the outing**.
5. Tap a preset chip. A typed value costs 3 taps instead of 1.
6. Scroll back down, tap **Start Quest**.

The hero needs step 5. Everything else is transport.

**Changing an outing's target before starting it.** Identical to the above: there is no second
route, and the change does not survive (finding 1).

**Starting an outing with no number on it.** 1 tap on the tile. This one is genuinely good and is
the shape everything else should be measured against.

---

## Findings

### 1

**[where]** outing setup
**[from]** source, [`components/home/OutsideBand.tsx:205-213`](../../../components/home/OutsideBand.tsx), against [`app/(tabs)/quests/[id].tsx:556`](<../../../app/(tabs)/quests/[id].tsx>)
**[severity]** blocker
**[claim]** The band's tile throws away the goal the hero set on the quest screen, so the whole five-tap setup flow has to be walked again every single time they go out.
**[evidence]** `startOuting` calls `loadConfiguredQuest(questId, Difficulty.Medium)` and then
`startSession(loaded.quest, loaded.level, { goal: null })`. The `null` is hard-coded. A distance
lives in `config.distanceM` and is read only by `outingGoal()`, which this path never calls, so a
saved 10 km is invisible here. Meanwhile the card that wrote it says, in its own hint, *"Saved for
this quest. It comes back next time."* It does not. The quest screen, one file over, passes
`goal: outingGoal(quest, config.distanceM ?? null)`.
**[fix]** Have `loadConfiguredQuest` return the `saved` config it already reads (it currently drops
it on the floor at line 314), and pass `outingGoal(loaded.quest, saved?.distanceM ?? null)`. The
`null` intent is preserved for a hero who never set one: `outingGoal` returns the slot's duration
only when a duration was written, and the seed's suggestion is not a hero's choice, so gate on
`hasQuestOverrides(saved)` if the "no number on it" rule must hold exactly.

### 2

**[where]** outing setup
**[from]** source, [`app/(tabs)/quests/[id].tsx:542-563`](<../../../app/(tabs)/quests/[id].tsx>) against [`components/home/OutsideBand.tsx:158-164`](../../../components/home/OutsideBand.tsx)
**[severity]** blocker
**[claim]** The Set up path bypasses the live-session guard the one-tap path has, so configuring an outing while one is paused silently destroys it and orphans every GPS fix it wrote.
**[evidence]** `startOuting` refuses to start over a live session: *"an outing paused by the
hardware back button still holds its uuid and its points. `startSession` would overwrite it and
orphan every fix it had written, so the tap rejoins it instead."* The tile's `setup` branch three
lines below pushes straight to `/quests/{id}` with no such check, and `proceedToSession` on that
screen guards only against a double tap (`isStarting`). `startSession` then mints a fresh
`sessionUuid` and overwrites the store unconditionally. The hero who wanted to *change* a goal is
exactly the hero most likely to have a walk paused.
**[fix]** Move the guard into `startSession` itself, where every caller routes through: if `status`
is neither `idle` nor `finished`, refuse and let the caller navigate to `/session`. One check, and
`OutsideBand` can then delete its own copy.

### 3

**[where]** outing setup
**[from]** source, [`components/home/OutsideBand.tsx:137,245-259,304-315`](../../../components/home/OutsideBand.tsx) and shot 01
**[severity]** friction
**[claim]** "Set up" is an invisible mode toggle that rewrites what all three tiles do, and it resets itself on every focus, so the hero cannot tell which gesture they are about to make.
**[evidence]** `setup` is a boolean. On, a tile opens a screen; off, a tile starts a GPS session.
The only visible difference is the 22 dp play disc appearing or disappearing from the tile corner
(shot 01, top right of each thumbnail). The word "Set up" does not change, does not gain a filled
state beyond a colour swap on a 13 px label, and the sentence explaining the mode exists only in
`accessibilityLabel` ("Set up an outing before heading out") where no sighted user reads it.
`useFocusEffect` clears it on every focus, so coming back from the quest screen puts the tiles back
in "leaves now" mode under a thumb that just learned the opposite.
**[fix]** Delete the mode. Put the goal on the tile: a second line under the name showing the saved
goal, or "No goal" when there is none, and long-press or a 44 dp chevron for the sheet. If the mode
must stay for now, make the tiles visibly different in it (swap the play disc for the sliders glyph
rather than removing it) and stop resetting it on focus.

### 4

**[where]** outing setup
**[from]** source, [`components/quests/QuestConfigCard.tsx:264-305`](../../../components/quests/QuestConfigCard.tsx)
**[severity]** friction
**[claim]** The single decision an outing has is buried four containers deep, behind a disclosure whose title asks about the quest and not about tonight.
**[evidence]** The path to one number is: quest screen → a card headed **Adjust this quest** →
inside it an `OutingGoalRow` → a button reading **Set up the outing** → a modal sheet headed **How
long, or how far** → a chip. Three separate headings say the same thing in three registers before
the hero touches a value. On an outing that card holds one control (`ShapeSteppers` suppresses
rounds, `restsBetween*` are both false, the per-slot steppers are replaced by a plain name), so the
disclosure is a fold over a single row.
**[fix]** On an outing, drop the fold and the intermediate row: render the goal chips
(`DURATION_PRESETS_SECONDS`, `DISTANCE_PRESETS_M`) inline on the quest screen where the level chips
sit on a workout, with "Other" opening the sheet. The sheet stays for typed values only.

### 5

**[where]** quest editor
**[from]** source, [`app/(tabs)/quests/edit.tsx:436-470`](<../../../app/(tabs)/quests/edit.tsx>) with [`db/targets.ts:23,105-114`](../../../db/targets.ts)
**[severity]** friction
**[claim]** Authoring an outing in the editor asks for its duration in five-second steps over a twelve-hour range, so a 45 minute walk is 534 taps on a plus button.
**[evidence]** `addExercise` seeds an expedition movement at `DEFAULT_TARGET_VALUE.time`, which is
**30**. The row's `Stepper` runs `min` 1 to `targetRangeFor("time", NON_REP_STYLE).max`, which is
`OUTING_TARGET_MAX`, **43 200**, with `step = REST_STEP = 5`. 30 s to 2 700 s is 534 presses. This
is the exact wound `OutingGoalSheet` was built to close, and its own header comment says so:
*"the stepper this replaces moved in five-second steps, so 15 min to 45 min was 360 taps."* The
quest screen got the fix; the editor never did.
**[fix]** Reuse it. When the picked movement's style is `NON_REP_STYLE`, replace the target
`Stepper` with the same preset chips plus "Other", and seed a new outdoor slot at 30 minutes rather
than 30 seconds.

### 6

**[where]** quest editor
**[from]** source, [`app/(tabs)/quests/edit.tsx:428-499`](<../../../app/(tabs)/quests/edit.tsx>)
**[severity]** friction
**[claim]** The editor does not know outings exist: it asks a walk how many rounds and how long to rest between them, and offers no way to write a distance at all.
**[evidence]** `pickableExercises` filters on `retiredAt` only, so the three expedition movements
are pickable and a hero can author their own outing, which
[`expeditions.md`](../../gameplay/expeditions.md) says is supported. The form then renders **Rounds**,
**Rest** ("Between exercises") and **Round rest** ("Between rounds") unconditionally. The quest
screen suppresses exactly these for an outing, and `QuestConfigCard` explains why: *"Three rounds of
walking is not a thing anyone does, and a control offered on a screen is a decision asked of the
hero."* The editor asks all three. The per-row unit chips are **Reps** and **Seconds**; there is no
distance, so a hero-written 10 km outing cannot be authored, only configured after the fact through
the quest screen.
**[fix]** Port the same predicate: when every picked movement is outdoors, hide Rounds and both
rests, and turn the unit chips into Duration / Distance. `isOutingSession` already exists in
`db/expeditions.ts` and takes the shape the editor is holding.

### 7

**[where]** home
**[from]** shot 01, source [`components/home/useSmartAction.ts:66-89`](../../../components/home/useSmartAction.ts) and [`components/home/OutsideBand.tsx:109-114`](../../../components/home/OutsideBand.tsx)
**[severity]** friction
**[claim]** Home's one filled button navigates instead of starting, on a rule the app has already broken twelve pixels lower down.
**[evidence]** The earlier audit raised the symptom (§3, "Home's one filled button opens a page
about the workout instead of starting it"); this is the cause and the counter-argument. The comment
on `questAction` states the rule: *"Only the detail screen starts a session, Home never pushes a
session route."* `OutsideBand`, rendered directly under it, pushes a session route on a single tap,
and its own comment argues the case: *"Going out is a decision taken while walking towards the door,
and the screen that used to sit in between only ever asked one question the leaver did not have."*
That argument is not about the outdoors. It is about a hero who has already decided, which is every
mid-week open of this app. Two adjacent controls on one viewport, one starting and one browsing, and
the browsing one is the primary blue.
**[fix]** Make **Start** the primary on the stage and demote "See the quest" to a text link under
the meta line, matching what the band already does. The card names the quest, its art, its movement
count and its minutes, which is the same information the tile carries with less.

### 8

**[where]** home
**[from]** shots 01, 08, source [`app/(tabs)/quests/index.tsx:531,642`](<../../../app/(tabs)/quests/index.tsx>)
**[severity]** friction
**[claim]** Home offers exactly one workout and no second, so wanting anything else costs a tab, a hunt through 37 cards and two more screens, while the pinned set that solves it already exists in the database and Home never reads it.
**[evidence]** `useSmartAction` is a waterfall that sets one config and returns. Its five rules
produce a single card. Anything else means the Quests tab, where `galleryOrder(quests, isUserQuest,
favourites)` already sorts pinned quests to the top and each card carries a star (shot 08, and
`toggleFavouriteQuest` is wired). Home imports none of it. The stage's own subtext explains the
algorithm's choice ("Strengthens your weak points: Arms, Chest, Back"), which is an argument, and
an argument invites disagreement with nowhere to take it.
**[fix]** A second row under the stage, same tile shape as the band: pinned quests first, then the
last three completed, each starting on tap. `getFavouriteQuestIds` and `listCompletedSessions` are
both already there.

### 9

**[where]** outing setup
**[from]** source, [`components/home/OutsideBand.tsx:304-315`](../../../components/home/OutsideBand.tsx) and shots 09, 10 for the layout it lands on
**[severity]** friction
**[claim]** Set up sends a hero who wants one number to the full quest screen, which is built to sell a workout to someone who has not chosen yet.
**[evidence]** The tile pushes `/quests/{id}?from=home`, the same route the gallery uses. What
loads above the goal, in order: a 4:3 cover, a title card with the flavour text, a tag row of
rounds / exercises / rest / estimate / XP / XP-per-minute, then **Adjust this quest**. Shots 09 and
10 show that stack on a workout; an outing loses only the level row (`isOuting ? null`), so the
goal sits at roughly the same depth. Below it, a full movement card for a walk, with a description,
an equipment tag and a muscle list. The hero already picked the quest, on Home, two taps ago.
**[fix]** With `from=home`, open the goal sheet directly over the band, and let it start the
session on pick. Finding 3 removes the mode that leads here; this removes the destination.

### 10

**[where]** outing setup
**[from]** source, [`components/quests/QuestConfigCard.tsx:76-104`](../../../components/quests/QuestConfigCard.tsx)
**[severity]** friction
**[claim]** The goal is printed as a label with a button beside it, so the one number on the screen is the one thing on it that cannot be tapped.
**[evidence]** `OutingGoalRow` renders "Distance / 10.0 km" as two `Text` nodes, then a separate
full-width outline button reading "Set up the outing" to change it. The value carries `$primaryText`
and 17 px bold, which is the loudest thing in the card, and it is inert. Every other adjustable
number on the quest screen is inside a control the hero touches directly.
**[fix]** Make the value the button. One `AppButton` labelled with the goal itself, "10.0 km",
opening the sheet, and drop the row above it.

### 11

**[where]** home
**[from]** shot 01, source [`components/home/OutsideBand.tsx:349-367`](../../../components/home/OutsideBand.tsx)
**[severity]** polish
**[claim]** A 22 dp decorative disc is the only thing on Home that distinguishes a control which starts a GPS session from a control which opens a screen.
**[evidence]** Shot 01: the three tiles are art, a name, and a small play triangle top right. The
code calls that disc *"the only thing that separates a tile that leaves from a tile that reads"*,
and it is `pointerEvents="none"`. Every other start in the app is a full-width filled button with a
verb on it. The prior audit's stranger read the play triangles as "this starts now" and was right,
which is the problem: the same reading is correct in one mode and wrong in the other.
**[fix]** Once finding 3 removes the mode, the tile has one meaning and can say it: keep the disc
and add the goal line under the name, so a tap has a visible consequence written on it.

### 12

**[where]** home
**[from]** source, [`components/home/useSmartAction.ts:174-192`](../../../components/home/useSmartAction.ts)
**[severity]** polish
**[claim]** An oath sworn in leagues promotes an outing to the stage and then routes it through the workout flow, so the hero gets the five-tap setup path for the one goal the app itself chose to feature.
**[evidence]** Rule 2b picks `listOutings()[0]` and hands it to `questAction`, which builds a "See
the quest" card. The comment concedes the shape: *"the hero picks the duration on the quest
screen."* So the one case where Home knows the hero is training for leagues is the case where it
offers the slowest route to setting a distance, while the band six pixels below can start the same
quest in one tap.
**[fix]** When rule 2b fires, make the stage's button open the goal sheet rather than the quest
screen, with the oath's own unit preselected. Same sheet, one tap instead of five.

---

## Where to start

Two bugs, then the mode.

1. **Finding 2** first: it is the only one that destroys data, it is a guard in `startSession` that
   every caller already wants, and it deletes duplicated code rather than adding any.
2. **Finding 1**: the goal the hero saved must be the goal that runs. One value threaded through
   `loadConfiguredQuest`.
3. **Finding 3**, which subsumes 9 and 11: the "Set up" mode is the bolted-on feeling the brief
   names. The tile carries the goal, a chevron opens the sheet, the mode disappears.
4. **Findings 5 and 6** together, one pass over the editor with predicates and a component that
   both already exist.
5. **Finding 7** is one line of hierarchy on the stage and the largest single saving for a
   mid-week open. **Finding 8** is the follow-up it invites.
