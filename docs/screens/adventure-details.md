---
title: Adventure Details
type: screen
route: /adventures/[id]
status: active
updated: 2026-10-21
related: [adventures.md, quest-details.md, ../gameplay/adventures.md, ../gameplay/boss-fights.md]
sources: ["app/(tabs)/adventures/[id].tsx", "components/adventures/ShareAdventureButton.tsx"]
---

# Adventure Details (`/adventures/[id]`)

## Purpose

Adventure Details is the campaign hub. It shows:

- the **storyline**,
- the **ordered steps**,
- your **current progress**,
- and the **next quest** to complete.

## Main features on this page

- **Steps list**: see the journey broken into parts. A step draws its own art when it has some; else its quest's cover (`getStepArt`), so a hero's adventure shows the pictures of its quests, a photo included, and nothing is stored per step. A quest with no cover of its own draws nothing.
- **Progress tracking**: completed vs current vs locked steps.
- **Start / Continue**: resume exactly where you left off.
- **Suggested difficulty** (conceptually): help choose an appropriate challenge based on recent training.

## Visual rules

- The campaign title should sit above the utility chips.
- The step list should read like progression, not a second dashboard.
- The primary continue/start action should remain visually dominant.
- The difficulty text takes its colour from `DIFFICULTY_TEXT_TOKENS` (the chip stays neutral) and
  the "up to +N XP" chip is gold.
- A `StatusBand` (ink, status-bar height, never touchable) keeps scrolled steps from showing
  through under the clock.
- The step's narrative opens as a full-page panel: art on top, its title in a Récitatif, the story on
  ink, the seal to confirm.

## Typical user actions

- Start a new adventure.
- Continue the next step of an existing run.
- Review what’s coming next in the campaign.
- Leave the playthrough under way ("Laisser la partie"): a small outline button (`adventure-leave`)
  under the main one, shown only with an active run, behind a confirmation dialog that is not
  destructive. Nothing is shown as failed; the page goes back to its no-run state and the hero can
  start again from step 1.

## What happens next

Continuing an adventure sends you to the next **[Quest Details](quest-details.md)** page for that step, then into the **[Session](session.md)**.

Tapping the current step in the list does exactly what the Continue button does. A session only
advances the campaign when it carries the run step's id, and the row used to open the quest
without it: the quest could be finished forever while the step stayed current.

## Adventures the hero wrote

A share icon and a pencil sit in the header. The pencil opens the editor (`/adventures/edit?id=`). The
share icon (`adventure-share`, also on a retired or frozen adventure, since sharing reads and never
writes) always opens a dialog first, with what the file holds: `share_photos_*` (or `share_no_photo`),
then `share_steps_left_*` for steps that stay out, then `share_photos_left_*` for pictures that do not
fit; Share then opens the system share sheet with `<title>.bati-adventure.json`. Fewer than two steps
that can travel is a toast (`share_too_few`). The game's adventures have neither icon. When a step has lost its quest and
no run is under way, **Start** is replaced by one line (`adventures.missing_quest_own`, or
`adventures.missing_quest` for a game adventure). A hero quest step that would work the zone the hero is
sparing wears `adventures.zone_step` under its row.

## Boss adventures

Boss adventures are still made of steps like any other adventure, but the last steps are framed as a bigger climax.

## Implementation note

The details hub now uses tokenized dark surfaces and calmer row separators so the narrative, progress, and start action stay easy to parse.
