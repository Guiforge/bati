# Mesures, boucle 1

Scripts lancés à la main (PIL seul, pas de numpy sur la machine), hors dépôt. Seuil d'encre : luminance < 45.

## Palette, k-means sur les pixels opaques hors encre

Sprites livrés (forge solid, moulin solid, halle grand, nuit) : `#616B7C` 20 %, `#414952` 18 %, `#896454` 15 %, `#4E332F` 15 %, `#2C3644` 12 %, `#808C9B` 9 %, `#674842` 8 %, `#DCC2A5` 3 %. Tout tire au gris-bleu : c'est l'étalonnage de nuit.

Ancre jour (fond magenta et ombre magenta retirés) : `#482F1E` 20 %, `#C8965E` 16 %, `#B06937` 15 %, `#6E5941` 13 %, `#554232` 11 %, `#DEC28B` 11 %, `#847358` 7 %, `#6F3C21` 6 %. `#482F1E` est l'ombre brune que la bible refuse.

## Trait extérieur (pixels sombres depuis le bord alpha, lignes et colonnes)

| Sprite | Médiane | Quartiles | Encre médiane |
| --- | --- | --- | --- |
| halle grand | 8 | 7 à 13 | `#0B0B09` |
| moulin solid | 9 | 8 à 16 | `#161B27` |
| forge solid | 4 | 3 à 7 | `#0F0A0D` |

## Lumière (luminance moyenne, bande du milieu)

moulin 95 à gauche, 57 à droite ; halle 101 contre 90 ; forge 85 contre 82 (foyer à droite).

## Arbre test 1 (`s0l1_tree_1`)

Fond `#E273CF` (pas le `#FF00FF` demandé), écart sur les bords 19 en RGB : uni. Trait extérieur 14 px brut (12 à 22), soit environ 8 px une fois réduit à une case. Couronne : 113 à gauche, 83 à droite.
