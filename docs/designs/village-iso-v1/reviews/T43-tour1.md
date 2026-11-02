# T43 round 1: Mara and Théo audit (31/10)

Fresh iso-design-reviewer, frozen prompt AUDIT-MARA-THEO-PROMPT.md plus the layout and weight section of T43. The agent could not write files, so the chief saved its full report here verbatim. Evidence came from qa-audit1 (the build before the shadow and camera fixes) and qa-T41. The agent checked no video, opened no stage board, and did not look at vocation, crest or guardian animal in the captures.

## 1. Scores
| Auditor | FUN | PRIDE | PERSONAL |
|---|---|---|---|
| Mara | 4: clean and inked, but only smoke and birds move; nothing surprises | 5: tier 12 zoom-1 crops are handsome; mini view is a small tile in a big empty meadow | 3: tiers differ by count only; no mark of a runner or a calisthenics fan |
| Théo | 4: I open it to tap, not to look | 4: I would send the tent and fire, not the full view | 3: "a village", not "my village" |

## 2. Mara top 7
1. Island floats on a second meadow (weight): lighter plateau with scalloped brown/black cliff band over a flat darker green field, no sea, no cliff foot, almost no cast shadow. Sticker on wallpaper. Fix: section 8.
2. Empty world: island is about 20% of screen height at tiers 6 and 12; decor scattered evenly (reads as pattern). Fix: closer default framing ("Cadrer" lands about 0.9, not 0.6), thin decor near island, cluster trees into 2-3 thickets.
3. Style mix: buildings/rocks are heavy inked with hatching; trees, bushes, tufts are thin-outline flat (planche-bords-zoom1, gp-foret-bord). Fix: same thick outline + one shadow tone on trees.
4. Night is a tint: same silhouette and contrast as day; white gulls fly at night (p1-nuit); fire does not light the ground. Fix: no birds at night, baked warm light pools under lit windows and fire, a few fireflies in a wave.
5. No focal point, no rest motion: tent, hall, forge, arena similar size and value; only strong shape is the blue rock spike (a prop). Fix: Hero Hall as landmark with lit forecourt and a road that leads to it.
6. Upgrade reveal is polite (revelation-planche): ghost fade, gold ring ellipse not aligned to the footprint, few diamonds, smoke. No anticipation, hit-stop, camera move. Fix: section 6.
7. Unfinished ground (ombre-coupure-jour): cliff shadow cut by a hard rectangular edge, blue rectangle leftover under the cliff; tier 1 road-cross arms end in the air. Fix: soft clip, delete leftover, end arms with post/stone.

## 3. Théo
Diary, tier 1: 0:00 tent, fire, slab, five tiny villagers, hamlet starting, good. 0:10 lamp post taller than the tent, odd. 0:20 road is a big cross going nowhere, no hint of the next building. 0:40 birds, then nothing, phone down.
After 1 month (tier 6): windmill makes me smile; cannot tell I ran 20 km and did 400 push-ups; upgrade ring gives no feeling; villagers are dots.
After 1 and 3 years (tier 12): bigger tile, same look; 3 years = diamond with 21 plots; no boss statue visible from the full view.
Frustrations: (1) cannot read my sport from the village; (2) no hook for tomorrow, no visible next plot; (3) villagers tiny, no readable trade at mini zoom; (4) closed diamond, no coast, tech demo feel; (5) night and day are not different places.
Loved: (1) close-up inked buildings (tent, fire pit, forge); (2) chimney smoke and gold banners on finished buildings; (3) villagers with brooms.

## 4. Disagreements
Density: Mara more props, Théo fewer bigger readable ones: Théo (a few story props). Empty meadow: Mara (first thing a friend sees). Reveal: both (cheap hit + a story line of copy). Night: same fix, make night a place.

## 5. Plan (all items respect Bati rules: no currency, no timer, no going back, 64 nodes, nothing animated at rest, reduced motion, no per-image opacity, no scaled big Svg)
Quick wins: no birds at night (1h, fun); delete blue leftover and soft-clip cliff shadow (2h, pride); closer default framing (1h, pride); thin decor near island and cluster thickets (3h, pride); shorter tier-1 lamp post or a lit sign (2h, pride); static ground contact shadow band under island rim (3h, pride); baked warm light pools at night (4h, fun); end tier-1 road arms with post/stone (2h, pride).
Medium: reveal v2 with anticipation, hit, footprint-aligned dust ring (2d, fun+pride); vocation marks from training data, first check whether the vocation system already drives art (3d, personal); island base: cliff foot, water or mist ring, soft shadow (2d, pride); tier-1 ghost of the next plot with sign (1d, fun); larger villagers with visible trade prop at mini zoom (2d, fun+personal).
Big bets: per-player island silhouette following sport mix, never removing built plots (1-2 wk, personal); paint the target image then repaint trees and ground, needs Guillaume's approval (1-2 wk, pride); landmarks on the main road: boss statues and blason visible at mini zoom (1 wk, personal).

## 6. Wow moment (building reaches next stage, about 2.4 s; reduced motion: cross-fade to frame 7)
0 ms tap, building squashes 4% (120 ms). 120 ms village dims 15% with one dark layer behind the building, birds and smoke pause, building lifts 6 px. 300 ms old stage becomes a flat warm-white silhouette. 420 ms hit-stop 80 ms, gold ring drawn in iso along the real footprint, dust at four corners. 500 ms new stage replaces it with 6% overshoot, settles in 250 ms. 800 ms sound hit, small camera nudge, 8 gold diamonds (at most 8 nodes). 1100 ms nearby villagers turn, one raises an arm; banner/lit windows turn on if last stage. 1600 ms dim clears, comic caption card with one story line ("The forge now burns all night."), 1.5 s. 2400 ms nodes released, rest.

## 7. Target image
Square island diorama, iso, centered, 60% of frame width. Rock foot with two mossy cliff layers, thin sea ring with foam, long soft shadow on water, real coast not a field. Light: warm low sun upper left, one blue-violet flat shadow direction to lower right on all buildings, rim light on roofs. Palette: moss green, ochre road, slate blue stone, brick roofs, one gold accent for finished buildings, flat dusk bands outside the frame. Composition: main road from a harbour (front) to the Hero Hall (back), tallest, lit forecourt, banner and blason on the facade; campfire plaza second focus at the fork. Districts: craft (forge, mill, farm) left, training (archery, arena, bars and rings) right, quiet (library, observatory) back. Personal marks: milestone posts for a runner, ring yard for calisthenics, boss statues on the forecourt, guardian animal asleep on the hall steps. Stories: cat on forge roof, water carrier to the fire, kids racing round the fountain, smith with sparks, fisherman, cart, fox at the forest edge. Dense inked wood behind, lone trees in front, thickets not scatter.

## 8. Layout and weight
Layout: Tier 1 reads as a hamlet in part (tent, fire, slab, five villagers) but the cross road is too big for four objects, arms end at the rim, and the lamp post is the tallest object and competes with the tent. Tier 6: a plaza and loop road exist but the left (farm, windmill, sawmill) is a row on the rim, archery and tower line the far edge, a hole sits around the fountain. Tier 12: crowded, forge hides behind the rock spike and hall behind the wall at mini zoom, colosseum and watchtower isolated by an empty strip. No strong focal point; the hall should own it. Correction (isoLayout.json / isoLayout.ts `acces`): (1) shorten tier-1 road to a short T leading to one marked empty plot; (2) make fire-to-Hero-Hall the widest road with an aligned forecourt; (3) group future plots by trade (craft, training, quiet); (4) move the rock spike off the forge front (it is a decor cell, free to move). Only unbuilt or unrevealed plots may move; any built plot moving needs Guillaume's approval.
Weight: causes in order: (1) ground: island pasted on a different flat meadow, no water, cliff foot or texture change, meadow even continues under cliff bands in corner crops; main cause. (2) contact shadows: buildings sit on plinths so inside the island weight is acceptable, the plateau casts almost nothing, and what exists is cut by a hard step. (3) rim: thin, uniform brown/black band, no roots, stones or shadow under it. (4) light: flat day tone and flat night tone, no occlusion between buildings, no ground light under windows. Cheapest fix: a static pre-rendered soft shadow image under the island (opacity baked in the image) plus a one-tile ring of darker wet grass or water at the cliff foot, half a day; then delete the blue leftover and soft-clip the cliff shadow.

## Chief's triage (rules of the plan and Guillaume's choices)
- **Rejected, against Guillaume's choice (31/10)**: the island diorama with a sea ring and a coast (target image, island base with water). Guillaume wants the opposite: no island and no plateau, the ground carrying on past the last buildings with fields, paths and forest, and the edge barely visible. Kept from it: a cliff foot and contact shadows only as long as the island remains, the darker ring at the foot, thickets.
- **Rejected, rule B9 (no empty plot)**: the tier-1 ghost of the next plot. Adapted: a signpost or a pile of stones on the road toward the next building, never an empty plot.
- **Rejected, colour rule**: blue-violet shadows, replaced by the night's neutral blue-black.
- **Quick wins taken in this round**: no birds at night; closer default framing; thinner decor near the village with trees in thickets; a shorter tier-1 lamp post; tier-1 road arms ending on a post or a stone; baked warm light pools at night; trees with the buildings' ink (FIN-DEC, FIN-LUM, FIN-CAR). The shadow seam and the blue leftover are already fixed (to check in qa-audit2).
- **Medium, at most 2 per round**: reveal v2 (FIN-MAG round 1, following section 6) and vocation marks (FIN-VOC). Next round: bigger villagers with their trade prop (FIN-VIL).
- **Big bets, for Guillaume**: the target image to paint (once rewritten as continuous ground), trade districts for future plots, landmarks (statues and crest) readable at the mini zoom.
