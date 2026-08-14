---
title: Planning & Roadmap
type: category
status: active
updated: 2026-08-14
related: [../README.md]
---

# Planning & Roadmap

> One page, and it only lists what is unfinished. Everything else this folder used to hold —
> the archived proposal docs, the phased execution plan, the UI audit tracker, the bug tracker
> whose every line read `fixed` — was deleted once it recorded only shipped work. Git history is
> the register of what was built; a page of ✅ rows costs attention without paying any back.

## The roadmap

[roadmap.md](roadmap.md) — north star, guardrails, the critical path (§1 release & distribution,
§2 the UI closing pass, §3 the debt that has a deadline), the ranked product backlog (§4, with
impact/effort/priority per item), the open questions, the post-MVP parking lot, and the decisions
that are closed for good. Every number on it is reproducible by a command — run the command
before trusting a line that looks stale.

§1–§3 outrank §4 by construction: nothing in the backlog matters if the app cannot reach a user
or loses their history.

## How to use this folder

1. Check scope and guardrails against [roadmap.md](roadmap.md).
2. Pick up open work from the same page — if it isn't there, it isn't planned.
3. Use [../design/ui-checklist.md](../design/ui-checklist.md) when the work is UI; it is the
   merge gate.
4. A parking-lot idea becomes work only when it has a concrete user problem, an owner and
   testable acceptance criteria.
5. Wondering *why* something is the way it is? `git log -- docs/planning/` has the deleted
   pages, and the commit that removed each one says what replaced it.

## Related

- [../product/README.md](../product/README.md) — vision and positioning behind the roadmap
