---
title: Home
type: screen
route: /
status: active
updated: 2026-09-11
related: [onboarding.md, adventure-details.md, village.md, journal.md, ../gameplay/coach-planning.md]
sources:
  [
    app/(tabs)/index.tsx,
    components/home/HomeHeader.tsx,
    components/home/HomeStage.tsx,
    components/home/OathStrip.tsx,
    components/home/QuickActions.tsx,
    components/home/RestNote.tsx,
    components/home/useSmartAction.ts,
    components/home/useStartQuest.ts,
  ]
---

# Home (`/`)

## Purpose

Home answers four questions in a fixed order, each owned by exactly one block: **who I am**,
**what I do right now**, **where I am going**, **what my training built**. Anything that does not
answer one of those belongs on another screen.

The rule that keeps it honest: **Home carries the action, the Journal carries the explanations.**

## Layout

One strip of status, one scene, one row of doors, and the tab bar. On a 360x800 phone the fixed
chrome is the 52 dp strip and the tab bar, where it used to be about 260 dp with the village band;
the scene takes everything else. Everything is visible without scrolling down to 360x640. The
column only scrolls when a recovery card pushes it.

| Block | Component | Answers |
| --- | --- | --- |
| Status strip | `HomeHeader` | who I am, what my training built: avatar → settings, level + title, XP as `340 / 500`, flame + day count → journal, village crest + tier → village |
| Recovery banner | `SessionRecoveryBanner` | *conditional*: an interrupted session, before anything else is offered |
| Stage | `HomeStage` | what I do right now: one full-bleed scene, **Start**, **Details** |
| Rest note | `RestNote` | *conditional*: one quiet line under the button, never a gate |
| Oath strip | `OathStrip` | where I am going: the objective along the foot of the scene, its rungs as ticks; the way to swear one when there is none |
| Quick actions | `QuickActions` | the ways out, each with its goal on the tile, then the last quest again |

## The stage

One scene, and the button does what it says.

- **Adventure running** → the adventure's cover, step progress, "Continue Adventure" → the
  adventure map. Its step screen has a narrative to tell before the session, so this only navigates.
- **A quest is offered** (oath rule, then weak-area rule, then the day-one on-ramp) → **that
  quest's** cover, title and `4 exercises · Strength · ≈ 20 min`, the reason in grey beside a
  target. **Start** starts the session (`useStartQuest`): one tap from Home to training. The
  session's own countdown or warm-up wait is where a mistap is undone, with its pause. **Details**
  opens the quest screen for the hero who wants to look first.
- **A quest that reads the position** (any outdoor slot) → "See the quest", which only opens its
  screen: the location notice lives there, and a system dialog over a countdown with no warning is
  what that notice exists to prevent.
- **Nothing to go on** → the on-ramp art and "Pick a quest" → the gallery.

A kicker chip names the unusual cases: "Day one", "Adventure". Which branch fires is decided by
[the waterfall](../gameplay/coach-planning.md).

## Quick actions

- **A way out starts on one tap**, at `medium`, with the goal it is about to run written on the
  tile. The location preamble and the refusal notice speak above the row, one at a time.
- **The goal chip, or a long press**, opens `OutingGoalSheet` and saves the pick through
  `withOutingGoal`: the same writer the quest screen's card uses, so the two doors cannot disagree
  about what a goal is.
- **Replay** starts the last workout (`getRecentSessionHistory`) through the same `useStartQuest`
  as the stage. A quest that reads the position is never offered there.

## Visual rules

- One filled button on the screen. The ways out are image tiles, the recovery banner is a tint.
- Gold is for what progresses: XP, flame, oath rungs, adventure steps. Advice is grey.
- Every block reserves its height so nothing jumps as data lands: strip 52, scene flexible with a
  320 floor, row 84 (72 under 700 dp). Blank boxes or skeletons, never spinners, and never a zero
  presented as a fact.
- Use subtle tokenized borders; no bright outline frames.
- Advice never takes the action slot: the rest note is a line, not a card, and never blocks.

## What success looks like

A hero who swore an oath opens Home and sees the quest that advances it, named, with the rung they
are on, and starts it in one tap.

## History

- **2026-09-11**: redesign from the "Bati Home Redesign" design, direction 2d. One 52 dp strip
  absorbs the header and the village (a crest and its tier); the village band and the lifetime
  stats line are gone, the stats being the Journal's. The scene is full bleed. Start starts the
  quest again, with Details beside it. The oath card became a strip at the foot of the scene. The
  "Head out" band became Quick actions: the goal on the tile, a sheet to change it, and a Replay
  tile. The "Set up" toggle is gone.
- **2026-07-31**: the oath now drives the stage ahead of the weak-area rule; the button starts the
  session instead of pushing a second screen with a synonymous button; the scene shows the quest;
  the recovery banner and the rest suggestion were mounted for the first time.
- Earlier revisions of this page described a floating navbar, a "Coach card" and a resource strip.
  None of them exist.
