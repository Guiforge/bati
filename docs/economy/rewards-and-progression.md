---
title: Rewards, Village & Resources
type: system
status: active
updated: 2026-07-18
related: [../planning/roadmap-alignment.md, ../gameplay/session-flow.md, ../gameplay/statistics-progress.md, ../gameplay/coach-planning.md]
sources: [db/xp.ts, db/resources.ts, db/buildings.ts, db/streaks.ts]
---

# Rewards, Village & Resources

> Train → Earn → Village reacts. One canonical page for the loot loop, the village
> (identity), and resources — merged from the former `REWARDS.md`, `VILLAGE.md`, and
> `RESOURCES.md` to remove duplication and resolve the MVP-scope contradiction between them.

## Summary

Every workout is logged to an append-only session journal. Everything else — XP, level,
flame, dominant sport, and the village's appearance — is **derived** from that journal by
pure functions. The village is a **read-only mirror of your training**, not a game you
manage: there is no build menu, no spending, no upgrades to choose.

## Status & scope (read this first)

> ⚠️ **MVP vs full/legacy scope.** This page previously described a full spendable
> economy (Gold currency, managed resources, per-building XP/upgrades). The current source of
> truth is narrower: **resources may be visible as passive workout receipts**, while Gold-first
> spending, shops, manual construction choices, and treasury-centric loops are deferred. The
> village remains **derived, not managed**.

| Concept | MVP (now) | Phase 2+ (deferred, not built) |
| --- | --- | --- |
| Loot on session complete | **XP** + passive resource visibility + village visual reaction | + Gold (single spend: village customization) |
| Village | **Derived**: `tier = f(level)` + conditional overlays (flame, dominant-sport NPC, boss banner) | Per-building XP/upgrade economy, manual construction choices |
| Resources (wood/stone/fire/water/wind/grain) | **Passive/read-only** — earned from training focus and visible in Treasury; never required spending | Full managed inventory feeding individual building progression |
| Boss tokens | Gate/unlock boss-related content | Same, unchanged |
| Achievements | Merged into village milestones (thresholds like `totalForceReps >= 500 → Forge appears`) | Separate badge system |

## Details

### The loop (MVP)

```
DO WORKOUT → session journal entry (append-only)
           → recompute: XP, level, flame, dominant sport, totals per sport
           → village re-renders from the new derived state (no stored mutation)
           → loot screen shows: +XP, and (if a threshold was crossed) a village reaction
```

### What you earn (MVP)

| Reward | From | What it does |
| --- | --- | --- |
| ⭐ **XP** | Every workout | Levels up, drives the village tier |
| 🪵 **Resources** | Muscle focus in a workout | Passive/read-only receipt in Treasury; supports flavor and training feedback |
| 🔥 **Flame** | Daily streak | Retention signal — see [session-flow.md](../gameplay/session-flow.md) |
| 🏆 **Boss tokens** | Defeating bosses | Unlocks legendary village overlays |

Gold is **not a spendable MVP economy**. If a `gold` row exists in implementation, treat it as
placeholder/flavor until a Phase 2 economy is explicitly approved. Do not make Gold the headline
reward in the victory screen, header, or core workout path.

### Village: how it works (MVP)

1. **No build menu.** Nothing is chosen or spent.
2. **Village tier** is a function of level (`hameau → village → bourg → cité → cité
   florissante`, 5 illustrated tiers).
3. **Overlays** layer on top conditionally: flame intensity (0–3), dominant-sport NPC
   (from the last 7 days of training), and a permanent banner per boss defeated.
4. **Milestones** (formerly "achievements") are derived thresholds that reveal a detail —
   e.g. `totalForceReps >= 500` reveals the Forge — not a separate badge system.

### Resources as passive feedback (MVP)

Six element resources map to muscle groups. At MVP these are **passive/read-only totals**, not a
spendable economy:

| Your training | Resource (flavor) | Picks the... |
| --- | --- | --- |
| 💪 Arms | Wood | dominant-sport NPC / overlay |
| 🦴 Back | Stone | dominant-sport NPC / overlay |
| 🫀 Chest | Fire | dominant-sport NPC / overlay |
| 🎯 Abs | Water | dominant-sport NPC / overlay |
| 🦅 Shoulders | Wind | dominant-sport NPC / overlay |
| 🦵 Legs | Grain | dominant-sport NPC / overlay |
Totals may be stored for offline performance, but they must not drive a manual management loop.
The product promise is: train, then see what your effort produced.

### Flame (streak)

| Days | Flame level |
| --- | --- |
| 3+ | 🔥 Spark |
| 7+ | 🔥🔥 Ember |
| 14+ | 🔥🔥🔥 Blaze |
| 30+ | 🔥🔥🔥🔥 Inferno |
| 100+ | ✨🔥✨ Eternal |

Missing a day dims the flame; it doesn't reset to zero. See
[session-flow.md](../gameplay/session-flow.md) for the "Marche de repentance" (rally
quest) recovery flow.

### Victory screen (MVP-correct example)

```
┌─────────────────────────────┐
│    ⚔️ QUEST COMPLETE! ⚔️    │
├─────────────────────────────┤
│  +150 XP   Level 5 ████░░   │
│  +3 Wood   +2 Fire          │
│                             │
│  🏰 The village grows!      │
│  (Forge overlay revealed)   │
│                             │
│     [Continue to Village]   │
└─────────────────────────────┘
```

## Phase 2+ (deferred, not built)

Kept for reference only — do not implement without re-confirming scope in
[roadmap-alignment.md](../planning/roadmap-alignment.md):

- **Gold** as a currency, earned per workout, with a single spend use: village
  customization/decoration (not building unlocks).
- **Per-building XP and manual upgrades** (tiers 1→5 per building), building unlock
  thresholds by session count/level.
- **Full managed inventory** with an economy header/overview UI.
- **Legendary building tiers** unlocked by boss rewards, beyond the milestone overlays.

## Related

- [roadmap-alignment.md](../planning/roadmap-alignment.md) — why Gold/economy is deferred (source of truth)
- [session-flow.md](../gameplay/session-flow.md) — flame, loot screen, "no session is wasted" rule
- [statistics-progress.md](../gameplay/statistics-progress.md) — dominant sport, totals feedback
- [coach-planning.md](../gameplay/coach-planning.md) — deferred goal/planning layer
