---
title: Image style
status: active
updated: 2026-08-02
---

# Image style

The art direction, and the rules that were learned by getting it wrong.

**The prompts themselves are not here.** Each family owns its own `STYLE` block inside its
generator, appended verbatim to every prompt in that family — `scripts/generate-exercises.py`,
`generate-covers.py`, `generate-village.py`, `generate-bosses.py`, `generate-avatars.py`,
`generate-backgrounds.py`. That is deliberate: a style guide in prose and a style block in code
drift apart, and only one of them is what actually gets sent. This page explains *why* those
blocks say what they say.

## The look

Franco-Belgian BD: confident black ink outlines, flat cel-shaded colour, hard-edged shadows, no
soft airbrushing. Anchored in deep obsidian blue `#0B0F19` — the app's own surface — with edges
falling off into darkness so an image lands on the background without a visible seam.

The app is dark-mode only. An image that arrives on white paper is not a stylistic variation, it
is a bug, and it was the single most common failure: roughly one render in seven, until the
background instruction was moved to the **first sentence** of the style block and stated
positively ("one unbroken field of very dark navy-black, as dark as a night sky") rather than as
a prohibition. Models follow descriptions far better than they follow negations.

## Aspect ratio follows the slot, not the taste

Every family was once 4:3, because that is what the first generator defaulted to. Four of them
were wrong:

| Family | Shape | Why |
|---|---|---|
| Exercises | 1:1 | Five of their six slots are square (180², 64², 56², 50²). A 4:3 source in a 50 px square crop loses the limbs that identify the movement. |
| Avatars | 1:1 | Rendered circular at 48–64 px. A 4:3 source lost the sides of every one. |
| Bosses | 2:1 | `BossArena` sizes art at `min(width * 0.5, height * 0.28)` — a letterbox. 4:3 art had its head and feet cropped. |
| Covers, backgrounds | 4:3 | Correct as they were. |
| Villagers | 3:4 | A cameo rises from the bottom edge, ~150dp tall in a ~115dp column. Square would crop the figure; the boss letterbox would crop the head. |

Check the slot before choosing the frame. `contentFit="cover"` never warns you.

## Exercise art is a diagram first

It is the only art with a job beyond atmosphere: someone mid-session has to look at it and know
what to do with their body. Every tie is resolved towards legibility.

- **No armour, no cape, no hood.** Plate hides the joint it covers. Fitted cloth, arms and lower
  legs bare — a bent elbow the reader cannot see is a rep they cannot copy.
- **One figure, one position, whole body, margin on all four sides.** At 50 px the silhouette is
  the entire message.
- **The glow marks the working muscle**, keyed to the muscle palette. It is the theme showing up
  where it also does instructional work.
- **The theme is a finish, not the subject.** The style block says so in as many words: *"a light
  finish over what is first and foremost an instructional diagram."*

Two things were tried here and removed. **Onion-skin ghosts** of the start position, with a motion
arc, read well at full size and as clutter at thumbnail size. **A varied fantasy-race cast** —
elves, orcs, dwarves, one per exercise — made the set less clear, not more characterful.

## Villagers are the only family that needs an alpha channel

A cameo is drawn over `$surface`, over the boss arena and over full-bleed exercise art, so an
opaque void would show on all three. FLUX cannot output alpha, so the family is rendered on a flat
void and cut by [`cutout.py`](../../scripts/cutout.py) — the same two-step the emblems use.

Three instructions in that style block are load-bearing rather than decorative, and each is there
because of something that went wrong:

- **A flat field, explicitly no vignette.** The flood fill starts in the corners and stops at a
  contrast step. Three emblems came back on a *radial* background and needed hand-tuned thresholds
  because the fill stalled halfway up the gradient. Asking for one value edge to edge keeps the
  villagers' override table empty.
- **A rim light all the way round**, borrowed verbatim from the avatars. It earns its keep twice:
  it separates the figure from the void for the reader, and it gives the flood a bright boundary
  it cannot cross. Without it a villager in dark wool is eaten from the shoulders in.
- **A pre-industrial world, named by its materials.** Left unsaid, the model dresses these people
  from photographs: the champion's first pass arrived in what read as a modern canvas work jacket.
  Naming hand-woven wool, hand-stitched leather with visible thread, horn buttons and cloth belted
  rather than tailored fixed it far better than forbidding the modern version would have.

Two failures worth knowing about. One of 35 renders drew a **white comic-panel border** around the
whole image, which the flood then dutifully cleared — 14 % of the picture — and the
`30 <= share <= 92` guard refused it. It survived nothing but a re-roll, so it was the dice, not
the prompt; but the style block does say "all four corners of the **frame**", and a noun that can
be drawn is a noun that will be. Worth changing the next time the family is re-rendered anyway.
And `champion_talk` came back **Content Moderated for Violence** three times on one seed while her
other poses passed — an inventory of injuries ("a broken nose and an old scar through one
eyebrow") in an otherwise martial description. An error that survives a change of seed is the
prompt: it was rewritten, not re-rolled, and the character lost nothing.

## Prompts that fail, and why

Most bad images are bad prompts, not bad dice. Re-rolling a prompt that cannot work just costs
money. The tell is whether the same error survives a change of seed.

- **`wall_sit`** said *"against an invisible wall"*. An invisible wall cannot be drawn, so it kept
  coming out a free-standing squat. Naming a solid stone wall fixed it on the first try.
- **`chin_up`** said *"a rugged stone bar"*, which rendered as a barbell with stone plates. A
  plain fixed bar, plus an explicit underhand grip, fixed it.
- **Emptiness must be positive.** *"The clearing is deserted"* keeps people out of a scene;
  *"no people"* invites them in.
- **Signatures and captions** appear unbidden. Stating that all four corners are empty background
  and the artwork is unsigned works better than forbidding a watermark.

## Reproducibility

Every image is seeded from its own slug, so editing a prompt changes the instruction and not the
draw — you can see what the edit did. `FLUX_SEED_SALT=<n>` re-rolls the ones that need it, and the
seed actually used lands in `scripts/provenance.json` alongside the model and the exact prompt.
That file is also the evidence behind the CC BY-SA grant on `assets/`; see
[`../fdroid.md`](../fdroid.md) for why that matters.
