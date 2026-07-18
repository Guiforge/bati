---
title: Source Inbox
type: technical
status: active
updated: 2026-07-14
related: [../meta/wiki-protocol.md]
---

# raw/ — Source Inbox

**Immutable inputs** for the [docs wiki](../meta/wiki-protocol.md). Drop external source material here
(design references, research notes, meeting/voice transcripts, competitor teardowns,
spec PDFs converted to markdown, etc.), then ask the agent to **ingest** it into the wiki.

## Rules

- Files here are **read-only** to the agent — it summarizes and links them, never rewrites them.
- Every wiki claim about external material should trace back to a file in `raw/`.
- The **codebase itself** (`app/`, `db/`, `components/`, `src/`, …) is the primary source for
  app behavior — it does not need to be copied here.

## Ingest

> I added `raw/<file>`. Please ingest it: summarize it, update/create the right pages,
> refresh the catalog, and append to `log.md`.

See the full protocol in [wiki-protocol.md](../meta/wiki-protocol.md).
