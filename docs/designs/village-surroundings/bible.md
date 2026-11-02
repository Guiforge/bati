# Bible des abords (étape 0)

01/11/2026. Ce que tout le décor peint autour du village doit suivre : sol, forêts, bordure, accessoires. Elle s'appuie sur la bible de la boucle parallèle (`docs/designs/village-style-bible.md`, Mara, 31/10) et ne la contredit pas ; les écarts sont listés à la fin.

## Références

Trois bâtiments livrés, recadrés sans retouche, dans `refs/` :
- `forge_solid.nuit.crop.webp` : colombages, tuiles, trait d'encre fin à moyen.
- `windmill_solid.nuit.crop.webp` : la lumière de gauche la plus nette.
- `heroes_hall_grand.nuit.crop.webp` : le monument, bannières, trait de 8 px.

Plus l'ancre de jour acceptée par Mara : `docs/designs/village-loop/evidence/style-refs/ancre_heroes_hall_grand_jour.webp`. C'est la seule image de jour qui existe. Ses défauts connus (trait fin, faces d'ombre brunes, ombre portée sur le fond) ne sont pas à copier.

**Jour et nuit (Guillaume, 01/11, option A).** Tous les abords se peignent de jour. La nuit est un étalonnage en code (`AmbianceCarte.tsx` : `isoNuitSol` `#2E3552` à 35 % sur tout, voile `isoNuitVoile` aux bords, flaques chaudes). Les bâtiments seront repeints de jour plus tard par la boucle parallèle ; d'ici là, le décor de jour doit tenir à côté des sprites de nuit actuels, une fois passé sous l'étalonnage de nuit.

## Palette (9 hex)

Mesurée sur les pixels (médiane + k-means, encre exclue). Script et chiffres : `stage-0/loop-1/mesures.md`.

| Rôle | Hex | D'où | Voisin dans la bible du 31/10 |
| --- | --- | --- | --- |
| Encre | `#0F1518` | sprites livrés : `#0B0B09` (halle), `#161B27` (moulin) | `#0F1518` |
| Ombre ardoise | `#2E3552` | sprites livrés : grappe `#2C3644`, 12 % des pixels | `#2E3552` |
| Terre sombre, bois à l'ombre | `#554232` | ancre jour, 11 % | `#584A3E` |
| Terre, bois, tronc | `#6E5941` | ancre jour, 13 % | `#7A5A38` |
| Ocre, herbe sèche au soleil | `#C8965E` | ancre jour, 16 % | `#C2944E` |
| Lumière | `#DEC28B` | ancre jour, 11 % | `#F2E2B4` (plus clair) |
| Feuillage | `#4C7A3E` | jeton du sol en jeu `isoHerbeHaute` | `#4C7A3E` |
| Mousse, feuillage à l'ombre | `#435A36` | jeton du sol en jeu `isoPreMousse` | `#435A36` |
| Pré au soleil | `#6A7442` | jeton du sol en jeu `isoPreSec` (ajouté le 01/11, étape 2) | `#6A7442` |

![palette](refs/palette.png)

Les trois verts ne viennent pas d'un bâtiment : aucun bâtiment n'a de vert. Ils viennent des jetons du sol qui s'affichent déjà dans le jeu (`constants/rawColors.ts`). Les tuiles rouille (`#9A4E32`, ancre `#B06937`) restent aux bâtiments ; le décor ne s'en sert que pour un accent (un toit de cabane).

## Croissance : rien ne disparaît, sauf la lisière

Quand le village grandit, tout ce qui est posé reste : bâtiments, chemins, champs, accessoires, rivière, pont. **Une seule exception, décidée par Guillaume le 01/11 : la lisière de la forêt recule** avec l'île, comme une terre qu'on défriche. C'est de la croissance, pas une perte. La clairière s'élargit de 28 dp (île d'une case) à 80 dp (île finie), comme `monde.ts` `clairiere`. La forêt n'avance jamais, et la bordure du monde ne bouge pas. Les champs n'existent que hors de l'île finie, pour qu'aucun ne disparaisse (règle à tenir en code à l'étape 5). Sous la forêt, le sol peint est nu ; les masses d'arbres arrivent à l'étape 3, en sprites séparés.

**Sol peint = terrain seul (Guillaume, 01/11).** FLUX ne peint dans ces tuiles que le pré, le cœur usé du village, la rivière et ses berges, le sol nu du sous-bois et la bordure ; la terre battue sous un bâtiment vient de son socle.

**Routes et champs peints (Guillaume, 02/11).** Cette décision remplace « chemins et champs restent dessinés par le code » du 01/11. Les routes et les vignettes de champ deviennent peintes, cuites dans le sol hors ligne avec un manifeste de tampons, par bandes de paliers qui ne font qu'ajouter. Le code ne dessine plus que la lumière, les ombres, les masques et l'interface.

## Lumière et ombre

- **Direction** : une seule lumière, azimut 225°, élévation 55° (`constants/isoSpec.json`, `moon`). Elle vient d'en haut à gauche de l'écran.
- **Visible dans les refs** : luminance moyenne gauche contre droite, moulin 95 contre 57, halle 101 contre 90. La forge est à égalité (82 contre 85) parce que le foyer chauffe sa face droite.
- **Ombre propre** (sur l'objet) : face gauche et dessus chauds, face droite et dessous en ardoise froide `#2E3552`. Pas de brun chaud dans l'ombre (défaut de l'ancre).
- **Ombre portée** : jamais peinte par FLUX. Le code la pose, aplat opaque (ton du sol mêlé à 40 % de `#2E3552`), 0,70 fois la hauteur, vers la droite, bord fondu en deux crans (bible du 31/10 §2, `components/village/iso/ombres.ts`).

## Trait

- **8 px à l'échelle S** (384 px par case), contour extérieur ; 4 px pour les lignes intérieures. Mesuré : halle 8 (quartiles 7 à 13), moulin 9 (8 à 16), forge 4 (3 à 7). La forge est plus fine que la règle.
- **Au zoom moyen** (0,6, le zoom des captures) : une case fait 128 × 0,6 = 77 dp, donc 8 px de S font 1,6 dp, soit 4 px d'écran sur un téléphone de densité 2,6.
- On mesure le trait **à l'échelle où l'objet sera posé**, pas sur la sortie brute de FLUX : un arbre peint sur 768 px puis réduit à une case perd 40 % de son trait.

### Hiérarchie du trait (Guillaume, 01/11)

Les bâtiments restent les vedettes : ils ont le trait le plus épais.

| Type | Contour extérieur à l'échelle S |
| --- | --- |
| Bâtiments | 8 px (inchangé) |
| Accessoires | 6 px |
| Masses de forêt, arbres | 4 à 6 px (5 visé) |
| Sol peint | aucun |

FLUX ne connaît pas l'échelle S. Le chiffre à mettre dans le prompt est celui de la toile générée : **trait S × (largeur générée / largeur posée à S)**. Exemple : un arbre généré sur 768 px de large, posé sur 410 px à S (une case de couronne), trait visé 5 px → 5 × 768 / 410 ≈ 9 px dans le prompt. On vérifie toujours en mesurant après réduction.

**FLUX ne tient pas l'épaisseur** (boucle 2 : « nine » demandé, 2 à 3 px rendus par FLUX 3 Image, soit 1,3 à 2 px posés). Le trait extérieur se règle donc après coup : détourage, puis contour porté au chiffre de la table par dilatation en `#0F1518`, comme les bâtiments (recette de `docs/designs/village-loop/evidence/style-refs/README.md`). Outil : `stage-0/loop-2/planches.py <image> <nom> <trait à S>`. Le prompt garde la phrase du trait pour les lignes intérieures et la netteté du bord.

## Niveau de détail

3 à 6 petites formes lisibles par case (bible du 31/10 §4). Touches de pinceau visibles à zoom 1, fondues à 0,6. Deux ou trois valeurs par aplat, mat, pas de reflet.

## Bloc de prompt FLUX (à coller tel quel, après le sujet)

`{TRAIT}` se remplace par le nombre de pixels calculé ci-dessus (hiérarchie du trait), en toutes lettres. Pour le sol peint, remplacer toute la phrase du trait par « No ink outline at all, soft painted edges. ».

```
Franco-Belgian comic game art, three-quarter isometric view from above. First the ink: a bold, clean, confident black outline (#0F1518) of even width around the whole silhouette, about {TRAIT} pixels wide, thinner inner lines. Then the colour, painted inside the ink with visible brush strokes, two or three values per surface, matte, no gloss; the brush stays inside the lines and never breaks the outline. Warm late-afternoon light from the upper left: left and top surfaces lit warm (#DEC28B, #C8965E); the shaded side of every form is cool slate blue-grey (#2E3552), never brown. Earth #6E5941, dark earth #554232, foliage #4C7A3E, moss #435A36. Image 1 gives only the mood: do not copy its thin line or its brown shadows. No cast shadow outside the object's own base. One object alone, centred, on a flat uniform pure magenta (#FF00FF) backdrop from edge to edge, all four corners. No text, no signature.
```

Réglé pour **FLUX 3 Image** (`flux-3-image`, API BFL), le modèle des abords depuis la boucle 2 de l'étape 0 : meilleure tenue de la palette et de l'ombre froide que `flux-2-pro-preview` sur le même prompt. FLUX 3 Image ne prend pas de graine (rejouer une image n'est pas possible) et rend le trait plus fin que le chiffre demandé : toujours mesurer après réduction. Version précédente du bloc (boucle 2, image 1 et 2) : `stage-0/loop-2/gate.md`.

Usage : 1 référence (l'ancre jour réduite à 640 × 800, poids bas dit dans le sujet), au plus 2. Fond magenta : loin de tous les verts et bruns du décor. Jamais d'image de Thronebreaker.

## Écarts avec la bible du 31/10

- **Palette** : 8 hex au lieu de 17, tous voisins d'un hex de la bible du 31/10. La lumière mesurée `#DEC28B` est plus sombre que `#F2E2B4` : c'est le vrai ton des faces éclairées de l'ancre, `#F2E2B4` reste le lavis de lumière en code.
- **Ancre** : la bible du 31/10 prend des sprites de nuit comme références de style ; ici le décor se cale sur l'ancre de jour pour la couleur, et sur les sprites livrés pour le trait et l'ombre ardoise.
- **Bâtiments** : tranché le 01/11 (option A, voir Références). Le test de chaque asset se fait sur deux planches : de jour à côté de l'ancre, et sous l'étalonnage de nuit à côté d'un sprite de nuit.
