# BD Audit Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the gaps the 2026-10-05 device audit found after the BD direction landed on `feat/bd-direction`: villager avatars that do not meet their bubbles, primaries without the seal, mixed title fonts, braise spent on metadata, radii off the scale.

**Architecture:** Same system, wider coverage. Every fix reuses what the BD direction built (`AppButton` seal, `Recitatif`, the `$heading` font, the radius scale, `rawColors`); one new token, `parchment`, for the speech bubbles.

**Tech Stack:** Expo SDK 57, React Native 0.86, Tamagui 2.7, jest 30 + RNTL 14, Biome.

**Spec:** `docs/superpowers/specs/2026-10-05-bd-direction-design.md` (rules 1 to 11 bind), plus the audit decisions below, which extend it.

## Audit decisions (extend the spec)

- A. **Phylactère:** the villager's face sits in a round ink medallion (`$bgDark` fill, 1.5 px `$borderStrong` ring) and is top-aligned with its bubble; the bubble's tail points at the face's centre. One bubble style everywhere: fill `$parchment` (new raw colour `#D9CFBC`), name `$ink800` 12/700, line `$bgDark` 14 regular (never bold).
- B. **Every primary action is the seal:** Home's "Start", the session's "Done" (and its past-target success state), the rest "I'm ready" become `AppButton` primaries (or, past target, `backgroundColor="$success"`, which AppButton labels in ink without an edge). No extra glow.
- C. **Titles:** screen titles and names of things in the world (quests, adventures, the village, buildings when shown as titles) are set in `$heading` (Alegreya 700). Lists, labels, metadata and the Journal (Inter, its own theme) stay as they are. Alegreya never sets a digit.
- D. **Braise means action:** metadata lines (a quest card's type and muscle line, quick-action duration pills) move from braise to `$textSecondary`; links and buttons keep braise.
- E. **Radius scale reaches the main screens:** filter chips (`FilterRail`) are pressable chips (`$3`, 1 px border); the rest screen's cards, the village cards and the Home quick-action tiles use `$3`.
- F. **Récitatif on exercise art:** the exercise name over the exercise illustration (`ExerciseHero`) sits in a `Recitatif`, like a quest title over its art.

## Global Constraints

Same as `docs/superpowers/plans/2026-10-05-bd-direction.md` § Global Constraints (worktree, `/usr/bin/git`, `rg`, focused jest with `--testPathIgnorePatterns=/node_modules/ --testPathPatterns "a|b"`, no tsc concurrently with jest, colours only in rawColors, no em dash in user-visible copy, React Compiler on, commit trailer). Read it.

## Review Focus

1. A session primary that moves when pressed or loses its hold behaviour (the outing finish button holds; Done past target turns success): pressing must still do exactly what it did.
2. A title switched to Alegreya that renders a digit.
3. Villager slot heights pinned by tests (`villager-line.test.tsx` reserve height, `villager-cameo` band geometry) must not change.
4. Contrast of the new `parchment` fill against its ink text and name (pinned in `color-contrast.test.ts` FILL_LABELS).
5. Accessibility labels and testIDs of every converted button stay as they were (Maestro flows and tests press by them).

---

### Task 1: Villagers speak from a medallion, on parchment

**Files:** `constants/rawColors.ts` (add `parchment: "#D9CFBC"` with a comment), `__tests__/color-contrast.test.ts` (FILL_LABELS: `["bgDark","parchment"]`, `["ink800","parchment"]`), `components/chorus/VillagerLine.tsx`, `components/chorus/VillagerCameo.tsx`, their tests.

- [ ] Write failing tests: `villager-line.test.tsx` asserts the bubble background is `rawColors.parchment`, the face sits inside a medallion (testID `villager-medallion`) whose background is `rawColors.bgDark`, and the row is top-aligned (`alignItems: "flex-start"` on the row's flattened style); `villager-cameo.test.tsx` asserts the bubble is `rawColors.parchment` and the line's `fontWeight` is not bold (`"400"` or undefined).
- [ ] VillagerLine: row `items="flex-start"`; wrap the 44 px face in a 48 px circle (`$bgDark`, `borderWidth={1.5}`, `borderColor="$borderStrong"`, centred content, testID `villager-medallion`); bubble fill and tail `$parchment`; tail `t` = medallion centre minus half the tail height (48/2 − 7 = 17). Keep the reserve slot height, the 3-line clamp and the typed/transparent split; if the 4 px larger medallion would exceed a pinned slot height, keep the medallion at 44 and the face at 40 instead.
- [ ] VillagerCameo: bubble fill and tail `$parchment`; line weight regular (drop the bold); keep its figure (a full figure, not a medallion: the cameo is the large village scene).
- [ ] Run `--testPathPatterns "villager|color-contrast|guide-seen|home-drag"`, tsc, biome. Commit: "Villagers speak from a medallion, on parchment".

### Task 2: Every primary is the seal

**Files:** `components/home/HomeStage.tsx` (the filled CTA), `components/session/ActiveExerciseView.tsx` ("Done" and its past-target state; the outing finish hold button only if it is a plain primary press, see below), `components/session/RestView.tsx` ("I'm ready"), their tests.

- [ ] Read each button first: what it renders (icon, label), its testID / accessibilityLabel, its press handler, any long-press or hold behaviour, and any style that encodes state (past target = `$success`).
- [ ] Convert each plain-press primary to `<AppButton>` (variant primary; `backgroundColor="$success"` where the current code paints success), keeping testID, accessibility props, `onPress`, `disabled`, and the icon (`icon` prop). Drop the Home CTA's `$primaryGlow` shadow. A hold-to-confirm button (the outing finish sweep) keeps its own component: only make its radius `$3` and its label font `$heading`, and leave its hold logic untouched.
- [ ] Tests: add or extend one test per converted screen asserting the button now has the seal edge (`borderBottomWidth` 3 with `rawColors.primaryEdge`), found by its existing testID; the past-target Done has no 3 px edge and an ink label.
- [ ] Run `--testPathPatterns "home|session-active|active-exercise|rest-view|countdown|outing|app-button-seal"`, tsc, biome. Commit: "Every primary action is the seal".

### Task 3: Titles in Alegreya, braise for actions only, radii on the scale, récitatif on exercise art

**Files:** screen headers in `app/(tabs)/quests/index.tsx`, `app/(tabs)/adventures/index.tsx`, the village name in `components/village/` (find with `rg -n "Testville|villageName|village.name" components/village app`), quest card titles (`QuestRow` in `app/(tabs)/quests/index.tsx`) and adventure card titles; the metadata line in QuestRow and the adventure card; the quick-action duration pill in `components/home/QuickActions.tsx`; `components/common/FilterRail.tsx`; the cards in `components/session/RestView.tsx`; the village cards (`components/village/VillageLists.tsx` and siblings); the quick-action tiles in `QuickActions.tsx`; `components/session/ExerciseHero.tsx`.

- [ ] Titles (decision C): set `fontFamily="$heading"` (weight 700) on the screen titles and world-name titles listed; never on a line that renders a number (if a title concatenates a count, split the count into a `$body` span or leave that title alone and say so).
- [ ] Braise (decision D): QuestRow's and the adventure card's type/muscle line, and the quick-action duration pill (text, icon and border), move to `$textSecondary` (border `$borderStrong`).
- [ ] Radii (decision E): FilterRail chips `rounded="$3"` with `borderWidth={1}`; RestView's cards, the village cards and the quick-action tiles `rounded="$3"` (use the shared `Card` where the element is a plain card and swapping is a one-line change; otherwise set the radius).
- [ ] Récitatif (decision F): in `ExerciseHero`, the exercise name over the art becomes `<Recitatif numberOfLines={2}>`, pinned bottom-left where the H1 sits now, with the same accessibility role; keep its gradient only if other text still sits on the art.
- [ ] Tests: extend an existing test per surface where one renders it (quests list, filter rail, exercise hero, rest view) with one assertion each (font family on a title, `$textSecondary` on a metadata line, radius 7 on a filter chip, the Recitatif on the exercise name). Update the `color-contrast` declared lists if the scan asks.
- [ ] Run `--testPathPatterns "quest|adventure|village|filter-rail|rest-view|exercise-hero|home|color-contrast|fill-labels"`, tsc, biome, deadcode. Commit: "Titles in Alegreya, braise for actions only, radii on the scale".

### Task 4: Docs

- [ ] `DESIGN.md` and `docs/design/design-system.md`: add `parchment`, the medallion, decision B to F, in the docs' own voice; no stale statement left. Commit: "Document the audit fixes".

### Final gate (orchestrator)

Full suite under Node 24, tsc, biome ci, knip, expo-doctor; release build on the emulator; re-capture Home, Quests, session (active, rest), Village, Journal, Adventures; re-audit against the audit list.
