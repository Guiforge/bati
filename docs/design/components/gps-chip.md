---
title: GpsChip
type: design
status: active
updated: 2026-10-18
related: [../design-system.md, ../../screens/journal.md]
sources: [components/quests/GpsChip.tsx, components/quests/OutingGoalSheet.tsx]
---

# GpsChip

A setting drawn as a chip, "GPS : oui" or "GPS : non", that says whether the next outing uses the phone's position; the choice is remembered and prefills every outing after it.

Static rendition, hand-written from `components/quests/GpsChip.tsx` (preference in `outing_gps`, local to the phone).

## Use

- In `OutingGoalSheet` only (the quick door's goal sheet, the long press on a Home tile), at the top, above the duration and distance tabs.
- A tap flips it and saves at once. Starting an outing from a Home tile never asks again: the tile starts with the last choice.
- An outing in progress keeps its own choice in the session state; flipping the chip changes the next one.
- Paired with a `RuleDisclosure` "Ce que ça rapporte" that unfolds "Sans GPS, ta sortie compte au temps : flamme, XP, mais pas de lieues tant que tu n'ajoutes pas la distance."
- With GPS off, no location or notification permission is requested and no service starts. The live screen shows a "Sans GPS" text badge and the clock alone; the recap offers "Ajouter la distance".
- When the position is refused for good, the Home notice "Bati n'a pas accès à ta position" offers "Sortir sans GPS", which starts the outing and turns the chip to "non".

## Anatomy

- `Chip`, pressable: `bgLight` fill in both states (a setting, not one pick among several), `borderStrong` 2px border, `radius-10`, min height `size-hit`.
- Icon: Lucide `MapPin` (oui) or `MapPinOff` (non), 16, `text`. Label: `chip` style 13/700 `text`.
- `accessibilityRole="switch"`, `accessibilityState={{ checked }}`, label "GPS" alone: TalkBack adds the state and the action.

## Props the consumer provides

`value: boolean`, `onChange(next: boolean)`.

## Tokens

`bgLight`, `borderStrong`, `text`, `radius-10`, `space-3` x `space-2` padding, `size-hit` 44. No accent colour in either state.

## Don't

- Don't put it on a Home tile, the Home itself or a quest screen.
- Don't carry the state in colour: the word and the glyph carry it.
- Don't use `Chip selected` for it: that recipe is for a pick among options.
- Don't put the instruction in the accessibility label.
- Don't ask for the location permission when it reads "non".
