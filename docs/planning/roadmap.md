---
title: Roadmap
type: planning
status: active
updated: 2026-07-29
related:
  [
    README.md,
    ui-screen-audit-tracker.md,
    ../design/ui-checklist.md,
    ../product/vision.md,
    ../content/missing-image.md,
  ]
---

# Roadmap

> **Only what is unfinished.** This page merges the five roadmap docs that used to live here —
> `roadmap-alignment.md`, `work-roadmap.md`, `roadmap-refactor-ui.md`, `roadmap-archive.md` and
> `future-roadmap.md` — and keeps their open items, their guardrails, and the decisions that
> close a question for good. Everything they recorded as shipped was deleted rather than
> maintained: the commit history is the record of what was built, and a checklist of ✅ rows
> costs attention without paying any back.
>
> The quests & adventures overhaul that filled `work-roadmap.md` is done: phases A→H all shipped
> (migrations `0012`–`0023`), and the content invariants in
> [`__tests__/content-invariants.test.ts`](../../__tests__/content-invariants.test.ts) are what
> enforce its rules now — a test, not a document.

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

## 1. Release & distribution — not started

The one large block nothing has touched. Nothing here is blocked; it has simply never been the
next thing.

**Build optimisation**

- Bundle-size analysis: tree-shaking audit, unused-dependency sweep, code splitting.
- Asset optimisation: the exercise folder is mid-conversion (PNG ~850 KB → JPG ~75 KB a frame —
  see [../content/missing-image.md](../content/missing-image.md) §6); finish it, then splash and
  font subsetting.
- Performance profiling: startup time, memory, frame rate under animation.

**Android**

- EAS Build: `eas.json`, development / preview / production profiles.
- Signing keystore, R8 config, adaptive icons, Android 12+ splash.

**iOS**

- Apple Developer account, provisioning profiles, certificates.
- App icons at every size, launch screen, permission usage descriptions.

## 2. UI refonte — the closing pass

Every screen scope in [ui-screen-audit-tracker.md](ui-screen-audit-tracker.md) reads
"implementation done, re-audit on device pending". That re-audit is the open work, and the
tracker's own 2026-07-18 correction is the reason to take it seriously: **per-screen checkmarks
lied for weeks** because the shared `AppButton` primitive underneath still carried the
anti-pattern, so every screen importing it had regressed. Trust a fresh grep over any checkmark
in that file.

- **Device re-audit, all 10 scopes.** Simulator screenshots are not enough — the two bugs that
  triggered the whole pass (English strings in a French UI, a "Treasur/y" wrap) were only ever
  visible on a real screen.
- **Accessibility validation.** Contrast was fixed at the primitive layer and passes on the
  primary button (6.45:1). Still unverified end to end: touch-target sizing, one-handed
  ergonomics, reduced-motion behaviour, legibility in bright ambient light.
- **Cross-screen backlog** (from the tracker, P1 first): unify card/control primitives across the
  legacy screens and `src/ui`; re-establish one-primary-action hierarchy on Home and the
  Quest/Adventure detail screens; then small-label readability in Journal/Session/Quest cards,
  onboarding/settings motion alignment, and chip overload.

**Method.** One scope unit per PR — one screen, or one shared component family — with rationale,
impacted files, before/after screenshots, checklist pass, and `npm run check` + `npm test` green.
Impeccable is the default QA loop: `critique` → `audit` → fix by category (`layout`, `typeset`,
`colorize`, `clarify`, `harden`, `optimize`, `adapt`) → `polish` → re-`audit`. Severity order
P0 → P1 → P2 → P3; never polish before P0/P1 are gone.

## 3. Village motion polish

The village is functionally complete and derived from session history; what is missing is
feedback, not features: flame animation, building-unlock animation, resource-gain animation.
Low priority by design — a village that animates better does not make anyone train more.

## 4. Parking lot (post-MVP)

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

**Promotion criteria** — an idea leaves this list only when the user problem is concrete and
validated, the scope is small enough to ship incrementally, the core workout loop carries no
regression risk, and the acceptance criteria are testable.

## 5. Decided — do not re-open

Each of these was proposed, considered, and closed. They are here so they stop coming back.

- **Economy loops, shops, manual building upgrades, a Treasury surface.** Rewards are XP plus a
  derived village reaction. No resources, no Gold.
- **A skill-tree screen.** The variation ladder is data (`exercises.prerequisiteExerciseId`) and
  a hint on the exercise screen. Turning it into a browsable tree is a product decision, not a
  gap — and gating content behind it would show a beginner 3 quests out of 27.
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

- [README.md](README.md) — what else lives in this folder, and which pages are history
- [ui-screen-audit-tracker.md](ui-screen-audit-tracker.md) — per-screen audit log and UI backlog
- [../design/ui-checklist.md](../design/ui-checklist.md) — the UI merge gate
- [../content/missing-image.md](../content/missing-image.md) — art inventory and the generation pipeline
- [../product/vision.md](../product/vision.md) — the product this roadmap serves
