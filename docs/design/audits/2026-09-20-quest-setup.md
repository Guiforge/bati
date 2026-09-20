---
title: Design audit, setting up a quest before starting it
type: design
status: active
updated: 2026-09-20
related: [2026-09-10.md, ../audit-protocol.md, ../ui-checklist.md]
---

# Design audit, setting up a quest before starting it

Scoped to the four surfaces a hero touches to change what a session will be: the quest list, the
quest detail card, the `Adjust this quest` panel, and the quest editor. Triggered by the work that
put hold to repeat on [`Stepper.tsx`](../../../components/common/Stepper.tsx), which made every
value in this flow reachable in seconds instead of hundreds of taps, and so made everything that
was merely slow about the flow suddenly visible.

Not a repeat of [2026-09-10.md](2026-09-10.md) §3, which covered the quest detail's dilution. This
is about the controls, not the card.

**Method.** No Maestro run: the app was driven by hand on an emulator (`bati-bench`, 1080x2400,
density 420, so 2.625 px per dp), shots taken with `screencap`, control sizes read from
`uiautomator` bounds and converted to dp, colours sampled from the PNG and checked against the
tokens. Two personas from [audit-protocol.md](../audit-protocol.md) §2 judged the shots, the
hurried lifter and the stranger. Their claims are kept below only where a measurement or the
source agreed; what they got wrong is in §3, because a persona's miss is worth as much as its hit.

The dev client's translucent gear sits over this app's own top-right control on every shot. It is
not ours, it ate one tap during the run, and nothing about it is a finding.

---

## 1. Findings

### 1.1 Nothing in the panel says what the settings cost. Blocker.

**Claim.** A hero changes six values without ever seeing the two numbers the change is for.

**Evidence.** `≈ 10 min` and `up to +70 XP` live in the summary card. Opening `Adjust this quest`
fills the viewport with steppers and pushes that card off the top, so every adjustment is made
blind and confirmed only by scrolling back up. Both personas raised it independently, and it is
the only question either of them said they actually had: how long is this going to take me.

**Fix.** Put the live `≈ X min` in the panel's own header row, next to the `Custom` tag, where it
stays on screen while the steppers are being used.

### 1.2 Opening the panel shows nothing. Friction.

**Claim.** Tapping `Adjust this quest` produces no visible change, so the tap reads as failed.

**Evidence.** Shots `01` and `02` are the same frame except the chevron flipping from down to up.
The panel does open, below the fold, behind the pinned `Start Quest` bar. Nothing scrolls. Both
personas called it, and the stranger's reading is the damning one: a first-timer has no reason to
scroll after a tap that changed nothing.

**Fix.** Scroll the panel header to the top of the viewport on expand.

### 1.3 The door to the whole panel is 22 dp tall. Friction.

**Claim.** The only control that opens the settings is half the minimum touch target, on a screen
used one-handed.

**Evidence.** `uiautomator` gives the pressable as 325 x 22 dp. The source is a bare `XStack` with
`onPress` and no `hitSlop`, no `minHeight` and no vertical padding
([`QuestConfigCard.tsx:237`](../../../components/quests/QuestConfigCard.tsx)), so the row is
exactly as tall as its tallest child. The outlined card around it is roughly four times that and
reads as the button. `Start Quest` on the same screen is 376 x 60 dp: two controls, a factor of
three apart. [ui-checklist.md](../ui-checklist.md) §3 sets the floor at 44 dp. The warm-up row
below it has the same shape and the same 22 dp.

**Fix.** Make the whole card pressable, with `minHeight={48}`.

### 1.4 One bad hold costs every setting. Friction.

**Claim.** After a hold overshoots, the only recovery throws away everything else too.

**Evidence.** `resetConfig` writes `{ level: config.level }`
([`quests/[id].tsx:447`](<../../../app/(tabs)/quests/[id].tsx>)), so `Back to defaults` discards
rounds, both rests, every target and every swap. It is also the last control in the panel, below
the rows that caused the problem. No row has its own reset, and nothing offers an undo.

**Fix.** Move `Back to defaults` into the panel header beside the `Custom` tag, which already
announces the state it undoes.

### 1.5 A time target has no ceiling a body recognises. Friction.

**Claim.** A wall sit can be set to 11 minutes 40, and the screen treats it exactly like 30
seconds.

**Evidence.** `targetRangeFor` returns `TIME_TARGET_MAX` of 3600 s for any movement that is not an
outing ([`db/targets.ts:106`](../../../db/targets.ts)), and there is no per-movement bound. 11:40
was reached during this audit by holding `+` for three seconds. Same row, same weight, no warning,
and the card still reads `Medium`. Before hold to repeat this took 140 taps, which was its own
kind of guard rail; that guard rail is gone as of today.

**Fix.** A per-movement ceiling derived from the movement's own `secondsPerRep` and pattern, or a
confirmation past a sane multiple of the seeded target.

### 1.6 The warm-up resizes itself and says nothing. Friction.

**Claim.** Changing a target silently adds minutes to the session in a different section of the
screen.

**Evidence.** Between shots `03` and `04` the warm-up row goes from `5 exercises · 3 min` to
`9 exercises · 6 min`. The only thing touched in between was a stepper. The behaviour is right,
the warm-up scales with the work, but the panel reports it nowhere and the session estimate that
would have carried it is off screen, see §1.1.

**Fix.** Covered by §1.1: a live estimate in the panel header makes this visible for free.

### 1.7 Round rest mirrors Rest until it is touched once. Friction.

**Claim.** Two steppers look independent, the second silently copies the first.

**Evidence.** `value={quest.roundRestSeconds ?? quest.restSeconds}`
([`QuestConfigCard.tsx:178`](../../../components/quests/QuestConfigCard.tsx)). Holding `Rest` from
45 s to 75 s moved `Round rest` to 75 s in the same frame. After `Round rest` is touched once it
pins, and the two diverge with nothing to mark the change of behaviour.

**Fix.** While `roundRestSeconds` is null, say so in the hint: `Same as rest`, and drop it on first
touch.

### 1.8 The editor stops you with a system dialog, one problem at a time. Friction.

**Claim.** Validation fires after the fact, in Android's own grey dialog, and points at nothing.

**Evidence.** `Save quest` on an empty form raises `Alert.alert("Almost there", "Your quest needs a
name.")`. Light grey panel, teal `OK`, in an app whose design system says dark only and forbids
surfaces that rely on white ([DESIGN.md](../../../DESIGN.md) §5). `missingPiece`
([`quests/edit.tsx:60`](<../../../app/(tabs)/quests/edit.tsx>)) returns the first problem only, so an
empty form costs two dialogs: the name, then the exercises. The field behind the dialog is neither
marked nor focused.

**Fix.** Inline error under the field, and focus it. Mark `Name` as required before the first save
rather than after it.

### 1.9 The loudest control on an empty form is the one that cannot work. Friction.

**Claim.** `Save quest` is full width and fully saturated on a form with no name and no exercises,
while `Add an exercise`, the only thing that can be done, is a quiet outline button.

**Evidence.** Shot `06`. `disabled={busy}` is the only disabled condition
([`quests/edit.tsx:603`](<../../../app/(tabs)/quests/edit.tsx>)). This inverts
[ui-checklist.md](../ui-checklist.md) §1: one primary action is dominant, and it is the wrong one.

**Fix.** Disable `Save quest` until `missingPiece` returns null, which also deletes §1.8's first
dialog.

### 1.10 `Rounds` is the one row with no subtitle. Polish.

**Evidence.** `Rest` says `Between exercises`, `Round rest` says `Between rounds`, each slot says
`Duration` or `Reps`. `Rounds 3` says nothing, and it is the value that multiplies all the others.

**Fix.** A hint of its own: `The whole list, repeated`.

### 1.11 Input placeholders are off palette. Polish.

**Evidence.** Both placeholders in the editor render at `#B6B7BB`, the platform's neutral grey.
Every other piece of secondary text in the app is the palette's blue tinted `$textSecondary`
`#909ACB`, sampled on the same shot. Exactly one screen in the app sets `placeholderTextColor`
(`app/onboarding/village-setup.tsx:138`); seven other files with `placeholder=` do not. DESIGN.md's
own reflex list says secondary text on a coloured surface is tinted from that hue, never grey.

**Fix.** Set it once on a shared input, not eight times.

### 1.12 The swap control has no visible name. Polish.

**Evidence.** The round double-arrow beside each movement carries
`accessibilityLabel="Replace this exercise"`, which `uiautomator` reads and a person does not. It
is the only icon-only control in the panel.

**Fix.** Nothing, or a one-word label, but do not leave it as the only unnamed control in a panel
where every other row is labelled twice.

### 1.13 Three widths on a wide window. Polish.

**Evidence.** At 1840x2208 the content column spans 301 to 1539, the `Start Quest` button spans 288
to 1551, and the footer and tab bar separators run the full 1840. The button is 13 px wider than
the card it belongs to, on each side.

**Fix.** Cap the footer's button at `CONTENT_MAX_WIDTH` like the column above it. The separators
are screen chrome and are meant to be full bleed.

---

## 2. One decision, two readings

**The x10 acceleration on a held stepper.** Added today so a range that takes 714 taps at 5 s a
step is crossable at all, with rounding to the bigger unit so the digits stay readable while they
move.

- *The hurried lifter wants it gone*: a hold rewrote the quest behind their back, and no feedback
  distinguishes the slow phase from the fast one. Their fix is to keep the 10 per second repeat and
  drop the multiplier.
- *The reviewer who specified it* pointed out that without it the twelve hour outing ceiling takes
  fourteen minutes of held finger, and that rounding was the answer to readability.

Both are right about different ranges. The disagreement is not about whether to accelerate but
about whether acceleration is *announced*: nothing on screen or in the hand marks the moment the
step becomes 50. The cheapest answer that serves both is feedback, not removal: a haptic tick when
the multiplier engages, or the value's own colour shifting while it is fast. Left open here rather
than decided, because it is a product call.

---

## 3. Checked, and not a finding

Written down so the next audit does not spend the same time on them.

- **Contrast on the tinted summary card.** The quest detail card takes its background from the
  quest's dominant muscle, which for `Chop Wood` is `$pastelYellow` `#33301A`, an olive, not a pale
  yellow. A colour census of the rendered card finds exactly two text colours on it: `$text`
  `#E8ECFF` at 11.32:1 and `$textSecondary` `#909ACB` at 4.86:1. Both clear AA. The persona claim
  that `Baseline targets · XP ×1` is drawn in `$muted` is wrong, `$muted` does not appear on that
  card at all.

  Worth knowing anyway: `__tests__/color-contrast.test.ts` deliberately leaves `$pastelYellow` out
  of its `SURFACES` list, describing it as a one-off fill whose label is picked by hand. It is not
  a one-off any more, it is the quest detail card for every quest whose dominant muscle maps to it,
  and the ratchet cannot see what gets written there. `$muted` on it would be 2.80:1 and `$primary`
  1.76:1, and both are one prop away with nothing to catch them.

- **The two placeholders being different colours.** They are not. Both sample `#B6B7BB`; the
  apparent difference in the shot is font size, not colour. The real finding is §1.11.

- **The +/- buttons being 36 dp.** They are, and `hitSlop={8}` makes them about 52 dp effective.
  The swap button's left edge sits 7.2 dp from the `+` button's right edge, so it eats the last
  couple of pixels of that slop, leaving roughly 51 dp. Still over the floor. Not a bug.

- **The gear over the top-right control.** The dev client's, on every shot, as
  [audit-protocol.md](../audit-protocol.md) §1 warns.

- **The `Medium` and `Custom` badges contradicting each other.** They describe different things,
  difficulty and config state. The stranger read them as competing, which is a comprehension
  signal worth keeping in mind, but the fix they proposed, making the header badge say `Custom`,
  would delete real information.

---

## 4. Not covered

- The French pass. Copy gets its own pass against
  [writing.md](../../product/writing.md), per [audit-protocol.md](../audit-protocol.md) §5, and the
  run above was English only.
- The outing configuration path (`OutingGoalSheet`), covered by
  [2026-09-10-home-and-outings.md](2026-09-10-home-and-outings.md).
- The two other personas, the player and the regular. Neither has much to say about a settings
  panel, which is why this run used two.
