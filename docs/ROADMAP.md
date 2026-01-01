# Bati - Complete Roadmap & TODO

This document tracks all features, their implementation status, and future plans.

**Last Audit:** January 1, 2026

**Legend:**

- ✅ Done
- 🚧 In Progress
- 📋 Planned
- 💡 Idea (not confirmed)
- ⚠️ Partial (started but incomplete)

---

## Phase 1: Core Loop ✅ (95% Complete)

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
- ⚠️ Some hardcoded strings (countdown "Let's go!", etc.)

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

## Phase 2: Village & Economy 🚧 (85% Complete)

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
- ⚠️ Resource UI
  - ✅ Resource display in header (ResourceHeader component)
  - ✅ Victory screen loot display (LootDisplay component)
  - 📋 Resource animations

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
  - 📋 Isometric/2.5D layout (future enhancement)
  - 📋 Day/night cycle (optional)
- ⚠️ Village interactions
  - ✅ Tap building for details (modal with level, XP progress, tier)
  - 📋 Upgrade preview
  - 📋 Building unlock animations

### 2.3 Flame/Streak System ⚠️

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
- 📋 Flame visual
  - 📋 Flame in village center
  - 📋 Flame animations
- 📋 Streak warnings
  - 📋 "Don't lose your flame" reminder

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
  - 📋 Defeat animation
  - 📋 Boss tokens reward
- 📋 Multi-Phase Boss Images
  - 📋 Boss image schema (array of phase images)
  - 📋 Phase thresholds (100%, 75%, 50%, 25%)
  - 📋 Dynamic boss image based on HP
  - 📋 Transition animation between phases
  - 📋 Enraged final phase visual

---

## Phase 3: Coach & Planning 🚧 (55% Complete)

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
  - 📋 Check workout history for weak areas
  - ✅ Select appropriate quests (random for now)
  - ✅ Create adventure structure (using scheduled sessions)
- ✅ Plan schema
  - ✅ Link to generated adventure (via scheduledSessions)
  - ✅ Schedule (days/times)
  - ✅ Status tracking
- ✅ Plan UI
  - ✅ "Generate My Plan" button (automatic on goal creation)
  - 📋 Plan preview before confirming
  - ✅ Active plan display (in Schedule)

### 3.3 Scheduling �

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
- ⚠️ Schedule management
  - 📋 Reschedule session
  - ✅ Skip session

### 3.4 Notifications 📋

- 📋 Notification types
  - 📋 Daily reminder
  - 📋 Streak warning (before midnight)
  - 📋 Encouragement (after inactivity)
  - 📋 Achievement unlocked
  - 📋 Boss ready
- 📋 Notification preferences
  - 📋 Enable/disable per type
  - 📋 Custom reminder time
- 📋 Local notifications
  - 📋 expo-notifications setup
  - 📋 Schedule notifications
  - 📋 Cancel on completion

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
- ✅ Rest suggestions
  - ✅ Detect overtraining patterns (5+ consecutive days, 6+ sessions/week)
  - ✅ RestSuggestionCard component in Journal
  - ✅ Localized messages (EN/FR)
- 📋 Difficulty progression
  - 📋 Track completion rates
  - 📋 Suggest difficulty changes

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
- 📋 Historical data
  - 📋 Previous weeks/months trends
  - 📋 Trend analysis

### 4.3 Muscle Balance ✅

- ✅ Balance calculation (db/muscleBalance.ts)
  - ✅ Track volume per muscle
  - ✅ Calculate percentages
  - ✅ Time period filtering (7d, 30d, 90d, all)
- ✅ Balance visualization
  - ✅ MuscleBalanceCard component with progress bars
  - ✅ Weak area highlighting in $primary color
  - ✅ Status indicator (Balanced/Needs Work)
  - 📋 Radar chart option
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

## Phase 5: Polish & Quality ✅ (90% Complete)

### 5.1 Animations ⚠️

- ✅ Victory confetti animation
- ✅ Countdown animation (3-2-1)
- ✅ Session animations
  - ✅ Rep counter bump (scale animation on adjustment)
  - ✅ Exercise transition (fade in with quick animation)
  - ✅ Rest view entrance animation
  - ✅ Up next card slide-in animation
- 📋 Village animations
  - ✅ Flame flickering (FlameFlicker component in VillageScreen)
  - ✅ Level up sparkle (LevelUpSparkle component created)
  - ✅ Construction animation (ConstructionAnimation component created)
  - 📋 Building unlock animation integration
- ✅ Micro-interactions
  - ✅ Button press feedback (scale 0.98 + opacity)
  - ✅ Card hover/press (scale 0.99 + opacity)
  - 📋 Loading states

### 5.2 Sound & Haptics ⚠️

- ✅ Haptic feedback (onboarding + session)
- 📋 Sound effects
  - 📋 Session start (battle horn)
  - 📋 Exercise complete (sword swing)
  - 📋 Rest start (campfire)
  - 📋 Timer warning (tick-tock)
  - 📋 Victory fanfare
  - 📋 Level up chime
- ✅ Haptic feedback during session
  - ✅ Heavy impact on "Done"
  - ✅ Light tick on countdown
  - ✅ Success pattern on complete
- ⚠️ Audio preferences
  - 📋 Sound enable/disable
  - ✅ Haptic enable/disable (useHaptics hook + settings toggle)

### 5.3 Performance 📋

- 📋 Image optimization
  - 📋 WebP format conversion
  - 📋 Lazy loading
  - 📋 Caching strategy
- 📋 Database optimization
  - 📋 Query profiling
  - 📋 Index optimization
  - 📋 Batch operations
- 📋 React optimization
  - 📋 Memoization audit
  - 📋 List virtualization
  - 📋 Bundle size analysis
- 📋 Load time
  - 📋 Cold start optimization
  - 📋 Splash screen handling

### 5.4 Accessibility ⚠️

- ⚠️ Screen reader support
  - ✅ Session buttons (Done, Pause, Skip Rest)
  - ✅ Rep adjustment buttons
  - ✅ Feedback buttons (Easy, Good, Hard)
  - ✅ Pause overlay buttons (Resume, Restart, Quit)
  - ✅ Card components (auto accessibilityRole="button" when pressable)
  - 📋 VoiceOver full audit
  - 📋 TalkBack support
- 📋 Visual accessibility
  - 📋 Dynamic type support
  - 📋 High contrast mode
  - 📋 Colorblind modes
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

### 6.6 Adventure Polish & Engagement 📋

- 📋 UI Audit
  - 📋 Consistency pass (colors, spacing, typography)
  - 📋 Button style audit (all use AppButton with 3px borders)
  - 📋 Card style audit (consistent border-radius, shadows)
  - 📋 Empty state illustrations
  - 📋 Loading state skeletons
  - 📋 Error state designs
- 📋 RPG/Game-like Enhancements
  - 📋 Adventure intro cutscene (story text with background)
  - 📋 Quest narrative before/after workout
  - 📋 Boss taunt messages during fight
  - 📋 Victory celebration animations
  - 📋 Loot chest opening animation
  - 📋 Level up fanfare
- 📋 Engagement Features
  - 📋 Daily quest rotation
  - 📋 Weekly challenges
  - 📋 Achievement badges display
  - 📋 Leaderboard (optional, offline-friendly)
  - 📋 Share workout summary

### 6.7 Advanced RPG 💡

- 💡 Seasons & events
  - 💡 Limited-time content
  - 💡 Seasonal rewards
- 💡 Cosmetics
  - 💡 Avatar customization
  - 💡 Village themes
  - 💡 Flame colors
- 💡 Equipment system
  - 💡 Collect gear
  - 💡 Buff effects

---

## Technical Debt & Improvements 📋

### Code Quality 📋

- 📋 Test coverage
  - ✅ Database tests (20+ test suites, 96+ tests)
  - 📋 Component tests
  - 📋 E2E tests
    - 📋 Detox or Maestro setup
    - 📋 Onboarding flow test
    - 📋 Complete workout session test
    - 📋 Quest browsing and selection test
    - 📋 Adventure progression test
    - 📋 Boss fight completion test
    - 📋 Settings and language switch test
- 📋 Type safety
  - ✅ TypeScript strict mode
  - 📋 Zod schema validation
- 📋 Code organization
  - 📋 Feature-based structure
  - 📋 Shared utilities

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
- 📋 API documentation
- 📋 Component storybook

### DevOps 📋

- 📋 CI/CD pipeline
  - 📋 Automated tests
  - 📋 Build automation
  - 📋 Release management
- 📋 Monitoring
  - 📋 Crash reporting
  - 📋 Performance monitoring
  - 📋 Analytics (privacy-respecting)

---

## Known Issues & Gaps ⚠️

### UI Inconsistencies

- ⚠️ Tab bar defined but hidden (navigation via cards only)
- ⚠️ Some hardcoded strings not localized
- ⚠️ Exercise images are emoji placeholders
- ✅ Dark mode implemented and working

### Missing from Session (vs docs)

- ✅ Rep adjustment during exercise (implemented with +/- buttons)
- ✅ "How to do it" expandable section
- ✅ Restart Round in pause menu
- ✅ Post-workout difficulty feedback
- ✅ Haptics during session
- 📋 Sound effects

### Missing from Boss (vs docs)

- ✅ HP mechanics (BossHpBar component)
- ✅ Damage system (dealDamage with weakness/resistance)
- ✅ Critical hits and enraged state
- 📋 Boss-specific rewards
- 📋 Boss tokens

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
| Phase 1: Core Loop | ✅ Done | ~100% |
| Phase 2: Village & Economy | ✅ Done | ~90% |
| ↳ Quality Checkpoint | ✅ | - |
| Phase 3: Coach & Planning | ⚠️ Partial | ~45% |
| ↳ Quality Checkpoint | 📋 | - |
| Phase 4: Statistics | ✅ Done | ~100% |
| ↳ Quality Checkpoint | ✅ | - |
| Phase 5: Polish | ✅ Done | ~95% |
| ↳ Quality Checkpoint | ✅ | - |
| Phase 6: Future | 💡 Ideas | 0% |
| Phase 7: Release & Distribution | 📋 Planned | 0% |

**Current Focus:** Phase 3 Coach & Planning - Implement scheduling, notifications, and auto-generated plans to complete the app's guidance features.

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
- 📋 Play Store preparation
  - 📋 App listing assets
  - 📋 Privacy policy
  - 📋 Content rating
  - 📋 Internal testing track
  - 📋 Closed beta
  - 📋 Production release

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
- 📋 App Store preparation
  - 📋 App Store Connect setup
  - 📋 Screenshots (all device sizes)
  - 📋 App preview videos
  - 📋 App description and keywords
  - 📋 TestFlight beta
  - 📋 App Review submission

### 7.4 OTA Updates 📋

- 📋 EAS Update setup
  - 📋 Update channels (development, preview, production)
  - 📋 Rollback strategy
- 📋 Update policies
  - 📋 Critical updates (force update)
  - 📋 Optional updates (prompt)
  - 📋 Silent updates (background)

### 7.5 Release Management 📋

- 📋 Version management
  - 📋 Semantic versioning
  - 📋 Changelog generation
  - 📋 Release notes
- 📋 CI/CD pipeline
  - 📋 GitHub Actions for builds
  - 📋 Automated testing before build
  - 📋 Automated store submission

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
