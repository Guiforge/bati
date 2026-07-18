---
title: UI Refactor Roadmap
type: planning
status: active
updated: 2026-07-18
related: [roadmap-alignment.md, ../design/design-system.md, ../design/ui-checklist.md]
---

# UI Refactor Roadmap (Execution Playbook)

> This document explains *how* to migrate UI safely and consistently.
> For *what to prioritize now*, always follow [roadmap-alignment.md](roadmap-alignment.md).

## Objective

Deliver a clearer, faster, and visually consistent Bati UI using Tamagui tokens/components, while preserving app stability.

## Non-negotiable guardrails

- Dark-only product UI.
- One primary CTA per screen.
- No thick white/off-white borders as default styling.
- Tokens only in product screens (no hardcoded hex values in screen styling).
- i18n for user-facing copy.

## Migration strategy

## Phase A — Foundation

- Stabilize token usage and shared primitives.
- Ensure reusable UI building blocks exist (screen container, card, button, states).
- Define canonical variants to avoid one-off styles.

**Exit criteria:** new UI work can be implemented without bespoke styling.

## Phase B — High-impact flow migration

Priority order:

1. Start/continue workout entry points
2. In-session experience
3. Post-session reward/progression states
4. Adventure and stats summaries

**Exit criteria:** core workout loop is visually and interaction-wise consistent.

## Phase C — Consistency hardening

- Remove legacy style forks and duplicated component variants.
- Normalize loading/empty/error patterns.
- Ensure hierarchy consistency across screen families.

**Exit criteria:** cross-screen visual vocabulary is coherent.

## Phase D — Accessibility and polish

- Validate contrast and target size requirements.
- Validate reduced-motion behavior.
- Resolve remaining readability issues in bright ambient conditions.

**Exit criteria:** checklist passes on all core screens.

## PR delivery rules (efficiency)

Each UI PR should target one scope unit:

- one screen, or
- one shared component family.

Required in each PR:

- short rationale,
- impacted files,
- before/after screenshots,
- checklist pass confirmation,
- technical checks status (`npm run check`, `npm test`).

## Quality gate

Before merge, pass [../design/ui-checklist.md](../design/ui-checklist.md), including:

- clarity and CTA hierarchy,
- tokenized styling,
- accessibility criteria,
- no white-border anti-pattern.

## Impeccable command runbook (audit + refonte)

Use Impeccable as the default design QA/refonte workflow for each migrated scope.

### One-time project setup

- Initialize context: `$impeccable init`
- Re-capture design system when drift appears: `$impeccable document`

### Per-scope sequence (screen or component family)

1. **Design quality pass:** `$impeccable critique <target>`
2. **Technical quality pass:** `$impeccable audit <target>`
3. **Apply fixes by category:**
	- hierarchy/spacing issues → `$impeccable layout <target>`
	- typography/readability issues → `$impeccable typeset <target>`
	- color/contrast/theme drift → `$impeccable colorize <target>`
	- unclear copy or labels → `$impeccable clarify <target>`
	- resilience/i18n/edge cases → `$impeccable harden <target>`
	- performance concerns → `$impeccable optimize <target>`
	- adaptive/native behavior concerns → `$impeccable adapt <target>`
4. **Final refinement before merge:** `$impeccable polish <target>`
5. **Regression check:** re-run `$impeccable audit <target>`

### Prioritization rule

- Treat audit findings by severity order: **P0 → P1 → P2 → P3**.
- Do not polish before P0/P1 issues are addressed.

### CI/automation companion

- Add deterministic detector checks in CI with `npx impeccable detect` on relevant UI paths.
- Use narrow ignore rules only when intentional and documented.
