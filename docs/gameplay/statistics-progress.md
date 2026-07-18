# Statistics & Progress

## Overview

The Statistics system tracks all workout data and presents it in meaningful ways to motivate users and help them understand their fitness journey.

---

## 📊 Key Metrics

### Per-Session Metrics

| Metric | Description | Storage |
| ------ | ----------- | ------- |
| **Duration** | Total workout time (minus pauses) | `completed_sessions.durationSeconds` |
| **XP Earned** | Experience points gained | `completed_sessions.xp` |
| **Exercises** | Count of exercises completed | Derived from `completed_exercises` |
| **Total Reps** | Sum of all rep-based exercises | Aggregated |
| **Total Time** | Sum of all time-based exercises | Aggregated |

### Aggregated Metrics

| Metric | Description | Time Scope |
| ------ | ----------- | ---------- |
| **Weekly Sessions** | Workouts this week | Rolling 7 days |
| **Monthly Sessions** | Workouts this month | Calendar month |
| **Total Sessions** | All-time workout count | Lifetime |
| **Current Streak** | Consecutive days trained | Active |
| **Best Streak** | Longest consecutive days | Historical |
| **Total XP** | Cumulative XP earned | Lifetime |

---

## 🏋️ Muscle Balance

### Tracking Muscle Distribution

```typescript
interface MuscleStats {
  muscle: MuscleCode;
  totalReps: number;
  totalTime: number;   // seconds for time-based
  percentage: number;  // of total workout volume
  lastWorked: Date;
}
```

### Balance Visualization

```text
YOUR TRAINING BALANCE (Last 30 days)

Arms     ████████████████░░░░  32%
Back     ████████████░░░░░░░░  24%
Chest    ████████░░░░░░░░░░░░  16%
Abs      ██████░░░░░░░░░░░░░░  12%
Shoulder ████░░░░░░░░░░░░░░░░   8%
Legs     ████░░░░░░░░░░░░░░░░   8%

⚠️ Tip: Your legs need more attention!
```

### Weak Area Detection

```typescript
function detectWeakAreas(stats: MuscleStats[]): MuscleCode[] {
  const average = 100 / stats.length; // Expected percentage
  const threshold = average * 0.5;    // 50% below average

  return stats
    .filter(s => s.percentage < threshold)
    .map(s => s.muscle);
}
```

---

## 📈 Charts & Visualizations

### Weekly Activity Chart

```text
Sessions This Week

Mon  ██
Tue  ████
Wed
Thu  ██████
Fri  ████
Sat
Sun  ████████  ← Today

Total: 5 sessions | Goal: 4 ✓
```

### XP Progress Chart

```text
LEVEL PROGRESS

Level 12  ████████████░░░░░░░░  2,450 / 3,000 XP

Recent XP:
Today:     +180 XP
Yesterday: +220 XP
This week: +1,240 XP
```

### Monthly Overview

```text
DECEMBER 2024

Mo Tu We Th Fr Sa Su
                  1
 2  3  4  5  6  7  8
 ●  ●     ●  ●     ●
 9 10 11 12 13 14 15
 ●     ●     ●  ●
16 17 18 19 20 21 22
 ●  ●     ●        ●
23 24 25 26 27 28 29
 ●           ●  ●  ●
30 31
 ●  ⭐ ← Today

● = Workout completed
Total: 18 sessions
```

---

## 🏆 Personal Records

### Tracked Records

| Record | Description |
| ------ | ----------- |
| **Longest Session** | Highest duration workout |
| **Most XP in Session** | Single session XP record |
| **Highest Streak** | Consecutive workout days |
| **Most Reps (Exercise)** | Personal best per exercise |
| **Longest Hold (Exercise)** | Time-based exercise record |

### PR Notification

When a user beats a personal record:

```text
┌─────────────────────────────────────────┐
│          🎉 NEW PERSONAL RECORD! 🎉     │
│                                         │
│         PUSH-UPS: 25 REPS               │
│         Previous best: 22               │
│                                         │
│              [Celebrate!]               │
└─────────────────────────────────────────┘
```

---

## 🔥 Streak System

### How Streaks Work

- **Daily Streak**: Increment if workout completed today
- **Grace Period**: None (strict) or 1 day (forgiving) - configurable
- **Reset**: Counter goes to 0 on miss, best streak preserved

### Streak Milestones

| Days | Title | Reward |
| ---- | ----- | ------ |
| 3 | Spark | 🔥 (basic flame) |
| 7 | Ember | 🔥🔥 (medium flame) |
| 14 | Blaze | 🔥🔥🔥 (bright flame) |
| 30 | Inferno | 💠 (special flame) |
| 100 | Eternal | ⭐ (legendary flame) |

### Fantasy Justification

> "The Sacred Flame of the Village grows stronger with each day of training. Let it not fade!"

---

## 💾 Database Schema

```sql
-- Personal records
CREATE TABLE personal_records (
  id INTEGER PRIMARY KEY,
  record_type TEXT NOT NULL,      -- 'longest_session', 'most_xp', etc.
  value INTEGER NOT NULL,         -- The record value
  achieved_at INTEGER NOT NULL,   -- Timestamp
  session_id INTEGER,             -- Link to session (if applicable)
  exercise_id INTEGER,            -- Link to exercise (if applicable)
  updated_at INTEGER
);

-- Streak tracking
CREATE TABLE streak_data (
  id INTEGER PRIMARY KEY,
  current_streak INTEGER DEFAULT 0,
  best_streak INTEGER DEFAULT 0,
  last_workout_date TEXT,         -- ISO date string
  updated_at INTEGER
);

-- Daily aggregates (for charts)
CREATE TABLE daily_stats (
  id INTEGER PRIMARY KEY,
  date TEXT NOT NULL UNIQUE,      -- ISO date string
  sessions_count INTEGER DEFAULT 0,
  total_duration INTEGER DEFAULT 0,
  total_xp INTEGER DEFAULT 0,
  muscles_worked TEXT,            -- JSON array of muscle codes
  created_at INTEGER
);
```

---

## 📱 UI Screens

### Stats Dashboard

```text
┌─────────────────────────────────────────────┐
│                📊 YOUR STATS                │
├─────────────────────────────────────────────┤
│                                             │
│   🔥 12 Day Streak    ⭐ Level 12           │
│                                             │
├─────────────────────────────────────────────┤
│   THIS WEEK                                 │
│   [Weekly Activity Chart]                   │
│   5/4 sessions ✓                            │
│                                             │
├─────────────────────────────────────────────┤
│   MUSCLE BALANCE                            │
│   [Balance Bar Chart]                       │
│   💡 Try more leg exercises                 │
│                                             │
├─────────────────────────────────────────────┤
│   PERSONAL RECORDS                          │
│   🏆 Longest workout: 45:32                 │
│   🏆 Best streak: 21 days                   │
│   🏆 Push-ups PR: 25 reps                   │
│                                             │
│   [View All Records]                        │
└─────────────────────────────────────────────┘
```

### History View

```text
┌─────────────────────────────────────────────┐
│                📜 HISTORY                   │
├─────────────────────────────────────────────┤
│                                             │
│   TODAY                                     │
│   ┌─────────────────────────────────┐       │
│   │ ⚔️ Iron Arms Challenge          │       │
│   │    18:32 • +180 XP • 💪 Arms     │       │
│   └─────────────────────────────────┘       │
│                                             │
│   YESTERDAY                                 │
│   ┌─────────────────────────────────┐       │
│   │ ⚔️ Stone Back Workout           │       │
│   │    22:15 • +220 XP • 🏋️ Back    │       │
│   └─────────────────────────────────┘       │
│                                             │
│   DEC 28                                    │
│   ┌─────────────────────────────────┐       │
│   │ 👹 Iron Golem (Phase 1)         │       │
│   │    35:40 • +350 XP • ⚔️ Boss     │       │
│   └─────────────────────────────────┘       │
│                                             │
│   [Load More]                               │
└─────────────────────────────────────────────┘
```

---

## 🔗 Integration Points

### After Completing Session

```typescript
async function updateStats(session: CompletedSession) {
  // 1. Update streak
  await updateStreak(session.performedAt);

  // 2. Check for personal records
  const newRecords = await checkPersonalRecords(session);

  // 3. Update daily aggregates
  await updateDailyStats(session);

  // 4. Update muscle stats
  await updateMuscleStats(session.exercises);

  return { newRecords };
}
```

### Fetching Dashboard Data

```typescript
async function getStatsDashboard(): Promise<StatsDashboard> {
  const [streak, weeklyActivity, muscleBalance, records] = await Promise.all([
    getStreakData(),
    getWeeklyActivity(),
    getMuscleBalance(30), // Last 30 days
    getPersonalRecords(),
  ]);

  return { streak, weeklyActivity, muscleBalance, records };
}
```

---

## 🎮 Design Philosophy

### Why Statistics Matter

1. **Motivation**: Seeing progress keeps users engaged
2. **Awareness**: Muscle balance prevents injuries
3. **Goals**: Records give something to beat
4. **Habits**: Streaks encourage consistency

### Privacy First

- All data stored locally (offline-first)
- No cloud sync by default
- User owns their data
- Export functionality (future)
