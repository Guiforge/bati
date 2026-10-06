# BD Iteration 4 Implementation Plan (polish)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The expert audit of iteration 3 VALIDATED the direction (8/8/8/8, no P1). This pass closes its two P2 and the P3 that are coherence or craft defects, so the store screenshots show the finished system. Report: `.audit/expert-iter3.md`.

**Architecture:** Reuse only: `GameIcon`/`useGameIcon`, `InkGauge`, `AppButton` (outline + red edge as in ruling C1), `$heading`, the 2 px label recipe, `fade()`.

**Tech Stack:** Expo SDK 57, React Native 0.86, Tamagui 2.7, jest 30 + RNTL 14, Biome.

**Spec:** `docs/superpowers/specs/2026-10-05-bd-direction-design.md` (iterations 1-3).

## Decisions

- U. **A held state says what it is.** Victory under 2 minutes (`tooShort`, waiting on "Keep it"): the short-session block (title, body, Keep it, Discard) renders above the fold, in the slot the level spacer would take; the XP card is not rendered in that state. The 78 dp spacer stays only for the in-flight save.
- V. **No emoji in the chrome.** `FlameFlicker` draws the game-icons `flame` glyph (through `useGameIcon`/`GameIcon`) tinted `$primaryText` when animated (streak alive) and `$muted` otherwise; flicker, gust count and `FLAME_SIZES` unchanged. The widget keeps its emoji (out of scope).
- W. **Dialog and choice titles in `$heading`:** "Session paused" title; onboarding level choices (Beginner/Regular/Advanced) like the quest detail's difficulty choices.
- X. **Every destructive outline has the red edge:** "Quit quest" in the pause dialog, same treatment as Discard; sentence case for the pause actions ("Restart round", "Quit quest") in both locales.
- Y. **One label recipe:** section headers in Settings ("PREFERENCES", "AVATAR", ...) and the exercise detail ("YOUR NUMBERS", "MUSCLES") use the same 14/700, `letterSpacing={2}` recipe as "QUICK ACTIONS" (reuse the existing component or style if one exists).
- Z. **One XP colour, one gauge, in the Journal too:** the Journal level card uses `InkGauge` (gold on `$gold800`, figure in `$body`) and its XP figure is `$resourceGold`; history rows set their "+N XP" segment in `$resourceGold`; session details' thin progress line under the XP becomes the same `InkGauge` or goes. The Journal keeps its Inter body face.
- AA. **Craft:** the no-art session plate gets a `$surface` ground with the 1 px `$borderStrong` frame and `$4` breathing room above the kicker; the Victory chart's x labels are not truncated (short month labels or every other one), bars spread across the plot, the axis stays inside the card, and a three-swatch difficulty legend (easy/medium/hard, `DIFFICULTY_COLORS`) explains the fills; the Village sheet's handle sits inside the sheet frame; non-art screens that scroll under the status bar get a `fade(rawColors.bgDark, .92)` band of `insets.top` (adventure steps, quest detail, village, village detail) if a shared header/screen wrapper makes it a one-place change, otherwise per screen.

Out of scope, noted: meta-row chip treatment (P3-7), onboarding cloud contrast (P3-9), the sticky Journal bubble (P3-10).

## Global Constraints

Same as `docs/superpowers/plans/2026-10-05-bd-direction.md` § Global Constraints. Tests: `rtk proxy npx jest --testPathIgnorePatterns=/node_modules/ --testPathPatterns "a|b"`. Commit with hooks. Do not run Metro, adb, Maestro. No em dash in copy. Colours only via tokens or `rawColors`.

## Review Focus

1. Short-session Victory: Keep it / Discard keep their testIDs (`session-victory-keep-short` etc.) and handlers; the saved path is unchanged.
2. The flame keeps its accessibility and reduced-motion behaviour.
3. Journal theme (`dark_journal`) remaps tokens: gold must still read gold there.
4. Locale copy changes in both `en` and `fr` (and others if the key exists there); locale-style tests green.
5. Status-bar band must not cover art headers or interactive elements.

---

### Task 1: Held state, flame, titles, destructive edge, labels (U, V, W, X, Y)
Files: components/session/VictoryView.tsx, components/common/FlameFlicker.tsx, components/session/PausedOverlay.tsx, app/onboarding/training-level.tsx, settings and exercise-detail section headers, locales. Tests first per decision. Commit "A held victory says so; the flame is inked; one label recipe".

### Task 2: Journal gauge and craft (Z, AA)
Files: Journal stats/level card and history rows (components/journal/*), components/journal/QuestLog.tsx, components/session/ProgressionChart.tsx, the Village sheet, the status-bar band. Tests first. Commit "One gauge in the Journal; chart, plate and sheet craft".

### Task 3: Docs
DESIGN.md, docs/design/design-system.md, the spec (Iteration 4 section), touched docs/screens/*. Commit "Document iteration 4".

### Gate (orchestrator)
Re-capture, plus a session over 2 minutes on a quest with art to show the level gauge and the plate; expert re-check of U-AA.
