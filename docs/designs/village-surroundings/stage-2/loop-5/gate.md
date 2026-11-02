# Porte de l'étape 2, boucle 5 : le terrain refait sur la disposition du jour

01/11/2026, tête 4c890fa8. Recette « terrain seul » de la boucle 4. 2,39 $ (plafond 3 $).

## Pourquoi

Le terrain de la boucle 4 était peint sur l'ancien plan : le cœur usé ne tombait plus sous la nouvelle place, et l'antre et la carrière étaient sur le pré. Il ne couvrait que 696 × 781 dp, alors que l'île finie fait 960 dp et que le cadrage d'ouverture du palier 12 (zoom 0,478) le dépassait d'environ 42 cases. Et il n'avait que 1,3 px par dp, agrandi 3 à 4 fois au palier 1.

## Comment

1. Vidage sur HEAD (`stage-1/stub_rn.mjs`, `dump_monde.mjs`), refait après le déplacement de l'observatoire et du moulin (4c890fa8), puis masques (`stage-1/masques.py`).
2. **Zone couverte** : tout ce que la caméra peut montrer au palier 12 (`monde.ts` `etendue` au zoom plancher, la plus large de tous les paliers), plus 8 dp, soit **1656 × 2152 dp à partir de (−348, −836)**.
3. Aplats à 5 classes (pré, cœur usé, rivière, sous-bois, bordure), adoucis (`terrain5.py aplats`, `aplats_monde.webp`).
4. **Le look** : 4 variantes du cadre d'ouverture du palier 12, à 944 × 1056 px (`heros_planche.webp`, `mesures_heros.json`). 0,19 $.
5. **Les tuiles de la variante retenue** : FLUX 3 Image plafonne à 4,19 MP avec des références et ne prend pas de graine. D'où des tuiles de 2048 px qui se recouvrent, chacune avec ses aplats en image 1 et un échantillon de matière de la variante en image 2, recalées en couleur (moyenne et écart type par canal sur le recouvrement) puis fondues en rampe sur tout le recouvrement.
6. Assombrissement des bords posé une seule fois sur la mosaïque, par la carte de densité de l'étape 1 (jusqu'à 25 % d'ardoise).
7. Découpe pour l'app : 3 × 4 tuiles de 1656 × 1614 px, toutes de la même taille (552 × 538 dp chacune), 3 px par dp.

## Les essais

- **Essai 1, tuile 11, variante entière en image 2** (0,10 $) : FLUX a recopié la composition de la variante au lieu de suivre ses aplats. L'image 2 devient un échantillon de matière.
- **Essai 2, 3 × 4 tuiles sur tout le monde, 3,5 px par dp** (1,20 $) : la tuile 11 est juste, mais les tuiles de pure bordure (rangées du haut et du bas) inventent des prés et des cœurs usés, et l'échantillon (qui montrait le rebord du cœur) fait inventer des cœurs. Avec en plus une rampe de fondu inversée, l'assemblage ne se lit pas. **Rejeté**, gardé dans le cache.
- **Essai 3, retenu** (0,90 $) : FLUX ne peint que la **bande** où le terrain se voit (toutes les rangées qui portent autre chose que la bordure, plus 40 dp), en 3 × 3 tuiles de 2048 px qui se recouvrent de 588 px en largeur et de 958 px en hauteur. L'échantillon ne montre plus que le pré et le sous-bois. Au-delà de la bande et partout où l'aplat dit « bordure » (sous le mur de conifères), le fond est fait en code : les aplats agrandis avec un grain doux, fondus sur 120 px.

## Mesures

| Variante du look | Masque lisible | Rivière (rappel / précision) | Encre | Palette de 9 |
| --- | --- | --- | --- | --- |
| v1 (retenue) | 0,76 | 0,89 / 0,89 | 0 % | 78 % |
| v2 | 0,80 | 0,84 / 0,88 | 0 % | 79 % |
| v3 | 0,58 | 0,84 / 0,74 | 0,4 % | 78 % |
| v4 | 0,68 | 0,78 / 0,69 | 0,2 % | 85 % |

Bande assemblée (`mesures_mosaique.json`) : masque lisible 0,75 ; rivière 0,89 / 0,55 (le voile d'ardoise des bords et une tache bleutée dans le sous-bois à gauche se lisent comme de l'eau) ; encre 1,6 % ; palette de 9 à 88 %.

Résolution : 3 px par dp. Au palier 1 (zoom de démo 1,21, soit 3,2 px d'écran par dp), le terrain est à l'échelle 1:1 ; il était agrandi 2,5 fois avant. Les 12 tuiles pèsent 1,2 Mo en tout (la bordure, unie, se compresse bien).

## Notes

| Ligne | Note | Pourquoi |
| --- | --- | --- |
| Suit le masque | 2 | Le cœur usé est sous la nouvelle place, la rivière est à sa place, les clairières aussi. Masque lisible 0,75. |
| Pas de trait sur le sol | 2 | 1,6 % de pixels sombres, des ombres de pinceau, pas un contour. |
| Palette et lumière | 2 | 88 % dans la palette de 9, centre clair, bords plus sombres posés une seule fois. |
| Rien que du terrain, zones justes | 1 | Ni chemin, ni champ, ni arbre. Mais FLUX éclaircit par endroits le sous-bois en taches orangées, et une tache bleutée sort de la rivière à gauche. Les deux tombent sous les masses de forêt. |
| Pinceau, raccords, composite | 1 | Les composites des paliers 1, 6 et 12 se lisent, le pinceau est net au palier 1. Mais un raccord de tuile reste visible à l'œil, en léger changement de ton vertical (palier 6, aux deux tiers de la largeur). |

**Total 8/10, aucun 0 : la porte passe.**

Composites (vue « Cadrer », terrain recollé depuis les 12 tuiles de l'app, chemins du code en aplats, forêt, bâtiments et accessoires) : `palier1.webp`, `palier6.webp`, `palier12.webp`. Aperçu de la mosaïque : `mosaique_apercu.webp`.

## À savoir

- **Mémoire** : 12 tuiles de 1656 × 1614 px, soit environ 128 Mo décodées en RGBA si toutes sont chargées. Au zoom plancher, presque toutes sont à l'écran. Le drapeau `sol` est éteint par défaut. Avant de l'allumer, il faudra mesurer sur appareil, et sans doute ne monter que les tuiles visibles, ou baisser la résolution de la bordure, qui est unie.
- `stage-5/assets.py` et `stage-5/composite.py` lisent encore l'ancien `sol/terrain.webp` (supprimé) : `stage-2/composite5.py` les remplace pour le terrain.
- `scripts/provenance.json` n'a pas d'entrée pour le terrain (l'étape 5 n'en avait pas ajouté). La provenance de chaque image FLUX est dans `provenance/`.
