---
title: Workout Design & Balancing
type: content
status: active
updated: 2026-07-30
related:
  [
    README.md,
    content-generation.md,
    ../gameplay/quests.md,
    ../gameplay/progression.md,
    ../raw/bodyweight-app-research.md,
  ]
sources: [db/targets.ts, db/schema.ts, constants/warmup.ts, raw/bodyweight-app-research.md]
---

# 🏋️ Best Practice Workout Design for BATI

> **Mission**: Transform real fitness science into epic RPG content.
>
> **Underlying science**: [`raw/bodyweight-app-research.md`](../raw/bodyweight-app-research.md)
> (volume, frequency, RIR, bodyweight progression, gamification & retention evidence).
> This page is the *game-design* translation; that source is the evidence base — where they
> disagree, the research wins. Ingested 2026-07-30: see
> [The evidence behind the numbers](#-the-evidence-behind-the-numbers) below, which is the
> part of this page that is **not** negotiable for flavour.

---

## 🎯 The 4 Pillars of BATI Fitness

Every hero needs a balanced foundation. BATI workouts are built on these 4 pillars:

### 1. 🦵 **SQUAT** (Legs & Lower Body)

- **Real Fitness**: Foundation of human movement, largest muscle groups
- **RPG Translation**: "Earth Power" — Heroes who can't move can't fight
- **Exercises**: Squats, Lunges, Wall Sits, Calf Raises
- **Resource**: 🌾 Grain (Farms grow from leg strength)
- **Building**: Farm → Barn

### 2. 💪 **PUSH** (Chest, Shoulders, Arms)

- **Real Fitness**: Upper body pushing strength (bench press family)
- **RPG Translation**: "Strike Force" — Your ability to attack
- **Exercises**: Push-ups, Pike Push-ups, Dips, Shoulder Press
- **Resources**: 🔥 Fire (Chest), 🌬️ Wind (Shoulders), 🪵 Wood (Arms)
- **Buildings**: Forge, Windmill, Archery Range

### 3. 🦴 **PULL** (Back, Arms)

- **Real Fitness**: Upper body pulling strength (row/pull-up family)
- **RPG Translation**: "Defense" — Your armor and resilience
- **Exercises**: Pull-ups, Rows, Reverse Snow Angels, Plank
- **Resources**: 🪨 Stone (Back), 🪵 Wood (Arms)
- **Buildings**: Quarry, Castle Walls

### 4. 🎯 **CARDIO** (Heart & Endurance)

- **Real Fitness**: Cardiovascular fitness, stamina
- **RPG Translation**: "Stamina Pool" — How long you can fight
- **Exercises**: Burpees, Mountain Climbers, High Knees, Jumping Jacks
- **Resource**: 💎 Essence (Universal training intensity)
- **Buildings**: All buildings benefit (faster construction)

---

## 🧪 Progressive Overload → RPG Progression

### Real Fitness Science

**Progressive Overload** = gradually increasing workout difficulty to force adaptation.

**Methods**:

1. **More Reps**: 10 push-ups → 15 push-ups
2. **More Sets**: 3 rounds → 4 rounds
3. **Less Rest**: 60s rest → 45s rest
4. **Harder Variations**: Push-ups → Diamond Push-ups

### RPG Translation

**"Fighting Stronger Monsters"** = the game automatically scales difficulty.

**User Level System**:

| Level | Multiplier | Example (10-12 reps base) |
|-------|------------|---------------------------|
| **Easy** | 0.75x | 8-9 reps |
| **Medium** | 1.0x | 10-12 reps |
| **Hard** | 1.25x | 13-15 reps |

**Auto-Scaling**:

- User completes a quest and marks feedback: "Easy" / "Good" / "Hard"
- System suggests next difficulty automatically
- Boss fights use fixed targets (no scaling) — true challenges

---

## ⚔️ Boss Fight Mechanics: Reps → Damage

Boss Fights are **special quests** where your performance directly damages the Boss HP bar.

### Damage Formula

```
Base Damage = Result Value (reps or seconds)
Critical Hit = Result >= Target (+50% bonus)
Muscle Modifier:
  - Weakness (1.5x damage)
  - Resistance (0.5x damage)
  - Neutral (1.0x damage)

Final Damage = Base × Critical × Muscle Modifier
```

### Example: Fire Dragon Boss

**Boss Stats**:

- Total HP: 500
- Weakness: 💧 Abs (Water)
- Resistance: 🔥 Chest (Fire)

**Session 1: Hero does "Golem Strike" quest**:

1. **Burpees** (Cardio, no muscle): 12 reps → 12 damage
2. **Plank** (Abs - Weakness!): 60s, target 45s → 60 × 1.5 (weakness) × 1.5 (critical) = **135 damage**
3. **Push-ups** (Chest - Resistance): 15 reps → 15 × 0.5 = **8 damage**

**Total**: 155 damage → Boss HP: 500 → 345 remaining

**Session 2**: Hero repeats, deals another 155 damage → 190 HP left

**Session 3**: Hero deals 200+ damage → **BOSS DEFEATED** 🏆

**Rewards**:

- 🪙 Boss Tokens (3-5 per boss)
- 🏰 Unlocks Legendary Building (Dragon Lair)
- 🎖️ Achievement unlocked

---

## 🎮 Quest Design Principles

### 1. **Duration Target: 10-25 minutes**

- **Formula**: `(Exercises × Rounds × SecondsPerRep) + (RestSeconds × (Sets - 1))`
- **Sweet Spot**: 15-20 minutes (mobile-friendly)
- **Boss Fights**: 20-30 minutes (epic battles take time)

### 2. **Exercise Order: Smart Sequencing**

**Bad**: Push-ups → Dips → Diamond Push-ups (all chest, fatigue stacks)
**Good**: Push-ups → Squats → Pull-ups → Plank (rotate muscle groups)

### 3. **Rest Periods: Context Matters**

- **Strength (heavy reps)**: 60-90s
- **Endurance (cardio)**: 30-45s
- **Core (planks)**: 45-60s
- **Supersets (alternating muscles)**: 15-30s

### 4. **Narrative Theme: Match Movement to Story**

| Quest Theme | Movement Style | Example Exercises |
|-------------|----------------|-------------------|
| **Escape the Mine** | Cardio, Panic | Burpees, High Knees, Mountain Climbers |
| **Guard the Gate** | Isometric Holds | Wall Sit, Plank, L-Sit Hold |
| **Storm the Castle** | Power Bursts | Jump Squats, Explosive Push-ups, Burpees |
| **Scout the Forest** | Steady Endurance | Jogging in Place, Slow Squats, Long Plank |

---

## 🧙 Exercise Styles → Resources

BATI has **4 exercise styles** that affect resource generation:

### 1. **Strength** (Traditional Weighted)

- **Equipment**: Dumbbells, Barbells, Kettlebells
- **Resource**: Muscle-specific materials (Wood, Stone, Fire, etc.)
- **Examples**: Weighted Squats, Dumbbell Press, Barbell Rows
- **Village Effect**: Builds Tier 2 muscle buildings

### 2. **Calisthenics** (Bodyweight Mastery)

- **Equipment**: None (or Pull-up Bar)
- **Resource**: 💙 Mana (Magic)
- **Examples**: Handstands, Muscle-ups, Pistol Squats, L-Sits
- **Village Effect**: Builds Wizard Tower (🧙)
- **RPG Flavor**: "Arcane training — mastery of your own body's energy"

### 3. **Yoga** (Flexibility & Mobility)

- **Equipment**: None (optional mat)
- **Resource**: 🍃 Leaf (Nature)
- **Examples**: Downward Dog, Warrior Pose, Pigeon Stretch, Child's Pose
- **Village Effect**: Builds Druid Grove (🌿)
- **RPG Flavor**: "Druidic connection — harmony with nature"

### 4. **Cardio** (Heart & Stamina)

- **Equipment**: None
- **Resource**: 💎 Essence (Universal)
- **Examples**: Burpees, Jumping Jacks, High Knees, Skaters
- **Village Effect**: Bonus XP to ALL buildings
- **RPG Flavor**: "Life force — the energy that powers everything"

---

## 🏗️ Building Progression Logic

### Tier 1: Starter (Always Unlocked)

- 🔥 Campfire
- ⛺ Tent
- 🎯 Training Dummy

**Purpose**: Visual proof that the village exists. No unlock requirement.

### Tier 2: Basic (Unlocked by First Loot Drop)

- 🏹 Archery Range (Arms → Wood)
- ⛏️ Quarry (Back → Stone)
- 🔨 Forge (Chest → Fire)
- 💧 Well (Abs → Water)
- 🌬️ Windmill (Shoulders → Wind)
- 🌾 Farm (Legs → Grain)
- 🧙 Wizard Tower (Calisthenics → Mana)
- 🌿 Druid Grove (Yoga → Leaf)

**Unlock Logic**: Auto-unlocked when user earns their first resource (completes first workout).

**Leveling**: Resources earned = Building XP (1:1 ratio)

- Example: Earn 50 Wood → Archery Range gains 50 XP
- Level 2 at 100 XP, Level 3 at 300 XP, etc.

### Tier 3: Advanced (Unlocked at Level 3)

When a Tier 2 building reaches **Level 3**, its Tier 3 upgrade unlocks:

- 🗼 Watchtower (Archery Range Level 3)
- 🏰 Castle Wall (Quarry Level 3)
- ⚔️ Armory (Forge Level 3)
- ⛲ Fountain (Well Level 3)
- 🔭 Observatory (Windmill Level 3)
- 🏚️ Barn (Farm Level 3)

### Tier 4: Legendary (Boss Rewards)

- 🐉 Dragon Lair (Defeat Fire Dragon)
- 🏆 Heroes Hall (Complete 50 Adventures)
- 🏟️ Champion Arena (Defeat 10 Bosses)

**Unlock Logic**: Spend Boss Tokens (3-5 per legendary building).

---

## 🧬 The evidence behind the numbers

Ingested from [`raw/bodyweight-app-research.md`](../raw/bodyweight-app-research.md) on
2026-07-30. Everything else on this page is game design and can be tuned for fun. **This
section is the training science** — change it only when the source changes.

### Volume, frequency, intensity (§2)

| Lever | Evidence-based target | Source |
| --- | --- | --- |
| **Weekly volume** | 10–20 hard sets per muscle per week; diminishing returns past ~20 | Schoenfeld/Ogborn/Krieger 2017; Pelland 2024 |
| **Frequency** | Each muscle ≥2×/week — at *equal volume* frequency itself changes little, so it is a distribution tool, not a magic number | Schoenfeld 2019 |
| **Reps** | 6–30 reps grow muscle about equally *when the set ends close to failure* | Schoenfeld 2017 |
| **Intensity** | **1–3 reps in reserve.** Training to failure is not superior for hypertrophy and costs fatigue and technique | Refalo 2023/2024; Robinson 2024 |
| **Rest** | 60–120 s. Under 60 s measurably reduces gains; past 120 s adds little for hypertrophy (more for strength) | "Give it a Rest" 2024 |

**Bodyweight progressive overload** has five levers, in rough order of how the app should
reach for them: reps/sets → tempo (slow eccentric) → range of motion → leverage (elevation,
body angle) → variation change. Push-up training alone produces real hypertrophy (pec +18.3 %,
triceps +9.5 % — Kikuchi & Nakazato 2017), so "bodyweight can't build muscle" is false; the
real constraint is *keeping the movement hard enough as the hero gets stronger*, which is what
the variation ladder (`exercises.prerequisiteExerciseId`) exists to solve.

**The weak point is pulling.** Without a bar the vertical pull nearly disappears. Table rows,
towel/doorway rows and slowed eccentrics cover it; the honest answer is that a doorway pull-up
bar is the single highest-value object a hero can own, and the app should say so rather than
pretend otherwise.

### Session structure (§1)

- **Warm-up: dynamic, 5–10 min, and specific to what follows.** Real evidence for injury-risk
  reduction (Fradkin 2006; FIFA 11+ trials). `buildWarmup` in `constants/warmup.ts` runs the
  **RAMP** phases in order — raise the pulse, mobilise the joints through range, activate the
  patterns the session will use, then one movement close to the real work — with intensity
  climbing across the sequence.

  **Length is proportional, not fixed.** The app ran a flat 2 min for a long time, on the
  argument that a five-minute warm-up in front of a twelve-minute quest is a warm-up nobody does
  twice. That argument is right about short quests and wrong about long ones, so the length is
  now derived from the quest's own `estimateQuestSeconds`: about a quarter of the session,
  clamped to 4–10 steps of 30 s. In practice that is 2:00 before the shortest quest — exactly
  what it was — 3:30 before the median, and 5:00–5:30 before the longest, which is where the
  literature's 5–10 min actually applies.

  **Movements rotate** on the hero's session count (§3, Baz-Valle 2019: variety raises intrinsic
  motivation without harming gains). Rotation only changes *which* movement fills a phase — never
  the length, the order, or the wrist step.

  **Only dynamic movements, ever.** §11 puts static stretching after training or in standalone
  sessions, so `Pigeon Pose`, `Standing Forward Fold`, `Warrior Pose` and `Cobra Stretch` are
  excluded from every warm-up pool. They are the *content* of the mobility quests, which is
  where held stretching belongs. `Cat-Cow` does the spinal job `Cobra Stretch` used to.

  **A non-optional wrist step** whenever the session presses vertically or is a skill quest, and
  it sits outside the length budget: a short quest shortens some other phase before it drops
  this one. That is §8.6.4, a safety rule rather than a preference — connective tissue adapts
  more slowly than muscle, and wrist/elbow overuse is the classic failure mode of hand-balancing.
- **Cool-down: not built, on purpose.** Van Hooren & Peake 2018 find active cool-downs
  "largely ineffective" for soreness, recovery markers, range of motion, and they "do not
  appear to prevent injuries". Bati has no cool-down and should not grow one — the honest
  version would be an optional comfort ritual, sold as nothing more.
- **Order**: compound / technical / skill movements first, while the nervous system is fresh;
  isolation and high-rep work last. Skill practice belongs at the *start*, never after
  fatiguing work — a shaky rep rehearses bad technique.

### Holds are prescribed submaximally (§8.3)

For any isometric (Plank, L-Sit, Hollow Body Hold, Wall Sit, Side Plank, Superman,
Scapular Pull-Up), the coaching standard is: know the hero's max hold, then **work at 60–75 %
of it**. Holding to failure every set is named in the source as *the* classic mistake — it
accumulates fatigue and breaks the exact positions the hold is meant to train. Bati derives
this from the journal (`getExerciseMax(id, "time")`) rather than asking.

### Full range of motion *is* mobility training (§11.1)

The most useful finding in the dossier for a bodyweight app: strength training through full
ROM and stretching produce **similar** range-of-motion gains (Afonso 2021), and full-ROM
resistance training builds strength on top (2024 RCT). So deep squats, chest-to-floor
push-ups, full-hang pull-ups and controlled eccentrics *are* the mobility program. Standalone
stretching is a supplement for specific goals, not a prerequisite.

Consequence for content: **execution cues must name the range** (depth, full lockout, full
hang). An amplitude cue is training content, not a stylistic detail.

### Guardrails (§4)

- Frame intensity as reps-in-reserve, never "go to failure".
- Respect ~48 h per muscle group; plan a deload every 4–8 weeks.
- Progress on clean-rep thresholds, and **regress the moment form consistently breaks**.
- Overreach shows up first as sustained performance decline — the app's guardrails are
  preventive, not diagnostic, and should defer to a health professional.

### Not built, deliberately (§9, §10)

Fat loss and muscle gain need no separate training engine — §9 and §10 both point back at the
volume/frequency/RIR rules above. What changes is diet, and the source is explicit that
**exercise is a poor tool for creating an energy deficit and an excellent one for protecting
muscle while dieting**. Bati therefore counts no calories, frames no session as "burning off"
anything, and keeps nutrition guidance directional at most (protein ~1.6 g/kg/day) with an
explicit deferral to a doctor or dietitian.

---

## 📊 Workout Volume Guidelines

### Reps Per Exercise (Base Target, Medium Difficulty)

| Exercise Type | Min | Max | Notes |
|---------------|-----|-----|-------|
| **Compound (Squat, Push-up)** | 10 | 15 | Full-body movements |
| **Isolation (Bicep Curl)** | 12 | 20 | Single muscle focus |
| **Isometric (Plank)** | 30s | 60s | Time-based hold |
| **Cardio (Burpees)** | 8 | 12 | High intensity |

### Rounds Per Quest

- **Beginner**: 2-3 rounds
- **Intermediate**: 3-4 rounds
- **Advanced**: 4-5 rounds
- **Boss Fight**: Fixed (no rounds, single epic battle)

### Total Workout Volume

| Goal | Weekly Sessions | Total Reps/Week | XP/Week |
|------|----------------|-----------------|---------|
| **Casual** | 2-3 | 300-500 | 200-400 |
| **Active** | 4-5 | 600-900 | 500-800 |
| **Hardcore** | 6-7 | 1000+ | 1000+ |

---

## 🎨 Content Creation Checklist

When creating new content, ensure:

### ✅ Exercise Checklist

- [ ] **Clear Name**: No jargon (e.g., "Push-ups" not "Standard Horizontal Press")
- [ ] **Muscle Tag**: At least 1 primary muscle
- [ ] **Difficulty**: Easy/Medium/Hard based on skill floor
- [ ] **Equipment**: "none" preferred for accessibility
- [ ] **Style**: Strength/Calisthenics/Yoga/Cardio
- [ ] **Seconds Per Rep**: Realistic timing (3s average for reps, N/A for time-based)
- [ ] **Image Path**: `assets/images/exercises/[snake_case_id].png`
- [ ] **Bilingual**: EN + FR descriptions

### ✅ Quest Checklist

- [ ] **Thematic Title**: "Chop Wood" not "Arm Workout #3"
- [ ] **4-6 Exercises**: Enough variety, not overwhelming
- [ ] **3 Rounds**: Standard (adjust for difficulty)
- [ ] **30-60s Rest**: Context-dependent
- [ ] **15-20 Min Duration**: Mobile-friendly
- [ ] **Muscle Balance**: Don't stack same muscle 3x in a row
- [ ] **Narrative Hook**: 2-sentence RPG flavor text

### ✅ Adventure Checklist

- [ ] **4-8 Quests**: Long enough to feel like a journey
- [ ] **Narrative Arc**: Beginning → Climax → Resolution
- [ ] **Boss Fight**: Final quest = epic battle
- [ ] **Target Audience**: Beginner/Intermediate/Advanced
- [ ] **Cover Image**: Wide (16:9) environment art

---

## 🧠 Psychology: Why This Works

### 1. **Instant Gratification** (Dopamine Hits)

- Every rep = damage numbers flying
- Every session = loot explosion
- Every level up = visual village change

### 2. **Long-Term Progression** (Serotonin)

- Buildings grow slowly (weeks/months)
- Your village = your fitness résumé
- Screenshot your village = share progress

### 3. **Autonomy** (No Micromanagement)

- System decides what to build (no analysis paralysis)
- Just train → rewards appear
- Village reflects YOUR choices without choosing

### 4. **Mastery** (Skill Improvement)

- Easy → Medium → Hard difficulty curve
- Boss fights = measurable challenges
- Personal records = concrete proof of growth

---

## 🚀 Next Steps

**For Content Creators**:

1. Read this doc
2. Generate 20 exercises following the 4 Pillars
3. Create 10 quests with thematic hooks
4. Design 5 adventures (1 per fitness goal)
5. Define 5 boss fights with unique mechanics

**For Developers**:

1. Use this as the source of truth for game balance
2. Implement damage formulas exactly as specified
3. Ensure resource → building XP is 1:1 (simple!)
4. Build auto-scaling based on user feedback

---

**Remember**: BATI is fitness first, RPG second. The hero's journey is real — it's the user's own body transformation.
