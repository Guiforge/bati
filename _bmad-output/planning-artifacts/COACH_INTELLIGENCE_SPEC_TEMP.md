# 🤖 COACH INTELLIGENCE - AUTO-PLANNING SPECIFICATION

**Date:** 2026-01-06  
**Feature ID:** PHASE-3B-COACH-INTELLIGENCE  
**Status:** SPECIFICATION (Partially Implemented)  
**Effort Estimate:** 3-4 weeks (1 developer)

---

## 🎯 Vision

> "The Coach analyzes your training history, detects weak areas, and automatically generates personalized adventure plans."

---

## 📋 Current State vs Target

### **Implemented (Phase 3a):**
- ✅ Goal setting UI
- ✅ Weekly progress tracking
- ✅ Goal cards

### **Missing (Phase 3b):**
- ❌ Auto-generate adventures from goals
- ❌ Analyze user history (weak areas)
- ❌ Progressive overload logic
- ❌ Smart quest recommendations

---

## 🧠 Core Algorithms

### **1. History Analysis**

```typescript
interface TrainingAnalysis {
  muscleBalance: Record<MuscleGroup, number>;
  patterns: {
    averageSessionsPerWeek: number;
    preferredDays: DayOfWeek[];
    averageDuration: number;
  };
  progression: {
    xpGrowthRate: number;
    completionRate: number;
  };
  weakAreas: {
    leastTrainedMuscle: MuscleGroup;
    inconsistentDays: DayOfWeek[];
  };
}
```

### **2. Quest Scoring Algorithm**

Scores quests 0-100 based on:
- Goal type match (40 pts)
- Duration fit (20 pts)
- Difficulty match (20 pts)
- Variety bonus (10 pts)
- Progressive overload (10 pts)

### **3. Adventure Generator**

```typescript
export async function generateAdventureFromGoal(
  goalId: number
): Promise<GeneratedAdventure> {
  const goal = await getGoal(goalId);
  const analysis = await analyzeTrainingHistory();
  
  // 1. Score all quests
  const scoredQuests = await scoreQuestsForGoal(goal, analysis);
  
  // 2. Select top quests with variety
  const selectedQuests = selectQuestsWithVariety(
    scoredQuests,
    goal.sessionsPerWeek * 2  // 2 weeks
  );
  
  // 3. Order by progression (easy → hard)
  const orderedQuests = orderByProgression(selectedQuests);
  
  // 4. Generate theme & narratives
  const theme = determineTheme(goal.goalType);
  const steps = createStepsWithNarratives(orderedQuests, theme);
  
  return { title, steps, theme };
}
```

---

## 📈 Progressive Overload

Gradually increases difficulty based on completion rate:
- **>80% completion** → Increase difficulty
- **<60% completion** → Decrease difficulty
- **Default** → Stay at current level with variety

---

## 💤 Rest Day Recommendations

Coach suggests rest when:
- 5+ consecutive workout days
- Average >6 sessions/week
- Completion rate dropping (<50%)

---

## 📊 Database Schema

```sql
CREATE TABLE generated_adventures (
  id INTEGER PRIMARY KEY,
  goal_id INTEGER REFERENCES goals(id),
  title TEXT NOT NULL,
  theme TEXT NOT NULL,
  status TEXT DEFAULT 'draft',
  generated_at INTEGER
);

CREATE TABLE generated_adventure_steps (
  id INTEGER PRIMARY KEY,
  adventure_id INTEGER REFERENCES generated_adventures(id),
  step_index INTEGER,
  quest_id INTEGER REFERENCES quests(id),
  en_narrative TEXT,
  fr_narrative TEXT,
  suggested_difficulty TEXT,
  suggested_day_of_week INTEGER
);
```

---

## 🎨 UI Components

### **1. Adventure Preview**
Shows generated adventure with explanation:
- "Based on your history..."
- Weak areas highlighted
- Schedule preview
- [Start] or [Modify] options

### **2. Rest Day Card**
Appears on Home when rest recommended:
- Coach message
- [I'll Rest] or [Train Anyway]

---

## 🚀 Implementation Plan

**Phase 3b.1 (1 week):** Analysis engine  
**Phase 3b.2 (1 week):** Quest scoring  
**Phase 3b.3 (1 week):** Adventure generator  
**Phase 3b.4 (1 week):** UI & polish

---

## ✅ Success Criteria

- ✅ Adventures target weak areas
- ✅ Difficulty feels appropriate
- ✅ 70%+ completion rate
- ✅ Users trust recommendations

---

**Full detailed spec available in original document.**
