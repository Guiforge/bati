---
title: UI Screen Audit Tracker
type: planning
status: active
updated: 2026-07-18
related: [roadmap.md, roadmap.md, ../design/ui-checklist.md]
---

# UI Screen Audit Tracker

> Step-by-step critique/audit tracker for the UI refonte. One screen cluster at a time.

> ⚠️ **2026-07-18 correction.** Every "implementation done" row below predates a fresh code
> audit that found the white-border and `fontWeight="900"` anti-patterns still live in the
> shared `AppButton`/`AppIconButton` component (borderWidth 3, `borderColor="$color"`) and in
> 64 screen/component files app-wide — including screens marked done here. The per-screen
> checkmarks reflected screen-local edits; the shared primitives underneath were never fixed,
> so every screen importing them regressed back to the anti-pattern. This has now been fixed
> at the primitive layer (see the 2026-07-18 app-wide pass below), which is why this correction
> exists: **trust a fresh grep over this table's historical checkmarks.**

## 2026-07-18 — App-wide foundation pass (real, verified)

Triggered by user report: Adventures/Quests "not intuitive", animations feel slow, plus a
broader request to rebuild the app's UI/UX (immersive, fast, simple, playful, sport-first).

**Root-cause fixes at the shared-component layer** (cascades to every screen that imports these):

- `components/common/AppButton.tsx` (`AppButton`, `AppIconButton`): border 3px `$color` (white)
  → 1px `$borderStrong`; primary-button text `$bgDark` (2.53:1 contrast, fails WCAG AA) → `$text`
  (6.45:1, passes); `fontWeight="900"` (no matching font face loaded — silently mis-rendered) →
  `"700"` (the loaded bold face).
- `src/ui/Typography.tsx`, `src/ui/RPGButton.tsx`: same font-weight fix (900/800 → 700).
- App-wide mechanical sweep: 41 files had `borderWidth={3}`/`{2}` and/or `borderColor="$color"`
  fixed to the tokenized 1px/`$borderStrong` recipe; 64 files had `fontWeight="900"`/`"800"`
  fixed to `"700"`.
- `tamagui.config.ts`: the `quick` interaction spring (stiffness 250/damping 20/mass 1.2, ~480ms
  settle with overshoot) retuned to stiffness 400/damping 30/mass 1 (~180ms, no overshoot) —
  this is the actual fix for "animations not fast," more than any single screen's motion. Unused
  `lazy`/`pulse` springs removed (one real call site in `HomeSettingsMenu.tsx` repointed to `quick`).
- Deleted dead code: `components/QuestCarousel/` (daily quest + weekly challenge widgets,
  confirmed unimported anywhere since the Home redesign) and its wrapper `components/QuestCarousel.tsx`.

**Adventures/Quests flow fixes** (see critique snapshot `.impeccable/critique/2026-07-18*.md`):

- `app/(tabs)/adventures/[id].tsx`: silent `catch {}` on adventure start (P0 — button did nothing
  on failure) now surfaces via `useToast().showError`; added `isStarting` pending state that
  disables the button and shows "Starting…"; moved the Start/Continue CTA out of the scroll
  content into a fixed bottom bar (was below the fold on 3+ step adventures, now consistent with
  the Quest details screen).
- `components/adventures/NarrativeModal.tsx`: the modal had no dismiss — closing it (or Android
  back) force-started the session. Added a real `onDismiss` path (a "Not now" link + wired
  `onRequestClose`) distinct from the confirm action.
- `app/(tabs)/quests/[id].tsx`: fixed the same `$bgDark`-on-`$primary` contrast failure on the
  "Start Quest" button and the level chips; removed a dead ternary
  (`state.quest : state.quest`); exercise thumbnail strips now render only when at least one
  image actually resolves, instead of a row of identical 🎯 fallback tiles.
- `app/(tabs)/quests/index.tsx`, `app/(tabs)/adventures/index.tsx`: list cards cut from ~11
  same-weight chips + a strip of placeholder emoji tiles down to title + 1-line description +
  exactly 3 facts (duration, count, XP); removed the lying back-chevron on these tab-root
  screens (a `router.back()` on a tab root that either no-ops or exits unexpectedly); fixed the
  `quests.count` translation string that was literally just `"{{count}}"` (a bare, unlabeled
  number) to `"{{count}} quests"` / `"{{count}} quêtes"`.
- `components/QuestFiltersSheet.tsx`: the filter sheet teleported open/closed (`setValue`, code
  comment said "Snap instantly (no animation)") — now animates with a real spring; "Show/Hide"
  and "Clear all" were `$primary`-as-text at 2.44:1 contrast (fails 4.5:1) — now `$text`; added
  accessibility labels and `hitSlop` on the toggle and clear-filters controls.

**Still open / follow-up** (not attempted this pass, flagged for a dedicated follow-up):

- ✅ **Load waterfall (done 2026-07-22):** added a tiny write-through query cache
  (`db/queryCache.ts`); `getQuestById` / `getCompletedSessionById` populate it and the
  quest-detail + session-detail screens seed initial state from a synchronous peek, so a
  revisited detail paints instantly and still refetches to revalidate. Adventure detail left
  as-is (its state blends live run/history data — seeding static details wouldn't drop the
  loading card and caching the run risks showing stale progress).
- ✅ **Accessibility label sweep (done 2026-07-22):** labeled the icon-only calendar
  month-nav chevrons, the rest-view result +/- buttons, and the avatar-picker tiles; added
  `accessibilityState={{ selected }}` to the journal stats/history tabs, the trends
  weekly/monthly chips, and the avatar tiles; gave the "how to" disclosure a button role +
  expanded state. Village back-chevron was already labeled.
- The "adventure = programme, quest = workout" merge question from the critique (one Play
  surface vs. two tabs) — not attempted; a bigger IA change that deserves its own `shape` pass.
- ✅ **`swiper` removed (done 2026-07-22):** dropped from `package.json`, deleted the dead
  `<Head>` swiper-CSS `<link>` in `app/_layout.tsx`, and updated the lockfile.

## 2026-07-18 — Round 2: contrast bug was systemic, not screen-local

Same root-cause pattern as the border/font sweep: the `color="$bgDark"` (near-black) text
override on a `$primary`/`$secondary` background — 2.53:1 contrast, fails WCAG AA even at the
relaxed 3:1 large-text threshold — was not unique to Quests. Found and fixed the identical bug
on:

- `components/session/ActiveExerciseView.tsx`: the "Complete Exercise" button — the single most
  pressed button in the app, hit after every rep set, in the exact "readable in bright gym
  lighting" scenario the design docs call out by name.
- `components/session/RestView.tsx` ("Skip Rest"), `components/session/VictoryView.tsx`
  ("Finish"), `components/village/VillageScreen.tsx` (level badge + "Close" button, 2 instances).
- Left `app/onboarding/choose-avatar.tsx` alone — same color pair, but on `$secondary` (magenta)
  at 18px bold, which actually clears the 3:1 large-text floor (4.17:1). Not every instance of
  this pattern is a bug; checked each one's background and text size before touching it.

**Load waterfall**: `db/exercises.ts`'s `listExercises()` (static seed content, no in-app editing)
was independently re-queried by `quests/index.tsx`, `adventures/index.tsx`, and
`adventures/[id].tsx` on every mount. Added a module-level cache (a single shared promise,
cleared on rejection so a failed fetch doesn't poison it) — zero call-site changes needed. This
does not touch `getQuestById`/`getAdventureDetails`, which correctly stay live-fetched since they
carry difficulty-dependent XP and run-state (locked/active/completed) that must never be stale.

**Chart color palette was light-mode**: `components/journal/JournalStats.tsx` and
`MuscleBalanceRadar.tsx` hardcoded a generic Tailwind light-theme palette (`#E5E7EB` grid,
`#374151` labels) for `react-native-gifted-charts`, which can't accept Tamagui tokens (chart-prop
inline hex is correctly exempt from the token rule per `ui-guide.md`, but the *values* were
wrong for this app). Measured contrast: radar chart labels were **1.79:1** against `$surface` —
functionally invisible. Replaced with the app's actual token hex values
(`$primary`/`$primaryHover`/`$borderStrong`/`$textSecondary`) instead of a generic indigo/gray
palette that didn't match the brand and, in one case, failed contrast outright.

## 2026-07-18 — Round 3: remaining screens (Village, Treasury, Goals, Schedule, Settings, Credits, Onboarding)

Verified against real code, not the stale checkmarks above.

- **`components/village/VillageScreen.tsx`**: already tokenized and consistent (does not match
  the olive-green thick-white-border screenshot the user provided — that screenshot is almost
  certainly a stale cached build, not current source; worth a fresh Metro/Expo reload to confirm).
  Fixed: the header back button was a raw inline-styled `Pressable` bypassing tokens entirely
  (`rgba(255,255,255,0.04)`/`rgba(232,236,255,0.14)` literals) — replaced with `AppIconButton`
  for consistency and an accessibility label; added a label to the building-detail modal's close
  button.
- **`app/treasury.tsx`**: already in good shape (already on the `src/ui` system per earlier
  tracker note — confirmed true this time). Added an accessibility label to the header back button.
- **`app/goals.tsx`**: found and fixed the same `$background`-on-`$primary` contrast bug (days
  selector, duration selector, Save button — all failed 3:1) and **four silent `catch` blocks**
  with zero user feedback (load, save, confirm, regenerate, status-update) — the same P0-class
  pattern as the original Adventures bug, now wired to `useToast().showError`.
- **`app/schedule.tsx`**: the "Back" button was a full-width secondary `AppButton` with a
  mismatched `Calendar` icon (visually reads as a calendar action, not navigation) — replaced with
  the standard small `AppIconButton` + `ChevronLeft` pattern used everywhere else.
- **`app/settings.tsx`**, **`app/credits.tsx`**: already consistent internally. Added missing
  accessibility labels to icon-only back buttons. In credits, `CreditLink` bypassed the screen's
  own guarded `Linking.canOpenURL` check and called `Linking.openURL` directly — an unhandled
  rejection if no URL handler exists (simulators, restricted environments) — now routed through
  the same guarded `openUrl` helper as every other link on the screen.
- **Onboarding** (`presentation.tsx`, `village-name.tsx`): already clean and correctly using
  `$text` (not the `$bgDark`/`$background` contrast bug) on primary buttons — no changes needed.

## 2026-07-18 — Round 4: the tab bar itself, and a resolved IA decision

**The bottom tab bar — visible on every single screen — had both bugs at once**, missed by the
Round 1 sweep because it's a plain React Navigation style object (`screenOptions`), not a Tamagui
JSX prop, so the earlier regex-based fix couldn't see it: `app/(tabs)/_layout.tsx` had
`tabBarStyle: { borderTopWidth: 2, borderTopColor: theme.color?.val }` — a 2px near-white line
across the top of the tab bar, permanently visible, on every screen, in every state. This is very
likely a real contributor to the persistent white-border look in the user's screenshots (separate
from the stale-build question raised in Round 3). Fixed to 1px `$borderStrong`, plus the
accompanying `fontWeight: "800"` tab-label bug.

**The font-weight bug had a second failure mode**: Round 1's sweep matched the literal string
form `fontWeight="900"` but missed (a) JSX-expression/ternary forms like
`fontWeight={isActive ? "900" : "800"}`, and (b) values outside 900/800 — `"500"` and `"600"` are
*equally* unsupported (only 400 and 700 have a loaded font face), so they were silently
mis-rendering the whole time too. Found and fixed in 10 more files, including
**`components/common/Chip.tsx`** — the shared pill component rendered on nearly every screen in
the app (quest/adventure metadata, filters) — which had had a broken weight since first sweep.

**Resolved: the Adventures/Quests tab-merge question from the original critique.** With the
clarification that quest = workout and adventure = programme (a multi-workout campaign), merging
into one tab is the wrong call — these aren't sibling browsing lists, they're parent/child
(a programme *contains* workouts), the same relationship as "Programs" vs. "Workouts" in
comparable fitness apps. Collapsing them would lose that distinction, not clarify it. Decision:
**keep the two tabs**, and fix the actual ambiguity with a one-line subtitle instead of a
navigation rewrite — `app/(tabs)/adventures/index.tsx` had no subtitle at all (unlike Quests,
which already had one), so a first-time user had no textual cue that Adventures is the
multi-workout/story tier above Quests. Added `adventures.gallery_subtitle` ("Multi-workout
programs with a story and a boss fight") in both locales.

**Remaining accessibility gaps closed**: `app/(tabs)/journal/index.tsx` had the same lying
tab-root back-chevron bug fixed on Quests/Adventures in Round 1 but missed here — removed.
Labeled the last unlabeled icon buttons: journal detail's back button, and all three in
`HomeSettingsMenu` (menu trigger, in-menu back, close) — the last one also had a stray
`borderBottomWidth={3}` the directional-prop variant of the border sweep hadn't covered.

## 2026-07-18 — Round 5: the three named remaining gaps

- **Load waterfall, extended**: `listQuestTemplates()` and `listAdventures()` (`db/quests.ts`,
  `db/adventures.ts`) get the same cache `listExercises()` got in Round 2. Verified safe first:
  `createQuestTemplate`/`deleteQuest`/`updateQuestMeta`/`setQuestExercises` exist in the schema
  layer but have zero runtime callers anywhere in `app/`/`components/`/`stores/` — no live
  authoring flow would be invalidated by caching. `getQuestById`/`getAdventureDetails` correctly
  stay live-fetched (they carry difficulty-dependent XP and run state that must never be stale).
- **Victory screen density**: the tracker's own P2 finding was real — 6 stacked modules (header,
  time/XP, records, loot, chart, feedback, share) with Finish as the very last scroll item. Moved
  Finish to a fixed bottom bar (the same pattern already used on Quest/Adventure details), so the
  primary action is reachable without scrolling past every reward module. Share stays in-flow as
  the secondary action.
- **Quest/Adventure distinction, made bidirectional**: Adventures got a subtitle in Round 4
  ("Multi-workout programs with a story and a boss fight"); Quests had a subtitle key defined in
  both locale files but never rendered anywhere in `quests/index.tsx`. Added it, reworded both for
  symmetry: Quests = "Single workouts — pick one and go", Adventures = "Multi-workout programs
  with a story and a boss fight." Deliberately did not add an onboarding-flow step for this — the
  design docs explicitly reject the tutorial-carousel pattern ("users swipe through without
  reading"); a persistent one-line cue on both galleries is the lower-risk, still-effective fix.

## 2026-07-18 — Round 6: Home screen — the exact bug in the user's own screenshot

Went back to the two screenshots that started this session (Home and Village) and did a deep
pass on Home specifically, since it had not been touched yet and the screenshot showed concrete,
unexplained evidence: English text ("CURRENT OBJECTIVE", "Quick Workout", "START QUEST", "Lvl 1 •
Apprenti") mixed into an otherwise-French UI, plus "Treasur / y" wrapping onto two lines.

**Root cause, confirmed, not guessed**: this was never a stale-build illusion for these specific
strings — `components/home/useSmartAction.ts` (the hook driving Home's single hero CTA widget)
hardcoded raw English strings directly in the decision logic (`label: "START QUEST"`,
`subtext: "Quick Workout"`, etc.) with a code comment admitting it: `// Should localize`. This
bypassed i18n entirely regardless of the user's language setting. Separately,
`components/home/HomeHeader.tsx` had **no `useTranslation` import at all** — `"Hero"` and the
`` `Level ${level} • ${title}` `` line were raw English template literals, which is exactly the
"Lvl 1 • Apprenti" English/French mix seen in the screenshot. And `CurrentAdventureWidget.tsx`
called `t("home.current_objective", ...)` and four sibling keys that **did not exist in either
locale file** — always silently falling back to the English fallback string baked into the code.

Fixed: rewrote `useSmartAction.ts` to use `t()` throughout (including a broken dead route,
`/(tabs)/exercises`, which doesn't exist as a screen — the fallback "quick workout" action would
have silently gone nowhere; repointed to `/quests`, the actual gallery). Added all 13 missing
`home.*` translation keys to both `en.json` and `fr.json`. De-shouted three all-caps labels
("STATISTICS"/"STREAK"/"QUESTS" → sentence case) that were flagged as a P2 in the *original* Home
critique and marked as fixed there — they were not; this is the same doc-vs-reality gap found
repeatedly this session. Added the missing `tabs.village` key (the bottom tab and the Village
action card title were silently falling back to hardcoded English the whole time). Fixed the
"Treasur/y" wrap bug in the shared `ActionCard` (no `numberOfLines` constraint on the title Text —
added `numberOfLines={1}`). Reworded the Village action card's subtitle from "Visit Village"
(redundant with its own title) to "See your progress."

This is the most direct evidence in the whole session that the two original screenshots were
**not** primarily a stale-build artifact — at least these specific strings are real, current,
now-fixed bugs in source.

## Progress board

| Order | Scope | Status | Notes |
| :--- | :--- | :--- | :--- |
| 1 | Home | implementation done | Re-audit on device/simulator pending |
| 2 | Quests + Quest Details | implementation done | Re-audit on device/simulator pending |
| 3 | Session | implementation done | Re-audit on device/simulator pending |
| 4 | Adventures | implementation done | Re-audit on device/simulator pending |
| 5 | Journal + Session Details | implementation done | Re-audit on device/simulator pending |
| 6 | Village | implementation done | Re-audit on device/simulator pending |
| 7 | Treasury | implementation done | Re-audit on device/simulator pending |
| 8 | Goals + Schedule | implementation done | Re-audit on device/simulator pending |
| 9 | Onboarding | implementation done | Re-audit on device/simulator pending |
| 10 | Settings + Credits | implementation done | Re-audit on device/simulator pending |

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
