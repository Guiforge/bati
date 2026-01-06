# 🧙‍♂️ COACH UX SPECIFICATION

**Date:** 2026-01-06  
**Feature:** Coach & Planning System (Phase 3)  
**Style:** High-Tech RPG HUD (Dark Fantasy)  
**Reference:** `docs/COACH.md` + `_bmad-output/planning-artifacts/COACH_INTELLIGENCE_SPEC.md`  
**Created by:** Sally (UX Designer Agent)

---

## 🎯 Vision Statement

> "The Coach is your silent mentor—analyzing your training, detecting weak areas, and crafting personalized adventure plans. It never nags, never judges, only guides when you need it."

**Design Pillars:**
1. **Non-Intrusive** - Suggestions, not commands
2. **Context-Aware** - Knows your history, adapts to progress
3. **Actionable** - One tap from suggestion to workout
4. **Transparent** - Explains WHY it suggests something

---

## 🚨 Current Implementation Status

### **From Audit:**
- ✅ **Database:** `goals` table exists, `training_plans` table exists
- ✅ **Goal Setting:** UI exists (`app/goals.tsx`)
- ❌ **Coach Interface:** NO dedicated coach UI
- ❌ **Auto-Generate:** Algorithm not implemented
- ❌ **Recommendations:** No weak area detection displayed

**Gap:** Structure exists, but NO USER-FACING COACH EXPERIENCE.

---

## 🏗️ Coach UX Architecture

### **Where Does Coach Live?**

**Option A:** New Tab (Coach becomes 5th tab)  
❌ Too prominent, users ignore if not interested

**Option B:** Modal from Home (tap coach icon)  
✅ **RECOMMENDED** - Discoverable but not forced

**Option C:** Embedded in Goals page  
⚠️ Confusing (goals = user input, coach = system output)

**Decision:** **Option B** - Coach icon on Home, opens modal

---

## 📐 Coach Interface Layout

### **1. Coach Icon on Home (Entry Point)**

```
HOME PAGE (TOP RIGHT)
┌─────────────────────────────────────────────┐
│  [Avatar] Guiforge   Lvl 12       [🧙‍♂️]     │  ← Coach icon
│  ═══════════════░░░░ 75% XP                 │
└─────────────────────────────────────────────┘
```

**Visual Specs:**
- Icon: `🧙‍♂️` (wizard emoji) OR custom coach icon
- Position: Top right corner (next to settings icon)
- Badge: Shows count if new recommendations (e.g., `🧙‍♂️ 2`)
- Glow: Pulses softly when new suggestion available
- Tap: Opens Coach Modal

**Code:**
```tsx
<Pressable onPress={openCoachModal}>
  <YStack position="relative">
    <GameIcon name="sparkles" size={28} color="$primary" />
    {newRecommendationsCount > 0 && (
      <YStack
        position="absolute"
        top={-4}
        right={-4}
        bg="$error"
        width={18}
        height={18}
        borderRadius="$full"
        items="center"
        justify="center"
      >
        <Text fontSize={10} color="white" fontWeight="bold">
          {newRecommendationsCount}
        </Text>
      </YStack>
    )}
  </YStack>
</Pressable>
```

---

### **2. Coach Modal (Main Interface)**

**Layout:**

```
┌─────────────────────────────────────────────┐
│  🧙‍♂️ YOUR COACH              [X]            │  ← Header
├─────────────────────────────────────────────┤
│                                             │
│  📊 PROGRESS SNAPSHOT                       │  ← Stats Card
│  ┌─────────────────────────────────────┐   │
│  │  This Week: 3/4 sessions ✅         │   │
│  │  Streak: 🔥🔥🔥 7 days              │   │
│  │  Muscle Balance: ⚖️ Excellent       │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  💡 RECOMMENDATIONS (2 new)                 │  ← Reco Card
│  ┌─────────────────────────────────────┐   │
│  │  ⚠️ Weak Area Detected               │   │
│  │  Your back training is falling       │   │
│  │  behind. Try a back-focused quest.   │   │
│  │                                      │   │
│  │  [Try "Stone Back" Quest]            │   │  ← CTA
│  └─────────────────────────────────────┘   │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │  🎯 Goal Update                      │   │
│  │  Great progress on your Strength     │   │
│  │  goal! Keep this up for 2 more       │   │
│  │  sessions to complete this week.     │   │
│  │                                      │   │
│  │  [View Goal Progress]                │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  📅 SUGGESTED PLAN                          │  ← Plan Card
│  ┌─────────────────────────────────────┐   │
│  │  "THE WARRIOR'S PATH"                │   │
│  │  4-week strength adventure           │   │
│  │  3 sessions/week • 30 min each       │   │
│  │                                      │   │
│  │  [Generate Plan]                     │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  [Close]                                    │
└─────────────────────────────────────────────┘
```

---

### **Component Breakdown:**

#### **A. Progress Snapshot Card**

**Purpose:** Show user's current status at a glance

**Content:**
- Sessions completed this week (vs goal)
- Current streak (flame count)
- Muscle balance assessment (Excellent / Good / Imbalanced)

**Visual Specs:**
- Background: `$glassBg`
- Border: 1px `$glassBorder`
- Padding: `$4`
- Gap: `$2`

**Code:**
```tsx
<GlassCard>
  <YStack gap="$3">
    <Text fontFamily="$heading" fontSize="$5" color="$text">
      📊 {t("coach.progress_snapshot")}
    </Text>

    {/* Sessions This Week */}
    <XStack justify="space-between" items="center">
      <Text fontSize="$3" color="$textSecondary">
        {t("coach.this_week")}
      </Text>
      <XStack items="center" gap="$2">
        <Text fontSize="$4" fontWeight="bold" color="$primary">
          {completedSessions}/{goalSessions}
        </Text>
        {completedSessions >= goalSessions ? (
          <GameIcon name="check-circle" size={20} color="$success" />
        ) : (
          <Progress 
            value={(completedSessions / goalSessions) * 100} 
            size="$1" 
            width={60}
          >
            <Progress.Indicator bg="$primary" />
          </Progress>
        )}
      </XStack>
    </XStack>

    {/* Streak */}
    <XStack justify="space-between" items="center">
      <Text fontSize="$3" color="$textSecondary">
        {t("coach.streak")}
      </Text>
      <XStack items="center" gap="$1">
        {Array.from({ length: Math.min(streakDays, 7) }).map((_, i) => (
          <Text key={i} fontSize={18}>🔥</Text>
        ))}
        <Text fontSize="$4" fontWeight="bold" color="$text">
          {streakDays} {t("common.days")}
        </Text>
      </XStack>
    </XStack>

    {/* Muscle Balance */}
    <XStack justify="space-between" items="center">
      <Text fontSize="$3" color="$textSecondary">
        {t("coach.muscle_balance")}
      </Text>
      <XStack items="center" gap="$2">
        <Text 
          fontSize="$3" 
          fontWeight="bold" 
          color={muscleBalanceColor}
        >
          {muscleBalanceLabel}
        </Text>
        {muscleBalanceIcon}
      </XStack>
    </XStack>
  </YStack>
</GlassCard>
```

**Muscle Balance Logic:**
```typescript
type MuscleBalanceLevel = "excellent" | "good" | "imbalanced";

function calculateMuscleBalance(history: SessionHistory[]): MuscleBalanceLevel {
  const muscleGroups = ["arms", "back", "chest", "abs", "shoulder", "calf"];
  const counts = muscleGroups.map(muscle => 
    history.filter(s => s.primaryMuscle === muscle).length
  );

  const max = Math.max(...counts);
  const min = Math.min(...counts);
  const ratio = max > 0 ? min / max : 0;

  if (ratio >= 0.7) return "excellent";  // Within 30% of each other
  if (ratio >= 0.4) return "good";       // Within 60%
  return "imbalanced";                   // >60% difference
}
```

---

#### **B. Recommendations Card (Smart Suggestions)**

**Purpose:** Show personalized, actionable suggestions

**Recommendation Types:**

| Type | Icon | Trigger | Message Example | CTA |
|------|------|---------|-----------------|-----|
| **Weak Area** | ⚠️ | Muscle < 40% of most-trained | "Your back is falling behind" | "Try [Quest Name]" |
| **Rest Needed** | 😴 | 5+ consecutive days | "You're crushing it! Rest day?" | "Skip Today" |
| **Streak Risk** | 🔥 | No workout in 2+ days | "Don't lose your flame!" | "Quick Workout" |
| **Level Up** | ⚡ | Avg completion >90% | "Ready for a challenge?" | "Try Hard Mode" |
| **Goal Milestone** | 🎯 | Near weekly goal | "2 more sessions = goal!" | "View Goal" |
| **New Content** | ✨ | New quest unlocked | "New quest available!" | "View Quest" |

**Visual Specs:**
- Each recommendation = separate GlassCard
- Icon: 32px emoji or GameIcon
- Message: 2-3 lines max
- CTA: HUDButton (primary style)
- Dismissable: Small X button (top right)

**Code:**
```tsx
function RecommendationCard({ recommendation }: { recommendation: Recommendation }) {
  const { t } = useTranslation();
  const { lightImpact } = useHaptics();

  return (
    <GlassCard position="relative">
      {/* Dismiss Button */}
      <Pressable 
        position="absolute" 
        top="$2" 
        right="$2"
        onPress={() => dismissRecommendation(recommendation.id)}
      >
        <GameIcon name="x" size={16} color="$textSecondary" />
      </Pressable>

      <YStack gap="$3" pr="$6">
        {/* Icon + Title */}
        <XStack items="center" gap="$3">
          <Text fontSize={32}>{recommendation.icon}</Text>
          <Text fontFamily="$heading" fontSize="$4" color="$text">
            {t(`coach.reco_${recommendation.type}_title`)}
          </Text>
        </XStack>

        {/* Message */}
        <Text fontSize="$3" color="$textSecondary" lineHeight="$4">
          {recommendation.message}
        </Text>

        {/* CTA */}
        {recommendation.action && (
          <HUDButton 
            size="small" 
            onPress={() => {
              lightImpact();
              handleRecommendationAction(recommendation.action);
            }}
          >
            {recommendation.action.label}
          </HUDButton>
        )}
      </YStack>
    </GlassCard>
  );
}
```

---

#### **C. Suggested Plan Card**

**Purpose:** Offer to auto-generate personalized adventure plan

**States:**

**State 1: No Active Plan**
```
┌─────────────────────────────────────────────┐
│  📅 SUGGESTED PLAN                          │
│  ┌─────────────────────────────────────┐   │
│  │  "THE WARRIOR'S PATH"                │   │
│  │  4-week strength adventure           │   │
│  │  3 sessions/week • 30 min each       │   │
│  │                                      │   │
│  │  Based on your goal: Strength        │   │
│  │                                      │   │
│  │  [Generate Plan]                     │   │
│  └─────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

**State 2: Active Plan**
```
┌─────────────────────────────────────────────┐
│  📅 CURRENT PLAN                            │
│  ┌─────────────────────────────────────┐   │
│  │  "THE WARRIOR'S PATH"                │   │
│  │  Week 2 of 4 • 6/12 sessions         │   │
│  │  ████████░░░░ 50% complete           │   │
│  │                                      │   │
│  │  Next: "Iron Arms" on Friday         │   │
│  │                                      │   │
│  │  [View Plan Details]                 │   │
│  └─────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

**State 3: Plan Completed**
```
┌─────────────────────────────────────────────┐
│  🎉 PLAN COMPLETE!                          │
│  ┌─────────────────────────────────────┐   │
│  │  You completed "The Warrior's Path"! │   │
│  │                                      │   │
│  │  12/12 sessions • 4 weeks            │   │
│  │  +1,200 prestige earned              │   │
│  │                                      │   │
│  │  [Generate New Plan]                 │   │
│  └─────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

**Code:**
```tsx
function SuggestedPlanCard({ plan }: { plan: TrainingPlan | null }) {
  const { t } = useTranslation();

  if (!plan) {
    // State 1: No plan
    return (
      <GlassCard>
        <YStack gap="$3">
          <Text fontFamily="$heading" fontSize="$5" color="$text">
            📅 {t("coach.suggested_plan")}
          </Text>
          
          <YStack gap="$2">
            <Text fontSize="$5" fontWeight="bold" color="$text">
              "{suggestedPlanTitle}"
            </Text>
            <Text fontSize="$3" color="$textSecondary">
              {plan.duration} • {plan.sessionsPerWeek} sessions/week
            </Text>
            <Text fontSize="$3" color="$textSecondary">
              {t("coach.based_on_goal")}: {userGoal.type}
            </Text>
          </YStack>

          <HUDButton onPress={generatePlan}>
            {t("coach.generate_plan")}
          </HUDButton>
        </YStack>
      </GlassCard>
    );
  }

  if (plan.status === "completed") {
    // State 3: Completed
    return (
      <GlassCard>
        <YStack gap="$3" items="center">
          <Text fontSize={48}>🎉</Text>
          <Text fontFamily="$heading" fontSize="$5" color="$primary">
            {t("coach.plan_complete")}
          </Text>
          <Text fontSize="$3" color="$textSecondary" textAlign="center">
            {t("coach.completed_plan", { name: plan.title })}
          </Text>
          <Text fontSize="$3" color="$text">
            {plan.completedSessions}/{plan.totalSessions} sessions • {plan.duration}
          </Text>
          <HUDButton onPress={generateNewPlan}>
            {t("coach.generate_new_plan")}
          </HUDButton>
        </YStack>
      </GlassCard>
    );
  }

  // State 2: Active plan
  return (
    <GlassCard>
      <YStack gap="$3">
        <Text fontFamily="$heading" fontSize="$5" color="$text">
          📅 {t("coach.current_plan")}
        </Text>
        
        <YStack gap="$2">
          <Text fontSize="$5" fontWeight="bold" color="$text">
            "{plan.title}"
          </Text>
          <Text fontSize="$3" color="$textSecondary">
            {t("coach.week_of", { current: plan.currentWeek, total: plan.totalWeeks })} • 
            {plan.completedSessions}/{plan.totalSessions} sessions
          </Text>
        </YStack>

        <Progress value={(plan.completedSessions / plan.totalSessions) * 100} size="$2">
          <Progress.Indicator bg="$primary" />
        </Progress>

        <Text fontSize="$3" color="$textSecondary">
          {t("coach.next_session")}: "{plan.nextQuest.title}" on {plan.nextDate}
        </Text>

        <HUDButton variant="secondary" onPress={viewPlanDetails}>
          {t("coach.view_plan_details")}
        </HUDButton>
      </YStack>
    </GlassCard>
  );
}
```

---

## 🎬 Coach Interactions & Flows

### **Flow 1: First Time Opening Coach**

```
User taps 🧙‍♂️ icon on Home
  ↓
Coach Modal opens
  ↓
[Welcome Message Card]
  "Welcome! I'm your coach. I'll help you
   reach your fitness goals by analyzing
   your training and suggesting plans."
  
  [Get Started] [Learn More]
  ↓
If "Get Started":
  → Show recommendations (if any)
  → Show suggested plan (if goal set)
  
If "Learn More":
  → Show coach explainer (what coach does)
  → Then show main interface
```

---

### **Flow 2: Accepting a Recommendation**

```
User taps "Try [Quest Name]" in weak area recommendation
  ↓
Coach modal closes
  ↓
Navigate to Quest Details page
  ↓
Quest page highlights: "Recommended by Coach 🧙‍♂️"
  ↓
User starts quest as normal
  ↓
After session completes:
  → Victory screen shows: "Coach tip: Keep training back!"
  → Recommendation is marked as "acted upon"
```

---

### **Flow 3: Generating a Plan**

```
User taps "Generate Plan" in Coach modal
  ↓
[Loading overlay: "Analyzing your training..."]
  → Takes 2-3 seconds (shows spinner)
  ↓
[Plan Generated Modal]
  "Your personalized plan is ready!"
  
  "THE WARRIOR'S PATH"
  4 weeks • 12 sessions
  Focus: Strength
  
  Week 1:
    Mon - "Iron Arms"
    Wed - "Stone Back"
    Fri - "Chest of Steel"
  
  [Start This Plan] [Customize] [Cancel]
  ↓
If "Start This Plan":
  → Save plan to database
  → Schedule notifications
  → Close coach modal
  → Show toast: "Plan activated! 🎯"
  → Home screen now shows "Current Plan" widget
  
If "Customize":
  → Open plan customization modal
  → Let user adjust days, quests, etc.
  
If "Cancel":
  → Close modal, return to coach
```

---

### **Flow 4: Viewing Plan Details**

```
User taps "View Plan Details" in Coach modal
  ↓
Navigate to Schedule page (/schedule)
  ↓
Schedule page shows:
  - Current plan info at top
  - Calendar view with scheduled sessions
  - Progress toward plan completion
  - Option to abandon plan
  ↓
User can start scheduled session from calendar
```

---

## 📅 Plan Details Screen (NEW PAGE)

**Route:** `app/plan-details.tsx` (or part of `/schedule`)

**Layout:**
```
┌─────────────────────────────────────────────┐
│  [← Back]  PLAN DETAILS                     │
└─────────────────────────────────────────────┘
        ↓
┌─────────────────────────────────────────────┐
│  Plan Overview Card                         │
│  ┌─────────────────────────────────────┐   │
│  │  "THE WARRIOR'S PATH"                │   │
│  │  Week 2 of 4 • 50% complete          │   │
│  │  ████████░░░░                        │   │
│  └─────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
        ↓
┌─────────────────────────────────────────────┐
│  Weekly Breakdown                           │
│  ┌─────────────────────────────────────┐   │
│  │  📅 WEEK 1 (Completed) ✅            │   │
│  │  Mon - "Iron Arms" ✅                │   │
│  │  Wed - "Stone Back" ✅               │   │
│  │  Fri - "Chest of Steel" ✅           │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │  📅 WEEK 2 (In Progress)             │   │
│  │  Mon - "Full Body Forge" ✅          │   │
│  │  Wed - "Upper Power" ⬜ (today)      │   │
│  │  Fri - "Core Crusher" 📅 (planned)   │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │  📅 WEEK 3 (Upcoming)                │   │
│  │  [Show when Week 2 completes]        │   │
│  └─────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
        ↓
┌─────────────────────────────────────────────┐
│  [Abandon Plan]                             │  ← Destructive action
└─────────────────────────────────────────────┘
```

---

## 🔔 Coach Notifications

### **Notification Strategy:**

**Rule:** Coach is HELPFUL, not NAGGING.

| Notification | Frequency | When | Dismissable |
|--------------|-----------|------|-------------|
| **Daily Reminder** | Once/day | At scheduled time (e.g., 18:00) | Yes (disable in settings) |
| **Weak Area Alert** | Once/week | When imbalance detected | Yes (swipe away) |
| **Goal Milestone** | On event | When goal reached | No (celebration) |
| **Plan Progress** | End of week | Sunday evening | Yes |
| **Streak Warning** | Once/day | 2 hours before midnight | No (urgent) |

**Sample Notifications:**

```
Daily Reminder:
  "⚔️ Time for today's quest! Your village awaits."
  [Action: Open App]

Weak Area Alert:
  "⚠️ Coach tip: Your back needs attention. Try a back-focused quest this week."
  [Action: View Recommendation]

Goal Milestone:
  "🎯 Goal reached! You completed 4 sessions this week. Keep it up!"
  [Action: View Stats]

Streak Warning:
  "🔥 Don't lose your 7-day flame! Quick workout before midnight?"
  [Action: Start Quick Workout]
```

---

## 🧠 Smart Algorithms (Backend)

### **1. Weak Area Detection**

```typescript
function detectWeakAreas(history: SessionHistory[]): MuscleCode[] {
  const muscleGroups: MuscleCode[] = ["arms", "back", "chest", "abs", "shoulder", "calf"];
  
  // Count sessions per muscle (last 4 weeks)
  const counts = muscleGroups.map(muscle => ({
    muscle,
    count: history.filter(s => 
      s.primaryMuscle === muscle && 
      isWithinWeeks(s.date, 4)
    ).length
  }));

  const max = Math.max(...counts.map(c => c.count));
  
  // Any muscle < 50% of max is considered "weak"
  const weakMuscles = counts
    .filter(c => c.count < max * 0.5)
    .map(c => c.muscle);

  return weakMuscles;
}
```

### **2. Plan Generation**

```typescript
async function generatePlan(goal: UserGoal): Promise<TrainingPlan> {
  const { type, daysPerWeek, sessionMinutes } = goal;
  
  // Step 1: Select quest pool based on goal
  const questPool = await selectQuestsForGoal(type, sessionMinutes);
  
  // Step 2: Check user history for weak areas
  const weakMuscles = detectWeakAreas(await getUserHistory());
  
  // Step 3: Prioritize quests that address weak areas
  const prioritizedQuests = prioritizeQuests(questPool, weakMuscles);
  
  // Step 4: Create adventure structure (4-8 quests)
  const totalSessions = daysPerWeek * 4; // 4 weeks
  const selectedQuests = prioritizedQuests.slice(0, totalSessions);
  
  // Step 5: Add boss fight at end (if adventure)
  if (selectedQuests.length >= 5) {
    selectedQuests[selectedQuests.length - 1] = selectBossFight(type);
  }
  
  // Step 6: Generate adventure narrative
  const adventure = await createAdventure({
    title: generatePlanTitle(type),
    description: generatePlanDescription(type, daysPerWeek),
    steps: selectedQuests.map((q, i) => ({
      questId: q.id,
      stepIndex: i,
      narrative: generateStepNarrative(i, selectedQuests.length)
    }))
  });
  
  // Step 7: Create schedule
  const schedule = generateSchedule(daysPerWeek, new Date());
  
  return {
    adventure,
    schedule,
    status: "active",
    createdAt: new Date()
  };
}
```

### **3. Recommendation Engine**

```typescript
function generateRecommendations(user: User): Recommendation[] {
  const recommendations: Recommendation[] = [];
  const history = getUserHistory(user.id);
  const goal = getUserGoal(user.id);

  // Recommendation 1: Weak Area
  const weakMuscles = detectWeakAreas(history);
  if (weakMuscles.length > 0) {
    const muscle = weakMuscles[0]; // Focus on weakest
    const quest = findQuestByMuscle(muscle);
    
    recommendations.push({
      type: "weak_area",
      icon: "⚠️",
      message: t("coach.weak_area_message", { muscle }),
      action: {
        label: t("coach.try_quest", { quest: quest.title }),
        type: "navigate",
        destination: `/quests/${quest.id}`
      }
    });
  }

  // Recommendation 2: Rest Day
  const consecutiveDays = getConsecutiveDays(history);
  if (consecutiveDays >= 5) {
    recommendations.push({
      type: "rest",
      icon: "😴",
      message: t("coach.rest_message"),
      action: null // No action, just info
    });
  }

  // Recommendation 3: Level Up Difficulty
  const avgCompletion = getAverageCompletion(history);
  if (avgCompletion > 0.9) {
    recommendations.push({
      type: "difficulty",
      icon: "⚡",
      message: t("coach.difficulty_message"),
      action: {
        label: t("coach.try_hard_mode"),
        type: "navigate",
        destination: "/settings#difficulty"
      }
    });
  }

  // Recommendation 4: Goal Milestone
  if (goal) {
    const progress = getWeeklyProgress(history, goal);
    const remaining = goal.sessionsPerWeek - progress.completed;
    
    if (remaining > 0 && remaining <= 2) {
      recommendations.push({
        type: "goal_milestone",
        icon: "🎯",
        message: t("coach.goal_milestone", { remaining }),
        action: {
          label: t("coach.view_goal"),
          type: "navigate",
          destination: "/goals"
        }
      });
    }
  }

  return recommendations.slice(0, 3); // Max 3 recommendations
}
```

---

## ✅ Acceptance Criteria

### **Visual:**
- [ ] Coach icon visible on Home (top right)
- [ ] Icon shows badge if new recommendations
- [ ] Coach modal uses glassmorphism
- [ ] Progress snapshot card shows stats correctly
- [ ] Recommendations are dismissable (X button)
- [ ] Suggested plan card shows correct state
- [ ] Plan details page shows weekly breakdown

### **Functional:**
- [ ] Tapping coach icon opens modal
- [ ] Recommendations are actionable (navigate to quest/goal)
- [ ] "Generate Plan" creates adventure in database
- [ ] Plan schedule updates weekly progress
- [ ] Dismissing recommendation removes it
- [ ] Weak area detection works (shows correct muscle)
- [ ] Muscle balance calculates correctly
- [ ] Notifications respect user preferences

### **Content:**
- [ ] All messages localized (EN + FR)
- [ ] Recommendation messages are clear and actionable
- [ ] Plan titles are thematic and inspiring
- [ ] Coach never uses negative language ("failing", "bad")
- [ ] Recommendations explain WHY (not just "do this")

### **Accessibility:**
- [ ] Coach icon is 44x44pt minimum
- [ ] All cards have 4.5:1 contrast
- [ ] Recommendations are keyboard-navigable
- [ ] Screen reader labels on all interactive elements

---

## 🎯 User Stories Validation

1. ✅ **"I want to know if I'm training balanced"**
   - Progress snapshot shows muscle balance

2. ✅ **"I want personalized workout suggestions"**
   - Recommendations detect weak areas

3. ✅ **"I want a training plan generated for me"**
   - Suggested plan card + generate flow

4. ✅ **"I want to know when to rest"**
   - Rest recommendation after 5+ consecutive days

5. ✅ **"I want to track my goal progress"**
   - Goal milestone recommendations

6. ✅ **"I want reminders without spam"**
   - 1 daily reminder max, dismissable

7. ✅ **"I want to understand WHY coach suggests something"**
   - Every recommendation explains reason

8. ✅ **"I want to ignore coach if I prefer self-guided"**
   - Coach is modal (not forced), can dismiss recommendations

---

## 🚀 Implementation Plan

### **Phase 1: Coach Modal & Recommendations** (Weeks 1-2)

**Tasks:**
1. Add coach icon to Home page (top right)
2. Create CoachModal component
3. Create ProgressSnapshotCard component
4. Create RecommendationCard component
5. Implement weak area detection algorithm
6. Implement recommendation engine
7. Add dismiss recommendation functionality
8. Add notification preference settings

**Deliverable:** Basic coach with smart recommendations

---

### **Phase 2: Plan Generation** (Weeks 3-4)

**Tasks:**
1. Create SuggestedPlanCard component
2. Implement plan generation algorithm
3. Create plan-details page
4. Add weekly schedule view
5. Implement plan progress tracking
6. Add "Abandon Plan" flow
7. Add plan completion celebration

**Deliverable:** Auto-generated adventure plans

---

### **Phase 3: Notifications & Polish** (Week 5)

**Tasks:**
1. Implement daily reminder notifications
2. Implement weak area alert notifications
3. Implement goal milestone notifications
4. Implement streak warning notifications
5. Add notification preference UI
6. Add coach onboarding (first-time modal)
7. Analytics tracking (recommendation acceptance rate)

**Deliverable:** Complete coach system with notifications

---

## 🏆 Final Notes

**The Coach is your SECRET WEAPON for retention.**

Users who engage with coach should:
- ✅ Complete 20% more sessions (personalized plans)
- ✅ Have 15% higher 30-day retention (goal-driven)
- ✅ Train 30% more balanced (weak area detection)

**The Coach NEVER:**
- ❌ Shames users ("You missed a workout")
- ❌ Spams notifications (1/day max)
- ❌ Forces plans (always optional)
- ❌ Uses technical jargon ("hypertrophy", "progressive overload")

**The Coach ALWAYS:**
- ✅ Encourages ("Great progress!")
- ✅ Explains WHY ("Your back is falling behind")
- ✅ Offers solutions ("Try this quest")
- ✅ Celebrates wins ("Goal reached!")

**Ready to empower users with a smart, empathetic coach?** 🧙‍♂️⚔️✨
