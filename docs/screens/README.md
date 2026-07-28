---
title: Screen Specs — Index
type: screen
status: active
updated: 2026-07-18
related: [../README.md, ../product/user-guide.md, ../meta/wiki-protocol.md]
---

# Bati — Screen Specs

One spec per screen: **what it's for**, its features, and where it leads. Companion to
[user-guide.md](../product/user-guide.md) (navigation map) and the system docs (mechanics).
Maintained per the [wiki protocol](../meta/wiki-protocol.md).

## Screen map (by flow)

**Entry**
- [onboarding.md](onboarding.md) — first-run setup → Home
- [home.md](home.md) — launch pad (level, current adventure, navbar)

**Quests (quick workout)**
- [quests.md](quests.md) — browse workouts → Quest Details
- [quest-details.md](quest-details.md) — review + choose difficulty → Session
- [exercise-details.md](exercise-details.md) — read exercise instructions/details
- [session.md](session.md) — do the workout → rewards
- [journal.md](journal.md) — training history + stats
- [session-details.md](session-details.md) — post-workout report

**Adventures (campaign)**
- [adventures.md](adventures.md) — browse campaigns → Adventure Details
- [adventure-details.md](adventure-details.md) — steps + progress → Quest Details

**Progression & rewards**
- [village.md](village.md) — visual reward layer (village growth)

**Planning (deferred)**
- [goals.md](goals.md) — ⚠️ deferred, replaced by the Coach card on Home
- [schedule.md](schedule.md) — ⚠️ deferred, replaced by the Coach card on Home

**Preferences**
- [settings.md](settings.md) — app preferences → Credits
- [credits.md](credits.md) — attributions

## Conventions

Each page carries frontmatter (`type: screen`, `route`, `related`, `sources`). `sources`
points at the Expo Router file(s) in `app/` that implement the screen.

The route-level screen specs now cover every user-facing Expo Router screen in `app/`.
