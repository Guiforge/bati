# T43 round 1, quick wins (code only)

## Done
1. Birds: `vieParAmbiance.oiseaux` (nuit false, jour true) in isoSpec.json and `VieAmbiance`; `Oiseaux` (petitsDetails.tsx) takes `ambiance` and renders nothing at night (IsoVillage passes `lumiere`). Roof crows unchanged. One animated node less at night (rest map 43 -> 42).
2. Framing: `cadrage` is now 1.5x closer (`PROXIMITE_CADRAGE`, tier 6 opens at 0.875, was 0.58); `cadrageComplet` is the old whole-island fit and feeds the zoom floor via `limitesDe` in useCameraIso. dev-iso "Cadrer" gets it through `cadrage`.
3. Decor: lisiere now 3 groves (`BOSQUETS`, radius 3.2) and a thin scatter (0.12); 156 pieces -> 74, regenerated isoLisiere.json and isoOrdre.json. World forest rings untouched (already few near, dense far).
4. Tier 1: lamp post drawn at 0.6 (`ECHELLE_LANTERNE_POSE`, via `reduitPiece`, shadow and day glass cover follow). Street arms end on an inked stone (`bornesDeRue`/`bornePath`, one Path in each ground tile's existing Svg, none once the island is whole).
5. Night pools: `lueurs.ts`, two flat Paths (alpha baked in `isoLueurSol`, `isoLueurSolCoeur`, amber) in the ground tile Svg, only when `vieDe(lumiere).lueurFeux`; nothing by day, nothing animated.
6. Sea: `ECART_RIVE` 240 -> 560, shore column 4 -> 5. Out of reach of the whole island, glimpsed at a hamlet.
7. Not done: world trees are baked images (mondeTuiles, decor/arbre_a). A thicker ink needs a repaint or an extra tinted image per tree (breaks the opacity/size ratchets). Noted for the repaint (FIN-CAR).
+ Coordinator add-on: fireflies zone moved to gx 5-9, gy 0-3 (north of the druid grove, off every footprint), test added.

## Files
Code: isoSpec.ts, IsoVillage.tsx (import + `ambiance` prop only), petitsDetails.tsx, carteDemo.ts, useCameraIso.ts, lisiereChoix.ts, monde.ts, rues.ts, RuesDessinees.tsx, lueurs.ts (new), rawColors.ts, constants isoSpec/isoLayout/isoLisiere/isoOrdre.json.
IsoCarteDemo.tsx (named, as allowed): lantern `reduit` + glass cover transform, `flaques` prop to `Tuile` and two Paths, one `flaquesDe` call.

## Tests
New `__tests__/iso-t43-quickwins.test.ts` (groves, lantern, stones, pools, sea, fireflies), plus framing test in iso-camera-ile, bird test in iso-village. Updated to the new numbers: iso-camera, iso-dev-screen (images 35/134 -> 18/109, sea only at tier 1), iso-ciel (rest 42), iso-familles (no flock at night), iso-monde, iso-profondeur-ordre (>100), iso-petits-details, iso-village. `iso-perf-compteur.test.tsx` untouched and green.

## Commands
- `heavy.sh rtk proxy npx jest iso- village-scene --testPathIgnorePatterns=/node_modules/`: 79 suites, 833 tests pass (last run before the final two petits-details edits; those two suites re-run green).
- `heavy.sh npx tsc --noEmit`: clean. `npx biome check --write` on my files: clean.

## Perf counter
Test green under its ceilings (opacity <= 55, sizes <= 20, Svg <= 95, nodes <= 1024). I did not print before/after numbers. Svg count unchanged by construction (all new drawing is Path inside existing tile Svgs); fewer lisiere images lowers node count.

## Risks
Pools and stones are not seen on a device. The 1.5x framing makes tier 12 open on a cropped island (0.59). dev-iso's "Cadrer" now matches the game.
