# Audit des alentours, 04/11/2026

Étape 1 de GROWTH, sur `feat/village-iso` à `02ca5c467`. Le constat de Guillaume est juste : **du palier 4 au palier 12, les alentours sont le même dessin.**

Images : `img/avant-strip-jour.jpg`, `img/avant-strip-nuit.jpg` (cadrage par défaut). Même caméra pour tous les paliers : `scripts/growth/renders.py` (`foyer=campfire&zoom=0.45`).

## Ce qui change vraiment, mesuré

Écart moyen entre deux paliers voisins, en niveaux sur 255, même caméra, hors de l'île :

| Zone | 1>2 | 2>3 | 3>4 | 4>5 | 5>6 | 6>7 | 7>8 | 8>9 | 9>10 | 10>11 | 11>12 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Nord | 4,6 | 1,6 | 0,3 | 1,4 | 0,3 | 0,4 | 0,2 | 0,3 | 1,3 | 0,5 | 1,3 |
| Sud | 1,1 | 0,2 | **11,2** | 0,7 | 0,3 | 0,4 | 0,2 | 0,8 | 0,9 | 0,4 | 0,2 |
| Ouest | 1,4 | 1,8 | 0,4 | 0,4 | 0,1 | 3,8 | 0,2 | 0,6 | 0,3 | 0,1 | 2,2 |
| Est | 6,7 | 5,4 | 5,9 | 0,5 | 6,8 | 0,3 | 1,8 | 7,1 | 1,9 | 0,6 | 0,4 |

Un seul vrai saut, au sud du palier 3 au palier 4 : le coin arrive d'un coup. Les chiffres de l'est et de l'ouest sont l'île et la clairière qui s'élargissent, avec la forêt qui recule : pas une pièce nouvelle.

## Chaque pièce et ses paliers

| Pièce | Où | Paliers | Comment | Note |
|---|---|---|---|---|
| Blé, potager et puits, pâture, 2 chaumières, route sud | Coin sud | Dès 4, tout d'un coup | Cuit, bande `t4-6` (une seule entrée, `loupes/bc/r6/stamps.json`) | Verrouillé. Rien aux bandes `t7-9` et `t10-12` : elles n'existent pas |
| Charrette sur la route | Coin sud | Dès 4 | Accessoire `hors` | |
| Forêt : anneau, bordure, lisière sud | Tout autour | 1 à 12 | Sprites, `massesForet` | L'anneau recule avec l'île. Lisière sud et bordure identiques partout |
| Champs du plan `[3,14] [0,16] [3,17]` | Sur l'île | 7 à 9, dès que leurs cases sont là | Tuiles, `tuilesChamps` | Les seuls champs ajoutés, et dans l'île |
| Terre, pré, rivière | Partout | 1 à 12 | Tuiles `terrain_*` | Le même dessin à tous les paliers |
| Traces sombres en polygones | Sud au palier 1 à 3, nord et est partout | 1 à 12 | Dans la peinture du sol | Voir défauts |
| Sentier vers le sud | Sud | 1 à 3 | Dans la peinture du sol | Disparaît sous le coin au palier 4, sans le préparer |
| Route haute à l'est, `poteau_indicateur_1` | Est | Dès 8 | Bâtiment et accessoire | Finit en quelques mètres |
| Pêcheur, sieste, renard, charrette cassée | Sur l'île | 2 à 10 | Accessoires | Île, pas alentours |

Aucun hameau, aucune ferme hors du coin, aucune route au nord. Les rues (`rues.ts`) changent de rang avec la distance au feu, **jamais avec le palier**.

## La nuit

Une seule couleur hors du coeur : le voile bleu descend sur tout, et aucune fenêtre ne s'allume dans les alentours à aucun palier. Les chaumières du coin restent noires. Les seules fenêtres du jeu passent par `veilleuses.ts`, deux bâtiments à la fois, sur l'île. La nuit du palier 4 et celle du palier 12 sont les mêmes alentours.

## Défauts vus en passant (pas de cette piste, ou pas ce soir)

- Palier 1 à 3 : au sud, deux grands polygones sombres à bords nets, comme un sol pas fini. Ils tombent à 4 avec le coin. La règle 3 demande un palier 1 presque nu, pas ça.
- Au recul : un bloc sombre à bords droits sous la route sud (`render --tier 12 --query 'foyer=campfire&zoom=0.45'`, en bas), un bord rectangulaire de sol peint à gauche du coin, le sol bruité autour du losange (déjà dans `direction/handoff.md`).
- Le palier 8 et plus : la route haute s'arrête net.

## Ce qu'il faut réparer, dans l'ordre

1. Rien ne se passe après le palier 4 : rien de nouveau à voir à 7, 10 et 12 hors des murs.
2. Le saut du palier 4 : le coin tombe d'un coup, sans annonce entre 1 et 3.
3. La nuit : aucune fenêtre hors de l'île.
4. Aucune route ne mène nulle part : le nord est vide, la route haute s'arrête.
