---
title: Onboarding
type: screen
route: /onboarding
status: active
updated: 2026-07-14
related: [home.md]
sources: [app/onboarding/index.tsx, app/onboarding/presentation.tsx, app/onboarding/choose-avatar.tsx, app/onboarding/village-name.tsx]
---

# Onboarding

## What this page group is for

Onboarding is the first-time setup flow. It helps a new player start quickly and feel the fantasy theme without asking for complicated choices.

## Pages in this flow

- `/onboarding` — entry point
- `/onboarding/presentation` — quick explanation of the concept
- `/onboarding/choose-avatar` — pick your hero identity
- `/onboarding/village-name` — name your village

## Main features

- **Get started fast**: minimal steps, clear direction.
- **Identity setup**: choose an avatar and a village name to personalize the journey.
- **Language choice**: set the language early (English/French).

## Visual rules

- Background art can be immersive, but the copy and CTAs must stay readable.
- The onboarding steps should feel like one flow, not three separate mini-apps.
- Button treatment should stay consistent from presentation through village naming.

## What the user does here

- Reads the intro.
- Selects an avatar.
- Chooses a village name.

## What changes after this

- The app remembers you completed onboarding.
- Your profile flavor (avatar + village name) becomes the “wrapper” around workouts.

## Implementation note

The onboarding presentation and avatar steps now use calmer shared text and button surfaces while keeping the fantasy artwork intact.
