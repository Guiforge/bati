---
title: Bati Docs — LLM Wiki Protocol
type: technical
status: active
updated: 2026-07-18
related: [../README.md, changelog.md, ../CONTRIBUTING.md]
---

# Bati Docs — LLM Wiki Protocol

> This `docs/` folder is maintained as a **Karpathy-style LLM wiki**: an interlinked
> set of markdown pages that an AI agent keeps consistent, cross-referenced, and
> current. **Humans curate what goes in; the agent does the bookkeeping** (summaries,
> links, catalog, health checks). The knowledge **compounds** over time.
>
> Compiler analogy — **the codebase is the source, this wiki is the compiled output,
> `lint` is the tests, and a question is runtime.** Every claim traces back to source.

---

## 🧱 Layers

| Layer | Where | Rule |
| :--- | :--- | :--- |
| **Sources (raw)** | The **codebase** (`app/`, `db/`, `components/`, `src/`, `constants/`, `drizzle/`) + [`raw/`](../raw/README.md) inbox for external material (design refs, research, transcripts) | Immutable inputs. The wiki describes them; it never invents beyond them. |
| **Wiki** | `docs/<topic>/*.md` (one folder per domain) | Agent-maintained pages, grouped by topic folder (below). Humans mostly read. |
| **Schema** | this file (`meta/wiki-protocol.md`) | Conventions + workflows. The most important file. |
| **Catalog** | [`../README.md`](../README.md) | The navigable index. **Updated on every add/remove/rename.** Read it first. |
| **Log** | [`changelog.md`](changelog.md) | Append-only record of every meaningful change. |

---

## 🗂️ Topic folders (one canonical page per subject, inside its folder)

| Folder | Covers |
| :--- | :--- |
| `product/` | Vision, positioning, user guide, feature overview |
| `planning/` | Roadmap alignment (⭐ north star), roadmap archive, UI refactor, future ideas |
| `gameplay/` | Quests, adventures, boss fights, session flow, stats, coach (deferred) |
| `economy/` | Rewards, village, resources (single merged page) |
| `design/` | Design system tokens, UI guide, checklist, exercise colors, mobile reference |
| `architecture/` | Tech stack, project structure, database API |
| `content/` | Content generation specs, workout design philosophy, image prompts |
| `screens/` | One spec per app screen (route-level UI specs) |
| `meta/` | This protocol + the changelog |
| `raw/` | Read-only source inbox (external material, never authored here) |

Every topic folder has its own `README.md` acting as a local table of contents. Adding a
**new topic folder** is allowed: create it with a `README.md`, then add it here and in the
root [`README.md`](../README.md) catalog.

---

## ✍️ Conventions

- **Naming**: all pages use `kebab-case.md` (no spaces, no accents, no abbreviations
  unless the abbreviation is the established term, e.g. `ui-guide.md`, not `user-interface-guide.md`).
- **One canonical file per topic/entity.** Prefer editing/merging over creating duplicates
  (see `economy/rewards-and-progression.md`, merged from three former pages).
- **Frontmatter** (every page): a YAML block at the very top:
  ```yaml
  ---
  title: Human Title
  type: product | planning | system | design | technical | content | screen | category
  status: active | draft | deferred | archived | speculative
  updated: YYYY-MM-DD
  related: [../topic/other-page.md, ...]
  sources: [app/..., db/..., raw/...]   # code/raw files that ground this page
  ---
  ```
  Exception: `design/design-system.md` uses YAML frontmatter for **design tokens** — leave
  it as is. Do not fabricate `updated` dates — set it only when you actually change content.
- **Page structure** (concept/system pages): `Title → Summary → Status/Scope → Details →
  Related`. Keep this order consistent across similar pages.
- **Cross-links**: relative links `[Text](../topic/file.md)` (or `[Text](file.md)` within
  the same folder). Trace app claims to code.
- **External source of truth**: when a page's content is sourced from
  `proj/wiki/projets/bati*.md` (outside this repo), link it explicitly and treat conflicts
  in favor of that source — see `planning/roadmap-alignment.md`.
- **Small pages**: keep under ~400 lines; split or link out beyond that.

---

## 🔄 Workflows

### 1. Ingest — add or update knowledge
Trigger: a durable fact appears (a decision, a pattern, a gotcha, a new feature, a
new source dropped in `raw/`).
1. Find the right page (or create one in the correct topic folder).
2. Write/update it; add or adjust cross-links to related pages.
3. If a page was **added / removed / renamed**, update the topic folder's `README.md`
   and the root [catalog](../README.md).
4. Append an entry to [`changelog.md`](changelog.md): date · what changed · pages touched.

### 2. Query — answer from the wiki
1. Read the [catalog](../README.md) to locate relevant pages.
2. Read those pages; answer with `[Text](../topic/file.md)` citations.
3. If the answer is novel and durable, file it into a page (then do Ingest steps 3–4).

### 3. Lint — health check
Scan `docs/` (schedule it, or run on demand) for:
- Broken links; **orphan** pages (not reachable from the catalog or any page).
- **Duplicated / contradictory** content across pages.
- **Missing frontmatter**; stale `updated`; `status` drift.
- **Missing pages**: concepts referenced but without their own page.
Record findings in `changelog.md` (or `outputs/lint-YYYY-MM-DD.md` for big passes).

---

## 🛡️ Guardrails

- **Never invent.** Ground claims in the codebase or `raw/` sources.
- **Prefer editing** existing pages over creating new ones.
- **The catalog is always accurate** — it is the map the agent reads first.
- **Version control is the safety net**: every ingest is a reviewable git diff.

---

## 📎 See also

- [../README.md](../README.md) — the catalog · [changelog.md](changelog.md) — the change log
- [../CONTRIBUTING.md](../CONTRIBUTING.md) — quick-start conventions
- [../raw/README.md](../raw/README.md) — source inbox · [../architecture/technical-architecture.md](../architecture/technical-architecture.md) — the codebase it describes
