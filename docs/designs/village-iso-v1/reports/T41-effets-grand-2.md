# T41-effets-grand-2 : correctifs du décor de dernier stade + fumées désynchronisées

## Changements
- effets.ts : ancres `porte` (accroche `porte` de isoAccroches.json, repaire) et `bassin` (centre de l'emprise depuis `s.anchor` + `spec.S`, relevé de ZBASSIN = 0,48 u, mesuré sur fountain/solid : 113 px). `boiteEffet` retombe sur le sommet du masque sans donnée. Décor refait : jet de fontaine (colonne + deux arcs + gouttes, isoEauVive), yeux du repaire en amandes crème (isoEclat, distincts des braises isoLueur) centrés sur la porte, fumée du repaire en `isoCendreClaire` (nouvelle couleur dans rawColors, pas de violet), faisceau de l'observatoire repris à la fente (base sous la pointe), orbe de la tour posé sur la pointe. Montée du groupe au dernier stade par genre (braise 8, runes 10, gouttes 3, étoile 6 dp).
- feux.ts / FeuxDessines.tsx : trois sortes de fumée (`ronde`, `fine`, `volute` qui se penche), `plume(code)` tire par graine, pour chaque cheminée, la sorte, la période (`fois` montées par cycle de 5 s, diviseurs entiers donc rien au repos) et l'attente (`phase`) de ses deux fumées ; les deux ont toujours des `fois` différents. Même graine, même ciel (pas de jour : le ciel ne dépend que du code). Aucun nœud animé de plus (2 par panache comme avant), mêmes boîtes et testID.
- Dessin Svg seulement, pas d'image.

## Tests
- iso-accroches : repos de toutes les fumées de tous les bâtiments ; nouveau test « fumées voisines » (phases et périodes distinctes dans un panache, déterministe, 3 sortes, deux fumées de même période à plus de 20 ms d'écart dans tout le village).
- iso-effets : ancrage fontaine (pied du jet sur le centre du bassin, loin du lampadaire) et repaire (sur la porte), yeux et fumée du repaire, montées.
- `scripts/iso/team/heavy.sh rtk proxy npx jest iso-accroches iso-effets iso-feux iso-perf` : 4 suites, 38 tests verts (iso-perf-compteur non modifié).
- Jest `iso- village-scene` complet : `Test Suites: 3 failed, 71 passed` ; les 3 (iso-village, iso-dev-screen, iso-monde) portent sur les bornes de caméra et les nœuds du monde, fichiers de l'autre ingénieur, aucun ne touche feux ni effets.
- `tsc --noEmit` : propre. `biome check --write` sur mes fichiers : propre.

## À vérifier par qa
Fontaine (jet sur le bassin), repaire (yeux, cendre visibles sur la roche), observatoire et tour (faisceau/orbe près de la pointe), fumées des cheminées et du feu de camp désynchronisées, rien au repos. Les formes Svg des fumées fine et volute ne sont pas vues à l'écran.

## Pour le chef d'équipe
Aucune ligne à ajouter dans IsoCarteDemo.tsx.

## Relecture (mise à jour)
- Le test des 20 ms est remplacé : tous les panaches du village au palier 12 (5 bâtiments qui fument, 10 fumées), cycle échantillonné tous les 50 ms, fumées à plus de 80 % du pic ensemble, et écart des sommets de deux panaches voisins (empreintes à une case) d'au moins 200 ms. Mesure : **pire cas 2 fumées au pic au même instant** ; sommets voisins les plus proches : 238 ms.
- Le tirage a été corrigé, pas le seuil : un panache monte une fois par cycle et l'autre deux fois (la graine dit lequel), les attentes sont posées l'une après l'autre en écartant au maximum les sommets de ceux déjà placés (`PLUMES` dans feux.ts). Les montées sont plus courtes (durées 0,2 à 0,22 du sous-cycle).
- Commentaires `shortcut:` ajoutés (période de 5 s, ZBASSIN/centreBassin, coordonnées à la main du décor et MONTEE_GRAND).
- `constants/rawColors.ts` : seule ma ligne `isoCendreClaire` y est ; les couleurs de route ne sont pas à moi.
- iso-accroches, iso-effets, iso-feux, iso-perf : 4 suites, 38 tests verts ; tsc et biome propres.
