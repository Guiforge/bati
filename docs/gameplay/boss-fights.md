---
title: Boss Fights
type: system
status: active
updated: 2026-10-17
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
landing     = min(resultValue, prescribed + 2)           // reps; a hold stops at `prescribed`
base        = toRepEquivalent(landing, targetType)        // seconds -> reps at 3s/rep
× 1.5       if the exercise's first muscle is the boss's weakness
× 0.5       if it is the boss's resistance
× 2         on a critical hit
floor of 1  a resisted chip still has to mean something
```

`toRepEquivalent` ([`db/workUnits.ts`](../../db/workUnits.ts)) is why a 60 s plank does not hit
five times harder than a 12-rep squat. Weakness and resistance read the exercise's **first** muscle
only.

`prescribed` is what the app asked for before the hero touched the stepper (`0070`,
`prescribedValue()` in [`db/targets.ts`](../../db/targets.ts)). A target raised to 100 lands 14
reps on a prescribed 12; a hold left running lands its target and nothing more. Boss pools are
tuned at 0.9 of nominal damage with no bonus in it, so capping only removes extra damage and no
pool was re-tuned.

### Crit has to be earned, by a rep or two

```ts
extra  = resultValue − prescribed          // reps only: a hold never crits
chance = extra <= 0 ? 0
       : 0.15                                   // CRIT_CHANCE_ONE_REP
```

One rep past the prescribed target is 15 %, for every target, and nothing past it adds to it.
Before 2026-10 a second rep paid 30 % from a target of 8; it was dropped so the fight no longer
pays for the second grinding rep (expected damage per set at +2 on 8 or more: 1.56 to 1.38 times
the base). The two reps past the target still land on the boss (`DAMAGE_REPS_PAST_TARGET`).

This is **the fight's only decision**, and it is deliberately the ± control the screen already had.
The rule it replaced (2026-10) scaled with the overshoot, `min(0.5, overshoot × 1.5)`, on reps and
holds alike. Three things were wrong with it. It kept growing, so the fight paid for exactly the
grinding reps the safety page says to leave in reserve, and for holding on after the position had
gone. It was relative, so "+2" was worth 50 % on a target of 6 and 20 % on 15, and the easy level
was the one that critted. And it read the target the hero was *handed*: lowered to 1, two reps
were a maximal crit.

Under the counter, a live fight stacks two lines: `session.reserve_hint` first (the target reads no
record, so "one more" only counts if it leaves margin), then the rule (`session.crit_rule_one`),
from the same constant `computeDamage` rolls against. A refused skip shows `session.pain_rule_last`
alone. When the hero changed the target it says where the boss stops
counting instead (`session.fight_target_changed`); the crit itself is unchanged. A hold in a fight
says "hold to the beep: the blow lands whole".

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

### The Triumph — what HP are for

If the kill is guaranteed either way, the fair question is what the pool still decides. This:

- **Empty it with your own damage** — meet targets, push past them for crits, land the weakness —
  and the kill is a **Triumph**: `TRIUMPH_XP_BONUS` (100 XP, twice the oath's bonus) lands on the
  session that dealt the killing hit, whenever in the campaign that is, and the victory card says
  so in gold.
- **Fall short** and the final blow still fells it at the campaign's end — normal rewards, and the
  card narrates the killing stroke (`boss.final_blow`) so "defeated at 300 HP" reads as the design
  it is, not a bug.

Reward for pushing, never punishment for training under target. **Only on the game's adventures**: the
boss of an adventure the hero wrote pays no Triumph XP (`countsAsDeed`; a fight restored from a build
without `author` is the game's), and the victory card says why in one line. Detection is in
`saveSession` (`payTriumphBonus`): the fight was alive at session start (a corpse is dropped at
load), its pool hit zero, and `dealFinalBlow` had nothing left to do. The payment is guarded by a
`triumphBonusPaid` flag on the session store, because none of those conditions can tell a first
attempt from a retry — by the time the bonus is due the pool is already empty in the database, so
the victory screen's retry button used to pay it twice.

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

A phase is a **treatment over the boss's own painting**, not four paintings per phase: the room
darkens and reddens, the art keeps its colours. Each seeded boss does have **three paintings by state**
besides its base one: *wounded* (from phase 3, below 50 % HP), *defeated* (on the arena once it is
down and on the victory card), and a *legendary* form for rematches (`getBossAsset`: defeated, then
legendary at tier 1 or more, then wounded, then base). The phases layer on top of whichever is shown. It used to be one flat fill ending at
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
[`constants/bosses.ts`](../../constants/bosses.ts) keys its name and its four taunt pools by that,
reading the words out of the `bosses` block of `locales/*.json`.
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
run carries the victory. The reset only follows a *finished* run: after a left run the boss keeps
its HP, and a felled one stays felled until a run is finished.

**Tier** = how many times the boss has fallen, derived from the adventure's finished runs — never
stored, so it cannot disagree with the village's own count of the same victories. It is on
`BossFight.tier`.

In the village a first victory raises the Dragon Lair and every rematch after it raises the
Champion Arena, never both ([village.md](../screens/village.md) § Deeds).

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

---

## The hero's boss: name and voice

A boss of an adventure the hero wrote is one of the six painted monsters, so its art, weakness,
resistance and HP rules stay the monster's. The hero adds words only (columns `bossName` and
`bossLinesJson`, [R126](../testing/data-rules.md)): a name of 40 characters at most, and up to three
lines of 60 for each of five moments.

| Moment | Where it is heard |
| ------ | ----------------- |
| `intro` | the boss panel on the adventure page, in place of the generic line, and the arena's first bubble when the first set starts |
| `idle`, `crit`, `enrage` | the arena's bubble after a hit, **added** to the painted lines, never in place of them |
| `defeat` | the felled boss's victory card, under its name |

`intro` and `defeat` have no painted lines, so a seeded boss is unchanged, and the first line of the
moment is the one said. A resisted hit keeps the painted lines only. Nothing here changes a combat
number. The fields sit folded in the adventure editor, and the file import preview shows every line
before the hero accepts the adventure.
