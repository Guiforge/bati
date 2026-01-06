---
story_id: "2.4"
story_key: "2-4-optional-tutorial-quest"
epic: "Epic 2: First-Time User Experience"
title: "Optional Tutorial Quest"
status: "ready-for-dev"
created: "2026-01-06"
---

# Story 2.4: Optional Tutorial Quest

## User Story
As a **new user**, I want **to optionally complete a tutorial quest**, So that **I can learn how workouts function in a safe, guided way**.

## Acceptance Criteria
- [ ] Modal suggests tutorial quest on first home screen load
- [ ] Modal explains "Learn the basics with a 5-minute quest"
- [ ] "Start Tutorial" button begins tutorial quest
- [ ] "Skip for Now" button dismisses modal
- [ ] Tutorial quest contains 3 simple exercises (Squats, Push-ups, Planks)
- [ ] Tutorial demonstrates rest timer, exercise completion, victory screen
- [ ] Completing tutorial awards 100 XP and unlocks first building
- [ ] Tutorial completion tracked in database
- [ ] Users who skip can access tutorial later from settings

## Implementation Guide
Create tutorial quest in database seed. Trigger modal on first home visit. Use existing session flow (Story 3.x).
