# 🎯 ADVANCED GOALS - PERSONALIZED MILESTONES SPECIFICATION

**Date:** 2026-01-06  
**Feature ID:** PHASE-4.5-ADVANCED-GOALS  
**Status:** SPECIFICATION (Not Implemented)  
**Effort Estimate:** 2-3 weeks (1 developer)

---

## 🎯 Vision Statement

> "Set ANY fitness goal you can imagine. The app tracks your progress and generates a personalized training plan to get you there."

**User Examples:**
- "Je veux faire 10 pompes" (Skill Milestone)
- "Je veux faire une traction à une main" (Advanced Skill)
- "Je veux améliorer mon équilibre" (Quality Goal)
- "Je veux courir un marathon" (Endurance Event)

**Core Principle:** Goals should be SPECIFIC, MEASURABLE, PERSONAL.

---

## 📋 Goal Type System

### **Taxonomy of Goals:**

```typescript
type GoalType = 
  | "skill_milestone"      // "10 pushups", "1 pullup"
  | "advanced_skill"       // "one-arm pushup", "pistol squat"
  | "quality"              // "better balance", "more flexibility"
  | "endurance_event"      // "run 5K", "bike 50km"
  | "strength_milestone"   // "bench 100kg", "deadlift 200kg"
  | "body_composition"     // "lose 5kg", "gain muscle"
  | "consistency"          // "workout 100 days straight"
  | "custom";              // User-defined text goal
```

---

## 🗂️ Database Schema

### **Extended Goals Table:**

```sql
-- Drop existing goals table (if needed)
DROP TABLE IF EXISTS goals;

-- Recreate with flexible structure
CREATE TABLE goals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  
  -- Basic Info
  title TEXT NOT NULL,                    -- User-defined title
  goal_type TEXT NOT NULL,                -- GoalType enum
  status TEXT NOT NULL DEFAULT 'active',  -- active | paused | completed | abandoned
  
  -- Type-Specific Data (JSON for flexibility)
  goal_data_json TEXT NOT NULL,          -- Stores type-specific fields
  
  -- Tracking
  current_value REAL DEFAULT 0,           -- Current progress (e.g., 7 out of 10 pushups)
  target_value REAL,                      -- Target to reach (e.g., 10)
  unit TEXT,                              -- "reps" | "seconds" | "meters" | "kg" | "days"
  
  -- Planning
  sessions_per_week INTEGER DEFAULT 3,
  session_duration_minutes INTEGER DEFAULT 30,
  target_date INTEGER,                    -- Unix timestamp (optional deadline)
  
  -- Metadata
  created_at INTEGER DEFAULT (unixepoch()),
  started_at INTEGER,
  completed_at INTEGER,
  updated_at INTEGER DEFAULT (unixepoch())
);

-- Goal progress history (track milestones)
CREATE TABLE goal_progress (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  goal_id INTEGER NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  value REAL NOT NULL,                    -- Progress value at this point
  notes TEXT,                             -- Optional notes (e.g., "First time!")
  recorded_at INTEGER DEFAULT (unixepoch())
);

-- Link goals to exercises (for tracking)
CREATE TABLE goal_exercises (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  goal_id INTEGER NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  exercise_id INTEGER NOT NULL REFERENCES exercises(id),
  is_primary BOOLEAN DEFAULT 1,           -- Primary vs supporting exercise
  created_at INTEGER DEFAULT (unixepoch())
);

CREATE INDEX idx_goal_exercises_goal ON goal_exercises(goal_id);
CREATE INDEX idx_goal_progress_goal ON goal_progress(goal_id);
```

---

## 🏗️ Goal Data Structures

### **1. Skill Milestone Goal**

**Example:** "Je veux faire 10 pompes"

```typescript
interface SkillMilestoneGoal {
  type: "skill_milestone";
  exercise_id: number;           // Reference to exercise (e.g., push-ups)
  target_reps: number;           // 10
  current_best: number;          // User's current PR (e.g., 7)
  difficulty: DifficultyCode;    // "normal" | "hard"
}

// Stored in goal_data_json:
{
  "type": "skill_milestone",
  "exercise_id": 42,
  "target_reps": 10,
  "current_best": 7,
  "difficulty": "normal"
}

// In goals table:
title: "Faire 10 pompes"
goal_type: "skill_milestone"
current_value: 7
target_value: 10
unit: "reps"
```

---

### **2. Advanced Skill Goal**

**Example:** "Je veux faire une traction à une main"

```typescript
interface AdvancedSkillGoal {
  type: "advanced_skill";
  skill_name: string;            // "One-arm pull-up"
  progression_steps: {
    step: number;                // 1, 2, 3...
    description: string;         // "Negative pull-ups"
    exercise_id?: number;        // Optional linked exercise
    target_reps?: number;
    completed: boolean;
  }[];
  current_step: number;          // Which step user is on
}

// Example progression for one-arm pull-up:
{
  "type": "advanced_skill",
  "skill_name": "One-arm pull-up",
  "progression_steps": [
    {
      "step": 1,
      "description": "Regular pull-ups (10 reps)",
      "exercise_id": 15,
      "target_reps": 10,
      "completed": true
    },
    {
      "step": 2,
      "description": "Weighted pull-ups (+10kg, 5 reps)",
      "exercise_id": 16,
      "target_reps": 5,
      "completed": true
    },
    {
      "step": 3,
      "description": "Archer pull-ups (5 reps each side)",
      "exercise_id": 17,
      "target_reps": 5,
      "completed": false
    },
    {
      "step": 4,
      "description": "Assisted one-arm pull-up (band)",
      "target_reps": 3,
      "completed": false
    },
    {
      "step": 5,
      "description": "One-arm pull-up (1 rep)",
      "target_reps": 1,
      "completed": false
    }
  ],
  "current_step": 2
}

// In goals table:
title: "Traction à une main"
goal_type: "advanced_skill"
current_value: 2  // Current step
target_value: 5   // Total steps
unit: "steps"
```

---

### **3. Quality Goal**

**Example:** "Je veux améliorer mon équilibre"

```typescript
interface QualityGoal {
  type: "quality";
  quality_name: string;          // "balance" | "flexibility" | "mobility"
  measurement_method: "time" | "progression" | "subjective";
  target_time?: number;          // For time-based (e.g., hold 60s)
  progression_exercises: number[]; // Exercise IDs that improve this quality
  self_rating: 1 | 2 | 3 | 4 | 5; // User's subjective rating
}

// Example:
{
  "type": "quality",
  "quality_name": "balance",
  "measurement_method": "time",
  "target_time": 60,  // Hold balance pose for 60 seconds
  "progression_exercises": [101, 102, 103],  // Single-leg stance, yoga poses, etc.
  "self_rating": 3  // User rates themselves 3/5 currently
}

// In goals table:
title: "Améliorer mon équilibre"
goal_type: "quality"
current_value: 30  // Current hold time in seconds
target_value: 60   // Target hold time
unit: "seconds"
```

---

### **4. Endurance Event Goal**

**Example:** "Je veux courir un marathon"

```typescript
interface EnduranceEventGoal {
  type: "endurance_event";
  event_type: "run" | "bike" | "swim" | "hike";
  distance_meters: number;       // 42195 for marathon
  target_time?: number;          // Optional target time in seconds
  current_best_distance?: number; // Longest distance achieved
  current_best_time?: number;    // Best time for that distance
  training_phase: "base" | "build" | "peak" | "taper";
}

// Example:
{
  "type": "endurance_event",
  "event_type": "run",
  "distance_meters": 42195,  // Marathon = 42.195 km
  "target_time": 14400,      // 4 hours (optional)
  "current_best_distance": 10000,  // User's longest run: 10K
  "current_best_time": 3600,       // 1 hour for 10K
  "training_phase": "base"
}

// In goals table:
title: "Courir un marathon"
goal_type: "endurance_event"
current_value: 10000  // Current longest distance
target_value: 42195   // Marathon distance
unit: "meters"
```

---

### **5. Strength Milestone Goal**

**Example:** "Je veux soulever 100kg au développé couché"

```typescript
interface StrengthMilestoneGoal {
  type: "strength_milestone";
  exercise_id: number;           // Bench press
  target_weight_kg: number;      // 100
  current_weight_kg: number;     // 70
  target_reps: number;           // 1 (1RM) or 5 (5RM)
}

// In goals table:
title: "Développé couché 100kg"
goal_type: "strength_milestone"
current_value: 70
target_value: 100
unit: "kg"
```

---

### **6. Consistency Goal**

**Example:** "Je veux m'entraîner 100 jours d'affilée"

```typescript
interface ConsistencyGoal {
  type: "consistency";
  target_days: number;           // 100
  current_streak: number;        // Calculated from sessions
  allow_rest_days: boolean;      // Can skip 1 day/week?
}

// In goals table:
title: "100 jours d'entraînement"
goal_type: "consistency"
current_value: 23  // Current streak
target_value: 100
unit: "days"
```

---

### **7. Custom Goal**

**Example:** "Je veux être capable de faire 50 burpees sans pause"

```typescript
interface CustomGoal {
  type: "custom";
  description: string;           // User's free text
  measurement_type?: "reps" | "time" | "distance" | "none";
  target_value?: number;
  current_value?: number;
  related_exercises?: number[];  // Optional linked exercises
}

// In goals table:
title: "50 burpees sans pause"
goal_type: "custom"
current_value: 25
target_value: 50
unit: "reps"
```

---

## 🎨 UI Components

### **1. Goal Creation Wizard**

```
┌─────────────────────────────────────────────┐
│  CREATE NEW GOAL                            │
├─────────────────────────────────────────────┤
│  What do you want to achieve?               │
│                                             │
│  [🎯 Master a skill]                        │
│  [🏃 Complete an event]                     │
│  [💪 Hit a strength milestone]              │
│  [🧘 Improve a quality]                     │
│  [🔥 Build consistency]                     │
│  [✏️ Custom goal]                           │
└─────────────────────────────────────────────┘
```

---

### **2. Skill Milestone Creator**

```
┌─────────────────────────────────────────────┐
│  SKILL MILESTONE                            │
├─────────────────────────────────────────────┤
│  I want to do:                              │
│  [10 ▼] [Push-ups ▼]                       │
│                                             │
│  My current best:                           │
│  [7] reps                                   │
│                                             │
│  Target date (optional):                    │
│  [March 1, 2026]                            │
│                                             │
│  Training frequency:                        │
│  [○ 3/week]  [● 4/week]  [○ 5/week]        │
│                                             │
│  [CREATE GOAL]                              │
└─────────────────────────────────────────────┘
```

---

### **3. Advanced Skill Progression**

```
┌─────────────────────────────────────────────┐
│  ADVANCED SKILL: One-Arm Pull-up            │
├─────────────────────────────────────────────┤
│  Progression Path:                          │
│                                             │
│  ✅ Step 1: Regular pull-ups (10 reps)      │
│     Completed on Jan 2, 2026                │
│                                             │
│  ✅ Step 2: Weighted pull-ups (+10kg)       │
│     Completed on Jan 5, 2026                │
│                                             │
│  🔵 Step 3: Archer pull-ups                 │
│     IN PROGRESS (3/5 reps)                  │
│     [Start Training]                        │
│                                             │
│  🔒 Step 4: Assisted one-arm (band)         │
│     LOCKED                                  │
│                                             │
│  🔒 Step 5: One-arm pull-up (1 rep)         │
│     LOCKED (Final goal!)                    │
└─────────────────────────────────────────────┘
```

---

### **4. Marathon Training Plan**

```
┌─────────────────────────────────────────────┐
│  GOAL: Run a Marathon (42.2 km)             │
│  Target Date: June 15, 2026                 │
├─────────────────────────────────────────────┤
│  Current Status:                            │
│  Longest Run: 10 km                         │
│  Progress: ████░░░░░░░░░░░░ 24%            │
│                                             │
│  Training Phase: BASE BUILDING              │
│  Week 3 of 20                               │
│                                             │
│  This Week's Plan:                          │
│  Mon: Easy 5K run                           │
│  Wed: Tempo 7K run                          │
│  Sat: Long 12K run                          │
│                                             │
│  [VIEW FULL PLAN]                           │
└─────────────────────────────────────────────┘
```

---

### **5. Goal Dashboard (Home Screen)**

```
┌─────────────────────────────────────────────┐
│  YOUR GOALS                                 │
├─────────────────────────────────────────────┤
│  🎯 Faire 10 pompes                         │
│     ███████░░░ 7/10 reps (70%)              │
│     Next session: Arms Focus                │
│                                             │
│  🏃 Courir un marathon                      │
│     ████░░░░░░░░░░░░ 10/42 km (24%)         │
│     Next: Long run Saturday                 │
│                                             │
│  🔥 100 jours d'affilée                     │
│     ████████░░░░░░░ 23/100 days (23%)       │
│     Current streak: 23 days 🔥              │
└─────────────────────────────────────────────┘
```

---

## 🤖 Coach Integration

### **Auto-Generate Training Plans for Goals**

```typescript
export async function generatePlanForGoal(goalId: number): Promise<TrainingPlan> {
  const goal = await getGoal(goalId);
  
  switch (goal.goal_type) {
    case "skill_milestone":
      return generateSkillPlan(goal);
      
    case "advanced_skill":
      return generateProgressionPlan(goal);
      
    case "endurance_event":
      return generateEndurancePlan(goal);
      
    case "strength_milestone":
      return generateStrengthPlan(goal);
      
    default:
      return generateGenericPlan(goal);
  }
}

function generateSkillPlan(goal: Goal): TrainingPlan {
  const currentBest = goal.current_value;
  const target = goal.target_value;
  const gap = target - currentBest;
  
  // Progressive rep scheme
  const weeks = Math.ceil(gap / 0.5); // ~0.5 rep improvement per week
  
  const plan = {
    weeks,
    sessionsPerWeek: goal.sessions_per_week,
    phases: [
      {
        name: "Foundation",
        weeks: Math.ceil(weeks * 0.3),
        focus: "Volume building",
        repScheme: [currentBest - 2, currentBest - 1, currentBest] // Sub-maximal
      },
      {
        name: "Strength",
        weeks: Math.ceil(weeks * 0.4),
        focus: "Max effort sets",
        repScheme: [currentBest, currentBest + 1, currentBest + 2]
      },
      {
        name: "Peak",
        weeks: Math.ceil(weeks * 0.3),
        focus: "Test and achieve",
        repScheme: [currentBest + 2, target - 1, target]
      }
    ]
  };
  
  return plan;
}
```

---

## 📊 Progress Tracking

### **Automatic Progress Detection**

```typescript
export async function updateGoalProgress(goalId: number, sessionId: number) {
  const goal = await getGoal(goalId);
  const session = await getCompletedSession(sessionId);
  
  // Find relevant exercises in the session
  const relevantExercises = session.completedExercises.filter(ex => 
    isLinkedToGoal(ex.exerciseId, goalId)
  );
  
  if (relevantExercises.length === 0) return;
  
  // Update progress based on goal type
  switch (goal.goal_type) {
    case "skill_milestone": {
      const bestRep = Math.max(...relevantExercises.map(ex => ex.resultValue));
      if (bestRep > goal.current_value) {
        await updateGoalValue(goalId, bestRep);
        
        // Check if goal is completed
        if (bestRep >= goal.target_value) {
          await completeGoal(goalId);
          showCelebration("🎉 Goal achieved! You did it!");
        } else {
          showNotification(`New PR! ${bestRep}/${goal.target_value} reps`);
        }
      }
      break;
    }
    
    case "endurance_event": {
      // Track distance from GPS or manual input
      const distance = session.metadata?.distance_meters || 0;
      if (distance > goal.current_value) {
        await updateGoalValue(goalId, distance);
      }
      break;
    }
    
    case "consistency": {
      // Update streak automatically
      const streak = await calculateStreak();
      await updateGoalValue(goalId, streak);
      
      if (streak >= goal.target_value) {
        await completeGoal(goalId);
        showCelebration("🔥 Consistency master! Goal achieved!");
      }
      break;
    }
  }
}
```

---

## 🎉 Goal Completion Celebration

```
┌─────────────────────────────────────────────┐
│                                             │
│           🎆 GOAL ACHIEVED! 🎆              │
│                                             │
│     [Trophy Animation with Confetti]        │
│                                             │
│   "FAIRE 10 POMPES"                         │
│                                             │
│   You did it! 🎉                            │
│   Started: Dec 15, 2025                     │
│   Completed: Jan 6, 2026                    │
│   Time taken: 22 days                       │
│                                             │
│   Progress:                                 │
│   0 → 7 → 10 reps ✅                        │
│                                             │
│   REWARDS:                                  │
│   ⭐ +500 XP (Goal Bonus)                   │
│   🏆 Achievement: "Push-up Master"          │
│   🎖️ Badge unlocked                         │
│                                             │
│   [SET NEW GOAL] [SHARE]                    │
└─────────────────────────────────────────────┘
```

---

## 📈 Goal Templates Library

Pre-made goal templates for quick setup:

```typescript
const GOAL_TEMPLATES = {
  beginner_pushups: {
    title: "Master Push-ups",
    type: "advanced_skill",
    steps: [
      "10 knee push-ups",
      "5 regular push-ups",
      "10 regular push-ups",
      "20 regular push-ups"
    ]
  },
  
  first_pullup: {
    title: "First Pull-up",
    type: "advanced_skill",
    steps: [
      "30 sec dead hang",
      "5 negative pull-ups",
      "Assisted pull-up (band)",
      "1 full pull-up"
    ]
  },
  
  couch_to_5k: {
    title: "Couch to 5K",
    type: "endurance_event",
    distance: 5000,
    weeks: 8,
    plan: "Progressive run/walk program"
  },
  
  hundred_day_streak: {
    title: "100-Day Streak",
    type: "consistency",
    target_days: 100,
    allow_rest_days: true  // 1 rest day per week allowed
  }
};
```

---

## 🧪 Testing Strategy

### **Test Scenarios:**

1. **Create skill goal** → Track progress → Achieve → Celebrate
2. **Create marathon goal** → Generate 20-week plan → Track runs
3. **Create advanced skill** → Complete step 1 → Unlock step 2
4. **Create consistency goal** → Workout daily → Hit milestone
5. **Goal with deadline** → Show countdown → Send reminders

---

## 🚀 Implementation Phases

### **Phase 4.5.1 (Week 1):**
- [x] Extend database schema (goals, goal_progress, goal_exercises)
- [x] Create GoalType system
- [x] Implement goal_data_json parsing

### **Phase 4.5.2 (Week 2):**
- [x] Build UI: Goal creation wizard
- [x] Implement skill milestone creator
- [x] Implement advanced skill progression view
- [x] Implement endurance event planner

### **Phase 4.5.3 (Week 3):**
- [x] Auto-progress detection
- [x] Coach integration (generate plans per goal type)
- [x] Goal completion celebration
- [x] Goal templates library

---

## ✅ Success Criteria

**Feature is successful if:**
- ✅ Users can create ANY goal type
- ✅ Progress is tracked automatically
- ✅ Coach generates relevant training plans
- ✅ Goal completion feels EPIC (confetti + rewards)
- ✅ 80%+ of created goals are actively pursued

---

## 📚 Related Documents

- **COACH_INTELLIGENCE_SPEC.md** - Auto-generate plans for goals
- **VISION_COHERENCE_ANALYSIS.md** - Gap analysis (Advanced Goals: 0%)
- **ROADMAP.md** - Phase 4.5 priority

---

**Ready to let users set their OWN finish line?** 🎯💪
