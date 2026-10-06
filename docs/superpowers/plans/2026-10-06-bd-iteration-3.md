# BD Iteration 3 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the expert audit's iteration-2 findings (NOT VALIDATED on one P1; coherence 7, engagement 8, usability 8, craft 7): the narrative becomes a BD panel, the last off-system buttons join the seal family, Victory reserves its space while loading, XP is gold everywhere, and two engagement moves (an earned level gauge, a session-details plate).

**Architecture:** Reuse what exists: `AppButton` (seal and outline), `Recitatif`, `BossHpGauge`'s look generalised into one ink gauge, `fade()`, `DIFFICULTY_COLORS`, the Journal's `NTitle`/page header.

**Tech Stack:** Expo SDK 57, React Native 0.86, Tamagui 2.7, jest 30 + RNTL 14, Biome.

**Spec:** `docs/superpowers/specs/2026-10-05-bd-direction-design.md` (iterations 1 and 2 included) plus the decisions below.

## Decisions

- O. **The narrative is a full-page panel** (`components/adventures/NarrativeModal.tsx`): the step's (or adventure's) art full-bleed at the top, its title in a `Recitatif` pinned to the art's bottom edge, the story text on a `$bgDark` ground below it (never over the quest screen's chrome: the modal owns its whole ground), the CTA an `AppButton` primary (the seal). No raw `color="white"`.
- P. **No button outside the family:** the exercise-instructions dialog's Close (`components/session/ExerciseInstructions.tsx`) is an `AppButton` primary (`$3`), its exercise name `$heading` 700 20; Victory's "Discard" and session details' "Remove from the journal" are `AppButton` outline (a destructive outline keeps an `$error` label if the component already supports a tone; otherwise outline).
- Q. **A loading reward asserts nothing:** Victory's XP card reserves its height with an empty value (no "…" glyphs) and the level card mounts only when its data is present (see memory: "a loading state must not assert").
- R. **XP is gold everywhere:** Home header XP figure and XP progress bar (`$resourceGold` on a `$gold800` track), session-details XP, the "up to +N XP" chips on quest and adventure detail screens.
- S. **Small coherence:** the difficulty tag text on quest and adventure detail uses `DIFFICULTY_COLORS` (chip stays neutral); Victory's progression chart "Total mins" figure `$text`, its title `$heading` 700 sentence case; the Journal tab title matches the Quests/Adventures header (size, gutter, a Lucide glyph through `components/icons.ts`); the onboarding first-session subtitle gets a `fade(rawColors.bgDark, .8)` text shadow like "Name your village".
- T. **Engagement:** (1) one shared ink gauge (generalise `BossHpGauge` into `InkGauge` with a fill colour and an optional figure, keep `BossHpGauge` as a thin wrapper or replace its uses) used by Victory's level card in gold (`$resourceGold` fill, `$gold800` track) with a single fill motion that reduced motion skips; (2) session details (`components/journal/QuestLog.tsx`) opens with the quest's art and a `Recitatif` title with a gold kicker (the date), reusing Victory's plate look.

## Global Constraints

Same as `docs/superpowers/plans/2026-10-05-bd-direction.md` § Global Constraints. Tests: `rtk proxy npx jest --testPathIgnorePatterns=/node_modules/ --testPathPatterns "a|b"`. Commit with hooks. Do not run Metro, adb, Maestro.

## Review Focus

1. The narrative still confirms/dismisses exactly as before (testIDs `narrative-confirm` etc. used by Maestro).
2. Reduced motion: the gauge fill animation is skipped.
3. A digit in Alegreya (titles, kicker with a date: the date stays in the body face).
4. Victory's loading state reserves space without layout jump once data arrives.
5. The Journal header change does not break the Journal's own theme (Inter body).

---

### Task 1: Panels and buttons (O, P, Q)
Files: NarrativeModal.tsx, ExerciseInstructions.tsx, VictoryView.tsx (+ its XP and level cards), QuestLog.tsx (Remove button). Tests first per surface. Commit "The narrative is a panel; every button in the family; rewards wait quietly".

### Task 2: Gold XP and small coherence (R, S)
Files: components/home/HomeHeader.tsx, QuestLog.tsx (XP), app/(tabs)/quests/[id].tsx and app/(tabs)/adventures/[id].tsx (XP chips, difficulty tag), components/session/ProgressionChart.tsx, the Journal header (components/journal/nocturne.tsx or the Journal index), app/onboarding/first-session.tsx. Tests first. Commit "XP is gold everywhere; small coherence".

### Task 3: Engagement (T)
Files: components/session/BossHpGauge.tsx -> InkGauge, VictoryView.tsx level card, QuestLog.tsx header plate. Tests first (gauge fill colour per use, reduced motion skips the animation, the plate renders the art + Recitatif). Commit "An earned gauge, a plate for every session".

### Task 4: Docs
DESIGN.md, docs/design/design-system.md, the spec, docs/screens/* touched: decisions O-T in each doc's voice. Commit "Document iteration 3".

### Gate (orchestrator)
Restart Metro, re-capture (`scripts/audit-shots.sh en`), expert audit iteration 3.
