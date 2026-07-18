---
title: Progression (XP, Village, Flame)
type: system
status: active
updated: 2026-07-18
related: [../planning/roadmap-alignment.md, session-flow.md, statistics-progress.md, coach-planning.md]
sources: [db/xp.ts, db/streaks.ts]
---

# Progression

> Replaces the former `economy/rewards-and-progression.md`. Resources, buildings, and Gold
> are gone — the village is a **pure function of the session journal**, nothing is stored or
> managed. See [system-redesign-options.md](../planning/system-redesign-options.md) for the
> options considered and why.

## Summary

Every workout is logged to an append-only session journal. XP, level, streak, and the
village's appearance are all **derived** from that journal by pure functions. There is no
inventory, no currency, no build menu, and no per-building progression.

## The loop

```
DO WORKOUT → session journal entry (append-only)
           → recompute: XP, level, flame, dominant sport, totals per muscle
           → village re-renders from the new derived state (no stored mutation)
           → victory screen shows: +XP, streak, and (if crossed) a village reaction
```

## XP & level

Every workout grants XP. Level is a running total → level curve. Level is the single number
that drives the village's tier (below). Nothing else consumes or stores XP per-building.

## Village

The village is **one illustrated scene**, not a list of buildings to manage.

1. **Tier** is a function of level: `hameau → village → bourg → cité → cité florissante`
   (5 illustrated tiers). No build menu, nothing chosen or spent.
2. **Overlays** layer on top conditionally:
   - Flame intensity (0–3), from the current streak
   - Dominant-sport visual (from the last 7 days of training)
   - A permanent banner per boss defeated (see [boss-fights.md](boss-fights.md))
3. **Milestones** reveal a detail on the scene at a training-volume threshold —
   e.g. `totalArmReps >= 500` reveals a forge silhouette — not a separate badge/collection
   system, not a stored unlock.

## Flame (streak)

| Days | Flame level |
| --- | --- |
| 3+ | 🔥 Spark |
| 7+ | 🔥🔥 Ember |
| 14+ | 🔥🔥🔥 Blaze |
| 30+ | 🔥🔥🔥🔥 Inferno |
| 100+ | ✨🔥✨ Eternal |

Missing a day dims the flame; it doesn't reset to zero. See
[session-flow.md](session-flow.md) for the "Marche de repentance" (rally quest) recovery flow.

## Victory screen (example)

```
┌─────────────────────────────┐
│    ⚔️ QUEST COMPLETE! ⚔️    │
├─────────────────────────────┤
│  +150 XP   Level 5 ████░░   │
│  🔥 5-day streak             │
│                             │
│  🏰 The village grows!      │
│  (forge silhouette revealed)│
│                             │
│     [Continue to Village]   │
└─────────────────────────────┘
```

## What was removed, and why

Resources (wood/stone/fire/water/wind/grain/mana/leaf), Gold, boss tokens as an inventory
item, and per-building XP/levels/prerequisites/prestige all added a second parallel state
machine on top of the journal — with nothing to actually spend any of it on. Muscle-focus
feedback now lives in [statistics-progress.md](statistics-progress.md) (muscle balance);
boss victories now live directly as village banners instead of a spendable token.

## Related

- [statistics-progress.md](statistics-progress.md) — muscle balance, PRs, sessions/week, calendar
- [coach-planning.md](coach-planning.md) — weekly goal, weak-area nudge, rest nudge
- [session-flow.md](session-flow.md) — flame, victory screen, "no session is wasted" rule
- [boss-fights.md](boss-fights.md) — boss victories as village banners
