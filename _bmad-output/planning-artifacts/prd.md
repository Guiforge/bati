---
stepsCompleted: ['step-01-init', 'step-02-discovery', 'step-03-success', 'step-04-journeys', 'step-06-innovation', 'step-07-project-type', 'step-08-scoping', 'step-09-functional']
inputDocuments:
  - _bmad-output/planning-artifacts/VISION_COHERENCE_ANALYSIS.md
  - _bmad-output/planning-artifacts/ux-design-specification.md
  - _bmad-output/planning-artifacts/ONBOARDING_FLOW_BLUEPRINT.md
  - _bmad-output/planning-artifacts/COACH_UX_SPECIFICATION.md
  - _bmad-output/planning-artifacts/NAVIGATION_SIMPLIFICATION_SPEC.md
  - _bmad-output/planning-artifacts/HOME_PAGE_REFACTOR_BLUEPRINT.md
  - _bmad-output/planning-artifacts/SESSION_PAGE_REFACTOR_BLUEPRINT.md
  - _bmad-output/planning-artifacts/VILLAGE_PAGE_REFACTOR_BLUEPRINT.md
  - _bmad-output/planning-artifacts/SESSION_MISSING_FLOWS.md
  - _bmad-output/planning-artifacts/ADVANCED_GOALS_SPEC.md
  - _bmad-output/planning-artifacts/MULTIPLAYER_SPEC.md
  - _bmad-output/planning-artifacts/ACCESSIBILITY_SPECIFICATIONS.md
  - _bmad-output/planning-artifacts/ALL_PAGES_REFACTOR_BLUEPRINT.md
workflowType: 'prd'
lastStep: 2
documentCounts:
  briefCount: 0
  researchCount: 0
  brainstormingCount: 0
  projectDocsCount: 13
projectType: 'mobile_app'
domain: 'health_fitness'
complexity: 'medium-high'
primaryUser: 'self' # Building for personal use first
---

# Product Requirements Document - batiV3

**Author:** Guiforge
**Date:** 2026-01-06
**Project Type:** Brownfield (Refactor & Feature Additions)
**Primary User:** Self (Personal fitness app)

---

## Executive Summary

**Bati** is a React Native fitness RPG that transforms workouts into epic fantasy adventures. Users train in real life to build a legendary village, defeat bosses, and earn resources—all without servers, accounts, or grinding.

### Current State: Pre-Launch Development

Bati is in **active development** as a personal fitness app. The app's core mechanics are functional:
- Workout session engine (timer + reps-based exercises)
- RPG progression (XP, levels, village buildings)
- Boss fights (reps = damage dealt)
- Offline-first SQLite database

**The challenge:** While the concept is solid, the current UI doesn't convey the "epic" nature of the experience. It looks like "another fitness app" instead of "a fantasy RPG that makes you fit."

**Key insight from creator:** "Je fais cette app pour moi en premier" - This is a passion project built for personal use, prioritizing simplicity and effectiveness over commercial polish.

### What Makes This Special

Bati challenges the core assumption that **fitness apps need to look "friendly and approachable"** (pastels, rounded shapes, cheerful vibes). Instead, we embrace **dark immersion**: high-tech RPG HUD, glowing buttons, massive timers, visceral feedback loops.

**The insight:** Users don't need another "motivational" app. They need to feel like **heroes living an adventure**. The UI refactor (Phase 5 MVP) will transform the experience from "fitness tracker with RPG features" to "AAA game that happens to make you fit."

**Core differentiators:**
- **Sport First:** Workout logic drives everything, RPG enhances motivation
- **Auto-Building Village:** No management, just pride (workouts = automatic progress)
- **Visceral Boss Fights:** Your reps deal damage, you SEE the impact
- **Dark Fantasy HUD:** Glassmorphism, glows, 120px timers—impossible to ignore
- **Offline-First:** No server, no account, no BS
- **Simple by Design:** Built for personal use means no bloat, no unnecessary features

### The Transformation (Phase 5 MVP Approach)

**Strategy:** Ship a Minimum Viable Epic—refactor Home + Session pages first (2-3 weeks), use personally to validate feel, then decide on full Phase 5 or pivot to Coach intelligence.

**Phase 5 MVP (Weeks 1-3):**
- Home page: HUDHeader, AdventureHeroCard with glassmorphism, simplified nav
- Session page: 120px timers, GlassCards, HUDButtons, damage popups (boss fights)
- Core components: GlassCard, HUDButton, HUDProgressBar, DamagePopup
- **Simplicity focus:** Every component must be intuitive, no learning curve

**Personal Validation (Week 4):**
- Use app for own workouts for 1 week
- Assess: Does the "wow factor" actually enhance motivation?
- Validate: Is the UI simple enough for daily use without friction?

**Success Criteria (Personal Use):**
- Opening the app feels exciting (not a chore)
- Session flow is smooth (no confusion mid-workout)
- Victory screen feels rewarding (dopamine hit)
- Village progress is satisfying to check
- **If these fail: Simplify further or pivot to Coach intelligence**

**Phase 3b (Post-MVP, if UI validated):**
- Coach intelligence (smart recommendations, auto-generated plans)
- Weekly progress tracking
- Helpful notifications (1/day max)

### Key Risks & Mitigations

**Risk 1: Over-engineering for personal use**
- **Mitigation:** Keep MVP ultra-simple, ship fast, iterate based on personal use
- **Reminder:** "L'UI doit être très simple" - complexity kills daily use

**Risk 2: Glassmorphism performance on Android mid-range devices**
- **Mitigation:** Platform-specific fallback (iOS = real blur, Android = solid bg with opacity)
- **Validation:** Test on personal device(s) only

**Risk 3: 110 AI-generated building images lack visual cohesion**
- **Mitigation:** Generate incrementally (5 buildings → validate → continue)
- **Acceptable quality:** Good enough for personal use, not production-ready

**Risk 4: UI refactor distracts from core loop quality**
- **Mitigation:** MVP focuses only on Home + Session (80% of usage time)
- **Fallback:** If personal testing shows UI doesn't improve motivation, simplify and focus on Coach

## Project Classification

**Technical Type:** Mobile App (React Native + Expo)  
**Domain:** Health & Fitness (RPG Gamification)  
**Complexity:** Medium-High (Workout engine + RPG mechanics + offline-first SQLite)  
**Project Context:** Pre-launch development - Personal use app with potential future sharing  
**User Type:** Self (primary), potential future users (secondary)

**Tech Stack:**
- React Native + Expo SDK 52
- Tamagui (design system with tokens)
- SQLite + Drizzle ORM (offline-first)
- Zustand (state management)
- Expo Router (file-based navigation)
- i18next (EN/FR localization)

**Phase 5 MVP Scope (Weeks 1-3):**
- Core components: GlassCard, HUDButton, HUDProgressBar, DamagePopup, StatChip
- Home page refactor: HUDHeader, AdventureHeroCard, QuickStatsRow, simplified nav
- Session page refactor: ActiveExerciseView (120px timer), RestView, VictoryView (enhanced confetti)
- Navigation: Single tab bar (remove floating nav confusion)
- Platform-specific blur handling (iOS native, Android fallback)
- **Simplicity principle:** Every interaction must be obvious, no hidden features

**Phase 5 Full Scope (Post-MVP validation, Weeks 5-8):**
- Village page: Tier tabs, 110 building images (AI-generated, 5 levels each), building details modal
- Quests, Adventures, Journal, Treasury, Goals, Settings pages refactor
- All pages using glassmorphism + HUD components
- **Only if MVP proves valuable for personal use**

**Phase 3b Scope (Post-Phase 5, Weeks 9-12):**
- Smart recommendations (weak area detection algorithm)
- Auto-generate training plans from user goals
- Weekly progress snapshots in Coach modal
- Notification system (1/day max, dismissable)

---

## Success Criteria

### User Success (Primary User: Guiforge)

**The "worth it" moment:**
- Opening the app shows current adventure progress (with boss step visible if applicable)
- **Flexibility:** Can continue adventure OR launch any quest independently
- Village progress is immediately visible and satisfying
- Coach provides actionable guidance toward personal fitness goals

**What makes the app indispensable for daily use:**
1. **Coach Intelligence:** "It knows what I need—I don't have to think"
2. **Village Polish:** "It's beautiful, I'm proud to look at it"
3. **Freedom:** "I can follow the adventure OR do whatever workout I want"

**Personal success metrics (self-validation):**
- Open app **5-6 times/week** (proof of motivation)
- Sessions last **20-30 minutes** (optimal workout time)
- Check village **even without working out** (proof of pride/engagement)
- Coach recommendations are **relevant and helpful** (not random)

### Business Success (If Shared with Others)

**3-month success indicators:**
- 10-20 users (friends/family) testing the app
- **60%+ retention at D7** (sign that it works for others too)
- Zero critical bugs (stable experience)

**12-month success indicators:**
- 100-500 active users (organic word-of-mouth growth)
- Village screenshots shared socially (proof of user pride)
- App is stable and performant across devices

**Primary metric:** "Do people come back?"
→ **D7 retention >60% = success**

### Technical Success

**Must-have for daily personal use:**
- **Fast:** App opens in <2 seconds
- **Smooth:** Sessions run without lag, animations maintain 60fps (or close)
- **Reliable:** Data never lost (SQLite integrity)
- **Simple:** Zero friction to start a workout

**Technical success = "It always works, even on older devices"**

### Measurable Outcomes

**For primary user (personal use):**
- [ ] App opened **5-6x/week** consistently
- [ ] Average session duration **20-30 minutes**
- [ ] Village visited **without workouts** at least 2x/week
- [ ] Coach recommendations accepted **>50% of time**

**For secondary users (if shared):**
- [ ] **60%+ D7 retention** rate
- [ ] **80%+ completion rate** on first workout (onboarding success)
- [ ] **25 min average session duration**
- [ ] **5+ sessions/week** per active user

---

## Product Scope

### MVP - Minimum Viable Product (Weeks 1-10)

**What MUST work for daily personal use:**

**Phase 5 MVP - Home + Session (Weeks 1-3):**
- Home page shows current adventure OR option to launch any quest
- Session page: 120px timer, smooth feedback, clear progress
- Victory screen: Confetti, XP gain, village progress visible
- Core components: GlassCard, HUDButton, HUDProgressBar (simple but epic)
- **Simplicity focus:** Every interaction obvious, zero learning curve

**Phase 3b - Coach Intelligence (Weeks 4-7):**
- Weak area detection (e.g., "arms weak → suggest arm quests")
- Auto-generate training plans from goals ("I want 10 pushups" → 4-week plan)
- Weekly progress snapshot (visualize where you are)
- Recommendations on Home page (coach icon with badge notification)
- **Coach = "personal trainer in my pocket"**

**Village Polish (Weeks 8-10):**
- Tier tabs (T1, T2, T3, T4) for organized viewing
- Building images with 5 evolution levels (AI-generated, visually cohesive)
- Building details modal (lore + stat bonuses)
- Animated prestige score (CountUp effect for satisfaction)
- **Village = "my trophy case, I'm proud to show it"**

**MVP Complete Result:** Home + Session + Coach + Village = satisfying app for daily use

**Success gate before Growth Features:**
- Personal use validation (1 month of consistent usage)
- Coach recommendations prove helpful
- Village progress feels rewarding

### Growth Features (Post-MVP Validation)

**If MVP proves valuable for consistent personal use:**

1. **Local Multiplayer (Bluetooth P2P):**
   - Train with a friend, co-op boss fights
   - Workout sync, shared damage on bosses
   - Effort: 4-6 weeks

2. **Advanced Goals System:**
   - Skill-based goals ("achieve one-arm pullup")
   - Exercise-specific tracking
   - Progressive milestone system
   - Effort: 2-3 weeks

3. **Full UI Refactor (All 22 Pages):**
   - Quests, Adventures, Journal, Treasury, Goals, Settings with glassmorphism
   - All pages using HUD components consistently
   - Effort: 4-5 weeks

4. **Accessibility Features:**
   - High contrast mode
   - Font scaling support
   - Screen reader optimization
   - Effort: 1-2 weeks

**Growth phase activation criteria:**
- MVP used consistently for 1+ month
- No critical bugs or friction points
- Personal fitness goals being achieved

### Vision (Future)

**If app becomes valuable for self AND others:**

1. **Smartwatch Integration:**
   - Heart rate tracking during sessions
   - Session control from watch
   - Apple Watch + Wear OS support
   - Effort: 6-8 weeks

2. **Seasonal Events:**
   - Special quests (e.g., "Winter Warrior")
   - Seasonal village themes (snow effects, decorations)
   - Time-limited challenges
   - Effort: 2-3 weeks per season

3. **Community Features:**
   - Share custom quests
   - Challenges between friends
   - Local leaderboards
   - Effort: 6-8 weeks

4. **Optional Cloud Sync:**
   - Village backup
   - Multi-device sync
   - Optional, privacy-respecting
   - Effort: 3-4 weeks

**Vision phase activation criteria:**
- 100+ active users
- Strong retention metrics (D30 >40%)
- Community demand for social features

---

## User Journeys

### Journey 1: Guiforge - Premier Workout Épique

**Scène d'ouverture (Jour 1, 18h00):**
Guiforge ouvre Bati pour la première fois après avoir fini le setup initial. Il voit l'écran Home avec un background sombre, des cartes glass flottantes. En haut : son avatar + niveau. Au centre : une carte massive avec glow bleu qui dit **"⚔️ IRON ARMS CHALLENGE - Continue Adventure"**. En dessous : "Boss Fight: The Iron Golem (Step 3/5)".

Il hésite une seconde : "Ok je peux continuer l'aventure... mais je veux bosser les jambes aujourd'hui, pas les bras." Il scroll vers le bas et voit un bouton **"Browse All Quests"**. Il tape dessus.

**Action montante:**
L'écran Quests s'ouvre. Filter bar en haut (glassmorphism) avec des chips : [💪 All] [Arms] [Legs] [Chest] [Cardio]. Il tape sur **[Legs]**. La liste filtre instantanément. Il voit **"Warrior's Leg Forge"** (20 min, Normal difficulty). Image épique de guerrier qui saute. Il tape dessus.

Page de détails du quest : Hero image (300px), description, liste d'exercices (squats, lunges, calf raises...). Difficulté sélectionnée : **Normal**. En bas : bouton géant **"⚡ START QUEST"** avec glow massif. Il tape.

**Climax (Durant le workout):**
Session commence. Countdown 3-2-1. Puis : **écran noir profond**. Au centre, un timer ÉNORME (120px) : **00:45** qui pulse. En haut : **"Squats"** (nom de l'exercice). En bas : bouton **"✅ DONE"** qui brille.

Il fait ses squats. Le timer descend. Arrivé à 00:05, le timer pulse RED. Vibration forte. **Temps écoulé.** Il tape **"DONE"**.

**BAM.** Confetti explosion. **"+50 XP"** apparaît. **"1/5 exercises complete"**. Transition vers Rest (30 sec). Countdown géant **00:30**. Il respire.

Next exercise : **Lunges**. Même flow. Exercice 5/5 fini. **VICTORY SCREEN** : Confetti triple burst. **"+250 XP"**, **"Level Up! → Level 3"**, **"Village building unlocked: Training Grounds Level 1"**.

**Résolution:**
Il retourne à l'app 2h plus tard, juste pour checker son village. Il voit le **Training Grounds** avec une image niveau 1 (structure basique). Il sourit. *"Putain c'est satisfaisant."*

Lendemain matin : notification à 18h00 : **"⚔️ Ready for today's quest?"**. Il ouvre l'app direct.

---

### Journey 2: Guiforge - Découverte du Coach (Semaine 2)

**Scène d'ouverture (Jour 10):**
Guiforge a fait 8 workouts en 10 jours (solid). Il ouvre l'app. Sur le Home, il remarque un **Coach icon** en haut à droite avec un badge rouge **(3)**. Il tape dessus.

**Modal Coach** s'ouvre (glassmorphism blur). En haut : **"Coach Recommendations"**. 

**Card 1:** ⚠️ **Weak Area Detected**  
*"Your back training is falling behind. Try a back-focused quest this week."*  
[Try Quest: "Iron Grip Challenge"]

**Card 2:** 🎯 **Goal Milestone**  
*"You're 2 workouts away from your weekly goal (5 sessions/week)."*  
[View Goal Progress]

**Card 3:** 📊 **Progress Snapshot**  
*"Last 7 days: 4 workouts, 320 min total, 850 XP earned."*  
Muscle balance chart : Arms 30%, Legs 25%, Back 15% ← RED, Chest 20%, Abs 10%.

**Action montante:**
Il réalise : *"Ah ouais, j'ai négligé le back."* Il tape sur **[Try Quest]**. L'app le redirige vers **"Iron Grip Challenge"** (back workout, 25 min). Il lance le quest directement.

Pendant le workout, il pense : *"Le coach est intelligent, c'est exactement ce dont j'avais besoin."*

**Climax:**
Après le workout, Victory screen montre : **"Weak Area Improved! Back +15%"**. Son muscle balance chart est maintenant plus équilibré.

**Résolution:**
Semaine 3 : Il check le Coach **avant** de choisir un quest. Le coach suggère : **"Generate 4-week plan from your goal?"** (Goal: "I want 10 pushups"). Il tape **Yes**.

L'app crée une **Adventure automatique** : 4 semaines, 3 sessions/semaine, focus progressive overload sur pushups. Il suit le plan. Semaine 4 : il fait **8 pushups** (record personnel). *"Je vais y arriver."*

---

### Journey 3: Guiforge - Fierté du Village (Mois 1)

**Scène d'ouverture (Jour 28):**
Guiforge a complété 22 workouts en 1 mois (presque tous les jours). Il ouvre l'app, pas pour s'entraîner, juste pour **regarder son village**.

**Tab Village** : Il voit ses buildings organisés en **Tiers** (T1, T2, T3, T4). T1 : 6 buildings unlocked, tous Level 2-3. **Archery Range Level 3** (image d'une structure renforcée avec bannières). **Forge Level 2** (enclume qui brille).

**Action montante:**
Il tape sur **Archery Range**. Modal s'ouvre (glassmorphism) :

**"🏹 ARCHERY RANGE (Level 3)"**  
Image : Tour de tir avec cibles multiples.  
**Lore:** *"Your archers train day and night, perfecting their aim. Legends say the best can split an arrow in two."*  
**Bonus:** Arms +15% XP  
**Stats:** 180 XP / 250 XP to Level 4  
**Progress bar:** 72% filled.

Il scroll. Voit un **"Next Level Preview"** : Image de Level 4 (tour plus grande, with glow effects). *"15 more arm workouts to unlock."*

**Climax:**
Il check son **Prestige Score** en haut : **1,250 Prestige**. CountUp animation (950 → 1,250). Il réalise : *"J'ai presque 10 buildings débloqués. Mon village est légit."*

**Résolution:**
Le soir, il envoie un screenshot de son village à un pote : *"Mate mon RPG fitness app."* Le pote répond : *"C'est quoi ce truc ? Ça a l'air fou."*

Guiforge : *"Je l'ai construite moi-même. Essaie-la quand elle sera dispo."*

---

### Journey Requirements Summary

These three journeys reveal the core capabilities needed for Bati:

**Journey 1 (Premier Workout Épique):**
- Home page with current adventure display + "Browse All Quests" option
- Quests gallery with muscle group filters (glassmorphism chips)
- Quest details page: hero image, exercise list, difficulty selector, massive CTA
- Session flow: 3-2-1 countdown, 120px pulsing timer, glowing DONE button, rest view
- Victory screen: confetti burst, XP display, level-up animation, building unlock celebration
- **Core capability:** **Flexibility** - continue adventure OR launch any quest independently

**Journey 2 (Découverte du Coach):**
- Coach icon on Home with notification badge
- Coach modal with glassmorphism: recommendations cards (weak areas, goal milestones, progress snapshot)
- Weak area detection algorithm tracking muscle balance across workouts
- Auto-generate adventure from user goals with progressive overload
- Goal progress tracking with weekly session counts
- Victory screen integration showing weak area improvement
- **Core capability:** **Coach Intelligence** - smart recommendations and personalized plan generation

**Journey 3 (Fierté du Village):**
- Village page with Tier tabs (T1, T2, T3, T4) for organized browsing
- Building cards displaying AI-generated images showing 5 evolution levels
- Building details modal: large image, lore text, stat bonuses, XP progress bar, next level preview
- Prestige score with CountUp animation effect
- Visual progression system making each unlock/level-up satisfying
- **Core capability:** **Village Polish** - satisfying progression visualization that creates pride and shareability

---

## Innovation & Novel Patterns

### Detected Innovation Areas

**1. Sport-First RPG Integration**
Bati challenges the traditional approach of "gamifying fitness" by inverting the relationship between gameplay and exercise. Rather than adding fitness mechanics to an RPG game, Bati makes **real workouts drive RPG progression** directly:
- Reps completed = damage dealt to bosses (visceral, immediate connection)
- Workout sessions = village building progress (automatic, no management overhead)
- No artificial "energy systems" or timers—your real effort is the only currency

**2. Auto-Building Village (Zero Management)**
Traditional RPG city-builders require constant management, clicking, and resource allocation. Fitness apps use badges and streaks that feel superficial. Bati's innovation: **the village builds itself automatically** based on actual training:
- No clicking, no micromanagement, no grind
- Buildings unlock and level up based on muscle group training patterns
- Players experience pure pride without tedious management
- Village becomes a "trophy case" of real athletic achievement

**3. Dark Immersion Over Friendly Design**
Fitness apps conventionally use bright colors, motivational language, and "friendly" UI to appeal to broad audiences. Bati rejects this assumption entirely:
- **Dark fantasy aesthetic**: Deep blacks, electric blue glows, glassmorphism HUD
- **AAA game visual language**: 120px timers, damage popups, epic confetti bursts
- **Immersion over motivation**: Players don't need cheerleading—they need to feel like heroes in an adventure
- Targets users who want gaming-level production values in fitness

**4. Offline-First + Zero-Server Architecture**
Most modern fitness and gaming apps depend on cloud infrastructure, user accounts, and always-online connectivity. Bati takes a privacy-first, local-first approach:
- **SQLite local database**: All data stays on device
- **No accounts, no servers**: Zero signup friction, complete privacy
- **Future multiplayer via Bluetooth P2P**: Even social features work without servers
- **Optional cloud sync only**: User chooses if/when to back up data

### Market Context & Competitive Landscape

**Existing Fitness Apps:**
- **MyFitnessPal, Strava, Nike Training**: Tracking-focused, data-heavy, no RPG elements
- **Zombies, Run!**: Gamified with audio storytelling, but no village-building or progression system
- **Habitica**: RPG habit tracker with cute pixel art, but not fitness-specific and lacks immersion

**RPG Fitness Hybrids:**
- **Ring Fit Adventure (Nintendo Switch)**: Excellent gameplay but requires hardware purchase, not mobile
- **Fitocracy**: RPG points for workouts but dated UI, no village/building mechanics

**Market Gap:**
- No dark fantasy immersive fitness app exists
- No auto-building village mechanic (all existing builders require management)
- No offline-first + RPG combination with AAA-level UI polish
- **Bati occupies a unique position**: AAA game aesthetics + real fitness + zero management

### Validation Approach

**Innovation 1 (Sport-First + Boss Fights):**
- **Hypothesis**: Direct workout → damage feedback creates stronger motivation than abstract points/badges
- **Validation metric**: Personal usage reaches 5-6 sessions/week consistently
- **Success indicator**: "Beating the boss" feels more rewarding than completing a generic workout
- **Timeline**: Validate within first month of personal use

**Innovation 2 (Auto-Building Village):**
- **Hypothesis**: Pride in village progress drives retention without management overhead
- **Validation metric**: Village visits without workouts ≥2x/week
- **Success indicator**: Screenshots shared spontaneously, village shown to friends
- **Timeline**: Validate after 20+ sessions (1 month of consistent use)

**Innovation 3 (Dark Fantasy UI):**
- **Hypothesis**: Immersive "AAA game" aesthetics increase desire to open app
- **Validation metric**: Opening app feels exciting (not a chore), beta testers say "looks like a video game"
- **Success indicator**: Users report "wow factor" on first launch, UI doesn't feel like typical fitness app
- **Timeline**: Validate immediately with MVP (Home + Session pages)

**Innovation 4 (Offline-First Architecture):**
- **Hypothesis**: Local-first + privacy-respecting approach appeals to privacy-conscious users
- **Validation metric**: Zero data loss, app opens <2 seconds, works 100% without internet
- **Success indicator**: No sync bugs, no account creation friction
- **Timeline**: Continuous validation throughout development

### Risk Mitigation

**Risk 1: Dark UI too intimidating for casual fitness users**
- **Likelihood**: Medium (some users prefer "friendly" fitness apps)
- **Impact**: High (could reduce potential user base)
- **Mitigation**: Onboarding tutorial demonstrates simplicity despite epic visuals
- **Fallback**: If beta feedback confirms intimidation, reduce glow intensity and glassmorphism effects

**Risk 2: Village auto-building removes sense of player agency**
- **Likelihood**: Low (most users dislike management overhead in fitness apps)
- **Impact**: Medium (some players want control over progression)
- **Mitigation**: Phase 5 includes tier tabs, building details modal, prestige system (provides ownership feeling)
- **Fallback**: Add optional building placement customization in Growth phase

**Risk 3: Boss fights not visceral enough without complex animations**
- **Likelihood**: Medium (AAA games have elaborate boss animations)
- **Impact**: Medium (could reduce "epic" feeling)
- **Mitigation**: Damage popups + HP bar animations + sound effects + haptics compensate for lack of 3D boss renders
- **Fallback**: Use AI-generated boss phase images (4 phases per boss) to show visual damage progression

**Risk 4: Offline-first limits social features**
- **Likelihood**: High (social features drive retention in many fitness apps)
- **Impact**: Medium (mitigated by strong solo experience)
- **Mitigation**: Future multiplayer via Bluetooth P2P (no server needed), optional cloud sync for multi-device users
- **Fallback**: If social demand is high, add optional cloud leaderboards in Vision phase

---

## Mobile App Specific Requirements

### Project-Type Overview

Bati is a **cross-platform mobile fitness RPG** built with React Native and Expo SDK 52. The app leverages native device capabilities (haptics, notifications) while maintaining 100% offline functionality through local SQLite storage. The architecture prioritizes performance, privacy, and smooth user experience across both iOS and Android platforms.

### Technical Architecture Considerations

**Platform Stack:**
- **Framework:** React Native + Expo SDK 52 (cross-platform development)
- **UI Library:** Tamagui (design system with tokens, glassmorphism effects)
- **Database:** SQLite + Drizzle ORM (local-first, zero network dependency)
- **State Management:** Zustand (lightweight, performant)
- **Routing:** Expo Router (file-based navigation)
- **Localization:** i18next (EN/FR support)

**Platform Support:**
- **iOS:** Minimum iOS 13+ (Expo SDK 52 default)
- **Android:** Minimum Android 5.0 (API Level 21+)
- **Target Devices:** Modern smartphones (iPhone 8+, mid-range Android 2020+)
- **Performance Target:** 60fps animations, <2 second app launch time

**Platform-Specific Considerations:**
- **iOS:** Native blur effects supported via `BlurView` (glassmorphism)
- **Android:** Fallback to solid backgrounds with opacity (no native backdrop-filter)
- **iOS:** Haptics via `Haptics.impactAsync()` (heavy, medium, light)
- **Android:** Vibration API fallback (less nuanced than iOS Taptic Engine)

### Device Permissions

**Required Permissions (Automatic):**
- **Storage:** SQLite database for offline workout data, village progress, user settings
- **Vibration/Haptics:** Feedback on button taps, timer alerts, exercise completion

**Optional Permissions (User-Granted):**
- **Notifications:** Daily workout reminders (max 1/day, fully dismissable)
  - User must explicitly enable in app settings
  - Configurable timing (default: 18:00 local time)
  - Content: "⚔️ Ready for today's quest?" style messages

**Future Permissions (Vision Phase):**
- **Health Data (iOS HealthKit):** Heart rate tracking during sessions
- **Fitness Data (Android Google Fit):** Heart rate, activity tracking
- **Camera (optional):** Screenshot village for sharing (no upload, local only)

### Offline Mode Architecture

**100% Offline Functionality:**
- All core features work without internet connection
- No API calls required for workout sessions, village progression, or coach recommendations
- SQLite database stores all user data locally (workouts, XP, buildings, goals)
- Quests, adventures, exercises, and building definitions stored locally

**Data Persistence:**
- **Automatic saves:** Session progress saved after each exercise completion
- **Data integrity:** SQLite transactions prevent data loss on app crashes
- **Backup strategy:** Local device storage only (MVP/Growth phases)
- **Future (Vision):** Optional cloud sync for multi-device users

**No Network Dependency:**
- App installs once with all content bundled (quests, exercises, building definitions)
- No content downloads required post-installation
- Updates delivered via App Store/Google Play app updates

### Push Notification Strategy

**Notification Constraints:**
- **Frequency Limit:** Maximum 1 notification per day (anti-spam principle)
- **User Control:** Fully dismissable, settings toggle to disable entirely
- **Timing:** User-configurable notification time (default 18:00 local)
- **Content Style:** Short, motivational, gamified ("⚔️ Ready for today's quest?")

**Notification Types (All Optional):**
- **Daily Workout Reminder:** Scheduled at user-preferred time
- **Streak Warning:** "Don't lose your 7-day flame!" (only if streak >3 days)
- **Goal Milestone:** "2 workouts away from weekly goal" (only if goal active)

**Implementation:**
- iOS: `expo-notifications` with APNs (Apple Push Notification service)
- Android: `expo-notifications` with FCM (Firebase Cloud Messaging)
- Local notifications only (no server-side push required for MVP)

### Store Compliance

**Apple App Store (iOS):**
- **Category:** Health & Fitness
- **Age Rating:** 4+ (no objectionable content, suitable for all ages)
- **Required Disclaimer:** "Consult a physician before starting any workout program. This app is not a medical device and does not provide medical advice."
- **Privacy Policy:** Required (even for offline apps—must document data handling practices)
- **No Medical Claims:** App does not diagnose, treat, or prevent medical conditions
- **Accessibility:** Must support VoiceOver, Dynamic Type, high contrast modes (WCAG 2.1 AA)

**Google Play Store (Android):**
- **Category:** Health & Fitness
- **Content Rating:** ESRB Everyone (no mature content)
- **Required Disclaimer:** Same as iOS—workout program disclaimer
- **Privacy Policy:** Required URL in Play Console (must host publicly)
- **Data Safety Section:** Declare data collected (even if offline-only, declare SQLite usage)
- **Permissions Justification:** Explain why notifications/haptics are needed

**Legal & Liability Considerations:**
- **Disclaimer Placement:** Show on first app launch (onboarding) and in settings
- **User Acknowledgment:** "I understand this app provides fitness guidance only, not medical advice" checkbox
- **Liability Waiver:** "Use at your own risk" language (consult legal counsel for final wording)
- **Content Accuracy:** Exercise descriptions must be safe and accurate (review by certified trainer recommended)

### Implementation Considerations

**Performance Optimization:**
- **Image Assets:** 110 building images (256x256 WebP, lazy-loaded) = ~3-4 MB total
- **Bundle Size Target:** <50 MB total app size (React Native + assets)
- **Animation Performance:** Use `react-native-reanimated` for 60fps animations
- **Glassmorphism Fallback:** Detect platform and render iOS blur vs Android solid backgrounds

**Device Compatibility Testing:**
- **iOS:** Test on iPhone SE (small screen), iPhone 14 Pro (large screen), iPad (tablet)
- **Android:** Test on Pixel 4a (mid-range), Samsung Galaxy A52 (popular model), OnePlus 9 (high-end)
- **Performance Profiling:** Use React DevTools Profiler, Xcode Instruments, Android Profiler

**App Store Submission Checklist:**
- [ ] Privacy policy URL hosted publicly
- [ ] App Store screenshots (6.5" iPhone, 12.9" iPad for iOS)
- [ ] Google Play screenshots (phone + 10" tablet)
- [ ] App description localized (EN + FR)
- [ ] Disclaimer text in onboarding + settings
- [ ] TestFlight beta testing (iOS) for 20-30 users before public launch
- [ ] Internal testing track (Google Play) for validation

---

## Project Scoping & Phased Development

### MVP Strategy & Philosophy

**MVP Approach:** Experience MVP

Bati prioritizes delivering a **complete, satisfying user experience** over minimal feature sets. The philosophy: "I'm building this app for myself first. It needs to be polished enough that I want to use it every day. If it satisfies me for 1 month, then I can consider sharing it."

This is not a "problem-solving MVP" that strips features to bare essentials. Instead, it's an **experience-driven MVP** that delivers:
- The full dark fantasy immersion (glassmorphism, glows, epic animations)
- Complete core loop (workout → village progress → coach guidance)
- Satisfying progression visualization (village buildings, prestige, XP)

**Rationale:** For a passion project built for personal use, the MVP must be **motivating to use daily**. A barebones version wouldn't validate whether the concept works—only a polished experience proves the innovation.

**Resource Requirements:**
- **Team Size:** Solo developer (Guiforge)
- **Skills Required:** React Native, TypeScript, SQLite, Tamagui, AI prompting (building images)
- **Timeline:** 10 weeks (2.5 months) for complete MVP
- **Budget:** Zero (personal project, AI-generated assets)

### MVP Feature Set (Phase 1: Weeks 1-10)

**Core User Journeys Supported:**
- ✅ **Journey 1:** Launch a workout (continue adventure OR choose any quest freely)
- ✅ **Journey 2:** Receive intelligent Coach recommendations based on training patterns
- ✅ **Journey 3:** View village progression and feel pride in accomplishments

**Must-Have Capabilities:**

**Home Page (Weeks 1-3):**
- Current adventure display with boss progress visible
- "Browse All Quests" option for flexibility
- Coach icon with badge notification (number of recommendations)
- HUDHeader: Avatar, level, XP bar, stat chips (streak, sessions, total XP)
- Core components implemented: GlassCard, HUDButton, HUDProgressBar, StatChip

**Session Flow (Weeks 1-3):**
- **Active Exercise View:** 120px pulsing timer, DONE button with massive glow, exercise name/description
- **Rest View:** 30-second countdown, "Next Up" preview card, skip/add time buttons
- **Victory Screen:** Confetti burst, XP display with animation, level-up modal, building unlock celebration
- **Boss Fight Variant:** HP bar, damage popup animations, phase-based boss images

**Coach Intelligence (Weeks 4-7):**
- **Weak Area Detection:** Algorithm tracks muscle balance across last 4 weeks, identifies muscles <50% of max training
- **Auto-Generate Plans:** User sets goal ("I want 10 pushups") → system creates 4-week adventure with progressive overload
- **Weekly Progress Snapshot:** Sessions completed, total minutes, XP earned, muscle balance chart
- **Recommendations Display:** Coach modal with 3 cards (weak area alert, goal milestone, progress summary)

**Village Polish (Weeks 8-10):**
- **Tier Tabs:** T1 (basic muscle buildings), T2 (advanced), T3 (style buildings), T4 (legendary)
- **Building Cards:** 2-column grid, AI-generated images showing 5 evolution levels per building
- **Building Details Modal:** Large image, lore text, stat bonuses, XP progress bar, next level preview
- **Prestige System:** Animated prestige score (CountUp effect), prestige calculated from building unlocks/levels

**Explicitly OUT of MVP:**
- Full 22-page UI refactor (only Home + Session in MVP)
- Multiplayer/Bluetooth P2P features
- Advanced goal types (skill progressions, milestones)
- Smartwatch integration
- Seasonal events or community features
- Cloud sync or backup

### Post-MVP Features

**Phase 2: Growth (Post-MVP Validation - Weeks 11-24)**

**Activation Criteria:**
- MVP used consistently for 1+ month personal testing
- Coach recommendations prove helpful (>50% acceptance rate)
- Village progress feels rewarding (visited 2x/week without workouts)
- No critical bugs or UX friction points

**Growth Features:**

1. **Local Multiplayer (Bluetooth P2P)** - 4-6 weeks
   - Device discovery via Bluetooth LE
   - Co-op boss fights (2-4 players share HP bar)
   - Real-time workout sync
   - Local leaderboards (cached on device)

2. **Advanced Goals System** - 2-3 weeks
   - Skill-based goals ("achieve one-arm pullup")
   - Exercise-specific tracking with personal records
   - Progressive milestone system (5-step progressions)
   - Coach generates skill-building quests

3. **Full UI Refactor (Remaining 20 Pages)** - 4-5 weeks
   - Quests, Adventures, Journal, Treasury, Goals, Settings pages
   - All pages using glassmorphism + HUD components consistently
   - Unified visual language across entire app

4. **Accessibility Features** - 1-2 weeks
   - High contrast mode
   - Font scaling support (up to 200%)
   - Screen reader optimization (VoiceOver, TalkBack)
   - WCAG 2.1 AA compliance validation

**Phase 2 Total Effort:** ~14-16 weeks

### Phase 3: Expansion (Vision - Weeks 25+)

**Activation Criteria:**
- 100+ active users (friends, family, word-of-mouth)
- Strong retention metrics (D30 retention >40%)
- Community demand for social/advanced features
- App is stable and performant across devices

**Expansion Features:**

1. **Smartwatch Integration** - 6-8 weeks
   - Apple Watch + Wear OS support
   - Heart rate tracking during sessions
   - Session control from watch (start, pause, skip)
   - Workout summaries on watch face

2. **Seasonal Events** - 2-3 weeks per season
   - Special quests ("Winter Warrior Challenge")
   - Seasonal village themes (snow effects, decorations)
   - Time-limited challenges with unique rewards
   - Event leaderboards

3. **Community Features** - 6-8 weeks
   - Share custom quests (export/import JSON)
   - Challenges between friends (async competition)
   - Local leaderboards (cached, P2P sync)
   - Village visiting (view friends' villages)

4. **Optional Cloud Sync** - 3-4 weeks
   - Village backup to cloud storage
   - Multi-device sync (iOS + Android)
   - Privacy-respecting (opt-in, encrypted)
   - No account required (device linking via codes)

**Phase 3 Total Effort:** ~17-23 weeks

### Risk Mitigation Strategy

**Technical Risks:**

**Risk 1: Glassmorphism performance on Android mid-range devices**
- **Likelihood:** High (Android lacks native backdrop-filter support)
- **Impact:** Medium (affects visual polish, not functionality)
- **Mitigation:** Platform-specific rendering (iOS = real blur via `BlurView`, Android = solid background with opacity)
- **Validation:** Test on 5 Android devices (Pixel 4a, Samsung A52, etc.) in Week 2
- **Fallback:** If Android lag persists, reduce glassmorphism to iOS-only feature

**Risk 2: 110 AI-generated building images lack visual cohesion**
- **Likelihood:** Medium (AI generation can be inconsistent)
- **Impact:** High (breaks immersion, reduces village pride)
- **Mitigation:** Generate 5 buildings first (1 tier), validate style guide, then batch-generate rest with consistent prompts
- **Validation:** Show AI samples to 3 people, ensure instant recognition of building types
- **Fallback:** Commission 2D artist for buildings if AI quality insufficient (~$500-1000 budget)

**Risk 3: Solo development burnout over 10-week MVP**
- **Likelihood:** Medium (solo projects have high abandonment rate)
- **Impact:** Critical (project failure if abandoned)
- **Mitigation:** Phase MVP into checkpoints (Week 3: Home+Session, Week 7: +Coach, Week 10: +Village)
- **Validation:** Ship and personally test each checkpoint before continuing
- **Fallback:** If Week 5 = burnout risk, skip Village polish, ship MVP with Coach only (validate core loop first)

**Market Risks:**

**Risk 4: No user data to validate hypotheses (building for self, not market)**
- **Likelihood:** 100% (pre-launch, no users yet)
- **Impact:** Medium (could build wrong features)
- **Mitigation:** Personal use testing for 1 month minimum before sharing with others
- **Validation:** If Guiforge uses app 5-6x/week consistently, indicates product-market fit for target persona
- **Fallback:** If personal testing reveals UX issues, iterate MVP before external beta

**Risk 5: Dark fantasy UI too intimidating for casual fitness users**
- **Likelihood:** Medium (some users prefer "friendly" fitness apps)
- **Impact:** Medium (could limit potential user base)
- **Mitigation:** Onboarding tutorial demonstrates simplicity despite epic visuals
- **Validation:** Beta testers (friends/family) report "looks cool but easy to use"
- **Fallback:** If beta feedback confirms intimidation, reduce glow intensity, add "Simple Mode" toggle

**Resource Risks:**

**Risk 6: Feature scope creep during MVP development**
- **Likelihood:** High (passion projects often expand scope)
- **Impact:** High (extends timeline, risks burnout)
- **Mitigation:** Strict adherence to "Experience MVP" definition—polish core, skip extras
- **Validation:** Weekly scope check: "Does this feature serve Journey 1, 2, or 3?"
- **Fallback:** If Week 8 and behind schedule, cut Village details modal (keep basic village view)

**Risk 7: App Store/Google Play rejection during submission**
- **Likelihood:** Low (fitness apps generally approved)
- **Impact:** High (delays launch, requires rework)
- **Mitigation:** Include required disclaimer on first launch, host privacy policy, no medical claims
- **Validation:** Review App Store guidelines before Week 1, TestFlight beta to catch issues early
- **Fallback:** If rejected, address issues within 1 week (common issues: missing disclaimer, broken links)

---

## Functional Requirements

### Workout Session Management

- **FR1:** Users can start a workout session by selecting a quest or continuing an adventure
- **FR2:** Users can view exercise instructions and target reps/time for current exercise
- **FR3:** Users can complete an exercise and proceed to the next exercise in the sequence
- **FR4:** Users can track rest periods between exercises with countdown timer
- **FR5:** Users can pause a workout session and resume later
- **FR6:** Users can modify or skip an exercise during a workout if needed
- **FR7:** Users can view their progress through the workout (exercise X of Y, round X of Y)
- **FR8:** System automatically saves workout progress after each completed exercise
- **FR9:** Users receive visual and haptic feedback upon completing an exercise
- **FR10:** Users can view workout summary (XP earned, exercises completed, time taken) after session completion

### Boss Fight Mechanics

- **FR11:** Users can participate in boss fight workouts where exercise reps deal damage to boss HP
- **FR12:** Users can view boss health bar and current phase during boss fight sessions
- **FR13:** System calculates damage dealt based on exercise difficulty and reps completed
- **FR14:** Users can see damage popup animations showing HP reduction after each exercise
- **FR15:** System transitions boss to next phase when HP threshold reached
- **FR16:** Users receive enhanced rewards (XP, loot) upon defeating a boss

### Quest & Adventure Discovery

- **FR17:** Users can browse all available quests filtered by muscle group, duration, and difficulty
- **FR18:** Users can view quest details including exercise list, estimated duration, and difficulty level
- **FR19:** Users can start any quest independently regardless of current adventure status
- **FR20:** Users can view adventure details showing multi-quest progression and boss fight locations
- **FR21:** Users can continue their current adventure from the home screen
- **FR22:** System tracks adventure progress (step X of Y) and displays on home screen

### Village Progression

- **FR23:** Users can view all buildings in their village organized by tier (T1, T2, T3, T4)
- **FR24:** System automatically unlocks buildings based on workout completion and muscle training patterns
- **FR25:** System automatically levels up buildings based on accumulated XP for related muscle groups
- **FR26:** Users can view building details including lore, stat bonuses, current level, and XP progress
- **FR27:** Users can see visual progression of buildings across 5 evolution levels
- **FR28:** Users can view prestige score calculated from total building unlocks and levels
- **FR29:** Users can see next level preview for buildings showing required XP and visual changes
- **FR30:** System displays building unlock celebrations after workout completion

### Coach Intelligence

- **FR31:** System detects weak muscle areas by analyzing training history across last 4 weeks
- **FR32:** Users can view coach recommendations including weak area alerts and suggested quests
- **FR33:** Users can view weekly progress snapshot showing sessions completed, XP earned, and muscle balance
- **FR34:** Users can set fitness goals (e.g., "I want to do 10 pushups")
- **FR35:** System automatically generates 4-week training plan (adventure) from user-defined goals
- **FR36:** Users can view goal progress including current status and sessions remaining to target
- **FR37:** System displays coach notifications as badges on home screen coach icon
- **FR38:** Users can dismiss coach recommendations or accept suggested actions

### Character Progression

- **FR39:** Users earn XP from completed exercises based on difficulty and reps/time
- **FR40:** System automatically levels up user character when XP thresholds reached
- **FR41:** Users can view their current level, XP bar progress, and total XP earned
- **FR42:** Users can view their avatar and customize appearance (avatar selection)
- **FR43:** Users can name their village during onboarding
- **FR44:** System tracks user statistics including total sessions, workout streak, and lifetime XP

### Offline & Data Management

- **FR45:** System stores all user data locally in SQLite database without requiring internet connection
- **FR46:** Users can access all core functionality (workouts, village, coach) while offline
- **FR47:** System automatically backs up data to local device storage
- **FR48:** Users can view their complete workout history with session details
- **FR49:** System prevents data loss during app crashes or device restarts

### Notifications & Reminders

- **FR50:** Users can enable daily workout reminder notifications at configurable time
- **FR51:** System limits notifications to maximum 1 per day
- **FR52:** Users can disable notifications entirely via settings
- **FR53:** System sends streak warning notification if user hasn't worked out and streak >3 days
- **FR54:** System sends goal milestone notification when user is close to weekly goal

### Onboarding & First-Time Experience

- **FR55:** Users complete onboarding by selecting avatar and naming village
- **FR56:** Users can optionally complete tutorial quest to learn workout mechanics
- **FR57:** Users see fitness disclaimer and acknowledgment on first app launch
- **FR58:** System displays coach suggestions after first 7 days of usage

---

