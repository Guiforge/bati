---
story_id: "13.2"
story_key: "13-2-injury-detection-and-exercise-substitution"
epic: "Epic 13: Adaptive Coach Intelligence"
title: "Injury Detection & Exercise Substitution"
status: "ready-for-dev"
created: "2026-01-06"
dependencies:
  - "13-1-post-workout-feedback-collection"
  - "8-2-coach-recommendations-ui-and-weekly-snapshot"
---

# Story 13.2: Injury Detection & Exercise Substitution

## User Story
Refer to epics.md for complete user story, acceptance criteria, and implementation details.

## Quick Reference
- **Epic**: Epic 13: Adaptive Coach Intelligence
- **Status**: ready-for-dev
- **Dependencies**: Story 13.1 (Feedback Collection), Story 8.2 (Coach UI)
- **Full Details**: `_bmad-output/planning-artifacts/epics.md` Story 13.2 section

## Key Components

### Database Schemas
```sql
CREATE TABLE exercise_alternatives (
  id INTEGER PRIMARY KEY,
  original_exercise_id INTEGER NOT NULL,
  alternative_exercise_id INTEGER NOT NULL,
  reason TEXT,
  required_equipment TEXT,
  FOREIGN KEY (original_exercise_id) REFERENCES exercises(id),
  FOREIGN KEY (alternative_exercise_id) REFERENCES exercises(id)
);

CREATE TABLE injury_tracking (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL,
  body_part TEXT NOT NULL,
  first_occurrence DATETIME,
  last_occurrence DATETIME,
  frequency INTEGER DEFAULT 1,
  status TEXT CHECK(status IN ('active', 'recovered')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### Algorithm: Injury Detection
```typescript
function detectInjury(userId: number): InjuryAlert[] {
  const recentFeedback = getLastNDaysFeedback(userId, 7);
  const painReports = recentFeedback.filter(f => f.feeling === 'pain');
  
  // Group by body part mentioned in pain_notes
  const bodyPartCounts = groupByBodyPart(painReports);
  
  // Flag if same body part reported 2+ times in 7 days
  return bodyPartCounts
    .filter(count => count >= 2)
    .map(bodyPart => ({
      bodyPart,
      frequency: count,
      recommendation: "Consider rest or see a professional"
    }));
}
```

### UI Components Needed
1. **InjuryAlertCard** - In coach modal
2. **ExerciseWarningDialog** - Before starting quest with flagged exercise
3. **AlternativeExercisePicker** - Suggests safe alternatives
4. **InjuryDashboard** - Shows tracked injuries and recovery status

### Integration Points
- Coach modal (Epic 8, Story 8.2)
- Quest start screen (Epic 4, Story 4.2)
- Session active screen (Epic 3, Story 3.1)
- Exercise substitution during workout (Epic 3, Story 3.5)

## Implementation Notes
This story is ready for development. All acceptance criteria are documented in the epics.md file.

Developer should review:
1. User story and acceptance criteria in epics.md (Story 13.2)
2. Knowledge base: docs/knowledge/coaching.md (injury protocols)
3. Exercise database structure in db/schema.ts
4. Coach recommendation logic in stores/coachStore.ts

## Technical Considerations
- Injury detection runs daily or after feedback submission
- Exercise alternatives must target same muscle group
- Warning dialogs are non-blocking (user can choose to continue)
- Body part extraction from free-text notes (simple keyword matching)
- Consider common injuries: ankle, knee, shoulder, back, wrist

## Knowledge Base Reference
Based on docs/knowledge/coaching.md:
- Entorse de cheville → proprioception exercises
- Syndrome rotulien → eccentric quadriceps work
- Tendinopathies → progressive loading protocols

## Status
ready-for-dev - Ready to be implemented by Dev agent using full context from planning artifacts.
