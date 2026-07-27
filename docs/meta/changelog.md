---
title: Docs Wiki — Operation Log
type: technical
status: active
updated: 2026-07-18
related: [wiki-protocol.md, ../README.md]
---

# Docs Wiki — Operation Log

> Append-only record of meaningful changes to the wiki (Ingest / Lint / structure).
> Newest entries at the bottom. See [wiki-protocol.md](wiki-protocol.md) for the protocol.

---

## 2026-07-14 — Cleanup + LLM-wiki setup

**Structure reorg (align, dedupe, consolidate):**
- Normalized filenames to `UPPERCASE_SNAKE`: `roadmap_refactor` → `ROADMAP_REFACTOR`,
  `mobile` → `MOBILE`, `best_practice_workout` → `BEST_PRACTICE_WORKOUT`,
  `content_generation_complete` → `CONTENT_GENERATION`,
  `DEVELOPER_QUICK_REFERENCE` → `CONTENT_QUICK_REFERENCE`,
  `IMAGE_PROMPTS_BATCH` → `IMAGE_PROMPTS`, `prompt.image` → `IMAGE_STYLE_PROMPT`.
- Merged `image_prompts_quests_adventures.md` into `IMAGE_PROMPTS.md`.
- Removed obsolete status snapshots: `PROJECT_COMPLETE.md`, `CONTENT_GENERATION_SUMMARY.md`.
- Folded root `DESIGN.md` and `PRODUCT.md` into `docs/`.
- Fixed cross-links (docs + `scripts/README.md` now points at `IMAGE_STYLE_PROMPT.md`).
- Rewrote `README.md` as the categorized catalog (all links validated).

**LLM-wiki protocol established:**
- Added `WIKI.md` (schema: layers, categories, conventions, ingest/query/lint).
- Added this `log.md`.
- Added `raw/` source inbox.
- Wired the protocol into `README.md` and `.github/copilot-instructions.md`.

**State:** 32 topic docs + `pages/` (17 screen specs).

**Open lint items (next pass):**
- Backfill YAML frontmatter on pages that lack it (skip `DESIGN.md` token frontmatter;
  do not fabricate `updated` dates).
- `ROADMAP_ALIGNMENT.md` links to `../../proj/wiki/...` (outside the repo) — repatriate or neutralize.
- `docs/DESIGN.md`, `docs/PRODUCT.md`, `docs/ROADMAP_ALIGNMENT.md` are untracked — `git add` when kept.

## 2026-07-14 — pages/ brought to wiki conformance

- Added `type: screen` frontmatter (route · related · sources) to all 16 screen specs;
  `sources` points at the Expo Router files in `app/`.
- Converted inline flow references into real cross-links (Home ↔ Village/Treasury/Journal,
  Quests → Quest Details → Session, Adventures → Adventure Details → Quest Details, etc.).
- Removed the misplaced hero image prompt from `home.md`; merged it into
  [IMAGE_PROMPTS.md](../content/image-prompts.md) under "Screen Hero Prompts" (one source of truth).
- Rewrote `pages/README.md` as a proper screen-map index (grouped by flow).
- **Lint gap:** `app/exercises/[id].tsx` has no screen spec — add `exercise-details.md` when documented.

## 2026-07-18 — Topic-folder restructure + source-of-truth alignment

**Structure reorg (topic folders, kebab-case):**
- Moved every page from a flat `docs/*.md` list into topic folders:
  `product/`, `planning/`, `gameplay/`, `economy/`, `design/`, `architecture/`, `content/`,
  `screens/` (was `pages/`), `meta/` (was root `WIKI.md`/`log.md`), `raw/` (unchanged).
- Renamed every page to `kebab-case.md` (dropped the `UPPERCASE_SNAKE` convention from the
  previous pass — see [wiki-protocol.md](wiki-protocol.md) for the updated naming rule).
- Merged `REWARDS.md` + `VILLAGE.md` + `RESOURCES.md` → one canonical
  [rewards-and-progression.md](../economy/rewards-and-progression.md).
- Merged `SESSION.md` + `QUEST_SESSION_SPEC.md` → one canonical
  [session-flow.md](../gameplay/session-flow.md).
- Rewrote every internal link across `docs/` for the new folder depth (verified against the
  filesystem; zero broken internal links remaining as of this entry).

**Source-of-truth alignment (per `proj/wiki/projets/bati*.md`, cross-checked this pass):**
- Removed **Gold** from example victory-screen loot in `rewards-and-progression.md` and
  `session-flow.md` — the source wiki decision is "no Gold at MVP" (already flagged in
  `roadmap-alignment.md`, but two pages still showed it in examples).
- Corrected `rewards-and-progression.md` to lead with MVP scope (XP + derived village +
  flavor resources) and move the full Gold/building-economy design to an explicit
  "Phase 2+ (deferred)" section.
- Marked `coach-planning.md` `status: deferred` with a banner explaining goals/planning are
  off the MVP nav surface and the Coach is meant to be simple rules, not AI, pending sports-
  professional validation.
- Added status banners to `roadmap-archive.md` (archived) and `future-roadmap.md`
  (speculative, pre-alignment; roadmap-alignment wins on conflict).

**Not resolved (flagged for follow-up, not silently changed):**
- Visual-identity terminology is inconsistent ("dark fantasy / high-tech HUD" vs an older
  "Franco-Belgian comic book" phrasing in some merged content) — noted in
  [design/README.md](../design/README.md), left as-is pending a decision on which term to standardize.
- The external links to `proj/wiki/projets/*.md` and to the user-home `.agents/skills/`
  folder are intentionally kept outside the repo (personal cross-project wiki convention);
  not "fixed" to be repo-relative since they point outside the repository by design.

**State:** ~48 pages across 9 topic folders + `raw/`, one root `docs/README.md` catalog,
one `docs/CONTRIBUTING.md`.

## 2026-07-18 — Design clarity + roadmap efficiency pass

**Context:** User feedback flagged three pain points: "not clear", "not efficient", and
"white border ugly". This pass audited `docs/design` and `docs/planning`, then rewrote
source docs to remove contradictions and improve execution quality.

**Design docs updates:**
- Updated [design/README.md](../design/README.md) with resolved decisions:
  dark-only policy, one-primary-action rule, and explicit rejection of thick white/off-white borders.
- Rewrote [design/ui-guide.md](../design/ui-guide.md) into a concise product-UI guide
  with actionable principles (clarity, efficiency, accessibility, token discipline).
- Replaced [design/ui-checklist.md](../design/ui-checklist.md) with a Bati-specific quality gate
  (WCAG AA targets, touch-target minima, reduced-motion, and anti-white-border rule).
- Simplified [design/design-system.md](../design/design-system.md) narrative guidance to align
  with current visual direction and remove heavy-border ambiguity.

**Planning docs updates:**
- Updated [planning/README.md](../planning/README.md) to clarify document roles and usage flow.
- Rewrote [planning/roadmap-alignment.md](../planning/roadmap-alignment.md) as a clean
  source-of-truth roadmap with explicit MVP boundaries, execution phases, and acceptance template.
- Rewrote [planning/roadmap-refactor-ui.md](../planning/roadmap-refactor-ui.md) as an execution
  playbook focused on migration method (not competing prioritization).
- Rewrote [planning/future-roadmap.md](../planning/future-roadmap.md) into a compact
  parking-lot format for speculative items only.

**Outcome:** Reduced documentation drift, removed planning duplication, and converted roadmap/design
guidance into directly actionable checklists for delivery.

## 2026-07-18 — Design best-practices entry point added

- Added [design/design.md](../design/design.md) as the first-stop page for design decisions.
- Wired the new page into the design catalog and the root docs catalog.
- Consolidated the decision order for UI work: primary action → hierarchy → shared primitive → visual weight → accessibility.

## 2026-07-18 — Village refonte pass

- Refined the shared `Card` primitive to use tokenized dark surfaces and subtle borders.
- Updated the Village screen to remove the hardcoded white/black border treatment.
- Synchronized the Village screen spec and UI audit tracker with the new calmer hierarchy.

## 2026-07-18 — Home refonte pass

- Tightened the Home hierarchy so the current objective reads as the clear primary action.
- Simplified header, resource strip, secondary actions, and stats typography to reduce noise.
- Updated the Home screen spec and UI audit tracker to reflect the new implementation.

## 2026-07-18 — Quests refonte pass

- Reduced thick outline styling in the Quests gallery and quest details screens.
- Aligned quest thumbnails, difficulty chips, exercise cards, and the sticky start bar to the shared dark-card language.
- Updated the Quests screen docs and UI audit tracker to match the calmer hierarchy.

## 2026-07-18 — Session refonte pass

- Tightened the active, rest, pause, and victory states to use tokenized dark surfaces instead of loud pastel-heavy frames.
- Added reduced-motion gating for the confetti celebration in Victory.
- Updated the Session screen spec and UI audit tracker to reflect the calmer workout flow.

## 2026-07-18 — Adventures refonte pass

- Reduced gallery thumbnail borders and tokenized the gallery text hierarchy.
- Softened the Adventure Details card, narrative, and step list surfaces.
- Updated the Adventures screen specs and audit tracker to match the new hierarchy.

## 2026-07-18 — Journal refonte pass

- Calmed the Journal header and stats/history tabs to use the shared dark surface language.
- Shifted Session Details toward tokenized summary cards and lighter round markers.
- Updated the Journal and Session Details screen specs plus the audit tracker.

## 2026-07-18 — Treasury cleanup

- Tightened the Treasury header and value hierarchy so resource counts stay primary.
- Added treasury visual rules and an implementation note to the screen docs.

## 2026-07-18 — Goals and Schedule cleanup

- Calmed the Goals selector cards and day/duration controls with lighter borders.
- Shifted the Schedule rest suggestion into the shared surface language.
- Updated the Goals and Schedule screen docs plus the tracker.

## 2026-07-18 — Onboarding cleanup

- Aligned the onboarding presentation and avatar flow with the shared text/button hierarchy.
- Kept the immersive artwork while making the controls less custom and more consistent.
- Updated the onboarding screen docs and audit tracker.

## 2026-07-18 — Settings and Credits cleanup

- Tightened settings rows, avatar picker borders, and the preference header hierarchy.
- Calmed the credits page text and card surfaces.
- Updated the Settings and Credits screen docs plus the tracker.

## 2026-07-18 — Impeccable command runbook added to UI refactor roadmap

- Updated [planning/roadmap-refactor-ui.md](../planning/roadmap-refactor-ui.md) with an explicit
  Impeccable workflow for UI refonte: `init/document` (context), `critique + audit` (diagnostics),
  command routing by issue type (`layout`, `typeset`, `colorize`, `clarify`, `harden`, `optimize`,
  `adapt`), then `polish` and re-audit.
- Added severity-first handling guidance (P0 → P3) and CI detector recommendation
  (`npx impeccable detect`) to keep visual quality gates consistent.

## 2026-07-18 — Screen-by-screen UI audit execution started

- Added explicit execution order to [planning/roadmap-refactor-ui.md](../planning/roadmap-refactor-ui.md)
  and created [planning/ui-screen-audit-tracker.md](../planning/ui-screen-audit-tracker.md).
- Linked the tracker from [planning/README.md](../planning/README.md) and [docs/README.md](../README.md).
- Completed initial critique/audit entries for:
  - Home
  - Quests + Quest Details
  - Session
- Applied first Home refonte implementation pass in UI components:
  - unified dark surface/border recipe,
  - reduced heavy border styling,
  - improved label legibility and token consistency.

## 2026-07-18 — First full screen-by-screen audit cycle completed

- Completed initial critique/audit entries across all planned screen scopes in
  [planning/ui-screen-audit-tracker.md](../planning/ui-screen-audit-tracker.md):
  Home, Quests, Session, Adventures, Journal, Village, Treasury, Goals/Schedule,
  Onboarding, Settings/Credits.
- Added a consolidated prioritized backlog (P0/P1/P2) to drive implementation order.
- Confirmed the current first implementation pass remains focused on Home while
  all remaining scopes are now documented for iterative refonte waves.

## 2026-07-18 — Source-of-truth docs/code alignment pass

- Resolved the MVP reward-scope decision across product, planning, economy, gameplay, and Treasury
  docs: resources/Treasury are passive read-only feedback in MVP; Gold-first spending, shops, and
  manual building/economy loops remain Phase 2+.
- Added the missing [exercise-details.md](../screens/exercise-details.md) screen spec for
  `app/exercises/[id].tsx` and updated the screen index.
- Fixed invalid YAML `sources` entries for `[id]` screen routes by quoting route paths.
- Rewrote [technical-architecture.md](../architecture/technical-architecture.md) to match current
  Expo SDK, Jest, Zustand, route layout, stores, and DB modules.
- Updated [database-api.md](../architecture/database-api.md) for current preferences, resource codes,
  product-scope notes, and actual schema table names.
- Clarified design rules: `useGameIcon` is required for fantasy/resource/game icons, Tamagui lucide
  is acceptable for utility/navigation icons, and inline styles are allowed only for React Native/API
  requirements rather than semantic visual recipes.

## 2026-07-18 — Minimalist progression redesign (docs-only)

- Wrote [planning/system-redesign-options.md](../planning/system-redesign-options.md): options
  with pros/cons for resources, village, flame, boss tokens, stats, and coach, aimed at cutting
  the system down to "one journal, everything else derived."
- Replaced `economy/rewards-and-progression.md` (and the `economy/` folder) with
  [gameplay/progression.md](../gameplay/progression.md): removed all resources
  (wood/stone/fire/water/wind/grain/mana/leaf), Gold, and boss tokens as an inventory concept.
  The village is now documented as one derived scene (5 tiers + overlays), not a list of
  managed buildings.
- Rewrote [gameplay/statistics-progress.md](../gameplay/statistics-progress.md) down to 4
  derived views (muscle balance, PRs, sessions/week, calendar), removing the 3 dedicated
  aggregate tables from the design.
- Rewrote [gameplay/coach-planning.md](../gameplay/coach-planning.md) from a deferred
  goals/plans/scheduling/notifications system to 3 active rules (weekly goal, weak-area,
  rest) evaluated against the journal, with one persisted setting.
- Deleted `screens/treasury.md`; rewrote [screens/village.md](../screens/village.md) for the
  single-scene design; deferred `screens/goals.md` and `screens/schedule.md` in favor of a
  Coach card on Home.
- Updated cross-links and folder tables in `product/`, `gameplay/`, `screens/`, `README.md`,
  `CONTRIBUTING.md`, and `meta/wiki-protocol.md` to match. No code was changed — `db/resources.ts`,
  `db/buildings.ts`, and the related UI still implement the old (now superseded) design.

## 2026-07-18 — Design docs consolidation (docs-only)

- `docs/design/` had the same ~9 rules (dark-only, one CTA, no thick borders, WCAG AA,
  44×44 touch targets, tokens-only, reduced motion) restated across 5 files
  (`README.md`, `design.md`, `design-system.md`, `ui-guide.md`, `ui-checklist.md`), plus a
  531-line generic `mobile-ux-handbook.md` (iOS HIG/Material/WCAG textbook content, not
  Bati-specific, and its `#121212` dark-mode recommendation contradicted the project's own
  `bg-void: #0B0F19` token).
- Merged `design.md` and `ui-guide.md` into [design-system.md](../design/design-system.md)
  as the single canonical page (tokens + rules stated once + decision order); deleted both
  source files and `mobile-ux-handbook.md`.
- Trimmed [exercise-colors.md](../design/exercise-colors.md): removed the dead "Village
  Buildings" color table (buildings were removed in the progression redesign above) and
  speculative/filler sections (future colorblind modes, "why colors" rationale).
- Rewrote [design/README.md](../design/README.md) as a pure index (dropped the duplicated
  "current design decisions" section, now redundant with design-system.md).
- `docs/design/` went from 7 files (~1200 lines) to 4 files (~430 lines).

## 2026-07-18 — React Native performance page (research + docs)

- Added [architecture/performance.md](../architecture/performance.md): RN performance best
  practices and antipatterns filtered to Bati's actual stack (New Architecture, Hermes,
  React Compiler, Tamagui, Zustand, `@legendapp/list`, `expo-image`, SQLite/Drizzle),
  compiled from current (2026) React Native / Reanimated / Tamagui / Zustand documentation
  and practitioner guides.
- Flagged a real instance of the "whole-store Zustand subscription" antipattern already in
  the codebase (`PausedOverlay.tsx`, `CountdownView.tsx`, `BossTauntOverlay.tsx` call
  `useSessionStore()` with no selector) as a non-blocking cleanup target.
- Linked from [architecture/README.md](../architecture/README.md) and the root
  [catalog](../README.md). Added a pointer in [`AGENTS.md`](../../AGENTS.md). No code was
  changed.

## 2026-07-20 — Doc-vs-reality fixes + screen redesign proposals (draft)

**Doc-vs-reality fixes** (found while auditing the real user journey against code, not just
docs — same pattern as the Home i18n bug found in `ui-screen-audit-tracker.md` Round 6):

- [product/feature-overview.md](../product/feature-overview.md): Flame/streak was listed
  "Planned (Phase 2)" — it's implemented (`db/streaks.ts`, shown on Home and Village). Updated.
- [gameplay/boss-fights.md](../gameplay/boss-fights.md): HP System was labeled "(Planned)" —
  it's live (`BossHpBar`, `BossTauntOverlay`, wired into `ActiveExerciseView`/`RestView`).
  Updated.
- [screens/village.md](../screens/village.md): implementation note still described the old
  ~20-building management screen as current. The single-scene rebuild
  (`VillageScene.tsx`) already shipped — no buildings, no management. Updated; flagged the
  one real remaining gap (generic icon reused across all 5 tiers, not distinct illustrations).

**New draft page**: [planning/screen-redesign-proposals.md](../planning/screen-redesign-proposals.md)
— options-to-review doc (same pattern as `system-redesign-options.md`) covering 4 findings
from a code-level review: merge the Adventures/Quests tabs (duplicate a choice Home's smart
CTA already makes), add one onboarding step for training level/focus (currently zero
personalization signal is captured), give Village's 5 tiers distinct illustrations (currently
one generic icon for all tiers — the biggest visible gap in the "accomplishment" loop), and
delete an unused dead component (`ContinueAdventureFab.tsx`). Session, Victory, Journal, and
Home reviewed and confirmed already matching the design system — no proposal needed there.
Linked from the root [catalog](../README.md) and [planning/README.md](../planning/README.md).

## 2026-07-20 — Screen redesign proposals: refined per user feedback

Revised [planning/screen-redesign-proposals.md](../planning/screen-redesign-proposals.md)
after review:

- **§2 Onboarding**: changed from "add a 4th step" to "merge avatar + name into one lighter
  screen, keep total steps flat at 3" — the full-screen swipe-gesture avatar picker
  (`choose-avatar.tsx`) was flagged as disproportionately heavy for a cosmetic choice; the
  merge pays for the previously-proposed training-level step without growing onboarding length.
- **§3 Village**: expanded from "5 tier illustrations" into a 3-layer asset system (base tier,
  sport-focus overlay by dominant muscle, per-boss banner icon reusing existing adventure art)
  so feedback visibly varies by level, sport, and which boss was beaten — not just level.
  Explicitly framed against a combinatorial art trap (tier × sport × boss ≠ separate paintings
  per combination; layers on one scene, matching `progression.md`'s existing model).
- **New §5 Session**: found `ActiveExerciseView.tsx`/`RestView.tsx` render a static generic
  muscle icon for every exercise (`/* In a real app, we'd resolve currentEx.exercise.imagePath
  */`) despite `exercises.imagePath` already existing in the schema — a rendering gap on the
  screen the user spends the most time on mid-workout. Gated the recommendation on checking
  real image coverage first via the existing [missing-covers.md](../content/missing-covers.md)
  tracker, rather than assuming the art already exists.
- Confirmed session *mechanics* (boss HP damage numbers, rep bounce, haptics, manual
  completion) need no change — only the exercise imagery does.
- Dev plan intentionally left as a pointer, not expanded — per instruction, this doc stays
  product/design-only until the checkboxes are resolved; the dev task breakdown is the next,
  separate deliverable.

## 2026-07-20 — Screen redesign proposals: all 5 decided

All checkboxes in [planning/screen-redesign-proposals.md](../planning/screen-redesign-proposals.md)
resolved: §1 Navigation → **B, keep two tabs** (against the doc's own recommendation — noted,
not overridden); §2 Onboarding merge → A; §3 Village 3-layer visuals → A; §4 delete
`ContinueAdventureFab.tsx` → yes; §5 render real exercise imagery → A. Status flipped from
`draft` to `active`. Added a `Decisions` summary table up top and marked each section's
checkbox with the decision date. Plan for devs section updated to name the 4 approved items
(§1 excluded, no work follows) — task breakdown itself is still deferred as a separate
deliverable, per standing instruction to keep this doc product/design-only.

## 2026-07-20 — Dev execution plan for approved redesigns

Added [planning/dev-execution-plan.md](../planning/dev-execution-plan.md): the phased task
breakdown promised by the proposals doc. 4 phases ordered by ascending risk, each behind a
quality gate (`npm run check` + `npm test` + UI checklist + screenshot) and its own
single-scope commit: (1) delete dead FAB, (2) render exercise imagery, (3) per-boss village
banners, (4) onboarding merge + skippable training-level step. Readiness was re-verified
against the working tree, which changed the plan from the proposals doc's assumptions:
exercise art (§5) and boss art (§3 layer 3) **already exist on disk** (landed in a prior
content commit), so both are dev-ready now rather than content-blocked; only §3's tier
illustrations + sport sprites remain blocked on missing art. §1 (nav) not scheduled. Gate
scope explicitly limited to files each phase touches, not the ~147 pre-existing repo-wide lint
warnings. Linked from the root [catalog](../README.md) and [planning/README.md](../planning/README.md).

## 2026-07-20 — All 4 approved redesign phases shipped

Implemented every phase of the dev execution plan, each gated (tsc + jest green, lint clean on
the diff) and committed separately:

- `bd9e158` — **prerequisite:** fixed a stale `db-exercises` test whose hardcoded
  `assets/placeholder.jpg` assertion broke once the `0006` seed shipped real exercise art;
  now asserts `imagePath` presence, decoupled from the content filename.
- `3ad0122` — **Phase 1 (§4):** deleted the unused `ContinueAdventureFab.tsx`.
- `9097a1c` — **Phase 2 (§5):** `ActiveExerciseView` + `RestView` now render the real
  per-exercise image via `getExerciseAsset` (placeholder fallback retained); layout unchanged.
- `cdac3cb` — **Phase 3 (§3, layer 3 only):** `getBossBanners` returns `adventures.imagePath`
  and `VillageScene` shows each boss's own art instead of the shared `Crown`. §3 layers 1–2
  (tier illustrations, sport sprites) remain open, blocked on missing art.
- `f845ec7` — **Phase 4 (§2):** merged the swipe avatar picker + name screen into one
  `hero-setup` (tap-select strip + name), added a skippable `training-level` final step;
  onboarding stays 3 steps (`presentation → hero-setup → training-level`). New `trainingLevel`
  preference persisted via `db/preferences.ts` (null = skipped); no Zustand field added since
  no reactive reader exists yet (coach wiring is a separate follow-up). Deleted
  `choose-avatar.tsx` + `village-name.tsx`; added EN/FR keys.

**Pending:** on-device screenshot QA for phases 2–4 (no simulator in the build env — automated
gate passed, visual verification remains). §3 layers 1–2 and §1 unchanged.

---

## 2026-07-27 — Ingest (source only): bodyweight fitness research dossier

- **Added** [`raw/bodyweight-app-research.md`](../raw/bodyweight-app-research.md) — external
  literature review (training science: volume/frequency/RIR/bodyweight progression;
  gamification & retention evidence; competitor teardown; WHO guidelines). Stored verbatim
  as an immutable source.
- **Updated** [`raw/README.md`](../raw/README.md) — new `Sources` index listing it.
- **Updated** [`content/workout-best-practices.md`](../content/workout-best-practices.md) —
  header now points to the research as its evidence base and flags that the research wins
  on conflict.

**Pending:** the actual ingest. The dossier is *not* reflected in the wiki pages it should
inform — `content/workout-best-practices.md` (volume/rest/RIR targets, exercise order),
`gameplay/progression.md` + `gameplay/oaths.md` (streak forgiveness / repair mechanics),
`gameplay/coach-planning.md` (48 h rule, deload, weekly goal vs WHO baseline),
`screens/onboarding.md` (D1 activation, PAR-Q). Ask for it as a separate pass.

---

## 2026-07-27 — Content audit + quests/adventures work roadmap

- **Audited** the seeded content against the research dossier (measured, not assumed): the 13
  quests are 4–41 min (target 10–25), 20 of 46 exercises are used by zero quest, `Squat` and
  `Wall Sit` are tagged `chest` (skews boss damage + the Coach's weak-area rule), and 6 quests /
  4 adventures / 4 bosses that are fully specified **and already illustrated** were never seeded.
- **Added** [`planning/work-roadmap.md`](../planning/work-roadmap.md) — the overhaul plan:
  design rules per quest archetype, per-quest rebalance table for the 13 existing quests,
  seeding of the written-but-unseeded content, 2 equipment-free pull exercises, 8 new quests,
  5 new adventures (incl. a beginner on-ramp), migrations `0012`–`0018`, content-invariant
  tests, art checklist and phase gates.
- **Updated** [`planning/README.md`](../planning/README.md) and the root
  [catalog](../README.md) with the new page.
