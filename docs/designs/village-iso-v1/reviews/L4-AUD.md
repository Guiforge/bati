verdict: fail

Audit du lot 4 (iso-tech-auditor, neuf, modèle du chef), plage 59950086..85a86766. Texte de l'auditeur collé par le chef (sans outil d'écriture chez l'auditeur), mise en forme seulement.

Relancé par l'auditeur : Jest complet vert sous Node 26.12 et 24.19 (`Test Suites: 1 skipped, 427 passed, 427 of 428 total`, `Tests: 1 skipped, 6287 passed`) ; `tsc --noEmit` sortie 0 ; `npm run deadcode` propre hors les deux `@legacy` de `db/bossFights.ts` ; `biome check` 0 erreur ; sha256 des 23 fichiers figés de KNOWLEDGE.md:66-88, `iso_audit.py` et `audit-thresholds.json` égaux. Le code du lot est sain ; l'échec vient d'une preuve périmée sur le critère 4.

## BLOQUANT

B1. La partie Maestro du critère 4 repose sur une preuve antérieure à 4 commits qui changent la carte. `.maestro/iso-batiments.yaml:33` et suivantes tapent des points en px fixes (264,783 ; 674,818 ; 787,863 ; 853,656), « à remesurer si un sprite ou le cadrage change » (l.24-26). Dernier passage : L4-T05 (019aa654). Depuis : b7fbc637 (ailes et vague au focus), 7ef9c7ae (carte sur toute la hauteur, `margeBas`), 9c3c10ff (lisière), 85a86766 (animaux, `poseCentre`). Aucun rapport qa après L4-T05 ne relance le flux. Correction : relancer le flux sur un `.perf` de HEAD, remesurer un point qui rate, attendre 20 s après le passage en mode Village si la vague rend instable, coller date et sha.

## IMPORTANTS

I1. L4-T03 commitée sans revue du tour 2 : `reviews/L4-T03.md` ne contient que le tour 1 (fail B1). La correction est dans le code (IsoCroissance dans le Provider, `ancre` passé à `Planche`). Correction : revue neuve du diff e40a6cb5.
I2. Texte brut des relecteurs de code toujours condensé (L3-AUD I7 partiel) ; les revues d'écran gardent le JSON brut. Correction : coller la sortie brute sous la synthèse.
I3. Glissé de carte à 7,89 % contre 2,84 % (+5,05 points pour +5) : BOARD:L4-T01 dit « fait » alors que la seule mesure rate le seuil. Verdict reporté au téléphone par Guillaume ; à écrire tel quel à la porte.
I4. Maquettes dans le bundle (H1-8, DECISIONS:55 et :61) non traité, chiffres périmés : 96 webp pour 2 047 202 o (9 animaux, 17 Ko), `maquettes.ts` 570 298 o (contre « 191 Ko » à DECISIONS:61), `isoLisiere.json` 20 Ko, 19 sprites peints 1,41 Mo ; tout dans le bundle (`VillageScene` → `IsoVillageLazy` → `require`). Correction : mettre à jour les chiffres, garder « à sortir avant toute fusion ».
I5. Lancement toujours pas réglé (L3-AUD I9) : STATE.md:3 « en attente », fichiers figés, `.claude/agents/`, `scripts/iso/team/` non suivis. Correction : commit de lancement par Guillaume.
I6. Froid non re-mesuré après la lisière : `ORDRE_CARTE` (`carteDemo.ts:310`) calculé à l'import avec `ordreProfondeur` n², +156 éléments de lisière et 3 animaux ; `lisiereAffichee` (`carteDemo.ts:464`) reconstruit une Map sur tout `ORDRE_CARTE` et refait `anneau` pour 156 pièces à chaque rendu. Correction : précalculer l'ordre (JSON), mesurer le froid à la reprise de la perf.
I7. §7 : ambiance et biome ne vont pas jusqu'à l'écran. `IsoVillage` sans props `ambiance` ni `biome` ; ciel en dur `biomes.defaut` (`IsoVillage.tsx:147`) ; clés de lisière figées en `.nuit.webp` dans `isoLisiere.json` ; animaux par `clePiece(..., ambiance = "nuit")` (`pieces.ts:18`). Correction : props sur `IsoVillage` jusqu'à `IsoCarte` et au dégradé ; clé de lisière sans ambiance résolue par `clePiece(famille, nom, ambiance)` ; `ambiance` passée à `cleAnimal`.

## MINEURS

- `IsoCarteDemo.tsx:590` : commentaire faux, `IsoVillage` fournit toujours `HorlogeContext`, donc les 3 poses de chaque animal sont montées même en mouvement réduit (effet visuel juste).
- `horloge.ts:85-92` : le worklet `touche` lit `actif` tel qu'au rendu ; si le mouvement réduit s'active carte montée, l'ancien `touche` peut rester jusqu'au rendu suivant.
- `mockIsoEvalue` dépend de l'ordre des tests (`__tests__/village-scene.test.tsx:57,199`), mineur de L3-AUD non traité.
- Production modifiée par L4-T10 (`VillageLists.tsx:133`, `:297`) : à dire à la porte.
- Plafond FLUX non écrit par Guillaume (`ceiling_source: "default 40 (no BUDGET_FLUX_V1 line in VALIDATIONS.md)"`).
- Fichiers non commités : cinq `.sh` jetables de qa, `anim_sheets.py` jamais relu, `evidence/L4-T03/` partielle, `evidence/L4-T02/maestro/debug1/`. Sûreté : rien de dangereux trouvé.

## Points de L3-AUD

B1 traité au lot 3. I1 partiel (verrou remplacé par `block`, 8,30 → 7,89 %). I2 traité sur émulateur (1 112 → 792 vues). I3 traité en code, non mesuré. I4 non traité (useImage écarté, aucune mesure). I5 traité au lot 3. I6 partiel (titre et blason font défiler la page). I7 partiel. I8 Jest traité, Maestro périmé (B1). I9 non traité. Mineurs : `animatedProps` drapeau éteint traité ; accessibilité traitée ; `mockIsoEvalue` non traité ; « nuit » en dur partiel (I7).

Drapeau éteint : `PageScroll` reste `Animated.ScrollView`, `onGestureUpdate_…={undefined}` sans effet ; équivalent, pas identique octet pour octet ; `VillageLists.tsx` change en production (L4-T10). Animations : transform et opacity seulement, une horloge bornée, annulée au démontage, coupée hors focus et en mouvement réduit. Règle des pourcentages : rien de nouveau.

## Budget FLUX

`real` 2,008 $ (somme des `cost` des 53 lots), `by_balance` 1,923 $, plafond 40 $ par défaut. Lot 4 : 0,297 $ (L4-T12). Reprise de L4-T12 : 0,099 $ par tentative, 0,30 $ pour 3 ; 0 $ pour une flamme dessinée par l'app. Projection V1 : environ 5,5 à 7 $.

## Lecture des blocages

L4-T12 : lecture du chef juste ; lever par des blockouts Blender (flamme, panache, bannière sans hampe) ou une flamme dessinée par l'app ; dans les deux cas, points d'accroche `foyer` et `mat` à ajouter aux générateurs. À décider par Guillaume.
Revue d'écran de L4-T11 : juste en partie ; lever par la peinture de la lisière et des bâtiments du cadrage, ou HUMAN dans VALIDATIONS. L'item 28 (icônes de production cyan et violette) n'est porté par aucune carte.

## Non mesuré, à faire sur le Fairphone avant toute fusion

1. Critère 5 : `perf.sh` sur 85a86766 ; glissé de carte en mode Village (7,89 % sur l'émulateur, hors seuil) ; pan au palier 12 aux zooms 0,6 et Cadrer ; rien de mesuré depuis L4-T03.
2. Critère 7 : PSS au palier 12 contre le témoin (+80 Mo) ; marge de 9 Mo avant L4-T03 et la lisière ; 3 allers-retours de zoom.
3. Froid de `bati://village` en iso après la lisière.
4. Critère 6 pendant et après une vague avec ailes, reflets et animaux : 0 image 10 s après, dump en moins de 3 s.
5. Coût d'une vague sur le fil UI (environ 30 reflets, ailes, 9 poses).

## Liste pour Guillaume à la porte de fin de lot 4

1. `scripts/iso/perf.sh <serial>` sur le Fairphone (veille à 2 min ou plus) : glissé contre le témoin, PSS au palier 12, mémoire sur 3 allers-retours de zoom.
2. Onglet Village en iso : glisser depuis le titre ou le blason (la page défile), depuis la carte (la carte bouge) ; la zone vide de la rangée du titre laissée à la carte est-elle acceptable ?
3. Taper moulin, forge, carrière, tour du mage : la bonne fiche ; un tap dans le vide, sur un animal ou un arbre de lisière n'ouvre rien.
4. À l'ouverture, une vague de 15 à 20 s puis plus rien ; en mouvement réduit, rien ne bouge.
5. TalkBack : la carte est sautée, chaque ligne dit « nom, rang », le libellé de production a changé (L4-T10).
6. L4-T12 : blockouts Blender (~0,30 $) ou flamme dessinée par l'app (0 $).
7. En-tête iso maquette contre peinture : avancer la peinture de la lisière et des bâtiments du cadrage, ou HUMAN dans VALIDATIONS.md.
8. Commit de lancement, ligne `BUDGET_FLUX_V1`, et maquettes (2,05 Mo + index 570 Ko) hors du bundle avant la fusion.

Non vérifié par l'auditeur : build, émulateur, Maestro, TalkBack réel ; coût à l'import d'`ORDRE_CARTE` (estimation) ; les 600 rendus des animaux (poids seulement) ; mise à jour de la config RNGH 3 quand `touche` change ; les planches L4-T12.
