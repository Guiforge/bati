---
title: PastSessionSheet
type: design
status: active
updated: 2026-10-18
related: [../design-system.md, ../../screens/journal.md]
sources: [components/journal/PastSessionSheet.tsx, components/journal/pastSessionForm.ts, db/handEntryRules.ts]
---

# PastSessionSheet

A `FormSheet` that writes down a session Bati did not see (a gym session, a walk without the phone), every field prefilled, so the usual answer is one tap on "Enregistrer".

Static rendition, hand-written from `components/journal/PastSessionSheet.tsx` (prefill and parsing in `components/journal/pastSessionForm.ts`, rules in `db/handEntryRules.ts`).

## Use

- Opened by the "+ Ajouter une séance passée" row at the top of the Journal history, by the reminder's "Déjà bougé ailleurs ?" action (`bati:///journal?add=past&day=…`, consumed once), and by "Corriger" on a hand-written entry (title "Corriger la séance").
- Distance mode: "Ajouter la distance" on the recap or the detail of an outing timed without GPS opens it with the distance field alone.
- Fields, top to bottom: type (Entraînement, Marche, Course, Vélo), day (Aujourd'hui, Hier, Autre jour, seven days back at most), "Fini vers" (a typed time), duration (20, 30, 45, 60, 90, Autre in minutes), then a free name for a workout ("salle", "foot") or an optional distance for an outing.
- Prefill never opens on a refusal: the most recent day without a hand-written entry, an end time before any measured session it would overlap, 45 min.
- Five refusals, one gentle sentence each, in the footer: more than seven days back; already one today; under 10 min (or over 4 h); overlapping a measured session, which it names; a distance faster than 8 / 20 / 45 km/h on foot / running / riding, with "Mettre 3,00 km" and "Retirer la distance" to fix it.
- On save: closes, then a success `Toast` read after the write ("Flamme entretenue, +75 XP", "Séance notée, +75 XP" when the flame is not lit, "Serment tenu, +… XP" when it keeps an oath). A correction says "Séance corrigée" and no XP. No victory screen.

## Anatomy

- `FormSheet` with its `footer` prop. The footer has one reserved line, min height 44: the "Ce que ça rapporte" `RuleDisclosure` when nothing is refused, the refusal when something is (Lucide `Info` 16 in `primaryText`, sentence 14 in `text`, announced politely). Under it, one primary `AppButton` "Enregistrer", off (`surface2`) while a refusal stands. The footer never scrolls away.
- Choices: `Chip` with `selected` (fill, Lucide `Check` 14, `accessibilityState.selected`). In the Journal theme the fill is gold; on the outing sheet it is `primary`.
- Section labels: `SectionLabel` ("QUAND", "DURÉE"). Inputs: min height 44, `background` fill, `borderStrong` border, placeholder in `textSecondary`, each with its own accessibility label.
- A chip's refusal is computed at once; a typed field's on blur, on keyboard hide or on save.
- Refusal 5's fix chips sit in the body, under the distance field.

## Props the consumer provides

`open`, `onClose`, `mode?: "entry" | "distance"`, `target?: PastSessionTarget | null` (the entry to correct, or the outing a distance is added to), `day?: string` (`yyyy-MM-dd` from the reminder link, read strictly), `onSaved?(result, distanceM)`.

## Tokens

`surface` (frame), `surface2` (button off), `bgLight` (chip at rest), `primary` / `onPrimary` (chip picked, button), `primaryText` (refusal icon), `text`, `textSecondary`, `background` and `borderStrong` (inputs), `sheetScrim`, `radius-4` frame, `space-3` / `space-4`, `size-hit` 44. Title: the `FormSheet` title, 20, `headingFont`.

## Don't

- Don't add a stepper for the duration.
- Don't put the button inside the scroll, or a second primary button anywhere in the sheet.
- Don't paint a refusal in `error`, or say "raté", "trop tard", "impossible".
- Don't offer a day older than seven days.
- Don't recompute the XP of an entry being corrected.
- Don't open a victory screen after saving.
- Don't unfold the rule in the footer when the body is tall: at 130 % it hides the duration chips (open finding).
