---
title: Boss editor
type: screen
route: /bosses/edit
status: active
updated: 2026-10-21
related: [forge.md, adventure-editor.md, ../gameplay/boss-fights.md]
sources: [app/bosses/edit.tsx, components/bosses/Fold.tsx, app/bosses/index.tsx, components/bosses/BossPictures.tsx, components/bosses/BossLines.tsx, db/heroBosses.ts]
---

# Boss editor (`/bosses/edit`, list at `/bosses`)

## Purpose

Where a hero creates a boss (or edits one with `?id=`), the fourth thing they make beside exercises,
quests and adventures. The list at `/bosses` is the Forge's "See all". The adventure editor's boss
picker offers the hero's bosses and a shortcut here.

## Fields

- **Name** (40), required. The one field that blocks saving: saved empty from the bottom bar, the
  screen scrolls to the name (`nameCardY`, as the quest and adventure editors do), focuses it and shows
  the message there.
- **Its monster** (the painted monster the pictures fall back to; the interface never says "fallback"
  or "form"). The first two monsters, plus any already beaten (and the current one, always), as in the
  adventure editor.
- **Its pictures**: one plain help line first (`boss_editor.pictures_hint`: with no photo it looks like
  the monster picked; wounded, defeated and legendary reuse the normal photo when left empty), then the
  **normal** picture, always open. **Wounded, defeated, legendary (on a rematch)** sit folded under one
  heading (`Fold`, closed on every visit). Each is the painted monster's own look or a photo from the
  album (the picture field's photo tile, shrunk and stripped as every photo); the preview says what
  will really show. Each preview is announced to a screen reader by its form ("Image: Wounded"),
  and the photo of someone else only with their consent (help line under them).
- **Weakness** and **resistance**: one muscle each, or none. They change which muscle's sets weigh
  1.5x or 0.5x against this boss; no other number is set here. A line under the weakness says it
  plainly: a weakness makes the boss easier. There is no cap (decision D-185): the line is the guard.
- **Its voice**, folded (closed on every visit, even for a boss that has lines): up to 3 lines of 60
  for each of five moments (`intro`, `idle`, `crit`, `enrage`, `defeat`), added to the painted pool.
- **Delete** (edit mode): the screen reads the adventures that end on the boss before asking, and
  refuses by naming them ("The adventure "X" still ends on it"); otherwise it asks, in plain words
  that the boss leaves the Forge here and on the other devices, except where an adventure still ends
  on it. A deletion is remembered (`deleted_content`) so device sync does not bring it back.

The form asks before leaving with unsaved changes, like the other editors.
