# Carte : Observatoire (observatory)

**Statut : finale, à relire par theo et mara (section 9.1).** Direction C, le grand astrolabe, reprise par Guillaume. Remplace le brouillon de la prep : plus de titan, plus de faisceau d'orbite. Rien de l'aspect actuel n'est gardé, seule l'emprise reste.

**Chiffres** : mesurés sur un croquis noir projeté à la main (trait de 8 px), sans Blender. **Cette composition n'est pas celle qu'E1 a testée** : la lunette ne dépasse plus du cerceau, elle vise un disque à l'intérieur. G-ID est à repasser sur le vrai rendu avant toute peinture.

**Repères** :
- Grille x, y de 0 à 2, (2,2) devant. `px = 448 + 192 (x - y)`, `py = 1280 - 96,67 (4 - x - y) - 235 z`. Rayon `r` à l'écran : `r x 271,5` px.
- Canevas `building2x2` : **896 x 1344 px**, ancre (448, 1280).
- **5 px de canevas = 1 dp à l'écran**, au zoom de capture 0,6 sur le téléphone de test (vérifié sur les captures E1). 10 dp = 50 px, 14 dp = 70 px, 16 dp = 80 px.
- **Limites de `headroom.md`** : rien au-dessus de y = 64 (`anchorMarginPx`) ; H max 1154, le mythique fait 1123. Le test `iso-spec` et ses 200 px ne lit que les anciens stades : ne pas s'y caler.

## 1. Identité
- **Famille** : amélioration du moulin, règle B. Un marqueur et un tap par rang.
- **Gardien** : **le Sage**, déjà ancré ici dans `constants/villagers.ts`, sans répliques. Il vit dans l'emplacement du gag.
- **Piliers** : P1 (un morceau de nuit à midi), P2 (le hibou, la petite lune), P3 (la sphère se bâtit anneau par anneau), P4 (le bâtiment des épaules porte le ciel à bout de colonne).
- **Crochet de silhouette** : tambour large et bas, dôme décalé à droite, lunette en diagonale vers le haut à gauche, colonne, et en haut **une vraie sphère armillaire à trois anneaux croisés**. **Seul l'observatoire a des anneaux.**
- **Face au moulin** : le moulin est un X et un pic. Ici, une sphère ajourée sur un tambour bas.
- **Accents** : laiton mat, bleu nuit du disque, cuivre du dôme.
- **Références, texte seulement** : une sphère armillaire de la Renaissance, l'observatoire de Jantar Mantar pour la pierre, les grues de Guédelon pour le chantier.

## 2. Ce qui ne change à aucun stade
- Emprise 2 x 2, masque de contact, ancre. La dalle reste dans le spec (`plate()`, `_plate`) pour le test d'empreinte, **jamais envoyée à FLUX**.
- **Pas de sol dans la maquette ni dans la peinture.** `maquette_peinture.py` ajoute encore un sol olive : à retirer, fond magenta plat seul. Un sol à part, `observatory_sol`, peint une fois en contexte.
- Base centre (1 ; 1), r 0,85. Porte `box` `[0,84 ; 1,82 ; 0,04]`, `[0,32 ; 0,06 ; h]`, h 0,38 au rough, 0,55 ensuite, `accroche: porte`.
- Carte du ciel : `G.sky_map(z0, (1.62, 0.62))`, z0 0,53 au rough, 1,0 ensuite.
- Pierre, bois. Laiton **mat, jamais doré, jamais de reflet**.

**Matériaux à ajouter** (`materials` du spec et `DAY` de `maquette_peinture.py`, 3 tons haut, clair, ombre) :
- `laiton` : `#9A7B45`, `#9A7B45`, `#5E4C34`.
- `nuit` : `#1B2340`, `#1B2340`, `#141A30`.
- `fente` : `#15192A` pour les trois.

## 3. Échelle des stades

| Stade | Nouvel élément | Haut (y) | H | Aire | Croissance |
|---|---|---:|---:|---:|---|
| rough | Plateau de bois, lunette de bois sur trépied, carte du ciel | 553 | 643 | 171 k | |
| solid | Tambour, dôme de cuivre fente fermée, bout de lunette qui pointe, fanion | 507 | 689 | 239 k | +40 % aire |
| grand | **Le dôme s'ouvre** : fente sombre, volet levé, longue lunette de laiton, petite sphère armillaire sur la terrasse | 433 | 763 | 275 k | +10,7 % H, +15 % aire |
| legendary | Grande colonne de pierre, berceau en demi-anneau de laiton | 254 | 942 | 323 k | +23 % H |
| mythic | **La sphère complète : trois anneaux, le disque de ciel nocturne, la petite lune** | 73 | 1123 | 397 k | +19 % H, +23 % aire |

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
- **grand** (s'ajoute, la lunette change) :
  - `G.telescope(1.70, 2.69, 0.09, "laiton", sleeve=True, foot_xy=(1.25, 0.82), tip_xy=(1.026, 1.153))`.
  - **Fente sombre** : 3 `seg` r 0,10, `fente`, sur le dôme, azimut de la lunette `(-0,56 ; 0,83)` : de rayon 0,59 à z 1,50, à 0,52 à z 1,75, à 0,30 à z 1,97, puis à 0 à z 2,05. Elle se voit sur le profil gauche, et la lunette en sort.
  - **Volet levé** : `seg` (1,42 ; 0,86 ; 1,80) à (1,56 ; 0,72 ; 2,36), r 0,10 à 0,08 ; `seg` de là à (1,44 ; 0,84 ; 2,62), r 0,08 à 0,05, `iron`.
  - **Petite sphère de terrasse**, centre c = (1,64 ; 0,46 ; 1,82), à px (675, 669), 32 dp : socle `cyl` (1,64 ; 0,46 ; 1,0), r 0,14, h 0,08 ; tige r 0,05, h 0,45 ; 3 `G.ring(c, 0.30, n, 16, 0.03, "laiton")`, n = (0 ; 0 ; 1), `HOOP`, `MER` ; boule `G.ball(c, 0.06, 4, "laiton")`.
- **legendary** (s'ajoute, la lunette s'allonge) :
  - `G.telescope(1.70, 2.96, 0.09, "laiton", sleeve=True, foot_xy=(1.25, 0.82), tip_xy=(0.966, 1.242))`. Bout à px (395, 411).
  - Colonne : socle `cyl` (0,82 ; 1,46 ; 1,0), r 0,20, h 0,14, puis `cyl` z 1,14, r 0,14, h 1,81, `stone`.
  - **Berceau, moitié basse de l'anneau** : 24 `G.seg`, r 0,05, `laiton`, points `C + 0,66 (cos t * (0,7071 ; -0,7071 ; 0) - sin t * (0 ; 0 ; 1))`, t de 0 à 180°. `G.ring` ne fait que des cercles entiers : calculer ces points.
- **mythic** (s'ajoute, le berceau devient l'anneau entier) :
  - `G.ring(C, 0.66, HOOP, 48, 0.05, "laiton")`, `G.ring(C, 0.66, MER, 48, 0.05, "laiton")`, `G.ring(C, 0.66, EQ, 48, 0.05, "laiton")`. **Trois axes, une vraie sphère**, 27 px de large, 7 dp avec le trait. Ne pas prendre les normales x, y, z : le croquis a donné une boule pleine.
  - **Disque de ciel nocturne** : `G.cyl(C - 0.01 HOOP, 0.30, 0.02, "nuit", axis=HOOP)`, 33 dp de diamètre, centre px (325, 265). Cerclage `G.ring(C, 0.31, HOOP, 32, 0.02, "laiton")`. Prompt : **bleu nuit mat, quelques étoiles peintes, visible à midi, sans lueur, sans dégradé de portail.**
  - **La lunette vise le centre du disque** : son axe passe par C, et son bout est à 80 px du bord du disque, à peine entré dans la sphère. C'est ce qui évite la lecture « portail ».
  - **Petite lune** : `G.ball((1.177, 1.103, 4.034), 0.13, 8, "plaster")`, 14 dp, à px (462, 166), fixée sur l'anneau.
- **Repère gag** (`_marker`), tous stades : `cyl` (0,22 ; 1,78 ; 0,04), r 0,21, h 0,01.

**`check()` de `render_pilot.py` signalera la sphère** : elle déborde de l'empreinte **en l'air** jusqu'à y 2,12. C'est permis (Q11 de `decisions.md`) tant que le contact au sol reste dans le masque et que tout tient dans le canevas. Les pieds de la colonne restent sur la terrasse.

| Stade | Marque de clan, sprite | Gardien | Lumières | Boucle |
|---|---|---|---|---|
| rough | aucune | voir gag | aucune | carte qui bat, en code |
| solid | `fanion` | voir gag | `fenetre` (640, 1010), (348, 1056) | carte |
| grand | `banniere` | voir gag | idem, `fenetre` fente (372, 640) | carte |
| legendary | `blasonSculpte` | voir gag | idem + `beam` bout de lunette (395, 411), nuit | carte |
| mythic | `blasonLumineux` : le même sprite, lueur en code | voir gag | idem, le `beam` part du centre du disque (325, 265), + `crystal` au même point, nuit | carte |

- `clanMark` : **(210, 941)**, sur le tambour, à gauche de la porte. `gag.slot` : **(148, 1020)**.
- **Pas de sprite de nuit seule.**

**Mythic** :
- **Élément dominant** : la sphère armillaire.
- **Couche magique** : le disque de nuit, peint, visible à midi. La nuit, le faisceau part vers le ciel et le disque luit en code.
- **Finale** : le Sage salue la petite lune.
- **Mouvement réduit** : tout immobile, lumières fixes.

## 4. Table des rangs (règle B)
Un marqueur et un tap par ligne. Pas de marqueur à la base 8, rien n'y change. Tailles en dp à l'écran, décalage depuis l'ancre (448, 1280). XOR = part de la silhouette qui change (seuil 1,5 %).

| Rang | Nouveau | Sprite | Taille | Boîte (x, y) | Décalage | XOR |
|---|---|---|---|---|---|---:|
| Propre 1 | Stade rough + gag 1 | `rough.jour`, `gag_1` | gag 24 x 32 | slot | | |
| Propre 2 | Stade solid + gag 2 | `solid.jour`, `gag_2`, `fanion` | 24 x 32 | slot | | |
| Propre 3 | Stade grand + gag 3 | `grand.jour`, `gag_3`, `banniere` | 24 x 32 | slot | | |
| Base 6 | Teaser : premiers tambours de la colonne, sous une chèvre de levage, sur la terrasse | `teaser_b6` | 30 x 44 | 215-365, 660-880 | -158, -510 | 3 % environ |
| Base 7 | Stade legendary + gag 4 | `legendary.jour`, `gag_4`, `blasonSculpte` | 24 x 32 | slot | | |
| Base 9 | Teaser : échafaudage autour du berceau, le disque bâché qu'on hisse | `teaser_b9` | 46 x 48 | 205-435, 160-400 | -128, -1000 | 12 % environ |
| Base 10 | Stade mythic + finale | `mythic.jour`, `gag_5`, `blasonLumineux` | 24 x 32, sphère 72 | slot | | |

Données : `rank: 3, fromBase: 6 / 7 / 9 / 10`. Le rang propre reste plafonné à 3.

## 5. Le gag : la lunette du Sage
Une pile, pas deux figures côte à côte : l'emplacement fait 24 dp.
- **Propre 1** : le Sage observe le ciel depuis son tabouret, à la longue-vue.
- **Propre 2** : souriant, chope en main, il tient sa longue-vue à l'horizontale, vers le village. Il n'y a pas de taverne à montrer : la chope suffit.
- **Propre 3** : il dort sur son tabouret, un hibou de 14 dp perché sur la longue-vue.
- **Base 7** : une petite comète passe, il tombe de son tabouret, étoiles autour de la tête, jambes en l'air. Jamais une blessure. Le hibou s'envole.
- **Base 10, finale** : debout, il salue de la main la petite lune tout en haut, le hibou sur sa tête.

**Repli** (aucun `[wink]` ici, c'est au cas où G-WINK ou G-GAG échoue) : à Propre 2, si la chope ne se lit pas, le hibou se pose au bout de la longue-vue et bouche la vue. Le gag 3 reste.

## 6. Gag de chantier
Le même à chaque changement de stade : une carte du ciel s'envole, un ouvrier lui court après, 4 images. L'échafaudage `chantier` est un seul sprite, mis à l'échelle en code, un tiers du bâtiment au plus.

## 7. Le mythic en une phrase
« Mon observatoire vise un morceau de ciel de nuit, en plein midi, dans une sphère de laiton. »

## 8. Clins d'œil
- **Source** : aucune œuvre. Aucun `[wink]` à approuver.
- **Jamais dessiné** : une statue moderne d'Atlas, une figure seule tenant une boule, un portail de jeu, de l'or, des lettres, chiffres ou graduations.

## 9. Rien ne disparaît

| Stade | La peinture contient | Teaser fini | Retiré des données |
|---|---|---|---|
| rough | anneau de pierre, plancher, lunette, trépied, carte, porte | | |
| solid | tout (plancher devenu terrasse, trépied logé sous le dôme) + tambour, col, dôme, fenêtres | | |
| grand | tout + fente ouverte, volet, lunette de laiton, petite sphère | | |
| legendary | tout + colonne, berceau | `teaser_b6` : la colonne | `teaser_b6` |
| mythic | tout (berceau devenu anneau) + 2 anneaux, disque, cerclage, lune | `teaser_b9` : le disque | `teaser_b9` |

La marque de clan reste un sprite, à la même place, sa forme change. Seul l'emplacement du gag change de contenu.

## 10. Lisibilité
- **Teasers** : 30 et 46 dp de large, au bord de la silhouette. **Pas d'ajout hors teaser** : aucun rang n'en a besoin.
- **Figures** : 2 au plus (Sage + hibou), 16 et 14 dp. Chantier : 1 ouvrier et la carte.
- **Surcouches** : 2 au plus (teaser + gag). Au pire, à la base 9 : environ 20 % de la silhouette, sous 25 %.
- **Échafaudage** : 17 % du legendary à la base 9.
- **Contact au sol** : pied de gag (0,22 ; 1,79), tout le reste sur le tambour. Dans le losange.
- **Canevas** : haut à y 73, gauche à x 128, droite à x 768.

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
| Sprites de nuit seule | 0 |
| **Total** | **21** |

**21 x 2 essais x 0,07 $ = 2,94 $**, plus l'écran cible refait (2 variantes, 0,14 $) : **3,08 $**. `cibles_e1.py` compte 0,075 $ par image en 2x2, et le registre réserve 0,10 $ : prévoir 4,20 $ de réservation. Peinture neuve par stade, FLUX 3 Image, stade précédent en référence, finition (b).

## Moteur : ce qui manque
Ce que `buildingData.ts`, `BatimentMoteur.tsx` et `db/village.ts` ne savent pas encore dire. Avec test, à faire avant l'intégration.
1. **`Teaser.untilBase`** : `untilRank` compare le rang propre, plafonné à 3, donc `teaser_b6` et `teaser_b9` ne partiraient jamais.
2. **Marqueur aux bases 6 et 9** : `claimableBases` ne compare que les stades, donc seuls 7 et 10 réclament un tap. Sans cela, un teaser arriverait **sans tap**, contraire à la promesse. Comparer aussi les rangs de base qui apportent un teaser.
3. **Réaction du gardien** : le saut du show s'applique au sprite `guardian`, et le Sage est dans le gag. Faire réagir le sprite du gag quand il n'y a pas de `guardian`.
4. **Sprites réels** : `IMAGES` est vide et les pièces sont des aplats en dp de carte. Même point que la carte du moulin.

## Questions
1. **Les atlantes ?** Ils ont échoué 12 fois au test des étrangers (« Well », puis « Champion Arena »), en A et en A2. Ils sont donc absents de cette carte, alors que le catalogue en fait le mythique. Guillaume confirme l'abandon ? Le catalogue dit aussi que 2 bâtiments finissent en statues : il n'en reste qu'un, la Salle des héros.
2. **Le disque peut se lire « portail ».** La lunette pointée dessus sert à l'éviter. Mara regarde à la sonde. Si ça reste un portail : un disque plus petit (r 0,24) et plus d'étoiles, sans lueur.
3. **Le noir du mythique.** Le croquis, flouté à 96 dp, donne une sphère sur une tige avec la lunette à côté. Risque : une sucette, ou un trophée. À passer en G-ID. Si ça échoue : rapprocher la colonne du dôme pour élargir le V, et retirer la lune du noir.
4. **Le noir du legendary** : un demi-anneau sur une colonne, sans précédent de test. G-ID est dur à ce stade. Ajouter l'équateur dès le legendary le rendrait plus lisible, mais le passage au mythique tomberait à +7,7 % H et +13 % d'aire, sous le seuil. À trancher sur le rendu.
5. **Le Sage en double** : le villageois marcheur (`marcheurs.ts`) peut sortir quand le gag le montre aussi. À regarder en capture.
