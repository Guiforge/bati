# Porte de l'étape 3, boucle 3 (dernière)

01/11/2026. Même grille. 3 sprites refaits (bouleaux, dense, crête), les 3 autres viennent de la boucle 2. 0,21 $.

## Ce qui change depuis la boucle 2

- Les 3 sprites à socle sont redemandés : « découpés comme un autocollant, sous et entre les troncs le magenta pur ».
- **Contrôle de socle automatique** : nombre moyen de taches opaques par ligne dans les 15 % du bas. Des troncs en font plusieurs, un socle une seule (calibré sur la boucle 2 : 3,9 à 5,4 contre 1,0 à 1,1). Sous 2, le sprite n'est jamais posé et une masse propre le remplace.
- Pas de placement : 72 dp au lieu de 56.

## Mesures (`mesures.json`)

| Sprite | Source | Trait à S | Taches en bas | Verdict |
| --- | --- | --- | --- | --- |
| feuillus | boucle 2 | 6 | 4,02 | posé |
| mélangée | boucle 2 | 6 | 5,35 | posé |
| bouleaux | boucle 3 | 6 | 5,34 | posé (le socle a disparu) |
| dense | boucle 3 | 7 | 4,85 | posé (le socle a disparu) |
| mur de conifères | boucle 2 | 5 | 3,85 | posé |
| crête | boucle 3 | 5 | 1,49 | **rejeté** (encore une dalle), remplacé par le mur de conifères |

Masses posées : 211 au palier 1, 167 au 6, 151 au 12. Elles diminuent avec la croissance, ce qui est le recul de la lisière. Bordure : 381 pièces, fixes.

## Notes

| Ligne | Note | Pourquoi |
| --- | --- | --- |
| Même main | 1 | Lumière de gauche et ombre froide justes, aucune feuille tampon. Mais la masse dense a un trait de 7 px, au-dessus de la fourchette, et un trait trop épais ne se rattrape pas après coup. |
| Des masses | 1 | Au palier 6, de vraies masses : bouleaux clairs, sapins qui dépassent, toits variés. Au palier 12, le bas de l'écran se lit encore comme un tapis continu. |
| Bordure qui ferme | 1 | Le mur de conifères ferme le monde, mais il n'est toujours pas assez sombre pour une fin du monde. La crête n'existe plus, ce qui laisse une seule pièce de bordure. |
| Les règles | 2 | Plus aucun socle posé. La lisière recule d'un palier à l'autre, les clairières de la route et de la rivière restent ouvertes, les trouées diagonales sont en partie refermées : l'étoile ne se lit plus. |
| Composite | 2 | Aucun palier ne cache le village. La forêt le cadre dès le palier 1 et assombrit les bords. |

**Total 7/10, aucun 0 : la porte ne passe pas, et c'était la dernière boucle. Arrêt, la décision revient à Guillaume.**

Composites (vue « Cadrer », 1080 × 1213 px, terrain v1 de l'étape 2, chemins du code en aplats, sprites de nuit) : `palier1.webp`, `palier6.webp`, `palier12.webp`. Kit : `sprites.webp` et `*.cut.webp`.

## Ce qui reste

1. **Bordure sombre** : une pièce de bordure de plus (la crête sans dalle), et un assombrissement en code de la bande de bordure, qui relève de l'étape 6 (étalonnage). Un sprite plus sombre ne suffit pas : FLUX le remonte vers la palette.
2. **Tapis au palier 12** : il faudrait moins de masses en profondeur et plus de trouées sombres entre les groupes. C'est un réglage de placement, sans FLUX : le pas, et un bruit qui laisse des vides.
3. **Masse dense à 7 px** : la redemander avec « four » dans le prompt, ou l'accepter : elle est à 1 px de la règle.
