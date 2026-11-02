# L5-AUD-fix : corrections de l'audit du lot 5

verdict: prêt pour revue

## Fait
- B1 : cause = le plan des marcheurs dépend du moment où la vague démarre après le montage (horloge, `Date.now()`), donc de l'instant du cliché. Pas de défaut de rendu : deux plans différents ne naissent que de deux instants différents. Le test « same tree » passe en mouvement réduit (pas de vague), il porte sur l'ambiance et le biome.
- I1 : `IsoVillage` n'anime que les 2 premières croissances (`CROISSANCES_MAX`). Les autres montrent leur nouveau stade tout de suite, sans animation, et ne sont pas rejouées à la visite suivante. Pire cas mesuré : 64 (tente + puits, ni feu ni animaux masqués), la ferme ajoute 0 (ses animaux se cachent). Le « 68 » de l'audit était calculé, pas mesuré. Test ajouté dans `iso-ciel.test.tsx`.
- Garde des worklets : `__tests__/iso-worklets.test.tsx` (IsoVillage palier 12 avec vague, écran dev-iso). Liste blanche : `scheduleOnRN`, `lancer`, `poser`, `poserDetail`. Vérifié : sans `"worklet"` sur `lune` (cielAstres.ts), 2 tests rouges (`lune` nommée) ; rétabli.
- I6 : `vieParAmbiance` dans isoSpec.json (`vieDe`), lue par `Ciel` (lune, étoiles), `Lucioles` et `Feux` (flammes ; la fumée reste). `lieux` (lucioles, rat) dans isoLayout.json, lu par vivant.ts. Tests : « jour : ni lune ni lucioles » (iso-village), lieux (iso-petits-details).

## Non fait
- Les corbeaux (`Oiseaux`) et le rat ne lisent pas encore l'ambiance (non demandé).

## Commandes
- `npx jest iso- village-scene reduced-motion react-compiler --testPathIgnorePatterns=/node_modules/ --maxWorkers=2` : 30 suites, 357 tests verts.
- `scripts/iso/team/heavy.sh npx tsc --noEmit` : aucune sortie d'erreur.
- `npx biome check` sur mes fichiers : propre.
- `scripts/iso/team/heavy.sh npx jest --testPathIgnorePatterns=/node_modules/` : `Test Suites: 1 skipped, 437 passed, 437 of 438 total`, `Tests: 1 skipped, 6390 passed, 6391 total`.

## Revue d'écran, item 28 : aplats francs
- Lueur sous les flammes (FeuxDessines.tsx) : trois ellipses à bord dur, sans dégradé, mêmes tokens (`lueur`), rayons 1 / 0,68 / 0,36 et opacités 0,07 / 0,07 / 0,08 (elles se cumulent : 0,07, 0,14, 0,22).
- Lucioles (petitsDetails.tsx) : halo retiré (plus de `stroke`), points nets.
- Ombre des villageois (IsoCarteDemo.tsx) : vraie ellipse SVG de 0,56 x 0,14 COTE (4 pour 1, avant 2,5 pour 1), même couleur et même opacité que l'ombre de socle (`isoSocleShadow`).
- ImageMagick : les trois bandes rendues à la géométrie du code donnent trois paliers plats à bord net (image lue) ; l'ombre est un ovale plat 4 pour 1. Pas de mesure sur appareil.
- Checks : jest ciblé 30 suites / 357 tests verts ; tsc sans sortie d'erreur ; biome propre (infos seules). Suite complète non relancée après ce lot.
