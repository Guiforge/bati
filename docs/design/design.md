---
title: Design Best Practices
type: design
status: active
updated: 2026-07-18
related: [README.md, design-system.md, ui-guide.md, ui-checklist.md]
---

# Design Best Practices

> Read this first when you are designing or reviewing a screen. It turns the design system into a simple decision order.

## Purpose

Bati’s UI should feel like one product: dark, fast, readable, and game-like without becoming noisy.

## Decision order

When you design or review a screen, use this order:

1. **What is the primary action?** If there is no clear answer, the screen is not ready.
2. **What is the content hierarchy?** Title, primary action, supporting content, secondary actions.
3. **What shared primitive fits?** Reuse a card, button, header, or state component before inventing a new one.
4. **What visual weight is necessary?** Prefer spacing, contrast, and typography before borders or decoration.
5. **What could fail in gym lighting?** Check readability, contrast, and tap targets early.

## Best-practice rules

- Keep one primary CTA per screen.
- Use tokens for color, spacing, radius, elevation, and shadows.
- Keep borders subtle; heavy white/off-white outlines are a design bug, not a style choice.
- Reuse shared primitives across screens so the app feels coherent.
- Make small text readable under bright ambient light.
- Respect reduced-motion settings for non-essential animation.
- If a pattern appears twice, consider making it shared.

## What good looks like

- The user can tell what to do in a single glance.
- The most important action is visually dominant without shouting.
- Decorative elements support the experience instead of competing with it.
- A new screen looks like it belongs to the same app as the previous one.

## What to do when a screen drifts

- Compare it against [ui-guide.md](ui-guide.md) for product intent.
- Compare it against [design-system.md](design-system.md) for tokens and component standards.
- Run the quality gate in [ui-checklist.md](ui-checklist.md).
- Log persistent issues in [../planning/ui-screen-audit-tracker.md](../planning/ui-screen-audit-tracker.md).

## Related

- [design-system.md](design-system.md) — tokens and component standards
- [ui-guide.md](ui-guide.md) — UX principles and visual guidance
- [ui-checklist.md](ui-checklist.md) — merge gate for UI quality