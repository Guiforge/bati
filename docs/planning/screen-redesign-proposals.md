---
title: Screen Redesign Proposals — options to review
type: planning
status: active
updated: 2026-07-20
related: [../design/design-system.md, roadmap-refactor-ui.md, roadmap-alignment.md, ../screens/README.md, ../content/missing-covers.md]
sources: [app, components, db/schema.ts, docs/screens]
---

# Screen Redesign Proposals — options to review

> **Format**: same pattern as [system-redesign-options.md](system-redesign-options.md) — one
> section per screen, grounded in the current implementation (not invented), a proposal, and
> a checkbox decision. Nothing here is built yet; once choices are made, move the approved
> items into [roadmap-refactor-ui.md](roadmap-refactor-ui.md) execution order and the code
> follows.
>
> **Constraint for every proposal below**: must pass
> [design-system.md](../design/design-system.md) as-is — dark-only, one primary CTA per
> screen, tokens only, ≤2 taps to the next workout action, no new visual language. This is a
> layout/IA pass on top of the existing design system, not a redesign of the system itself.

## Decisions (2026-07-20)

| § | Topic | Decision |
| --- | --- | --- |
| [1](#navigation) | Navigation | **B — keep Adventures + Quests as two separate tabs** (against recommendation A) |
| [2](#onboarding) | Onboarding | **A — merge avatar + name into one screen** |
| [3](#village) | Village | **A — 3-layer visual system** (tier + sport overlay + per-boss banner) |
| [4](#dead-code) | Dead code | **Delete `ContinueAdventureFab.tsx`** |
| [5](#session) | Session imagery | **A — render real `exercise.imagePath`** |

All 5 resolved. §1 went against the doc's recommendation — noted in that section, not
re-argued; the reasoning for keeping two tabs is the caller's to state if it matters later.
See [Plan for devs](#plan-for-devs) for what happens next.

## Why this doc exists

A review of the current build (code, not just docs — see `sources`) found the core screens
already close to the target: Home resolves "adventure or quest" for the user via
`useSmartAction`, Session has a live boss HP bar, Victory fires level-up/PR/achievement cards
with confetti. The gaps are narrower than a rebuild:

1. Two top-level nav destinations (Adventures, Quests) duplicate a choice Home already makes.
2. Onboarding's avatar step is a heavy, full-screen swipeable moment for what is a low-stakes
   cosmetic choice, bundled awkwardly apart from the (also low-stakes) name step right after
   it — and captures no fitness signal at all, so the coach/suggestion system has nothing to
   personalize from on day one.
3. Village's tier badge is one generic icon reused across all 5 levels, dominant-sport is
   text-only, and every boss banner uses the same generic crown icon — the screen literally
   named as the visual reward layer currently gives almost no visual feedback.
4. The most-viewed screen during a workout (`ActiveExerciseView`) shows a static generic
   muscle icon in the hero image slot for every exercise — the schema already has a
   per-exercise `imagePath` (`db/schema.ts:52`), it's just not rendered.
5. One dead component (`ContinueAdventureFab.tsx`) duplicates Home's hero CTA and is never
   rendered.

Everything else reviewed (session mechanics — HP bar, haptics, rep-counter bounce; Victory;
Journal) is functioning as designed — not included below as a proposal, just confirmed
working.

---

## 1. Navigation — merge Adventures + Quests {#navigation}

**Current**: 5 top-level tabs — Home, Adventures, Quests, Village, Journal
(`app/(tabs)/_layout.tsx`). Home's hero widget already picks one action for the user
(`components/home/useSmartAction.ts`: active adventure run → suggested quest → quest
gallery), but the tab bar still presents Adventures and Quests as two equal-weight
destinations.

### Option A — Merge into one "Train" tab with a segmented toggle

One tab, one icon. Inside: a segmented control — **Program** (adventures) / **Quick session**
(quests) — defaulting to whichever the user has active or used last.

```text
┌─────────────────────────────────────┐
│  ← Train                             │
├─────────────────────────────────────┤
│   [ Program ]   [ Quick session ]    │  ← segmented, one active
├─────────────────────────────────────┤
│   (existing gallery content,         │
│    unchanged — cards, filters)       │
└─────────────────────────────────────┘
```

- ➕ 4 tabs instead of 5; matches "minimal choices" from `positioning.md`
- ➕ Zero content change — same two galleries, same detail screens, same routes underneath
- ➕ Your stated mental model (program vs. quick session) becomes the literal UI label, not
  something inferred from "Adventures"/"Quests" naming
- ➖ One extra tap to reach quests specifically if a user always wants quick sessions (mitigated: Home's smart CTA still deep-links straight past this screen for the common case)

### Option B — Keep two tabs, do nothing

- ➕ Zero effort, zero regression risk
- ➖ Leaves the duplicated choice in place; doesn't act on the "simple" requirement

**Recommendation: A.**

**Choice: ☐ A ☑ B — decided 2026-07-20.** Nav stays as-is: 5 tabs, Adventures and Quests
remain separate. No nav work scheduled from this doc.

---

## 2. Onboarding — merge avatar + name, keep total steps flat {#onboarding}

**Current**: `presentation → choose-avatar → village-name` (3 steps, `app/onboarding/*`).
`choose-avatar` is a full-screen, swipe-gesture, background-swapping moment
(`app/onboarding/choose-avatar.tsx`) for what is a low-stakes cosmetic pick — disproportionate
weight for the decision it represents, and it sits apart from `village-name`, a second
low-stakes step right after it that could live on the same screen. Separately: no step
anywhere captures fitness level or focus, so the coach/suggestion system has nothing to
personalize from on day one.

### Option A — One combined "Choose your hero" screen (avatar + name), plus a short level step

Two screens replace three: `presentation → hero-setup → training-level`. Net step count stays
the same as today, but the heavy full-bleed avatar-swipe interaction is replaced by a small
horizontal avatar strip (tap to pick, no gesture, no full-screen background swap) with the
name input directly below it — one screen, one CTA, both low-stakes choices resolved together.
The level step (proposed last round) still lands as the final, skippable step.

```text
┌─────────────────────────────────────┐
│  ●●○     (progress dots, 3 steps)   │
│                                       │
│        Choose your hero              │
│                                       │
│   ( 🧑 ) ( 🧔 ) [ 👩 ] ( 🧑‍🦱 ) ( 🧕 )  │  ← small strip, tap to select
│                                       │
│   Village name: [ Ironhold_______ ]  │
│                                       │
│              [ Continue ]            │
└─────────────────────────────────────┘
```

- ➕ Directly answers "too big / need something simpler": the avatar step stops being its own
  full-screen production and becomes one row inside a lighter combined screen
- ➕ Same 3-step total as today (`presentation → hero-setup → level`), so this isn't "one more
  screen" — it's the avatar+name merge paying for the level step's cost
- ➕ Reuses existing pieces: `AVATARS`/`getAvatarById` for the strip, the existing name
  `TextInput` + validation from `village-name.tsx`, `ProgressDots`
- ➖ Loses the current full-bleed avatar preview as a moment of its own — acceptable, since
  the avatar reappears immediately on Home's header afterward

### Option B — Keep 3 separate steps as-is, add level as a 4th

The version proposed last round: leave avatar and name as separate full screens, insert level
as a new 4th step.

- ➕ Smallest diff from current code
- ➖ Doesn't address "too big" — the heavy avatar screen stays exactly as heavy, and total
  friction grows to 4 steps instead of staying flat at 3

**Recommendation: A** — it's the only option that both fixes the "too big" feedback and adds
the personalization signal without growing total onboarding length.

**Choice: ☑ A ☐ B — decided 2026-07-20.**

---

## 3. Village — layered visuals so feedback varies by tier, sport, and boss {#village}

**Current**: `components/village/VillageScene.tsx` renders tier name + level as text, one
static generic castle icon (`icons.castle`) reused for all 5 tiers
(`hameau → village → bourg → cité → cité florissante`), a flame icon + text for streak,
dominant-sport as plain text, and every boss banner uses the same generic crown icon
(`<Crown>`). `progression.md` already specifies "5 illustrated tiers" plus overlays as the
target; the code renders almost none of it visually — level, sport, and boss victories all
read as text right now, on the one screen whose entire job is to be the visual payoff.

**Design instinct to resist**: "different image per sport per level per boss" sounds like it
wants a full combinatorial art set (5 tiers × N sports × N bosses = a lot of paintings). It
doesn't need to — `progression.md` already frames this correctly as **layers on one scene**,
not separate paintings per combination. Keep that: one base illustration per tier, with small
independent overlays stacked on top. This is also why Option A below stays inside a "content
swap, not a rebuild" scope.

### Option A — Three independent asset layers on the existing scene

1. **Base scene (5 assets)** — one illustration per tier, swapped by `scene.tier`. Unchanged
   from the original village proposal.
2. **Sport-focus overlay (small sprite, one per muscle group already in `MUSCLE_LABELS`)** —
   a small foreground motif keyed to `scene.dominantSport.muscle` (e.g. a training-dummy
   silhouette for arms, a track/road motif reserved for when running ships later). Reuses the
   muscle→identity mapping that already exists for `exercise-colors.md`; this is the layer
   that answers "feedback that varies by sport."
3. **Per-boss banner icon (one small icon per boss, not a full painting)** — bosses are
   already a finite, named content set (e.g. "The Iron Golem") with their own key art on the
   Adventure detail screen (`adventures.imagePath`, `db/schema.ts:179`). Reuse a cropped/small
   version of that existing art as the banner icon instead of commissioning new assets or
   reusing the generic crown for every boss.

Flame intensity is already implemented as its own overlay (`FlameFlicker`, 5 levels per
`progression.md`) — no new work needed there, it's the existing proof this layering approach
already works in this codebase.

```text
┌─────────────────────────────────────┐
│  ← My Village                        │
├─────────────────────────────────────┤
│                                       │
│   [ tier illustration ]              │  ← layer 1: base, by scene.tier
│     + [sport motif in corner] 💪     │  ← layer 2: by dominantSport.muscle
│     + 🔥🔥🔥 flame overlay            │  ← existing: by streak
│                                       │
│           Cité florissante           │
│              Level 24                │
│      Training focus: Arms            │
├─────────────────────────────────────┤
│  🏆 Banners                          │
│  [Iron Golem art] The Iron Golem     │  ← layer 3: per-boss icon, not generic crown
│  [Storm Wyvern art] Storm Wyvern     │
└─────────────────────────────────────┘
```

- ➕ Answers the ask directly: level, sport, and boss victories each get their own distinct
  visual, without needing a combinatorial art set
- ➕ Layers 2 and 3 are cheap — a sprite per muscle group (already-enumerated, small set) and
  reused/cropped boss art that already exists for adventures, not new full paintings
- ➕ No new screen or interaction, same data (`getVillageScene()` already returns tier, flame,
  dominant sport, and boss banners — this is a rendering gap, not a data gap)
- ➖ Still real art/content work: 5 base tiers + a sprite per muscle group, coordinated with
  whoever owns `docs/content/image-prompts.md`

### Option B — Leave as-is, text + generic icons

- ➕ Zero cost
- ➖ Level, sport focus, and boss victories all stay invisible as *feedback* — the data is
  computed correctly but nothing in the UI shows it

**Recommendation: A** — flag to whoever owns art/content generation as an asset-production
task (base tiers + muscle sprites + boss icon crops), not a dev task; the dev-side change is
a template that layers pre-supplied images, which is small.

**Choice: ☑ A ☐ B — decided 2026-07-20.**

---

## 4. Dead code — delete `ContinueAdventureFab.tsx` {#dead-code}

Not a design decision, just cleanup: `components/home/ContinueAdventureFab.tsx` duplicates
`CurrentAdventureWidget`'s CTA (same `useSmartAction()` call, same label/action) as a
floating button, but is never imported anywhere (`grep` across `app/` and `components/`
confirms zero usages). Delete it — no behavior change, removes a trap for the next person who
touches Home.

**Choice: ☑ Delete ☐ Keep for a future use — decided 2026-07-20.**

---

## 5. Session — render the real exercise image, not a placeholder icon {#session}

**Current**: `ActiveExerciseView.tsx` (the screen shown for every single exercise, the most
time spent in the app per session) renders a static `GameIcon name="muscle"` in the hero image
slot for every exercise, with a code comment admitting it: `/* In a real app, we'd resolve
currentEx.exercise.imagePath */` (line 210). `RestView.tsx`'s "Up next" card does the same
(`GameIcon name="muscle"`, line 212). The schema already has the field:
`exercises.imagePath` (`db/schema.ts:52`, defaults to `assets/placeholder.jpg`) — this is a
rendering gap, not a missing-data gap.

The mechanics around it are already good and need no change: haptic feedback on completion,
the rep counter's bounce animation on adjustment, the boss HP bar's live damage numbers
(critical hits, weakness bonus) during `ActiveExerciseView`/`RestView`. Those are the "ludique
feedback during session" the retention research pointed at, and they're already shipped.

### Option A — Render `currentEx.exercise.imagePath` in both spots

Swap the placeholder `GameIcon` for the real exercise image in `ActiveExerciseView`'s hero
slot and `RestView`'s "up next" thumbnail; keep the same layout, same card treatment.

```text
┌─────────────────────────────────────┐
│  Round 2/3            Exercise 3/5   │
│  ⚔️ Boss HP ████████░░░░░░  62/100   │
│                                       │
│   [ REAL exercise photo/art ]        │  ← was: generic muscle icon
│                                       │
│         Diamond Push-ups             │
│          How to do it ⌄              │
│                                       │
│         ( − )  12  ( + )             │
│              reps                    │
│                                       │
│         [ Complete Exercise ]        │
└─────────────────────────────────────┘
```

- ➕ Directly fixes the biggest visual gap in the screen the user spends the most time on
  mid-workout
- ➕ Zero new interaction, zero new screen — an `Image` swap in a slot that already reserves
  the space for it
- ➕ Content already has a pipeline for this (`docs/content/content-generation.md`,
  `image-prompts.md`); if per-exercise art isn't fully populated yet, this also surfaces which
  exercises are still on the placeholder, which is useful signal on its own
- ➖ Depends on `exercises.imagePath` actually being populated with real art for the full
  catalog, not just the default placeholder — worth checking coverage before treating this as
  "just render it" (see `docs/content/missing-covers.md`, which already tracks a similar gap
  for other content)

### Option B — Leave the generic icon, don't invest in per-exercise art

- ➕ Zero cost
- ➖ The core "am I doing the right thing, does this feel alive" moment during every single
  exercise stays generic regardless of what you're training

**Recommendation: A**, gated on confirming real image coverage across the exercise catalog
first (a content-inventory check, not a design decision) — see
[missing-covers.md](../content/missing-covers.md).

**Choice: ☑ A ☐ B — decided 2026-07-20.** Note: `docs/content/missing-covers.md` and a
`scripts/generate-covers.py` pipeline already exist in the working tree (uncommitted, from
outside this doc's work) — worth checking whether that pipeline already covers exercises
before generating anything new for this item.

---

## What's already right — do not touch

- **Session mechanics**: live `BossHpBar`/`BossTauntOverlay` with damage numbers, manual
  "I'm done" completion (no silent auto-advance), rep-counter bounce animation, haptics on
  every completion. Matches `session-flow.md` and the sport-first rule — §5 only swaps the
  static placeholder image, the interaction model is untouched.
- **Victory**: level-up card, `NewRecordsBadge`, achievement unlocks, confetti + sound,
  sticky single Continue CTA, warm empty state when nothing's new. This is the accomplishment
  moment done right — no proposal needed.
- **Home**: single smart CTA already collapses "adventure or quest" into one decision-free
  action; streak/sessions/XP stat row.
- **Onboarding immersion**: full-bleed backgrounds, gradient overlays, the stamp animation on
  village naming — §2 keeps that treatment on the merged screen, it only removes the
  full-screen swipe-gesture interaction for avatar picking, not the visual style.

## Plan for devs

> All 5 checkboxes are resolved (see [Decisions](#decisions-2026-07-20)). This section still
> stays a pointer, not an execution plan — the task breakdown and PR sequencing is a separate
> next deliverable, not part of this doc.

**Approved for scheduling**: §2 (onboarding merge), §3 (village 3-layer visuals), §4 (delete
`ContinueAdventureFab.tsx`), §5 (render real exercise imagery). **Not scheduled**: §1 —
navigation stays as-is, no work follows from it.

1. ~~Get checkboxes above resolved~~ — done 2026-07-20.
2. For the 4 approved items, add them to the execution order in
   [roadmap-refactor-ui.md](roadmap-refactor-ui.md) at the appropriate phase: §4 (dead code) is
   Phase B, high-impact flow, and the smallest/safest to schedule first; §2 (onboarding merge)
   is Phase B too — onboarding is item 9 in that order today, but this change is small enough
   to pull forward; §3 (village layers) and §5 (exercise imagery) are gated on content/art
   production, not pure UI PRs — sequence those with whoever owns `docs/content/`, and check
   the existing `scripts/generate-covers.py` pipeline (currently uncommitted in the working
   tree) before commissioning new art for either.
3. Each change still goes through the existing gate: one scope per PR, before/after
   screenshots, [ui-checklist.md](../design/ui-checklist.md) pass, `npm run check` + `npm test`.
4. Update this file's checkboxes to reflect decisions, then update
   [ui-screen-audit-tracker.md](ui-screen-audit-tracker.md) once each is implemented (that
   tracker is the implementation log; this file is the decision record).

## Related

- [design-system.md](../design/design-system.md) — the rules every proposal above must pass
- [roadmap-refactor-ui.md](roadmap-refactor-ui.md) — where approved items get scheduled
- [system-redesign-options.md](system-redesign-options.md) — same doc pattern, prior example
- [../content/missing-covers.md](../content/missing-covers.md) — existing image-coverage gap
  tracker + generation pipeline (`scripts/generate-covers.py`), relevant to §3 and §5's art needs
- [../screens/village.md](../screens/village.md), [../screens/home.md](../screens/home.md),
  [../screens/onboarding.md](../screens/onboarding.md), [../screens/session.md](../screens/session.md) —
  current-state specs these proposals build on
