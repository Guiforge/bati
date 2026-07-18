---
title: Quest Details
type: screen
route: /quests/[id]
status: active
updated: 2026-07-14
related: [quests.md, session.md, adventure-details.md, ../QUESTS.md]
sources: [app/(tabs)/quests/[id].tsx]
---

# Quest Details (`/quests/[id]`)

## Purpose

Quest Details helps you **understand the workout before you start**.

## Main features on this page

- **Quest overview**: what the quest is about (theme + short description).
- **Workout contents**: what exercises are included and how the session is structured.
- **Difficulty choice**: pick how challenging you want the targets to be today.
- **Start the quest**: begin the active workout session.

## Typical user actions

- Read the description to confirm it matches the day’s intent.
- Choose a difficulty (easy / medium / hard).
- Start the quest.

## What happens next

Starting the quest launches the **[Session](session.md)** where the workout is executed.

## Special case (Adventures)

If you arrived here from an **Adventure step**, the page may show a short story beat before starting.
