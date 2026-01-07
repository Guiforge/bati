---
story_id: "13.1"
story_key: "13-1-post-workout-feedback-collection"
epic: "Epic 13: Adaptive Coach Intelligence"
title: "Post-Workout Feedback Collection (RPE, Sensations, Motivation)"
status: "ready-for-dev"
created: "2026-01-06"
dependencies:
  - "3-7-session-completion-and-xp-reward"
---

# Story 13.1: Post-Workout Feedback Collection (RPE, Sensations, Motivation)

## User Story
Refer to epics.md for complete user story, acceptance criteria, and implementation details.

## Quick Reference
- **Epic**: Epic 13: Adaptive Coach Intelligence
- **Status**: ready-for-dev
- **Dependencies**: Story 3.7 (Session Completion)
- **Full Details**: `_bmad-output/planning-artifacts/epics.md` Story 13.1 section

## Key Components

### Database Schema
```sql
CREATE TABLE workout_feedback (
  id INTEGER PRIMARY KEY,
  session_id INTEGER NOT NULL,
  rpe INTEGER CHECK(rpe >= 1 AND rpe <= 10),
  feeling TEXT CHECK(feeling IN ('great', 'tired', 'sore', 'pain')),
  motivation INTEGER CHECK(motivation >= 1 AND motivation <= 5),
  pain_notes TEXT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES workout_sessions(id)
);
```

### UI Components Needed
1. **FeedbackModal** - Post-workout feedback prompt
2. **RPESlider** - 1-10 scale with labels
3. **FeelingChips** - Great 😊, Tired 😴, Sore 😣, Pain ⚠️
4. **MotivationSlider** - 1-5 scale
5. **PainNotesInput** - Optional text field

### Integration Points
- Session completion screen (Epic 3, Story 3.7)
- Coach recommendations (Epic 8, Story 8.2)
- Injury detection (Epic 13, Story 13.2)

## Implementation Notes
This story is ready for development. All acceptance criteria are documented in the epics.md file.

Developer should review:
1. User story and acceptance criteria in epics.md (Story 13.1)
2. Architecture constraints in architecture.md
3. UX specifications in COACH_UX_SPECIFICATION.md
4. Session completion flow in epics.md (Story 3.7)
5. Drizzle schema setup in db/schema.ts

## Technical Considerations
- Feedback prompt appears max once per day (not on every workout)
- Feedback is optional and dismissable
- Data is used by coach algorithm for adaptive recommendations
- Consider accessibility for sliders (voice input, keyboard navigation)

## Status
ready-for-dev - Ready to be implemented by Dev agent using full context from planning artifacts.
