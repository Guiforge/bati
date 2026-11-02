# AUDIT-DA lot 6 (12, 20, 24, 33, 36, 39)

What draws each defect, and what changed. Nothing permanent was added: everything stays in the waves, reduced motion and the frozen mode show the same rest poses as before (the new pop is never mounted with reduced motion).

| # | Drawn by | Change |
|---|---|---|
| 12 | `FeuxDessines.tsx` `Volute` (campfire plume, source above its flame; `feux.ts` `fumee`, `VOLUTE`), a translucent grey puff (opacity 0.6, ink at 0.55) | Puff 18 to 26 dp, opacity 0.9, ink stroke 4.5 at 0.95, an inked curl inside the lobes (`BOUCLE`). The tent has no chimney: the cloud before it is the campfire's smoke. |
| 33 | `petitsDetails.tsx` `Oiseaux` (flock V of `vivant.ts` `corbeau`) | Drawn box 92 x 44 shown 1.5 times larger by `viewBox` (`VOL_L`, `VOL_H` now derived), rim 1.3. No ground shadow: the flock flies in the frame band over the forest, outside the camera layer, and polish says a shadow shrinks and fades as the body rises (`village-iso-polish/README.md`, shadow bug). |
| 36 | The yellow oval is `Reclame.tsx` `Lueur` (ready-to-evolve glow, `resourceGold` ellipse) that stayed mounted over the site of the very building growing. The site dust (`Chantier.tsx` `Poussiere`, blows) already existed. | `IsoVillage.tsx` `sansChantier`: a building in the growth scene gets no ready glow. New `PopFin` (`Chantier.tsx`, `chantier.ts` `pop`, `POP_MS` 520 ms) mounted in `IsoCroissance.tsx`: one inked volute at the foot as the new stage appears, one node (family `croissance`, testID `iso-poussiere-pop-<code>`). |
| 39 | Not a node: the standing stone of the painted `campfire/rough.nuit.webp` (saturated blue, the known drift) | New `Retouches.tsx`: three static polygons (lit, mid, shaded face) of warm stone at 0.65 over the block, in sprite px, three new tokens `isoPierreChaude*` in `rawColors.ts`. Checked on a PIL preview. A real repaint stays with lot 7. |
| 24 | `CorbeauxToits.tsx` (perched crow `POSE_*`, flight `VOL_CORBEAU_*`; geometry in `corbeaux.ts`) | 1.4 times larger by `viewBox`. Perched: `OmbreContact` at its feet on the ridge. Flying: no shadow (as 33). |
| 20 | Decor pieces `decor/rochers_a|b` (painted sprites) drawn by `IsoCarteDemo.tsx` `Piece` | `Planche` takes `teinte` (tintColor); `AssombriRochers` stacks the rock's own silhouette in `isoInk` at 0.35 over it (same trick as `Statue.tsx`). Island rocks only, not the faded lisiere. |

## Budget
- Animated nodes: worst case 62 of 64 (the two growths each add a pop, +2; `iso-ciel` constants raised by 2 with the reason in comments). 8 families unchanged (`iso-poussiere-` already in `croissance`, `iso-familles` green). Nothing added at rest.
- Cost to know: +1 image per island rock (1 at palier 1, 6 at palier 12, `iso-dev-screen` counts 21 and 111, were 20 and 105). Static, same bitmap.

## Checks
- `npx jest iso- village-scene --testPathIgnorePatterns=/node_modules/`: 57 suites, 623 pass (plus `iso-chantier`: 12 pass after the added `pop` test).
- `scripts/iso/team/heavy.sh npx tsc --noEmit`: clean.
- `npx biome check --error-on-warnings` on `components/village/iso`, `constants/rawColors.ts` and the 4 touched tests: clean.
- Tests touched: `iso-ciel` (+2 budget, pop mounted at the end of a site), `iso-dev-screen` (image counts), `iso-petits-details` (flock exit tolerance 15 dp, the box is wider), `iso-chantier` (+ pop).

## For qa (not checked on a device)
Film at 30 i/s: growth (no yellow oval, pop at the end), cold open (bigger inked smoke and crows), palier 1 close-up (campfire stone), tier 12 rocks night and day. Check the Retouches polygons align with the stone and that rock darkening reads as shade, not a stain.

## Review additions
- T26 has one node of margin left: the worst case is 62 of 64, and a 4th walker adds its shadow, 63 of 64.
- New tests: `iso-retouches` (campfire_rough sprite must stay 512 x 768, polygons in range; the message says to redo the polygons), `iso-ciel` "reduced motion or the frozen mode" (no site, dust or pop mounted). Data moved to `retouches.ts`. Final: 58 suites, 626 pass; tsc and biome clean.
