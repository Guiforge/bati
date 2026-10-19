---
title: HandMark
type: design
status: active
updated: 2026-10-18
related: [../design-system.md, ../../screens/journal.md]
sources: [components/journal/HandMark.tsx, components/journal/stats/StatsView.tsx]
---

# HandMark

The words "saisie à la main" beside a figure the hero typed rather than Bati measured: the same words, the same ash, on every surface.

Static rendition, hand-written from `components/journal/HandMark.tsx` (the Stats form is `withHandMark` in `components/journal/stats/StatsView.tsx`).

## Use

- Journal history row: on its own line under the details line, never inside it.
- Session detail: under the title for a whole entry; "distance saisie à la main" when only the distance of a timed outing was typed.
- Stats: in brackets after the counts that include typed entries, "6 séances ou sorties ces sept derniers jours (2 saisies à la main)", "4 sorties (2 saisies à la main)".
- Outing recap, after "Ajouter la distance": under the distance.
- Wherever it shows, pace, records, rank and boss damage are not shown for that entry.
- Corrected through "Corriger" (`PastSessionSheet`), removed through "Retirer du journal" and a `ConfirmDialog`.

## Anatomy

- Text only, lower case, `textSecondary` (6.64:1 on `surface`, 6.04:1 on `surface2`), 12/17 in a row, 13/18 in a detail; Inter in the Journal theme (`NMuted`).
- Variants: `what="entry"` "saisie à la main", `what="distance"` "distance saisie à la main"; the Stats count is plural-aware (`past_session.hand_mark_count`).
- No icon, no fill, no border. A GameIcon "scroll" in front was built and compared (direction B) and set aside.

## Props the consumer provides

`what?: "entry" | "distance"`, `size?: 12 | 13`, `testID?`.

## Tokens

`textSecondary`, Inter (Journal) body sizes 12 and 13. No accent colour.

## Don't

- Don't paint it gold or in `error`, or use it as a warning.
- Don't swap the words per surface.
- Don't add a glyph: the text already says it, and a row icon is what the performance audit took out.
- Don't append it to the one-line details of a row: it gets cut.
