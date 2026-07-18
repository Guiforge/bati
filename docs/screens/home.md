---
title: Home
type: screen
route: /
status: active
updated: 2026-07-14
related: [onboarding.md, adventure-details.md, village.md, treasury.md, journal.md]
sources: [app/(tabs)/index.tsx]
---

# Home (`/`)

## Purpose

Home is the quick launch pad: glance at your level + avatar, see the current adventure step, and act immediately.

## Layout focus

- **Overview header**: compact strip with your avatar, level badge, and streak — always visible up top.
- **Current adventure card**: the hero call-to-action with the next step, rewards, and start/continue button.
- **Modern navbar**: floating, rounded bottom navbar for fast jumps ([Village](village.md), [Treasury](treasury.md), [Journal](journal.md)) without eating screen space.

## Visual rules

- Keep the current adventure card as the visual center of the screen.
- Use subtle tokenized borders; no bright outline frames on cards or action tiles.
- Secondary actions should read lighter than the main CTA.
- The resource strip should feel like a quick status read, not a separate dashboard.

## What success looks like

The next step is obvious: tap the current adventure, keep training, and feel progress from the header and navbar cues.

## Implementation note

The current Home implementation uses shared card primitives and quieter dark surfaces to reduce the old white-border look and keep the primary action dominant.
