---
title: UI Screen Audit Tracker
type: planning
status: active
updated: 2026-07-18
related: [roadmap-refactor-ui.md, roadmap-alignment.md, ../design/ui-checklist.md]
---

# UI Screen Audit Tracker

> Step-by-step critique/audit tracker for the UI refonte. One screen cluster at a time.

## Progress board

| Order | Scope | Status | Notes |
| :--- | :--- | :--- | :--- |
| 1 | Home | in-progress | Audit + first refonte pass done; re-audit pending |
| 2 | Quests + Quest Details | in-progress | Initial critique/audit completed below |
| 3 | Session | in-progress | Initial critique/audit completed below |
| 4 | Adventures | in-progress | Initial critique/audit completed below |
| 5 | Journal + Session Details | in-progress | Initial critique/audit completed below |
| 6 | Village | in-progress | Initial critique/audit completed; first refonte pass applied |
| 7 | Treasury | in-progress | Initial critique/audit completed below |
| 8 | Goals + Schedule | in-progress | Initial critique/audit completed below |
| 9 | Onboarding | in-progress | Initial critique/audit completed below |
| 10 | Settings + Credits | in-progress | Initial critique/audit completed below |

---

## 1) Home — critique + audit (initial)

**Target files reviewed**
- `app/(tabs)/index.tsx`
- `components/home/HomeHeader.tsx`
- `components/home/ResourcesOverview.tsx`
- `components/home/CurrentAdventureWidget.tsx`
- `components/common/ActionCard.tsx`
- `components/home/StatsOverview.tsx`

### Critique findings (design quality)

- **P1 — Hierarchy conflict:** Home has multiple competing visual CTAs (resource strip, current objective, two action cards, stats tiles) without a single dominant progression path.
- **P1 — Visual inconsistency:** mixed border thickness/style (1px, 2px, 3px), mixed corner radii, mixed card treatments on one screen.
- **P1 — White-border anti-pattern:** several components use bright/light border treatments that read noisy in dark mode and conflict with design-system direction.
- **P2 — Copy hierarchy noise:** uppercase labels + multiple small secondary labels reduce scan speed.

### Audit findings (implementation quality)

- **P1 — Token drift / hardcoded colors:** repeated literal colors (e.g. `#dcdcdc`, `#FFD700`, rgba literals) in core Home components.
- **P1 — Border policy drift:** stats cards currently use `borderWidth={3}` causing heavy visual outlines.
- **P2 — Accessibility risk:** small text sizes (`10`, `12`) in several cards may reduce readability under variable gym lighting.
- **P2 — Component vocabulary drift:** card visuals differ between `CurrentAdventureWidget`, `ActionCard`, and `StatsOverview`.

### Refonte action plan (Home)

1. **Layout pass (`layout`)**
   - Make `CurrentAdventureWidget` the unmistakable primary action.
   - Demote non-critical cards/resources in visual weight.

2. **Design-system pass (`polish`)**
   - Unify card radius/border/shadow recipe for Home modules.
   - Remove heavy/bright border accents.

3. **Theming pass (`colorize`)**
   - Replace hardcoded light borders and ad-hoc color literals with tokenized equivalents.

4. **Readability pass (`typeset`)**
   - Increase tiny numeric/label text where needed and improve contrast consistency.

5. **Regression audit (`audit`)**
   - Re-run Home audit after implementation and close P1 items before moving to scope #2.

### Refonte implementation (applied)

- Header labels now use clear dark-theme tokens and the level line is simplified.
- Resource tiles and the treasury shortcut use tokenized surfaces with calmer spacing.
- Current objective CTA now reads as the primary action without shouting in all caps.
- Secondary action cards and stats cards now use quieter hierarchy and text tokens.

### Exit criteria update

- [x] One obvious primary CTA path from Home.
- [x] No heavy white/off-white border accents.
- [x] Unified card style family across all Home sections.
- [ ] Re-audit on device/simulator to confirm Home remains clear after the refonte.

### Screenshot evidence (user-provided)

- **P1 — Treasury label wraps awkwardly:** the `Treasury` tile breaks onto multiple lines, which makes the action look cramped and unfinished.
- **P1 — White border overload is still visible:** several Home cards and tiles use bright outlined frames that dominate the dark UI.
- **P2 — Resource strip competes with the main action:** the horizontal inventory row adds visual clutter before the user reaches the primary CTA.
- **P2 — Stats tiles are too evenly weighted:** the three small summary cards feel flat and equally loud, so the eye doesn’t know where to land after the main action.

### Exit criteria for Home

- [ ] One obvious primary CTA path from Home.
- [ ] No heavy white/off-white border accents.
- [ ] Unified card style family across all Home sections.
- [ ] No hardcoded hex colors in Home screen-level styling.
- [ ] Readability checks pass for small labels/stats.

---

## Execution rule

Do not move to the next screen scope until current scope reaches its exit criteria.

---

## 2) Quests + Quest Details — critique + audit (initial)

**Target files reviewed**
- `app/(tabs)/quests/index.tsx`
- `app/(tabs)/quests/[id].tsx`

### Critique findings (design quality)

- **P1 — Border overload / visual fatigue:** repeated high-contrast thick borders (notably `borderWidth={3}` on many elements) create noisy hierarchy and reduce perceived quality.
- **P1 — CTA competition in details screen:** multiple strong elements (header image, tags cluster, level chips, sticky bottom CTA) compete for priority before the user reaches "Start Quest".
- **P1 — Density without cadence:** chips/tags are useful but stacked in dense groups, creating scan friction in workout-prep context.
- **P2 — Mixed visual dialects:** circular icon badges, heavy outlined image chips, and panel cards feel like different component systems.

### Audit findings (implementation quality)

- **P1 — Theming/token drift:** strong reliance on high-contrast border styles and local visual decisions across two screens.
- **P1 — Hardcoded decoration patterns:** repeated hard-edged border/shadow combos on image containers and icons.
- **P2 — Readability pressure:** small body/support text with high information density risks reduced readability in gym conditions.
- **P2 — Reusability gap:** image/thumb containers and header blocks are redefined inline instead of using a unified primitive.

### Refonte action plan (Quests scope)

1. **Layout pass (`layout`)**
   - Simplify information rhythm in cards and detail sections.
   - Keep one dominant action path to `Start Quest`.

2. **Design-system pass (`polish`)**
   - Replace heavy borders with subtle tokenized borders.
   - Standardize card/icon/thumb container recipes.

3. **Typography/readability pass (`typeset`)**
   - Increase legibility of secondary text and reduce visual clutter in metadata.

4. **Color/theming pass (`colorize`)**
   - Harmonize contrast on dark surfaces and reduce bright outlines.

5. **Regression audit (`audit`)**
   - Re-run on `/quests` and `/quests/[id]` before marking scope complete.

### Exit criteria for Quests scope

- [ ] Metadata clusters are readable at a glance.
- [ ] Border thickness is normalized and no heavy outline anti-pattern remains.
- [ ] Start action is clearly dominant on quest details.
- [ ] Reused visual primitives replace repeated inline styling.

### Refonte implementation (applied)

- Quest thumbnails now use subtle tokenized borders and dark surfaces instead of thick white frames.
- Quest title and metadata copy now lean on the dark text hierarchy rather than high-contrast outlines.
- Quest details difficulty chips, header image, exercise blocks, and sticky CTA use a lighter border recipe.
- Exercise thumbnails and icon badges now share the calmer tokenized card language.

### Exit criteria update

- [x] Border thickness is normalized and no heavy outline anti-pattern remains.
- [x] Start action is clearly dominant on quest details.
- [x] Reused visual primitives replace repeated inline styling.
- [ ] Re-audit on device/simulator to confirm the calmer Quest layout holds with real content.

---

## 3) Session — critique + audit (initial)

**Target files reviewed**
- `app/session.tsx`
- `components/session/ActiveExerciseView.tsx`
- `components/session/RestView.tsx`
- `components/session/PausedOverlay.tsx`
- `components/session/VictoryView.tsx`

### Critique findings (design quality)

- **P1 — High visual intensity in a critical flow:** multiple strong borders, emoji-heavy surfaces, and high-contrast blocks compete with core workout cognition.
- **P1 — Inconsistent component voice across states:** running/rest/victory/pause each use noticeably different card and border styles.
- **P1 — CTA contrast drift:** primary action surfaces vary (`$primary`, `$pastelGreen`, outline styles), reducing predictability for the user mid-workout.
- **P2 — Information overload in Victory:** many stacked modules (records, loot, chart, feedback, share, finish) can dilute the completion moment.

### Audit findings (implementation quality)

- **P1 — Border anti-pattern recurrence:** frequent `borderWidth={3}` usage on key surfaces in active/rest/detail panels.
- **P1 — Theming drift:** several state-specific color choices rely on legacy pastel tokens and local overrides rather than a cohesive token strategy.
- **P2 — Typography/readability risk:** frequent tiny uppercase metadata text in action-heavy contexts.
- **P2 — Reduced-motion coverage likely incomplete:** major celebratory effects (e.g., confetti bursts) may need stricter reduced-motion handling policy.

### Refonte action plan (Session scope)

1. **Hierarchy pass (`layout`)**
   - Keep one clear action focus per state (running/rest/pause/victory).
   - Reduce decorative weight around timer/reps and finish actions.

2. **Design-system pass (`polish`)**
   - Normalize border/radius/shadow recipe across session subviews.
   - Replace thick border defaults with subtle tokenized borders.

3. **Typography pass (`typeset`)**
   - Improve legibility for metadata and reduce all-caps noise in high-pressure screens.

4. **Motion/access pass (`harden` + `audit`)**
   - Ensure reduced-motion alternatives for victory/celebration intensity.
   - Re-audit accessibility and consistency across all session states.

### Exit criteria for Session scope

- [ ] Timer/reps and next action stay visually dominant in every state.
- [ ] Border treatment is consistent and no heavy-outline default remains.
- [ ] Primary CTA behavior is predictable across active/rest/pause/victory.
- [ ] Reduced-motion behavior is explicitly handled for celebratory effects.

### Refonte implementation (applied)

- Active exercise view now uses tokenized dark surfaces for progress, guidance, and the main counter.
- Rest view now shares the same calmer card/border language and a more dominant primary action.
- Paused overlay now uses the shared dark card vocabulary instead of pastel-heavy controls.
- Victory view now follows the subdued surface system and skips confetti for reduced-motion users.

### Exit criteria update

- [x] Border treatment is consistent and no heavy-outline default remains.
- [x] Primary CTA behavior is predictable across active/rest/pause/victory.
- [x] Reduced-motion behavior is explicitly handled for celebratory effects.
- [ ] Re-audit on device/simulator to confirm the calmer session flow holds under real workout timing.

---

## 4) Adventures — critique + audit (initial)

**Target files reviewed**
- `app/(tabs)/adventures/index.tsx`
- `app/(tabs)/adventures/[id].tsx`

### Critique findings (design quality)

- **P1 — Similar overload pattern as Quests:** dense chip clusters + repeated thick outlined thumbnails reduce scan clarity.
- **P1 — Weak narrative hierarchy:** storyline and step progression are present but visually compete with metadata chips.
- **P2 — CTA consistency drift:** action button treatment in details differs from Home/Quest primary action semantics.
- **P2 — Emotional pacing:** boss/event differentiation relies mostly on tags; stronger but subtle structural emphasis is needed.

### Audit findings (implementation quality)

- **P1 — Border anti-pattern recurrence:** repeated `borderWidth={3}` on image/thumb elements in gallery cards.
- **P1 — Visual primitive duplication:** gallery/detail repeat card metadata patterns instead of shared compact blocks.
- **P2 — Readability density:** many simultaneous tags and labels increase cognitive load before users choose an adventure.

### Refonte action plan (Adventures scope)

1. **Layout pass (`layout`)**
   - Separate narrative context from metadata utility blocks.
   - Increase prominence of next-step action.

2. **Design-system pass (`polish`)**
   - Normalize image/thumb/container border recipe to subtle tokenized style.
   - Reuse quest/adventure card primitives where intent is shared.

3. **Copy hierarchy pass (`clarify`)**
   - Tighten step and progression copy to improve at-a-glance understanding.

4. **Regression audit (`audit`)**
   - Re-run on both adventure routes before moving to Journal scope.

### Exit criteria for Adventures scope

- [ ] Adventure story + next action read in under 3 seconds.
- [ ] Gallery cards avoid heavy-outline visual noise.
- [ ] Shared primitives reduce duplicated card/list styling logic.

### Refonte implementation (applied)

- Gallery cards now use calmer tokenized text and subtler image borders.
- Error/loading/empty states now sit on the same dark surface language as the rest of the app.
- Adventure details now use tokenized surfaces, lighter narrative blocks, and a dominant primary action.
- Step rows now separate progression from narrative without the old heavy-outline look.

### Exit criteria update

- [x] Gallery cards avoid heavy-outline visual noise.
- [x] Shared primitives reduce duplicated card/list styling logic.
- [ ] Adventure story + next action read in under 3 seconds.
- [ ] Re-audit on device/simulator to confirm the calmer adventure hierarchy holds with long titles and multi-step campaigns.

---

## 5) Journal + Session Details — critique + audit (initial)

**Target files reviewed**
- `app/(tabs)/journal/index.tsx`
- `app/(tabs)/journal/[id].tsx`

### Critique findings

- **P1 — Data density overload:** journal stats stack many cards in one vertical stream, making priority unclear.
- **P1 — Border style drift:** tab buttons and detail cards still use thick outlined patterns inconsistent with refonte direction.
- **P2 — Session detail readability:** many small labels and tag clusters in one card can slow scanning.

### Audit findings

- **P1 — Legacy token reliance:** multiple pastel-heavy backgrounds and thick borders in stats/detail blocks.
- **P2 — Component consistency gap:** tabs/cards/tags use mixed style recipes instead of one compact system.

### Refonte actions

- `layout`: split stats into clearer grouped sections.
- `typeset`: improve hierarchy in session detail labels and value emphasis.
- `polish`: normalize border/radius/shadow recipes.

### Refonte implementation (applied)

- Journal header and tab switch now use the calmer tokenized surface system.
- Session details now use tokenized dark cards for loading, error, and summary states.
- The summary card and round markers now rely on lighter borders and clearer text hierarchy.

### Exit criteria update

- [ ] Stats/history tabs remain easy to scan at a glance.
- [ ] Session details summary reads clearly without the old pastel-heavy frame.
- [ ] Re-audit on device/simulator to confirm the Journal stack stays readable with real session history.

---

## 6) Village — critique + audit (initial)

**Target files reviewed**
- `app/(tabs)/village.tsx`
- `components/village/VillageScreen.tsx`

### Critique findings

- **P1 — Strong style mismatch:** village mixes old white/black hard-coded control styles with token-based dark surfaces.
- **P1 — Visual noise in modal/detail panels:** thick borders + multiple bright tier backgrounds can distract from progression comprehension.
- **P2 — Card/list rhythm:** building cards are informative but heavy and repetitive.

### Audit findings

- **P1 — Hardcoded color usage:** explicit `white`/`black` and non-token style blocks in key controls.
- **P1 — Border anti-pattern recurrence:** many 2-3px borders across header, modal, and cards.

### Refonte actions

- `colorize`: remove hardcoded white/black controls and align to theme tokens.
- `polish`: reduce border heaviness and standardize village card architecture.
- `clarify`: simplify modal copy hierarchy for upgrade/bonus info.

### Refonte implementation (applied)

- Shared `Card` primitive updated to the tokenized dark surface recipe.
- Village header controls now use subtle dark treatment instead of white/black hardcoded styling.
- Building cards now use lighter hierarchy, smaller lock badges, and tokenized borders.
- Detail modal surfaces now follow the same subdued border language as the main village cards.
- Stats summary now reads as a calm overview rather than a bright promotional banner.

### Screenshot evidence (user-provided)

- **P1 — Border problem is obvious and repeated:** the village screen shows thick white outlines around most cards, matching the user complaint exactly.
- **P1 — Tier rows feel over-framed:** each building row and icon tile is boxed too heavily, which reduces the sense of a living world.
- **P2 — Progress summary card is too loud:** the top progress panel uses a strong colored fill plus a bright border, making it feel heavier than a summary should.
- **P2 — Locked state is stylistically close to content cards:** locked buildings should be calmer and more clearly secondary.

### Exit criteria update

- [x] White-border overload removed from the Village screen.
- [x] Shared card vocabulary is now used by Village details and summary states.
- [ ] Re-audit on device/simulator to confirm the calmer hierarchy holds in motion.

---

## 7) Treasury — critique + audit (initial)

**Target files reviewed**
- `app/treasury.tsx`

### Critique findings

- **P2 — Good baseline:** this screen already aligns better with the new glass/surface design language.
- **P2 — Information rhythm:** resource cards are clear, but count/value hierarchy can be tightened for faster scan.

### Audit findings

- **P2 — Mixed implementation path:** newer `src/ui` primitives coexist with older component styles elsewhere; consistency depends on broader adoption.

### Refonte actions

- `typeset`: strengthen value-first hierarchy in resource tiles.
- `polish`: ensure this screen becomes reference style for other economy/progression cards.

### Refonte implementation (applied)

- Treasury now keeps the same calmer header and value-first hierarchy used elsewhere in the app.
- Resource counts remain the focal point while the tip block and resource labels stay secondary.

### Exit criteria update

- [ ] Resource counts are the dominant visual signal.
- [ ] Treasury remains visually consistent with the shared dark surface language.
- [ ] Re-audit on device/simulator to confirm the inventory grid stays balanced.

---

## 8) Goals + Schedule — critique + audit (initial)

**Target files reviewed**
- `app/goals.tsx`
- `app/schedule.tsx`

### Critique findings

- **P1 — Form complexity:** goals flow has many controls and dense options, risking decision fatigue.
- **P1 — Styling inconsistency:** mixed old border-heavy cards and pastel states diverge from current dark refonte target.
- **P2 — Schedule minimalism mismatch:** schedule is very sparse compared to goal complexity, creating UX discontinuity.

### Audit findings

- **P1 — Border anti-pattern recurrence:** repeated 2-3px outlines on many controls.
- **P2 — Typography pressure:** small labels and compact option chips reduce readability under gym conditions.

### Refonte actions

- `layout`: reduce visible decision load in goals setup.
- `typeset`: improve readability of option labels and progress text.
- `polish`: normalize control styles across goals and schedule.

### Refonte implementation (applied)

- Goals header, option cards, and day/duration selectors now use lighter borders and calmer dark surfaces.
- Schedule now uses the shared surface language for the weekly title and rest suggestion.

### Exit criteria update

- [ ] Goals controls no longer feel like a dense control jungle.
- [ ] Schedule stays visually quiet while still surfacing rest guidance.
- [ ] Re-audit on device/simulator to confirm the form and calendar remain readable.

---

## 9) Onboarding — critique + audit (initial)

**Target files reviewed**
- `app/onboarding/index.tsx`
- `app/onboarding/presentation.tsx`
- `app/onboarding/choose-avatar.tsx`
- `app/onboarding/village-name.tsx`

### Critique findings

- **P1 — Strong visual quality with some drift:** immersive visuals are strong, but onboarding UI style differs notably from in-app product surfaces.
- **P2 — Readability risk on image-heavy backgrounds:** text contrast depends heavily on overlays; requires strict device checks.
- **P2 — CTA consistency:** button semantics vary between steps.

### Audit findings

- **P2 — Hardcoded visual values:** multiple custom shadows/rgba values and direct styles likely bypass token governance.
- **P2 — Motion intensity:** transitions/overlays should be validated for reduced-motion behavior end-to-end.

### Refonte actions

- `colorize`: ensure robust contrast on all background images.
- `polish`: normalize CTA patterns across onboarding steps.
- `harden`: verify reduced-motion and keyboard/input ergonomics.

### Refonte implementation (applied)

- Presentation and avatar selection now lean on the shared text token hierarchy and calmer button surfaces.
- The onboarding flow keeps the immersive background art but tones down the control styling.

### Exit criteria update

- [ ] Intro, avatar, and name steps feel like one coherent onboarding system.
- [ ] CTA treatments stay consistent across the flow.
- [ ] Re-audit on device/simulator to confirm image contrast and input ergonomics.

---

## 10) Settings + Credits — critique + audit (initial)

**Target files reviewed**
- `app/settings.tsx`
- `app/credits.tsx`

### Critique findings

- **P1 — Mixed design systems:** settings uses older card/button styling while credits already uses newer `src/ui` primitives.
- **P2 — Density and affordance:** settings rows are functional but can be clearer in hierarchy and state signaling.

### Audit findings

- **P1 — Inconsistent component vocabulary:** two different style systems on adjacent preference screens.
- **P2 — Border heaviness:** settings still relies on heavier outlined rows.

### Refonte actions

- `polish`: migrate settings rows toward the same primitive language as credits.
- `layout`: improve grouping/scannability for preference categories.
- `audit`: re-check accessibility and consistency after migration.

### Refonte implementation (applied)

- Settings rows now use tokenized dark surfaces and lighter borders.
- Credits copy and cards now follow the calmer text hierarchy used elsewhere.

### Exit criteria update

- [ ] Settings reads like a compact preference panel, not a control dump.
- [ ] Credits stays legible and aligned with the shared surface language.
- [ ] Re-audit on device/simulator to confirm the final screens match the new hierarchy.

---

## Cross-screen prioritized backlog (P0/P1/P2)

### P0

- None identified in this first static pass.

### P1 (fix first)

1. Remove recurring heavy border patterns (especially `borderWidth={3}`) across Quests, Session, Adventures, Village, Goals.
2. Unify card/control primitives across legacy and `src/ui` screens.
3. Re-establish one-primary-action hierarchy on Home and Quest/Adventure details.

### P2 (second wave)

1. Improve small-label readability and metadata density in Journal/Session/Quest cards.
2. Align onboarding/ settings motion and style behaviors with the in-app system.
3. Tighten copy hierarchy and reduce tag/chip overload where possible.
