---
story_id: "8.4"
story_key: "8-4-auto-generate-4-week-training-plans"
epic: "Epic 8: Intelligent Coach System"
title: "Auto-Generate 4-Week Training Plans"
status: "ready-for-dev"
created: "2026-01-06"
updated: "2026-01-06"
dependencies:
  - "8-3-set-fitness-goals-interface"
related_stories:
  - "13-3-dynamic-plan-re-planning"
  - "13-4-equipment-management-and-alternatives"
---

# Story 8.4: Auto-Generate 4-Week Training Plans

## User Story
Refer to epics.md for complete user story, acceptance criteria, and implementation details.

## Quick Reference
- **Epic**: Epic 8: Intelligent Coach System
- **Status**: ready-for-dev
- **Dependencies**: Story 8.3 (Goals Interface)
- **Related Stories**: Story 13.3 (Re-planning), Story 13.4 (Equipment)
- **Full Details**: `_bmad-output/planning-artifacts/epics.md` Story 8.4 section

## Key Enhancements (Epic 13 Integration)

### 1. Equipment-Aware Plan Generation
- Plan generation considers available equipment (Story 13.4)
- Only selects quests/exercises matching user's equipment setup
- If limited equipment, suggests bodyweight alternatives

### 2. Adaptive Plan Structure
- Generated plans support dynamic re-planning (Story 13.3)
- Tracks adherence and triggers recalculation when needed
- Allows deadline extensions or intensity adjustments

### 3. Injury-Safe Planning
- If user has active injuries (Story 13.2), plan avoids affected exercises
- Substitutes exercises to work around limitations
- Maintains goal progress while respecting constraints

## Algorithm Components

### Plan Generation Flow
```typescript
function generatePlan(goal: UserGoal, userEquipment: string[]): TrainingPlan {
  // 1. Analyze goal requirements
  const targetMuscles = getGoalMuscles(goal.type);
  
  // 2. Filter quests by equipment
  const availableQuests = filterQuestsByEquipment(allQuests, userEquipment);
  
  // 3. Check for injuries
  const activeInjuries = getActiveInjuries(goal.userId);
  const safeQuests = filterQuestsByInjuries(availableQuests, activeInjuries);
  
  // 4. Select quests (3-4 per week, progressive difficulty)
  const selectedQuests = selectProgressiveQuests(safeQuests, targetMuscles, 16); // 4 weeks x 4 sessions
  
  // 5. Generate schedule
  const schedule = createWeeklySchedule(selectedQuests, goal.daysPerWeek);
  
  return {
    goalId: goal.id,
    quests: selectedQuests,
    schedule,
    startDate: new Date(),
    expectedEndDate: addWeeks(new Date(), 4)
  };
}
```

## UI Components Needed
1. **PlanGenerationScreen** - Goal input + "Generate Plan" button
2. **PlanPreviewCard** - Shows weekly structure before accepting
3. **WeeklyScheduleView** - Calendar-style week breakdown
4. **PlanProgressTracker** - Adherence visualization
5. **EquipmentMismatchAlert** - If quest requires unavailable equipment

## Integration Points
- Goals interface (Story 8.3)
- Equipment settings (Story 13.4)
- Injury tracking (Story 13.2)
- Quest library (Epic 4)
- Dynamic re-planning (Story 13.3)
- Adventure structure (Epic 5)

## Implementation Notes
This story is ready for development. All acceptance criteria are documented in the epics.md file.

Developer should review:
1. User story and acceptance criteria in epics.md (Story 8.4)
2. Architecture constraints in architecture.md
3. UX specifications in COACH_UX_SPECIFICATION.md
4. Plan generation enhancements in epics.md
5. Equipment filtering logic (Story 13.4)
6. Re-planning triggers (Story 13.3)
7. Adventure/quest data model in db/schema.ts

## Technical Considerations
- Plan generation is computationally light (runs on device)
- Quest selection balances: goal focus + muscle variety + difficulty progression
- Generated plans are stored as adventures (existing structure)
- Plan must be flexible enough for re-planning without full regeneration
- Consider "plan templates" for common goals (strength, endurance, balance)

## Status
ready-for-dev - Ready to be implemented by Dev agent using full context from planning artifacts.
