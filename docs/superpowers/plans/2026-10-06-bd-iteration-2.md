# BD Iteration 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pass the expert design audit: one colour language for rewards and actions, no violet leftovers, every screen title in the title font, one timer treatment, controls on the scale, and three engagement moves (boss gauge, titles on art, gold victory).

**Architecture:** Same system as the BD direction (`docs/superpowers/specs/2026-10-05-bd-direction-design.md`) and the audit fixes (`docs/superpowers/plans/2026-10-05-bd-audit-fixes.md`). No new tokens unless named here.

**Tech Stack:** Expo SDK 57, React Native 0.86, Tamagui 2.7, jest 30 + RNTL 14, Biome, Maestro.

**Spec:** the spec above, plus the expert audit's findings (iteration 1, NOT VALIDATED, coherence 6/10), restated as decisions below.

## Decisions (extend the spec)

- G. **Gold is earned, braise is done.** Every reward, record and progression figure or glyph is `$resourceGold` (XP gained, trophies, achievements titles and glyphs, new-record badges, oath progress bars on a `$gold800` track, the village tier progress bar). The boss's weakness line and glyphs are `$primaryText`. Records stay gold.
- H. **Metadata is never braise** (finish the job): exercise-list "leads to X" captions and their link glyph, the "Yours"/"À toi" caption, the exercise-picker substitution caption, any kicker like "FIRST TRIAL" -> `$textSecondary` (glyphs `$muted`). A value that is itself an editable control stays as it is.
- I. **No violet.** `pastelPurple` no longer grounds cards: adventure cards, the adventure hero card and the quest-detail info card use `$surface` with the 1 px `$borderStrong` frame (the shared `Card` where it is a one-line swap). The rest screen's violet wash becomes an ink fade (`fade(rawColors.bgDark, a)` or `$bgOverlay`). Keep `pastelPurple` only where it still means oath/magic on a small chip, or delete it if nothing uses it.
- J. **One screen title.** Every screen title is `$heading` 700 (Quest, Adventure, Exercises, Exercise, New quest/editor, Settings, session details, Swear an Oath, recap, credits, privacy, xp, and the Journal's title; the Journal body keeps Inter). Prefer one shared header title component if the screens already share one; otherwise set the font per screen.
- K. **One timer.** Every timer and countdown digit (warm-up timer, pre-start countdown, active, rest) is `$body` 700, tabular, `$text`. Session progress bars stay braise (they are the session's action line).
- L. **Controls on the scale.** Onboarding level choices and the village-name input `$3`; Share chip `$3`; the stepper's minus is the Lucide `Minus` (through `components/icons.ts`), the same size as `Plus`; the active-set tertiary links ("How to do it · Replace · I couldn't do this one") reach 44 dp through `hitSlop`; a disabled primary AppButton reads as a button: `$surface2` fill, `$textSecondary` label (>= 3:1 against its ground), no edge.
- M. **Engagement.** (1) Boss HP is an inked gauge under the boss name: 10 dp tall, `$bgDark` track, 1.5 px `$borderStrong` frame, fill from `bossHpColor`, the HP figure in `$body` tabular beside it; if the boss art leaves a dead band above the controls, let the art container flex into it under a `fade(bgDark)` gradient. (2) Titles on art: adventure cards and quest-list cards carry their title in a `Recitatif` on the art's bottom-left edge (the card body keeps its metadata), and the exercise detail's name sits in a `Recitatif` on its art (frame radius `$3`); the warm-up exercise name is `$heading` 20. (3) Victory is a gold plate: "QUEST COMPLETE!" sits as the Recitatif's kicker, all reward figures gold (decision G); the "Protect your hero" banner on Home is quiet (ash title, braise only on the chevron).
- N. **History placeholder.** The "-- ·" that leaks into a Journal history row is fixed at its formatter (show nothing, or the right value).

## Global Constraints

Same as `docs/superpowers/plans/2026-10-05-bd-direction.md` § Global Constraints. Read it. Tests in the worktree: `rtk proxy npx jest --testPathIgnorePatterns=/node_modules/ --testPathPatterns "a|b"`. Commit with hooks. Do not touch Metro, adb, Maestro or the emulator (the orchestrator runs them).

## Review Focus

1. A gold or braise change that breaks a label-on-fill rule (fill-labels and color-contrast tests must stay green; new pairs declared).
2. A digit set in Alegreya after the title changes.
3. A Recitatif over art that collides with chips or icons already on that art (quest cards have chips top-left and a favourite star bottom-right).
4. testIDs and accessibility props (Maestro flows press by them).
5. The boss gauge must not hide or duplicate the existing HP information, and must work in every boss phase.

---

### Task 1: Colour roles (G, H, the Protect banner)

Files: Victory and its rewards (`components/session/VictoryView.tsx`, `SessionRewards.tsx`, `NewRecordsBadge.tsx`, `OathFulfilledCard.tsx`), oath progress (`app/oath.tsx` and its rows), `components/village/VillageLists.tsx` tier bar, boss weakness line (`components/session/BossArena.tsx`), `app/exercises/index.tsx`, `components/exercises/MineCaption.tsx`, `components/quests/ExercisePickerSheet.tsx`, `components/quests/QuestConfigCard.tsx` (only if its braise value is not a control), the "FIRST TRIAL" kicker (find with `rg -n "first_trial|FIRST TRIAL|firstTrial" components app locales`), the Home "Protect your hero" banner (find with `rg -n "protect" components/home`).
- [ ] One failing test per family first (Victory XP value gold; oath bar gold; boss weakness braise; exercise "leads to" caption ash), then the changes, then `--testPathPatterns "victory|reward|record|oath|boss|exercise|village|home|color-contrast|fill-labels"`, tsc, biome. Commit "Gold is earned, braise is done".

### Task 2: No violet, one timer, titles everywhere (I, J, K)

Files: adventure list and detail (`app/(tabs)/adventures/index.tsx`, `[id].tsx`), quest detail info card (`app/(tabs)/quests/[id].tsx`), `components/session/RestView.tsx` wash, every screen title listed in J (find each header with `rg -n` on its title key), `components/session/WarmupView.tsx`, `PrepView.tsx`/the pre-start countdown, `ActiveExerciseView.tsx`, `RestView.tsx` timers.
- [ ] Tests: a title per family renders in the heading face (reuse the font assertion pattern of `__tests__/app-button-seal.test.tsx`); warm-up timer and pre-start countdown in the body face and `$text`; the quest-detail info card is not `pastelPurple`. Then the changes; `rg -n "pastelPurple" app components` to settle its fate. Run `--testPathPatterns "adventure|quest|rest|warmup|prep|countdown|settings|exercise|oath|journal|recap|heading-font|color-contrast"`, tsc, biome, deadcode. Commit "No violet, one timer, every title in the title font".

### Task 3: Controls on the scale and the history placeholder (L, N)

Files: `app/onboarding/training-level.tsx`, `app/onboarding/village-setup.tsx`, the Share chip (`components/share/ShareButton.tsx` and the session-details screen), the stepper (`components/common/Stepper.tsx` or the active-set reps stepper in `ActiveExerciseView.tsx`), the tertiary links in `ActiveExerciseView.tsx`, `components/common/AppButton.tsx` disabled state, the Journal history row formatter (find "--").
- [ ] Tests: AppButton disabled renders `$surface2` fill, `$textSecondary` label, no edge; the stepper renders the Minus icon; the history row never renders "--". Run `--testPathPatterns "onboarding|share|stepper|active|app-button-seal|journal|history|session-details"`, tsc, biome. Commit "Controls on the scale".

### Task 4: Engagement (M)

Files: `components/session/BossArena.tsx` (gauge, art flex), `app/(tabs)/adventures/index.tsx` and `app/(tabs)/quests/index.tsx` (Recitatif on card art; mind the chips and the star already on quest art), `app/exercises/[id].tsx` (Recitatif on the art, frame `$3`), `components/session/WarmupView.tsx` (name `$heading` 20), `components/session/VictoryView.tsx` (kicker inside the Recitatif area, rewards gold from Task 1).
- [ ] Tests: the boss gauge renders with the HP figure in the body face and its fill from `bossHpColor` in each phase; quest and adventure card titles render in a Recitatif; the exercise detail name in a Recitatif. Run `--testPathPatterns "boss|adventure|quest|exercise|warmup|victory"`, tsc, biome. Commit "Boss gauge, titles on art, a gold victory".

### Task 5: Docs

- [ ] DESIGN.md, docs/design/design-system.md and the spec: decisions G to N in the docs' voice; nothing the code contradicts. Commit "Document iteration 2".

### Gate (orchestrator)

Fix the audit flow so its shots are what their labels say (no duplicate scroll shots, the boss narrative and the instructions sheet captured), full suite under Node 24, re-capture, expert audit iteration 2. Iterate until VALIDATED.
