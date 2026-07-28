---
title: Bati — Documentation
type: category
status: active
updated: 2026-07-28
related: [meta/wiki-protocol.md, CONTRIBUTING.md]
---

# Bati — Documentation

> Train like a hero, build like a king.

Single, up-to-date entry point for all Bati (fitness RPG) documentation.

> 🧠 **This folder is maintained as an [LLM wiki](meta/wiki-protocol.md)** (Karpathy pattern): an agent
> keeps pages cross-linked, consistent, and current. This README is the **catalog** —
> read it first. Protocol → [wiki-protocol.md](meta/wiki-protocol.md) · change log → [changelog.md](meta/changelog.md) ·
> conventions → [CONTRIBUTING.md](CONTRIBUTING.md) · source inbox → [raw/](raw/README.md).

---

## 🚀 Start Here

| Doc | What it covers |
| --- | --- |
| [vision.md](product/vision.md) | Product philosophy, core loop |
| [positioning.md](product/positioning.md) | Register, platform, positioning, principles |
| [roadmap-alignment.md](planning/roadmap-alignment.md) | ⭐ Scope authority (north star, MVP boundaries) |
| [work-roadmap.md](planning/work-roadmap.md) | ⭐ What is being built right now |
| [../.github/CONTRIBUTING.md](../.github/CONTRIBUTING.md) | How to contribute to the codebase |
| [CONTRIBUTING.md](CONTRIBUTING.md) | How to contribute to **this docs wiki** |

---

## 🧭 Product & Vision — [product/](product/README.md)

| Doc | What it covers |
| --- | --- |
| [vision.md](product/vision.md) | Vision, core loop |
| [positioning.md](product/positioning.md) | Product doc (register / platform / principles) |
| [user-guide.md](product/user-guide.md) | Non-technical product guide + navigation map |
| [feature-overview.md](product/feature-overview.md) | Features overview |

## 🗺️ Planning & Roadmap — [planning/](planning/README.md)

| Doc | What it covers |
| --- | --- |
| [roadmap-alignment.md](planning/roadmap-alignment.md) | ⭐ Scope authority — MVP boundaries, north star |
| [work-roadmap.md](planning/work-roadmap.md) | ⭐ Live execution doc — quests & adventures overhaul |
| [ui-screen-audit-tracker.md](planning/ui-screen-audit-tracker.md) | Screen-by-screen critique/audit tracker + refonte actions |
| [roadmap-refactor-ui.md](planning/roadmap-refactor-ui.md) | UI refactor method (guardrails, PR rules, quality gate) |
| [future-roadmap.md](planning/future-roadmap.md) | Later phases (speculative, pre-alignment) |
| *archived* | *history, not planning input* |
| [screen-redesign-proposals.md](planning/screen-redesign-proposals.md) | The 5 nav/onboarding/village decisions — recorded and shipped |
| [dev-execution-plan.md](planning/dev-execution-plan.md) | The plan that executed them — all 6 phases shipped 2026-07-20 |
| [system-redesign-options.md](planning/system-redesign-options.md) | Progression-simplification options — chosen path shipped |
| [roadmap-archive.md](planning/roadmap-archive.md) | Older historical record |

## 🎮 Gameplay Systems — [gameplay/](gameplay/README.md)

| Doc | What it covers |
| --- | --- |
| [quests.md](gameplay/quests.md) | Workout templates |
| [adventures.md](gameplay/adventures.md) | Multi-quest campaigns |
| [boss-fights.md](gameplay/boss-fights.md) | Boss fight mechanics |
| [session-flow.md](gameplay/session-flow.md) | Active workout flow + implementation spec |
| [progression.md](gameplay/progression.md) | XP, derived village, flame — the loot loop |
| [statistics-progress.md](gameplay/statistics-progress.md) | Statistics & progress (4 derived views) |
| [coach-planning.md](gameplay/coach-planning.md) | Coach: weekly goal, weak-area & rest nudges |

## 🎨 Design & UI — [design/](design/README.md)

| Doc | What it covers |
| --- | --- |
| [design-system.md](design/design-system.md) | ⭐ Single source of truth: tokens, rules, decision order |
| [ui-checklist.md](design/ui-checklist.md) | UI/UX merge-gate checklist |
| [exercise-colors.md](design/exercise-colors.md) | Muscle → color mapping |

## 🛠️ Technical — [architecture/](architecture/README.md)

| Doc | What it covers |
| --- | --- |
| [technical-architecture.md](architecture/technical-architecture.md) | Tech stack, project structure |
| [database-api.md](architecture/database-api.md) | Database API reference (Drizzle) |
| [performance.md](architecture/performance.md) | RN performance best practices & antipatterns |
| [wiki-protocol.md](meta/wiki-protocol.md) | How this docs folder is maintained as an LLM wiki |

## 🖼️ Content & Assets — [content/](content/README.md)

| Doc | What it covers |
| --- | --- |
| [content-generation.md](content/content-generation.md) | Full content spec (exercises, quests, adventures) |
| [content-quick-reference.md](content/content-quick-reference.md) | Developer integration guide (asset map) |
| [workout-best-practices.md](content/workout-best-practices.md) | Workout design & balancing |
| [image-prompts.md](content/image-prompts.md) | Image generation prompts (Midjourney) |
| [image-style-prompt.md](content/image-style-prompt.md) | Base style prompt (used by scripts) |

## 📱 Screen Specs — [screens/](screens/README.md)

See [`screens/`](screens/README.md) — one spec per screen (home, quests, session, village, treasury, …).

---

## 📝 Terminology

| Term | Definition |
| --- | --- |
| **Quest** | Single workout template |
| **Adventure** | Multi-quest campaign |
| **Session** | Active workout |
| **Boss** | Epic challenge with HP |
| **Village** | Your fitness fingerprint (derived, read-only — see [progression.md](gameplay/progression.md)) |
| **Flame** | Consistency streak — days the weekly quota held, rest days included |
| **XP** | Experience points |
