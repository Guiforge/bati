---
story_id: "2.5"
story_key: "2-5-coach-suggestions-after-7-days"
epic: "Epic 2: First-Time User Experience"
title: "Coach Suggestions After 7 Days"
status: "ready-for-dev"
---

# Story 2.5: Coach Suggestions After 7 Days

## User Story
As a **returning user**, I want **to receive coach suggestions after 7 days of usage**, So that **I get personalized recommendations once the app has data**.

## Acceptance Criteria
- [ ] Coach icon displays notification badge after 7 days (min 1 session)
- [ ] Tapping Coach icon shows "Getting Started Suggestions"
- [ ] Suggestion: "Try different muscle groups for balanced training"
- [ ] Suggestion: "Set your first fitness goal to stay motivated"
- [ ] Suggestion: "Complete 3 sessions this week to build momentum"
- [ ] Badge disappears after viewing suggestions
- [ ] Suggestions stored as "viewed" in database
- [ ] Coach data collection tracks muscle balance and weak areas

## Implementation Guide
Create background job to check usage duration. Store in user_settings. Trigger badge on home screen. Requires Epic 8 (Coach System) foundation.
