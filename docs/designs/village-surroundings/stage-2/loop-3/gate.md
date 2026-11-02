# Porte de l'étape 2, boucle 3 (dernière)

01/11/2026. Même grille. FLUX 3 Image, 4 variantes, 0,192 $.

## Ce qui change depuis la boucle 2

- Le désordre sort du sol peint, il est peint en pré : c'est la zone des accessoires de l'étape 4, pas un sol à part.
- Les emprises deviennent des taches de terre battue arrondies : masque flouté de 12 px puis seuillé à 110. Elles sont un peu plus petites que l'emprise réelle, ce qui ne gêne pas puisque le sprite du bâtiment les couvre.
- Le prompt interdit les lignes dessinées au sol (« no contour around the river, the paths or the patches »).

## Mesures (`mesures.json`)

| | v1 | v2 | v3 | v4 |
| --- | --- | --- | --- | --- |
| Masque lisible | 0,72 | 0,73 | 0,72 | 0,70 |
| Chemins, rappel / précision | 0,77 / 0,76 | **0,89 / 0,91** | 0,81 / 0,77 | 0,89 / 0,92 |
| Encre | 0 % | 0,2 % | 0 % | 0,2 % |
| Dans la palette de 8 | 52 % | 52 % | 55 % | 62 % |
| Luminance centre / bord | 139 / 104 | 146 / 101 | 148 / 99 | 144 / 93 |

La palette de 8 ne contient pas le vert du pré (`#6A7442`, jeton `isoPreSec` du jeu, donné comme aplat). Le pré est la plus grande zone : c'est surtout lui qui fait tomber ce chiffre.

## Notes

| Ligne | v1 | v2 | v3 | v4 |
| --- | --- | --- | --- | --- |
| Suit le masque | 1 | 2 | 1 | 2 |
| Pas de trait sur le sol | 2 | 1 | 2 | 1 |
| Palette et lumière | 1 | 1 | 1 | 2 |
| Rien que du sol, zones justes | 0 | 1 | 1 | 0 |
| Pinceau et raccords | 2 | 2 | 1 | 2 |
| **Total** | **6 (un 0)** | **7** | **6** | **7 (un 0)** |

**La porte ne passe pas, et c'était la dernière boucle : arrêt, la décision revient à Guillaume (point de contrôle de l'étape 2).**

## Le sol retenu : v2

`sol_v2.webp` (original `~/.cache/bati-art-loop/iso/surroundings/stage2/loop-3/sol_v2.png`, provenance `sol_v2.provenance.json`).

Pourquoi v2 :
- Elle tient le mieux les chemins (0,89 / 0,91) avec v4, et c'est elle qui a le centre le plus clair par rapport aux bords (146 contre 101).
- Le sous-bois est nu, comme demandé : pas un arbre.
- Le désordre a disparu, et 15 taches de terre sur 18 sont lisses. Le pinceau reste large et calme, sans marche.

Ce qui lui manque pour passer :
- 3 taches restent labourées (deux à gauche, une en bas).
- Un fin pointillé sombre borde les chemins, les taches et la rivière.
- Le pré tire au vert olive.

Les variantes écartées :
- **v1** : des arbres dans le sous-bois en haut à gauche (un 0), chemins moins nets.
- **v3** : chemins moins tenus (0,81 / 0,77), pinceau plus fin qui grésille au zoom 0,6, quelques taches labourées.
- **v4** : la meilleure palette et des chemins aussi nets que v2, mais des massifs d'arbres dans deux coins de sous-bois (un 0).

## Ce qui reste, et la piste

Sur trois boucles, les deux défauts qui reviennent tiennent à FLUX, pas au masque :
- une tache brune en losange se lit comme un champ ;
- un aplat très sombre se lit comme une forêt.

Les pistes, à décider :
1. Peindre les emprises en pré (le socle du bâtiment fait déjà la terre battue, bible du 31/10 §4).
2. Corriger les 3 taches labourées de v2 par une retouche FLUX locale (FLUX 3 Image sait éditer une zone).
3. Accepter v2 telle quelle comme sol de travail pour les étapes 3 à 5, et repasser le sol en 2K ou en tuiles à l'étape 5.
