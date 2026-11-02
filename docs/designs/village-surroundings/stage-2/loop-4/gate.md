# Porte de l'étape 2, boucle 4 (terrain seul)

01/11/2026. Décision de Guillaume au point de contrôle : FLUX ne peint que le terrain. FLUX 3 Image, 4 variantes, 0,192 $.

## Comment c'est fait

`terrain.py` part du masque du palier 12 (`stage-1/loop-3`), recadré comme avant, et ne garde que 5 classes, adoucies :
- **pré** `#6A7442` : il absorbe chemins, place, champs, emprises et désordre ;
- **cœur usé** `#8A8450` : tout ce que le village occupe, flouté de 30 px, une seule tache ;
- **rivière** `#4A6A7C` : continue sous le pont ;
- **sous-bois** `#4A4632` ;
- **bordure** `#3A3628`.

Le prompt nomme ces zones, interdit route, chemin, champ, bâtiment, arbre et ligne dessinée, et dit que les bords sont plus sombres et moins saturés. Le bloc de la bible a le vert du pré. Variantes : v1 de base, v2 touches larges, v3 grandes plages chaudes et froides, v4 bords appuyés.

**Composite** (`composite_*.webp`) : le terrain, puis les chemins de `RuesDessinees.tsx` et les sprites des bâtiments du palier 12, posés comme dans `carteDemo.ts` `pose`. Les chemins sont en aplats (isoTerre, isoCheminClair, isoPaveClair, liseré isoInk), sans leurs textures. Avant : `avant_palier12.webp`, la capture du jeu au même cadre.

## Mesures (`mesures.json`, palette de 9 avec le pré)

| | v1 | v2 | v3 | v4 |
| --- | --- | --- | --- | --- |
| Masque lisible | 0,79 | 0,70 | 0,82 | 0,71 |
| Rivière, rappel / précision | 0,74 / 0,85 | 0,64 / 0,51 | 0,79 / 0,79 | 0,70 / 0,32 |
| Encre | 0,6 % | 0,1 % | 1,4 % | 0,4 % |
| Dans la palette de 9 | 64 % | 68 % | 81 % | 68 % |
| Luminance centre / bord | 152 / 91 | 150 / 95 | 156 / 94 | 157 / 87 |
| Saturation centre / bord | 54 / 25 | 58 / 25 | 59 / 27 | 59 / 23 |

## Notes

| Ligne | v1 | v2 | v3 | v4 |
| --- | --- | --- | --- | --- |
| Suit le masque | 2 | 1 | 2 | 1 |
| Pas de trait sur le sol | 2 | 2 | 2 | 2 |
| Palette et lumière | 1 | 1 | 2 | 1 |
| Rien que du terrain, zones justes | 1 | 1 | 1 | 0 |
| Pinceau, raccords, et le composite se lit | 2 | 1 | 1 | 1 |
| **Total** | **8** | **6** | **8** | **5 (un 0)** |

**La porte passe : v1, 8/10, aucun 0.**

## Le terrain retenu : v1

`terrain_v1.webp`, composite `composite_terrain_v1.webp`. Original : `~/.cache/bati-art-loop/iso/surroundings/stage2/loop-4/terrain_v1.png`.

Pourquoi v1 :
- C'est le terrain le plus naturel : pré varié, fleurs, cœur usé plus clair et plus chaud, sous-bois nu, aucune forme géométrique.
- Le centre est bien plus clair et plus saturé que les bords (152 contre 91, 54 contre 25) : le regard va au village.
- Dans le composite, les chemins du code tombent sur le cœur usé comme de la terre battue sur de l'herbe piétinée. Il n'y a plus de chemin en double.

À égalité de points, **v3** a la meilleure palette (81 %) et la rivière la plus juste. Mais elle pave tout le cœur d'un motif de dalles en cellules : un plan qui se battrait avec les chemins du code et que le projet ne veut pas.

Les variantes écartées :
- **v2** : la rivière déborde (précision 0,51), des taches orange et des ombres de feuillage partout.
- **v4** : des rangées labourées au centre (un 0) et une rivière qui bave (précision 0,32).

Ce qui reste à v1 :
- Quelques couronnes d'arbres dans le coin en bas à gauche, et des ombres de feuillage portées depuis les bords. Elles ne sont pas demandées, mais elles tombent là où iront les masses de forêt de l'étape 3.
- 64 % des pixels dans la palette de 9 (le pré tire au jaune au centre).

Composite, à savoir :
- Les sprites livrés sont de nuit, posés tels quels sur un terrain de jour : le décalage de lumière qu'on voit vient d'eux, il disparaîtra quand ils seront repeints de jour (option A).
- Les chemins y sont en aplats ; dans l'app, ils ont leurs textures.
- Résolution : 1,3 px par dp de carte. Au zoom maximum il en faut environ 7 : 2K ou tuiles à l'étape 5.
