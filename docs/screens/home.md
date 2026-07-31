---
title: Home
type: screen
route: /
status: active
updated: 2026-07-31
related: [onboarding.md, adventure-details.md, village.md, journal.md, ../gameplay/coach-planning.md]
sources:
  [
    app/(tabs)/index.tsx,
    components/home/HomeStage.tsx,
    components/home/useSmartAction.ts,
    components/home/RestNote.tsx,
  ]
---

# Home (`/`)

## Purpose

Home answers four questions in a fixed order, each owned by exactly one block: **who I am**,
**what I do right now**, **where I am going**, **what my training built**. Anything that does not
answer one of those belongs on another screen.

The rule that keeps it honest: **Home carries the action, the Journal carries the explanations.**

## Layout

Fixed chrome frames a scrolling centre. Top and bottom never scroll.

| Block | Component | Answers |
| --- | --- | --- |
| Status strip | `HomeHeader` | who I am — avatar → settings, level + title, XP bar, flame → journal |
| Recovery banner | `SessionRecoveryBanner` | *conditional* — an interrupted session, before anything else is offered |
| Stage | `HomeStage` | what I do right now — one scene, one primary button |
| Rest note | `RestNote` | *conditional* — one quiet line of advice, never a gate |
| Oath card | `OathCard` | where I am going — the one objective slot, plus its rung on the ladder |
| Lifetime legend | `StatsOverview` | one line: quests + XP. Not a stat-card grid |
| Village band | `VillageTeaser` | what my training built |

## The stage

One scene, one button, and the button does what it says.

- **Adventure running** → the adventure's own cover, step progress, "Continue Adventure" → the
  adventure map.
- **A quest is being offered** (oath rule, then weak-area rule) → **that quest's** cover, title and
  `4 exercises · Strength · ≈ 20 min`, and "Start Quest" **starts the session**. One tap from Home
  to training.
- **Nothing to go on** → the on-ramp art and "Pick a quest" → the gallery.

Which of the three fires is decided by [the waterfall](../gameplay/coach-planning.md). Three
branches, three verbs, each matching where it actually goes.

## Visual rules

- Keep the stage as the visual centre; it is the only primary CTA on the screen.
- The scene must name what the button starts. A generic illustration over a "start" button is a
  button you have to press to find out what it meant.
- Every block reserves its height with a skeleton (`STAGE_HEIGHT`, `OATH_CARD_HEIGHT`,
  `BAND_HEIGHT`) so nothing jumps as data lands. Skeletons, never spinners.
- Secondary content reads lighter than the CTA. No section headings, no eyebrows.
- Use subtle tokenized borders; no bright outline frames.
- Advice never takes the action slot: the rest note is a line, not a card, and never blocks.

## What success looks like

A hero who swore an oath opens Home and sees the quest that advances it, named, with the rung they
are on — and starts it in one tap.

## History

- **2026-07-31** — the oath now drives the stage ahead of the weak-area rule; the button starts the
  session instead of pushing a second screen with a synonymous button; the scene shows the quest;
  the recovery banner and the rest suggestion were mounted for the first time.
- Earlier revisions of this page described a floating navbar, a "Coach card" and a resource strip.
  None of them exist.
