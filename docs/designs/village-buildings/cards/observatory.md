Gelée le 03/11

# Carte : Observatoire (observatory)

Corrigée après les relectures de theo et mara. Direction C, le grand astrolabe, reprise par Guillaume. Remplace le brouillon de la prep : plus de titan. Rien de l'aspect actuel n'est gardé, seule l'emprise reste.

**Chiffres** : mesurés sur un croquis noir projeté à la main (trait de 8 px), sans Blender. **Cette composition n'est pas celle qu'E1 a testée** : la lunette ne dépasse plus du cerceau, elle vise un disque à l'intérieur. G-ID est à repasser sur le vrai rendu avant toute peinture.

**Repères** :
- Grille x, y de 0 à 2, (2,2) devant. `px = 448 + 192 (x - y)`, `py = 1280 - 96,67 (4 - x - y) - 235 z`. Rayon `r` à l'écran : `r x 271,5` px.
- Canevas `building2x2` : **896 x 1344 px**, ancre (448, 1280).
- **5 px de canevas = 1 dp à l'écran**, au zoom de capture 0,6 sur le téléphone de test (vérifié sur les captures E1). 10 dp = 50 px, 14 dp = 70 px, 16 dp = 80 px.
- **Limites de `headroom.md`** : rien au-dessus de y = 64 (`anchorMarginPx`) ; H max 1154, le mythique fait 1123. Le test `iso-spec` et ses 200 px ne lit que les anciens stades : ne pas s'y caler.

## 1. Identité
- **Famille** : amélioration du moulin, règle B. Un marqueur et un tap par rang.
- **Gardien** : **le Sage**, déjà ancré ici dans `constants/villagers.ts`, sans répliques. Il vit dans l'emplacement du gag.
- **Piliers** : P1 (un morceau de nuit à midi), P2 (le hibou, la petite lune, la magie qui monte), P3 (la sphère se bâtit anneau par anneau), P4 (le bâtiment des épaules porte le ciel à bout de colonne).
- **Crochet de silhouette** : tambour large et bas, dôme décalé à droite, lunette en diagonale vers le haut à gauche, colonne en cône et sa contrefiche, et en haut **une vraie sphère armillaire à trois anneaux croisés**. **Seul l'observatoire a des anneaux.**
- **Face au moulin** : le moulin est un X et un pic. Ici, une sphère ajourée sur un tambour bas.
- **Accents** : laiton mat, patine verte, bleu nuit du disque, cuivre du dôme, **lumière arcane verte et bleue**.
- **Références, texte seulement** : une sphère armillaire de la Renaissance, l'observatoire de Jantar Mantar pour la pierre, les grues de Guédelon pour le chantier.

## 2. Ce qui ne change à aucun stade
- Emprise 2 x 2, masque de contact, ancre. La dalle reste dans le spec (`plate()`, `_plate`) pour le test d'empreinte, **jamais envoyée à FLUX**.
- **Pas de sol dans la maquette ni dans la peinture.** `maquette_peinture.py` ne doit plus ajouter de sol : fond magenta plat seul. Un sol à part, `observatory_sol`, peint une fois en contexte.
- Base centre (1 ; 1), r 0,85. Porte `box` `[0,84 ; 1,82 ; 0,04]`, `[0,32 ; 0,06 ; h]`, h 0,38 au rough, 0,55 ensuite, `accroche: porte`.
- Carte du ciel : `G.sky_map(z0, (1.62, 0.62))`, z0 0,53 au rough, 1,0 ensuite.
- Pierre, bois. Laiton **mat, jamais doré, jamais de reflet spéculaire**.

**Matériaux à ajouter** (`materials` du spec et `DAY` de `maquette_peinture.py`, 3 tons haut, clair, ombre) :
- `laiton` : `#9A7B45`, `#9A7B45`, `#5E4C34`.
- `patine` : `#6F8F80`, `#6F8F80`, `#46594F`.
- `nuit` : `#1B2340`, `#1B2340`, `#141A30`.
- `fente` : `#15192A` pour les trois.

## 3. Échelle des stades

| Stade | Nouvel élément | Haut (y) | H | Aire | Croissance |
|---|---|---:|---:|---:|---|
| rough | Plateau de bois, lunette de bois sur trépied, carte du ciel | 553 | 643 | 171 k | |
| solid | Tambour, dôme de cuivre fente fermée, bout de lunette qui pointe, trépied plié, fanion | 507 | 689 | 239 k | +40 % aire |
| grand | **Le dôme s'ouvre** : fente sombre, volet levé, longue lunette de laiton, petite sphère armillaire sur la terrasse | 433 | 763 | 274 k | +10,7 % H |
| legendary | Colonne en cône et contrefiche, berceau en demi-anneau de laiton | 254 | 942 | 334 k | +23 % H |
| mythic | **La sphère complète : trois anneaux, le disque de ciel nocturne, la petite lune** | 73 | 1123 | 407 k | +19 % H, +22 % aire |

**Le grand ne ressemble pas au solid** : le volet, la lunette trois fois plus longue et la sphère de droite changent le noir. Grand et solid ne partagent que le tambour.

**Pièces**. `G` = `gen_pilot_specs.py`. Constantes : `C = (0,82 ; 1,46 ; 3,61)`, `R = 0,66`, `HOOP = (0,7071 ; 0,7071 ; 0)`, `EQ = (0,12 ; -0,12 ; 0,985)`, `MER = (0,95 ; -0,31 ; 0)`, pied de lunette `(1,25 ; 0,82)`.

- **rough** :
  - `cyl` (1 ; 1 ; 0,04), r 0,85, h 0,46, `stone`. Plancher `cyl` (1 ; 1 ; 0,5), r 0,80, h 0,03, `wood`.
  - `G.telescope(1.05, 2.15, 0.09, "wood", foot_xy=(1.22, 0.92), tip_xy=(0.84, 1.22))`.
  - Trépied : 3 `seg` r 0,05, `wood`, de (0,75 ; 1,45 ; 0,53), (1,45 ; 0,75 ; 0,53), (0,70 ; 0,70 ; 0,53) à (1,05 ; 1,05 ; 1,40).
- **solid** :
  - Tambour `cyl` (1 ; 1 ; 0,04), r 0,85, h 0,96, `stone`. Fenêtres : `box` `[1,82 ; 0,82 ; 0,45]`, `[0,06 ; 0,2 ; 0,28]` et `box` `[1,22 ; 1,76 ; 0,45]`, `[0,16 ; 0,06 ; 0,28]`, `amber`.
  - **Dôme décalé à droite**, axe (1,25 ; 0,95) : col `cyl` z 1,0, r 0,60, h 0,45, puis `cone` (z 1,45, 0,60 à 0,52, h 0,30), (z 1,75, 0,52 à 0,30, h 0,22), (z 1,97, 0,30 à 0, h 0,08), `iron`, `roof: true`. Prompt : cuivre mat.
  - `G.telescope(1.70, 2.39, 0.09, "darkwood", foot_xy=(1.25, 0.82), tip_xy=(1.095, 1.05))`. Le bout dépasse à peine.
  - **Trépied plié contre le col du dôme**, 30 dp : 3 `seg` r 0,04, `wood`, de (1,44 ; 1,60 ; 1,0), (1,52 ; 1,62 ; 1,0), (1,58 ; 1,56 ; 1,0) à (1,50 ; 1,52 ; 1,64).
- **grand** (s'ajoute, la lunette change) :
  - `G.telescope(1.70, 2.69, 0.09, "laiton", sleeve=True, foot_xy=(1.25, 0.82), tip_xy=(1.026, 1.153))`.
  - **Fente sombre** : 3 `seg` r 0,10, `fente`, sur le dôme, azimut de la lunette `(-0,56 ; 0,83)` : de rayon 0,59 à z 1,50, à 0,52 à z 1,75, à 0,30 à z 1,97, puis à 0 à z 2,05. Elle se voit sur le profil gauche, et la lunette en sort. Peint dedans : un fil vert et bleu.
  - **Volet levé** : `seg` (1,42 ; 0,86 ; 1,80) à (1,56 ; 0,72 ; 2,36), r 0,10 à 0,08 ; `seg` de là à (1,44 ; 0,84 ; 2,62), r 0,08 à 0,05, `iron`.
  - **Petite sphère de terrasse**, centre c = (1,62 ; 0,46 ; 1,82), à px (671, 667), 37 dp : socle `cyl` (1,62 ; 0,46 ; 1,0), r 0,14, h 0,08 ; tige r 0,05, h 0,40 ; **2 anneaux** `G.ring(c, 0.34, n, 16, 0.04, "laiton")`, n = (0 ; 0 ; 1) et `HOOP`. Pas de boule.
- **legendary** (s'ajoute, la lunette s'allonge) :
  - `G.telescope(1.70, 2.96, 0.09, "laiton", sleeve=True, foot_xy=(1.25, 0.82), tip_xy=(0.966, 1.242))`. Bout à px (395, 411).
  - **Colonne, sans socle** : `cone` (0,82 ; 1,46 ; 1,0), r 0,29 à 0,13, h 1,95, `stone`. Soit r 0,28 à z 1,14 et r 0,13 à z 2,95.
  - **Contrefiche** : `seg` de (0,82 ; 1,46 ; 2,35) à (0,46 ; 1,82 ; 3,19), r 0,07, `iron`. Elle casse la lecture « sucette ».
  - **Berceau, moitié basse de l'anneau** : 24 `G.seg`, r 0,05, `laiton`, points `C + 0,66 (cos t * (0,7071 ; -0,7071 ; 0) - sin t * (0 ; 0 ; 1))`, t de 0 à 180°. `G.ring` ne fait que des cercles entiers : calculer ces points.
- **mythic** (s'ajoute, le berceau devient l'anneau entier) :
  - `G.ring(C, 0.66, HOOP, 48, 0.05, "laiton")`, `G.ring(C, 0.66, MER, 48, 0.05, "patine")`, `G.ring(C, 0.66, EQ, 48, 0.05, "patine")`. **Trois axes, une vraie sphère**, 27 px de large, 7 dp avec le trait. **Seul l'anneau HOOP est en laiton**, pour ne pas lire un trophée. Ne pas prendre les normales x, y, z : le croquis a donné une boule pleine.
  - **Disque de ciel nocturne** : `G.cyl(C - 0.01 (1, 0, 0), 0.30, 0.02, "nuit", axis=(1, 0, 0))`. **Normale (1 ; 0 ; 0)** : une ellipse de 33 x 20 dp penchée vers la lunette, centre px (325, 265). Cerclage `G.ring(C, 0.31, (1, 0, 0), 32, 0.02, "laiton")`. **2 pivots** : `seg` r 0,02, `laiton`, de `C + 0,31 z` à `C + 0,66 z` et de `C - 0,31 z` à `C - 0,66 z`.
  - **La lunette vise le centre du disque** : son axe passe par C, et son bout est à peine entré dans la sphère. C'est ce qui évite la lecture « portail ».
  - **Petite lune** : `G.ball((1.177, 1.103, 4.034), 0.13, 8, "plaster")`, 14 dp, à px (462, 166), fixée sur l'anneau.
- **Repère gag** (`_marker`), tous stades : `cyl` (0,22 ; 1,78 ; 0,04), r 0,21, h 0,01.

**Retouche sous masque** des croisements de la grande sphère : qui passe devant qui, 2 images, 0,14 $.

**`check()` de `render_pilot.py` signalera la sphère** : elle déborde de l'empreinte **en l'air** jusqu'à y 2,12. C'est permis (Q11 de `decisions.md`) tant que le contact au sol reste dans le masque et que tout tient dans le canevas. La colonne reste sur la terrasse.

| Stade | Marque de clan, sprite | Gardien | Boucle |
|---|---|---|---|
| rough | aucune | voir gag | carte qui bat, en code |
| solid | `fanion` | voir gag | carte |
| grand | `banniere` | voir gag | carte |
| legendary | `blasonSculpte` | voir gag | carte |
| mythic | `blasonLumineux` : le même sprite, lueur en code | voir gag | carte, glyphes, lucioles |

- `clanMark` : **(210, 941)**, sur le tambour, à gauche de la porte. `gag.slot` : **(148, 1020)**.
- **Fenêtres** (`fenetre`, nuit, dès le solid) : (640, 1010), (348, 1056).

### La magie monte par paliers
**Lumière arcane verte et bleue, de jour et de nuit.** Forme et couleur sont peintes et mates ; le code ne fait que respirer et bouger.

| Palier | Jour | Nuit |
|---|---|---|
| Propre 1 | | Une étincelle verte au bout de la lunette (375, 587) |
| Propre 2 | | L'étincelle, au nouveau bout (457, 539) |
| Propre 3 | Un fil vert et bleu dans la fente, peint | Idem, lumière à la fente (372, 640) |
| Base 7 | La comète du gag devient verte et bleue. Une petite lueur verte flotte dans le berceau (325, 265), en code | Idem + **faisceau doux, vert en bas et bleu en haut**, depuis (325, 265), fondu avant y 40 |
| Base 9 | | + une lueur verte fuit sous la bâche (320, 300), jusqu'à la base 10 |
| Base 10 | Voir ci-dessous | Voir ci-dessous |

**Au mythique, de jour** :
- **Peint et mat** : une **bande d'aurore verte `#5FA58C` et bleue `#4E8FC0`** sur le disque, **diagonale et décentrée, jamais radiale, rien hors du cerclage**, quelques étoiles ; reflet vert et bleu sur 40 % de la face intérieure des anneaux. Prompt : mat, sans lueur, sans dégradé de portail.
- **Code** : respiration de 15 % masquée au disque, 5 lucioles de 3 dp.
- **Anneaux de glyphes en code**, **autour de la sphère, jamais autour du disque** : un vert, ellipse 217 x 109 px ; un bleu, 239 x 120 px, inclinaison opposée, tous deux centrés en (325, 265). **Sens contraires, environ 8 s et 12 s par tour.** 8 glyphes chacun, de 6 à 8 dp. Fixes en mouvement réduit.

**Au mythique, de nuit** : gradation, lumière à l'ancre (325, 265), le faisceau, **constellations en code dont une en forme de blason**, et **1 sprite `nuit_aurore`**, peint et mat, 90 x 60 dp, **derrière la sphère**, boîte 100-550 x 115-415, décalage -123, -1015, `fromRank: 3, fromBase: 10`.

**Mythic** :
- **Élément dominant** : la sphère armillaire.
- **Couche magique** : le disque d'aurore visible à midi, les anneaux de glyphes, et la nuit le faisceau, les constellations et l'aurore.
- **Finale** : le Sage salue la petite lune.
- **Mouvement réduit** : tout immobile, lumières fixes, glyphes fixes.

## 4. Table des rangs (règle B)
Un marqueur et un tap par ligne. Pas de marqueur à la base 8, rien n'y change. Tailles en dp à l'écran, décalage depuis l'ancre (448, 1280). XOR = part de la silhouette qui change (seuil 1,5 %).

| Rang | Nouveau | Sprite | Taille | Boîte (x, y) | Décalage | XOR |
|---|---|---|---|---|---|---:|
| Propre 1 | Stade rough + gag 1, étincelle verte la nuit | `rough.jour`, `gag_1` | gag 24 x 32 | slot | | |
| Propre 2 | Stade solid + gag 2 | `solid.jour`, `gag_2`, `fanion` | 24 x 32 | slot | | |
| Propre 3 | Stade grand + gag 3, fil vert et bleu dans la fente | `grand.jour`, `gag_3`, `banniere` | 24 x 32 | slot | | |
| Base 6 | Teaser : premiers tambours de la colonne, sous une chèvre de levage, sur la terrasse | `teaser_b6` | 30 x 44 | 215-365, 660-880 | -158, -510 | 3,4 % |
| Base 7 | Stade legendary + gag 4, lueur verte dans le berceau, faisceau la nuit | `legendary.jour`, `gag_4`, `blasonSculpte` | 24 x 32 | slot | | |
| Base 9 | Teaser : échafaudage autour du berceau, le disque bâché qu'on hisse, lueur verte dessous la nuit | `teaser_b9` | 46 x 48 | 205-435, 160-400 | -128, -1000 | 11 % |
| Base 10 | Stade mythic + finale | `mythic.jour`, `gag_5`, `blasonLumineux`, `nuit_aurore` | 24 x 32, sphère 72 | slot | | |

Données : `rank: 3, fromBase: 6 / 7 / 9 / 10`. Le rang propre reste plafonné à 3.

## 5. Le gag : la lunette du Sage
Une pile, pas deux figures côte à côte : l'emplacement fait 24 dp.
- **Propre 1** : le Sage observe le ciel depuis son tabouret, à la longue-vue.
- **Propre 2** : souriant, il pointe sa longue-vue **vers sa chope posée au sol**.
- **Propre 3** : **il dort** sur son tabouret, un hibou de 14 dp perché sur la longue-vue.
- **Base 7** : une petite comète **verte et bleue** passe, il tombe de son tabouret, étoiles autour de la tête, jambes en l'air. Jamais une blessure. Le hibou s'envole.
- **Base 10, finale** : debout, il salue de la main la petite lune tout en haut, le hibou sur sa tête.

**Repli** (aucun `[wink]` ici, c'est au cas où G-WINK ou G-GAG échoue) : à Propre 2, si la chope ne se lit pas, le hibou se pose au bout de la longue-vue et bouche la vue. Le gag 3 reste.

## 6. Gag de chantier
Le même à chaque changement de stade : une carte du ciel s'envole, un ouvrier lui court après, 4 images. L'échafaudage `chantier` est un seul sprite, mis à l'échelle en code, un tiers du bâtiment au plus.

## 7. Le mythic en une phrase
« Mon observatoire vise un morceau de ciel de nuit, en plein midi, dans une sphère de laiton. »

## 8. Clins d'œil
- **Source** : aucune œuvre. Aucun `[wink]` à approuver.
- **Jamais dessiné** : une statue moderne d'Atlas, une figure seule tenant une boule, un portail de jeu, de l'or, des lettres, chiffres ou graduations. Les glyphes sont en code, jamais peints.

## 9. Rien ne disparaît

| Stade | La peinture contient | Teaser fini | Retiré des données |
|---|---|---|---|
| rough | anneau de pierre, plancher, lunette, trépied, carte, porte | | |
| solid | tout (plancher devenu terrasse, trépied plié contre le col) + tambour, col, dôme, fenêtres | | |
| grand | tout + fente ouverte et son fil, volet, lunette de laiton, petite sphère | | |
| legendary | tout + colonne, contrefiche, berceau | `teaser_b6` : la colonne | `teaser_b6` |
| mythic | tout (berceau devenu anneau) + 2 anneaux, disque, cerclage, pivots, lune | `teaser_b9` : le disque | `teaser_b9` |

La marque de clan reste un sprite, à la même place, sa forme change. La lueur de la base 9 part avec la bâche. Seul l'emplacement du gag change de contenu.

## 10. Lisibilité
- **Teasers** : 30 et 46 dp de large, au bord de la silhouette. **Pas d'ajout hors teaser** : aucun rang n'en a besoin.
- **Figures** : 2 au plus (Sage + hibou), 16 et 14 dp. Chantier : 1 ouvrier et la carte.
- **Surcouches** : 2 au plus (teaser + gag). Au pire, à la base 9 : environ 20 % de la silhouette, sous 25 %.
- **Échafaudage** : 17 % du legendary à la base 9.
- **Contact au sol** : pied de gag (0,22 ; 1,79), tout le reste sur le tambour. Dans le losange.
- **Canevas** : haut à y 73, gauche à x 86 avec le glyphe bleu, droite à x 777.

## 11. Coût estimé

| Poste | Sprites |
|---|---|
| Peintures de stade | 5 |
| Teasers | 2 |
| Gags | 5 |
| Marques de clan | 3 |
| Échafaudage | 1 |
| Chantier, images dessinées (24 au plus) | 4 |
| Sol de l'emplacement | 1 |
| `nuit_aurore`, sprite de nuit seule | 1 |
| **Total** | **22** |

**22 x 2 essais x 0,07 $ = 3,08 $**, plus l'écran cible refait (2 variantes, 0,14 $) et la retouche des croisements (0,14 $) : **3,36 $**. `cibles_e1.py` compte 0,075 $ par image en 2x2, et le registre réserve 0,10 $ : prévoir 4,80 $ de réservation. Peinture neuve par stade, FLUX 3 Image, stade précédent en référence, finition (b).

**Glyphes** : le jeu n'a qu'une rune (`effets.ts`). **4 glyphes de plus**, dessinés en code : 0 $ de FLUX, du code avec son test.

## Moteur : ce qui manque
Ce que `buildingData.ts`, `BatimentMoteur.tsx` et `db/village.ts` ne savent pas encore dire. Avec test, à faire avant l'intégration.
1. **`Teaser.untilBase`** : `untilRank` compare le rang propre, plafonné à 3, donc `teaser_b6` et `teaser_b9` ne partiraient jamais.
2. **Marqueur aux bases 6 et 9** : `claimableBases` ne compare que les stades, donc seuls 7 et 10 réclament un tap. Sans cela, un teaser arriverait **sans tap**, contraire à la promesse. Comparer aussi les rangs de base qui apportent un teaser.
3. **Lumières par rang de base** : `fromBase` existe, mais une lumière ne peut pas s'éteindre (`untilBase` : lueur de la base 9, étincelle quand le bout de lunette bouge). Et `LightAnchor` n'a qu'une couleur (`isoLueur`) : il faut le vert, le bleu et le faisceau à deux tons.
4. **Sprite de nuit derrière la sphère** : `nightSprite` passe devant le bâtiment.
5. **Anneaux de glyphes, constellations, lucioles, respiration masquée au disque** : à écrire en code, avec le mouvement réduit.
6. **Réaction du gardien** : le saut du show s'applique au sprite `guardian`, et le Sage est dans le gag. Faire réagir le sprite du gag quand il n'y a pas de `guardian`.
7. **Sprites réels** : `IMAGES` est vide et les pièces sont des aplats en dp de carte. Même point que la carte du moulin.

## Questions
1. **Pour Guillaume, au checkpoint de verrouillage : les anneaux de glyphes et le faisceau.** Arbitré : on garde ce que le catalogue demande. Mara y voit un risque de portail et de colonne de butin. **Repli : l'aurore seule**, sans glyphes ni faisceau.
2. **Les atlantes ?** Ils ont échoué 12 fois au test des étrangers (« Well », puis « Champion Arena »), en A et en A2. Ils sont donc absents de cette carte, alors que le catalogue en fait le mythique. Guillaume confirme l'abandon ? Le catalogue dit aussi que 2 bâtiments finissent en statues : il n'en reste qu'un, la Salle des héros.
3. **Le disque peut se lire « portail ».** La lunette pointée dessus, l'ellipse penchée et la bande décentrée servent à l'éviter. Mara regarde à la sonde.
4. **Le noir du mythique.** Le croquis flouté à 96 dp reste à passer en G-ID. Risques : sucette, trophée. La contrefiche, la colonne en cône et les anneaux en patine sont là pour ça.
5. **Le noir du legendary** : un demi-anneau sur une colonne, sans précédent de test. G-ID est dur à ce stade. Si ça échoue, ajouter l'équateur au legendary, puis remesurer le passage au mythique.
6. **Le Sage en double** : le villageois marcheur (`marcheurs.ts`) peut sortir quand le gag le montre aussi. À regarder en capture.
