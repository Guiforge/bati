---
title: Bodyweight Fitness App — Research Dossier (external)
type: content
status: active
updated: 2026-07-30
related: [README.md, ../content/workout-best-practices.md, ../gameplay/progression.md, ../gameplay/oaths.md]
---

# Designing a Bodyweight Fitness App: Complete Research for a Simple, Effective, and Playful Product

## TL;DR
- **The science is clear and actionable**: 3–4 full-body sessions per week, 10–20 sets per muscle group per week spread across ≥2 sessions, sets taken to 1–3 reps in reserve (RIR), progression through exercise variations (push-up → archer → one-arm) rather than added load, and a 5–10 min dynamic warm-up (the cool-down has virtually no proven effect on soreness or injury).
- **Gamification works, but with nuance**: the meta-analysis by Mazeas et al. (2022, JMIR, 16 RCTs, 2,407 participants) shows a small-to-medium effect (g = 0.42) on physical activity; streaks (Duolingo) and autonomy of choice boost adherence, but leaderboards and competition demotivate lower performers, and breaking a streak triggers abandonment — hence the importance of "repair" mechanics (streak freeze).
- **The real problem to solve is retention**: fitness apps retain only about 3% of users at Day 30 (2023 average per Business of Apps), the best ~25%; product priority #1 is first-session activation and habit building (median 66 days, range 18–254 per Lally 2010), aligned with WHO recommendations (150–300 min/week + muscle strengthening ≥2 days/week, "some is better than none").

## Key Findings

1. **Session structure**: 5–10 min dynamic warm-up (performance benefit and probable injury reduction), main block with compound/hardest exercises first, optional cool-down (little evidence of effectiveness). 1–2 min rest is sufficient for hypertrophy; <1 min reduces gains.
2. **Programming**: 10–20 sets/muscle/week (diminishing returns beyond), frequency ≥2×/week per muscle (at equal volume, frequency matters little — choose by preference), 6–30 reps produce similar hypertrophy when close to failure. Progressive overload in bodyweight training comes from reps, tempo, range of motion, leverage, and variation progressions.
3. **Session diversity**: strength/skill, hypertrophy, AMRAP, EMOM, Tabata/HIIT, RFT, circuits, mobility — each has a distinct physiological stimulus; variety increases intrinsic motivation (Baz-Valle 2019) without harming gains, but excessive random variety ("muscle confusion") is not superior for growth.
4. **Periodization**: linear vs undulating = equivalent for hypertrophy/strength; periodization is not essential but helps avoid plateaus and structure deloads.
5. **Gamification & behavior**: streaks exploit loss aversion (effective but risky), autonomy/competence/relatedness (self-determination theory) predicts durable motivation, leaderboards cut both ways.
6. **Landscape**: Freeletics (adaptive AI coach, timed "God" workouts), Nike Training Club (free, rich, but weak tracking and gamification), Duolingo (the streak benchmark), Habitica (gamifies everything but has no real training engine).
7. **WHO/CDC guidelines**: the reference framework for onboarding and default goals.
8. **Advanced skill acquisition** (handstand, one-arm handstand, planche, front lever): balance skills demand high-frequency, low-fatigue practice (motor learning favors distributed practice); straight-arm strength skills must be programmed like strength work (submaximal holds at ~60–75% of max hold time, 2–3×/week) with slow, deliberate tendon conditioning — see dedicated Section 8.
9. **Fat loss**: the deficit comes mostly from diet; training's job is to preserve muscle. Resistance training + adequate protein during a moderate deficit (≤~500 kcal/day) preserves or even gains lean mass, whereas dieting or cardio alone loses 20–30% of weight as lean mass. HIIT and moderate cardio produce similar fat loss — HIIT is just more time-efficient (Sections 9–11).
10. **Muscle gain**: same training engine as Section 2 (10–20 hard sets/muscle/week, ≥2×/frequency, 6–30 reps near failure) plus eating enough — a small caloric surplus and ~1.6–2.2 g/kg/day protein — and sleeping enough.
11. **Mobility/flexibility**: both stretching AND full-range resistance training improve range of motion to a similar extent (meta-analytic finding); consistency and weekly volume matter more than any single method; static stretching belongs after training or in standalone sessions, dynamic stretching before.

## Details

### 1. Designing a good session (bodyweight focus)

**Warm-up.** The evidence leans toward injury risk reduction. A systematic review of RCTs (Fradkin et al., 2006, *British Journal of Sports Medicine*) concluded that of 5 high-quality studies, 3 showed a significant reduction in injury risk and that the "weight of evidence is in favour of a decreased risk". Neuromuscular warm-up programs like FIFA 11+ show robust protective effects: in the cluster-randomized trial by Soligard et al. (1,892 young female footballers), a 32% reduction in overall injury risk, and 46.1% in male collegiate players in Silvers-Granelli et al. (cited in the MDPI *Muscles* review, PMC12371935). Warming up increases muscle temperature, blood flow, elasticity, and activation — a dynamic warm-up (arm circles, leg swings, joint mobility) is preferable to static stretching before effort. It also reduces DOMS, unlike the cool-down.

**Cool-down.** Widely documented ineffectiveness. The narrative review by Van Hooren & Peake (2018, *Sports Medicine*, "Do We Need a Cool-Down After Exercise?") concludes that active cool-downs are "largely ineffective" at reducing soreness, improving recovery of muscle damage markers, range of motion, or psychological recovery, and "do not appear to prevent injuries". Product implication: offer a short optional cool-down (mobility/stretching for comfort and ritual), without selling it as injury or soreness prevention.

**Exercise order.** Consensus principle: place compound/technical/priority movements at the start of the session when neuromuscular freshness is highest (e.g., handstand push-up, pistol squat, skill movements), then isolation or high-rep movements. In bodyweight training, put strength/skill progressions (which demand control and focus) before metabolic/endurance work.

**Duration and rest.** A Bayesian meta-analysis ("Give it a Rest", 2024, PMC) and the Stronger by Science analysis show that 1–2 min of rest between sets optimizes hypertrophy; <1 min reduces gains; beyond 2 min, the benefit is negligible for hypertrophy but useful for strength (motor unit recruitment, ATP/PCr resynthesis in 2–3 min). Implication: default timer of 60–120 s, extensible for "strength" sessions.

**Intensity / proximity to failure (RPE, RIR).** The meta-analysis by Refalo et al. (2023, *Sports Medicine*, 15 studies) finds no superiority of training to muscular failure for hypertrophy; the proximity-to-failure/hypertrophy relationship is non-linear. Robinson et al. (2024, *Sports Medicine*, meta-regression) and Refalo et al. (2024, *J Sports Sci*, 8 weeks) confirm similar gains at failure vs 1–2 RIR. The practical "sweet spot" is **1–3 RIR**: sufficient stimulus, less fatigue and less risk of technical breakdown. For a consumer app, encoding intensity as simple RIR/RPE ("how many reps did you have left?") is safer and more educational than "go to failure".

### 2. Designing a good program

**Weekly volume.** The foundational meta-analysis by Schoenfeld, Ogborn & Krieger (2017, *Journal of Sports Sciences*, 15 trials) establishes a dose-response relationship: <5 sets/muscle/week works (especially for beginners) but 10+ sets produce the best hypertrophy. Subsequent reviews (Baz-Valle et al., 2022, *J Hum Kinet*; consensus) place the optimum around **12–20 sets/muscle/week** for trained men, with diminishing returns and overload risk beyond 20. The recent meta-regression by Pelland et al. (2024/2025, *Sports Medicine*, 67 studies, 2,058 participants) confirms +0.24% hypertrophy per additional set at ~12 sets/week, with diminishing returns (more pronounced for strength than hypertrophy).

**Frequency.** Schoenfeld, Ogborn & Krieger (2019, *Sports Medicine*, 25 studies): at equal volume, frequency has no significant effect on hypertrophy — "individuals can choose a weekly frequency per preference". In practice, training each muscle ≥2×/week allows volume to be distributed and improves session quality. Full-body 3×/week is ideal for beginners (each movement pattern trained often).

**Repetitions.** 6–30 reps produce similar hypertrophy when the set is close to failure (Schoenfeld 2017, low vs high load). For max strength, heavier loads/harder variations (low reps); for endurance, higher reps. In bodyweight training, "load" is adjusted through variation difficulty.

**Progressive overload without equipment.** Progression levers: (1) reps and sets, (2) tempo (especially slowed eccentric), (3) range of motion (deficit push-ups, full ROM — Schoenfeld & Grgic 2020 show greater ROM favors growth), (4) leverage (feet elevated, body position), (5) variation progression (push-up → decline push-up → pike → archer → one-arm). The study by Kikuchi & Nakazato (2017, *J Exerc Sci Fit*) shows push-ups produce hypertrophy (pec +18.3%, triceps +9.5%) and strength gains comparable to bench press at 40% 1RM. Variation-based progression is therefore genuine, validated progressive overload.

**Movement pattern balance.** Cover: horizontal push (push-ups), vertical push (pike/handstand push-up), horizontal pull (rows), vertical pull (pull-ups/variations), squat (knee flexion), hinge (hip hinge — glute bridge, nordic curl), core (anti-extension/anti-rotation), lateral/rotational.

**Pulling without equipment — the real bodyweight challenge.** Pulling is the weak point of calisthenics without a bar. Solutions: Australian rows under a sturdy table, doorway rows (single-arm), door frame rows, towel rows, superman/lying lat pulldown (floor extension, low resistance but useful for scapular endurance and posture), and isometrics (scapular wall hold). Pull progression: slow the eccentric and reduce body angle. Product implication: honestly flag that optimal pulling may require an object (table, towel, doorway bar) and offer it as optional "minimal equipment".

**Periodization.** Converging meta-analyses: Grgic et al. (2017, *PeerJ*, 13 studies) find hypertrophy effects "likely similar" between linear (LP) and daily undulating (DUP), Cohen's d = −0.02 (95% CI [−0.25, 0.21]). Harries et al. (2015): no difference for strength. Undulating periodization may slightly favor strength (load variation), but no solid evidence that one model beats the other. For hypertrophy in trained individuals, periodization isn't even essential. Implication: an app can adopt light undulating periodization (alternating strength/hypertrophy/metabolic sessions within the week) mainly for variety/motivation, not for a major physiological benefit.

**Deload and recovery.** Plan deload weeks (reduced volume/intensity) every 4–8 weeks to manage accumulated fatigue. The 48h rule: allow ~48 h per muscle group between intense sessions. Sleep and nutrition are the foundations of recovery: for protein, the meta-analysis by Morton et al. (2018, *British Journal of Sports Medicine*, 49 trials, 1,863 participants) identifies a breakpoint at **1.62 g/kg/day** beyond which "further intake provides no detectable additional benefit". Overtraining often occurs alongside an energy/protein deficit.

### 3. Diversity of session types

- **Strength / skill**: low reps, long rests, hard variations (pistol, HSPU, one-arm progressions). Stimulus: mechanical tension, neural adaptations. Schedule when fresh, early in the week/session.
- **Hypertrophy**: 6–20 reps, 1–3 RIR, 60–120 s rest, moderate-high volume. Stimulus: mechanical tension + metabolic stress.
- **AMRAP** (as many rounds/reps as possible): density, muscular endurance, mental/competitive component (score to beat).
- **EMOM** (every minute on the minute): controls density and rest, ideal for automatic dosing and gamification ("beat your EMOM").
- **Tabata / HIIT**: the original Tabata protocol (Tabata et al., 1996) = 20 s at ~170% VO₂max / 10 s rest × 8 = 4 min; improved VO₂max (~+7 ml/kg/min) and anaerobic capacity (+28%). Cardio + anaerobic stimulus, high EPOC. Caution: true Tabata is near-maximal and reserved for already-trained users; most commercial "Tabata" isn't Tabata. For beginners, modified versions.
- **RFT (rounds for time)**: conditioning, clock-driven motivation.
- **Circuits**: combine strength and cardio, time-efficient; good for adherence and playfulness.
- **Mobility / active recovery**: maintains range of motion, aids recovery, "light" days — useful for preserving the streak without overload.

**How to combine within a week.** Example full-body 3–4 days/week: alternate one strength/skill-oriented session, one hypertrophy session, one metabolic session (circuit/AMRAP/HIIT), plus optional mobility days. Variety across session types supports motivation (see below) and spreads stress across different systems, reducing the risk of overusing any single pattern.

**Variety and adherence — key evidence.** The RCT by Baz-Valle et al. (2019, *PLOS ONE*, 14(12):e0226989, n=19 trained men, 8 weeks) compared fixed vs randomly varied exercise selection (via app). Result: the "varied" group significantly increased **intrinsic motivation** (within-group ES = 1.28; between-group ES = 0.58) while the fixed group's motivation dropped (ES = −0.75), with equivalent hypertrophy and strength. Quote: "Varying exercise selection had a positive effect on training motivation in trained men, while producing similar improvements in muscular adaptations." BUT the authors warn of a trade-off: "rotating exercises too frequently somewhat compromises muscle growth and strength" (the fixed group progressed better on vastus intermedius and bench press 1RM, via motor learning). "Muscle confusion" is therefore not superior for growth; variety serves motivation/adherence, not gain maximization. The authors' practical solution: keep complex movements stable and vary the simpler ones. Confirmation: Rauch et al. (2017, *JSCR*) show self-regulated selection (personal choice) gives a small advantage in lean mass and upper-body strength. Caveat: small Baz-Valle sample (n=19), no power analysis, only 8 weeks.

### 4. Dos and don'ts (best practices & mistakes)

**Beginner mistakes**: skipping the dynamic warm-up; systematically going to failure with technical breakdown; too much volume too fast; neglecting pulling and hinging (postural imbalance); changing programs too often ("program hopping") before progressing; all-or-nothing mentality (missing one session = quitting entirely).

**Overtraining (OTS).** Distinguish functional overreaching (recovery in days), non-functional overreaching (up to ~3 weeks), and overtraining syndrome (>2 months of underperformance, recovery in months/years). Signs: sustained performance decline (the most consensual marker — Grandou et al. 2020, across 22 studies), persistent fatigue, mood/sleep disturbances, elevated resting HR, recurring infections, appetite loss. Prevention: ≥1 full rest day/week, alternate hard/easy days, gradual progression, sufficient sleep and nutrition, training log.

**Guardrails the app should implement**:
- Fitness readiness questionnaire (PAR-Q type) and medical disclaimer at onboarding.
- Technique first: demo videos, form cues, progression tests before unlocking a harder variation (don't allow skipping steps).
- Conditional progression: only unlock the next variation once the user hits a threshold (e.g., "3×12 clean reps" before archer).
- Fatigue/overreach detection: automatically reduce volume or suggest a deload if the user reports pain, poor sleep, or performance drops.
- Frame intensity in RIR (not "to failure") for safety.
- Respect 48 h per muscle group in program generation.

### 5. Gamification and adherence (the heart of the project)

**Overall effectiveness evidence.** The meta-analysis by Mazeas et al. (2022, *JMIR* 24(1):e26779, 16 RCTs, 2,407 participants) finds a **small-to-medium** effect of gamification on physical activity (Hedges g = 0.42; 95% CI [0.14, 0.69]), stronger on step count (+1,609 steps/day; CI [372, 2,847]) than on MVPA. Crucial point: **no significant effect after the follow-up period** (g = 0.09), suggesting gamification drives engagement during the intervention but durability depends on habit internalization. Across 15 RCTs, gamification adds **+500 to +2,183 steps/day** (the strongest effect being the MapTrek trial at +2,183 steps/day); competition outperforms collaboration and self-chosen goals outperform imposed ones.

**Behavior change science.**
- **Habit formation**: Lally et al. (2010, *European Journal of Social Psychology*, 96 participants) — median of 66 days to reach automaticity, range 18–254 days; exercise takes longer (median ~91 days in re-analyses); **missing one day does not compromise habit formation**. Implication: design for a 2–3 month horizon, forgive missed days, don't punish an isolated absence.
- **Tiny habits / friction reduction**: aim for a first "I did it" within minutes; minimal sessions (1–10 min) to lower the barrier; anchor the session to an existing trigger.
- **Self-determination theory (Ryan & Deci)**: durable motivation comes from satisfying 3 needs — autonomy (real choice of sessions/exercises), competence (visible progress, positive feedback, attainable goals), relatedness (community, partners). Competence is the strongest predictor of autonomous motivation. Controlling extrinsic rewards can erode intrinsic motivation (overjustification effect) — handle with care.

**Fitness app retention and churn.** The numbers are brutal. Per *Business of Apps* benchmarks (Health & Fitness App Benchmarks): "Health and fitness apps had 3% retention rate by day 30 in 2023", with activation dropping from 26% at D1 to 10% at D28. A scoping review indicates ~70% of users abandon within the first 100 days, with the sharpest drop in the first two weeks. On paid subscriptions, *Business of Apps*/Antenna (2024) reports ~33% retention of annual fitness subscriptions (i.e., ~67% annual churn), described as "the steepest churn curve of any consumer subscription category", with a strong January effect (40–60% of cancellations by February). The #1 predictor of D30 retention is **completion rate of a first meaningful action on D1** (apps that nail activation retain 2–3× better). Social features increase retention by roughly 30%.

**Which mechanics work vs backfire.**
- **Streaks**: highly effective (they exploit Kahneman & Tversky's loss aversion). Duolingo calls streaks the "single most effective retention lever in the product"; users with a 7+ day streak are reportedly retained at ~2.4× the rate of others, and Duolingo's "Streak Wager" experiment produced "statistically significant increases in Day-1, Day-7 and Day-14 user retention, with Day-7 retention showing the greatest improvement at +14%" (Duolingo blog). BUT breaking a streak is "particularly demotivating" (Silverman & Barasch, 2023, *Journal of Consumer Research* 49(6):1095–1117) and pushes toward **abandonment** rather than restarting — unless a **repair** option is offered, which mitigates the effect. Hence "streak freeze" / "earn back" / grace mechanics. Tracking weekly completion rate rather than a strict consecutive counter avoids demoralization. (Note: these Duolingo figures come from practitioner/company sources, not peer-reviewed — illustrative.)
- **Leaderboards / competition**: double-edged. The large-scale analysis of walking challenges (arXiv 1702.07437) shows the winner increases activity by +25% but **the last-place finisher drops 4% below baseline**. Yang & Goh (2023, *Journal of the Association for Information Systems*): rank/demotion feedback is "more discouraging for inactive exercisers". Zhang & Centola et al. (2016, *Preventive Medicine Reports*, RCT n=790) even show poorly designed social support can create a "downward spiral" by drawing attention to the least active. Implication: prefer competition against oneself (PRs, AMRAP/EMOM scores), skill-matched leagues, or collaborative challenges, rather than a global leaderboard that crushes beginners.
- **Badges / levels / skill tree**: good for materializing progressive mastery (SDT competence). A skill progression tree (unlocking pistol squat, handstand, one-arm push-up) is especially suited to calisthenics and intrinsically motivating.
- **Personal records (PRs)**: powerful and safe — comparison against oneself, not others.
- **Extrinsic rewards (points, prizes)**: useful short-term but risk overjustification; keep them secondary to real progress.
- **Social**: partners/friends (Duolingo's "friend streak" mechanic: +22% daily lesson completion) and communities increase retention when they strengthen relatedness without exposing lower performers.

**Beware of over-gamification.** One study (Frontiers in Psychology 2025) suggests an S-shaped relationship: too little or too much gamification hurts; a moderate level, aligned with psychological needs, is optimal. Gamification does not replace quality training content.

### 6. Competitive analysis

- **Freeletics**: adaptive AI coach (paid core), strong bodyweight library, timed "God" workouts (score to beat = PR motivation), community and mindset components. Strength: adaptive personalization and bodyweight progression. Weakness: key content behind paywall, no granular load tracking.
- **Nike Training Club**: free, pro video production, wide variety (strength, HIIT, yoga, mobility), structured multi-week programs, "bodyweight only" filter. Weaknesses: shallow tracking (no volume logs/graphs), no adaptive coaching, **no social features or gamification**, slowed updates. Lesson: excellent free content alone doesn't retain without personalized progression or gamification.
- **Caliverse / Thenics / Madbarz / Street Workout apps**: centered on calisthenics progressions (skill trees toward muscle-up, planche, handstand). Strength: intrinsically gamified skill progression and niche community. Often weaker on mainstream onboarding and simplicity.
- **Zombies, Run!**: narrative/immersive motivation (story while running). Lesson: storytelling can carry motivation when the movement itself is repetitive.
- **Habitica**: gamifies all habits (RPG, avatar, guilds) but **without real training programming**. Lesson: the game layer alone doesn't replace a credible training engine.
- **Duolingo (transposed to fitness)**: the absolute benchmark for streaks, XP, leagues, notifications treated as a product, animated/sound micro-wins, time-to-value in minutes, sign-up deferred until after the first success, and above all forgiveness mechanics (freeze, repair). Direct lesson for the app: define ONE minimal daily habit, "humane" pressure (streak + forgiveness), stack intrinsic (progress) and social motivations, celebrate micro-wins.

**Competitive synthesis**: the "simple + effective + playful" niche is open — NTC is simple/effective but not playful; calisthenics apps are effective/playful but not simple; Freeletics is effective but paid and intense. An app combining a science-based training engine (variation progressions), NTC-grade onboarding simplicity, and a humane Duolingo-style gamification layer (streak with forgiveness, skill tree, PRs, skill-matched leagues) would fill a real gap.

### 7. WHO/CDC recommendations as the baseline

The WHO 2020 recommendations (echoed by CDC/ACSM) for adults 18–64: **150–300 min/week of moderate aerobic activity** (or 75–150 min vigorous, or a combination) + **muscle-strengthening activities involving all major muscle groups ≥2 days/week**. Key principles: "some is better than none", "more is better" up to a point, and reduce sedentary time. Twice-weekly muscle strengthening is exactly what a bodyweight app delivers. Onboarding implication: default to a WHO-aligned goal (e.g., "3 strength sessions + move a little every day"), display progress toward these targets, and for sedentary users start below the threshold ("start with 2×10 min"), leveraging "some is better than none".

### 8. Dedicated section — Learning advanced calisthenics skills (one-arm handstand, planche, front lever & co.)

#### 8.1 Three families of skills, three training logics

Advanced calisthenics "figures" are not all learned the same way. Best practice starts by classifying them:

1. **Balance/technique skills** — handstand, one-arm handstand (OAHS), elbow lever. Limiting factor: motor control, proprioception, micro-corrections. These are *learned* more than *built*: they respond to **high frequency and low fatigue**.
2. **Straight-arm strength skills** — planche, front lever, back lever, human flag, iron cross-style holds. Limiting factor: maximal isometric strength AND connective tissue (tendons/ligaments) capacity. These are *built* like strength: **programmed submaximal isometrics, moderate frequency, long adaptation timelines**.
3. **Dynamic strength skills** — muscle-up, handstand push-up, one-arm push-up/pull-up progressions. Limiting factor: strength through a range of motion. Programmed like classic low-rep strength work, plus technique.

Most skills mix categories (the OAHS is mostly balance but demands substantial unilateral shoulder/wrist strength; the planche is mostly strength but has a balance component). Identifying the dominant limiter dictates the training method — this classification is also a clean data model for an app's skill tree.

#### 8.2 How motor learning research says to practice (balance skills)

- **Frequency beats session length.** Motor learning research consistently favors **distributed practice** (shorter, more frequent sessions spread across days) over massed practice for skill acquisition and retention (classic line of research from Baddeley & Longman 1978 to Shea et al. 2000, who showed better retention of a dynamic balance task when sessions were separated by 24 h rather than 20 min). Handstand coaching converges on the same point: ~3×/week for the first months (joint preparation), then **5+ short sessions/week once the goal is balance acquisition** — daily short practice beats 3 long weekly sessions.
- **Practice fresh.** Balance work goes at the *start* of the session, after warm-up, before any fatiguing strength work — fatigue degrades the fine motor corrections you're trying to encode.
- **Stop sets well before failure.** In skill practice, a shaky, collapsing attempt rehearses bad technique. Quality reps only; end the session while form is still crisp.
- **Deliberate feedback loops accelerate learning**: fingertip pressure cues (tactile feedback is the dominant balance-correction signal in handstands), filming yourself, external cues ("push the floor away", "stack shoulder over hand"), and — ideally — periodic coach/video review. An app can operationalize this with self-recording prompts and per-drill form cues.
- **Grease the Groove (GTG)** — Pavel Tsatsouline's method of many submaximal, perfect-form sets spread through the day (~50–60% of max reps or hold, never near failure) — works well for dynamic skills (pull-ups, HSPU progressions) and moderately for some holds, but coaches warn **against GTG for wrist-heavy straight-arm skills like the planche** (overuse risk on wrists/forearms/elbows). Use GTG for pulls and basic pushes; keep planche work inside programmed sessions.

#### 8.3 How to program straight-arm strength skills (planche, front lever)

The reference methodology (Steven Low's *Overcoming Gravity*, echoed across coaching resources) is:

1. **Find your max hold time** on the current progression (stopping ~1 s short of failure).
2. **Train at ~60–75% of that max** per working set — e.g., a 20 s max tuck front lever → work sets of 12–15 s. Holding to failure every set is *the* classic mistake: it accumulates fatigue, breaks the exact form cues the skill depends on (scapular position, hollow body, locked elbows), and stalls progress.
3. **Volume/frequency**: typically 3–6 quality sets per session, 2–3 sessions/week per skill, with generous rest between hard holds (2.5–4 min for near-max efforts). Run 8–12 week cycles with a deload (~50% volume) every 4th week or so.
4. **Progress on objective thresholds**: e.g., advance from tuck to advanced tuck when you can hold ~5×20 s across two consecutive sessions with clean form; a skill is "owned" when you can hold the full position ~10 s without form breakdown. Regress one step the moment form consistently breaks.
5. **Pair antagonists**: program front lever (pull) alongside planche or push work (push) to balance shoulder demands.
6. **Keep bent-arm strength and hypertrophy in the program**: rows, pull-ups, dips, HSPU — the muscle base that straight-arm skills lever off. Skills-only programs plateau.

**The tendon bottleneck.** Straight-arm work loads tendons and ligaments (elbow flexors at long muscle length, wrist ligaments, biceps tendon) far beyond what muscles feel. Connective tissue adapts **more slowly than muscle** — which is why people get strong enough for a planche before their elbows are ready, and why elbow/wrist overuse injuries are the classic failure mode. Best practices: low-intensity high-frequency exposure rather than occasional maximal sessions; dedicated wrist conditioning and elbow-flexor work at long ranges (e.g., light curls at end range); years-scale patience on loading jumps; treat persistent tendon pain as a hard stop-and-regress signal.

#### 8.4 The one-arm handstand specifically

Documented coaching consensus:

- **Prerequisites first**: a consistent freestanding two-arm handstand of **30–60+ s**, comfortable handstand shapes (straddle, tuck), solid HSPU-level shoulder strength, and well-conditioned wrists. Starting one-arm work earlier wastes time and loads unprepared wrists.
- **The progression is a weight-shift ladder**, not a leap: straddle handstand with hands close → controlled weight shifts toward one arm → hip-led side flexion (shoulder stays stacked over the hand — the movement comes from the hip, not from throwing the free arm out) → fingertip-assisted holds with the free hand ("tenting": all fingers → two → one → hovering) → free balance. Advance a step when the assisting fingers carry almost no pressure. Complementary drills: block walks/entries (shifting onto one arm for reps) and building "time under balance" (20–30 s per assisted progression before moving on).
- **Contested drills — a useful lesson in itself**: some respected coaches warn that over-relying on fingertip-walking drills can train the exact fault to avoid (lifting the free shoulder) and that **wall-assisted one-arm balancing is a trap** (the wall makes true 3-D alignment impossible; if you need it for balance, you're not ready for one-arm work). Where methods conflict, the shared ground is: master the weight shift with a stacked shoulder, progress by reducing assistance, and never rehearse broken positions.
- **Structure of an OAHS session**: general warm-up → wrist and shoulder prehab → hip/straddle mobility → **two-arm handstand work (maintain the foundation)** → one-arm drills fresh → optional strength accessories.
- **Timeline honesty**: the OAHS is a *multi-year* skill even with good coaching. Every serious resource repeats the same message — there is no magic progression; consistent, intelligent practice over a long horizon is the method. Expectation-setting is part of good programming (and, in an app, part of honest UX).

#### 8.5 Building a skill-focused program (weekly template)

A proven weekly structure for someone chasing skills while keeping general strength (adapt volume to level):

- **Session A (2–3×/week)** — Balance skill block first (handstand/OAHS drills, 10–20 min, fresh), then straight-arm isometrics (e.g., planche progression 4–6 submaximal sets), then bent-arm push strength + core.
- **Session B (2–3×/week)** — Short balance practice, then front lever progression (4–6 submaximal sets), then pull strength (rows, pull-ups) + core.
- **Micro-practice (optional, most days)** — 5–10 min of low-fatigue balance work or GTG sets of dynamic basics; never wrist-heavy straight-arm maximal work.
- **Weekly hygiene** — ≥1 full rest day; wrist/shoulder prehab in every warm-up; deload every 4–8 weeks; track hold times and progression steps (the skill equivalent of tracking load).

Common mistakes to avoid: skipping prerequisites and joint prep; training holds to failure; chasing too many skills at once (pick 1–2 per movement pattern); ignoring tendon pain; program hopping before 8–12 weeks; abandoning two-arm/foundation work once one-arm or advanced work starts.

#### 8.6 Product implications for the app

1. **Model skills by family** (balance / straight-arm strength / dynamic) and program them differently: short frequent "practice" sessions for balance, structured submaximal isometric blocks for straight-arm skills.
2. **Hard prerequisite gates** in the skill tree (e.g., OAHS branch locked until a logged 45–60 s freestanding handstand) — this is both good pedagogy and a safety guardrail, and it makes unlocks genuinely meaningful.
3. **Track max hold times** per progression and auto-prescribe work sets at 60–75% — a differentiating feature almost no consumer app implements.
4. **Built-in prehab**: wrist/shoulder preparation embedded in every skill session warm-up, non-skippable for straight-arm branches.
5. **Threshold-based progression/regression logic** (e.g., 5×20 s clean → unlock next step; repeated form-failure reports → suggest stepping back) mirrors coaching best practice and prevents ego-driven skipping.
6. **Expectation-setting UX**: show realistic timelines per skill (months for a handstand, years for OAHS/full planche) and celebrate intermediate steps — aligns with the competence/progress loop from Section 5 and protects users from the all-or-nothing trap.
7. **Micro-session support**: 5–10 min daily balance practice fits perfectly with streak mechanics and the "some is better than none" principle — skill practice is the ideal daily-habit unit because it's low-fatigue by design.

**Section sources**: Overcoming Gravity isometric programming methodology (BodyTree summary); GMB Fitness & Coach Bachmann OAHS guides; BERG Movement OAHS drills; Calisthenics Association handstand & planche anatomy guides (incl. tendon-adaptation guidance); WellCalm OAHS prerequisites; SmileyBiceps front lever programming; Calisthentials & Heavyweight Calisthenics on GTG and straight-arm strength; motor-learning literature on distributed practice (Shea et al. 2000; Baddeley & Longman 1978; Human Kinetics/Magill & Anderson).

### 9. Dedicated section — Fat loss / weight loss

#### 9.1 The core principle: diet creates the deficit, training protects the muscle

The most important reframing for an app: **exercise is a poor tool for creating an energy deficit and an excellent tool for shaping what you lose.** Without resistance training, **20–30% of total weight lost is lean mass** (Weinheimer et al., 2010) — which lowers resting metabolic rate, strength and function, and sets up weight regain. This is the "quality of weight loss" problem.

Evidence that resistance training solves it:

- **Meta-analysis of 25 RCTs (1,608 participants)**: adding resistance training to a calorie-restricted diet increased fat loss while preserving muscle mass.
- **Clark (2005) meta-analysis**: caloric restriction + resistance training retained significantly more lean mass than aerobic training alone or dieting alone.
- **Willis et al. (2012)**, 8 months in overweight adults: only groups including resistance training preserved or gained lean mass; aerobic training alone lost significant lean mass.
- **Sardeli et al. (2018, *Nutrients*)**, 6 RCTs in obese older adults (RT 3×/week, 12–24 weeks): RT attenuated the muscle loss caused by caloric restriction.
- **Retrospective cohort of 304 adults (Frontiers in Endocrinology, 2025)** on a ~500 kcal/day deficit: RT preserved a far greater proportion of fat-free mass than aerobic exercise or no exercise.
- **Longland et al. (2016)**: both groups did RT in a deficit, but the high-protein group (~2.4 g/kg/day) lost more fat AND gained lean mass vs moderate protein (~1.2 g/kg/day) — protein and RT are additive.

#### 9.2 Cardio: what it does and doesn't do

- **Adding resistance training doesn't hinder fat loss** — a 2025 systematic review/meta-analysis (*JISSN*) found including resistance exercise "neither impedes nor enhances fat loss", while aerobic training alone preserved fat-free mass less well than RT alone.
- **HIIT vs moderate continuous cardio**: broadly comparable fat loss. A meta-analysis of 29 RCTs (young/middle-aged adults) found HIIT's effect on fat loss and cardiorespiratory fitness "similar to or better than" moderate continuous training, with HIIT favouring waist circumference, body-fat percentage and VO₂peak — but the authors note the clinical significance of the difference is limited; HIIT's real advantage is **time efficiency and enjoyment**. A 2026 network meta-analysis (8–16 week trials, moderate-to-low certainty) concludes HIIT ≥75 min/week is a time-efficient option for **modest** fat loss, with moderate continuous training ≥150 min/week as the alternative for people with low exercise tolerance.
- Aerobic work burns more calories per session (no rest periods), so it can help widen the deficit — but it's a supplement to diet, not a substitute.
- **Caution under a deficit**: one network meta-analysis notes that during caloric restriction, *high-intensity* aerobic work may promote protein utilization and even contribute to muscle breakdown, so optimal intensity for preserving lean mass under a deficit is lower than under normal eating. Practical read: don't stack aggressive HIIT on top of an aggressive deficit.

#### 9.3 Practical programming for fat loss (bodyweight context)

1. **Moderate deficit**: the literature converges on avoiding deficits >~500 kcal/day when the goal includes preserving lean mass. Aggressive deficits accelerate lean loss and wreck training quality.
2. **Protein high**: ~1.6 g/kg/day as the evidence-based floor (Morton et al., 2018 breakpoint at 1.62 g/kg/day); higher (up to ~2.2–2.4 g/kg/day) is commonly recommended specifically during a deficit, where Longland's data support the benefit.
3. **Keep resistance training as the anchor**: 3–4 bodyweight strength sessions/week, same volume/intensity framework as Section 2. Critically — **maintain training intensity/load, reduce volume if fatigue demands it**; the stimulus is what tells the body to keep muscle.
4. **Add cardio as a lever, not the plan**: 2–3 sessions of moderate cardio or 1–2 short HIIT/circuit sessions per week, plus daily steps/NEAT (the largest and most underrated contributor).
5. **Expect slower skill/strength progress** in a deficit — this is normal and worth telling users explicitly.
6. **Measure beyond the scale**: weight fluctuates with water, glycogen and food volume. Waist circumference, photos, performance (reps, hold times) and weekly averages are better signals.

#### 9.4 Product implications
- Never present exercise as the deficit engine ("burn off that meal") — it sets up failure and encourages compensatory eating. Frame training as *keeping the muscle you have while diet handles the deficit*.
- **Do not build calorie-counting or aggressive dieting features casually.** These are the mechanics most likely to harm users with disordered-eating tendencies. If nutrition guidance is included, keep it directional (protein targets, food quality, "moderate deficit"), avoid numeric weight goals as the central metric, and don't gamify eating less.
- Track performance and waist/photos as primary progress signals; make weight optional and displayed as a trend, not a daily number.
- Offer a "fat loss" program variant that keeps strength sessions intact and adds conditioning + step targets, rather than replacing strength with endless cardio.

### 10. Dedicated section — Muscle gain (hypertrophy)

#### 10.1 The training side is already covered — and it's the same engine

Everything in Section 2 *is* the hypertrophy protocol: **10–20 hard sets per muscle group per week** (Schoenfeld 2017 dose-response; Pelland 2024 meta-regression showing diminishing returns around and beyond ~12 sets/week), **each muscle ≥2×/week** for volume distribution (frequency itself being non-significant at equal volume, Schoenfeld 2019), **6–30 reps** with sets taken to **1–3 RIR** (Refalo 2023/2024, Robinson 2024 — failure isn't required), **full range of motion** (Schoenfeld & Grgic 2020), 1–2 min rest, and progressive overload via variation/tempo/ROM/leverage.

**Bodyweight training builds real muscle.** Kikuchi & Nakazato (2017) found push-up training produced pectoralis (+18.3%) and triceps (+9.5%) hypertrophy and strength gains comparable to bench press at 40% 1RM. The constraint is not "bodyweight can't grow muscle" — it's **being able to keep loading the movement hard enough as you get stronger**, which is exactly what a progression ladder solves.

#### 10.2 The bodyweight-specific challenges (and fixes)

| Challenge | Why it happens | Fix |
|---|---|---|
| **Legs outgrow squats fast** | Bilateral squats become too easy | Unilateral progressions (split squat → Bulgarian → pistol/shrimp), slow eccentrics, pauses, higher reps to true near-failure |
| **Pulling volume is hard to reach** | No bar = limited vertical pull | Table/doorway rows, towel rows, band work, or explicitly recommend a doorway pull-up bar as the single highest-ROI purchase |
| **Hinge/hamstrings underloaded** | Few bodyweight hinge options | Nordic curl progressions, single-leg hip thrusts, sliding leg curls |
| **Isolation is limited** | Bodyweight is compound-dominant | Accept it; add tempo/ROM work and, if the user consents, minimal equipment (bands, rings) |
| **Progressions jump too much** | Push-up → one-arm push-up is a huge gap | Fill gaps with reps, tempo, elevation angle, and asymmetric loading before changing variation |

#### 10.3 Nutrition and recovery: the non-negotiables

- **Energy**: muscle gain requires adequate energy — a **small** surplus (a few hundred kcal/day) supports growth; large surpluses mostly add fat. Beginners in a deficit can still gain some muscle ("recomposition"), especially with high protein and RT, but the effect shrinks as training age increases.
- **Protein**: **~1.6 g/kg/day** is the evidence-based target where additional intake produces no further detectable benefit (Morton et al., 2018, 49 trials, 1,863 participants); ~1.6–2.2 g/kg/day is the common practical range. Spread across the day.
- **Sleep**: 7–9 h; sleep restriction impairs the anabolic response and increases the share of weight lost as lean mass in deficits.
- **Patience and realistic rates**: growth is slow and non-linear; beginners gain fastest, then rates fall sharply. Communicating this prevents the "3 weeks, no visible change, quit" churn pattern.

#### 10.4 Product implications
- The **volume tracker per muscle group per week** is the single most valuable hypertrophy feature: show the user they're inside the 10–20 set window per muscle and flag gaps (usually pull and hinge).
- Prescribe in **RIR**, log RIR, and use it to auto-adjust: if the user reports 5+ RIR consistently, the variation is too easy → progress them.
- Auto-check pattern balance weekly and warn on imbalance ("your pulling volume is 4 sets vs 16 pushing").
- Educate that **muscle gain requires eating**, without turning into a diet app: directional protein guidance, no calorie policing.
- Set expectations with realistic timelines and celebrate progression milestones (variation unlocks, rep PRs) rather than only aesthetic outcomes.

### 11. Dedicated section — Mobility & flexibility

#### 11.1 The biggest finding: strength training also builds flexibility

This is the most counterintuitive and most useful evidence for a bodyweight app. A systematic review and meta-analysis (Afonso et al., 2021, *Healthcare*) comparing strength training vs stretching for range of motion found **similar moderate-magnitude ROM increases for both**, with no effect of sex, age, training duration or frequency. A 2024 RCT (BMC Sports Sci Med Rehabil) that matched training time and stretch intensity between full-ROM resistance training and static stretching of the hip/lower-back extensors found the resistance-training group improved flexibility significantly — and, unlike stretching, also built strength.

Practical consequence: **training bodyweight movements through full range of motion is itself mobility training.** Deep squats, full-ROM push-ups, deep lunges, full-hang pull-ups and controlled eccentrics develop usable range. A separate stretching program is a supplement for specific goals, not a prerequisite for having decent mobility.

#### 11.2 What the stretching literature actually supports

- **All modalities work when done consistently**: static, dynamic, ballistic and PNF stretching all increase joint ROM when applied consistently. For long-term ROM, **static and PNF stretching outperform dynamic/ballistic** (systematic review with meta-analysis, *J Sport Health Sci*, 2023).
- **Dose**: a 2024 *Sports Medicine* systematic review, meta-analysis and multivariate meta-regression set out to identify optimal frequency, intensity and volume for static stretching. The consistent practical read across this literature is that **weekly volume and consistency matter more than any single session's length**, and that reasonable everyday doses (roughly ~30–60 s per muscle group per session, most days) capture most of the benefit. Notably, one meta-regression found **no significant relationship between total stretch duration and ROM effect size** — arguing against the "more is always better" assumption.
- **Mechanism**: at lower volumes, ROM gains come largely from **increased stretch tolerance** (a neural/perceptual change) rather than structural lengthening; structural changes in muscle architecture depend on higher volumes and intensities (Panidi et al., 2023 meta-analysis on muscle architecture).
- **Stretching doesn't make you weak long-term**: chronic stretching improves flexibility **without** negatively impacting strength; a 2025 review notes static stretching may even produce small strength gains when sustained ≥8 weeks (Warneke et al. 2024 meta-analysis on chronic static stretching and hypertrophy/strength). The well-known impairment is **acute** — long, intense static stretches immediately before performance transiently reduce maximal strength.
- **Timing** (consistent with Section 1): **dynamic** stretching before training (improves ROM without hurting strength), **static/PNF** after training or in standalone sessions.
- **Who gains most**: sedentary and older populations gain more from stretching interventions than young healthy trained people — worth reflecting in an app's onboarding, where beginners should get more mobility content.
- **Foam rolling** is not superior to other warm-up interventions for acute flexibility/stiffness gains (systematic review with meta-analysis, 2024) — fine as a comfort tool, not a required step.
- **Expert consensus exists**: a Delphi consensus statement of international stretching researchers (*J Sport Health Sci*, 2025) is the best single source for practical recommendations, useful for grounding app content.

#### 11.3 Practical programming for mobility

1. **Default position**: train the main bodyweight movements through full ROM. That covers most people's mobility needs and costs zero extra time.
2. **Targeted stretching** where ROM actually limits a goal: hips/adductors and hamstrings for straddle/pistol work, thoracic spine and shoulders for handstand/overhead positions, wrists for all hand-balancing (also a prehab necessity — see Section 8), ankles for deep squats.
3. **Dose**: ~30–60 s per target muscle group per session, most days, at a firm-but-tolerable stretch intensity. Consistency over duration.
4. **Placement**: dynamic mobility in the warm-up; static/PNF post-session or as standalone 10–15 min sessions on rest/light days.
5. **Combine active and passive**: end-range isometrics and loaded stretching (e.g., pausing in the bottom of a deep squat, controlled eccentrics into range) build *usable* mobility — strength at the new range, not just passive range.
6. **Timeline**: expect early ROM gains within weeks (largely stretch tolerance) and structural adaptation over months. Extreme goals (full front splits, deep pancake) are multi-month-to-year projects.

#### 11.4 Product implications
- Position mobility as a **session type that preserves the streak on rest days** (10–15 min, low fatigue) — this is one of the cleanest overlaps between good programming and good retention design.
- Prescribe full-ROM standards in exercise cues (depth targets, full lockout, full hang) and treat ROM as a progression axis, not an afterthought.
- **Warm-up = dynamic, cool-down = static** should be hard-coded so users don't do it backwards.
- Gate skill branches on mobility prerequisites where genuinely required (e.g., straddle/hip mobility for OAHS straddle shapes, shoulder flexion for handstand alignment) — same gating logic as Section 8.
- Track ROM benchmarks (sit-and-reach-style, wall shoulder flexion test, squat depth, pancake width) so mobility progress is as visible and gamifiable as reps and hold times.
- Weight mobility content higher for beginners and older users, who gain the most from it.

**Sections 9–11 sources**: Weinheimer et al. 2010 (lean mass loss proportion); Clark 2005 meta-analysis; Willis et al. 2012; Sardeli et al. 2018 (*Nutrients*, PMC5946208); 25-RCT meta-analysis on RT + caloric restriction (Examine research feed); Frontiers in Endocrinology 2025 retrospective cohort (n=304); Longland et al. 2016 (protein × RT in deficit); network meta-analysis on exercise modalities under caloric restriction (PMC12158682); *JISSN* 2025 meta-analysis on concurrent/resistance/aerobic training and fat loss; HIIT vs MICT meta-analysis of 29 RCTs (PMC10048683) and 2026 network meta-analysis (BMC Sports Sci Med Rehabil); Morton et al. 2018 (*BJSM*, protein breakpoint); Kikuchi & Nakazato 2017; Schoenfeld et al. 2017/2019, Pelland et al. 2024, Refalo et al. 2023/2024, Robinson et al. 2024; Afonso et al. 2021 (strength training vs stretching for ROM); BMC Sports Sci Med Rehabil 2024 RCT (full-ROM RT vs static stretching, PMC11212372); *Sports Medicine* 2024 static-stretching dose meta-regression; chronic stretching ROM meta-analysis (*J Sport Health Sci* 2023); Panidi et al. 2023 (muscle architecture); Warneke et al. 2024 (chronic static stretching, strength/hypertrophy); PMC12595194 (stretching modalities review); Delphi consensus on stretching (*J Sport Health Sci* 2025).

## Recommendations

**Phase 1 — MVP (activation & habit).**
1. **Onboarding <3 min with immediate first win**: short readiness questionnaire, level test (how many push-ups/squats), and a completed first mini-session BEFORE any subscription ask. This is the #1 retention lever (D1 activation).
2. **WHO-aligned default goal**: 2–3 strength sessions/week + daily activity, adjustable; for sedentary users, start below the threshold.
3. **Full-body training engine 3×/week** covering the 6–7 patterns (push H/V, pull H/V, squat, hinge, core), 10–20 sets/muscle/week distributed, sets at 1–3 RIR, default 60–120 s rest, integrated 5 min dynamic warm-up.
4. **Conditional variation progression**: unlock the next variation only after a clean-rep threshold (validated equipment-free progressive overload). Honestly flag that optimal pulling may need an object (table/towel/doorway bar).
5. **Streak with forgiveness from day one**: weekly streak (sessions/week) rather than strict daily, + one free monthly "freeze" + "earn back". Never punish a single missed day (aligned with Lally: one absence doesn't break the habit).

**Phase 2 — Depth & motivation.**
6. **Calisthenics skill tree** (path to pistol, handstand push-up, one-arm push-up, muscle-up): materializes competence (SDT), intrinsically playful, differentiates from generic apps.
7. **PRs and scores** (timed AMRAP/EMOM/Tabata): competition against oneself, safe for all levels.
8. **Managed variety**: vary simple movements and session types (strength/hypertrophy/metabolic/mobility) for motivation, keeping key complex movements stable (Baz-Valle trade-off).
9. **Safety guardrails**: RIR framing (never "to failure" by default), form videos, auto-deload every 4–8 weeks, overreach detection via self-report (sleep, pain, performance).

**Phase 3 — Social & long-term retention.**
10. **Careful social**: partners/friends (friend streaks), collaborative challenges, and **skill-matched leagues** — never a single global leaderboard that demotivates beginners (evidence: arXiv walking-challenge, Yang & Goh, Zhang & Centola).
11. **Notifications treated as a product** (personalized, useful, never guilt-tripping).
12. **Micro-win celebration** (animations/sounds on completion) and visible/shareable progress.

**Thresholds that should change the strategy:**
- If D30 retention < ~10%, the problem is activation/onboarding, not content → iterate on D1 time-to-value.
- If session completion < 70%, sessions are too long/hard → shorten, lower friction, offer "minimal" versions.
- If data shows low-ranked users dropping out → remove the global leaderboard, switch to PRs/leagues.
- If gamification's effect fades after a few weeks (consistent with Mazeas: no post-intervention effect) → strengthen internalization (choice autonomy, meaning, self-chosen goals) rather than stacking extrinsic rewards.

## Caveats
- **Meta-analysis generalization**: most volume/frequency/RIR studies involve young trained men; responses vary by age, sex, training level, and recovery capacity. Beginners progress with far less volume.
- **Small samples**: the key variety/motivation study (Baz-Valle 2019) has only 19 subjects, no power analysis, and lasts 8 weeks — robust direction, uncertain magnitude.
- **Short-term gamification evidence**: Mazeas 2022 finds no significant effect after follow-up; many retention/streak statistics (Duolingo, app benchmarks) come from commercial/practitioner sources, not peer-reviewed — treat as illustrative. The walking-challenge analysis (arXiv 1702.07437) is an observational preprint, not an RCT.
- **Tabata**: the spectacular results (VO₂max, +28% anaerobic) come from the original near-maximal protocol (170% VO₂max) on athletes; most commercial "Tabata" doesn't reach that intensity and won't reproduce those effects. Reserve for already-trained users.
- **Cool-down**: contrary to popular belief, it has no proven effect on soreness or injury prevention — offer it for comfort/ritual, without overpromising.
- **Overtraining**: hard to diagnose, often retrospectively; the app's guardrails are preventive, not diagnostic — include a referral to a health professional.
- **Overjustification effect**: the erosion of intrinsic motivation by extrinsic rewards is theoretically established, but its precise application to fitness gamification remains contested (Mallett & Hanrahan 2004 find competition does not erode intrinsic motivation in elite athletes).
- **Fat loss evidence quality**: several key results come from older meta-analyses (Clark 2005, Weinheimer 2010) and one 2025 retrospective cohort with self-selected groups (n=304) — self-selection is a real confounder. HIIT vs MICT conclusions rest on 8–16 week trials rated moderate-to-low certainty, so long-term differences are unknown. Body-composition measurement (DXA, two-compartment models) is also sensitive to water and glycogen shifts.
- **Nutrition guidance is not individualized advice**: the protein and deficit figures are population-level. Anyone with a medical condition, an eating-disorder history, who is pregnant, or on medication should work with a doctor or registered dietitian. An app should say so rather than prescribe.
- **Stretching dose is genuinely unsettled**: the 2024 *Sports Medicine* meta-regression exists precisely because there is no consensus on optimal dose, and one meta-regression found no relationship between total stretch duration and ROM gains. The ~30–60 s/muscle/session figure is a reasonable practical synthesis, not a validated optimum. Much of the short-term ROM gain reflects stretch tolerance rather than tissue change, and the strength-vs-stretching equivalence rests partly on very small RCTs (n=18 in the 2024 trial, 6 per group).
- **Flexibility ≠ injury prevention**: the evidence that stretching prevents injury is weak and separate from the evidence that it increases ROM — don't conflate the two (this mirrors the cool-down caveat above).
