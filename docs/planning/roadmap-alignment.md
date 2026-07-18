---
title: Roadmap Alignment (Source of Truth)
type: planning
status: active
updated: 2026-07-18
related: [README.md, roadmap-refactor-ui.md, future-roadmap.md, ../product/vision.md]
---

# Bati — Roadmap Alignment

> This is the canonical execution roadmap. If another planning doc conflicts with this one, this file wins.

## North star

Bati is a **sport app first** with RPG motivation layered on top. The permanent source of truth is completed workout history; progression systems should be derived from it, not managed as parallel mini-games.

## MVP boundaries (hard constraints)

### In scope now

1. Start quest quickly (low-friction session start)
2. Session completion + XP + streak
3. Adventure progression with boss endpoint
4. Village as derived visual feedback (read-only)
5. Clear stats and progress recap

### Out of scope now (deferred)

- Economy-heavy spend loops and treasury-centric surfaces
- Complex planning/coaching flows in top navigation
- Social, competitive, and live multiplayer mechanics

## Product clarity fixes from user feedback

Current user pain:

- "not clear"
- "not efficient"
- "white border ugly"

Roadmap implications:

1. **Clarity:** simplify hierarchy and remove competing emphasis.
2. **Efficiency:** reduce taps and branch points in workout-critical paths.
3. **Visual quality:** remove thick white/off-white border treatment from default UI.

## Execution phases

## Phase 0 — Baseline and guardrails

- Lock this roadmap as source of truth.
- Use [../design/ui-checklist.md](../design/ui-checklist.md) as mandatory UI gate.
- Standardize acceptance criteria format for all new items.

**Done when:** all active work items reference this roadmap and checklist.

## Phase 1 — Navigation and action clarity

- Prioritize a simple navigation model centered on workout progression.
- Ensure one dominant primary CTA per screen.
- Remove or demote non-MVP destinations from top-level navigation.

**Done when:** users can start/continue workout loops without cognitive detours.

## Phase 2 — Derived progression simplification

- Keep XP/streak/adventure updates coupled to completed sessions.
- Shift village rendering to derived state patterns.
- Keep milestone communication concise and readable.

**Done when:** no critical progression depends on manually managed side systems.

## Phase 3 — Session-loop efficiency pass

- Audit tap-count and decision friction in pre-session, in-session, and post-session flows.
- Keep reward moments short, clear, and skippable.
- Improve loading/empty/error behavior in core loop screens.

**Done when:** path to “start next meaningful action” is short and obvious.

## Phase 4 — Accessibility and polish

- Enforce WCAG AA targets in dark mode.
- Verify touch target sizing and one-handed ergonomics.
- Verify reduced-motion behavior and state legibility.

**Done when:** key screens pass checklist with no P0/P1 UX issues.

## Backlog (post-MVP)

- Expanded economy and cosmetic customization loops
- Coach/planning intelligence beyond lightweight guidance
- Social and asynchronous cooperative features
- Wearables, GPS, and cloud sync expansions

## Delivery protocol (efficiency)

For each roadmap item:

1. One scoped objective (single screen/flow where possible)
2. Acceptance criteria in checklist form
3. Small implementation batch
4. UI checklist pass + checks/tests
5. Merge only when criteria are fully met

## Acceptance criteria template

- [ ] User identifies the next primary action in <3 seconds.
- [ ] Core action path is ≤2 taps from landing context (where feasible).
- [ ] No thick white/off-white border accents on primary cards/buttons.
- [ ] Contrast and touch-target rules pass checklist.
- [ ] i18n and technical checks pass.
