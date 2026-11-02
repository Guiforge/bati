# Porte de l'étape 2, boucle 1

01/11/2026. Sol peint du palier 12, FLUX 3 Image, 4 variantes, 0,192 $.

## Comment c'est fait

`gen_sol.py` recadre le masque du palier 12 (`stage-1/loop-2`) sur ce que la caméra montre au palier 12 (cadrage « Cadrer », 696 × 781 dp du monde, rectangle dans `cadre.json`) et le peint en aplats, une couleur par classe de sol (`blockout_palier12.png` dans le cache). Les bâtiments deviennent de la terre battue, la forêt un sous-bois : seul le sol est peint. FLUX 3 Image reçoit 2 références (ces aplats, puis l'ancre jour en humeur), 896 × 1008 px. Le prompt est le sujet « repeins chaque zone à sa place » plus le bloc de la bible en variante « sol peint » (sans contour, sans fond magenta, l'image remplit le cadre). Les 4 variantes ne changent qu'une phrase :
- v1 : rien de plus ;
- v2 : touches larges, peu de détails ;
- v3 : touches fines, touffes, cailloux, ornières ;
- v4 : taches de lumière et d'ombre de nuages.

Planche : `planche.webp` (aplats puis v1 à v4). Pleine taille : `sol_v1.webp` à `sol_v4.webp`. Originaux et provenance : `~/.cache/bati-art-loop/iso/surroundings/stage2/loop-1/`.

## Mesures (`mesures.json`, `mesure_sol.py`)

| | v1 | v2 | v3 | v4 |
| --- | --- | --- | --- | --- |
| Masque lisible (pixels plus proches de leur classe) | 0,61 | 0,79 | 0,56 | 0,48 |
| Chemins, rappel / précision | 0,68 / 0,80 | 0,66 / 0,84 | 0,41 / 0,54 | 0,64 / 0,67 |
| Encre (luminance < 45) | 1,9 % | 0 % | 2,4 % | 3,3 % |
| Dans la palette (écart < 40) | 74 % | 63 % | 71 % | 74 % |
| Luminance centre / bord | 127 / 90 | 130 / 93 | 134 / 91 | 139 / 81 |

## Grille de l'étape 2

Le pipeline ne la chiffre pas ; la voici. Seuil : aucun 0, total ≥ 8/10.

| Ligne | v1 | v2 | v3 | v4 |
| --- | --- | --- | --- | --- |
| Suit le masque à l'angle du jeu | 1 | 2 | 1 | 0 |
| Pas de trait d'encre sur le sol | 2 | 2 | 2 | 1 |
| Palette et lumière (centre clair, bords plus sombres) | 2 | 1 | 2 | 1 |
| Rien que du sol, chaque zone lue juste | 1 | 1 | 1 | 0 |
| Pinceau et raccords | 1 | 1 | 1 | 1 |
| **Total** | **7** | **7** | **7** | **3** |

**La porte ne passe pas (meilleur total 7/10).**

Ce qui va : la géométrie est tenue, les chemins, la rivière et les champs tombent à leur place. Le pinceau a la main de l'ancre, et le centre est plus clair que les bords sans qu'on le force (127 contre 90).

Les deux pires lignes, à corriger dans la boucle 2 :
1. **Zones mal lues.** Les emprises des bâtiments sont peintes en planches labourées (sillons) au lieu de terre battue, et l'anneau de désordre en bandes de culture. La forêt, qui devait rester un sol de sous-bois, est peinte en arbres vus de haut (c'est l'étape 3) ; v4 ajoute en plus des ombres d'arbres. Correctif : renommer les aplats dans le prompt (« bare packed earth, flat, no furrows » pour les emprises, « trampled grass » pour le désordre) et donner au sous-bois une couleur moins proche d'un feuillage.
2. **Bords en escalier.** Le masque est à 1 px par dp et agrandi au plus proche : FLUX recopie les marches de pixels, bien visibles entre le pré et la forêt (v1, en haut et en bas). Correctif : adoucir les aplats avant l'envoi (flou de 3 à 4 px puis aplats remis), sans toucher aux zones.

Note pour plus tard : à 896 × 1008 px pour 696 × 781 dp de carte, le sol a 1,3 px par dp. Au zoom maximum du jeu, un dp de carte fait 2,67 dp d'écran, soit 7 px sur un téléphone de densité 2,6 : il manque un facteur 5. Il faudra une sortie 2K ou 4K (natifs chez FLUX 3 Image) ou des tuiles à l'étape 5.
