# Porte de l'étape 0, boucle 1

01/11/2026. Seuil : aucun 0, total ≥ 8/10.

Planche côte à côte : `board.webp` (en haut à l'échelle S, en bas au zoom moyen 0,6 sur un téléphone de densité 2,6, fond `#6A7442`). Arbre détouré : `s0l1_tree_1.cut.webp`. Original : `~/.cache/bati-art-loop/iso/surroundings/s0l1_tree_1.png` (+ `.json` de provenance).

| Ligne | Note | Pourquoi |
| --- | --- | --- |
| Palette tirée de vrais pixels de bâtiment | 1 | 6 hex sur 8 mesurés sur les sprites livrés et l'ancre. Les 2 verts viennent des jetons du sol en jeu : aucun bâtiment n'a de vert. |
| Lumière et style d'ombre écrits et visibles dans les refs | 2 | 225° / 55° écrits, mesurés sur le moulin (95 contre 57) et la halle (101 contre 90). Ombre propre ardoise, présente dans les sprites (`#2C3644`, 12 %). Ombre portée en code, règle écrite. |
| Trait mesuré | 2 | 8 px à S (halle 8, moulin 9, forge 4), traduit au zoom moyen (1,6 dp, 4 px d'écran). |
| Bloc de prompt court et réutilisable tel quel | 2 | Un paragraphe, collé sans retouche dans `gen_tree.py` après le sujet. |
| Un arbre FLUX qui va à côté des bâtiments | 1 | Même famille que l'ancre de jour : peint, encré, lumière de gauche (113 contre 83), fond uni. Défauts : reflets jaune citron hors palette, côté d'ombre vert au lieu d'ardoise, quelques feuilles isolées collées comme des tampons, vue presque de face, liseré noir façon autocollant. À côté des bâtiments livrés de nuit, il jure par la lumière, pas par le trait. |

**Total 8/10, aucun 0 : la porte passe.** Une seule image sur les deux permises, 0,045 $.

## À reprendre à l'étape 3 (forêts), sans coût maintenant

Ajouter au sujet des arbres : « highlights warm cream, never lemon yellow », « the shaded side of each clump is cool slate », « no single leaf drawn on its own », « seen from above, the top of the crown visible ». Mesurer le trait après réduction à la taille posée.
