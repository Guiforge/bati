---
title: Contributing to the Docs Wiki
type: technical
status: active
updated: 2026-07-18
related: [README.md, meta/wiki-protocol.md]
---

# Contributing to the Docs Wiki

> Quick-start conventions for adding or editing pages under `docs/`. Full protocol,
> workflows, and guardrails: [meta/wiki-protocol.md](meta/wiki-protocol.md).

## Where does my page go?

Pick the topic folder that matches the subject, not the file's origin or date:

| Folder | For |
| --- | --- |
| `product/` | Vision, positioning, feature overview, user-facing guide |
| `planning/` | Roadmap, prioritization, scope decisions |
| `gameplay/` | Mechanics: quests, adventures, boss fights, session flow, progression, stats, coach |
| `design/` | Design tokens, UX principles, visual guidelines |
| `architecture/` | Tech stack, database, technical reference |
| `content/` | Content generation specs, asset/image prompts |
| `screens/` | One page per app screen/route |
| `meta/` | This wiki's own conventions and changelog |
| `raw/` | Read-only inbox for external source material — never author content directly here |

If none fit, propose a new topic folder (with its own `README.md`) rather than dropping a
page at the `docs/` root.

## Naming

- **kebab-case, always**: `session-flow.md`, not `SESSION_FLOW.md`, `Session Flow.md`, or
  `session_flow.md`.
- No accents, no spaces. Abbreviations only if they're the established term (`ui-guide.md`
  is fine; don't invent new ones).
- One file per topic/entity. If you're about to create a second page for something already
  documented, **edit the existing page instead**.

## Every page needs frontmatter

```yaml
---
title: Human Readable Title
type: product | planning | system | design | technical | content | screen | category
status: active | draft | deferred | archived | speculative
updated: YYYY-MM-DD   # only bump when you actually change content
related: [../topic/other-page.md, ...]
sources: [app/..., db/..., raw/...]   # optional: code/raw files this page is grounded in
---
```

## Page structure (concept/system pages)

Use the same section order across similar pages:

1. **Title** (H1, exactly one per file)
2. **Summary** — one paragraph, what this page is about
3. **Status & scope** — if the page has MVP/deferred/legacy distinctions, say so up front
4. **Details** — the actual content, H2/H3 nested logically
5. **Related** — links to the pages this one should be read alongside

## Linking

- Use relative links: `[text](../topic/file.md)` across folders, `[text](file.md)` within
  the same folder.
- Every folder has a `README.md` acting as its table of contents — update it when you
  add, remove, or rename a page in that folder, and update the root
  [README.md](README.md) catalog too.
- If a page's authority comes from outside this repo (e.g. the product wiki at
  `proj/wiki/projets/bati*.md`), link it explicitly and say so — don't restate it silently
  as if it originated here.

## When you find a contradiction

Don't silently resolve it. Either:
- pick the version backed by the strongest source of truth (external product wiki >
  `planning/roadmap.md` > everything else) and add a `⚠️ Status & scope` note
  explaining the correction and what changed, or
- if you're not sure which version is correct, flag it in the page and in
  [meta/changelog.md](meta/changelog.md) instead of guessing.

## After any change

Append an entry to [meta/changelog.md](meta/changelog.md): date, what changed, which pages
were touched. This is what keeps the wiki auditable over time.
