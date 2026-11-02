# Étape 3, boucle 5 : crête et masse dense, découpe par clé

01/11/2026. Demande de Guillaume : laisser FLUX peindre le sol, puis le couper sous la ligne des racines. 2 images FLUX 3 Image, 0,14 $.

## Comment

- Le prompt demande un sol **cyan pur, uni** (`#00FFFF`) sous les arbres, comme couleur clé, sur fond magenta. FLUX le peint en losange, mais c'est sans importance.
- Découpe (`foret.py pose 5`) :
  1. détourage du magenta ;
  2. retrait de tout pixel cyan ;
  3. une ouverture de 7 px sur l'alpha (érosion puis dilatation), qui efface le liseré d'encre du losange et les miettes d'ombre ;
  4. contour porté au trait visé.
- Les troncs, les racines et les rochers de la crête restent.

## Mesures

| Sprite | Trait brut à S | Trait final | Taches en bas (socle sous 2) | Verdict |
| --- | --- | --- | --- | --- |
| dense | 1 | 5 | 2,55 | **retenu** |
| crête | 1 | 6 | 2,93 | **retenu** |

Les deux passent le contrôle de socle, et l'image le confirme : plus de losange, plus de dalle. La crête garde son mur de rochers, qui fait la bordure.

## Défauts restants

- Quelques petits trous dans les sapins bleus de la crête : leurs reflets les plus clairs tirent au cyan et sont partis avec la clé. On ne les voit pas au zoom 0,6.
- Les deux notes de socle sont proches du seuil (2,55 et 2,93). Les racines y font peu de taches séparées, ce qui reste juste au-dessus de 2.

**Le kit de l'étape 3 est complet** : feuillus, mélangée (boucle 2), bouleaux (boucle 3), dense et crête (boucle 5), mur de conifères (boucle 2). Les composites de cette boucle (`palier1.webp`, `palier6.webp`, `palier12.webp`) le montrent tout entier.

La découpe par clé est la recette à garder pour toute masse vue de dessus : FLUX ne sait pas peindre des arbres sans sol.
