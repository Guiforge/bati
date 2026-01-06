---
story_id: "2.1"
story_key: "2-1-display-fitness-disclaimer-on-first-launch"
epic: "Epic 2: First-Time User Experience"
title: "Display Fitness Disclaimer on First Launch"
status: "ready-for-dev"
created: "2026-01-06"
---

# Story 2.1: Display Fitness Disclaimer on First Launch

## User Story
As a **new user**, I want **to see and acknowledge a fitness disclaimer on first app launch**, So that **I understand the app is for motivation, not medical advice**.

## Acceptance Criteria
- [ ] Disclaimer screen displayed before any other content on first launch
- [ ] Disclaimer text warns app is not medical advice
- [ ] Disclaimer advises consulting doctor before starting exercise
- [ ] "I Understand" button visible
- [ ] User cannot proceed without acknowledging
- [ ] After acknowledgment, never shown again
- [ ] Acknowledgment stored in local database (user settings)

## Implementation Guide
Create `app/onboarding/disclaimer.tsx` screen. Use Zustand or SQLite to track first launch. Display before navigation.
