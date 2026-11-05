# Portes de `check`, 12 paliers, jour (mesurées sur le commit `7cf285987`)

`scripts/layout/portes-tout.sh DOSSIER` (rebuild, puis `portes.sh` par défaut, puis `portes.sh haut=1`). La dernière ligne `GATE FAILED` d'un lancement SOMME les 12 paliers : les tableaux donnent le palier seul.

## Stade par défaut de l'atelier

| Palier | Bâtiments | Occlusion sous 85 % | Pire | Ancrages | Accessoires sous 50 % | Crochets couverts | Tap |
|---|---|---|---|---|---|---|---|
| 1 | 6 | 0 | fountain 99.2 % | 0 | 0 | 0 | 0 |
| 2 | 8 | 0 | archery_range 93.5 % | 0 | 0 | 2 | 0 |
| 3 | 12 | 0 | heroes_hall 87.7 % | 0 | 0 | 3 | 0 |
| 4 | 15 | 0 | heroes_hall 85.8 % | 0 | 0 | 3 | 0 |
| 5 | 17 | 0 | heroes_hall 85.8 % | 0 | 0 | 5 | 0 |
| 6 | 17 | 0 | heroes_hall 85.8 % | 0 | 0 | 4 | 0 |
| 7 | 18 | 0 | heroes_hall 85.7 % | 0 | 0 | 6 | 0 |
| 8 | 20 | 0 | heroes_hall 85.6 % | 0 | 0 | 6 | 0 |
| 9 | 21 | 0 | heroes_hall 85.7 % | 0 | 0 | 7 | 0 |
| 10 | 21 | 0 | heroes_hall 85.7 % | 0 | 0 | 6 | 0 |
| 11 | 21 | 0 | heroes_hall 85.6 % | 0 | 0 | 7 | 0 |
| 12 | 21 | 0 | heroes_hall 85.6 % | 0 | 0 | 7 | 0 |

Somme des 12 paliers : `occlusion 0, anchors 0, props 0, depth 0, hooks 56, tap 0, motion 0`

Palier 12, lignes de détail :

```
GATE occlusion: 0 of 21 buildings under 85.0 % visible; worst first (px = device px covered):
heroes_hall       85.6 %  iso-maquette-campfire 1729px, iso-maquette-forge 299px, iso-habitant-h8 22px
archery_range     87.2 %  iso-pan 566px, iso-accessoire-ratelier_1 482px
campfire          88.0 %  iso-maquette-archery_range 738px
castle_wall       88.4 %  iso-pan 359px, iso-maquette-high_road 5px
fountain          95.1 %  iso-pan 628px
quarry            96.1 %  iso-maquette-training_dummy 717px
forge             96.5 %  iso-maquette-armory 462px, iso-marcheur-smith 121px
wizard_tower      97.0 %  iso-accessoire-menhir_2 185px
GATE hooks: 7 of 21 drawn hook boxes covered (over 1.0 % of their opaque pixels):
```

## Tous les bâtiments à leur plus haut stade (`haut=1`)

| Palier | Bâtiments | Occlusion sous 85 % | Pire | Ancrages | Accessoires sous 50 % | Crochets couverts | Tap |
|---|---|---|---|---|---|---|---|
| 1 | 6 | 0 | heroes_hall 87.9 % | 0 | 0 | 1 | 0 |
| 2 | 8 | 0 | heroes_hall 85.9 % | 0 | 0 | 2 | 0 |
| 3 | 12 | 0 | heroes_hall 85.8 % | 0 | 0 | 6 | 0 |
| 4 | 15 | 0 | heroes_hall 85.8 % | 0 | 0 | 6 | 0 |
| 5 | 17 | 0 | heroes_hall 85.8 % | 0 | 0 | 7 | 0 |
| 6 | 17 | 0 | heroes_hall 85.8 % | 0 | 0 | 7 | 0 |
| 7 | 18 | 0 | heroes_hall 85.7 % | 0 | 0 | 6 | 0 |
| 8 | 20 | 0 | heroes_hall 85.6 % | 0 | 0 | 6 | 0 |
| 9 | 21 | 0 | heroes_hall 85.7 % | 0 | 0 | 7 | 0 |
| 10 | 21 | 0 | heroes_hall 85.7 % | 0 | 0 | 7 | 0 |
| 11 | 21 | 0 | heroes_hall 85.6 % | 0 | 0 | 7 | 0 |
| 12 | 21 | 0 | heroes_hall 85.6 % | 0 | 0 | 7 | 0 |

Somme des 12 paliers : `occlusion 0, anchors 0, props 0, depth 0, hooks 69, tap 0, motion 0`

Palier 12, lignes de détail :

```
GATE occlusion: 0 of 21 buildings under 85.0 % visible; worst first (px = device px covered):
heroes_hall       85.6 %  iso-maquette-campfire 1729px, iso-maquette-forge 299px, iso-habitant-h8 22px
archery_range     87.2 %  iso-pan 566px, iso-accessoire-ratelier_1 482px
campfire          88.0 %  iso-maquette-archery_range 738px
castle_wall       88.4 %  iso-pan 359px, iso-maquette-high_road 5px
fountain          95.1 %  iso-pan 628px
quarry            96.1 %  iso-maquette-training_dummy 717px
forge             96.5 %  iso-maquette-armory 462px, iso-marcheur-smith 121px
wizard_tower      97.0 %  iso-accessoire-menhir_2 185px
GATE hooks: 7 of 21 drawn hook boxes covered (over 1.0 % of their opaque pixels):
```

