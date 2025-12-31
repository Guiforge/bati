# Coach & Planning System

## Overview

The Coach feature helps users set fitness goals and automatically generates adventure plans to achieve them. It's the "smart" layer that bridges the gap between "I want to get stronger" and "Here's exactly what to do."

---

## 🎯 Goal Setting

### Goal Types

| Goal | Description | Measurement |
|------|-------------|-------------|
| **Strength** | Build muscle, increase power | Reps increase, weight progression |
| **Endurance** | Improve stamina | Session duration, rest reduction |
| **Flexibility** | Increase mobility | Stretch time, range exercises |
| **Consistency** | Build habit | Sessions per week, streak |
| **Balanced** | Well-rounded fitness | All muscle groups trained |

### Goal Configuration

```
┌─────────────────────────────────────────────┐
│           🎯 SET YOUR GOAL                  │
├─────────────────────────────────────────────┤
│                                             │
│   What's your main focus?                   │
│                                             │
│   [💪 Strength]  [🏃 Endurance]             │
│   [🧘 Flexibility]  [⚖️ Balanced]           │
│                                             │
│   How many days per week?                   │
│   [ 2 ]  [ 3 ]  [ 4 ]  [ 5+ ]              │
│                                             │
│   Preferred session length?                 │
│   [15 min]  [30 min]  [45 min]             │
│                                             │
│         [Generate My Plan]                  │
└─────────────────────────────────────────────┘
```

---

## 📅 Auto-Generated Plans

### How It Works

1. **Analyze Goal** — What does the user want to achieve?
2. **Check History** — What have they done before? Weak areas?
3. **Select Quests** — Pick appropriate quests from library
4. **Create Adventure** — Chain quests into a themed adventure
5. **Schedule** — Suggest optimal days/times

### Plan Structure

```typescript
interface GeneratedPlan {
  adventure: {
    title: string;         // "Path to Strength"
    description: string;
    steps: QuestStep[];    // 4-8 quests
    estimatedDuration: string; // "2 weeks"
  };
  schedule: {
    daysPerWeek: number;
    suggestedDays: DayOfWeek[];
    reminderTime: string;  // "18:00"
  };
  milestones: Milestone[];  // Progress checkpoints
}
```

### Example Generated Adventure

**Goal**: Strength + 3 days/week + 30 min sessions

```
🗡️ THE WARRIOR'S PATH
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Week 1:
  📅 Mon - Quest: "Iron Arms" (Arms focus)
  📅 Wed - Quest: "Stone Back" (Back focus)
  📅 Fri - Quest: "Chest of Steel" (Chest focus)

Week 2:
  📅 Mon - Quest: "Full Body Forge"
  📅 Wed - Quest: "Upper Body Power"
  📅 Fri - 👹 BOSS: "The Iron Golem"

Estimated duration: 2 weeks
Total sessions: 6
```

---

## 🔔 Notification System

### Notification Types

| Type | When | Message Example |
|------|------|-----------------|
| **Reminder** | Scheduled time | "Time for today's quest! 💪" |
| **Streak Warning** | 2 hours before midnight | "Don't lose your flame! 🔥" |
| **Encouragement** | After 2 days inactive | "Your village misses you! 🏰" |
| **Achievement** | On unlock | "New building unlocked! 🎉" |
| **Boss Ready** | Adventure near end | "The boss awaits... ⚔️" |

### Notification Preferences

```
┌─────────────────────────────────────────────┐
│           🔔 NOTIFICATIONS                  │
├─────────────────────────────────────────────┤
│                                             │
│   Daily Reminder         [ON] [OFF]         │
│   ⏰ Time: [18:00] ▼                        │
│                                             │
│   Streak Reminders       [ON] [OFF]         │
│                                             │
│   Achievement Alerts     [ON] [OFF]         │
│                                             │
│   Weekly Summary         [ON] [OFF]         │
│                                             │
└─────────────────────────────────────────────┘
```

---

## 📊 Progress Tracking

### Weekly View

```
┌─────────────────────────────────────────────┐
│           📅 THIS WEEK                      │
├─────────────────────────────────────────────┤
│                                             │
│   Mon   Tue   Wed   Thu   Fri   Sat   Sun   │
│   [✅]  [ ]   [✅]  [ ]   [⬜]  [ ]   [ ]    │
│                                             │
│   Completed: 2/3 sessions                   │
│   Next: "Iron Arms" on Friday               │
│                                             │
│   [View Full Plan]                          │
└─────────────────────────────────────────────┘

```

### Progress Indicators

- ✅ Completed session
- ⬜ Planned session (today)
- 📅 Planned session (future)
- ⚠️ Missed session
- 🔥 Bonus session (extra workout)

---

## 🧠 Smart Recommendations

### Based on History

```typescript
function generateRecommendations(user: User): Recommendation[] {
  const history = getWorkoutHistory(user.id);
  const muscleBalance = analyzeMuscleBalance(history);

  const recommendations = [];

  // Weak area detection
  if (muscleBalance.back < 0.5) {
    recommendations.push({
      type: 'weak_area',
      message: "Your back is falling behind! Try a back-focused quest.",
      suggestedQuest: findQuestByMuscle('back')
    });
  }

  // Rest suggestion
  if (consecutiveDays(history) >= 5) {
    recommendations.push({
      type: 'rest',
      message: "You've been crushing it! Consider a rest day.",
    });
  }

  // Progression
  if (averageCompletion(history) > 0.9) {
    recommendations.push({
      type: 'difficulty',
      message: "Ready for a challenge? Try Hard mode!",
    });
  }

  return recommendations;
}
```

---

## 💾 Database Schema

```sql
-- User goals
CREATE TABLE user_goals (
  id INTEGER PRIMARY KEY,
  goal_type TEXT NOT NULL,        -- 'strength', 'endurance', etc.
  days_per_week INTEGER NOT NULL,
  session_minutes INTEGER NOT NULL,
  created_at INTEGER,
  updated_at INTEGER
);

-- Generated plans
CREATE TABLE training_plans (
  id INTEGER PRIMARY KEY,
  user_goal_id INTEGER REFERENCES user_goals(id),
  adventure_id INTEGER REFERENCES adventures(id),
  start_date INTEGER,
  end_date INTEGER,
  status TEXT DEFAULT 'active',   -- 'active', 'completed', 'abandoned'
  created_at INTEGER
);

-- Scheduled sessions
CREATE TABLE scheduled_sessions (
  id INTEGER PRIMARY KEY,
  plan_id INTEGER REFERENCES training_plans(id),
  quest_id INTEGER REFERENCES quests(id),
  scheduled_date INTEGER,
  reminder_time TEXT,             -- "18:00"
  status TEXT DEFAULT 'pending',  -- 'pending', 'completed', 'missed'
  completed_session_id INTEGER    -- Link to actual completion
);
```

---

## 🔗 Integration Points

### Plan Generation Flow

```typescript
async function createTrainingPlan(goal: UserGoal): Promise<TrainingPlan> {
  // 1. Select appropriate quests
  const quests = selectQuestsForGoal(goal);

  // 2. Create adventure structure
  const adventure = await createAdventure({
    title: generateTitle(goal),
    steps: quests.map((q, i) => ({
      questId: q.id,
      stepIndex: i,
      narrative: generateNarrative(i, quests.length)
    }))
  });

  // 3. Generate schedule
  const schedule = generateSchedule(goal.daysPerWeek, goal.startDate);

  // 4. Create scheduled sessions
  for (const { date, questId } of schedule) {
    await createScheduledSession({
      planId: adventure.id,
      questId,
      scheduledDate: date,
      reminderTime: goal.preferredTime
    });
  }

  // 5. Set up notifications
  await scheduleNotifications(schedule, goal);

  return plan;
}
```

---

## 🎮 Design Philosophy

### Why Automation?

1. **Reduce Friction** — User says "I want strength", system does the rest
2. **Expert Knowledge** — Algorithm knows balanced training
3. **Consistency** — Scheduled reminders build habits
4. **Adaptability** — Plans adjust based on completion

### What Users Control

- Goal type
- Days per week
- Session length
- Notification preferences

### What System Controls

- Quest selection
- Adventure structure
- Progression difficulty
- Recovery recommendations
