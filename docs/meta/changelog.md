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

## 2026-07-18 — Impeccable command runbook added to UI refactor roadmap

- Updated [planning/roadmap-refactor-ui.md](../planning/roadmap-refactor-ui.md) with an explicit
  Impeccable workflow for UI refonte: `init/document` (context), `critique + audit` (diagnostics),
  command routing by issue type (`layout`, `typeset`, `colorize`, `clarify`, `harden`, `optimize`,
  `adapt`), then `polish` and re-audit.
- Added severity-first handling guidance (P0 → P3) and CI detector recommendation
  (`npx impeccable detect`) to keep visual quality gates consistent.

