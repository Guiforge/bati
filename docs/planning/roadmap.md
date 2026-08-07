---
title: Roadmap
type: planning
status: active
updated: 2026-07-31
related:
  [
    README.md,
    ../design/ui-checklist.md,
    ../product/vision.md,
    ../content/missing-image.md,
    ../raw/bodyweight-app-research.md,
  ]
---

# Roadmap

> **Only what is unfinished.** Nothing here records what shipped: git history is the register of
> what was built, and a page of ✅ rows costs attention without paying any back. The rule is easy
> to state and easy to break — this page carried a "Done" block for two days before anyone
> noticed it contradicted this paragraph.
>
> Every number below is reproducible by a command. If one looks stale, run the command rather
> than trusting the line.

## North star

Bati is a **sport app first**, with RPG motivation layered on top. Completed workout history is
the permanent source of truth; progression is derived from it, never managed as a parallel
mini-game. If a reward surface competes with starting or continuing a workout, demote it.

## Guardrails (non-negotiable)

- Dark-only product UI. One dominant primary CTA per screen.
- No thick white/off-white borders as default styling — 1px `$borderStrong`, not 3px `$color`.
- Tokens only in product screens: no hardcoded hex, no `fontWeight` above `700` (no heavier face
  is loaded — anything above it renders wrong, silently).
- i18n for every user-facing string. A raw English literal in a component is a bug, not a TODO.
- The dark-fantasy voice stays. Best practice changes the numbers, never the fiction.
- [../design/ui-checklist.md](../design/ui-checklist.md) is the merge gate for UI work.

---

## 1. Release & distribution

**Everything in this block that is code is done.** What remains needs an account, a card, or a
device, and cannot be written here. It is also the longest pole: the code left in §2 is days of
work, the accounts below are weeks of waiting, and the waiting cannot start until the accounts
exist.

- **Apple Developer account**, certificates, provisioning profiles.
- **Google Play account type — check this first.** A *personal* account (as opposed to an
  organisation account) has owed Google, since late 2023, **12 testers enrolled in closed
  testing for 14 continuous days** before production access can even be requested. Those two
  weeks are incompressible and cannot begin before a signed build sits on the test track. It is
  a five-minute check that decides a fortnight.
- **Play App Signing — export `bati-release.keystore`, do not let Google generate a key.** This
  is a one-time choice at enrolment and it decides whether Play is a third signature island.
  Exported, Play's APKs carry the same certificate as GitHub Releases and the self-hosted
  F-Droid repository, so an install from any of those three can update from any other. Google
  generates its own key by default; taking that default is as permanent as the f-droid.org
  situation, where the catalogue signs with F-Droid's key (reproducible builds were attempted,
  measured to 11 differing files, and declined over an AAPT2 ordering wall — see
  [../fdroid.md](../fdroid.md)).
- **Play wants an AAB, not an APK.** `release.yml` runs `assembleRelease`; a Play upload needs a
  `bundleRelease` step. Not built yet on purpose — write it when the account exists.
- **`featureGraphic.png` (1024×500) is required by Play and does not exist.** The fastlane README
  lists it; `fastlane/metadata/android/*/images/` holds only screenshots. en-US also has fewer
  screenshots than fr-FR.
- **The Data Safety form should be trivial and say so:** the app makes no network requests at
  all, so every answer is "no data collected, no data shared". A form that claims anything else
  contradicts the store listing and the privacy policy.
- ~~**Android signing keystore**~~ — generated 2026-07-31 and wired through
  `plugins/withAndroidReleaseSigning.js`; a signed build was verified with `apksigner`. It stays
  on this page as the one irreversible item: a lost keystore means the published app can never be
  updated again, so its backup is not optional.
- ~~**Enable GitHub Pages**~~ — done 2026-07-31. The bilingual policy is live at
  <https://guiforge.github.io/bati/privacy/>, which unblocks both store reviews and Google's Data
  Safety form. The same deployment serves the F-Droid repository index.
- **`eas init` + `eas update:configure`**, to mint the project id and the `updates` block. Left
  undone deliberately — fabricating a project id would be worse than an empty field.
- **Screenshots, Data Safety form, age rating.** The listing copy itself is written, in both
  locales, in `fastlane/metadata/android/` — Play and F-Droid read the same layout. Screenshots
  depend on §2: they must show the UI that ships, not the one before the device pass.
- **F-Droid repository** — initialised, `fdroid/config.yml` committed, secrets set. The
  publishing half of `.github/workflows/pages.yml` has never run against a real index; see
  [../fdroid.md](../fdroid.md).
- **f-droid.org, the official catalogue** — three of its four blockers are cleared: the artwork is
  regenerated and CC BY-SA 4.0, Expo's 22 prebuilt AARs are switched to build-from-source, and
  Firebase is stripped out of `expo-notifications` by a script that compiles. What remains is a
  decision, not code: F-Droid signs with its own key, so either we do reproducible builds and set
  `AllowedAPKSigningKeys` so existing installs survive, or we accept that f-droid.org is a fresh
  install and say so. The recipe is written but never run through `fdroid build`; see
  [../fdroid.md §Submitting to the official catalogue](../fdroid.md).
- **Bundle-size analysis and performance profiling** — startup, memory, frame rate under
  animation. On a **release** build, never in dev
  ([../architecture/performance.md](../architecture/performance.md), rule 1).

**Decisions that outlive the work**, kept because no commit message says them:

- `src/crashLog.ts` captures JS only. Native crashes need a native handler, and
  `react-native-exception-handler` is unmaintained since 2022 with no Expo config plugin, so it
  cannot be linked under CNG. Reopen only if reports point at crashes JS never sees.
- `runtimeVersion` was set **before** the first signed build, because changing it afterwards
  breaks OTA. It must not move now.
- The Pages workflow publishes **only** `docs/legal/`. Pointing it at the folder root would put
  this roadmap on the open web in order to serve one policy.

## 2. UI refonte — the closing pass

Every screen scope was implemented; none was re-audited on a device. That re-audit is the open
work, and the reason to take it seriously is what the audit tracker recorded on 2026-07-18
before it was deleted: **per-screen checkmarks lied for weeks**, because the shared `AppButton`
primitive underneath still carried the anti-pattern, so every screen importing it had regressed.
Trust a fresh grep over any claim that a screen is done — including the ones below.

- **Device re-audit, 9 screen scopes** — Home · Quests + Quest Details · Session · Adventures ·
  Journal + Session Details · Village · Goals + Schedule · Onboarding · Settings + Credits.
  (A tenth, Treasury, was removed from the product — §7.) Simulator screenshots are not enough: the two bugs that triggered the whole pass (English
  strings in a French UI, a "Treasur/y" wrap) were only ever visible on a real screen.
- **Contrast has never been measured.** The primary button passes (6.45:1). First pair to test:
  `$textSecondary #909ACB` on `$surface #101322`.
- **Touch targets ≥ 44×44** — 146 pressables in the repo (`grep -rEo "onPress=" app components src
  | wc -l`), none verified on a screen.
- **Reduced motion** — the plumbing follows the OS correctly; the actual behaviour has never
  been observed with the system setting on.
- **Legibility in bright ambient light** — `PRODUCT.md` requires it explicitly ("variable gym
  lighting"), and a dark-only app tests badly for it indoors.
- **Cross-screen backlog** (P1 first): unify card/control primitives across the legacy screens
  and `src/ui`; re-establish one-primary-action hierarchy on Home and the Quest/Adventure detail
  screens; then small-label readability in Journal/Session/Quest cards, onboarding/settings
  motion alignment, and chip overload.

**Method.** One scope unit per PR — one screen, or one shared component family — with rationale,
impacted files, before/after screenshots, checklist pass, and `npm run check` + `npm test` green.
Severity order P0 → P1 → P2 → P3; never polish before P0/P1 are gone.

## 3. Debt with a deadline

Not tidiness. Each line below is a gate that does not close, or a risk with a date on it.

- **The knip gate does not gate.** `npm run knip` runs in CI and `ci.yml` claims "Knip is at
  zero; anything it reports is new" — it reports **21 unused exports and 1 unused type**, and
  exits 0. Either clean them and make the failure blocking, or the comment is false and the step
  is decoration. Deciding is the work; postponing it is what made the claim rot.
- **`db/index.ts` is excluded from knip** — a barrel of ~60 re-exports of which a third are used.
  Trim it to what callers import, then drop the exclusion.
- **`getQuickRestCheck()`** (`db/restSuggestions.ts`) has no caller. Its sibling
  `getRestSuggestion()` was wired into Home on 2026-07-31; this one was not.
- **The 7 Maestro flows never run in CI, and they do not assert state.**
  `session-interruptions.yaml` performed two boss-damage bugs and passed, because it only checked
  that the UI came back. They are worth "the app does not crash on this path", nothing more.
- **No migration runner.** The riskiest, least covered code in the repo — and **harmless for
  v1**, because nobody has a database to migrate. It becomes critical at **v1.1**, and it will
  then have to be tested against a real v1 database, not a fresh one.

## 4. Village motion polish

The village is functionally complete and derived from session history. Two of the three
animations it was missing have shipped — `FlameFlicker` (`components/village/VillageScene.tsx:184`)
and `GrowthPulse` (`:232`). What is left is the **resource-gain animation**, and it stays low
priority by design: a village that animates better does not make anyone train more.

## 5. Open questions — decided once, reopened by new evidence

### Gating a skill branch (reopened 2026-07-30)

This was closed as "a skill-tree screen": the variation ladder is data
(`exercises.prerequisiteExerciseId`) and a hint on the exercise screen, and **gating content
behind it would show a beginner 3 quests out of 27**. That argument still holds — for the
catalogue.

[§8.6.2](../raw/bodyweight-app-research.md) of the research dossier introduces a case the
decision never considered: a hard gate on **one advanced skill branch**, not on the catalogue.
The example is concrete — the one-arm handstand branch stays locked until a freestanding
handstand of 45–60 s is logged — and the justification is safety as much as pedagogy. §8.3 is
blunt about why: straight-arm skills load tendons and ligaments far beyond what the muscles
feel, connective tissue adapts more slowly than muscle, and elbow/wrist overuse is *the*
classic failure mode of people who got strong enough for the skill before their joints were
ready. A gate there costs a beginner nothing, because a beginner was never going to see that
branch.

**Blocked on content, not on the decision.** The catalogue has no freestanding handstand, no
planche, no front lever, no tuck lever — the entire "straight-arm strength" family of §8.1 is
absent. Until that exists there is nothing to gate. Decide the principle when the content is
proposed, not before.

## 6. Parking lot (post-MVP)

Speculative. Nothing here has an owner or acceptance criteria, and nothing moves out of this
section until it does.

- **Social & co-op** — friend villages (read-only visits), async cooperative adventures,
  lightweight encouragement loops.
- **Device & context** — smartwatch session controls, heart-rate overlay, location-aware outdoor
  quests, multi-device backup/sync.
- **Progression depth** — cosmetic customisation, seasonal events, extended RPG meta systems.
- **Coaching intelligence** — adaptive planning, recovery/load guidance, personalisation from
  training history.
- **Platform** — performance hardening, accessibility beyond baseline AA, release automation.
- **Advanced skill content** — the straight-arm family (planche, front lever, back lever) and
  freestanding handstand work: exercises, art, hold-time ladders, prehab. Prerequisite for the
  gating question in §5, and the reason it cannot be answered yet.
- **ROM benchmarks** — wall shoulder flexion, squat depth, pancake width tracked like reps and
  hold times ([§11.4](../raw/bodyweight-app-research.md)). Depends on the skill content above.
- **Fat-loss / muscle-gain goal variants** — [§9](../raw/bodyweight-app-research.md) and §10
  need no separate training engine (same volume/frequency/RIR rules), so the delta is framing
  and nutrition guidance. §9.4 is a warning as much as a feature request: **do not build
  calorie counting or numeric weight goals casually** — they are the mechanics most likely to
  harm users with disordered-eating tendencies. Bati currently has no calorie surface at all,
  which is the correct default and should not be given up lightly.

**Promotion criteria** — an idea leaves this list only when the user problem is concrete and
validated, the scope is small enough to ship incrementally, the core workout loop carries no
regression risk, and the acceptance criteria are testable.

## 7. Decided — do not re-open

Each of these was proposed, considered, and closed. They are here so they stop coming back.

- **Economy loops, shops, manual building upgrades, a Treasury surface.** Rewards are XP plus a
  derived village reaction. No resources, no Gold. The Treasury screen is gone from the code —
  `grep -rn treasur app components src` is empty.
- **Per-set RIR capture.** The framing shipped ("stop with 1-2 reps left, not at failure"); the
  form did not. Twelve extra interactions a session, in an app that spent a whole roadmap
  removing friction. One optional field on an exercise's last set is the door if the data is
  ever genuinely wanted.
- **Finer muscle taxonomy.** `muscleToResource` maps muscles 1:1 onto the village's six
  resources, so every muscle added costs a resource, a building, a sprite and a colour. The rules
  that wanted finer muscles actually wanted **movement patterns** — `exercises.pattern`, added in
  `0020`, orthogonal to muscles and touching nothing else.
- **Complex planning/coaching flows in the top navigation**, and social / competitive / live
  multiplayer mechanics. Out of MVP scope entirely.

## Related

- [README.md](README.md) — how to use this folder, now that it holds one page
- [../design/ui-checklist.md](../design/ui-checklist.md) — the UI merge gate
- [../content/missing-image.md](../content/missing-image.md) — art inventory and the generation pipeline
- [../product/vision.md](../product/vision.md) — the product this roadmap serves
