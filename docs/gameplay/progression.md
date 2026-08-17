---
title: Progression (XP, Village, Flame)
type: system
status: active
updated: 2026-07-30
related:
  [
    ../planning/roadmap.md,
    session-flow.md,
    statistics-progress.md,
    coach-planning.md,
    ../raw/bodyweight-app-research.md,
  ]
sources: [db/xp.ts, db/streaks.ts]
---

# Progression

> Replaces the former `economy/rewards-and-progression.md`. Resources, buildings, and Gold
> are gone — the village is a **pure function of the session journal**, nothing is stored or
> managed. See [roadmap.md](../planning/roadmap.md) §7 — the decision is closed.

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

1. **Tier** is a function of level — 12 illustrated scenes, no build menu, nothing chosen or
   spent: `hameau → clairière → village → carrefour → bourg → ville franche → cité →
   cité marchande → cité florissante → citadelle → métropole → capitale éternelle`, at levels
   1/3/5/8/10/13/15/18/20/25/32/40.

   The top three exist because the level curve does not stop at 20 — it runs on at a flat 2000 XP
   a rung, and without them the scene froze for the rest of the account's life after two or three
   months. Their gaps widen (5, 7, 8) so each still costs more than the last, which the flat XP
   curve up there would otherwise undo.

   The even tiers below 9 came later, filling 3/8/13/18. That is where a real player spends their
   first two months, and four levels between scenes is a long time to watch nothing change. The
   top half was deliberately left alone: the art there is already at the edge of what can escalate
   convincingly, and an intermediate step would read as a duplicate rather than a step.
2. **Overlays** layer on top conditionally:
   - Flame intensity (0–3), from the current consistency streak
   - Dominant-sport visual (from the last 7 days of training)
   - A permanent banner per boss defeated (see [boss-fights.md](boss-fights.md))
3. **Milestones** reveal a detail on the scene at a training-volume threshold —
   e.g. `totalArmReps >= 500` reveals a forge silhouette — not a separate badge/collection
   system, not a stored unlock.

## Flame (consistency streak)

**The flame counts days of consistency, not days trained.** A day keeps the flame lit when the
trailing 7-day window holds at least the hero's weekly quota of sessions — **or** when the week
before it did. Rest days therefore cost nothing, and one blank week is forgiven; two consecutive
blank weeks put it out.

| Days lit | Flame level |
| --- | --- |
| 3+ | 🔥 Spark |
| 7+ | 🔥🔥 Ember |
| 14+ | 🔥🔥🔥 Blaze |
| 30+ | 🔥🔥🔥🔥 Inferno |
| 100+ | ✨🔥✨ Eternal |

### The quota is the hero's own promise

Without an oath the bar sits at the WHO baseline, **2 sessions a week**, so someone who has sworn
nothing still has a flame worth keeping. Swearing a [`weekly_sessions` oath](oaths.md) raises it
to their chosen 2, 3 or 4 — the flame becomes the live representation of whether they are keeping
the promise they made. One mechanic, one unit, and the target is chosen rather than imposed.

### Why it changed

The flame used to count consecutive training days, which put the app at war with itself: an
achievement asked for 100 days in a row while the [rest rule](coach-planning.md) nudges a rest day
after 5. The research is explicit that breaking a strict streak pushes people to abandon rather
than restart, and that missing a single day does not compromise habit formation — so the day a
hero rests must not cost them anything. See
[raw/bodyweight-app-research.md](../raw/bodyweight-app-research.md) §5.

The counter is still derived from the session journal on read (`db/streaks.ts`), so the change
needed no migration — but every hero's flame grew the day it shipped, because their rest days
now count.

### A mobility session is how a rest day still counts as work

[§11.4](../raw/bodyweight-app-research.md) names this the cleanest overlap the dossier found
between good programming and good retention design: a 10–15 min mobility session is
low-fatigue by design, so it can be done on a day the hero should not train hard, and it still
lights the day. Skill practice (§8.6.7) has the same property for the same reason — it is
capped by quality, not by effort.

The mechanic already exists on both sides: the flame counts a day the quota held, and the
`mobility` quest archetype is in the schema. What was missing was **content** — the catalogue
shipped exactly one mobility quest. See [quests.md](quests.md).

## Victory screen (example)

```
┌─────────────────────────────┐
│    ⚔️ QUEST COMPLETE! ⚔️    │
├─────────────────────────────┤
│  +150 XP   Level 5 ████░░   │
│  🔥 12-day flame            │
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

## Skill, alongside volume

XP, the village and the flame all measure **how much** and **how often**. [paths.md](paths.md) is
the fourth thing derived from the same journal, and the only one that measures **what the hero can
now do**: a named route up the variation ladder, its rungs owned three clean sessions at a time.
Climbing a whole one puts a trophy on the village shelf beside the defeated bosses — until it
existed, the village recorded volume and never skill.

## Related

- [paths.md](paths.md) — the variation ladder: skill progression, derived the same way
- [statistics-progress.md](statistics-progress.md) — muscle balance, PRs, sessions/week, calendar
- [coach-planning.md](coach-planning.md) — what Home offers next: oath, weak-area, rest
- [session-flow.md](session-flow.md) — flame, victory screen, "no session is wasted" rule
- [boss-fights.md](boss-fights.md) — boss victories as village banners
