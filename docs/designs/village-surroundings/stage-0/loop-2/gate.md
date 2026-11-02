# Porte de l'étape 0, boucle 2

01/11/2026. Retour de Guillaume sur la boucle 1 : option A (abords de jour, nuit en code), hiérarchie du trait, test de l'arbre à refaire avec 3 planches. Addendum : l'arbre en FLUX 3 Image.

## Ce qui a été fait

| Image | Modèle | Bloc | Coût |
| --- | --- | --- | --- |
| `s0l2_tree_1` | flux-2-pro-preview | bloc A (avec `{TRAIT}`) | 0,045 $ (lancée avant l'addendum, gardée en témoin) |
| `s0l2_tree_2` | flux-3-image | bloc A | 0,048 $ |
| `s0l2_tree_3` | flux-3-image | bloc B (ajusté, celui de `bible.md`) | 0,048 $ |

Même sujet pour les trois, 1 référence (l'ancre jour en 640 × 800), `{TRAIT}` = « nine » (5 px visés à S, toile de 768 posée sur 410 px). Originaux dans `~/.cache/bati-art-loop/iso/surroundings/`, provenance à côté de ce fichier.

Bloc A (avant ajustement) :
```
Hand-painted Belgian comic game art, three-quarter isometric view from above, matching image 1's brushwork. Regular black ink outline (#0F1518) around the whole silhouette, about {TRAIT} pixels wide, thinner inner lines. Visible brush strokes, two or three values per surface, matte, no gloss, no gradient sheen. Warm late-afternoon light from the upper left: left and top surfaces lit warm (#DEC28B, #C8965E), right side in cool slate shadow (#2E3552). Earth #6E5941, dark earth #554232, foliage #4C7A3E, moss #435A36. No cast shadow outside the object's own base. One object alone, centred, on a flat uniform pure magenta (#FF00FF) backdrop from edge to edge, all four corners. No text, no signature.
```

**Détourage** (`planches.py`) : alpha doux par distance au fond, couleur démélangée du fond, îlots de moins de 400 px retirés, tout pixel magenta à 2 px du bord repeint à l'encre ou retiré. Contrôle au zoom max (×8) : `*.bord_x8.png`. Reste sur l'arbre 3 un fil sombre violacé de 1 px entre l'encre et la feuille, visible à ×8, invisible au zoom 0,6.

**Contour** : l'arbre 3 sort avec un trait de 1,3 px à S. Porté à 4,5 px par dilatation en `#0F1518` (`f3_t3_trait5`), la recette des bâtiments.

**Planches** (zoom 0,6, densité 2,625, soit 0,525 px d'écran par px de S, sol `isoPreSec` `#6A7442`) :
- a. `f3_t3_trait5.a_jour_ancre.webp` : arbre de jour brut, sans voile, à côté de l'ancre jour.
- b. `f3_t3_trait5.b_nuit_moulin.webp` : étalonnage de nuit sur tout, à côté de `windmill_solid.nuit`.
- c. `f3_t3_trait5.c_nuit_forge.webp` : idem, à côté de `forge_solid.nuit`.

Étalonnage de nuit reproduit depuis 891f6da2 : `AmbianceCarte.tsx` pose `rawColors.isoNuitSol` = `rgba(46, 53, 82, 0.35)` en aplat au-dessus de tout (sol, sprites, décor), pixel = 0,65 × pixel + 0,35 × `#2E3552`. Pas appliqués : le voile de bord `isoNuitVoile` `rgba(15, 42, 107, 0.42)` (seulement les 30 % extérieurs de la carte) et les flaques `isoFlaque*` (autour des maisons allumées) : planches prises au centre du village, loin d'une flaque. Le voile de jour `isoJourVoile` (12 %) n'est pas sur la planche a, qui montre l'arbre brut. Mêmes planches pour les arbres 1 et 2 (`f2_t1.*`, `f3_t2.*`), pour comparer.

## Mesures

| | Arbre 1, FLUX.2, bloc A | Arbre 2, FLUX 3, bloc A | Arbre 3, FLUX 3, bloc B, trait porté |
| --- | --- | --- | --- |
| Trait brut FLUX, posé à S | 3,5 px | 2,0 px | 1,3 px, porté à 4,5 px |
| Trait à l'écran, zoom 0,6 | 1,8 px | 1,0 px | 2,4 px |
| Lumière, gauche contre droite | 137 / 106 | 118 / 104 | 125 / 104 |
| Ombre (quart le plus sombre), médiane | `#454118` olive | `#414A41` gris vert | `#3A4F45` vert ardoise |
| Ombre qui tire au brun | 99 % | 32 % | 22 % |
| Écart moyen à la palette | 42 | 32 | 40 |
| Pixels à moins de 40 de la palette | 53 % | 79 % | 52 % |

## Les deux questions de Guillaume

**FLUX a-t-il copié les défauts de l'ancre ?** Le trait fin : oui, avec FLUX 3, dans les deux blocs, même quand le bloc B dit « do not copy its thin line » (2 px puis 1,3 px posés). FLUX.2 le copie moins (3,5 px). Les ombres brunes : non avec FLUX 3 (22 à 32 % de pixels bruns, ombre gris vert à vert ardoise), oui avec FLUX.2 (99 %, ombre olive).

**« Belgian comic » et « visible brush strokes » se battent-ils ?** Oui, et chaque modèle tranche dans un sens. FLUX.2 garde la BD et perd le pinceau : liseré noir façon autocollant, touches réduites à du bruit jaune citron, feuilles isolées qui flottent. FLUX 3 avec le bloc A garde le pinceau et perd l'encre : trait fin, cassé, esquissé. Le bloc B dit l'ordre (d'abord l'encre, puis la couleur peinte dedans, le pinceau ne casse jamais le contour) : l'arbre 3 a des masses nettes, un pinceau visible mais calme, l'ombre froide du bon côté. L'épaisseur reste ignorée, d'où la dilatation après coup.

## Notes contre la bible (arbre 3, trait porté)

| Critère | a. jour, ancre | b. nuit, moulin | c. nuit, forge |
| --- | --- | --- | --- |
| Palette | 1 : couronne olive et ardoise dans la famille, mais plus froide et moins saturée que l'ancre | 2 : sous le voile, même famille de valeurs que le moulin | 2 |
| Direction de la lumière | 2 : couronne claire à gauche, ombre à droite, comme l'ancre | 2 : même côté que la face claire du moulin | 2 |
| Ombre ardoise, sans brun | 1 : froide (22 % de brun) mais vert ardoise, pas `#2E3552` | 2 : sous le voile, elle rejoint l'ardoise du moulin | 2 |
| Trait mesuré à la taille posée | 2 : 4,5 px à S, dans la fourchette forêt (4 à 6), sous les 8 px de l'ancre | 2 | 1 : la forge a un trait de 4 px, l'arbre paraît aussi appuyé qu'elle |
| Niveau de détail | 2 : 4 ou 5 masses, feuilles lisibles, pas de bruit | 2 | 2 |
| Pinceau | 1 : visible mais plus lisse que l'ancre | 2 : se lit comme le crépi du moulin | 1 : la forge est plus détaillée, l'arbre plus simple |

Défauts restants : socle de gazon en losange sous l'arbre (inutile en forêt, à retirer du sujet à l'étape 3), quelques feuilles en forme de tampon, arbre clair et peu saturé à côté des sprites de nuit très bleus.

## Porte de l'étape 0, notée à nouveau

| Ligne | Note | Pourquoi |
| --- | --- | --- |
| Palette tirée de vrais pixels de bâtiment | 1 | Inchangé : 6 hex sur 8 mesurés, les 2 verts viennent du sol en jeu. |
| Lumière et style d'ombre écrits et visibles dans les refs | 2 | Inchangé, et l'option A (nuit en code) est écrite avec ses valeurs. |
| Trait mesuré | 2 | Hiérarchie ajoutée (8, 6, 4 à 6, aucun) ; mesure à la taille posée ; la dilatation règle le trait que FLUX ignore. |
| Bloc de prompt court et réutilisable tel quel | 2 | Un paragraphe, un seul trou `{TRAIT}` ; il est lu tel quel dans `bible.md` par `gen_tree.py`. Réglé pour FLUX 3 Image. |
| Un arbre FLUX qui va à côté des bâtiments | 1 | Il tient sur les 3 planches, lumière et ombre justes, mais le trait vient d'une étape après FLUX, et la couleur n'est pas encore celle de l'ancre. |

**Total 8/10, aucun 0 : la porte passe.** Les deux bloquants de Guillaume sont levés (test de l'arbre fait sur 3 planches, hiérarchie du trait dans la bible). En attente du GO.
