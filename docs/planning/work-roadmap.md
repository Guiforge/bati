---
title: Work Roadmap — Quests & Adventures Overhaul
type: planning
status: active
updated: 2026-07-27
related:
  [
    ../content/workout-best-practices.md,
    ../content/content-generation.md,
    ../gameplay/quests.md,
    ../gameplay/adventures.md,
    ../gameplay/boss-fights.md,
    ../gameplay/oaths.md,
    ../raw/bodyweight-app-research.md,
  ]
sources:
  [
    drizzle/0001_seed_exercises.sql,
    drizzle/0002_seed_quests.sql,
    drizzle/0003_seed_adventures.sql,
    drizzle/0006_content_expansion.sql,
    drizzle/0010_seed_bodyweight_exercises.sql,
    db/quests.ts,
    db/targets.ts,
    db/estimate.ts,
    db/muscleBalance.ts,
    constants/assetMap.ts,
  ]
---

# Work Roadmap — Quests & Adventures Overhaul

## Summary

Plan to rebuild the quest and adventure catalogue so it keeps the RPG framing but stops
contradicting training science. Three problems drive the work: **the seeded content ignores
its own design doc** (rest, duration, exercise order), **60 % of the exercise catalogue is
never used by any quest**, and **content that was fully specified and already illustrated was
never seeded** (6 quests, 4 adventures, 5 bosses — the art files are on disk and wired into
`constants/assetMap.ts` right now).

Every number below is computed from the actual seeds with the app's own estimator
([db/estimate.ts](../../db/estimate.ts)) at `medium` user level (mid-target), so the targets
in this plan are directly comparable to what the app displays.

## Status & scope

- **In scope**: `exercises` muscle tags, `quests` / `quest_exercises` rows, `adventures` /
  `adventure_steps` rows, boss parameters, the seed migrations that carry them, content
  invariant tests, the covers those rows point at, and the [oath](../gameplay/oaths.md) presets
  that name that content (§9 — the oath system itself is sound and is not redesigned).
- **Out of scope** (tracked in the audit, not here): warm-up block, streak forgiveness,
  medical disclaimer, RIR capture, deload scheduling, muscle taxonomy migration
  (`calf` → real lower-body groups). Phase F notes where the taxonomy blocks content work.
- **Non-negotiable**: the dark-fantasy voice stays. Every quest keeps a 2-sentence narrative
  hook, bilingual EN/FR, and a cover. Best practice changes the *numbers*, not the *fiction*.

---

## 1. Inventory (measured, not assumed)

### 1.1 Exercises — 46 rows, 20 unused

| Bucket | Count | Notes |
| --- | --- | --- |
| Total exercises | 46 | `0001` (6) + `0006` (20) + `0010` (20) |
| Referenced by ≥1 quest | 26 | all from `0001` + `0006` |
| **Referenced by 0 quests** | **20** | the entire `0010` batch |
| Require `pullup_bar` | 6 | Pull-ups, Iron Grip Pull-up, Chin-Up, Inverted Row, Hanging Leg Raise, Scapular Pull-Up |
| Require `dumbbell` | 1 | Barbarian's Overhead Press |

Unused inventory (all art already generated, see [missing-image.md](../content/missing-image.md)):
Chin-Up, Superman, Bear Crawl, Russian Twist, Side Plank, Glute Bridge, Standing Calf Raise,
Handstand Push-Up, Wall Push-Up, Flutter Kicks, Inverted Row, Dead Bug, Hanging Leg Raise,
Jump Squat, Reverse Crunch, Curtsy Squat, Scapular Pull-Up, L-Sit, Star Jump, Windshield Wipers.

### 1.2 Quests — 13 rows, none inside the target window

Estimated duration = `rounds × work + (rounds × exercises − 1) × rest`, mid-target, medium level.
Design target from [workout-best-practices.md](../content/workout-best-practices.md): **10–25 min**,
sweet spot 15–20.

| Quest | R | Rest | Ex | Sets | Est. | Verdict |
| --- | --: | --: | --: | --: | --: | --- |
| Chop Wood | 3 | 30 s | 3 | 9 | 9:30 | too short, rest too low |
| Tower Climb | 2 | 30 s | 3 | 6 | 5:46 | too short; 30 s after a pull-up set |
| Knight Push | 3 | 30 s | 2 | 6 | 7:00 | too short |
| Shield Wall | 2 | 30 s | 2 | 4 | 4:30 | too short |
| Gather Stones | 2 | 30 s | 2 | 4 | 4:34 | too short |
| Raise the Shelter | 2 | 30 s | 2 | 4 | 3:58 | too short |
| Core Forge | 3 | 30 s | 2 | 6 | 7:36 | too short; abs stacked on abs at 30 s |
| Golem Strike | 2 | 30 s | 2 | 4 | 5:30 | too short |
| Golem Core | 2 | 30 s | 2 | 4 | 5:06 | too short; abs on abs |
| Forge the Dragon Blade | 4 | 60 s | 4 | 16 | 24:04 | **16 straight push sets**, zero antagonist |
| Climb the Titan's Tower | 3 | 90 s | 3 | 9 | 17:36 | ✅ the only well-built quest |
| Build the Stronghold | 4 | 60 s | 5 | 20 | 32:52 | over the ceiling |
| The Iron Gauntlet Challenge | 4 | 90 s | 5 | 20 | 40:46 | **41 min**, 15 of 20 sets are push |

Two failure modes: the `0002` starter quests are 4–9 min two-exercise stubs, and the `0006`
expansion quests are 24–41 min with single-pattern volume that exceeds a sensible *weekly*
allowance in one session (research: 10–20 sets per muscle **per week**).

### 1.3 Adventures — 3 rows

| Adventure | Kind | Steps | Distinct quests | Boss | Issue |
| --- | --- | --: | --: | --- | --- |
| The Lumber Route | route | 3 | 3 | — | fine, but 3 × ~4 min sessions |
| The Golem | boss | 2 | 2 | 200 HP, weak `chest`, resist `back` | weakness bug, see 2.4 |
| The Iron Lord's Conquest | boss | 8 | 4 | 800 HP, weak `abs`, resist `chest` | Iron Gauntlet repeated **4×** at 41 min each |

### 1.4 Content specified, illustrated, never seeded

[content-generation.md](../content/content-generation.md) specifies 10 quests and 5 adventures.
Art exists on disk **and** is already keyed in [assetMap.ts](../../constants/assetMap.ts):

- **Quests not seeded (6)**: Escape the Collapsing Mine, Guard the Fortress Gate,
  The Arcane Gauntlet, The Druid's Path, Sprint Through the Shadowlands, Morning of the Champion.
- **Adventures not seeded (4)**: The Scout's Trial, The Guardian's Oath,
  The Monk's Enlightenment, The Ranger's Journey.
- **Boss art unused (4)**: `wind_wraith`, `stone_golem`, `shadow_serpent`, `forest_titan`
  (only `fire_dragon` and the two seeded adventures use their covers).

This is the cheapest content in the plan: it is written, illustrated, and wired. It only needs SQL.

---

## 2. Design rules

Everything created or edited below is measured against this table. It is the operational form
of [raw/bodyweight-app-research.md](../raw/bodyweight-app-research.md) §1–§3.

### 2.1 Quest archetypes

| Archetype | Rounds | Rest | Exercises | Target sets | Duration | Rep/time targets |
| --- | --: | --: | --: | --: | --- | --- |
| **Skill / Strength** | 3 | 90–120 s | 3–4 | 9–12 | 17–25 min | 3–8 reps, long holds |
| **Hypertrophy** | 3 | 60–90 s | 3–4 | 9–12 | 15–24 min | 8–15 reps |
| **Circuit (full body)** | 3 | 45 s | 3–4 | 9–12 | 11–18 min | 10–20 reps |
| **Metabolic / cardio** | 3 | 30–45 s | 4 | 12 | 12–17 min | 15–30 reps, 30–45 s holds |
| **Core** | 3 | 40–60 s | 3–4 | 9–12 | 12–15 min | 12–20 reps, 20–60 s holds |
| **Mobility / recovery** | 2 | 30 s | 3 | 6 | 6–10 min | 30–60 s holds |

### 2.2 Hard constraints (enforced by tests, see §11)

1. Estimated duration ∈ **[8 min, 25 min]** (mobility quests: ≥ 5 min).
2. **Consecutive exercises may share at most one muscle**, and never have identical muscle
   sets — except in Core, Strength, Skill and Metabolic quests. For the first three, stacking
   one pattern *is* the identity of the session (a push day is a push day). Metabolic is
   exempt for a different reason: with six muscle codes, every cardio movement tags `calf`
   and `abs`, which says which limbs move, not where the stimulus lands.
3. **Hardest / most technical exercise first** — difficulty must be non-increasing
   (`hard` → `medium` → `easy`), skill work before metabolic work.
4. **≤ 12 sets on a single muscle per quest** — a session is not a week. This is the rule
   that carries the weight for the exempt archetypes: pre-`0013`, Forge and Iron Gauntlet
   both ran 4 rounds with `arms` in four exercises = 16 sets, and it flags both.
5. Rest matches the archetype (±15 s). No quest under 40 s rest that stacks the same muscle.
6. Every quest is either **fully equipment-free** or flagged as needing a bar. No mixed quest
   that silently blocks a user at exercise 3.
7. Every exercise in the catalogue is used by **≥ 1 quest**.
8. Each quest declares its archetype in the description's tone (forge = strength, sprint =
   cardio) — the fiction and the physiology agree.

### 2.3 Progression, not just multipliers

Today progression is only `×0.75 / ×1.0 / ×1.25` on reps ([db/targets.ts](../../db/targets.ts)).
The catalogue already contains natural variation ladders; quests should be **authored in tiers**
so the ladder is visible even before a real unlock system exists:

| Pattern | Tier 1 (easy) | Tier 2 (medium) | Tier 3 (hard) |
| --- | --- | --- | --- |
| Horizontal push | Wall Push-Up | Push-ups / Dragon Push-up | Knight's Diamond Push-up, Titan's Dip |
| Vertical push | — | Archer's Pike Push-up | Handstand Push-Up |
| Horizontal pull | Towel Door Row * | Table Row *, Inverted Row | — |
| Vertical pull | Scapular Pull-Up | Chin-Up | Pull-ups, Iron Grip Pull-up |
| Squat | Wall Sit / Goblin Squat | Curtsy Squat, Shadow Step Lunge | Jump Squat |
| Hinge | Glute Bridge | — | Ranger's Single Leg Deadlift |
| Core | Dead Bug, Crunch | Side Plank, Russian Twist | L-Sit, Windshield Wipers |

`*` = created in Phase C.

### 2.4 The Golem weakness bug

`Squat` is tagged `chest` ([0001_seed_exercises.sql:146-150](../../drizzle/0001_seed_exercises.sql#L146-L150)).
The Golem's weakness is `chest`, so **squat reps currently deal 1.5× boss damage** and count as
chest volume in [muscleBalance.ts](../../db/muscleBalance.ts), which feeds the Coach's weak-area
nudge. Same for `Wall Sit → chest`. Fixed in Phase A, before any balancing work.

---

## 3. Phase A — data fixes (no new content)

### A1. Muscle tag corrections

| Exercise | Remove | Keep | Why |
| --- | --- | --- | --- |
| Squat | `chest` | `calf` | a squat is not a chest movement; breaks boss damage + coach |
| Wall Sit | `chest` | `calf` | same |

Leave `Druid's Cobra Stretch → back, chest` (a cobra does load thoracic extension and stretches
the chest) and `Shadow Step Lunge → abs, calf` (anti-rotation demand is real). Note both in the
migration comment so a future pass does not "re-fix" them.

### A2. Rebalance the 13 existing quests

> ✅ **Applied** — [`0013_rebalance_quests.sql`](../../drizzle/0013_rebalance_quests.sql).
> Estimates below are the real output of [db/estimate.ts](../../db/estimate.ts) at `medium`,
> asserted by [`content-invariants.test.ts`](../../__tests__/content-invariants.test.ts).

Every row is a `UPDATE quests SET rounds/restSeconds` plus, where the composition column says
so, a delete + re-insert of `quest_exercises`.

| Quest | Archetype | R | Rest | Composition change | New est. |
| --- | --- | --: | --: | --- | --: |
| Chop Wood | Circuit | 3 | 45 s | unchanged (Squat → Push-ups → Plank) | 11:30 |
| Tower Climb | Hypertrophy | 3 | 60 s | insert **Goblin Squat** between Pull-ups and Plank; drop Crunch (abs on abs) | 13:24 |
| Knight Push | Circuit | 3 | 45 s | append **Superman** (first equipment-free pull in the starter set) | 11:54 |
| Shield Wall | Core | 3 | 45 s | append **Superman** | 11:48 |
| Gather Stones | Circuit | 3 | 45 s | append **Glute Bridge** (hinge) | 12:00 |
| Raise the Shelter | Circuit | 3 | 45 s | append **Dead Bug** | 10:57 |
| Core Forge | Core | 3 | 60 s | Stone Guardian Plank → **Reverse Crunch** → **Side Plank** (was Plank+Crunch) | 13:18 |
| Golem Strike | Circuit | 3 | 45 s | append **Superman** | 13:24 |
| Golem Core | Core | 3 | 60 s | insert **Side Plank** before Crunch (hardest first: medium → medium → easy) | 14:42 |
| Forge the Dragon Blade | Strength | 3 | 90 s | reorder hardest-first: Archer's Pike → Diamond → Titan's Dip; **drop Dragon Push-up**, append **Superman** as antagonist. 16 push sets → 9 | 22:27 |
| Climb the Titan's Tower | Strength | 3 | 90 s | **unchanged** — already correct | 17:36 |
| Build the Stronghold | Hypertrophy | 3 | 60 s | 5 → 4 exercises: Iron Grip Pull-up → Dragon Push-up → Goblin Squat → Stone Guardian Plank (drop Shadow Step Lunge) | 19:30 |
| The Iron Gauntlet Challenge | Strength | 3 | 90 s | 5 → 4: Archer's Pike → Iron Grip Pull-up → Titan's Dip → Hollow Body (drop Diamond Push-up). Push sets 15 → 6 | 24:03 |

Result: all 13 quests land in **10:57 – 24:03**, no quest exceeds 12 sets on one muscle, no
muscle survives four consecutive exercises, difficulty is non-increasing, and rest matches
archetype.

### A3. Equipment honesty

Quests containing `pullup_bar` exercises after A2: Tower Climb, Climb the Titan's Tower,
Build the Stronghold, The Iron Gauntlet Challenge. They stay bar-based (that is their identity),
and Phase D adds equipment-free pull quests so a bar-less user is never dead-ended. The quest
list filter already surfaces equipment ([app/(tabs)/quests/index.tsx:247-275](<../../app/(tabs)/quests/index.tsx#L247-L275>));
Phase F turns it into an exclusion filter.

---

## 4. Phase B — seed what is already written and drawn

> ✅ **Applied** — [`0014_seed_spec_quests.sql`](../../drizzle/0014_seed_spec_quests.sql).
> Catalogue: 13 → 19 quests, no art generated, every cover resolves.

Six quests, straight from [content-generation.md](../content/content-generation.md), with the
rest/rounds/order adjusted to §2.1–2.2 where the spec drifts. Covers and `assetMap` keys
already existed.

| Quest (EN / FR) | Archetype | R | Rest | Exercises (in order) | Est. |
| --- | --- | --: | --: | --- | --: |
| **Escape the Collapsing Mine** / Fuite de la Mine Effondrée | Metabolic | 3 | 45 s | Berserker Burpee 8-12 · Monk's Mountain Climber 30-45 s · Paladin's High Knee 30-45 s · Thunder Jumping Jack 20-30 | 15:48 |
| **Guard the Fortress Gate** / Garder la Porte de la Forteresse | Core | 3 | 60 s | Wall Sentinel Hold 30-45 s · Stone Guardian Plank 30-60 s · Goblin Squat 12-15 · Shadow Step Lunge 10-12 | 18:54 |
| **The Arcane Gauntlet** / Le Gant Arcanique | Core | 3 | 45 s | Alchemist's Hollow Body 20-30 s · Stone Guardian Plank 45-60 s · Wizard's Bicycle Crunch 15-20 · Monk's Mountain Climber 30-40 s | 15:42 |
| **The Druid's Path** / Le Chemin du Druide | Mobility | 2 | 30 s | Samurai's Warrior Pose 45-60 s · Shadow Step Lunge 8-10 · Druid's Cobra Stretch 30-45 s | 6:26 |
| **Sprint Through the Shadowlands** / Sprint à Travers les Terres d'Ombre | Metabolic | 3 | 45 s | Berserker Burpee 10-12 · Paladin's High Knee 40-50 s · Rogue's Skater Hop 15-20 · Thunder Jumping Jack 25-30 | 16:27 |
| **Morning of the Champion** / Matin du Champion | Circuit | 3 | 45 s | Goblin Squat 12-15 · Dragon Push-up 10-12 · Thunder Jumping Jack 20-25 · Druid's Cobra Stretch 30-40 s | 14:54 |

Deviations from the spec, and why:

- **Arcane Gauntlet**: 4 rounds → 3 (four rounds of four core movements = 16 core sets in one
  session, over the ceiling in §2.2 rule 4), and the hollow body + plank lead instead of
  trailing (rule 3).
- **Morning of the Champion**: rest 30 → 45 s — it is a full-body circuit, not a metabolic
  quest, and 30 s between a squat set and a push-up set is under the floor. It also opens on
  the squat rather than the jumping jack (rule 3). The jack would have been a fine warm-up,
  but the app has no warm-up block to declare it as one, so the difficulty rule wins.
- **Sprint Through the Shadowlands**: the burpee (hard) moves from third to first, same rule.
- **The Druid's Path**: warrior pose leads, cobra stretch closes — required by rule 3, and a
  better mobility flow anyway (standing → lunge → floor).

---

## 5. Phase C — close the equipment-free pull gap

> ✅ **Applied** — [`0015_seed_pull_exercises.sql`](../../drizzle/0015_seed_pull_exercises.sql),
> plus `dip_bar` added to `equipmentCodes` ([db/schema.ts](../../db/schema.ts)) and its labels.
> The equipment column has no `CHECK` constraint, so a new code costs two TypeScript lines and
> no migration. Declared equipment envelope: bodyweight + pull-up bar + dip bar.

The catalogue could not build a balanced program without a bar: the only equipment-free pulling
movement was `Superman`. Two new exercises, both from the research's own list of no-equipment
pull solutions:

| EN / FR | Difficulty | Equipment | s/rep | Muscles | Description hook |
| --- | --- | --- | --: | --- | --- |
| **Table Row** / Tirage sous la table | medium | none | 3 | back, arms | Lie under a sturdy table, grip the edge, pull your chest to it. Body straight, heels on the floor. |
| **Towel Door Row** / Tirage à la serviette | easy | none | 3 | back, arms | Loop a towel around a door handle on both sides, lean back, pull yourself upright. Step your feet closer to make it harder. |

Naming follows `0010`, the most recent exercise batch: plain and descriptive on the exercise,
fiction on the quest that uses them (D3 is still *The Cellar Hauler*). Both are tagged
`equipment = 'none'` — a kitchen table and a door handle are furniture, not fitness gear, and
the requirement is carried by the description.

Art: 2 new exercise images required (`table_row.png`, `towel_door_row.png`), same pipeline as
[missing-image.md](../content/missing-image.md) §4. Until they exist, both rows fall back to the
placeholder — acceptable, the quest still runs.

---

## 6. Phase D — eight new quests

> ✅ **Applied** — [`0016_seed_new_quests.sql`](../../drizzle/0016_seed_new_quests.sql).
> Catalogue: 48 exercises, 27 quests, **zero unused exercises** (one documented exception, see
> below). Covers do not exist yet, so these eight resolve to the placeholder until the art pass.

Designed to cover every hole the audit found: absolute beginner, hinge, equipment-free pull,
bar pull, skill, explosive legs, anti-rotation core. Three compositions changed between the
draft below and the migration, each caught by running the invariants before writing the SQL:

- **The Cellar Hauler**: Dead Bug inserted between the two rows — Table Row and Towel Door Row
  carry identical muscle sets, which the consecutive-muscle rule forbids.
- **The Ploughman's Vow**: reordered hardest-first, and added to the single-pattern allow-list.
  Every leg movement tags `calf`, so a leg-focused quest cannot satisfy the rule at all; the
  12-set cap guards it instead (it sits exactly at 12).
- **The Crow's Ascent**: the hanging leg raise moves to second so difficulty is non-increasing.

### D1. The Squire's Awakening / L'Éveil de l'Écuyer

- **Archetype** Circuit · **Level** absolute beginner · **Equipment** none · **2 rounds, 45 s** · **8:25**
- Wall Push-Up 8-12 → Glute Bridge 12-15 → Dead Bug 10-12 → Superman 20-30 s
- **Why**: there is no entry point today — the easiest existing quest is a 3-exercise circuit
  with full push-ups. This is the "first win in minutes" quest (research: D1 activation).
- **Hook**: *"You are not a hero yet. You are the one who carries the shield. Today, that is enough."*

### D2. The Bear's Road / La Route de l'Ours

- **Archetype** Circuit · **Level** beginner+ · **Equipment** none · **3 rounds, 45 s** · **14:33**
- Bear Crawl 30-40 s → Goblin Squat 12-15 → Wall Push-Up 10-15 → Superman 20-30 s
- **Why**: bridges D1 to the standard circuits; introduces locomotion and the pull pattern.

### D3. The Cellar Hauler / Le Tirage du Cellier

- **Archetype** Hypertrophy (pull) · **Level** all · **Equipment** none · **3 rounds, 60 s** · **12:33**
- Table Row 8-12 → Towel Door Row 10-15 → Superman 20-30 s
- **Why**: the single most important gap. First quest where a bar-less user trains their back
  for real. Depends on Phase C.
- **Hook**: *"The cellar hatch is jammed and the storm is coming. Pull, or sleep in the rain."*

### D4. The Ploughman's Vow / Le Serment du Laboureur

- **Archetype** Hypertrophy (hinge + legs) · **Level** intermediate · **Equipment** none · **3 rounds, 60 s** · **17:09**
- Ranger's Single Leg Deadlift 8-10 → Glute Bridge 15-20 → Curtsy Squat 10-12 → Standing Calf Raise 15-20
- **Why**: the hinge pattern appears in exactly one quest today. Posterior chain is the most
  neglected pattern in bodyweight training.

### D5. The Crow's Ascent / L'Ascension du Corbeau

- **Archetype** Strength (vertical pull) · **Level** advanced · **Equipment** pull-up bar · **3 rounds, 90 s** · **21:06**
- Chin-Up 4-6 → Inverted Row 8-12 → Hanging Leg Raise 6-10 → Scapular Pull-Up 8-10
- **Why**: uses four of the six bar exercises, none of which appear in any quest. Scapular work
  last as the endurance finisher.

### D6. The Colossus Trial / L'Épreuve du Colosse

- **Archetype** Skill · **Level** advanced · **Equipment** none · **3 rounds, 120 s** · **18:48**
- Handstand Push-Up 3-5 → L-Sit 15-25 s → Windshield Wipers 6-10
- **Why**: the app has no skill quest. This is the visible top of the ladder (§2.3) and the
  closest thing to the calisthenics skill tree the research recommends.
- **Hook**: *"The colossus stands on its hands and the world hangs beneath it. Hold. Do not fall."*

### D7. Storm of Blades / La Tempête de Lames

- **Archetype** Metabolic (explosive legs) · **Level** intermediate · **Equipment** none · **3 rounds, 40 s** · **12:32**
- Jump Squat 10-15 → Rogue's Skater Hop 16-20 → Star Jump 20-25 → Standing Calf Raise 20-25
- **Why**: plyometric leg work exists nowhere; also the third distinct cardio quest so the
  Scout's Trial adventure stops repeating a single quest.

### D8. The Serpent's Coil / L'Étreinte du Serpent

- **Archetype** Core (anti-rotation) · **Level** all · **Equipment** none · **3 rounds, 40 s** · **13:02**
- Side Plank 20-30 s → Russian Twist 16-20 → Flutter Kicks 20-30 s → Reverse Crunch 12-15
- **Why**: every core quest today is anti-extension only (plank + crunch). Adds rotation and
  anti-lateral-flexion, and consumes four unused exercises.

**Coverage check after Phase D** — every one of the 46 exercises (48 with Phase C) is used by
at least one quest, and every movement pattern has an equipment-free quest:

| Pattern | Equipment-free quest |
| --- | --- |
| Horizontal push | Chop Wood, Knight Push, Morning of the Champion, D1, D2 |
| Vertical push | Forge the Dragon Blade, D6 |
| Horizontal pull | **D3** (new), Knight Push (Superman) |
| Vertical pull | bar only — flagged in-app (see §8 F2) |
| Squat | Gather Stones, Guard the Fortress Gate, D7 |
| Hinge | **D4** (new), Gather Stones |
| Core | Core Forge, The Arcane Gauntlet, **D8** |
| Cardio | Escape the Mine, Sprint Shadowlands, **D7** |
| Mobility | The Druid's Path |

---

## 7. Phase E — adventures

### E0. Boss damage: the flaw the pre-flight found, and the fix

> ✅ **Applied** — [`0017_seed_adventures.sql`](../../drizzle/0017_seed_adventures.sql) plus the
> seconds normalisation in [db/bossFights.ts](../../db/bossFights.ts).

Before writing any SQL, every proposed campaign was replayed against the **real** damage formula
([db/bossFights.ts](../../db/bossFights.ts) + the `muscles[0]` primary-muscle pick in
[stores/session.ts:249](../../stores/session.ts#L249)): `damage = resultValue × 1.5 if weakness ×
0.5 if resistance`, doubled on a crit that fires 30 % of the time when the target is met.
Expected damage per set is `target × modifier × 1.3`, summed over exercises × rounds.

Two problems fell out.

**Reps and seconds were not the same unit.** Damage took the raw result value, so a 60 s plank
dealt 60 and a 12-rep squat dealt 12 — the app's hardest content (low-rep strength work) dealt
the *least* damage, and campaigns built on long holds dealt four times what a mobility day did.
Fixed at the source: `dealDamage` now converts a time result to rep-equivalents at
`SECONDS_PER_REP_EQUIVALENT = 3`, the catalogue's median `secondsPerRep`. A 60 s hold and a
20-rep set are now worth the same. `stores/session.ts` passes the target type through; omitting
it still means reps, so nothing else had to change.

**Every boss died two steps into its campaign.** The spec's HP values were written against a
mental model of ~150 damage per session; the measured figure after normalisation is 68–445.

| Campaign | Steps | Spec HP | Campaign total | Would die at | **New HP** |
| --- | --: | --: | --: | --- | --: |
| The Monk's Enlightenment | 4 | 350 | 745 | step 2 | **680** |
| The Scout's Trial | 5 | 400 | 1 853 | step 2 | **1 700** |
| The Guardian's Oath | 6 | 600 | 1 166 | step 3 | **1 070** |
| The Ranger's Journey | 7 | 550 | 2 232 | step 2 | **2 050** |
| The Iron Lord's Conquest | 8 | 800 | 1 177 | step 6 | **1 080** |
| **The Golem** (shipped) | 2 | **200** | 422 | **step 1** | **380** |

HP is set at ≈ 92 % of the campaign total, so the boss falls on the last step with headroom for
users who beat their targets.

**The Golem was a live bug, and A2 caused it.** It was roughly calibrated before — 2 rounds dealt
~130 against 200 HP, dying on the last step — and the A2 rebalance took Golem Strike from 2
rounds to 3. It has been dying on the first of its two sessions ever since. The migration also
resets undefeated `boss_fights` rows, because that table caches `totalHp` at creation time and an
install that already opened a boss would otherwise keep the old value.

**HP still is not a difficulty signal.** Damage is proportional to rep volume, and strength work
is low-volume by design, so the elite Iron Lord (1 080) sits below the intermediate Ranger's
Journey (2 050). Each boss is tuned to its own campaign; the number is internal.

### E1. New: The Squire's Path / Le Chemin de l'Écuyer

`kind = route`, no boss, 4 steps, 100 % equipment-free, ~50 min of total training.

| Step | Quest | Narrative beat |
| --: | --- | --- |
| 0 | The Squire's Awakening | You are handed a shield you can barely lift. |
| 1 | The Bear's Road | The road to the keep, on all fours if needed. |
| 2 | The Serpent's Coil | The first real trial: hold the centre. |
| 3 | The Ploughman's Vow | You earn your place by working the land. |

**Why**: the current first adventure (Lumber Route) opens with full push-ups and 3 sessions of
4 minutes. This one is the actual on-ramp — the beginner's D1..D7 path, and the natural target
of the Home CTA for a new hero.
Art: **new cover required** (`squire_path.jpg`).

### E2. Seed The Scout's Trial (cardio, boss: Wind Wraith)

`bossTotalHp 1700` (see E0), weakness `calf`, resistance `arms`. Cover + boss art exist.
Spec repeats `sprint_shadowlands` three times; replaced with real variety:

| Step | Quest |
| --: | --- |
| 0 | Morning of the Champion |
| 1 | Sprint Through the Shadowlands |
| 2 | Storm of Blades (D7) |
| 3 | Escape the Collapsing Mine |
| 4 | Sprint Through the Shadowlands |

Weakness `calf` is coherent: every step is leg-dominant, so the fight actually resolves.

### E3. Seed The Guardian's Oath (strength/defence, boss: Stone Golem)

`bossTotalHp 1070` (see E0), weakness `back`, resistance `chest`. 6 steps:

| Step | Quest |
| --: | --- |
| 0 | Guard the Fortress Gate |
| 1 | The Cellar Hauler (D3) |
| 2 | Build the Stronghold |
| 3 | The Serpent's Coil (D8) |
| 4 | Climb the Titan's Tower |
| 5 | Guard the Fortress Gate |

Weakness `back` requires pulling volume in the campaign — D3 makes that reachable without a bar,
which the spec's original composition did not.

### E4. Seed The Monk's Enlightenment (mobility/core, boss: Shadow Serpent)

`bossTotalHp 680` (see E0), weakness `abs`, resistance `calf`. 4 steps:
The Druid's Path → The Arcane Gauntlet → The Serpent's Coil (D8) → The Druid's Path.
The lightest campaign — the "keep the flame alive on a tired week" path.

### E5. Seed The Ranger's Journey (endurance, boss: Forest Titan)

`bossTotalHp 2050` (see E0), weakness `calf`, resistance `shoulder`. 7 steps:
Morning of the Champion → The Ploughman's Vow (D4) → Sprint Through the Shadowlands →
Build the Stronghold → Storm of Blades (D7) → The Bear's Road (D2) → Morning of the Champion.

### E6. Restructure The Iron Lord's Conquest

Today: 8 steps, 4 distinct quests, Iron Gauntlet 4× at 41 min each (≈ 5 h 20 of training, over
half of it push). After A2 the quests are shorter; the step list also changes to alternate
patterns and to use the new advanced quests:

| Step | Quest | Pattern |
| --: | --- | --- |
| 0 | Forge the Dragon Blade | push |
| 1 | The Crow's Ascent (D5) | pull |
| 2 | The Colossus Trial (D6) | skill |
| 3 | Build the Stronghold | full body |
| 4 | The Iron Gauntlet Challenge | mixed |
| 5 | Climb the Titan's Tower | pull/hinge |
| 6 | The Colossus Trial (D6) | skill |
| 7 | The Iron Gauntlet Challenge | mixed |

Total **2 h 46** across 8 sessions, no pattern twice in a row. `bossTotalHp` 800 → **1080**
(see E0), weakness `abs`, resistance `chest`.

### E7. Adjust the two existing adventures

- **The Lumber Route**: unchanged step list; its three quests are already rebalanced by A2
  (11:30 / 12:00 / 10:48 instead of 9:30 / 4:34 / 3:58). Re-describe as the *second* route,
  after The Squire's Path.
- **The Golem**: weakness `chest` is correct only after A1 fixes the Squat tag. `bossTotalHp`
  200 → **380** (E0). This is a live bug, not a nice-to-have: with A2 shipped, Golem Strike
  alone deals 242 against 200 HP, so the boss dies on the first of its two sessions.

### E8. Adventure catalogue after Phase E

| Adventure | Kind | Steps | Level | Equipment | Boss |
| --- | --- | --: | --- | --- | --- |
| The Squire's Path | route | 4 | beginner | none | — |
| The Lumber Route | route | 3 | beginner+ | none | — |
| The Monk's Enlightenment | boss | 4 | all | none | Shadow Serpent 680 |
| The Scout's Trial | boss | 5 | intermediate | none | Wind Wraith 1700 |
| The Golem | boss | 2 | intermediate | none | Stone Golem-flavoured 380 |
| The Ranger's Journey | boss | 7 | intermediate | none | Forest Titan 2050 |
| The Guardian's Oath | boss | 6 | advanced | bar for 1 step | Stone Golem 1070 |
| The Iron Lord's Conquest | boss | 8 | elite | bar | Iron Lord 1080 |

Eight adventures, an ordered difficulty ramp, and five of them fully equipment-free.

---

## 8. Phase F — selection & surfacing

> ✅ **F1 + F2 applied.** F3 remains open.

**What the pre-flight found: `getDailyQuest` is dead code.** Nothing in the app calls it. The
only live consumer of the daily hash is `isDailyQuest`, which grants a silent +50 % XP bonus if
the quest you happened to pick is today's — the user is never told which one that is. The screen
that actually decides what to put in front of someone is Home, through
[`useSmartAction`](../../components/home/useSmartAction.ts): resume an adventure, otherwise
`getSuggestedQuestsForWeakAreas(1)`. **That** is the function the audit's finding applies to, and
it ignored level, equipment and recovery entirely while ranking by "matches the most weak
muscles" — which correlates with the longest, hardest quests.

- **F1 — eligibility.** [`getEligibleQuestIds`](../../db/quests.ts) is the one gate, used by the
  Home suggestion and by the daily pick. It excludes exactly two things, both of which leave a
  hero stuck rather than challenged: equipment they do not own, and `advanced` quests for
  someone who said they are a beginner. A "regular" hero is still offered advanced work — that
  is a stretch, not a wall — and a hero who skipped the onboarding question is not filtered at
  all. A quest's level is the **upper median** of its exercise difficulties, derived rather than
  stored: one hard movement does not make a whole session advanced, and one easy finisher does
  not soften a hard one.
- **F1b — recovery.** Muscles trained yesterday **demote** a suggestion instead of excluding it.
  The 48 h guidance is real, but a hard filter stacked on top of "weak areas only" could empty
  the list; a lower rank achieves the rotation without the cliff.
- **F2 — equipment.** `ownedEquipment` is a preference holding the codes the hero owns, cycled
  from one Settings row: *show all → bodyweight only → pull-up bar → bar + dip station*. `null`
  means never answered and shows everything, so nobody loses content by not opening the screen.
  The **quest gallery is deliberately left unfiltered**: hiding content from someone who is
  browsing on purpose is worse than showing it, and its own equipment filter already narrows.
- **F3 — archetype, as a column.** ✅ The plan said "derive it at read time, no migration". That
  does not survive contact with the data: a metabolic quest and a full-body circuit both rest 45 s
  and both tag `calf` and `abs`, so rest length and muscles cannot tell them apart. Meanwhile the
  declaration existed — in a hand-maintained map inside the invariants test, where the app could
  not reach it. `0019` promotes it to a nullable `quests.archetype` column, seeded for all 27
  quests. The test now reads the column instead of duplicating it, so the migration removed a
  duplication rather than adding one, and the quest card shows the badge. User-authored quests
  leave it null and simply show one chip fewer.

Fallbacks everywhere: if filtering leaves nothing, the unfiltered pool is used. A preference
should never be able to leave the hero with no workout.

---

## 9. Phase G — oaths (only what this content change forces)

[Oaths](../gameplay/oaths.md) are the part of the app that best matches the research already:
the target is **chosen by the user** (SDT autonomy — self-chosen goals outperform imposed ones),
progress is derived from the journal, one commitment at a time. The system does not need a
redesign. Three things break or age badly because of the content work, and one is a genuine gap.

### G1. Presets point at content that is changing ✅

> Applied in [db/oaths.ts](../../db/oaths.ts) and [app/oath.tsx](../../app/oath.tsx).

The deck gains two exercise oaths that the content work made possible — `table_rows_15`, the
first back oath a hero without a bar can actually move, and `lsit_30`, the top of the skill
ladder authored in §2.3 — and the screen now **drops any preset whose exercise needs kit the
hero does not own** (§8 F2). An oath you cannot move is worse than no oath at all.

### G2. Resolved — the flame now measures consistency ✅

> Applied in [db/streaks.ts](../../db/streaks.ts), with the wording chased through
> [db/achievements.ts](../../db/achievements.ts), the oath presets and both locales.

G2 was never blocked on code. It was blocked on a contradiction: the app cannot ask someone to
swear to 30 consecutive training days while the Coach nudges a rest day at 5. Relabelling the
preset would have hidden that, not fixed it — so the flame changed instead.

**The flame counts days of consistency.** A day stays lit while the trailing 7-day window holds
the hero's quota of sessions, or the week before it did: rest days cost nothing, one blank week
is forgiven, two put it out. The unit is still days, so `getFlameLevel`'s thresholds
(3/7/14/30/100) and all six streak achievements keep working untouched — and because the streak
was always derived from the journal rather than stored, no migration was needed. Every hero's
flame simply grew the day it shipped.

**The oath sets the flame's bar.** Without an oath the quota is the WHO baseline of 2 a week;
a `weekly_sessions` oath raises it to the chosen 2, 3 or 4. That is this plan's answer to "could
the flame *be* the oath": the flame is the live representation of whether the hero is keeping
their promise, with a sensible default promise for anyone who has not made one. One mechanic,
one unit, a target that is chosen rather than imposed.

Two things kept deliberately:

- The `streak` oath still reads `best`, not `current` — a flame going out does not undo the
  oath's progress. It was an accident of the old implementation; it is now a decision.
- Achievement descriptions now say "keep your flame lit for N days" instead of "achieve an N-day
  streak", because the second sentence is no longer true.

Deleted on the way: `components/common/StreakBadge.tsx`, a second, unused implementation of the
old consecutive-day rule that nothing imported and that would have drifted silently.

### G3. Weekly consistency ✅

> Applied: `weekly_sessions` in [db/oaths.ts](../../db/oaths.ts), four cases in
> [db-oaths.test.ts](../../__tests__/db-oaths.test.ts).

The one metric that measures a habit instead of a result. `weekly_sessions` counts the weeks
since the oath was sworn in which the hero logged at least `weeklyTarget` sessions — weeks run
from the day of the promise, not from Monday, because the hero's week starts when they made it.

The counting *is* the feature: a missed week costs that week and nothing else. Nothing resets,
nothing is forfeited, and last week's miss cannot undo the eight weeks before it. That is the
forgiveness a strict consecutive-day streak cannot offer, expressed as a promise rather than a
punishment — and it is asserted directly ("a missed week costs one week and nothing else").

Preset `weekly_3x_8w` leads the deck (WHO-aligned: ≥ 2 strength days a week, over the ~2-3 month
horizon habit formation actually needs). The custom form exposes 2 / 3 / 4 per week, because a
sedentary hero starting at twice a week is the exact user the research says to design for — "some
is better than none".

### G4. Not doing

Multiple simultaneous oaths (the doc's "a list of targets is a todo list" holds), oath history,
social/shared oaths, escalating XP by difficulty. None of them are implied by the content work.

---

## 10. Migrations & files

| File | Content |
| --- | --- |
| `drizzle/0012_fix_exercise_muscles.sql` | A1 — delete the two wrong tags |
| `drizzle/0013_rebalance_quests.sql` | A2 — `UPDATE quests` + `DELETE`/`INSERT quest_exercises` for the 13 |
| `drizzle/0014_seed_spec_quests.sql` | B — 6 quests + `quest_exercises` + `imagePath` |
| `drizzle/0015_seed_pull_exercises.sql` | C — 2 exercises + `exercise_muscles` |
| `drizzle/0016_seed_new_quests.sql` | D — 8 quests + `quest_exercises` |
| `drizzle/0017_seed_adventures.sql` | ✅ E1–E7 — 5 adventures, 34 steps with EN/FR narratives, boss re-tune, Iron Lord rewrite, intended art paths |
| ~~`drizzle/0018_seed_new_covers.sql`~~ | Not needed: `0017` already writes the intended `imagePath` for every new quest, adventure and exercise. Unknown keys resolve to the placeholder, so the art pass is files + `assetMap` keys and no SQL. |

Every file must also be: imported in [drizzle/migrations.js](../../drizzle/migrations.js), added
to `drizzle/meta/_journal.json` (`npm run db:generate` writes the entry — verify the tag matches
the filename), and applied with `npm run db:push` on a dev DB before committing.

Follow the existing seed conventions: `--> statement-breakpoint` between statements,
`INSERT ... SELECT ... WHERE enTitle = '…'` for FK resolution, `''` for apostrophes,
`strftime('%s','now') * 1000` timestamps.

Non-SQL files touched:

- [constants/assetMap.ts](../../constants/assetMap.ts) — add keys for the new covers
  (8 quests, 1 adventure, 2 exercises). Existing keys already cover Phase B.
- `assets/images/quests/`, `assets/images/adventures/`, `assets/images/exercises/` — new art.
- No i18n keys: quest and adventure strings live in the DB (`enTitle`/`frTitle`), so translation
  ships with the migration. **Do not** add `locales/*.json` entries for content.

---

## 11. Tests & invariants

✅ [`__tests__/content-invariants.test.ts`](../../__tests__/content-invariants.test.ts) — runs the
real migrations into an in-memory DB via [`helpers/testDb`](../../__tests__/helpers/testDb.ts),
then reads the content back through `getQuestById(..., "medium")`, so it asserts what the app
actually serves, not what the SQL was meant to say.

| # | Invariant | Status |
| --: | --- | --- |
| 1 | Every seeded quest declares an archetype | ✅ |
| 2 | `estimateQuestSeconds` at `medium` ∈ [480, 1500] s (mobility ≥ 300) | ✅ |
| 3 | Difficulty non-increasing (hardest first) | ✅ |
| 4 | Consecutive exercises share ≤ 1 muscle, never identical sets (Core/Strength/Skill/Metabolic exempt) | ✅ |
| 5 | ≤ 12 sets per muscle per quest — carries the weight for the exempt archetypes | ✅ |
| 6 | `restSeconds` inside the archetype's range | ✅ |
| 7 | All-`none` equipment, or in the bar allow-list | ✅ |
| 8 | Boss adventures set hp + weakness + resistance | ✅ |
| 9 | Every exercise used by ≥ 1 quest | ✅ (one documented exemption) |
| 10 | Adventures have ≥ 2 steps and never repeat a quest back to back | ✅ |
| 11 | Every `imagePath` resolves to an `assetMap` key | extend [assetMap.test.ts](../../__tests__/assetMap.test.ts) with the art pass |

Rules from §2.2 that are deliberately **not** tests:

- **"Strength quests need an antagonist"** — the taxonomy cannot express movement patterns
  (`back` covers a pull-up, a hinge and a spinal-erector hold), so the rule false-positives on
  Climb the Titan's Tower and is toothless everywhere else. Invariants 5 and 6 catch the defect
  it was written for. It stays as authoring guidance.
- **"No muscle across four consecutive exercises"** — written for Forge's four straight push
  movements, but with six muscle codes it also fails every legitimate four-exercise core quest
  (`abs` in all four) and every cardio quest (`calf` in all four). Invariant 5 catches the
  original defect on its own, so the window rule was removed rather than exempted into
  meaninglessness.
- **The archetype registry** used to live in this test file. It is now the `quests.archetype`
  column (`0019`), and the first invariant fails for any seeded quest that leaves it null — a new
  quest still cannot ship without declaring what it is meant to be.

Existing tests touched so far: `db-exercises` (it asserted the `Squat → chest` bug). `db-quests`,
`db-adventures`, `db-adventures-campaign`, `db-bossFights` and `db-muscleBalance` all still pass
unchanged after A1 + A2.

---

## 12. Art checklist

| Asset | For | Status |
| --- | --- | --- |
| 6 quest covers (Phase B) | escape_collapsing_mine, guard_fortress_gate, arcane_gauntlet, druid_path, sprint_shadowlands, morning_champion | ✅ on disk + in assetMap |
| 4 adventure covers (Phase E2–E5) | scout_trial, guardian_oath, monk_enlightenment, ranger_journey | ✅ on disk + in assetMap |
| 4 boss images | wind_wraith, stone_golem, shadow_serpent, forest_titan | ✅ on disk + in assetMap |
| 8 quest covers (Phase D) | squire_awakening, bears_road, cellar_hauler, ploughmans_vow, crows_ascent, colossus_trial, storm_of_blades, serpents_coil | ❌ generate — paths already seeded |
| 1 adventure cover (E1) | squire_path | ❌ generate — path already seeded |
| 2 exercise images (Phase C) | table_row, towel_door_row | ❌ generate — paths already seeded |

All eleven paths are already written to the database by `0017`, and every `getXAsset()` helper
resolves an unknown key to the placeholder. The art pass is therefore: generate the files, drop
them in `assets/images/`, add the eleven keys to [assetMap.ts](../../constants/assetMap.ts). No
migration, no content change.

The **11 prompts are already written** into `scripts/generate-covers.py` (9) and
`scripts/generate-exercises.py` (2), in the house style and following the conventions those files
already encode — environment-only scenes for covers, glowing character poses for exercises, and
the "no people in frame" negative that earlier batches needed. Generating them is one command:

```sh
MAMMOUTH_API_KEY=sk-… python3 scripts/generate-covers.py squire_path squire_awakening \
  bears_road cellar_hauler ploughmans_vow crows_ascent colossus_trial storm_of_blades serpents_coil
MAMMOUTH_API_KEY=sk-… python3 scripts/generate-exercises.py table_row towel_door_row
```

Then add the 11 keys to [assetMap.ts](../../constants/assetMap.ts). No SQL: `0017` already wrote
every `imagePath`. Model choice and review method are recorded in
[missing-covers.md](../content/missing-covers.md) (`gemini-3.1-flash-image-preview`, 1024×768 JPG
for covers; PNG for exercises per [missing-image.md](../content/missing-image.md) §5).

`generate-covers.py` was the one script without the 429/5xx backoff its siblings have — a known
failure mode in [missing-image.md](../content/missing-image.md), and this batch is nine covers
long, so it now retries like the others. The prompts were also checked against that page's rules:
shot type first, semantic negatives ("the trail is empty — no animals, no people"), and no
restating of the art direction, which the shared `STYLE` constant appends on its own.

The key is not present in this environment — not in the shell, not in a profile, not in a
dotfile — so the files cannot be produced here. That is the one remaining item on this page, and
it is a credential away rather than a decision away. Once run: review a contact sheet, check the
corner pixel is near-black, then add the 11 keys to `assetMap` — the count-match target is
**48/48 exercises, 27/27 quests, 8/8 adventures**.

---

## 13. Execution order & gates

| # | Phase | Depends on | Gate |
| --: | --- | --- | --- |
| 1 | A1 muscle fixes | — | ✅ **done** — `0012_fix_exercise_muscles.sql`; suite green, `db-exercises` expectation updated (it asserted the bug) |
| 2 | A2 quest rebalance | A1 | ✅ **done** — `0013_rebalance_quests.sql`; 9 invariants green on the 13 quests, full suite passes |
| 3 | B seed spec quests | A2 | ✅ **done** — `0014_seed_spec_quests.sql`; 19 quests, all in window, every cover resolves |
| 4 | C pull exercises | — | ✅ **done** — `0015_seed_pull_exercises.sql` + `dip_bar` code; 48 exercises |
| 5 | D new quests | C | ✅ **done** — `0016_seed_new_quests.sql`; 27 quests, catalogue coverage now a real test |
| 6 | E adventures | B, D | ✅ **done** — `0017_seed_adventures.sql` + damage normalisation; 8 adventures, all invariants live |
| 8 | F1 + F2 selection | E | ✅ **done** — eligibility gate on the Home suggestion and the daily pick, equipment preference + Settings row |
| 9 | G1 oath presets | D | ✅ **done** — equipment-free pull + skill presets, kit-aware deck |
| 10 | G3 weekly-sessions oath | — | ✅ **done** — `weekly_sessions`, 2/3/4 per week, forgiveness asserted by test |
| 11 | G2 flame rework | G3 | ✅ **done** — consistency streak, quota set by the oath, 9 tests rewritten |
| 12 | H1 readiness + disclaimer | — | ✅ **done** — `app/safety.tsx`, a line on the last onboarding step, a Settings row |
| 13 | H3 first session in onboarding | — | ✅ **done** — `onboarding/first-session.tsx` offers The Squire's Awakening, skippable |
| 14 | H2 warm-up | — | ✅ **done** — 2 min dynamic warm-up, skippable, nothing journaled; countdown copy fixed |
| 15 | H4 deload nudge | — | ✅ **done** — `deload` reason after 4 heavy weeks, acute rules still win |
| 16 | Art pass | D, E | ⏳ **blocked on a `MAMMOUTH_API_KEY`** — the 11 prompts are written into the generators; running them is one command |
| 17 | F3 archetype badge | F1 | ✅ **done** — `0019` adds `quests.archetype`; the test reads it, the card shows it |

Phases 1–3 are shippable on their own and are the highest value per line of SQL: they fix the
data that is actively wrong and triple the catalogue with content that is already paid for.

## 14. Phase H — the audit findings outside the content layer

The content audit that started this plan produced ten findings. Six were content or selection
problems and are closed by phases A–G; the rest live here so none of them is lost between
"noted in a chat" and "someone remembers".

### 14.0 Traceability — all ten findings

| # | Finding | Where it lives now |
| --: | --- | --- |
| 1 | The daily streak contradicted the Coach's rest rule | ✅ §9 G2 — the flame counts consistency |
| 2 | No medical disclaimer, no readiness question | ✅ H1 below |
| 3 | No warm-up; the countdown claims one happened | ✅ H2 below |
| 4 | `Squat` / `Wall Sit` tagged `chest` | ✅ §3 A1 — `0012` |
| 5 | Muscle taxonomy has no real lower body | §15 — its own roadmap, and it bit this plan three times |
| 6 | Pulling without equipment was impossible | ✅ §5 C + §6 D3 |
| 7 | Progression is a rep multiplier, not a ladder | §15 — the ladder is authored in §2.3, the unlock system is not built |
| 8 | Rest at 30 s on 9 of 13 quests | ✅ §3 A2 — `0013` |
| 9 | No deload, no 48 h rule | ✅ §8 F1b demotes yesterday's muscles; H4 below adds the deload |
| 10 | Onboarding never reaches a first session | ✅ H3 below |

### H1. Readiness and the medical disclaimer ✅

Zero occurrences of any health warning anywhere in the app today. This is the research's first
guardrail (§4 of the dossier) and a store requirement, and it is the cheapest item on this page.

- A short readiness note on the last onboarding step, before the hero starts training — not a
  wall of legal text, one honest paragraph plus "see a professional if any of this applies".
- The same text reachable afterwards from Settings, so it is not a one-time modal nobody can
  find again.
- No PAR-Q questionnaire with branching: a questionnaire the app does nothing with is theatre.
  It asks, it warns, it gets out of the way.

### H2. The warm-up ✅

> Applied: `status: "warmup"` in [stores/session.ts](../../stores/session.ts),
> [WarmupView](../../components/session/WarmupView.tsx),
> [constants/warmup.ts](../../constants/warmup.ts), four cases in `store-session.test.ts`.

A session now opens on a **2-minute dynamic warm-up** — jumping jacks, glute bridge, bear crawl,
cobra stretch — drawn from the seeded catalogue by name, so the movements arrive with their own
bilingual labels and art and there is no second kind of content to maintain. Two minutes rather
than the five to ten the literature describes: a five-minute warm-up in front of a twelve-minute
quest is a warm-up nobody does twice.

Nothing in it is journaled — no volume, no records, no boss damage. A warm-up is preparation, not
work, and a test asserts the journal stays empty through it.

It is skippable in one tap, and a Settings toggle saves that tap for anyone who never wants it.
The countdown no longer claims *"Warm-up done"*: it says the neutral thing, because it could not
know whether one had happened. No cool-down is planned — it is the one part of a session the
evidence says does nothing.

**A regression the tests caught, not the plan.** Reading the preference made `startSession`
asynchronous *before* it populated the store, and two callers did not await it — the session
screen would have mounted on an empty store and redirected the hero home. Both now await. The
same latent race already existed on the adventure path, where the boss fight is loaded before the
state is set.

### H3. The first session inside onboarding ✅

Onboarding is presentation → hero setup → training level → Home. The hero reaches the home screen
having done nothing. Completing a first meaningful action on day one is the single strongest
predictor of D30 retention in the research, and the content plan built the exact quest for it:
*The Squire's Awakening*, 8 minutes, four movements, no equipment.

- Offer it as the last onboarding step, skippable, never a gate.

### H4. Deload and accumulated fatigue ✅

> Applied: a `deload` reason in [restSuggestions](../../db/restSuggestions.ts), three cases in
> `db-restSuggestions.test.ts`.

Every rule in that file was acute — days in a row, sessions this week — so nothing could see
fatigue accumulating across a month, which is the window the deload guidance is actually about.
A fourth reason now counts back in 7-day buckets and stops at the first week that was not heavy:
**four consecutive weeks of 4+ sessions earns a suggestion to take a lighter one.** An easier week
anywhere in the chain resets the count, which is the point — the hero who already deloads is
never told to.

No new system, no persisted state, no notification: one more branch in the rule the Coach card
already renders, and it stays behind the acute rules. Being told to rest today outranks being
told to plan an easier week.

## 15. Deliberately not in this plan

- **Muscle taxonomy migration** (`calf` → quads/hamstrings/glutes/calves). Every quest in this
  plan is authored so it stays correct *after* that migration, but the migration itself touches
  the village, the boss modifiers, the exercise colours and the stats screen — its own roadmap.
- **A real progression/unlock system** (variation tiers gated by clean-rep thresholds). §2.3
  authors the ladder into the content so the system can be added later without re-authoring.
- **Per-set RIR capture**, warm-up blocks, deload weeks, streak forgiveness — audit items that
  belong to the session and habit layers, not the content layer.
Both open decisions from this list have since been taken: `calculateBossHp` now counts rounds and
normalises seconds like `dealDamage` does, and Barbarian's Overhead Press is deleted by
[`0018`](../../drizzle/0018_delete_dumbbell_exercise.sql) — guarded, because
`completed_exercises.exerciseId` is `ON DELETE NO ACTION` and would have aborted the migration
for anyone who had logged it through a custom quest.

## Related

- [content/workout-best-practices.md](../content/workout-best-practices.md) — the game-design
  translation these rules refine
- [content/content-generation.md](../content/content-generation.md) — the original content spec
  Phase B seeds
- [raw/bodyweight-app-research.md](../raw/bodyweight-app-research.md) — the evidence base
- [gameplay/quests.md](../gameplay/quests.md) · [gameplay/adventures.md](../gameplay/adventures.md) ·
  [gameplay/boss-fights.md](../gameplay/boss-fights.md) — the systems this content feeds
