---
title: Boss editor
type: screen
route: /bosses/edit
status: active
updated: 2026-10-21
related: [forge.md, adventure-editor.md, ../gameplay/boss-fights.md]
sources: [app/bosses/edit.tsx, app/bosses/index.tsx, components/bosses/BossPictures.tsx, components/bosses/BossLines.tsx, db/heroBosses.ts]
---

# Boss editor (`/bosses/edit`, list at `/bosses`)

## Purpose

Where a hero creates a boss (or edits one with `?id=`), the fourth thing they make beside exercises,
quests and adventures. The list at `/bosses` is the Forge's "See all". The adventure editor's boss
picker offers the hero's bosses and a shortcut here.

## Fields

- **Name** (40), required. The one field that blocks saving.
- **Painted monster**: the monster the pictures fall back to. The first two monsters, plus any already
  beaten (and the current one, always), as in the adventure editor.
- **Its pictures**: normal, wounded, defeated, legendary (shown on a rematch). Each is the painted
  monster's own form or a photo from the album (the picture field's photo tile, shrunk and stripped
  as every photo); each is optional, and a form without a picture shows the normal one with the arena's
  effects. The preview says what will really show. Under them, two help lines: a form without a
  picture shows the normal one, and a photo of someone else only with their consent.
- **Weakness** and **resistance**: one muscle each, or none. They change which muscle's sets weigh
  1.5x or 0.5x against this boss; no other number is set here.
- **Its lines**: up to 3 lines of 60 for each of five moments (`intro`, `idle`, `crit`, `enrage`,
  `defeat`), added to the painted pool.
- **Delete** (edit mode): after a confirmation; refused, with a message, while an active adventure
  ends on the boss. A deletion is remembered (`deleted_content`) so device sync does not bring it back.

The form asks before leaving with unsaved changes, like the other editors.
