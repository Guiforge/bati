# Database API Reference

> Complete reference for the Bati database layer (`db/` module).

---

## Table of Contents

1. [Overview](#overview)
2. [Achievements](#achievements)
3. [Adventures](#adventures)
4. [Boss Fights](#boss-fights)
5. [Buildings (Village)](#buildings-village)
6. [Completed Sessions](#completed-sessions)
7. [Exercises](#exercises)
8. [Goals](#goals)
9. [Plans](#plans)
10. [Preferences](#preferences)
11. [Quests](#quests)
12. [Resources](#resources)
13. [Rest Suggestions](#rest-suggestions)
14. [Scheduling](#scheduling)
15. [Streaks](#streaks)
16. [User Level & XP](#user-level--xp)
17. [Utilities](#utilities)

---

## Overview

All database functions are exported from `db/index.ts`. Import like this:

```typescript
import { getQuestById, listExercises, saveSession } from "@/db";
```

The database uses **Drizzle ORM** with **SQLite** (via expo-sqlite).

---

## Achievements

Track user milestones and unlock rewards.

### Types

```typescript
type AchievementCode =
  | "first_quest" | "streak_3" | "streak_7" | "streak_30"
  | "xp_1000" | "xp_10000" | "sessions_10" | "sessions_50"
  | "boss_slayer" | "village_builder";

interface AchievementProgress {
  code: AchievementCode;
  name: string;
  description: string;
  icon: string;
  progress: number;      // Current value
  target: number;        // Goal value
  percentage: number;    // 0-100
  isUnlocked: boolean;
  unlockedAt?: Date;
}
```

### Functions

| Function | Description |
|----------|-------------|
| `getUnlockedAchievements()` | Returns array of unlocked achievements |
| `getAllAchievementsWithProgress()` | Returns all achievements with progress info |
| `checkForNewAchievements()` | Checks and unlocks any new achievements |
| `unlockAchievement(code)` | Manually unlock an achievement |
| `getAchievementStats()` | Get summary (unlocked count, total) |

---

## Adventures

Multi-quest campaigns with narrative and boss fights.

### Types

```typescript
type AdventureKind = "campaign" | "boss";

interface Adventure {
  id: number;
  name: string;
  kind: AdventureKind;
  difficultyCode: DifficultyCode;
  // ... more fields
}

interface AdventureRun {
  id: number;
  adventureId: number;
  status: "active" | "completed" | "abandoned";
  currentStep: number;
  totalSteps: number;
}
```

### Functions

| Function | Description |
|----------|-------------|
| `listAdventures()` | Get all available adventures |
| `getAdventureDetails(id)` | Get adventure with all steps |
| `startAdventureRun(adventureId)` | Start a new adventure run |
| `getActiveAdventureRun(adventureId)` | Get active run for adventure |
| `getAnyActiveAdventureRun()` | Get any active adventure run |
| `completeAdventureRunStep(runId, sessionId)` | Mark step complete |
| `setAdventureRunDifficultyOverride(runId, level)` | Set difficulty override |

---

## Boss Fights

Epic workout challenges with HP mechanics.

### Types

```typescript
interface BossFight {
  id: number;
  adventureRunId: number;
  bossName: string;
  totalHp: number;
  currentHp: number;
  weaknessMuscle: MuscleCode | null;
  resistanceMuscle: MuscleCode | null;
  isEnraged: boolean;
  isDefeated: boolean;
}

interface DamageResult {
  damage: number;
  isCritical: boolean;
  isWeakness: boolean;
  isResistance: boolean;
  currentHp: number;
  isDefeated: boolean;
  bossTokensEarned: number;  // 1 token per 100 HP
}
```

### Functions

| Function | Description |
|----------|-------------|
| `createBossFight(adventureRunId, quest)` | Create boss fight from quest |
| `getBossFight(adventureRunId)` | Get boss fight state |
| `dealDamage(adventureRunId, exercise, reps)` | Deal damage to boss |
| `checkEnrageState(adventureRunId)` | Check if boss should enrage |

---

## Buildings (Village)

Fantasy buildings that level up as you train.

### Types

```typescript
type BuildingType =
  | "campfire" | "tent" | "training_dummy"  // Tier 1
  | "archery_range" | "quarry" | "forge"    // Tier 2
  | "watchtower" | "castle_wall" | "armory" // Tier 3
  | "dragon_lair" | "heros_hall";           // Tier 4

interface VillageBuilding {
  type: BuildingType;
  level: number;
  xp: number;
  isUnlocked: boolean;
  tier: 1 | 2 | 3 | 4;
  associatedMuscle: MuscleCode;
}
```

### Functions

| Function | Description |
|----------|-------------|
| `getAllBuildings()` | Get all buildings with status |
| `getUnlockedBuildings()` | Get only unlocked buildings |
| `getBuildingByType(type)` | Get specific building |
| `addBuildingXp(type, xp)` | Add XP, returns level-up info |
| `unlockBuilding(type)` | Unlock a building |
| `processSessionBuildings(muscles)` | Process XP from session |
| `getVillageStats()` | Get village summary stats |

---

## Completed Sessions

Track workout history and trends.

### Types

```typescript
interface CompletedSessionListItem {
  id: number;
  questId: number;
  questName: string;
  performedAt: Date;
  durationSeconds: number;
  xpEarned: number;
  hasNewRecords: boolean;
}

interface WeeklyTrend {
  weekKey: string;        // "2024-W01"
  weekStart: Date;
  sessionCount: number;
  totalMinutes: number;
  totalXp: number;
}

interface MonthlyTrend {
  monthKey: string;       // "2024-01"
  monthStart: Date;
  sessionCount: number;
  totalMinutes: number;
  totalXp: number;
}

interface TrendAnalysis {
  direction: "up" | "down" | "stable";
  percentChange: number;
}
```

### Functions

| Function | Description |
|----------|-------------|
| `createCompletedSession(data)` | Save a completed session |
| `listCompletedSessions(limit?)` | Get recent sessions |
| `getCompletedSessionById(id)` | Get session with exercises |
| `getRecentSessionHistory(questId, limit)` | Quest-specific history |
| `getQuestSessionHistory(questId)` | Full history for quest |
| `getWeeklyTrends(weeks?)` | Get weekly trend data |
| `getMonthlyTrends(months?)` | Get monthly trend data |
| `analyzeTrend(current, previous)` | Compare two values |
| `getTrendSummary()` | Get complete trend summary |
| `markSessionWithNewRecords(id)` | Mark session has PRs |

---

## Exercises

Exercise catalog with muscles and equipment.

### Types

```typescript
interface Exercise {
  id: number;
  enName: string;
  frName: string;
  equipment: EquipmentCode;
  targetType: "reps" | "timed";
  baseTarget: number;
  muscles: MuscleCode[];
}
```

### Functions

| Function | Description |
|----------|-------------|
| `listExercises()` | Get all exercises |
| `getExerciseById(id)` | Get single exercise |

---

## Goals

User fitness goals with weekly targets.

### Types

```typescript
type GoalType = "sessions_per_week" | "minutes_per_week" | "streak_days";

interface Goal {
  id: number;
  type: GoalType;
  targetValue: number;
  status: "active" | "completed" | "paused";
  createdAt: Date;
}

interface GoalProgress {
  goalId: number;
  weekKey: string;      // "2024-W01"
  currentValue: number;
  targetValue: number;
  isCompleted: boolean;
}
```

### Functions

| Function | Description |
|----------|-------------|
| `createGoal(input)` | Create new goal |
| `getActiveGoal()` | Get current active goal |
| `getAllGoals()` | Get all goals |
| `getGoalById(id)` | Get specific goal |
| `updateGoal(id, updates)` | Update goal |
| `updateGoalStatus(id, status)` | Change goal status |
| `getOrCreateWeekProgress(goalId)` | Get/create week progress |
| `getCurrentWeekCompletion(goalId)` | Get completion percentage |
| `recordSessionForGoal(goalId, minutes)` | Record session toward goal |
| `getGoalProgressHistory(goalId)` | Get all weekly progress |
| `goalTypeInfo` | Object with goal type metadata |

---

## Plans

Workout planning based on goals.

### Types

```typescript
interface PlannedSession {
  dayOfWeek: number;    // 0-6 (Sun-Sat)
  questId: number;
  questName: string;
  estimatedMinutes: number;
}
```

### Functions

| Function | Description |
|----------|-------------|
| `generatePlanForGoal(goalId)` | Create and schedule sessions |
| `previewPlanForGoal(goalId)` | Preview plan without saving |

---

## Preferences

User settings persistence.

### Available Preferences

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `theme` | `"light" \| "dark" \| "system"` | `"system"` | App theme |
| `language` | `"en" \| "fr"` | `"en"` | UI language |
| `notificationsEnabled` | `boolean` | `false` | Push notifications |
| `notificationTime` | `string` | `"20:00"` | Daily reminder time |
| `hapticsEnabled` | `boolean` | `true` | Haptic feedback |
| `reducedMotion` | `boolean` | `false` | Reduce animations |

### Functions

| Function | Description |
|----------|-------------|
| `getPreference(key)` | Get preference value |
| `setPreference(key, value)` | Set preference value |
| `getAllPreferences()` | Get all preferences as object |

---

## Quests

Workout templates with exercises.

### Types

```typescript
type DifficultyCode = "easy" | "medium" | "hard";
type QuestTargetType = "reps" | "timed";

interface Quest {
  id: number;
  enName: string;
  frName: string;
  difficultyCode: DifficultyCode;
  rounds: number;
  restSeconds: number;
  exerciseRestSeconds: number;
  exercises: QuestExercise[];
}
```

### Functions

| Function | Description |
|----------|-------------|
| `listQuestTemplates(filters?)` | List quests with optional filters |
| `getQuestById(id)` | Get quest with exercises |
| `getQuestTemplateById(id)` | Get quest template only |
| `createQuestTemplate(data)` | Create new quest |
| `updateQuestMeta(id, updates)` | Update quest metadata |
| `setQuestExercises(questId, exercises)` | Set quest exercises |
| `deleteQuest(id)` | Delete a quest |
| `generateTarget(exercise, difficulty)` | Generate rep/time target |

---

## Resources

Fantasy resources earned through workouts.

### Types

```typescript
type ResourceCode =
  | "wood" | "stone" | "fire" | "water" | "wind" | "grain"
  | "coins" | "boss_token";

interface ResourceLoot {
  resource: ResourceCode;
  amount: number;
  reason: string;  // Why earned
}
```

### Muscle → Resource Mapping

| Muscle | Resource |
|--------|----------|
| Arms | Wood 🪵 |
| Back | Stone 🪨 |
| Chest | Fire 🔥 |
| Abs | Water 💧 |
| Shoulders | Wind 🌬️ |
| Legs | Grain 🌾 |

### Functions

| Function | Description |
|----------|-------------|
| `getResourceInventory()` | Get all resource amounts |
| `getResourceAmount(resource)` | Get single resource amount |
| `addResources(loot[])` | Add resources to inventory |
| `spendResources(resource, amount)` | Spend resources (returns success) |
| `calculateSessionResources(exercises)` | Calculate loot from exercises |
| `awardSessionResources(exercises)` | Calculate and add resources |
| `previewSessionLoot(exercises)` | Preview loot without saving |
| `getDifficultyMultiplier(difficulty)` | Get resource multiplier |

---

## Rest Suggestions

Smart rest day recommendations.

### Types

```typescript
interface RestSuggestion {
  shouldRest: boolean;
  reason: string;
  confidence: "high" | "medium" | "low";
  overtrainedMuscles: MuscleCode[];
  daysActiveStreak: number;
}
```

### Functions

| Function | Description |
|----------|-------------|
| `getRestSuggestion()` | Get detailed rest analysis |
| `getQuickRestCheck()` | Quick boolean check |

---

## Scheduling

Planned workout sessions.

### Types

```typescript
type ScheduledSessionStatus = "pending" | "completed" | "skipped" | "missed";

interface ScheduledSession {
  id: number;
  questId: number;
  goalId: number | null;
  scheduledFor: Date;
  status: ScheduledSessionStatus;
}

interface ScheduledSessionWithQuest extends ScheduledSession {
  questName: string;
  questDifficulty: DifficultyCode;
  estimatedMinutes: number;
}
```

### Functions

| Function | Description |
|----------|-------------|
| `createScheduledSession(input)` | Create scheduled session |
| `getTodaysScheduledSessions()` | Get today's sessions |
| `getPendingScheduledSessions()` | Get all pending sessions |
| `getScheduledSessionsForWeek(weekStart)` | Get week's sessions |
| `getScheduledSessionsInRange(start, end)` | Get range of sessions |
| `markScheduledSessionCompleted(id, completedId)` | Mark completed |
| `skipScheduledSession(id)` | Skip a session |
| `rescheduleSession(id, newDate)` | Reschedule session |
| `deleteScheduledSession(id)` | Delete session |
| `markMissedSessions()` | Auto-mark past sessions as missed |
| `scheduleWeekFromGoal(goalId, weekStart)` | Schedule week from goal |

---

## Streaks

Workout consistency tracking.

### Types

```typescript
interface StreakInfo {
  current: number;
  best: number;
  isActive: boolean;
  lastWorkoutDate: Date | null;
}
```

### Functions

| Function | Description |
|----------|-------------|
| `getStreakInfo()` | Get current streak info |
| `getCachedStreak()` | Get cached streak (fast) |
| `calculateAndCacheStreak()` | Recalculate and cache |
| `updateStreakAfterSession()` | Update after workout |

---

## User Level & XP

Experience and leveling system.

### Types

```typescript
interface UserLevelInfo {
  level: number;
  title: string;          // "Novice", "Warrior", etc.
  totalXp: number;
  currentLevelXp: number;
  xpToNextLevel: number;
  progressPercent: number;
}
```

### Level Titles

| Level | Title (EN) |
|-------|------------|
| 1-4 | Novice |
| 5-9 | Apprentice |
| 10-14 | Warrior |
| 15-19 | Champion |
| 20-24 | Hero |
| 25-29 | Legend |
| 30+ | Immortal |

### Functions

| Function | Description |
|----------|-------------|
| `getUserLevelInfo()` | Get complete level info |
| `getTotalXp()` | Get total XP earned |
| `getTotalStats()` | Get sessions, minutes, XP |
| `getLevelTitle(level)` | Get title for level |
| `getXpForLevel(level)` | Get XP required for level |
| `calculateUserLevelFromXp(xp)` | Calculate level from XP |

---

## Utilities

### Muscle Balance

```typescript
import { getMuscleBalance, getMuscleStats } from "@/db/muscleBalance";

// Get balance for time period
const balance = await getMuscleBalance("30d");
// Returns: { muscle: MuscleCode, percentage: number, volume: number }[]

// Get weak areas
const weak = await getWeakMuscles("30d");
// Returns muscles below 15% of volume
```

### Personal Records

```typescript
import { checkForNewRecords, getPersonalRecordsSummary } from "@/db/personalRecords";

// Check for new PRs after session
const records = await checkForNewRecords(completedSessionId);
// Returns: { exerciseId, recordType: "max_reps" | "longest_hold", value }[]

// Get PR summary
const summary = await getPersonalRecordsSummary();
// Returns: { longestSession, mostXp, highestStreak, exercisePRs }
```

### Duration Estimation

```typescript
import { estimateQuestSeconds, formatDuration } from "@/db";

// Estimate quest duration
const seconds = estimateQuestSeconds(quest);

// Format for display
const display = formatDuration(seconds); // "15 min" or "1h 30min"
```

---

## Database Schema

The database uses these main tables:

| Table | Purpose |
|-------|---------|
| `exercises` | Exercise catalog |
| `exercise_muscles` | Exercise → muscle mapping |
| `quest_templates` | Quest definitions |
| `quest_exercises` | Quest → exercise mapping |
| `adventures` | Adventure campaigns |
| `adventure_steps` | Adventure quest sequence |
| `adventure_runs` | Active adventure progress |
| `boss_fights` | Boss fight state |
| `completed_quest` | Completed session records |
| `completed_exercises` | Per-exercise results |
| `user_preferences` | User settings |
| `village_buildings` | Building progress |
| `resource_inventory` | Resource amounts |
| `achievements` | Achievement progress |
| `goals` | User fitness goals |
| `goal_progress` | Weekly goal progress |
| `scheduled_sessions` | Planned workouts |

---

*For more details, see the source files in `db/` directory.*
