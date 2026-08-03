---
title: Boss Fights
type: system
status: active
updated: 2026-08-03
related: [adventures.md, session-flow.md, progression.md, ../screens/session.md]
sources:
  [
    db/bossFights.ts,
    components/session/BossArena.tsx,
    components/session/bossPhase.ts,
    components/session/BossTauntOverlay.tsx,
    components/adventures/BossPanel.tsx,
    constants/bosses.ts,
  ]
---

# Boss Adventures

A **boss** is an adventure with `kind = "boss"`: a multi-session campaign whose steps are ordinary
quests, and whose damage all lands on one monster. You do not fight it in a special screen. You
fight it by doing the campaign, and the session screen turns into its arena while you do.

> This page was rewritten on 2026-08-03. The version before it documented `BossHpBar` and
> `BossPhaseImage` (both deleted), an intro screen, event and legendary bosses, and battle music —
> none of which existed — plus pseudocode that never matched `computeDamage`. Everything below is
> the shipped behaviour; where something is deliberately not built, it says so.

---

## Damage

Damage is the work you did. One completed set is one hit.

```text
base        = toRepEquivalent(resultValue, targetType)   // seconds -> reps at 3s/rep
× 1.5       if the exercise's first muscle is the boss's weakness
× 0.5       if it is the boss's resistance
× 2         on a critical hit
floor of 1  a resisted chip still has to mean something
```

`toRepEquivalent` ([`db/workUnits.ts`](../../db/workUnits.ts)) is why a 60 s plank does not hit
five times harder than a 12-rep squat. Weakness and resistance read the exercise's **first** muscle
only.

### Crit has to be earned

```ts
overshoot = (resultValue − targetValue) / targetValue
chance    = overshoot > 0 ? min(MAX_CRIT_CHANCE, overshoot × 1.5) : 0
```

One rep past a target of twelve is ~12 % odds; ten seconds past a 40 s hold is ~37 %; the ceiling
is `MAX_CRIT_CHANCE` (0.5) however heroic the set.

This is **the fight's only decision**, and it is deliberately the ± control the screen already had.
The old rule asked only that the target be *met* — but the rep counter initialises to the target
and a time result is the elapsed timer, which reaches it. The condition held on essentially every
set, so crit was a flat 30 % coin flip that rewarded nothing, explained nothing, and was worth
~1.3× on every campaign whether the hero pushed or not. `session.crit_hint` under the counter now
prints the live number, from [`critChance()`](../../db/bossFights.ts) — the same function
`computeDamage` rolls against, because two copies would drift the first time either was tuned.

### Banking

Hits are held in memory (`pendingDamage`) and committed by `saveSession`, never before. Damage
written mid-session survived quitting and was double-counted when a round restarted.
`restartRound()` refunds exactly the hits of the round being redone, by `roundIndex`.

`persistSessionDamage` returns a `boolean`. It drops hits without throwing in two cases — the fight
row is missing, or the boss is already dead — and the store only clears `pendingDamage` when the
write is confirmed, reporting the refusal through `reportError` otherwise. A silent drop is exactly
the failure you find weeks later.

---

## HP, and why it is scaled

`adventures.bossTotalHp` is stated **at `medium`**. `getOrCreateBossFight(adventureId, userLevel)`
multiplies it by `USER_LEVEL_MULTIPLIER` ([`db/targets.ts`](../../db/targets.ts)) — the same
0.75 / 1.0 / 1.25 that scales every exercise target.

It has to, because damage is the work you did. A pool tuned once at `medium` meant that on `easy`
the campaign ran out of steps before the boss ran out of HP: no `defeatedAt`, no victory variant,
no village banner, ever. On `hard` the boss died two thirds of the way through.

The seeded values are `round(0.9 × the campaign's nominal rep-equivalent total at medium)`
(`0026_boss_pacing.sql`). A hero who exactly meets every target kills the boss nine tenths of the
way through its final step; crits, weakness and resistance move it earlier.

### The final blow

The kill is **structural, not statistical**: when the campaign's last step completes and the boss
still lives, `finishBossFight()` fells it — the remainder written to the damage log as one
attributed hit, so the log's sum still equals the pool. `saveSession` calls it whenever
`completeAdventureRunStep` reports `isFinished`.

The pacing above only decides whether the hero manages the kill *early*. Without the final blow, a
hero who trained under target finished every step to a victory screen and a live boss that no
remaining step could ever kill — the exact "success of fight, boss not killed" hole the pacing was
supposed to close, reachable through under-target sets, a run resumed across a rebalance, or the
dev screen's jump into the last step at full HP. There is no failure state, so finishing the
campaign IS the kill.

**This is a ratchet.** `__tests__/content-invariants.test.ts` re-derives every campaign's total from
the seeded quests at all three difficulties and fails if any boss survives its campaign or dies
before the last step. `0017` computed those numbers by hand in 2026 and nothing re-checked them;
by the time the invariant was written, all six were wrong. The test prints the window a failing
adventure wants, so the fix is the number it hands you.

`CAMPAIGN_HP_FRACTION` (0.9) is the same rule applied by `calculateBossHp`, the fallback for new
content that ships with no `bossTotalHp`.

> **ponytail:** HP is fixed at fight creation, so switching difficulty mid-campaign keeps the pool
> the first session bought. Re-scale on level change only if players actually do this.

---

## Phases

`components/session/bossPhase.ts`, by HP percentage:

| Phase | HP | Screen | Dim | Rim |
| ----- | -- | ------ | --- | --- |
| 1 Full Power | ≥ 75 % | `bgDark` | 0 | 0 |
| 2 Wounded | ≥ 50 % | `bossPhase2` | 0.10 | 0.20 |
| 3 Critical | ≥ 25 % | `bossPhase3` | 0.20 | 0.35 |
| 4 Enraged | < 25 % | `bossPhase4` | 0.32 | 0.55 |

A phase is a **treatment over the boss's own painting**, not four paintings per boss: the room
darkens and reddens, the art keeps its colours. It used to be one flat fill ending at
`rgba(255,23,68,0.5)` — 50 % red over a painting is not drama, it is a lost painting. The values
are opacities over token-coloured layers, so nothing is written outside
[`constants/rawColors.ts`](../../constants/rawColors.ts).

At phase 4 the rim breathes and the taunt pool switches. **Enrage deliberately does not change the
maths**: a fitness app should not make the last session of a campaign harder than the ones that
earned it.

---

## What you see

### Before — the adventure screen

[`BossPanel`](../../components/adventures/BossPanel.tsx) shows the portrait, the monster's name, its
drain and its weakness/resistance, from `getBossFightByAdventure()` (read-only: browsing a campaign
must not create a fight). Before this the screen said `BOSS` in a tag and nothing else.

### During — the arena

[`BossArena`](../../components/session/BossArena.tsx) is the session screen's top slot during a
fight, at exactly the size of `ExerciseHero` (`sessionArtHeight`). See
[screens/session.md](../screens/session.md) for the layout and its vertical budget. HP is a 3 px
hairline at the screen's top edge with a damage trail: the bar holds at the old value for 700 ms so
the chunk coming off is legible, then drains. The portrait flinches and flashes on a hit; the
damage numeral is struck over the middle of the art.

### The monster's identity

There is no name column. `BossFight.enName` is the *campaign's* title, so the arena announced a fire
dragon as "The Iron Lord's Conquest". `getBossKey()` reads the monster out of `bossImagePath` and
[`constants/bosses.ts`](../../constants/bosses.ts) keys its name and its four taunt pools by that.
A typed `Record<BossAssetKey, BossVoice>` makes shipping a painting without its copy a compile
error. The campaign title survives as the fallback for content with no painting.

### Taunts

`BossTauntOverlay` subscribes to `lastDamageResult` and picks the pool from what just happened:
phase 4 → `enrage`, crit → `crit`, resisted → `resist`, else `idle`. It used to fire on a random
15–45 s timer from one ten-line pool shared by all six bosses, which meant it talked over your set
about nothing.

### After

`VictoryView` shows the boss variant when `bossStartHp > 0 && currentHp <= 0` — defeated *today*,
not defeated ever. `currentHp <= 0` alone was true for every remaining session of the campaign, so
the sword and the 120-particle burst replayed on each one. The village gains a permanent banner;
see [progression.md](progression.md#village).

---

## Rematches: tiers, legendary forms, shiny

Replaying a beaten boss campaign is a **rematch**. `startAdventureRun` resurrects the defeated
fight the moment the new run begins — the wiring `getBossBanners` described before it existed
("resetBossFight() nulls it the moment a replay starts"); the banner survives because the finished
run carries the victory.

**Tier** = how many times the boss has fallen, derived from the adventure's finished runs — never
stored, so it cannot disagree with the village's own count of the same victories. It is on
`BossFight.tier`.

| Tier | Form | Pool |
| ---- | ---- | ---- |
| 0 | The monster, its own painting and name | base × level |
| 1+ | **Legendary** — its `*_legendary` painting, its legendary title (`constants/bosses.ts`) | × `tierHpMultiplier`: +25 % per tier, capped at ×2 |

The cap exists because this is a fitness app: past double, "the boss grows" stops being drama and
starts being a treadmill. A pool bigger than the campaign's damage is *safe* — the final blow is
why bigger can never mean unwinnable; a high-tier legendary just goes to the wire. The rematch
pool is re-derived from the adventure at reset, so it also picks up rebalances and the new run's
difficulty.

**Threat rank** (`threatRank`, 1–4 skulls on the adventure screen's boss panel) reads the pool the
hero is actually facing — level scaling and tier included — so The Golem's 278 and a legendary
Ranger's 2230 announce themselves as different fights before the hero walks in.

**Shiny**: one encounter in twenty (`SHINY_CHANCE`), rolled when the session loads the fight,
per-encounter like the creatures it is stolen from. The rim burns gold instead of red, the name
wears a ✨. Carried in the session snapshot so recovery keeps it; never persisted, never gameplay.
The adventure screen's read path never rolls it — browsing must not flicker the gleam.

---

## Schema

```sql
boss_fights      (id, adventureId, totalHp, currentHp, weaknessMuscle,
                  resistanceMuscle, defeatedAt, createdAt, updatedAt)
boss_damage_log  (id, bossFightId, completedSessionId, exerciseId,
                  damageDealt, isCritical, muscle, createdAt)
```

The monster's portrait and its tuning live on `adventures`: `bossImagePath`, `bossTotalHp`,
`bossWeaknessMuscle`, `bossResistanceMuscle`.

---

## Not built

- **No failure state.** The kill is guaranteed — structurally, by the final blow.
- **No boss intro screen.** `boss.fight_intro` is one line on the adventure screen's panel.
- **No event or seasonal bosses.** Legendary is the rematch form of the six that exist, not a
  seventh monster.
- **No boss-specific audio.**
- **No desaturation at low HP.** RN has no image filter and `react-native-svg`'s `feColorMatrix` on
  a full-bleed bitmap is not worth it. Add if darken alone reads flat.
