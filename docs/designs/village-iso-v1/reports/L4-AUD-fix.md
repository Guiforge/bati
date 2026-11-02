# L4-AUD-fix : corrections I6, I7, mineurs, et tests faibles de L4-T03

Statut proposé : prêt pour revue
Auteur : engineer
Tour de revue : 1

## Fait
- I6 : `constants/isoOrdre.json` (nouveau) porte l'ordre de profondeur. `carteDemo.ts` : `elementsCarte()` construit les éléments et les emprises (linéaire), `ORDRE_CARTE` lit le JSON, plus de `ordreProfondeur` à l'import. `EMPRISES_CARTE` exporté. Test de régénération dans `iso-profondeur-ordre.test.ts` (`UPDATE_ORDRE=1 npx jest iso-profondeur-ordre`), il recalcule et compare.
- I6 : `lisiereAffichee` : table de rangs `RANG` au niveau du module, et `MONTREES` (`lisiereMontree` calculé une fois par île, clé = signature de la grille `visible`). Écart à la consigne : la clé n'est pas le palier seul, car l'île dépend du palier et des bâtiments debout (`etatAvec`). Entrées bornées par les îles rencontrées (commentaire `shortcut:`). Pas de useMemo.
- I7 : `IsoVillage` prend `ambiance` et `biome` (défauts `nuit`, `defaut`), transmis à `IsoCarte` et au dégradé du ciel (`biomes[biome].ciel`). `isoLisiere.json` stocke `famille` et `nom` (plus de `.nuit.webp`) ; `PieceLisiere` a `famille`, `nom` et `cle` (nuit) ; `PieceOuLisiere` résout `clePiece(famille, nom, ambiance)`, `lisiereAffichee` aussi. `cleAnimal(nom, pose, ambiance)` et `<Animal ambiance>`. `lisiereChoix.ts` découpe la clé en famille et nom.
- Mineurs : commentaire d'`Animal` corrigé ; `touche` (horloge.ts) lit `actif` dans une shared value posée par l'effet (test « a touch captured before reduced motion ») ; `mockIsoEvalue` remplacé par un compteur d'accès au export (`mockIsoAcces`), comparé avant/après, indépendant de l'ordre.
- Ajout du chef : I-A (zone du test au palier 3 = `pose().r`, qui exclut l'origine, avec assertion), I-B (test d'`IsoVillage` monté avec croissance et palier 2 imposé via un mock de `useCameraIso`), M1 (commentaire DECODE_ZOOM : palier 3 flou au-dessus de 2,2), M2 (commentaire du 63,4 MiB corrigé).
- Tests ajoutés : `iso-village.test.tsx` (ambiance/biome : arbre identique par défaut et explicite, jour = 0 lisière et 0 animal).

## Preuves
- Coût à l'import (jest/V8, 5 imports de `carteDemo` après `resetModules`, ms) : avant `66 24 18 22 18` (≈ 20 à chaud), après `68 15 15 12 16` (≈ 14). Tri seul retiré (`ordreProfondeur` sur 227 éléments) : `5.0 2.0 3.0 2.0 2.0` ms. Gain faible sur V8 chaud ; à mesurer sous Hermes à froid sur appareil (non fait). Test de mesure jetable, supprimé.
- `npx jest iso- village-scene reduced-motion react-compiler --testPathIgnorePatterns=/node_modules/` : Test Suites: 20 passed, 20 total ; Tests: 259 passed.
- `scripts/iso/team/heavy.sh npx tsc --noEmit` : aucune erreur.
- `npx biome check --error-on-warnings` sur mes fichiers : « No fixes applied », sans erreur.
- `scripts/iso/team/heavy.sh npx jest --testPathIgnorePatterns=/node_modules/` (lu par `rtk proxy`) : `Test Suites: 1 skipped, 427 passed, 427 of 428 total` ; `Tests: 1 skipped, 6292 passed, 6293 total`.
- JSON régénérés : `UPDATE_LISIERE=1 npx jest iso-lisiere`, `UPDATE_ORDRE=1 npx jest iso-profondeur-ordre`.

## Douteux ou non fait
- Pas de mesure Hermes ni sur appareil. Mutation non rejouée pour les tests I-A et `touche`.
- `npm run deadcode` non lancé : `EMPRISES_CARTE` n'est consommé que par le test.
- Flux Maestro non touché.

## Pour la suite
- Toute modification de la grille, des pièces ou de la lisière demande `UPDATE_LISIERE=1` puis `UPDATE_ORDRE=1`, dans cet ordre.
