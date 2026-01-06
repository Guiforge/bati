---
stepsCompleted: ["step-01-validate-prerequisites", "step-02-design-epics", "step-03-create-stories", "step-04-final-validation"]
inputDocuments: 
  - "_bmad-output/planning-artifacts/prd.md"
  - "_bmad-output/planning-artifacts/architecture.md"
  - "_bmad-output/planning-artifacts/ux-design-specification.md"
workflowComplete: true
---

# batiV3 - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for batiV3, decomposing the requirements from the PRD, UX Design, and Architecture requirements into implementable stories.

## Requirements Inventory

### Functional Requirements

**FR1:** Users can start a workout session by selecting a quest or continuing an adventure

**FR2:** Users can view exercise instructions and target reps/time for current exercise

**FR3:** Users can complete an exercise and proceed to the next exercise in the sequence

**FR4:** Users can track rest periods between exercises with countdown timer

**FR5:** Users can pause a workout session and resume later

**FR6:** Users can modify or skip an exercise during a workout if needed

**FR7:** Users can view their progress through the workout (exercise X of Y, round X of Y)

**FR8:** System automatically saves workout progress after each completed exercise

**FR9:** Users receive visual and haptic feedback upon completing an exercise

**FR10:** Users can view workout summary (XP earned, exercises completed, time taken) after session completion

**FR11:** Users can participate in boss fight workouts where exercise reps deal damage to boss HP

**FR12:** Users can view boss health bar and current phase during boss fight sessions

**FR13:** System calculates damage dealt based on exercise difficulty and reps completed

**FR14:** Users can see damage popup animations showing HP reduction after each exercise

**FR15:** System transitions boss to next phase when HP threshold reached

**FR16:** Users receive enhanced rewards (XP, loot) upon defeating a boss

**FR17:** Users can browse all available quests filtered by muscle group, duration, and difficulty

**FR18:** Users can view quest details including exercise list, estimated duration, and difficulty level

**FR19:** Users can start any quest independently regardless of current adventure status

**FR20:** Users can view adventure details showing multi-quest progression and boss fight locations

**FR21:** Users can continue their current adventure from the home screen

**FR22:** System tracks adventure progress (step X of Y) and displays on home screen

**FR23:** Users can view all buildings in their village organized by tier (T1, T2, T3, T4)

**FR24:** System automatically unlocks buildings based on workout completion and muscle training patterns

**FR25:** System automatically levels up buildings based on accumulated XP for related muscle groups

**FR26:** Users can view building details including lore, stat bonuses, current level, and XP progress

**FR27:** Users can see visual progression of buildings across 5 evolution levels

**FR28:** Users can view prestige score calculated from total building unlocks and levels

**FR29:** Users can see next level preview for buildings showing required XP and visual changes

**FR30:** System displays building unlock celebrations after workout completion

**FR31:** System detects weak muscle areas by analyzing training history across last 4 weeks

**FR32:** Users can view coach recommendations including weak area alerts and suggested quests

**FR33:** Users can view weekly progress snapshot showing sessions completed, XP earned, and muscle balance

**FR34:** Users can set fitness goals (e.g., "I want to do 10 pushups")

**FR35:** System automatically generates 4-week training plan (adventure) from user-defined goals

**FR36:** Users can view goal progress including current status and sessions remaining to target

**FR37:** System displays coach notifications as badges on home screen coach icon

**FR38:** Users can dismiss coach recommendations or accept suggested actions

**FR39:** Users earn XP from completed exercises based on difficulty and reps/time

**FR40:** System automatically levels up user character when XP thresholds reached

**FR41:** Users can view their current level, XP bar progress, and total XP earned

**FR42:** Users can view their avatar and customize appearance (avatar selection)

**FR43:** Users can name their village during onboarding

**FR44:** System tracks user statistics including total sessions, workout streak, and lifetime XP

**FR45:** System stores all user data locally in SQLite database without requiring internet connection

**FR46:** Users can access all core functionality (workouts, village, coach) while offline

**FR47:** System automatically backs up data to local device storage

**FR48:** Users can view their complete workout history with session details

**FR49:** System prevents data loss during app crashes or device restarts

**FR50:** Users can enable daily workout reminder notifications at configurable time

**FR51:** System limits notifications to maximum 1 per day

**FR52:** Users can disable notifications entirely via settings

**FR53:** System sends streak warning notification if user hasn't worked out and streak >3 days

**FR54:** System sends goal milestone notification when user is close to weekly goal

**FR55:** Users complete onboarding by selecting avatar and naming village

**FR56:** Users can optionally complete tutorial quest to learn workout mechanics

**FR57:** Users see fitness disclaimer and acknowledgment on first app launch

**FR58:** System displays coach suggestions after first 7 days of usage

### Non-Functional Requirements

**NFR1: Performance**
- App launches in <3 seconds on mid-range Android devices (2020+)
- Quest browsing/filtering responds in <500ms
- Session transitions (exercise → rest → exercise) are instant (<100ms)
- Village rendering with 110 buildings loads in <2 seconds
- Database queries complete in <200ms for 90% of operations

**NFR2: Offline Capability**
- 100% of core functionality (workouts, village, coach) works without internet
- Local SQLite database persists all user data
- No network calls required for any MVP feature
- Data syncs locally only (no cloud dependency)

**NFR3: Data Integrity**
- Auto-save workout progress after each completed exercise
- SQLite transactions prevent data corruption during crashes
- Workout history retained indefinitely
- Database migrations handle schema changes without data loss

**NFR4: Platform Support**
- iOS 13+ (95% of devices)
- Android 8.0+ (API level 26, 90% of devices)
- Responsive layouts for iPhone SE (small) to iPad (large)
- Platform-specific UX patterns (iOS = swipe back, Android = hardware back button)

**NFR5: Accessibility**
- WCAG 2.1 AA compliance for color contrast
- Touch targets minimum 44x44pt
- Font scaling support (iOS Dynamic Type, Android Large Text)
- Screen reader labels for all interactive elements
- Haptic feedback toggle (respect reduced motion setting)

**NFR6: Localization**
- English + French UI strings from day one (i18next)
- Database stores dual-language fields (enName, frName) for exercises/quests
- Runtime language switching without app restart
- Number/date formatting respects device locale

**NFR7: Security & Privacy**
- No user accounts (anonymous by design)
- No analytics/tracking without explicit opt-in
- All data stored locally (no cloud upload)
- No personally identifiable information collected

**NFR8: Visual Quality**
- 60 FPS animations during workouts (smooth XP bars, damage popups)
- Glassmorphism effects (iOS = real blur, Android = opacity fallback if laggy)
- Image assets optimized (expo-image with caching)
- Dark mode only (no light theme)

**NFR9: Battery Efficiency**
- Session screen prevents device sleep (keep-awake)
- Background tasks minimal (no continuous tracking)
- Notifications limited to 1/day maximum
- No location tracking (gym sessions work offline)

**NFR10: Maintainability**
- TypeScript strict mode (catch errors at compile time)
- Drizzle ORM for type-safe database queries
- Component library (Tamagui) enforces design consistency
- Test coverage >75% for business logic (XP, unlocks, coach algorithm)

**NFR11: Scalability (Future-Proofing)**
- Database schema supports 500+ quests without performance degradation
- Village supports 110 buildings × 5 levels = 550 images
- User can complete 1000+ workout sessions without slowdown
- Drizzle migrations allow schema evolution without data loss

### Additional Requirements

**From Architecture Document:**

- **Design System Compliance**: Fix 18 hardcoded hex color violations before production
  - Replace with Tamagui tokens ($primary, $bgDark, $glassBg, etc.)
  - Affected files: HomeHeader.tsx, JournalStats.tsx, DatabaseProvider.tsx, StreakBadge.tsx, ProgressionChart.tsx

- **Touch Target Audit**: Validate all interactive components meet 44pt minimum (WCAG 2.1 AA requirement)

- **Android Performance Validation**: Test glassmorphism on 5 mid-range Android devices
  - Fallback to solid background + opacity if performance issues
  - Devices: Pixel 4a, Samsung A52, etc.

- **Building Image Generation**: 110 buildings × 5 evolution levels = 550 AI-generated images
  - Validate style guide with 5 sample buildings first
  - Ensure visual cohesion across all tiers

- **Database Migration Safety**: All schema changes must use Drizzle migrations
  - Test migrations on production-like data volumes
  - Rollback strategy for failed migrations

- **Test Coverage Expansion**: Increase from current 75% to 85%+ for critical paths
  - Add component tests for UI interactions
  - E2E tests for onboarding, first workout, village unlock

- **Accessibility Settings**: Implement user-configurable options
  - High contrast mode
  - Reduced motion toggle
  - Font size adjustment
  - Haptic feedback toggle

**From UX Design Specification:**

- **Village UX Refactor** (Blueprint #1):
  - Organize buildings by tier tabs (T1, T2, T3, T4)
  - Show building images with 5 evolution levels
  - Building details modal with lore, stats, XP progress

- **Onboarding Enhancement** (Blueprint #2):
  - 3-slide presentation carousel
  - Avatar selection with descriptions
  - Tutorial quest (optional but recommended)
  - Feature suggestions after completion

- **Coach Interface** (Blueprint #3):
  - Coach icon on Home screen with notification badge
  - Coach modal with recommendations + weekly snapshot
  - Plan generation UI for goal-driven training
  - Weekly schedule view for generated plans

- **Navigation Simplification** (Blueprint #4):
  - Remove floating nav
  - Single tab bar (always visible): Home, Quests, Adventures, Journal, Village
  - Add "More" page for secondary features (Settings, History, etc.)

- **Session Missing Flows** (Blueprint #5):
  - "Modify Exercise" option during workout (alternative exercises)
  - Skip exercise option (with confirmation)
  - Victory sharing feature (share workout result as image)

- **Accessibility Specifications** (Blueprint #6):
  - Complete screen reader labels for all components
  - Color contrast validation (WCAG 2.1 AA)
  - Touch target audit (44x44pt minimum)
  - Settings page for accessibility options

### FR Coverage Map

**Epic 1: Project Foundation & Environment Setup**
- Infrastructure setup (NFR10, Architecture requirements)

**Epic 2: First-Time User Experience**
- FR55: Avatar selection + village naming
- FR56: Optional tutorial quest
- FR57: Fitness disclaimer on first launch
- FR58: Coach suggestions after 7 days

**Epic 3: Complete a Workout Session**
- FR1: Start workout session
- FR2: View exercise instructions and target reps/time
- FR3: Complete exercise and proceed to next
- FR4: Track rest periods with countdown timer
- FR5: Pause and resume workout
- FR6: Modify or skip exercise during workout
- FR7: View progress through workout
- FR8: Auto-save workout progress
- FR9: Visual and haptic feedback on completion
- FR10: View workout summary after completion

**Epic 4: Quest & Adventure Discovery**
- FR17: Browse quests (filter by muscle, duration, difficulty)
- FR18: View quest details
- FR19: Start any quest independently
- FR20: View adventure details
- FR21: Continue adventure from home screen
- FR22: Track adventure progress

**Epic 5: Boss Fight Workouts**
- FR11: Participate in boss fight workouts
- FR12: View boss health bar and phase
- FR13: Calculate damage based on reps
- FR14: See damage popup animations
- FR15: Boss phase transitions
- FR16: Enhanced rewards upon boss defeat

**Epic 6: Village Progression System**
- FR23: View buildings by tier (T1-T4)
- FR24: Auto-unlock buildings
- FR25: Auto-level buildings based on XP
- FR26: View building details (lore, stats, XP)
- FR27: Visual progression across 5 levels
- FR28: View prestige score
- FR29: See next level preview
- FR30: Building unlock celebrations

**Epic 7: Character Progression & Profile**
- FR39: Earn XP from exercises
- FR40: Auto-level up character
- FR41: View level, XP bar, total XP
- FR42: View/customize avatar
- FR43: Village naming
- FR44: Track statistics (sessions, streak, lifetime XP)
- FR48: View complete workout history

**Epic 8: Intelligent Coach System**
- FR31: Detect weak muscle areas
- FR32: View coach recommendations
- FR33: View weekly progress snapshot
- FR34: Set fitness goals
- FR35: Auto-generate 4-week training plan
- FR36: View goal progress
- FR37: Coach notifications (badge)
- FR38: Dismiss/accept recommendations

**Epic 9: Notifications & Engagement**
- FR50: Daily workout reminders (configurable)
- FR51: Max 1 notification per day
- FR52: Disable notifications
- FR53: Streak warning notifications
- FR54: Goal milestone notifications

**Epic 10: Offline & Data Resilience**
- FR45: SQLite local storage
- FR46: 100% offline functionality
- FR47: Auto-backup to device
- FR49: Prevent data loss during crashes

**Epic 11: Accessibility & Inclusive Experience**
- NFR5: Accessibility requirements
- UX Blueprint #6: WCAG 2.1 AA compliance
- Architecture: Touch target audit (44x44pt)

**Epic 12: Simplified Navigation & Information Architecture**
- UX Blueprint #4: Navigation simplification
- Remove floating nav, single tab bar

## Epic List

### Epic 1: Project Foundation & Environment Setup
**User Outcome:** Development team can build, test, and deploy the app with confidence

**FRs Covered:** Infrastructure requirements (NFR10, Architecture requirements)

**Implementation Notes:**
- Setup Expo project with TypeScript + Tamagui
- Configure SQLite + Drizzle ORM
- Initialize i18n (EN/FR)
- Implement design system corrections (18 hex violations)
- Setup test infrastructure
- Addresses NFR10 (Maintainability) and Architecture design system compliance

### Epic 2: First-Time User Experience
**User Outcome:** New users can onboard smoothly and understand the app's value

**FRs Covered:** FR55, FR56, FR57, FR58

**Implementation Notes:**
- Avatar selection + village naming (FR55)
- Optional tutorial quest (FR56)
- Fitness disclaimer on first launch (FR57)
- Coach suggestions after 7 days (FR58)
- Addresses UX Blueprint #2 (Onboarding Enhancement)
- Must feel welcoming, not overwhelming

### Epic 3: Complete a Workout Session
**User Outcome:** Users can perform a full workout session from start to victory screen

**FRs Covered:** FR1, FR2, FR3, FR4, FR5, FR6, FR7, FR8, FR9, FR10

**Implementation Notes:**
- Core workout loop (highest priority)
- Must feel smooth (NFR1: <100ms transitions)
- Includes modify/skip exercise flow (UX Blueprint #5)
- Victory screen with share option (UX Blueprint #5)
- Addresses UX Blueprint #5 (Session Missing Flows)

### Epic 4: Quest & Adventure Discovery
**User Outcome:** Users can browse, select, and start quests or multi-quest adventures

**FRs Covered:** FR17, FR18, FR19, FR20, FR21, FR22

**Implementation Notes:**
- Quest = single workout template
- Adventure = multi-quest progression (includes boss fights)
- Must integrate with simplified navigation (UX Blueprint #4)
- Browse/filter functionality
- Quest and adventure detail views

### Epic 5: Boss Fight Workouts
**User Outcome:** Users can participate in epic boss fight workouts with enhanced engagement

**FRs Covered:** FR11, FR12, FR13, FR14, FR15, FR16

**Implementation Notes:**
- Builds on Epic 3 (session mechanics)
- High visual polish (NFR8: 60 FPS animations)
- Part of Adventures (Epic 4)
- Boss HP bar, phase transitions, damage calculations
- Enhanced rewards system

### Epic 6: Village Progression System
**User Outcome:** Users can see their village grow and evolve based on training patterns

**FRs Covered:** FR23, FR24, FR25, FR26, FR27, FR28, FR29, FR30

**Implementation Notes:**
- Addresses UX Blueprint #1 (Village Page Refactor)
- 110 buildings × 5 levels = 550 AI images (Architecture requirement)
- Tier tabs + building details modal
- Auto-unlock and auto-leveling system
- Prestige score calculation

### Epic 7: Character Progression & Profile
**User Outcome:** Users can track their character's growth and view their fitness journey

**FRs Covered:** FR39, FR40, FR41, FR42, FR43, FR44, FR48

**Implementation Notes:**
- Builds on Epic 3 (XP earning)
- Visible on Home screen + Profile/Journal
- Motivates long-term engagement
- Avatar customization
- Complete workout history view

### Epic 8: Intelligent Coach System
**User Outcome:** Users receive personalized recommendations and training plans based on their progress

**FRs Covered:** FR31, FR32, FR33, FR34, FR35, FR36, FR37, FR38

**Implementation Notes:**
- Addresses UX Blueprint #3 (Coach UX Specification)
- Requires 7 days of data (FR58)
- Coach modal with recommendations + plan generation UI
- Weak muscle detection algorithm
- 4-week plan generation from goals

### Epic 9: Notifications & Engagement
**User Outcome:** Users receive helpful reminders without feeling spammed

**FRs Covered:** FR50, FR51, FR52, FR53, FR54

**Implementation Notes:**
- Addresses NFR9 (Battery Efficiency)
- Respects user preferences (FR52)
- Integrates with Coach (Epic 8)
- Max 1 notification per day
- Configurable reminder times

### Epic 10: Offline & Data Resilience
**User Outcome:** Users can trust the app to work anywhere and never lose their progress

**FRs Covered:** FR45, FR46, FR47, FR49

**Implementation Notes:**
- Addresses NFR2 (Offline Capability)
- Addresses NFR3 (Data Integrity)
- Already implemented (Architecture doc confirms)
- SQLite local storage with auto-backup
- Crash recovery mechanisms

### Epic 11: Accessibility & Inclusive Experience
**User Outcome:** All users, regardless of ability, can use Bati comfortably

**FRs Covered:** NFR5, UX Blueprint #6

**Implementation Notes:**
- Addresses UX Blueprint #6 (Accessibility Specifications)
- Addresses Architecture requirement: Touch target audit
- WCAG 2.1 AA compliance
- High contrast mode, screen reader labels
- Reduced motion toggle, font scaling

### Epic 12: Simplified Navigation & Information Architecture
**User Outcome:** Users can easily find features without confusion

**FRs Covered:** UX Blueprint #4

**Implementation Notes:**
- Addresses UX Blueprint #4 (Navigation Simplification)
- Remove floating nav
- Single tab bar (Home, Quests, Adventures, Journal, Village)
- Add "More" page for secondary features
- Improves discoverability, reduces cognitive load

<!-- Epics and stories will be appended sequentially through collaborative workflow steps -->

## Epic 1: Project Foundation & Environment Setup

**Goal:** Development team can build, test, and deploy the app with confidence

**FRs Covered:** Infrastructure requirements (NFR10, Architecture requirements)

### Story 1.1: Initialize Expo Project with TypeScript and Tamagui

As a **developer**,
I want **a properly configured Expo project with TypeScript and Tamagui**,
So that **I can build features using type-safe code and the design system**.

**Acceptance Criteria:**

**Given** a new Expo project needs to be initialized
**When** the project setup is complete
**Then** TypeScript strict mode is enabled with all compiler options configured
**And** Tamagui is installed with custom tokens ($bgDark, $primary, $glassBg, etc.)
**And** SpaceGrotesk and NotoSans fonts are configured
**And** Dark mode is forced (no light theme)
**And** The app builds successfully on iOS and Android
**And** All design system tokens are accessible via Tamagui props

### Story 1.2: Configure SQLite Database with Drizzle ORM

As a **developer**,
I want **SQLite database configured with Drizzle ORM and migrations**,
So that **I can persist user data locally with type-safe queries**.

**Acceptance Criteria:**

**Given** the app needs local data persistence
**When** the database configuration is complete
**Then** expo-sqlite is installed and initialized
**And** Drizzle ORM is configured with TypeScript types
**And** Database schema is defined in db/schema.ts
**And** Migration system is functional (drizzle-kit)
**And** DatabaseProvider wraps the app in _layout.tsx
**And** Migrations run automatically before UI renders
**And** Database queries are type-safe (no 'any' types)
**And** Test helpers exist for mocking database in tests

### Story 1.3: Setup i18n (English + French) with i18next

As a **developer**,
I want **internationalization configured for English and French**,
So that **users can use the app in their preferred language**.

**Acceptance Criteria:**

**Given** the app needs to support multiple languages
**When** i18n setup is complete
**Then** i18next is configured with EN and FR translation files
**And** Translation keys are organized in locales/ folder (en.json, fr.json)
**And** Runtime language switching works without app restart
**And** The t() function is available throughout the app
**And** Device locale is detected on first launch
**And** User can manually change language in settings
**And** Database fields support dual-language (enName, frName) for exercises/quests
**And** Test exists to validate all translation keys are present in both languages

### Story 1.4: Fix Design System Violations (18 hex colors)

As a **developer**,
I want **all hardcoded hex colors replaced with Tamagui tokens**,
So that **the design system is consistent and maintainable**.

**Acceptance Criteria:**

**Given** the codebase has 18 hardcoded hex color violations
**When** the fixes are complete
**Then** All hex colors in HomeHeader.tsx are replaced with tokens
**And** All hex colors in JournalStats.tsx are replaced with tokens
**And** All hex colors in DatabaseProvider.tsx are replaced with tokens
**And** All hex colors in StreakBadge.tsx are replaced with tokens
**And** All hex colors in ProgressionChart.tsx are replaced with tokens
**And** No hardcoded hex colors exist in the codebase (grep validation)
**And** Visual appearance remains identical to original
**And** All components still render correctly

### Story 1.5: Setup Test Infrastructure (Jest + Test Helpers)

As a **developer**,
I want **a complete test infrastructure with Jest and test helpers**,
So that **I can write reliable tests for business logic and components**.

**Acceptance Criteria:**

**Given** the app needs comprehensive testing
**When** test infrastructure is set up
**Then** Jest is configured with TypeScript support
**And** Test helpers exist in __tests__/helpers/ folder
**And** Mock database helper (testDb.ts) is available
**And** Test coverage reports are generated
**And** Tests can run with `npm test`
**And** Existing tests pass (28 test files)
**And** Test coverage is >75% for business logic
**And** Component testing library is configured (React Native Testing Library)
**And** Documentation exists for writing new tests

## Epic 2: First-Time User Experience

**Goal:** New users can onboard smoothly and understand the app's value

**FRs Covered:** FR55, FR56, FR57, FR58

### Story 2.1: Display Fitness Disclaimer on First Launch

As a **new user**,
I want **to see and acknowledge a fitness disclaimer on first app launch**,
So that **I understand the app is for motivation, not medical advice**.

**Acceptance Criteria:**

**Given** the user launches the app for the first time
**When** the app opens
**Then** a fitness disclaimer screen is displayed before any other content
**And** the disclaimer text warns that the app is not medical advice
**And** the disclaimer advises consulting a doctor before starting exercise
**And** an "I Understand" button is visible
**And** the user cannot proceed without acknowledging the disclaimer
**And** after acknowledgment, the user never sees the disclaimer again
**And** the acknowledgment is stored in local database (user settings)

### Story 2.2: Onboarding Presentation Carousel (3 slides)

As a **new user**,
I want **to see a 3-slide presentation explaining what Bati is**,
So that **I understand the app's value before creating my profile**.

**Acceptance Criteria:**

**Given** the user has acknowledged the fitness disclaimer
**When** the onboarding begins
**Then** a carousel with 3 slides is displayed
**And** Slide 1 explains "Transform workouts into epic quests"
**And** Slide 2 explains "Build your fantasy village through training"
**And** Slide 3 explains "Track progress and get coaching"
**And** users can swipe between slides horizontally
**And** pagination dots show current slide (1 of 3)
**And** "Skip" button is visible on all slides
**And** "Next" button advances to next slide
**And** "Get Started" button appears on final slide
**And** all text is localized (EN/FR via i18next)

### Story 2.3: Avatar Selection and Village Naming

As a **new user**,
I want **to choose my avatar and name my village**,
So that **I feel ownership and connection to my fitness journey**.

**Acceptance Criteria:**

**Given** the user completes the presentation carousel
**When** the avatar selection screen loads
**Then** 6 avatar options are displayed (Warrior, Mage, Rogue, Paladin, Ranger, Berserker)
**And** each avatar has a description explaining its theme
**And** tapping an avatar selects it with visual feedback
**And** after avatar selection, village naming screen appears
**And** a text input field accepts village name (max 20 characters)
**And** village name is validated (no special characters, not empty)
**And** "Create Village" button saves the selection
**And** user profile is created in database with avatar and village name
**And** user is redirected to home screen after creation
**And** onboarding is marked complete (never shown again)

### Story 2.4: Optional Tutorial Quest

As a **new user**,
I want **to optionally complete a tutorial quest**,
So that **I can learn how workouts function in a safe, guided way**.

**Acceptance Criteria:**

**Given** the user completes avatar and village setup
**When** the home screen loads for the first time
**Then** a modal suggests completing the tutorial quest
**And** the modal explains "Learn the basics with a 5-minute quest"
**And** "Start Tutorial" button begins the tutorial quest
**And** "Skip for Now" button dismisses the modal
**And** the tutorial quest contains 3 simple exercises (Squats, Push-ups, Planks)
**And** the tutorial quest demonstrates rest timer, exercise completion, and victory screen
**And** completing the tutorial awards 100 XP and unlocks first building
**And** tutorial completion is tracked in database
**And** users who skip can access tutorial later from settings

### Story 2.5: Coach Suggestions After 7 Days

As a **returning user**,
I want **to receive coach suggestions after 7 days of usage**,
So that **I get personalized recommendations once the app has data**.

**Acceptance Criteria:**

**Given** the user has completed 7 days of app usage (at least 1 session)
**When** the user opens the app on day 8 or later
**Then** the Coach icon on home screen displays a notification badge
**And** tapping the Coach icon shows "Getting Started Suggestions"
**And** suggestions include: "Try different muscle groups for balanced training"
**And** suggestions include: "Set your first fitness goal to stay motivated"
**And** suggestions include: "Complete 3 sessions this week to build momentum"
**And** the notification badge disappears after viewing suggestions
**And** suggestions are stored in database and not shown again
**And** coach data collection begins tracking muscle balance and weak areas

## Epic 3: Complete a Workout Session

**Goal:** Users can perform a full workout session from start to victory screen

**FRs Covered:** FR1, FR2, FR3, FR4, FR5, FR6, FR7, FR8, FR9, FR10

### Story 3.1: Start Workout Session with Countdown

As a **user**,
I want **to start a workout session with a preparation countdown**,
So that **I have time to get ready before the first exercise begins**.

**Acceptance Criteria:**

**Given** the user selects a quest or continues an adventure
**When** they tap "Start Workout"
**Then** a countdown screen appears showing "Get Ready!" message
**And** a 5-second countdown timer is displayed (5, 4, 3, 2, 1, GO!)
**And** countdown numbers are large and clearly visible
**And** haptic feedback pulses on each countdown number
**And** after countdown reaches 0, the first exercise screen loads
**And** workout session is created in database with start time
**And** session state is stored in Zustand (stores/session.ts)
**And** the user can tap "Skip Countdown" to start immediately

### Story 3.2: Display Exercise Instructions and Rest Timer

As a **user**,
I want **to see clear exercise instructions and rest timers**,
So that **I know exactly what to do and when to rest**.

**Acceptance Criteria:**

**Given** the user is in an active workout session
**When** an exercise begins
**Then** the exercise name is displayed prominently at the top
**And** exercise instructions are shown (text description)
**And** target reps or time duration is displayed
**And** an image or animation demonstrates the exercise
**And** "Complete" button is visible and accessible
**And** when user taps "Complete", rest timer screen appears
**And** rest timer counts down from configured time (default 30 seconds)
**And** rest timer displays time remaining in large numbers
**And** user can skip rest period with "Skip Rest" button
**And** after rest completes, next exercise loads automatically

### Story 3.3: Complete Exercise and Track Progress

As a **user**,
I want **my exercise completions tracked and progress displayed**,
So that **I can see how far I've progressed through the workout**.

**Acceptance Criteria:**

**Given** the user is completing exercises in a workout
**When** they complete an exercise
**Then** exercise completion is saved to database immediately (auto-save)
**And** XP is calculated based on exercise difficulty and reps/time
**And** progress indicator shows "Exercise X of Y" at the top
**And** progress indicator shows "Round X of Y" if multi-round workout
**And** completed exercises are marked as done in session state
**And** if app crashes, user can resume from last completed exercise
**And** progress bar visually shows percentage complete (0-100%)
**And** all progress data persists in SQLite session table

### Story 3.4: Pause and Resume Workout

As a **user**,
I want **to pause my workout and resume later**,
So that **I can handle interruptions without losing progress**.

**Acceptance Criteria:**

**Given** the user is in an active workout session
**When** they tap the "Pause" button
**Then** the workout timer stops immediately
**And** a pause screen appears with "Workout Paused" message
**And** pause screen shows options: "Resume", "End Workout"
**And** current progress is displayed on pause screen
**And** session remains in paused state if user closes the app
**And** when user taps "Resume", countdown (3-2-1) appears before continuing
**And** workout continues from exact point where it was paused
**And** pause duration is tracked in session data
**And** user can pause at any time (during exercise or rest)

### Story 3.5: Modify or Skip Exercise During Workout

As a **user**,
I want **to modify or skip an exercise during a workout**,
So that **I can adapt to injuries or equipment limitations**.

**Acceptance Criteria:**

**Given** the user is viewing an exercise screen
**When** they tap "Modify Exercise" button
**Then** a modal displays alternative exercises for the same muscle group
**And** 3 alternative exercises are shown with difficulty indicators
**And** user can select an alternative exercise
**And** selected alternative replaces current exercise for this session only
**And** original quest template remains unchanged
**And** user can tap "Skip Exercise" to skip entirely
**And** skip confirmation modal appears: "Skip this exercise? You won't earn XP for it"
**And** if user confirms skip, session moves to rest period then next exercise
**And** skipped exercises are logged in session data (not counted as completed)
**And** XP is not awarded for skipped exercises

### Story 3.6: Visual and Haptic Feedback on Completion

As a **user**,
I want **satisfying visual and haptic feedback when I complete exercises**,
So that **I feel motivated and rewarded for my effort**.

**Acceptance Criteria:**

**Given** the user completes an exercise
**When** they tap "Complete"
**Then** a checkmark animation appears (bouncy, celebratory)
**And** haptic feedback triggers (success vibration pattern)
**And** XP earned popup animates upward showing "+50 XP" (or calculated amount)
**And** XP popup fades out after 1.5 seconds
**And** screen transitions smoothly to rest timer or next exercise
**And** if device has reduced motion enabled, animations are simplified
**And** if haptics are disabled in settings, no vibration occurs
**And** feedback respects user accessibility preferences

### Story 3.7: Victory Screen with Summary and Share Option

As a **user**,
I want **to see a victory screen with my workout summary and share it**,
So that **I feel accomplished and can celebrate my progress**.

**Acceptance Criteria:**

**Given** the user completes all exercises in a workout session
**When** the final exercise is completed
**Then** a victory screen appears with celebratory animation
**And** workout summary displays: total XP earned, exercises completed, time taken
**And** any building unlocks or level-ups are announced
**And** "View Village" button navigates to village page
**And** "Share" button generates a shareable image of the victory
**And** shareable image includes: workout name, XP earned, user's village name
**And** user can share via native share sheet (social media, messages, etc.)
**And** "Done" button returns user to home screen
**And** session is marked complete in database
**And** workout statistics are updated (streak, total sessions, lifetime XP)

## Epic 4: Quest & Adventure Discovery

**Goal:** Users can browse, select, and start quests or multi-quest adventures

**FRs Covered:** FR17, FR18, FR19, FR20, FR21, FR22

### Story 4.1: Browse and Filter Quest Library

As a **user**,
I want **to browse all available quests with filtering options**,
So that **I can find a workout that matches my current goals and time**.

**Acceptance Criteria:**

**Given** the user navigates to the Quests tab
**When** the quest library loads
**Then** all available quests are displayed as cards in a scrollable list
**And** each quest card shows: name, primary muscle group, duration, difficulty
**And** quest cards display difficulty indicator (Beginner, Intermediate, Advanced)
**And** filter buttons are visible at the top: "Muscle Group", "Duration", "Difficulty"
**And** tapping "Muscle Group" filter shows options (Chest, Back, Legs, Arms, Core, Full Body)
**And** tapping "Duration" filter shows options (<15min, 15-30min, 30-45min, 45min+)
**And** tapping "Difficulty" filter shows options (Beginner, Intermediate, Advanced)
**And** applying filters updates quest list immediately
**And** "Clear Filters" button resets to show all quests
**And** quest list uses FlatList for performance (virtualized rendering)

### Story 4.2: View Quest Details and Start Workout

As a **user**,
I want **to view complete quest details before starting**,
So that **I know exactly what exercises I'll do and can prepare accordingly**.

**Acceptance Criteria:**

**Given** the user taps on a quest card
**When** the quest detail screen loads
**Then** quest name is displayed prominently
**And** quest description/lore text is shown
**And** complete exercise list is displayed with reps/time for each
**And** estimated total duration is shown
**And** difficulty level is indicated with visual badge
**And** primary and secondary muscle groups are listed
**And** "Start Quest" button is visible and prominent
**And** tapping "Start Quest" begins workout session (Epic 3 Story 3.1)
**And** quest can be started regardless of current adventure status (standalone)
**And** user can navigate back to quest list without starting

### Story 4.3: Browse Adventures and View Multi-Quest Progression

As a **user**,
I want **to browse adventures and see their multi-quest progression**,
So that **I can commit to a series of workouts with a boss fight goal**.

**Acceptance Criteria:**

**Given** the user navigates to the Adventures tab
**When** the adventure library loads
**Then** all available adventures are displayed as cards
**And** each adventure card shows: name, total quests, estimated total time, difficulty
**And** adventure cards indicate if boss fight is included
**And** tapping an adventure card opens adventure detail screen
**And** adventure detail shows complete quest sequence (Quest 1, Quest 2, ..., Boss Fight)
**And** each quest in sequence displays name, duration, and status (locked/unlocked)
**And** boss fight is clearly marked with special icon and "Epic Battle" label
**And** adventure description/lore explains the story
**And** "Start Adventure" button begins first quest in the series
**And** if adventure is already started, button shows "Continue Adventure"
**And** progression indicator shows "Quest X of Y Completed"

### Story 4.4: Continue Current Adventure from Home Screen

As a **user**,
I want **to continue my current adventure directly from the home screen**,
So that **I can easily pick up where I left off in my multi-quest journey**.

**Acceptance Criteria:**

**Given** the user has an active adventure in progress
**When** the home screen loads
**Then** "Continue Adventure" card is displayed prominently
**And** card shows adventure name and current progress (Quest 3 of 5)
**And** card shows next quest name and estimated duration
**And** tapping "Continue Adventure" starts the next quest in sequence
**And** if next quest is a boss fight, card displays "Boss Fight Ready!" message
**And** if adventure is complete, card shows "Adventure Complete! Start a New One"
**And** adventure progress is tracked in database (current_adventure_id, current_step)
**And** completing a quest automatically advances adventure progress
**And** user can view full adventure details by tapping "View Adventure"
**And** completing final boss fight marks adventure as complete

## Epic 5: Boss Fight Workouts

**Goal:** Users can participate in epic boss fight workouts with enhanced engagement

**FRs Covered:** FR11, FR12, FR13, FR14, FR15, FR16

### Story 5.1: Initiate Boss Fight Workout Mode

As a **user**,
I want **to start a boss fight workout with epic presentation**,
So that **I feel the stakes are higher and the workout is special**.

**Acceptance Criteria:**

**Given** the user reaches a boss fight in an adventure
**When** they start the boss fight workout
**Then** a dramatic intro screen appears with boss image and name
**And** boss lore/backstory is displayed (e.g., "Defeat the Shadow Dragon")
**And** boss total HP is shown (e.g., "HP: 1000")
**And** "Begin Battle!" button starts the workout with countdown
**And** boss fight workout follows same mechanics as regular workout (Epic 3)
**And** boss fight session is marked as type "boss_fight" in database
**And** boss HP tracking is initialized in session state
**And** visual theme is darker/more intense than regular workouts
**And** background music or sound effects can be added later (not MVP requirement)

### Story 5.2: Display Boss HP Bar and Phase System

As a **user**,
I want **to see the boss HP bar decrease as I complete exercises**,
So that **I can visualize my progress toward defeating the boss**.

**Acceptance Criteria:**

**Given** the user is in an active boss fight workout
**When** the workout screen is displayed
**Then** boss HP bar is visible at the top of the screen (always visible)
**And** HP bar shows current HP / max HP numerically (e.g., "750 / 1000")
**And** HP bar visually depletes from right to left as damage is dealt
**And** HP bar color changes based on remaining HP (green → yellow → red)
**And** when HP crosses phase thresholds (75%, 50%, 25%), phase transition occurs
**And** phase transition displays dramatic animation (boss powers up or weakens)
**And** phase indicator shows "Phase 2" or "Phase 3" after transitions
**And** each phase can have different visual effects (background color shift, boss image change)
**And** HP bar persists if user pauses and resumes

### Story 5.3: Calculate and Display Damage from Exercises

As a **user**,
I want **to see damage dealt to the boss after each exercise**,
So that **I feel like my effort directly impacts the battle**.

**Acceptance Criteria:**

**Given** the user completes an exercise in a boss fight
**When** they tap "Complete"
**Then** damage is calculated based on exercise difficulty and reps/time completed
**And** damage calculation formula: base_damage × difficulty_multiplier × completion_factor
**And** damage popup animates upward showing "-150 HP" in bold red text
**And** damage popup is larger and more dramatic than regular XP popups
**And** boss HP bar depletes smoothly (animated transition, not instant)
**And** haptic feedback triggers on damage dealt (stronger vibration than regular)
**And** if damage brings HP to 0, boss defeat animation triggers
**And** damage dealt is logged in session data for each exercise
**And** user still earns XP in addition to dealing damage (both rewards)

### Story 5.4: Boss Defeat and Enhanced Rewards

As a **user**,
I want **to receive enhanced rewards and celebration when I defeat a boss**,
So that **I feel the extra effort was worth it**.

**Acceptance Criteria:**

**Given** the user deals enough damage to reduce boss HP to 0
**When** the final exercise is completed
**Then** boss defeat animation plays (boss disappears, explosion effect, etc.)
**And** victory screen appears with "BOSS DEFEATED!" message
**And** enhanced XP reward is displayed (2x normal quest XP)
**And** special loot is awarded (rare resource, building unlock, etc.)
**And** victory screen shows: total damage dealt, exercises completed, time taken
**And** "Epic Victory" badge is shown on victory screen
**And** boss fight completion is recorded in database (boss_id, completion_time)
**And** user can share boss victory via share feature (Epic 3 Story 3.7)
**And** completing boss fight advances adventure progress to next quest or completes adventure
**And** defeated bosses are marked in adventure history (can see past victories)

## Epic 6: Village Progression System

**Goal:** Users can see their village grow and evolve based on training patterns

**FRs Covered:** FR23, FR24, FR25, FR26, FR27, FR28, FR29, FR30

### Story 6.1: Display Village with Tier-Based Organization

As a **user**,
I want **to view my village organized by building tiers**,
So that **I can easily see my progression from basic to advanced structures**.

**Acceptance Criteria:**

**Given** the user navigates to the Village tab
**When** the village screen loads
**Then** buildings are displayed in a scrollable view
**And** tier tabs are visible at the top: T1, T2, T3, T4
**And** tapping a tier tab filters buildings to show only that tier
**And** each building card shows: image (current level), name, current level (1-5)
**And** unlocked buildings are displayed with full color
**And** locked buildings are displayed grayed out with lock icon
**And** building images show evolution based on current level (5 variants per building)
**And** buildings use FlatList for performance (110 buildings total)
**And** default view shows all tiers (no filter selected)
**And** building cards are sized appropriately for mobile screens

### Story 6.2: Auto-Unlock Buildings Based on Training Patterns

As a **user**,
I want **buildings to unlock automatically based on my training patterns**,
So that **I see tangible rewards for working specific muscle groups**.

**Acceptance Criteria:**

**Given** the user completes workout sessions
**When** session completion is processed
**Then** system analyzes muscle groups trained in the session
**And** XP is accumulated for each muscle group trained
**And** building unlock conditions are checked against muscle XP totals
**And** if unlock condition is met, building status changes from locked to unlocked
**And** building unlock is saved to database (user_buildings table)
**And** unlock ceremony is triggered (Epic 6 Story 6.6)
**And** newly unlocked building appears in village at level 1
**And** unlock logic supports multiple buildings unlocking in one session
**And** unlock conditions are defined per building (e.g., "Train chest 3 times", "Earn 500 leg XP")

### Story 6.3: Auto-Level Buildings with XP Progression

As a **user**,
I want **buildings to level up automatically as I accumulate XP**,
So that **my village visually evolves with my fitness progress**.

**Acceptance Criteria:**

**Given** the user has unlocked buildings
**When** workout sessions award XP for related muscle groups
**Then** XP is added to relevant buildings based on muscle group mapping
**And** if building reaches XP threshold for next level, it levels up automatically
**And** building level increments in database (current_level: 1 → 2)
**And** building image updates to show next evolution stage (5 levels total)
**And** level-up animation plays on village screen (glow effect, sparkles)
**And** user receives notification of level-up (if on village screen or via toast)
**And** building can reach maximum level 5
**And** XP required increases per level (e.g., Level 1→2: 500 XP, Level 2→3: 1000 XP)
**And** building level-ups contribute to prestige score (Epic 6 Story 6.5)

**Technical Note:** Building images can be generated using `uv run generate_image_mistral.py` if missing (110 buildings × 5 levels = 550 images total). Generation can be done now or later as needed.

### Story 6.4: Building Details Modal with Lore and Stats

As a **user**,
I want **to view detailed information about each building**,
So that **I understand its story, bonuses, and progression path**.

**Acceptance Criteria:**

**Given** the user taps on a building card
**When** the building details modal opens
**Then** building name is displayed prominently
**And** current level is shown (e.g., "Level 3 of 5")
**And** building image shows current evolution stage
**And** lore text describes the building's story and purpose
**And** stat bonuses are displayed (e.g., "+5% Chest XP", "+10 Max HP")
**And** current XP progress bar shows progress toward next level
**And** XP progress displays numerically (e.g., "750 / 1000 XP")
**And** next level preview shows image of next evolution stage
**And** next level requirements are shown (XP needed to level up)
**And** if building is at max level (5), "Max Level Reached!" is displayed
**And** modal has "Close" button to return to village view
**And** all text is localized (EN/FR via i18next)

### Story 6.5: Prestige Score Calculation and Display

As a **user**,
I want **to see my prestige score based on village development**,
So that **I have a single metric showing my overall progression**.

**Acceptance Criteria:**

**Given** the user has unlocked and leveled buildings
**When** prestige score is calculated
**Then** prestige = (total buildings unlocked × 10) + (sum of all building levels × 5)
**And** prestige score is displayed prominently on village screen header
**And** prestige score updates in real-time when buildings unlock or level up
**And** prestige score is stored in user profile table
**And** user can see prestige breakdown by tapping info icon
**And** breakdown shows: X buildings unlocked, Y total levels, Z prestige points
**And** prestige score can be shared (e.g., "My village has 450 prestige!")
**And** prestige leaderboard can be added later (not MVP requirement)

### Story 6.6: Building Unlock Celebration Animations

As a **user**,
I want **to see celebratory animations when I unlock a building**,
So that **I feel rewarded and excited about my progress**.

**Acceptance Criteria:**

**Given** the user completes a workout that unlocks a building
**When** the workout victory screen is dismissed
**Then** building unlock modal appears with dramatic reveal
**And** modal displays "New Building Unlocked!" message
**And** building image is shown with glow/sparkle animation
**And** building name and tier are displayed
**And** short lore text explains what was unlocked
**And** "View in Village" button navigates to village tab
**And** "Continue" button dismisses modal and returns to home
**And** unlock celebration includes haptic feedback (celebratory vibration)
**And** if multiple buildings unlock, they are shown sequentially
**And** unlock animation respects reduced motion accessibility setting

## Epic 7: Character Progression & Profile

**Goal:** Users can track their character's growth and view their fitness journey

**FRs Covered:** FR39, FR40, FR41, FR42, FR43, FR44, FR48

### Story 7.1: Earn and Display XP from Exercises

As a **user**,
I want **to earn XP from every exercise I complete**,
So that **I see tangible progress toward leveling up my character**.

**Acceptance Criteria:**

**Given** the user completes an exercise in a workout
**When** the exercise is marked complete
**Then** XP is calculated based on exercise difficulty, reps/time, and completion quality
**And** XP calculation formula: base_xp × difficulty_multiplier × (completed_reps / target_reps)
**And** XP earned is displayed in popup animation ("+50 XP")
**And** XP is added to user's total XP in database (user profile table)
**And** XP is also added to current level progress (toward next level)
**And** XP earned per exercise is logged in session data
**And** total session XP is displayed on victory screen
**And** XP bar on home screen updates to reflect new progress
**And** XP progress bar shows current level progress (e.g., "750 / 1000 XP to Level 5")

### Story 7.2: Auto-Level Character System

As a **user**,
I want **my character to level up automatically when I earn enough XP**,
So that **I feel a sense of progression and achievement**.

**Acceptance Criteria:**

**Given** the user earns XP and reaches level threshold
**When** total XP crosses the level-up threshold
**Then** user level increments by 1 in database
**And** level-up animation plays on home screen or victory screen
**And** "LEVEL UP!" message is displayed prominently
**And** new level is shown with celebratory animation
**And** haptic feedback triggers (strong celebratory vibration)
**And** XP bar resets for next level (excess XP carries over)
**And** XP required for next level increases progressively (e.g., Level 1→2: 500 XP, Level 2→3: 750 XP, Level 3→4: 1000 XP)
**And** level-up notification is shown even if user is not actively in app (toast notification)
**And** user statistics are updated with new level

### Story 7.3: Avatar Display and Customization

As a **user**,
I want **to see my chosen avatar and village name throughout the app**,
So that **I feel connected to my character and fitness journey**.

**Acceptance Criteria:**

**Given** the user has completed onboarding (Epic 2 Story 2.3)
**When** the home screen or profile loads
**Then** user's chosen avatar is displayed on home screen header
**And** village name is displayed prominently on home screen
**And** avatar image reflects the chosen character type (Warrior, Mage, Rogue, etc.)
**And** current level is displayed next to avatar (e.g., "Level 7 Warrior")
**And** tapping avatar opens profile/journal screen
**And** profile screen shows: avatar, village name, level, total XP, join date
**And** user can edit village name from profile screen (with confirmation)
**And** avatar selection cannot be changed after onboarding (or requires special unlock)
**And** avatar and village name are used in share images and celebrations

### Story 7.4: User Statistics Dashboard

As a **user**,
I want **to view comprehensive statistics about my fitness journey**,
So that **I can track my progress and stay motivated**.

**Acceptance Criteria:**

**Given** the user navigates to the Journal or Profile tab
**When** the statistics dashboard loads
**Then** the following stats are displayed:
**And** Total workout sessions completed (lifetime count)
**And** Current workout streak (consecutive days with at least 1 session)
**And** Longest streak achieved (personal record)
**And** Total lifetime XP earned
**And** Current level and XP progress to next level
**And** Total time spent working out (hours:minutes)
**And** Favorite muscle group (most trained)
**And** Total buildings unlocked and village prestige score
**And** statistics are updated in real-time after each session
**And** user can view complete workout history (list of past sessions)
**And** workout history shows: date, quest name, XP earned, duration
**And** workout history uses FlatList for performance (supports 1000+ sessions)
**And** user can filter history by date range or muscle group

## Epic 8: Intelligent Coach System

**Goal:** Users receive personalized recommendations and training plans based on their progress

**FRs Covered:** FR31, FR32, FR33, FR34, FR35, FR36, FR37, FR38

### Story 8.1: Detect Weak Muscle Areas Algorithm

As a **user**,
I want **the coach to automatically detect my weak muscle areas**,
So that **I receive recommendations to balance my training**.

**Acceptance Criteria:**

**Given** the user has completed at least 7 days of workouts (FR58)
**When** the coach analysis runs (triggered daily or on-demand)
**Then** system analyzes workout history for last 4 weeks
**And** XP earned per muscle group is calculated and compared
**And** muscle groups with <15% of total XP are flagged as "weak areas"
**And** weak areas are ranked by severity (least trained first)
**And** weak area data is stored in database (coach_analysis table)
**And** analysis updates after each workout session
**And** muscle balance score is calculated (0-100%, 100% = perfectly balanced)
**And** algorithm accounts for user's workout frequency (not just total XP)
**And** if user has trained all muscle groups equally, no weak areas are flagged

### Story 8.2: Coach Recommendations UI and Weekly Snapshot

As a **user**,
I want **to see coach recommendations and my weekly progress**,
So that **I can make informed decisions about my training**.

**Acceptance Criteria:**

**Given** the user has coach data available (after 7 days)
**When** the user taps the Coach icon on home screen
**Then** coach modal opens with recommendations section
**And** if weak areas exist, alert is displayed: "Your [muscle] needs attention!"
**And** 3 suggested quests for weak areas are displayed with reasoning
**And** weekly progress snapshot shows: sessions completed this week, XP earned, muscle balance
**And** muscle balance is visualized with bar chart or pie chart
**And** coach icon displays notification badge when new recommendations are available
**And** badge disappears after user views recommendations
**And** user can dismiss recommendations (stored as "viewed" in database)
**And** recommendations refresh weekly based on updated training data
**And** "Set a Goal" button navigates to goal creation (Epic 8 Story 8.3)

### Story 8.3: Set Fitness Goals Interface

As a **user**,
I want **to set specific fitness goals**,
So that **the coach can generate a personalized training plan to help me achieve them**.

**Acceptance Criteria:**

**Given** the user taps "Set a Goal" from coach modal
**When** the goal creation screen loads
**Then** goal type options are displayed: "Strength", "Endurance", "Balance", "Custom"
**And** user can select a goal type
**And** goal input field appears (e.g., "I want to do 10 pushups" or "Train legs 3x per week")
**And** target date picker allows setting a deadline (default: 4 weeks)
**And** "Create Goal" button validates and saves the goal
**And** goal is stored in database (user_goals table) with status "active"
**And** user can view active goals in coach modal
**And** goal progress is displayed: current status vs target
**And** goal progress updates after each relevant workout session
**And** user can mark goal as complete or delete it
**And** completed goals are archived and shown in goal history

### Story 8.4: Auto-Generate 4-Week Training Plans

As a **user**,
I want **the coach to generate a 4-week training plan from my goal**,
So that **I have a structured path to achieve my fitness target**.

**Acceptance Criteria:**

**Given** the user has created a fitness goal
**When** they tap "Generate Plan" in goal details
**Then** system analyzes goal requirements and user's current fitness level
**And** 4-week training plan is generated (adventure-style, multi-quest progression)
**And** plan includes 3-4 workouts per week targeting goal-related muscle groups
**And** plan progresses in difficulty (Week 1: easier, Week 4: harder)
**And** generated plan is stored in database (training_plans table)
**And** plan is displayed as a weekly schedule in coach modal
**And** each week shows: planned quests, estimated time, muscle groups
**And** user can start planned quests directly from schedule view
**And** completing a planned quest marks it as done and advances schedule
**And** coach tracks adherence: "You've completed 8 of 12 planned workouts"
**And** user can accept or dismiss generated plan
**And** if user dismisses, they can regenerate with different parameters
**And** plan completion triggers goal progress update

## Epic 9: Notifications & Engagement

**Goal:** Users receive helpful reminders without feeling spammed

**FRs Covered:** FR50, FR51, FR52, FR53, FR54

### Story 9.1: Daily Workout Reminders

As a **user**,
I want **to receive daily workout reminders at my chosen time**,
So that **I stay consistent with my fitness routine without feeling spammed**.

**Acceptance Criteria:**

**Given** the user enables notifications in settings
**When** the notification system is configured
**Then** user can set preferred reminder time (hour and minute picker)
**And** default reminder time is 18:00 (6 PM)
**And** reminder notification is sent once per day at configured time
**And** notification displays motivational message (e.g., "Time to train your village!")
**And** notification is limited to maximum 1 per day (FR51)
**And** tapping notification opens app to home screen with "Start Workout" suggestion
**And** user can disable reminders entirely via settings toggle (FR52)
**And** notification permissions are requested on first app launch (iOS/Android)
**And** if user denies permissions, settings show "Enable notifications in system settings"
**And** reminder is not sent if user already completed a workout today

### Story 9.2: Streak Warning Notifications

As a **user**,
I want **to receive a warning if my streak is about to break**,
So that **I stay motivated to maintain my workout consistency**.

**Acceptance Criteria:**

**Given** the user has an active workout streak >3 days
**When** the user has not completed a workout today
**Then** streak warning notification is sent at 20:00 (8 PM) same day
**And** notification message: "Don't break your [X] day streak! Quick workout?"
**And** notification includes current streak count
**And** tapping notification opens app to quick quest suggestions
**And** quick quest suggestions show 3 short workouts (<15 minutes)
**And** streak warning is only sent if streak is 4+ days (FR53)
**And** streak warning respects "max 1 notification per day" rule (FR51)
**And** if daily reminder already sent, streak warning is not sent
**And** user can disable streak warnings in settings independently

### Story 9.3: Goal Milestone Notifications

As a **user**,
I want **to receive notifications when I'm close to achieving a goal**,
So that **I stay motivated to complete my fitness targets**.

**Acceptance Criteria:**

**Given** the user has an active fitness goal (Epic 8 Story 8.3)
**When** the user completes a workout that advances goal progress
**Then** goal progress is evaluated against milestones (25%, 50%, 75%, 90%)
**And** if milestone is reached, notification is sent: "You're 75% to your goal!"
**And** notification displays goal name and current progress
**And** tapping notification opens coach modal showing goal details
**And** milestone notifications respect "max 1 per day" rule (FR51)
**And** if daily reminder or streak warning already sent, milestone notification is not sent
**And** when goal is 90%+ complete, notification message is more urgent: "Almost there! 1 more session!"
**And** when goal is 100% complete, celebration notification is sent
**And** user can disable goal notifications in settings independently

## Epic 10: Offline & Data Resilience

**Goal:** Users can trust the app to work anywhere and never lose their progress

**FRs Covered:** FR45, FR46, FR47, FR49

### Story 10.1: SQLite Local Storage Implementation

As a **user**,
I want **all my data stored locally in SQLite**,
So that **I can use the app anywhere without internet connection**.

**Acceptance Criteria:**

**Given** the app is installed and running
**When** any data operation occurs (create, read, update, delete)
**Then** all data is stored in local SQLite database (expo-sqlite)
**And** no network calls are required for any core functionality
**And** 100% of features work offline (workouts, village, coach, stats)
**And** database is initialized on first app launch with seed data
**And** database schema includes tables for: users, sessions, exercises, quests, adventures, buildings, goals, coach_analysis
**And** all database queries use Drizzle ORM for type safety (Epic 1 Story 1.2)
**And** database file is stored in app's local storage directory
**And** database size is monitored (should not exceed 50MB under normal use)
**And** user can export database for backup (optional feature)

### Story 10.2: Auto-Backup to Device Storage

As a **user**,
I want **my data automatically backed up to device storage**,
So that **I don't lose my progress if I reinstall the app**.

**Acceptance Criteria:**

**Given** the user has active workout data
**When** significant data changes occur (workout completion, level-up, building unlock)
**Then** database is automatically backed up to device storage
**And** backup file is stored in app's documents directory
**And** backup filename includes timestamp (e.g., "bati_backup_2026-01-06.db")
**And** maximum 7 backup files are retained (oldest deleted automatically)
**And** backup operation runs in background (does not block UI)
**And** backup status is logged for debugging purposes
**And** user can manually trigger backup from settings
**And** user can restore from backup via settings (with confirmation)
**And** restore process validates backup integrity before applying

### Story 10.3: Crash Recovery and Data Integrity

As a **user**,
I want **the app to recover gracefully from crashes**,
So that **I never lose workout progress even if the app closes unexpectedly**.

**Acceptance Criteria:**

**Given** the user is in an active workout session
**When** the app crashes or is force-closed
**Then** all completed exercises up to that point are saved in database
**And** session state is persisted in Zustand with SQLite backup
**And** when app reopens, user sees "Resume Workout" option on home screen
**And** tapping "Resume Workout" loads session from last saved exercise
**And** user can choose to "Discard Session" if they want to start fresh
**And** database transactions ensure atomic operations (all or nothing)
**And** if database write fails, error is logged and retry is attempted
**And** database corruption is detected on startup (integrity check)
**And** if corruption detected, app attempts to restore from latest backup
**And** critical data operations (session save, XP award) use transactions to prevent partial writes

## Epic 11: Accessibility & Inclusive Experience

**Goal:** All users, regardless of ability, can use Bati comfortably

**FRs Covered:** NFR5, UX Blueprint #6 (Accessibility Specifications)

### Story 11.1: WCAG 2.1 AA Color Contrast Compliance

As a **user with visual impairments**,
I want **all text and UI elements to meet WCAG 2.1 AA contrast requirements**,
So that **I can read and interact with the app comfortably**.

**Acceptance Criteria:**

**Given** the app uses dark mode design system
**When** color contrast is audited
**Then** all text on background meets minimum contrast ratio of 4.5:1 (normal text)
**And** large text (18pt+) meets minimum contrast ratio of 3:1
**And** interactive elements (buttons, icons) meet 3:1 contrast against background
**And** design tokens are validated: $text on $bgDark, $primary on $bgDark, etc.
**And** chart colors (JournalStats, ProgressionChart) meet contrast requirements
**And** all violations documented in Architecture are fixed
**And** contrast validation tool is used (e.g., WebAIM Contrast Checker)
**And** color contrast is tested on actual devices (not just simulator)
**And** documentation includes approved color combinations

### Story 11.2: Touch Target Audit and Fixes (44x44pt minimum)

As a **user with motor impairments**,
I want **all interactive elements to be large enough to tap easily**,
So that **I don't accidentally miss buttons or tap the wrong thing**.

**Acceptance Criteria:**

**Given** the app has interactive elements (buttons, cards, icons)
**When** touch targets are audited
**Then** all pressable components meet minimum 44x44pt touch target size
**And** buttons, icon buttons, and cards have adequate padding/hitbox
**And** small icons are wrapped in larger touchable areas
**And** Chip component already meets requirement (confirmed in Architecture)
**And** all other interactive components are validated and fixed
**And** touch target size is tested on physical devices (not just simulator)
**And** spacing between adjacent interactive elements is at least 8pt
**And** list items and cards have sufficient height for comfortable tapping
**And** touch target violations are documented and tracked

### Story 11.3: Screen Reader Labels and Accessibility

As a **user with visual impairments using screen reader**,
I want **all interactive elements to have descriptive labels**,
So that **I can navigate and use the app with VoiceOver or TalkBack**.

**Acceptance Criteria:**

**Given** the user enables screen reader (VoiceOver on iOS, TalkBack on Android)
**When** navigating the app with screen reader
**Then** all buttons have descriptive accessibility labels (not just icon names)
**And** all images have meaningful alt text or are marked decorative
**And** form inputs have associated labels that screen readers announce
**And** navigation elements announce current screen and available actions
**And** exercise instructions are read aloud by screen reader
**And** XP popups and notifications are announced
**And** screen reader focus order is logical (top to bottom, left to right)
**And** modal dialogs trap focus and announce content
**And** screen reader testing is performed on both iOS and Android
**And** accessibility labels are localized (EN/FR)

### Story 11.4: Accessibility Settings (High Contrast, Reduced Motion, Font Scaling)

As a **user with accessibility needs**,
I want **configurable accessibility settings**,
So that **I can customize the app to my specific requirements**.

**Acceptance Criteria:**

**Given** the user navigates to Settings > Accessibility
**When** the accessibility settings screen loads
**Then** "High Contrast Mode" toggle is available
**And** enabling high contrast increases all contrast ratios to AAA level (7:1)
**And** "Reduce Motion" toggle is available
**And** enabling reduce motion disables decorative animations (keeps essential feedback)
**And** "Haptic Feedback" toggle is available (already exists)
**And** font scaling respects device system settings (iOS Dynamic Type, Android Large Text)
**And** all text components use relative sizing (Tamagui sp units)
**And** app layout adapts gracefully to larger font sizes (no text cutoff)
**And** accessibility settings are persisted in database
**And** settings take effect immediately without app restart
**And** accessibility settings screen itself meets all accessibility requirements

## Epic 12: Simplified Navigation & Information Architecture

**Goal:** Users can easily find features without confusion

**FRs Covered:** UX Blueprint #4 (Navigation Simplification)

### Story 12.1: Remove Floating Navigation

As a **user**,
I want **the confusing floating navigation removed**,
So that **I have a clear, predictable way to navigate the app**.

**Acceptance Criteria:**

**Given** the app currently has floating navigation
**When** the navigation refactor is complete
**Then** all floating navigation components are removed from codebase
**And** floating nav button is removed from all screens
**And** floating nav animations and overlays are deleted
**And** navigation logic is consolidated to single tab bar system
**And** existing screens are updated to use new navigation
**And** no navigation-related bugs or broken links remain
**And** codebase is cleaner with reduced navigation complexity

### Story 12.2: Implement Single Tab Bar Navigation

As a **user**,
I want **a single, always-visible tab bar at the bottom**,
So that **I can easily switch between main sections of the app**.

**Acceptance Criteria:**

**Given** the floating navigation has been removed
**When** the new tab bar is implemented
**Then** tab bar is displayed at bottom of screen on all main pages
**And** tab bar includes 5 tabs: Home, Quests, Adventures, Journal, Village
**And** each tab has an icon using useGameIcon() hook
**And** each tab has a label (localized EN/FR)
**And** active tab is visually highlighted (different color, glow effect)
**And** tapping a tab navigates to that screen immediately
**And** tab bar uses Tamagui components for consistency
**And** tab bar respects safe area insets (notch, home indicator)
**And** tab icons meet 44x44pt touch target requirement (Epic 11)
**And** tab bar is always visible (not hidden on scroll)

### Story 12.3: Add Swipe Gestures to Switch Between Tabs

As a **user**,
I want **to swipe horizontally to switch between tabs**,
So that **I can navigate quickly without tapping tab buttons**.

**Acceptance Criteria:**

**Given** the single tab bar navigation is implemented
**When** the user swipes horizontally on a main screen
**Then** swipe right navigates to next tab (Home → Quests → Adventures → Journal → Village)
**And** swipe left navigates to previous tab (Village → Journal → Adventures → Quests → Home)
**And** swipe gesture is smooth with animated transition
**And** swipe has momentum (fast swipe = immediate switch, slow swipe = can cancel)
**And** swipe threshold is configurable (default: 50px horizontal movement)
**And** swipe gesture uses react-native-gesture-handler for performance
**And** swipe respects boundaries (can't swipe past first or last tab)
**And** active tab indicator animates smoothly during swipe
**And** swipe gesture can be disabled in accessibility settings (for users who trigger it accidentally)
**And** vertical scroll still works normally (doesn't conflict with horizontal swipe)

### Story 12.4: Create "More" Page for Secondary Features

As a **user**,
I want **secondary features organized in a "More" page**,
So that **the main tabs stay focused on core functionality**.

**Acceptance Criteria:**

**Given** the app has secondary features not in main tabs
**When** the user navigates to the "More" page (accessed via button on Home or Journal)
**Then** "More" page displays list of secondary features
**And** secondary features include: Settings, About, Help, Workout History (detailed), Personal Records
**And** each item in "More" page has icon, label, and chevron (navigation indicator)
**And** tapping an item navigates to that feature's screen
**And** "More" page uses consistent design (glassmorphism cards, dark theme)
**And** "More" page is accessible from Home screen header (gear icon or "More" button)
**And** settings screen includes: notifications, accessibility, language, haptics, data backup
**And** about screen includes: app version, credits, privacy policy
**And** help screen includes: tutorial quest access, FAQ, contact support
**And** all "More" page items are localized (EN/FR)
