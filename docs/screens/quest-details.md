---
title: Quest Details
type: screen
route: /quests/[id]
status: active
updated: 2026-09-15
related: [quests.md, session.md, adventure-details.md, ../gameplay/quests.md]
sources: ["app/(tabs)/quests/[id].tsx"]
---

# Quest Details (`/quests/[id]`)

## Purpose

Quest Details helps you **understand the workout before you start**.

## Main features on this page

- **Quest overview**: what the quest is about (theme + short description).
- **Workout contents**: what exercises are included and how the session is structured.
- **Difficulty choice**: pick how challenging you want the targets to be today.
- **Start the quest**: begin the active workout session.

## Visual rules

- Keep the quest title and start action dominant.
- Use subtle borders on the header image, exercise cards, and difficulty chips.
- The difficulty text takes its colour from `DIFFICULTY_TEXT_TOKENS` (the chip stays neutral) and
  the "up to +N XP" chip is gold.
- A `StatusBand` (ink, status-bar height, never touchable) keeps scrolled content from showing
  through under the clock.
- Exercise thumbnails should support scanning, not compete with the quest summary.
- The sticky start bar should feel like a clear action band, not a heavy divider.

## Typical user actions

- Read the description to confirm it matches the day’s intent.
- Choose a difficulty (easy / medium / hard).
- Start the quest.

## What happens next

Starting the quest launches the **[Session](session.md)** where the workout is executed.

## Special case (Adventures)

If you arrived here from an **Adventure step**, the page may show a short story beat before starting.

## Implementation note

A level chip paints the quest this screen last served at that level (`getCached("quest:<id>:<level>")`)
before `getQuestById` revalidates it, instead of dropping back to a loading state first. The screen
subscribes to the session store's `startSession` alone: it stays mounted under the session it
starts, and a whole-store subscription re-rendered it on every set.

The current implementation uses the shared card language and tokenized dark surfaces so the quest details screen reads as one coherent step before the session starts.

## Story and sharing

- A hero quest's description is its **story or introduction** (editor label `quests.editor_description`):
  several lines, 280 characters at most, the same cap as an adventure's introduction (`MAX_DESCRIPTION`).
  The hint is neutral on purpose: it never suggests a result. The page shows it whole; no modal opens
  before a quest played alone.
- The share button (hero quests only) reads the file back before anything leaves, then asks first, as an
  adventure does: the photos in the file (`quests.share_photos_*` or `share_no_photo`) and the ones that
  do not fit the byte budget and stay on the phone (`share_photos_left_*`). Share opens the system sheet
  with `<title>.bati-quest.json`. See R125 in [data rules](../testing/data-rules.md).
