---
story_id: "13.3"
story_key: "13-3-dynamic-plan-re-planning"
epic: "Epic 13: Adaptive Coach Intelligence"
title: "Dynamic Plan Re-Planning (Rétro-Planification)"
status: "ready-for-dev"
created: "2026-01-06"
dependencies:
  - "8-4-auto-generate-4-week-training-plans"
---

# Story 13.3: Dynamic Plan Re-Planning (Rétro-Planification)

## User Story
Refer to epics.md for complete user story, acceptance criteria, and implementation details.

## Quick Reference
- **Epic**: Epic 13: Adaptive Coach Intelligence
- **Status**: ready-for-dev
- **Dependencies**: Story 8.4 (Training Plan Generation)
- **Full Details**: `_bmad-output/planning-artifacts/epics.md` Story 13.3 section

## Key Components

### Database Schema
```sql
CREATE TABLE plan_adjustments (
  id INTEGER PRIMARY KEY,
  plan_id INTEGER NOT NULL,
  adjustment_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  reason TEXT,
  old_schedule TEXT,
  new_schedule TEXT,
  FOREIGN KEY (plan_id) REFERENCES training_plans(id)
);
```

### Algorithm: Rétro-Planification
```typescript
function recalculatePlan(planId: number): PlanAdjustment | null {
  const plan = getPlan(planId);
  const adherence = calculateAdherence(plan);
  
  // Scenario 1: User is behind
  if (adherence.missedSessions >= 2 && adherence.weeksRemaining > 0) {
    const feasibility = assessFeasibility(plan, adherence);
    
    if (!feasibility.achievable) {
      return {
        type: 'deadline_extension',
        suggestion: "Adjust deadline by 1 week?",
        newSchedule: extendPlan(plan, 1) // Add 1 week
      };
    } else {
      return {
        type: 'intensity_reduction',
        suggestion: "Reduce intensity to stay on track?",
        newSchedule: reduceDifficulty(plan)
      };
    }
  }
  
  // Scenario 2: User is ahead
  if (adherence.completionRate > 1.2) { // 20% ahead
    return {
      type: 'difficulty_increase',
      suggestion: "You're ahead! Increase difficulty or add bonus challenge?",
      newSchedule: increaseDifficulty(plan)
    };
  }
  
  return null; // No adjustment needed
}
```

### UI Components Needed
1. **PlanAdjustmentDialog** - Suggests plan changes
2. **PlanProgressBar** - Shows adherence vs expected
3. **RecalculatePlanButton** - Manual trigger in coach modal
4. **AdjustmentHistoryList** - Shows past plan changes

### Integration Points
- Coach modal (Epic 8, Story 8.2)
- Training plan view (Epic 8, Story 8.4)
- Session completion (triggers adherence check)
- Notification system (alerts user of plan updates)

## Implementation Notes
This story is ready for development. All acceptance criteria are documented in the epics.md file.

Developer should review:
1. User story and acceptance criteria in epics.md (Story 13.3)
2. Knowledge base: docs/knowledge/coaching.md (rétro-planification principles)
3. Training plan generation logic (Story 8.4)
4. Adventure/quest structure in db/schema.ts

## Technical Considerations
- Adherence check runs weekly or after missed sessions
- User must approve adjustments (not automatic)
- Respect user constraints (available days, session duration)
- Recalculation preserves goal type (strength/endurance/balance)
- Keep narrative consistency in adventure structure

## Knowledge Base Reference
Based on docs/knowledge/coaching.md:
- Rétro-planification dynamique: recalculate steps if user takes delay or advances schedule
- Max 10% volume increase per week (avoid overtraining)
- Respect recovery needs when intensifying

## Status
ready-for-dev - Ready to be implemented by Dev agent using full context from planning artifacts.
