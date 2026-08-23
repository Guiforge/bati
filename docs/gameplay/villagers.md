---
title: Villagers
type: system
status: active
updated: 2026-08-23
related: [../content/image-style-prompt.md, session-flow.md, ../screens/village.md]
sources: [constants/villagers.ts, stores/chorus.ts, components/chorus/VillagerCameo.tsx, scripts/generate-villagers.py]
---

# Villagers

A cut-out figure, posed over whatever screen is showing, saying one line.

## Why the layer exists

Nothing in Bati had a face. Numbers rose, a village grew, a boss lost HP, and the only character
who ever spoke was the boss — an adversary — through
[`BossTauntOverlay`](../../components/session/BossTauntOverlay.tsx). Two concrete gaps followed:
there was **no tutorial anywhere in the app**, and **nobody reacted to a victory**. Felling a boss
after six sessions produced a screen of statistics.

## The pact

> A villager never appears to fill space. They appear because something just happened, they say it
> in one breath, and they leave.

`BossTauntOverlay` learnt this the hard way: it used to fire on a random 15-45s schedule from one
shared pool, and talked over your set about nothing. Every moment below is keyed to a signal the
app already had. **The chorus never invents a trigger.**

## The cast

Seven named villagers, each anchored to a building the village already paints — so the cast cannot
drift into inventing places that do not exist.

| id | who | building | owns |
|---|---|---|---|
| `smith` | the Smith — gruff, concrete, talks about material | `armory` | records, strength |
| `watcher` | the Watcher — dry, tactical, sees things coming | `watchtower` | bosses, adventures |
| `sage` | the Sage — slow, sententious, takes the long view | `observatory` | guides, rest, returns |
| `champion` | the Champion — brief, technical, peer to peer | `champion_arena` | victories, firsts |
| `herbalist` | the Herbalist — brisk, knowing, unbribable | `druid_grove` | recovery, deloads |
| `minstrel` | the Minstrel — delighted, already telling it | `campfire` | streaks, comebacks |
| `farmer` | the Farmer — calm, unimpressed by hardship | `barn` | the ordinary daily work |

**Villagers do not have glowing eyes.** All six player avatars do, because the player is the
exceptional one. That single rule is what stops a villager reading as a second player character,
and it is written into the generator's style block as well as here.

Five poses: `talk`, `cheer`, `urge`, `concern`, `salute` — each answering a moment rather than
being a spread for its own sake. `urge` and `concern` have art but no trigger yet; they are listed
in `POSES_AWAITING_A_MOMENT` and a test fails if that list stops matching reality either way.

The art is deliberately pre-industrial down to the materials — hand-woven wool, hand-stitched
leather, horn buttons. Left unsaid, the model dresses these people from photographs: the champion's
first pass came back in what read as a modern canvas work jacket.

## The attention budget

Repetition is not felt as "I have read this sentence before". It is felt as *"someone talks at me
every single rest"*. So the interesting part of [`stores/chorus.ts`](../../stores/chorus.ts) is
what it **refuses**:

- **One cameo on screen, ever.** Never two.
- **Priority** — `event` > `guide` > `ambient`. An ambient line is *overwritten, never queued*: a
  reaction that arrives after its moment has passed is worse than no reaction.
- **90 s cooldown** on ambient. Events bypass it.
- **Three ambient cameos per window**, the window refilling after 30 minutes of silence. Events
  are not counted.
- **35 % chance** on an eligible ambient slot. The absence is what makes the presence worth
  noticing; a villager at every rest is furniture within two sessions.
- **One switch** in Settings — "Villagers". It silences events too, not just atmosphere.
- **Reduced motion** removes the slide, keeping the cameo.

## Anti-repetition

1. **Large pools** — twelve lines minimum per villager for ambient. Lower than the eighteen
   villageFlavour.ts argues for, and deliberately: these pools are *per villager*, so five voices
   carrying `rest` is sixty distinct lines drawn at most three times a session.
2. **A persisted ring** of the last 12 lines said, in one `userPreferences` key. It survives a
   cold start, which is exactly where `BossTauntOverlay`'s in-memory pool is weakest — the first
   rest of a fresh session.
3. **Cast rotation** — the same villager never speaks twice running.

The ring keys on `villagers.<id>.<moment>:index`, not on the text, so switching language keeps the
memory: `en[3]` and `fr[3]` are the same line. `__tests__/i18n-keys.test.ts` descends into the
arrays, so its parity check is what guarantees they stay the same length.

## The writing rules, and where they come from

These are not taste. Each one is a finding, and each is why a line is shaped the way it is.

**Process, not the person.** "You held the last one", never "you're strong". Praising the process
after a success predicts better coping with the *next* failure; praising the person builds a
self-worth that is contingent on the result and collapses the first time the result is bad. A
villager comments on what was done, never on what the hero is.

**Autonomy-supportive, never controlling.** "You could", "whenever you like", a plain observation
— never "you must", "come on, one more!". Controlling language produces reactance, which lowers
exactly the autonomous motivation the layer exists to support. No villager ever commands effort.
The herbalist's "Drink. Not because I said so —" is the pattern: the disclaimer is the point.

**Specific beats generic.** Externally-sourced motivation drops off sharply after six to eight
weeks when it is decoration; what keeps working is tied to something real. This is the whole
reason `personal_record_beat` exists as its own moment: *"{{delta}} more than last time"* is the
shape the evidence supports, and *"well done!"* is the shape it does not.

**Never guilt.** A study of 58,881 posts about the five most profitable fitness apps found one
through-line in the distress: nagging notifications, broken streaks, small slips framed as
failures — shame, then avoidance, then quitting. **No villager ever notices an absence as a
reproach.** Whatever the layer grows into, that rule does not bend.

**Sarcasm never points at the hero.** It may point at the villager, the boss, the world, or the
absurdity of chopping imaginary wood. Sarcasm aimed at the hero is shame wearing a smile, and it
lands on the wrong side of the rule above.

**The mechanism that actually works here is social recognition** — it raised intrinsic motivation
in the gamified-fitness study rather than crowding it out. A villager acknowledging you *is* the
payload. The joke is the wrapper.

### The two that a machine checks

> **Ambient never cites data. An event speaks only about its data.**

An ambient villager has no data — nothing just happened for them to have data *about* — so a
number in an ambient line is either invented or contradicts the counter beside it. The inverse
holds too: a `_beat` line without its `{{delta}}` is a comparison to nothing.

`__tests__/villagers.test.ts` enforces what it can: no digits in an ambient pool, `{{delta}}`
present in every beat line, the length caps (90 characters ambient, 140 for guides and events),
`en`/`fr` the same length everywhere, and no orphan pool nobody is cast to speak.

### And one that only French needs

The hero's avatar has no fixed gender, so **no French line may agree a participle with them**.
`tu t'es …` is the trap — it forces *arrêté* or *arrêtée* and there is no third option. Checked.

## Where the lines live

`locales/en.json` and `locales/fr.json`, under `villagers.<id>.<moment>`, read through i18next so a
language switch moves the villagers with everything else. **Every villager has their own pool for
every moment they carry**: the smith and the champion both react to a record and say entirely
different things about it, because a voice is not a label on a shared sentence.

`villagers.units.delta_reps` / `delta_seconds` carry the plural forms, so the English says "1 rep"
and not "1 reps".

## Where the art comes from

[`scripts/generate-villagers.py`](../../scripts/generate-villagers.py), then `to-webp.py`, then
`cutout.py --family villagers` — in that order, because `cutout.py` rewrites the file as WebP in
place. See [image-style-prompt.md](../content/image-style-prompt.md) for the style rules and the
two failures this family hit.

## Not built

No sound (`expo-audio` was removed from this project for unjustified permissions — see
`__tests__/android-permissions.test.ts`). No dialogue tree, no reply choices, no villager-given
quests, no affinity, no villager who remembers a session by name. The layer supports all of it
without being rebuilt; none of it is here.
