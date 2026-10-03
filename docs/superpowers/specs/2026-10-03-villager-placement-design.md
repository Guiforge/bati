# Villager placement and touch (P-01), design

Date: 2026-10-03. Owner-approved. Source: the 2026-10-03 audit (workstream S6,
`docs/design/audits/2026-10-03.md`) and the owner's recommendation "P-01".

## Problem

One global overlay (`components/chorus/VillagerCameo.tsx`, mounted once in `app/_layout.tsx`)
draws a villager figure and bubble on top of every route. A capture on the root view dismisses it
on any touch without consuming the touch (`cameoTouch.ts`), and the layer is `pointerEvents` none
or box-none. Result, seen on every audit since 2026-09-10: the figure covers content (second card
on Adventures, Quests, Journal on day one; the level row and the "Too Easy" button on victory), and
because it lets touches through, **tapping the figure rates the session "Too Easy" unseen**. The
2026-09-10 rule "a cameo never intersects a control" was applied screen by screen and did not hold.

## Decision

The big figure exists only where there is a painting to stand on: **the Village**. Everywhere else
the villager is a **line in the content flow**, which by construction can sit on top of nothing.

### 1. Village (the only floating figure)

- The figure stands on the Village painting, as today's cameo does.
- **Figure and bubble form one touch zone**, generous: the whole band where the villager appears,
  so a tap slightly beside the figure still counts. A tap in the zone **sends the villager away on
  touch down** (`onPressIn`, not on release) and **stops there**: nothing underneath receives it.
- No "first tap finishes the line, second sends it away": one tap, gone.
- A tap anywhere else on the Village screen reaches the screen as usual, **and** the villager
  leaves too (the current capture-and-return-false behaviour, scoped to the Village screen).
- TalkBack: the zone is a button whose label is "Send away" (FR « Renvoyer ») and whose
  accessibility value or hint reads the whole sentence. The typed text itself stays out of the tree.

### 2. Everywhere else: `VillagerLine`

- A new component rendered **in the flow** of the screen that cued it, **just under the screen's
  header**: on the tabs under the title, on the rest screen under the timer, on victory **inside the
  hero banner**.
- **Not tappable.** No pressable, no responder, `accessible` as plain text (villager name + line).
- **Does not disappear while the hero is on the screen**: no linger timer. It leaves when the screen
  loses focus or unmounts (dismiss on blur), so content never jumps up under a finger.
- Typing is kept for guides and events (owner choice), at the final size from the first character
  (the untyped remainder is transparent, as today), off under reduced motion. Ambient never types.
- **Victory reserves the line's slot in the hero banner from the first frame**, whether or not a
  villager ends up speaking (the cue fires after the save, so the line cannot be known at first
  frame). Otherwise the line arrives with the save and pushes the feel buttons under the finger.
  The slot height is fixed (the line is clamped to it).
- Small portrait or initial next to the line is allowed if it fits the slot; no full figure.

### 3. Store and cues

- `stores/chorus.ts` keeps one `current` cameo, the cast rotation, the ring and the budgets. Who
  draws it is decided by the screen: the Village renders the floating figure, every other cueing
  screen renders `VillagerLine`. A cue's line is shown only by the screen that is focused.
- Guides are still "seen" once shown. `CAMEO_LINGER_MS` applies to the Village figure only.
- `app/_layout.tsx` no longer mounts the overlay or the root capture.

### 4. Guard rails (tests)

- The floating figure component is mounted by the Village screen and nowhere else (a test that
  fails if any other module renders it).
- Village: a press-in on the zone dismisses and does not reach the element underneath; a press
  outside reaches the screen and dismisses.
- `VillagerLine`: renders under the header, has no pressable, survives past the old linger time
  while focused, goes away on blur.
- Victory: the slot exists on the first render with no villager, and its height does not change
  when a villager arrives (the feel buttons do not move).
- Docs: `docs/gameplay/villagers.md` § "What is tappable, and what is never" rewritten to this
  design.

## Amendments after the emulator passes

- The Village figure is a child of the hero painting, in a band above the title (not a window
  overlay); a window with no room for it gets no villager and no guide is spent.
- Every cue has an owner screen: drawn only there, dismissed when that screen blurs or unmounts,
  adopted by nobody. The comeback greeting fires on focus.
- The Village zone also handles `onPress` (accessibility activation); label = speaker + line,
  hint = "Send away".
- Rest: the column is top-anchored and the line is last, so no control moves when a villager comes.
- Victory: the hero level card is rendered from the first frame, like the line slot, so the feel
  buttons never drop; the line is clamped to three lines.
- Accepted cost: on a tab, a first-visit guide arrives after an async read and pushes the content
  down once, once ever per tab.

## Out of scope

Villager content, triggers, budgets and the anti-repetition ring are unchanged.
