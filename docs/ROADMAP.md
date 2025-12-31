# Bati - Complete Roadmap & TODO

This document tracks all features, their implementation status, and future plans.

**Legend:**

- ✅ Done
- 🚧 In Progress
- 📋 Planned
- 💡 Idea (not confirmed)

---

## Phase 1: Core Loop ✅

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

### 1.2 Exercises System ✅

- ✅ Exercise schema
  - ✅ Localized names (EN/FR)
  - ✅ Localized descriptions
  - ✅ Difficulty levels (easy/medium/hard)
  - ✅ Equipment requirements
  - ✅ Image/animation paths
  - ✅ Seconds per rep (for duration estimation)
  - ✅ Creator field (Admin/user)
- ✅ Exercise-Muscle relationships
  - ✅ Many-to-many junction table
  - ✅ Muscle codes (arms, back, shoulder, chest, abs, calf)
- ✅ Exercise queries
  - ✅ Get all exercises
  - ✅ Get by muscle filter
  - ✅ Get by equipment filter

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
  - ✅ Quest cards
  - ✅ Quest detail screen
  - ✅ Quest carousel on home

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

### 1.5 Session Flow ✅

- ✅ Session state (Zustand store)
  - ✅ Quest reference
  - ✅ Status (idle/running/resting/paused/finished)
  - ✅ Current round/exercise tracking
  - ✅ Timer timestamps
  - ✅ Pause time accumulator
- ✅ Session actions
  - ✅ Start session
  - ✅ Pause/resume
  - ✅ Complete exercise
  - ✅ Skip rest
  - ✅ Add rest time
  - ✅ Quit session
- ✅ Session timer hook
  - ✅ Accurate timer (timestamp-based)
  - ✅ Background handling
- ✅ Session UI
  - ✅ Exercise display screen
  - ✅ Rest screen
  - ✅ Pause overlay
  - ✅ Progress bar

### 1.6 Completed Sessions ✅

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

### 1.7 XP System ✅

- ✅ XP calculation
  - ✅ Base XP from duration
  - ✅ Difficulty multipliers
  - ✅ Clamping to sane range
- ✅ XP display on victory

### 1.8 Exercise Colors ✅

- ✅ Color mapping
  - ✅ Muscle to pastel color
  - ✅ Target type fallback colors
  - ✅ Mixed/default handling
- ✅ Color tokens in Tamagui
- ✅ Quest color determination
- ✅ Color application in UI

### 1.9 Localization ✅

- ✅ i18next setup
- ✅ English translations
- ✅ French translations
- ✅ Language switching
- ✅ Database content in both languages

### 1.10 Navigation ✅

- ✅ Expo Router setup
- ✅ Tab navigation
- ✅ Stack navigation for details
- ✅ Session screen

### 1.11 UI Foundation ✅

- ✅ Tamagui setup
- ✅ Theme configuration
- ✅ Base components
- ✅ Home screen
- ✅ Settings menu

---

## Phase 2: Village & Economy 🚧

### 2.1 Resource System 📋

- 📋 Resource schema
  - 📋 Resource types table
  - 📋 Resource inventory table
  - 📋 Transaction log table
- 📋 Resource types
  - 📋 Gold (universal currency)
  - 📋 Wood (from arms exercises)
  - 📋 Stone (from back exercises)
  - 📋 Fire Essence (from chest exercises)
  - 📋 Water (from abs exercises)
  - 📋 Wind Essence (from shoulder exercises)
  - 📋 Grain (from leg exercises)
- 📋 Earning resources
  - 📋 Calculate from completed exercises
  - 📋 Muscle-to-resource mapping
  - 📋 Difficulty multipliers
  - 📋 Gold calculation from duration
- 📋 Resource UI
  - 📋 Resource display in header
  - 📋 Victory screen loot display
  - 📋 Resource animations

### 2.2 Village System 📋

- 📋 Building schema
  - 📋 Building types
  - 📋 Building levels (1-5)
  - 📋 Building XP (progress to next level)
  - 📋 Unlock conditions
- 📋 Building types
  - 📋 Tier 1: Campfire, Tent, Training Dummy (starter)
  - 📋 Tier 2: Archery Range, Quarry, Forge, Well, Windmill, Farm
  - 📋 Tier 3: Watchtower, Castle Wall, Armory, Fountain, Observatory, Barn
  - 📋 Tier 4: Dragon Lair, Hero's Hall, Wizard Tower (legendary)
- 📋 Auto-building logic
  - 📋 Track exercise history by muscle
  - 📋 Automatic unlock when thresholds met
  - 📋 Building XP accumulation
  - 📋 Level-up detection
- 📋 Village view
  - 📋 Isometric/2.5D layout
  - 📋 Building placement
  - 📋 Building state visuals (locked/active/upgrading)
  - 📋 Day/night cycle (optional)
- 📋 Village interactions
  - 📋 Tap building for details
  - 📋 Upgrade preview
  - 📋 Building unlock animations

### 2.3 Flame/Streak System 📋

- 📋 Streak schema
  - 📋 Current streak count
  - 📋 Best streak record
  - 📋 Last workout date
- 📋 Streak logic
  - 📋 Increment on daily workout
  - 📋 Reset on missed day
  - 📋 Grace period (optional)
- 📋 Streak milestones
  - 📋 3 days: Spark
  - 📋 7 days: Ember
  - 📋 14 days: Blaze
  - 📋 30 days: Inferno
  - 📋 100 days: Eternal
- 📋 Flame visual
  - 📋 Flame in village center
  - 📋 Flame color/size by streak level
  - 📋 Flame animations
- 📋 Streak warnings
  - 📋 "Don't lose your flame" reminder

### 2.4 Boss HP System 📋

- 📋 Boss fight schema
  - 📋 Total HP
  - 📋 Current HP
  - 📋 Weakness muscle
  - 📋 Resistance muscle
- 📋 Damage calculation
  - 📋 Base damage from reps/time
  - 📋 Weakness bonus (1.5x)
  - 📋 Resistance penalty (0.5x)
  - 📋 Critical hits (exceed target = chance)
- 📋 Boss fight log
  - 📋 Damage per session
  - 📋 Critical hit tracking
- 📋 Boss UI updates
  - 📋 HP bar display
  - 📋 Damage numbers during session
  - 📋 Defeat animation
  - 📋 Boss tokens reward

---

## Phase 3: Coach & Planning 📋

### 3.1 Goal Setting 📋

- 📋 Goal schema
  - 📋 Goal type (strength/endurance/flexibility/balanced)
  - 📋 Days per week
  - 📋 Session duration preference
  - 📋 Start date
- 📋 Goal UI
  - 📋 Goal selection screen
  - 📋 Days per week picker
  - 📋 Duration preference
- 📋 Goal tracking
  - 📋 Weekly progress vs goal
  - 📋 Goal completion detection

### 3.2 Auto-Generated Plans 📋

- 📋 Plan generation algorithm
  - 📋 Analyze goal type
  - 📋 Check workout history for weak areas
  - 📋 Select appropriate quests
  - 📋 Create adventure structure
- 📋 Plan schema
  - 📋 Link to generated adventure
  - 📋 Schedule (days/times)
  - 📋 Status tracking
- 📋 Plan UI
  - 📋 "Generate My Plan" button
  - 📋 Plan preview before confirming
  - 📋 Active plan display

### 3.3 Scheduling 📋

- 📋 Scheduled session schema
  - 📋 Plan reference
  - 📋 Quest reference
  - 📋 Scheduled date
  - 📋 Reminder time
  - 📋 Status (pending/completed/missed)
- 📋 Weekly view
  - 📋 Calendar display
  - 📋 Scheduled sessions
  - 📋 Completion indicators
- 📋 Schedule management
  - 📋 Reschedule session
  - 📋 Skip session

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

### 3.5 Smart Recommendations 📋

- 📋 Weak area detection
  - 📋 Analyze muscle balance
  - 📋 Suggest underworked muscles
- 📋 Rest suggestions
  - 📋 Detect overtraining patterns
  - 📋 Suggest rest days
- 📋 Difficulty progression
  - 📋 Track completion rates
  - 📋 Suggest difficulty changes

---

## Phase 4: Statistics & Progress 📋

### 4.1 Stats Dashboard 📋

- 📋 Dashboard UI
  - 📋 Streak display
  - 📋 Weekly activity chart
  - 📋 Muscle balance visualization
  - 📋 Personal records section
- 📋 Quick stats
  - 📋 Total sessions
  - 📋 Total time trained
  - 📋 Total XP earned
  - 📋 Current level

### 4.2 Weekly/Monthly Views 📋

- 📋 Weekly activity chart
  - 📋 Sessions per day
  - 📋 Goal comparison
- 📋 Monthly calendar
  - 📋 Workout markers
  - 📋 Streak visualization
- 📋 Historical data
  - 📋 Previous weeks/months
  - 📋 Trend analysis

### 4.3 Muscle Balance 📋

- 📋 Balance calculation
  - 📋 Track volume per muscle
  - 📋 Calculate percentages
  - 📋 Time period filtering (30 days, etc.)
- 📋 Balance visualization
  - 📋 Bar chart or radar chart
  - 📋 Weak area highlighting
- 📋 Balance tips
  - 📋 Suggest quests for weak areas

### 4.4 Personal Records 📋

- 📋 Record types
  - 📋 Longest session
  - 📋 Most XP in session
  - 📋 Highest streak
  - 📋 Per-exercise PRs (max reps, longest hold)
- 📋 Record tracking
  - 📋 Detect new records on completion
  - 📋 Store record history
- 📋 Record celebration
  - 📋 PR notification popup
  - 📋 PR badge in history

### 4.5 Workout History 📋

- 📋 History list
  - 📋 Grouped by date
  - 📋 Session cards with summary
- 📋 Session detail view
  - 📋 Full exercise breakdown
  - 📋 Per-exercise results
  - 📋 Duration, XP, difficulty

### 4.6 Achievements 📋

- 📋 Achievement types
  - 📋 Session milestones (10, 50, 100 sessions)
  - 📋 Streak milestones
  - 📋 Boss defeats
  - 📋 Adventure completions
  - 📋 Building unlocks
- 📋 Achievement schema
  - 📋 Achievement definitions
  - 📋 Unlocked achievements table
- 📋 Achievement UI
  - 📋 Achievement gallery
  - 📋 Unlock animations
  - 📋 Progress indicators

---

## Phase 5: Polish & Quality 📋

### 5.1 Animations 📋

- 📋 Session animations
  - 📋 Rep counter bump
  - 📋 Progress bar fill
  - 📋 Exercise transition
- 📋 Victory animations
  - 📋 Confetti burst
  - 📋 XP bar fill
  - 📋 Loot reveal
- 📋 Village animations
  - 📋 Building construction
  - 📋 Level up sparkle
  - 📋 Flame flickering
- 📋 Micro-interactions
  - 📋 Button press feedback
  - 📋 Card hover/press
  - 📋 Loading states

### 5.2 Sound & Haptics 📋

- 📋 Sound effects
  - 📋 Session start (battle horn)
  - 📋 Exercise complete (sword swing)
  - 📋 Rest start (campfire)
  - 📋 Timer warning (tick-tock)
  - 📋 Victory fanfare
  - 📋 Level up chime
- 📋 Haptic feedback
  - 📋 Heavy impact on "Done"
  - 📋 Light tick on countdown
  - 📋 Success pattern on complete
- 📋 Audio preferences
  - 📋 Sound enable/disable
  - 📋 Haptic enable/disable

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

### 5.4 Accessibility 📋

- 📋 Screen reader support
  - 📋 VoiceOver labels
  - 📋 TalkBack support
- 📋 Visual accessibility
  - 📋 Dynamic type support
  - 📋 High contrast mode
  - 📋 Colorblind modes
- 📋 Motor accessibility
  - 📋 Large touch targets
  - 📋 Reduced motion option

### 5.5 Error Handling 📋

- 📋 Database errors
  - 📋 Migration failures
  - 📋 Query errors
- 📋 Session recovery
  - 📋 State persistence
  - 📋 Crash recovery
- 📋 User feedback
  - 📋 Error messages
  - 📋 Retry options

---

## Phase 6: Future Features 💡

### 6.1 Social Features 💡

- 💡 Village visiting
  - 💡 View friends' villages
  - 💡 Send encouragement
- 💡 Cooperative adventures
  - 💡 Async co-op
  - 💡 Combined damage to bosses
  - 💡 Shared rewards
- 💡 Leaderboards
  - 💡 Friends ranking
  - 💡 Weekly challenges
- 💡 Guilds
  - 💡 Create/join guilds
  - 💡 Guild challenges
  - 💡 Shared guild village

### 6.2 GPS & Outdoor 💡

- 💡 Outdoor quests
  - 💡 Location-based workouts
  - 💡 GPS tracking
  - 💡 Route creation
- 💡 Territory system
  - 💡 Claim territory
  - 💡 Compete with nearby users
- 💡 Secret locations
  - 💡 Discover hidden quests
  - 💡 Landmark challenges

### 6.3 Smartwatch Integration 💡

- 💡 Heart rate tracking
  - 💡 Apple Watch support
  - 💡 Wear OS support
  - 💡 Heart rate zones
- 💡 Watch controls
  - 💡 Start/pause from watch
  - 💡 Timer display
  - 💡 Exercise completion
- 💡 Standalone sessions
  - 💡 Watch-only workouts

### 6.4 Cloud Sync 💡

- 💡 Sync architecture
  - 💡 Cloud backend
  - 💡 Offline-first sync
  - 💡 Conflict resolution
- 💡 Multi-device
  - 💡 Phone/tablet sync
  - 💡 Web dashboard
- 💡 Backup/restore
  - 💡 Automatic backup
  - 💡 Manual export/import
- 💡 Privacy
  - 💡 End-to-end encryption
  - 💡 Data ownership

### 6.5 User-Generated Content 💡

- 💡 Custom quests
  - 💡 Quest builder
  - 💡 Share quests
- 💡 Custom adventures
  - 💡 Adventure creator
  - 💡 Community adventures
- 💡 Custom exercises
  - 💡 Add personal exercises
  - 💡 Video upload

### 6.6 Advanced RPG 💡

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
  - ✅ Database tests
  - 📋 Component tests
  - 📋 E2E tests
- 📋 Type safety
  - ✅ TypeScript strict mode
  - 📋 Zod schema validation
- 📋 Code organization
  - 📋 Feature-based structure
  - 📋 Shared utilities

### Documentation 🚧

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

## Summary

| Phase | Status | Completion |
| ----- | ------ | ---------- |
| Phase 1: Core Loop | ✅ Done | 100% |
| Phase 2: Village & Economy | 📋 Planned | 0% |
| Phase 3: Coach & Planning | 📋 Planned | 0% |
| Phase 4: Statistics | 📋 Planned | 0% |
| Phase 5: Polish | 📋 Planned | 0% |
| Phase 6: Future | 💡 Ideas | 0% |

**Next Priority:** Phase 2 - Resource System & Village View
