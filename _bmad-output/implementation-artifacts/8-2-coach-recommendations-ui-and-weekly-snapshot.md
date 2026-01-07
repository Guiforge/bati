---
story_id: "8.2"
story_key: "8-2-coach-recommendations-ui-and-weekly-snapshot"
epic: "Epic 8: Intelligent Coach System"
title: "Coach Recommendations UI and Weekly Snapshot"
status: "ready-for-dev"
created: "2026-01-06"
updated: "2026-01-06"
dependencies:
  - "8-1-detect-weak-muscle-areas-algorithm"
related_stories:
  - "13-1-post-workout-feedback-collection"
  - "13-2-injury-detection-and-exercise-substitution"
---

# Story 8.2: Coach Recommendations UI and Weekly Snapshot

## User Story
Refer to epics.md for complete user story, acceptance criteria, and implementation details.

## Quick Reference
- **Epic**: Epic 8: Intelligent Coach System
- **Status**: ready-for-dev
- **Dependencies**: Story 8.1 (Weak Area Detection)
- **Related Stories**: Story 13.1 (Feedback), Story 13.2 (Injury Detection)
- **Full Details**: `_bmad-output/planning-artifacts/epics.md` Story 8.2 section

## Key Enhancements (Epic 13 Integration)

### 1. Feedback-Aware Recommendations
- Recommendations now consider post-workout feedback (Story 13.1)
- If user reported high fatigue (RPE 8+), suggest lighter workouts
- If user reported low motivation, suggest variety/gamification

### 2. Injury-Aware Recommendations
- If user reported pain/injury (Story 13.2), recommendation adapts
- Coach modal displays injury alerts prominently
- Suggested quests avoid injured body parts

### UI Components Needed
1. **CoachModal** - Main coach interface
2. **ProgressSnapshotCard** - Weekly stats display
3. **RecommendationCard** - With reasoning and action buttons
4. **MuscleBalanceChart** - Visual representation (bar or pie chart)
5. **InjuryAlertBanner** - If injury detected (from Story 13.2)

## Integration Points
- Weak area detection algorithm (Story 8.1)
- Post-workout feedback data (Story 13.1)
- Injury tracking data (Story 13.2)
- Quest library for suggestions (Epic 4)

## Implementation Notes
This story is ready for development. All acceptance criteria are documented in the epics.md file.

Developer should review:
1. User story and acceptance criteria in epics.md (Story 8.2)
2. Architecture constraints in architecture.md
3. UX specifications in COACH_UX_SPECIFICATION.md
4. Coach recommendation logic enhancements in epics.md
5. Integration with Epic 13 feedback/injury systems

## Technical Considerations
- Recommendation algorithm must check for recent feedback (last 7 days)
- Injury alerts take priority over weak area alerts
- Badge notification appears when new recommendations available
- Recommendations refresh weekly or after significant events (injury, goal milestone)

## Status
ready-for-dev - Ready to be implemented by Dev agent using full context from planning artifacts.
