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
> economy (Gold currency, 7 managed resources, per-building XP/upgrades). That contradicted
> the north-star decision in **[roadmap-alignment.md](../planning/roadmap-alignment.md)**,
> sourced from the external product wiki (`bati-boucle-et-parcours.md`, section "Décisions
> actées"): **Gold is cut for MVP** (including passive/idle Gold), and the village is
> **derived, not managed**. This page has been corrected to match. The full-scope design is
> kept below under **Phase 2+ (deferred)** for future reference — it is not implemented
> behavior at MVP.

| Concept | MVP (now) | Phase 2+ (deferred, not built) |
| --- | --- | --- |
| Loot on session complete | **XP only** + village visual reaction | + Gold (single spend: village customization) |
| Village | **Derived**: `tier = f(level)` + conditional overlays (flame, dominant-sport NPC, boss banner) | Per-building XP/upgrade economy, manual construction choices |
| Resources (wood/stone/fire/water/wind/grain/mana/leaf) | **Flavor only** — computed totals per sport that pick which overlay/NPC to show; never an inventory to spend | Full 8-resource inventory feeding individual building progression |
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
| 🔥 **Flame** | Daily streak | Retention signal — see [session-flow.md](../gameplay/session-flow.md) |
| 🏆 **Boss tokens** | Defeating bosses | Unlocks legendary village overlays |

Gold is **not** granted at MVP. Do not surface it in the victory screen, header, or a
Treasury-style screen (see cleanup item `C1` in
[roadmap-alignment.md](../planning/roadmap-alignment.md)).

### Village: how it works (MVP)

1. **No build menu.** Nothing is chosen or spent.
2. **Village tier** is a function of level (`hameau → village → bourg → cité → cité
   florissante`, 5 illustrated tiers).
3. **Overlays** layer on top conditionally: flame intensity (0–3), dominant-sport NPC
   (from the last 7 days of training), and a permanent banner per boss defeated.
4. **Milestones** (formerly "achievements") are derived thresholds that reveal a detail —
   e.g. `totalForceReps >= 500` reveals the Forge — not a separate badge system.

### Resources as flavor (MVP)

Six element resources map to muscle groups, plus two training-style resources. At MVP
these are **computed totals**, not a spendable inventory:

| Your training | Resource (flavor) | Picks the... |
| --- | --- | --- |
| 💪 Arms | Wood | dominant-sport NPC / overlay |
| 🦴 Back | Stone | dominant-sport NPC / overlay |
| 🫀 Chest | Fire | dominant-sport NPC / overlay |
| 🎯 Abs | Water | dominant-sport NPC / overlay |
| 🦅 Shoulders | Wind | dominant-sport NPC / overlay |
| 🦵 Legs | Grain | dominant-sport NPC / overlay |
| Calisthenics | Mana (magic path) | Wizard Tower overlay |
| Yoga / flexibility | Leaf (druid path) | Druid Grove overlay |

Totals are recomputed at read time from the session journal — there is no mutated
inventory table driving gameplay decisions.

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
- **Full 8-resource managed inventory** with an economy header/overview UI.
- **Legendary building tiers** unlocked by boss rewards, beyond the milestone overlays.

## Related

- [roadmap-alignment.md](../planning/roadmap-alignment.md) — why Gold/economy is deferred (source of truth)
- [session-flow.md](../gameplay/session-flow.md) — flame, loot screen, "no session is wasted" rule
- [statistics-progress.md](../gameplay/statistics-progress.md) — dominant sport, totals feedback
- [coach-planning.md](../gameplay/coach-planning.md) — deferred goal/planning layer
