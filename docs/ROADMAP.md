# Bati - Complete Roadmap & TODO

This document tracks all features, their implementation status, and future plans.

**Last Audit:** January 1, 2026 (i18n cleanup + radar chart)

**Legend:**

- ✅ Done
- 🚧 In Progress
- 📋 Planned
- 💡 Idea (not confirmed)
- ⚠️ Partial (started but incomplete)

---

## Phase 1: Core Loop ✅ (100% Complete)

### 1.1 Database Foundation ✅

- ✅ SQLite setup with expo-sqlite
- ✅ Drizzle ORM integration
- ✅ Migration system
  - ✅ Initial schema (exercises, quests, etc.)
  - ✅ Seed exercises data
  - ✅ Seed quests data
  - ✅ Add adventures tables
  - ✅ Add completed sessions tracking
  - ✅ Add XP system
  - ✅ Localized narratives for adventure steps
- ✅ DatabaseProvider component with loading state

### 1.2 Exercises System ✅

- ✅ Exercise schema
  - ✅ Localized names (EN/FR)
  - ✅ Localized descriptions
  - ✅ Difficulty levels (easy/medium/hard)
  - ✅ Equipment requirements
  - ⚠️ Image/animation paths (schema ready, using emoji placeholders)
  - ✅ Seconds per rep (for duration estimation)
  - ✅ Creator field (Admin/user)
- ✅ Exercise-Muscle relationships
  - ✅ Many-to-many junction table
  - ✅ Muscle codes (arms, back, shoulder, chest, abs, calf)
- ✅ Exercise queries
  - ✅ Get all exercises
  - ✅ Get by muscle filter
  - ✅ Get by equipment filter
- ✅ Exercise detail screen (`/exercises/[id]`)

### 1.3 Quests System ✅

- ✅ Quest schema
  - ✅ Localized titles (EN/FR)
  - ✅ Localized descriptions
  - ✅ Rounds configuration
  - ✅ Rest seconds between sets
  - ✅ Author field
- ✅ Quest-Exercise relationships
  - ✅ Ordered exercise list (sortOrder)
  - ✅ Target type (reps/time)
  - ✅ Target range (min/max)
  - ✅ Exercise images JSON
- ✅ Quest queries
  - ✅ Get all quests with exercises
  - ✅ Get quest by ID
  - ✅ Duration estimation
- ✅ Quest UI
  - ✅ Quest cards with color coding
  - ✅ Quest detail screen (`/quests/[id]`)
  - ✅ Quest carousel on home
  - ✅ Quest gallery with filters
  - ✅ Filter bottom sheet (muscle/equipment)

### 1.4 Adventures System ✅

- ✅ Adventure schema
  - ✅ Localized titles/descriptions
  - ✅ Cover quest reference
  - ✅ Kind (route/boss/event)
  - ✅ Sort order
  - ✅ Active flag
  - ✅ Author field
- ✅ Adventure steps
  - ✅ Step index ordering
  - ✅ Quest per step
  - ✅ Localized narratives (EN/FR)
- ✅ Adventure runs (progress tracking)
  - ✅ Run status (active/finished)
  - ✅ Difficulty override
  - ✅ Timestamps
- ✅ Adventure run steps
  - ✅ Step status (locked/active/completed)
  - ✅ Link to completed session
- ✅ Adventure queries
  - ✅ Get all adventures
  - ✅ Get multi-step adventures
  - ✅ Get adventure with steps
  - ✅ Start adventure run
  - ✅ Complete step
  - ✅ Get active run
- ✅ Adventure UI
  - ✅ Adventures gallery (`/adventures`)
  - ✅ Adventure detail screen (`/adventures/[id]`)
  - ✅ Continue adventure card on home
  - ✅ Step progress display
  - ✅ Boss badge for `kind="boss"`

### 1.5 Session Flow ✅

- ✅ Session state (Zustand store)
  - ✅ Quest reference
  - ✅ Status (idle/running/resting/paused/finished)
  - ✅ Current round/exercise tracking
  - ✅ Timer timestamps
  - ✅ Pause time accumulator
  - ✅ Exercise results accumulator
- ✅ Session actions
  - ✅ Start session
  - ✅ Pause/resume
  - ✅ Complete exercise
  - ✅ Skip rest
  - ✅ Add rest time (on rest screen)
  - ✅ Quit session
- ✅ Session timer hook
  - ✅ Accurate timer (timestamp-based)
  - ✅ Background handling
  - ✅ Overtime tracking
- ✅ Session UI
  - ✅ Pre-start countdown (3-2-1, "Let's go!")
  - ✅ Exercise display screen (reps mode)
  - ✅ Exercise display screen (time mode with countdown)
  - ✅ Rest screen with next exercise preview
  - ✅ Pause overlay (Resume/Quit)
  - ✅ Progress bar (segmented by rounds)
  - ✅ Overtime display for time-based exercises
  - ✅ Rep adjustment on exercise screen (+/- buttons)
- ✅ "How to do it" expandable section (shows exercise description)
- ✅ Restart Round option in pause overlay

### 1.6 Victory Screen ✅

- ✅ Victory screen component
  - ✅ "Quest Complete" celebration
  - ✅ Duration display
  - ✅ XP earned display
  - ✅ Confetti animation
  - ✅ Return home button
- ✅ Session saving on completion
- ✅ Progression chart (bar chart of past sessions)
- ✅ Post-workout feedback (Easy/Good/Hard buttons)
- ✅ Resource loot display (LootDisplay component)

### 1.7 Completed Sessions ✅

- ✅ Completed session schema
  - ✅ Quest reference
  - ✅ Performed at timestamp
  - ✅ Duration (excluding pauses)
  - ✅ User difficulty level
  - ✅ XP earned
- ✅ Completed exercises
  - ✅ Exercise reference
  - ✅ Round index
  - ✅ Result value (reps/seconds)
- ✅ Session saving
  - ✅ Save on completion
  - ✅ Calculate duration
  - ✅ Calculate XP
  - ✅ Link to adventure run step (if applicable)

### 1.8 XP System ✅

- ✅ XP calculation
  - ✅ Base XP from duration (~12 XP/min)
  - ✅ Difficulty multipliers (0.9x/1.0x/1.2x)
  - ✅ Clamping to sane range (0-5000)
- ✅ XP display on victory screen
- ✅ Level progression system (db/userLevel.ts with 50 levels)
- ✅ Level display in Journal (UserLevelCard with titles and progress bar)
- ✅ Level display on Home screen (LevelBadge next to StreakBadge)

### 1.9 Exercise Colors ✅

- ✅ Color mapping
  - ✅ Muscle to pastel color (arms→pink, back→blue, etc.)
  - ✅ Target type fallback colors
  - ✅ Mixed/default handling
- ✅ Color tokens in Tamagui
- ✅ Quest color determination (dominant muscle)
- ✅ Color application in quest cards

### 1.10 Localization ✅

- ✅ i18next setup
- ✅ English translations (`locales/en.json`)
- ✅ French translations (`locales/fr.json`)
- ✅ Language switching in settings
- ✅ Database content in both languages
- ✅ Notification messages localized (EN/FR)

### 1.11 Navigation ✅

- ✅ Expo Router setup
- ✅ Tab navigation (defined but tabs hidden)
- ✅ Stack navigation for details
- ✅ Session screen (modal)
- ✅ Onboarding flow
- ⚠️ Navigation via cards/buttons (no visible tab bar)

### 1.12 UI Foundation ✅

- ✅ Tamagui setup and configuration
- ✅ Custom theme with pastel colors
- ✅ Base components
  - ✅ Button (primary/secondary)
  - ✅ IconButton (circular)
  - ✅ Card (consistent styling)
  - ✅ Chip (interactive pills)
  - ✅ Tag (non-interactive labels)
- ✅ Home screen with quest carousel
- ✅ Settings menu (hamburger)
- ✅ Safe area handling
- ✅ Dark mode implemented (theme switching in settings)

### 1.13 Onboarding ✅

- ✅ Onboarding flow
  - ✅ Language selection screen
  - ✅ App presentation/intro
  - ✅ Avatar selection
  - ✅ Village name input
- ✅ Onboarding state persistence
- ✅ Skip to home if already onboarded

### 1.14 Journal/History ✅

- ✅ Journal screen (`/journal`)
  - ✅ Stats summary card
  - ✅ History list grouped by date
  - ✅ Session entry cards
- ✅ Session detail screen (`/journal/[id]`)
  - ✅ Exercise breakdown
  - ✅ Per-exercise results
  - ✅ Duration, XP display
- ✅ Weekly activity chart
- ✅ Streak display (days count)
- ✅ Monthly calendar view (MonthlyCalendarCard with navigation)
- ✅ Muscle balance chart (MuscleBalanceCard with progress bars)

### 1.15 Dev Tools ✅

- ✅ Dev screen (`/dev`) - DEV builds only
  - ✅ Reset database
  - ✅ View preferences
  - ✅ Debug info

---

## Phase 2: Village & Economy ✅ (100% Complete)

### 2.1 Resource System ✅

- ✅ Resource schema
  - ✅ Resource types (code, not separate table)
  - ✅ Resource inventory table
  - ✅ Transaction log table
- ✅ Resource types
  - ✅ Gold (universal currency)
  - ✅ Wood (from arms exercises)
  - ✅ Stone (from back exercises)
  - ✅ Fire Essence (from chest exercises)
  - ✅ Water (from abs exercises)
  - ✅ Wind Essence (from shoulder exercises)
  - ✅ Grain (from leg exercises)
- ✅ Earning resources (db/resources.ts)
  - ✅ Calculate from completed exercises
  - ✅ Muscle-to-resource mapping
  - ✅ Difficulty multipliers
  - ✅ Gold calculation from duration
- ✅ Resource UI
  - ✅ Resource display in header (ResourceHeader component)
  - ✅ Victory screen loot display (LootDisplay component)
  - ✅ Resource animations (staggered loot reveal in LootDisplay)

### 2.2 Village System �

- ✅ Building schema
  - ✅ Building types (19 types across 4 tiers)
  - ✅ Building levels (1-5)
  - ✅ Building XP (progress to next level)
  - ✅ Unlock conditions (tier-based, level requirements)
- ✅ Building types
  - ✅ Tier 1: Campfire, Tent, Training Dummy (starter, unlocked by default)
  - ✅ Tier 2: Archery Range, Quarry, Forge, Well, Windmill, Farm
  - ✅ Tier 3: Watchtower, Castle Wall, Armory, Fountain, Observatory, Barn
  - ✅ Tier 4: Dragon Lair, Hero's Hall, Wizard Tower, Phoenix Nest (legendary)
- ✅ Building queries (db/buildings.ts)
  - ✅ getAllBuildings, getUnlockedBuildings
  - ✅ getBuildingByType, getVillageStats
  - ✅ addBuildingXp with level-up detection
  - ✅ unlockBuilding, processSessionBuildings
  - ✅ Tier unlock condition checks
- ✅ Building tests (10 passing)
- ✅ Auto-building integration
  - ✅ Wire processSessionBuildings to session completion
  - ✅ Trigger building XP on workout finish
  - ✅ Include building results in saveSession return
- ⚠️ Village view
  - ✅ Building list by tier
  - ✅ Building progress bars (XP to next level)
  - ✅ Locked/unlocked state display
  - ✅ Village stats summary card
  - ✅ Village card on Home screen
- ✅ Village interactions
  - ✅ Tap building for details (modal with level, XP progress, tier)
  - ✅ Upgrade preview
  - ✅ Building unlock animations (ConstructionAnimation in VictoryView)

### 2.3 Flame/Streak System ✅

- ✅ Streak calculation (from completed sessions)
  - ✅ StreakBadge component on Home screen
  - ✅ Current streak counting (consecutive days)
  - ✅ Best streak tracking
  - ✅ Active/inactive streak detection
- ✅ Streak milestones
  - ✅ 3 days: Spark ⚡
  - ✅ 7 days: Ember ✨
  - ✅ 14 days: Blaze 🔥
  - ✅ 30 days: Inferno 🔥
  - ✅ 100 days: Eternal 🌟
  - ✅ Localized milestone names (EN/FR)
  - ✅ Flame color by milestone tier
- ✅ Streak schema (optimization)
  - ✅ Persisted streak count (db/streaks.ts with cache in userPreferences)
  - ✅ Last workout date cache
  - ✅ updateStreakAfterSession called in saveSession
- ✅ Flame visual
  - ✅ FlameFlicker component in VillageScreen
  - ✅ Animated flame with pulsing/scaling effects
- ✅ Streak warnings
  - ✅ "Don't lose your flame" reminder (via smart notifications at 8 PM)

### 2.4 Boss HP System ✅

- ✅ Boss kind label/badge (implemented)
- ✅ Boss fight schema (db/bossFights.ts)
  - ✅ Total HP
  - ✅ Current HP
  - ✅ Weakness muscle
  - ✅ Resistance muscle
- ✅ Damage calculation
  - ✅ Base damage from reps/time
  - ✅ Weakness bonus (1.5x)
  - ✅ Resistance penalty (0.5x)
  - ✅ Critical hits (exceed target = 30% chance, 2x damage)
- ✅ Boss fight log
  - ✅ Damage per session
  - ✅ Critical hit tracking
- ✅ Boss UI updates
  - ✅ HP bar display (BossHpBar component)
  - ✅ Damage result in session store
  - ✅ Damage numbers during session (damage popup with crit/weakness indicators)
  - ✅ Enraged state visual (animated when HP < 25%)
  - ✅ Defeat animation
    - ✅ Enhanced confetti (triple cannon burst from top + sides)
    - ✅ Boss defeat title with subtitle ("The beast has fallen!")
    - ✅ Unique icon (⚔️ vs 🏆)
  - ✅ Boss tokens reward
- ✅ Multi-Phase Boss Images
  - ✅ Boss phase system (4 phases at 100%, 75%, 50%, 25%)
  - ✅ BossPhaseImage component with emoji placeholders
  - ✅ Dynamic boss visual based on HP
  - ✅ Transition animation between phases (scale + rotate)
  - ✅ Enraged final phase visual (pulsing, red border)
  - ✅ Phase indicator dots

---

## Phase 3: Coach & Planning ✅ (100% Complete)

### 3.1 Goal Setting ✅

- ✅ Goal schema
  - ✅ Goal type (strength/endurance/flexibility/balanced)
  - ✅ Days per week
  - ✅ Session duration preference
  - ✅ Start date
  - ✅ Goal status (active/paused/completed/abandoned)
- ✅ Goal progress tracking
  - ✅ Weekly progress table (ISO week keys)
  - ✅ Sessions completed per week
  - ✅ Total minutes and XP per week
- ✅ Goal UI
  - ✅ Goal card on Home screen
  - ✅ Goal setting screen (`/goals`)
  - ✅ Goal type selection with emojis
  - ✅ Days per week picker
  - ✅ Duration preference picker
  - ✅ Weekly progress display with progress bar
  - ✅ Progress history visualization
  - ✅ Goal actions (pause, complete, edit)
- ✅ Goal integration
  - ✅ recordSessionForGoal on session completion
  - ✅ Automatic progress updates

### 3.2 Auto-Generated Plans ✅

- ✅ Plan generation algorithm
  - ✅ Analyze goal type (basic implementation)
  - ✅ Check workout history for weak areas (smart quest selection)
  - ✅ Select appropriate quests (random for now)
  - ✅ Create adventure structure (using scheduled sessions)
- ✅ Plan schema
  - ✅ Link to generated adventure (via scheduledSessions)
  - ✅ Schedule (days/times)
  - ✅ Status tracking
- ✅ Plan UI
  - ✅ "Generate My Plan" button (automatic on goal creation)
  - ✅ Plan preview before confirming
  - ✅ Active plan display (in Schedule)

### 3.3 Scheduling ✅

- ✅ Scheduled session schema
  - ✅ Plan reference
  - ✅ Quest reference
  - ✅ Scheduled date
  - ✅ Reminder time
  - ✅ Status (pending/completed/missed)
- ✅ Weekly view
  - ✅ Calendar display
  - ✅ Scheduled sessions
  - ✅ Completion indicators
- ✅ Schedule management
  - ✅ Reschedule session (move +1 day)
  - ✅ Skip session
  - ✅ Add scheduled session (AddScheduleSheet component)
  - ✅ Quest picker for scheduling

### 3.4 Notifications ✅

- ✅ Notification types
  - ✅ Daily reminder
  - ✅ Streak warning (before midnight - 8 PM trigger)
  - ✅ Encouragement (after 3 days inactivity)
  - ✅ Achievement unlocked (immediate notification on unlock)
  - ✅ Boss ready (notification when on final step of boss adventure)
- ✅ Notification preferences
  - ✅ Enable/disable per type (global toggle for now)
  - ✅ Custom reminder time
- ✅ Local notifications
  - ✅ expo-notifications setup
  - ✅ Schedule notifications
  - ✅ Cancel on completion (via cancelAllNotifications)
- ✅ Smart notification scheduling
  - ✅ NotificationManager component (auto-reschedules on app open/resume)
  - ✅ scheduleSmartNotifications function
  - ✅ Streak rescue logic (isYesterday/isSameDay checks)
  - ✅ Refresh notifications after workout completion (VictoryView integration)

### 3.5 Smart Recommendations ✅

- ✅ Difficulty suggestion (auto-suggests based on history)
- ✅ Weak area detection
  - ✅ Analyze muscle balance (getMuscleBalance)
  - ✅ Calculate percentages per muscle group
  - ✅ Time period filtering (7d, 30d, 90d, all)
  - ✅ getSuggestedFocusAreas() for focus recommendations
  - ✅ getBalanceRecommendation() for status and message
  - ✅ getSuggestedQuestsForWeakAreas() for quest recommendations
  - ✅ SuggestedQuestsCard UI component in Journal
  - ✅ CoachSuggestionCard on Home screen (shows weak areas + suggested quests)
- ✅ Rest suggestions
  - ✅ Detect overtraining patterns (5+ consecutive days, 6+ sessions/week)
  - ✅ RestSuggestionCard component in Journal
  - ✅ Rest suggestion card on Schedule screen
  - ✅ Localized messages (EN/FR)
- ✅ Difficulty progression
  - ✅ Track completion rates (via feedback analysis)
  - ✅ Suggest difficulty changes (DifficultyProgressionCard)

---

## Phase 4: Statistics & Progress ✅ (100% Complete)

### 4.1 Stats Dashboard ✅

- ✅ Stats summary card on journal
- ✅ Weekly activity chart
- ✅ Streak display (calculated, not persisted)
- ✅ Full stats dashboard screen (Journal Stats tab)
- ✅ Total sessions counter (in JournalStats)
- ✅ Total time trained (in JournalStats)
- ✅ Total XP earned (UserLevelCard)
- ✅ Current level display (UserLevelCard with level titles)

### 4.2 Weekly/Monthly Views ✅

- ✅ Weekly activity chart (bar chart)
- ✅ Monthly calendar view
  - ✅ Workout markers (green circles)
  - ✅ Streak visualization (darker green for consecutive days)
  - ✅ Month navigation (prev/next)
  - ✅ MonthlyCalendarCard component
- ✅ Historical data
  - ✅ Previous weeks/months trends (TrendsCard with getWeeklyTrends/getMonthlyTrends)
  - ✅ Trend analysis (analyzeTrend, getTrendSummary)

### 4.3 Muscle Balance ✅

- ✅ Balance calculation (db/muscleBalance.ts)
  - ✅ Track volume per muscle
  - ✅ Calculate percentages
  - ✅ Time period filtering (7d, 30d, 90d, all)
- ✅ Balance visualization
  - ✅ MuscleBalanceCard component with progress bars
  - ✅ Weak area highlighting in $primary color
  - ✅ Status indicator (Balanced/Needs Work)
  - ✅ Radar chart option (MuscleBalanceRadar component)
- ✅ Balance tips
  - ✅ getSuggestedQuestsForWeakAreas() function
  - ✅ SuggestedQuestsCard component with quest recommendations
  - ✅ Muscle chips showing which weak areas each quest targets

### 4.4 Personal Records ✅

- ✅ Record types
  - ✅ Longest session
  - ✅ Most XP in session
  - ✅ Highest streak (added to PersonalRecordsCard)
  - ✅ Per-exercise PRs (max reps, longest hold)
- ✅ Record tracking
  - ✅ checkForNewRecords() to detect PRs on completion
  - ✅ getPersonalRecordsSummary() for overview
- ✅ Record celebration
  - ✅ NewRecordsBadge on victory screen with pulse animation
  - ✅ PR displayed before navigation
  - ✅ PR badge in history (SessionCard with star badge)
- ✅ Record display
  - ✅ PersonalRecordsCard in Journal Stats tab

### 4.5 Workout History ✅

- ✅ History list
  - ✅ Grouped by date
  - ✅ Session cards with summary
- ✅ Session detail view
  - ✅ Full exercise breakdown
  - ✅ Per-exercise results
  - ✅ Duration, XP, difficulty

### 4.6 Achievements ✅

- ✅ Achievement types
  - ✅ Session milestones (1, 10, 25, 50, 100, 250, 500 sessions)
  - ✅ Streak milestones (3, 7, 14, 30, 60, 100 days)
  - ✅ XP milestones (100, 500, 1000, 5000, 10000 XP)
  - ✅ Special achievements (long sessions, early bird, night owl, variety)
- ✅ Achievement schema
  - ✅ Achievement definitions (db/achievements.ts)
  - ✅ Unlocked achievements stored in userPreferences
  - ✅ 10 tests passing
- ✅ Achievement UI
  - ✅ AchievementsCard in Journal Stats
  - ✅ Category filters (all, sessions, streaks, xp, special)
  - ✅ Progress indicators for locked achievements
  - ✅ Unlock detection on session completion

---

## Phase 5: Polish & Quality ✅ (100% Complete)

### 5.1 Animations ✅

- ✅ Victory confetti animation
- ✅ Countdown animation (3-2-1)
- ✅ Session animations
  - ✅ Rep counter bump (scale animation on adjustment)
  - ✅ Exercise transition (fade in with quick animation)
  - ✅ Rest view entrance animation
  - ✅ Up next card slide-in animation
- ✅ Village animations
  - ✅ Flame flickering (FlameFlicker component in VillageScreen)
  - ✅ Level up sparkle (LevelUpSparkle component created)
  - ✅ Construction animation (ConstructionAnimation component created)
  - ✅ Building unlock animation integration
- ✅ Micro-interactions
  - ✅ Button press feedback (scale 0.98 + opacity)
  - ✅ Card hover/press (scale 0.99 + opacity)
  - ✅ Loading states (skeleton cards in QuestCarousel, VillageScreen)

### 5.3 Performance ✅

- ⏭️ Image optimization (N/A - using emoji placeholders, no real images yet)
  - ⏭️ WebP format conversion
  - ⏭️ Lazy loading
  - ⏭️ Caching strategy
- ✅ Database optimization
  - ⏭️ Query profiling (no issues observed)
  - ✅ Index optimization (20+ indexes on all key columns in schema.ts)
  - ✅ Batch operations (transactions used throughout)
- ✅ React optimization
  - ✅ Memoization audit (useMemo/useCallback/memo used appropriately)
  - ✅ List virtualization (LegendList for quests/adventures)
  - ⏭️ Bundle size analysis (premature - no size issues observed)
- ✅ Load time
  - ✅ Cold start optimization (lazy DB init, splash screen)
  - ✅ Splash screen handling (SplashScreen component with progress)

### 5.4 Accessibility ⚠️

- ⚠️ Screen reader support
  - ✅ Session buttons (Done, Pause, Skip Rest)
  - ✅ Rep adjustment buttons
  - ✅ Feedback buttons (Easy, Good, Hard)
  - ✅ Pause overlay buttons (Resume, Restart, Quit)
  - ✅ Card components (auto accessibilityRole="button" when pressable)
- ✅ Motor accessibility
  - ✅ Large touch targets (44pt+)
  - ✅ Reduced motion option (useReducedMotion hook + settings toggle)

### 5.5 Error Handling ✅

- ✅ Database errors
  - ✅ Error boundary in root layout
  - ✅ InlineError component for smaller sections
- ✅ Session recovery
  - ✅ State persistence (auto-save on state changes)
  - ✅ Crash recovery (useSessionRecovery hook)
  - ✅ SessionRecoveryBanner on Home screen
- ✅ User feedback
  - ✅ Toast system (ToastProvider + useToast hook)
  - ✅ Error messages (localized EN/FR)
  - ✅ Error boundary with retry button

### 5.6 Dark Theme ✅

- ✅ Theme system exists (tamagui.config.ts)
- ✅ Dark mode colors
  - ✅ Background colors (#121212, #1E1E1E, #252525)
  - ✅ Surface colors (cardBackground)
  - ✅ Text colors (#E0E0E0)
  - ✅ Dark pastel variants
- ✅ Theme switching
  - ✅ Settings toggle (HomeSettingsMenu)
  - ✅ System preference support

---

### 6.6 Adventure Polish & Engagement ✅

- ✅ UI Audit
  - ✅ Consistency pass (borders: 3px for cards, 2px for small elements; rounded: $6 for cards)
  - ✅ Button style audit (all use AppButton with 3px borders)
  - ✅ Card style audit (consistent border-radius, use Card component defaults)
  - ✅ Empty state component (EmptyState with emoji, title, subtitle)
  - ✅ Loading state skeletons (QuestCarousel, VillageScreen)
  - ✅ Error state designs (InlineError with emoji and consistent styling)
- 🚧 RPG/Game-like Enhancements
  - ✅ Adventure intro cutscene (NarrativeModal implemented)
  - ✅ Quest narrative before/after workout (Intro/Outro narratives)
  - ✅ Boss taunt messages during fight (BossTauntOverlay implemented)
  - 📋 Victory celebration animations (Confetti done, need more?)
  - ✅ Loot chest opening animation
  - ✅ Level up fanfare
- 📋 Engagement Features
  - ✅ Daily quest rotation
  - ✅ Weekly challenges
  - ✅ Achievement badges display
  - ✅ Share workout summary

---

## Technical Debt & Improvements ✅

### Code Quality ✅

- ✅ Test coverage
  - ✅ Database tests (28 test suites, 155+ tests)
  - ✅ Store tests (session store with mocks)
  - ⏭️ Component tests (not needed - simple UI, tested via E2E if ever added)
  - ⏭️ E2E tests (future - when preparing for release)
- ✅ Type safety
  - ✅ TypeScript strict mode
  - ✅ No lint errors (Biome check passes)
- ✅ Code organization
  - ✅ Feature-based structure (db/, stores/, components/, hooks/)
  - ✅ Shared utilities (constants/, locales/, hooks/)

### Documentation ✅

- ✅ VISION.md
- ✅ FEATURES.md
- ✅ QUESTS.md
- ✅ ADVENTURES.md
- ✅ BOSS.md
- ✅ SESSION.md
- ✅ VILLAGE.md
- ✅ RESOURCES.md
- ✅ COACH.md
- ✅ STATISTICS.md
- ✅ UI_GUIDE.md
- ✅ EXERCISE_COLORS.md
- ✅ ARCHITECTURE.md
- ✅ FUTURE.md
- ✅ ROADMAP.md
- ✅ API documentation (API.md - complete database API reference)

---

## Known Issues & Gaps ⚠️

### UI Inconsistencies

- ⚠️ Tab bar defined but hidden (navigation via cards only)
- ✅ Hardcoded UI strings localized (common.xp, common.crit, etc.)
- ⚠️ Exercise images are emoji placeholders
  - Replace per: assets/placeholder.jpg
- ✅ Dark mode implemented and working

### Missing from Session (vs docs)

- ✅ Rep adjustment during exercise (implemented with +/- buttons)
- ✅ "How to do it" expandable section
- ✅ Restart Round in pause menu
- ✅ Post-workout difficulty feedback
- ✅ Haptics during session

### Missing from Boss (vs docs)

- ✅ HP mechanics (BossHpBar component)
- ✅ Damage system (dealDamage with weakness/resistance)
- ✅ Critical hits and enraged state
- ✅ Boss-specific rewards (XP bonus already in place)
- ✅ Boss tokens (awarded 1 per 100 HP on defeat, stored in resource_inventory)

---

## 🔄 Quality & Workflow Checkpoints

> Insert this checklist after completing each major phase (2, 3, 4, 5).

### Quality Checkpoint Template

After each major feature phase, complete these steps before moving on:

#### UI Polish 🎨

- [ ] Consistency check (colors, spacing, borders)
- [ ] Fun & sport focus (rewards visible, minimal distraction)
- [ ] Minimalist (remove unnecessary UI elements)
- [ ] RPG layer (visual progression, collection, village reflects user)
- [ ] Image-first (less text, more visuals)
- [ ] Subtle animations (performance-friendly)

#### Code Quality 🧹

- [ ] Factorize (extract reusable logic)
- [ ] Simplify (remove dead code, reduce complexity)
- [ ] Readable (clear naming, comments where needed)
- [ ] Efficient (no unnecessary re-renders, optimized queries)

#### Linting ✅

- [ ] Run `npm run check` (Biome + TypeScript)
- [ ] Fix all lint errors and warnings
- [ ] Run `npm run format` for consistency

#### Testing 🧪

- [ ] Write/update unit tests for new DB functions
- [ ] Write component tests for critical UI
- [ ] Run `npm test` — all tests pass
- [ ] Check coverage for new code

#### Commit & Push 📤

- [ ] Commit with conventional message (feat/fix/refactor/docs)
- [ ] Push to feature branch
- [ ] Create PR with description

---

### Checkpoint: After Phase 2 (Village & Economy)

- 📋 UI: Village view looks polished, rewards feel satisfying
- 📋 Code: Resource calculations are simple and tested
- 📋 Lint/Test/Commit

### Checkpoint: After Phase 3 (Coach & Planning)

- 📋 UI: Goal setting is guided, not overwhelming
- 📋 Code: Plan generation logic is clean
- 📋 Lint/Test/Commit

### Checkpoint: After Phase 4 (Statistics & Progress)

- 📋 UI: Charts are clear, PRs feel rewarding
- 📋 Code: Stat calculations are optimized
- 📋 Lint/Test/Commit

### Checkpoint: After Phase 5 (Polish & Quality)

- 📋 UI: Animations smooth, haptics satisfying
- 📋 Code: Performance optimized
- 📋 Lint/Test/Commit

---

## Summary

| Phase | Status | Completion |
| ----- | ------ | ---------- |
| Phase 1: Core Loop | ✅ Done | 100% |
| Phase 2: Village & Economy | ✅ Done | ~85% |
| ↳ Quality Checkpoint | ✅ | - |
| Phase 3: Coach & Planning | ✅ Done | 100% |
| ↳ Quality Checkpoint | ✅ | - |
| Phase 4: Statistics | ✅ Done | 100% |
| ↳ Quality Checkpoint | ✅ | - |
| Phase 5: Polish | ✅ Done | 100% |
| ↳ Quality Checkpoint | ✅ | - |
| Phase 7: Release & Distribution | 📋 Planned | 0% |

**Current Focus:** Phase 2 Village & Economy - Remaining items are visual enhancements (flame animations, building unlock animations, resource animations).

---

## Phase 7: Release & Distribution 📋

### 7.1 Build Optimization 📋

- 📋 Bundle size analysis
  - 📋 Tree shaking audit
  - 📋 Unused dependency removal
  - 📋 Code splitting
- 📋 Asset optimization
  - 📋 Image compression (WebP/AVIF)
  - 📋 Font subsetting
  - 📋 Splash screen optimization
- 📋 Performance profiling
  - 📋 Startup time optimization
  - 📋 Memory usage audit
  - 📋 Animation frame rate check

### 7.2 Android Build 📋

- 📋 EAS Build setup
  - 📋 eas.json configuration
  - 📋 Development build profile
  - 📋 Preview build profile
  - 📋 Production build profile
- 📋 Android-specific
  - 📋 App signing (keystore)
  - 📋 ProGuard/R8 optimization
  - 📋 Adaptive icons
  - 📋 Android 12+ splash screen

### 7.3 iOS Build 📋

- 📋 EAS Build setup
  - 📋 Apple Developer account
  - 📋 Provisioning profiles
  - 📋 Certificates management
- 📋 iOS-specific
  - 📋 App icons (all sizes)
  - 📋 Launch screen
  - 📋 Permissions descriptions (NSCameraUsageDescription, etc.)
  - 📋 iOS 15+ compatibility

---

## Workflow Reminders

### Before Every Commit

```bash
npm run check     # Biome lint + TypeScript
npm test          # All tests pass
npm run format    # Auto-format
```

### Commit Convention

- `feat:` New feature
- `fix:` Bug fix
- `refactor:` Code improvement (no behavior change)
- `docs:` Documentation only
- `test:` Adding/fixing tests
- `chore:` Build, config, dependencies
