# Les quartiers : trois directions
Texte seul, rien n'est peint ni posé. Pour le choix de Guillaume. Lois : règles 1, 2, 5, 6, 7, 11 à 17 de `direction/target.md`.

## Ce que le plan dit vraiment
Vérifié sur `constants/isoLayout.json`, `slots.json` et `ACCESSOIRES` (`alentours.ts`). Positions à l'écran calculées (x = gx - gy, y = gx + gy) et calées à l'oeil sur `t12-jour.png`, à une case près.
- **Aujourd'hui, aucun quartier à l'écran.** `quartiers.ts` calcule 50 pièces d'une case, mais elles ne sortent qu'en blocs de couleur, dans `dev-iso`. Il ne connaît pas les parvis : il ne peut pas servir tel quel. Les deux chaumières visibles sont le coin verrouillé.
- **Le sol cuit ne change que tous les 3 paliers.** `bandesJusqua` : t1-3, t4-6, t7-9, t10-12. Une pièce cuite ne peut donc pas séparer 8 de 9, ni 10, 11 et 12. Si elle doit changer à chaque palier, il faut couper les bandes, ou poser une image à plat (ci-dessous).
- **Aucun emplacement ne s'ouvre après le 10.** Les paliers 11 et 12 ne peuvent changer qu'en densifiant, ou par la campagne. **Q2 est à moitié hors cadre** sur la caméra fixe (gx - gy jusqu'à -23, le bord gauche est vers -19). Il ne fait pas une signature du palier 10. Même chose pour H2 et H3. Q1, Q3, Q4, Q5 et H1 sont dans le cadre.
- **Q1, Q3 et Q4 ne cachent rien** : ils sont derrière leurs voisins. **Q6 touche le pied du rempart** (gy 17, devant le mur en gy 16). Rien de haut sur la rangée gy 17 : seulement des jardins. `charrette_cassee_1` arrive en [15, 19] au palier 10. **`menhir_3` est dans Q4**, en [-4, -8], depuis le palier 7 : le quartier le contourne. **Q2** : `slots.md` dit 6x6 jusqu'à gx -2, `slots.json` et `slots.py` disent 5x6 jusqu'à gx -3. Je suis le json. **Q1 n'a pas d'accès** : sa ruelle part du chemin gy 2 par [5, 0] et [5, 1], entre carrière et mannequin. Dans le parvis, c'est un chemin peint et aucune pièce.

### Les cases libres près de la place
Q6, hors du mur, est à 6 cases du feu [12, 11], les autres slots à 12 ou plus. Ils ne peuvent pas border la rue de la place. Le plan garde pourtant de petits trous qui passent la règle du parvis, tous en herbe et ouverts avant le palier 6. `slots.py` ne les a pas vus parce qu'il veut 3x3. La règle 6 les réclame pourtant dès qu'ils dépassent 2 tuiles. Rien à gagner sur la rue gx 12 entre le feu et la porte, ni au sud de la place : tout y est parvis ou chemin.

| Id proposé | Cases | Taille | Du feu | À savoir |
|---|---|---|---|---|
| N1 | [7, 12] à [9, 12] | 3x1 | 3 | Le bord ouest de la place. `etal_1` est déjà en [9, 12] depuis le palier 6. Hauteur à surveiller : au-delà de 3 ou 4 demi-tuiles, il touche le coin gauche de la salle |
| N2 | [10, 6] et [12, 6] à [14, 6] | 1 + 3x1 | 5 | De chaque côté de la rue gx 11, derrière la salle et la forge. Le bas est caché par elles, ce qui ne gêne pas. [12, 6] est presque caché |
| N3 | [7, 4], [7, 5], [9, 4], [7, 6] à [9, 6] | 6 cases | 5 à 7 | Le long de la rue gy 5. En gy 6, derrière la salle, seuls les toits dépassent : c'est le deuxième rang |
| N4 | [3, 12] à [5, 13] | 3x2 | 7 | Le long de la ruelle gx 6, dans le mur, le plus grand trou du coeur. Sous lui, `linge_1` et le champ en gy 14 restent |
| N5 | [3, 9], [4, 9], [4, 8] | 3 cases | 8 | Tête du pont [2, 10], sur la rue gy 10, à gauche de la tente. Ne pas utiliser [3, 11] : il cacherait le pont |
| N6 | [15, 4] à [19, 5] | 5x2 | 6 à 8 | Derrière l'armurerie et le guet. `slots.md` dit « rien à l'est » parce qu'il veut 3x3 |

### Ce qu'un quartier peut faire pour le point focal
Honnêtement : **il peut encadrer, il ne peut pas éclairer.** L'oeil va au moulin à cause de ses ailes rouges sur un pré clair, et ce sont des pièces du joueur. La lumière de la place reste le travail de POLISH. Les quartiers apportent trois choses. **Des façades le long de la rue** (N1, N2), pour que la rue se lise et finisse au feu. **Un dégradé de valeur en trois marches** : autour de la place, moyen (N) ; à mi-distance, plus sombre (Q1, Q3, Q5, Q6) ; au loin, le plus sombre (Q4, Q2, H). Jamais plus clair que le pavé. **Rien de sombre juste derrière le moulin.** Le trou [-2, 4] à [1, 4] reste en jardins bas : des toits foncés feraient ressortir ses ailes rouges encore plus.

## Trois façons de poser une pièce
| Mode | Change quand | Passe devant un villageois ou un bâtiment | Coût |
|---|---|---|---|
| **Cuite** dans le sol | Tous les 3 paliers | Jamais | 144 Ko contre 112 par tuile touchée, jour et nuit (`echelle.md`), aucun noeud en plus |
| **À plat** : une image par emplacement, sous tout ce qui est debout | À n'importe quel palier | Jamais | 1 image montée par emplacement, un petit ajout de code |
| **Debout** : sprite trié en profondeur | À n'importe quel palier | Oui | 1 image montée par pièce |

Une pièce peut rester à plat si aucune rue ni aucun villageois n'est derrière elle à l'écran, à moins de sa hauteur. C'est vrai pour Q1, Q3, Q4, Q5 et Q2, tant que les villageois n'y entrent pas (à dire à VILLAGERS). C'est faux pour N1 à N5, et pour [15, 4] et [16, 4] (rues gx 11, gy 5, gy 10 et gy 3 tout près) : ces pièces sont debout. Q6 aussi, s'il a un toit. Pour A, les images à plat sont des montages des 8 pièces sur le sol : pas de peinture de plus, mais une passe de ruelles par palier, en contexte. Comptes : **jour seul, à doubler pour la nuit** (`.nuit.webp`).

## Direction A : La rue bâtie
**La ville part du feu et remonte la rue : le palier se lit à la distance jusqu'où les façades sont arrivées.**

| Lieu | 6 | 7 | 8 | 9 | 10 | 11 | 12 |
|---|---|---|---|---|---|---|---|
| N1, marché | `etal_1` | = | + 1 étal | 3 étals | = | **halle** à la place des étals | = |
| N2, pignons | 2 maisons | = | + 1 échoppe | = | + 1 | = | = |
| N3, toits du 2e rang | - | 1 | 2 | = | 5, derrière la salle | = | = |
| N4 | Jardins en lanières | + 1 maison | = | = | 2 maisons | = | **taverne** à leur place, jardin derrière |
| N5, tête de pont | Jardin | 1 maison | = | = | 2 | = | = |
| N6 | - | - | 2 maisons | 4 | = | 5 | = |
| Q1 | 3 maisons sur une ruelle depuis gy 2 | 5 | 8, arête de poisson | 9 | 14 et un atelier, 2e rang | = | **placette** : un puits, deux ateliers |
| Q3 | | | 4 maisons face à la rue gx -4 | 5 | = | 8, 2e rang | = |
| Q4 | | | | 3 cabanes à la lisière | = | 5 | 7 |
| Q5 | | 2 maisons, jardins | = | = | 4 | = | = |
| Q6 | | Jardins en gy 17, 1 remise | = | = | = | = | 2 remises |
| Q2 | | | | | Jardins, 3 maisons | 5 | 8 |

**Ce qui change d'un coup d'oeil** : **8**, le pré de l'ouest (Q3) n'est plus vide et Q1 a ses ruelles. **9**, la lisière du haut (Q4) et le rang de l'est. **10**, Q1 devient une ville, et des toits passent derrière la salle. **11**, la halle au bord de la place, et Q3 double. **12**, la taverne, la placette, Q4 complet.

- **Marché** : N1, sur la place. **Taverne** : N4, sur la ruelle du puits. **Ateliers** : Q1, côté carrière. **Petite place** : milieu de Q1, gardée plus sombre que la place du feu. **Point focal** : N1 et N2 bordent la place, N3 et N5 tiennent la rue, le dégradé fait le reste. Seule direction qui construit vraiment là où l'oeil doit aller.

| Palier | 6 | 7 | 8 | 9 | 10 | 11 | 12 | Total |
|---|---|---|---|---|---|---|---|---|
| Images neuves à peindre | 3 | 0 | 2 | 0 | 1 | 1 | 1 | 8 |
| Debout, montées | 2 | 5 | 10 | 13 | 19 | 19 | 18 | |
| À plat, montées | 3 | 5 | 6 | 7 | 8 | 8 | 8 | |

- **Force** : répond aux deux plaintes, avec peu de peintures. Un seul geste, cohérent avec la règle 2. **Risque** : N1 à N3 sont serrés. Une maison de trop et la règle 1 tombe : `check` doit tourner à chaque pose. Les paliers 11 et 12 reposent sur peu de pièces près du coeur : la vignette floutée peut ne presque pas bouger, le 11 surtout.

## Direction B : Les métiers
**Chaque quartier a son métier, reconnaissable à sa silhouette, et le palier se lit à quel métier vient d'arriver.**

| Lieu | 6 | 7 | 8 | 9 | 10 | 11 | 12 |
|---|---|---|---|---|---|---|---|
| Q1, maçons | 2 hangars, blocs | 3 | = | 4 | 6 | **grand hangar** à la place de 2 | + maisons entre eux |
| Q5, potiers | | 1 four, 1 maison | = | = | 2 fours | = | + maisons |
| Q6, charrons | | Jardins, 1 remise | = | = | = | = | 2 remises |
| Q3, maraîchers | | | Longs jardins, 3 maisons | 4 | = | 6 | + maisons |
| Q4, bûcherons | | | | Cabanes, grumes | = | **scierie** à la place d'une cabane | + maisons |
| Q2, vanniers | | | | | Séchoirs, 3 maisons | 5 | 7 |
| N1, marché | `etal_1` | = | = | = | = | = | **halle** |
| N4 | Jardins | = | = | = | = | = | **taverne** |

**D'un coup d'oeil** : **8**, les longs jardins à l'ouest. **9**, les tas de grumes et la lisière entamée, qui racontent F. **10**, Q1 s'étend. **11**, deux gros volumes neufs, hangar et scierie. **12**, les maisons remplissent entre les ateliers, les quartiers se rejoignent, la halle et la taverne arrivent.

- **Marché** : N1. **Taverne** : N4. **Ateliers** : partout, c'est le sujet. **Petite place** : cour du grand hangar, Q1. **Point focal** : presque rien, la halle et le dégradé. N2, N3, N5 et N6 restent vides ou en jardins. À POLISH de porter le reste.

| Palier | 6 | 7 | 8 | 9 | 10 | 11 | 12 | Total |
|---|---|---|---|---|---|---|---|---|
| Images neuves | 2 | 3 | 2 | 2 | 1 | 2 | 3 | 15 |
| Debout, montées | 0 | 1 | 1 | 1 | 1 | 1 | 4 | |
| À plat, montées | 2 | 4 | 5 | 6 | 7 | 7 | 7 | |

- **Force** : la plus grande variété, une phrase à dire à ses amis, et jamais une masse de toits identiques. Les paliers 8 à 11 se distinguent le mieux. **Risque** : deux fois plus de peinture. Des silhouettes de métier attirent l'oeil : il faut les éteindre, ou elles concurrencent le joueur (une scierie ressemble à un bâtiment à taper). Le point focal n'est pas réglé.

## Direction C : Les nappes
**Chaque emplacement est une seule grande peinture à plat, repeinte en version plus riche à certains paliers : une ville de toits sombres, autour d'une place qui reste seule à être claire.**

| Lieu | 6 | 7 | 8 | 9 | 10 | 11 | 12 |
|---|---|---|---|---|---|---|---|
| Q1 | Nappe a, 3 toits | = | Nappe b, 8 | = | Nappe c, 14 | = | Nappe d, 20 |
| Q5 | | Nappe a | = | = | Nappe b | = | = |
| Q3 | | | Nappe a | = | = | Nappe b | = |
| Q4 | | | | Nappe a | = | = | Nappe b |
| Q2 | | | | | Nappe a | = | Nappe b |
| N4, puis Q6 au 7 | Jardins (cuits) | = | = | = | = | = | = |
| N1 | `etal_1` | = | = | = | = | = | **halle**, debout |

**D'un coup d'oeil** : chaque palier repeint une grande surface, donc la vignette bouge à coup sûr. **8**, Q3 naît et Q1 double. **9**, Q4 naît. **10**, Q1 change de nature. **11**, Q3 s'épaissit. **12**, Q1 et Q4 finis.

- **Marché** : N1, seule pièce debout. **Taverne et ateliers** : peints dans la nappe d de Q1. **Petite place** : milieu de la nappe d. **Point focal** : par contraste seul, la masse sombre autour fait monter la clarté de la place. Aucune façade près du feu.

| Palier | 6 | 7 | 8 | 9 | 10 | 11 | 12 | Total |
|---|---|---|---|---|---|---|---|---|
| Images neuves, surtout grandes | 2 | 2 | 2 | 1 | 3 | 1 | 4 | 15 |
| Debout, montées | 0 | 0 | 0 | 0 | 0 | 0 | 1 | |
| À plat, montées | 1 | 3 | 4 | 5 | 6 | 6 | 6 | |

- **Force** : la règle 1 tient par construction, rien ne passe jamais devant un bâtiment. Le moins de noeuds montés, et la plus grande masse à l'écran. **Risque** : se lit comme un tapis, sans relief, et aucun villageois ne peut y entrer. Chaque version doit garder les toits de la précédente, or une chaîne de repeintures dérive et recule (vu sur la croissance par paliers) : il faudrait un montage, ce qui revient presque à A. Le coeur reste nu, donc les trous de la règle 6 aussi.

## Les hameaux H1, H2, H3 (proposition F)
Ce ne sont pas des quartiers, mais je les **étalerais**, parce qu'il manque de quoi changer aux paliers 10 à 12. H1 cabanes au 7, hameau au 9 (F dit hameau de 7 à 9, et H1 est dans le cadre, sur un pré déjà peint). H2 première ferme au 10, deuxième au 11. H3 bourg au 12. À changer dans `slots.json`. H2 et H3 étant à moitié hors cadre, ils ne suffisent pas seuls à séparer les paliers sur la vignette. Le bourg reste plus sombre que le coeur, sa halle n'est pas celle de N1.

## Pièces à peindre en concept
A, puis B, puis C. Fond magenta plat pour le détourage.

| Id | Lieu | Paliers | Cases | Prompt FLUX |
|---|---|---|---|---|
| A1 | N2, N3, N5, Q | 6+ | 1x1 | Small low cottage, isolated isometric 2:1 view, dark grey slate roof, dull plaster and dark timber walls, one small chimney, hand-inked outlines, muted desaturated palette, flat magenta background, no people, no letters, no flags, no red roofs, no painted cast shadow, no diamond-shaped ground plate |
| A2 | N4, Q | 6+ | 2x1 | Long low cottage, isolated isometric 2:1 view, dark weathered thatch roof, dull stone walls, hand-inked outlines, muted desaturated palette, flat magenta background, no people, no letters, no flags, no red roofs, no painted cast shadow, no diamond-shaped ground plate |
| A3 | N4, N5, Q5, Q6 | 6+ | 3x2 | Narrow strip gardens with low hurdle fences and dark soil rows, isolated isometric 2:1 view, very low, hand-inked outlines, muted dull greens and browns, flat magenta background, no people, no letters, no flags, no red roofs, no painted cast shadow, no diamond-shaped ground plate |
| A4 | N1 | 8-10 | 1x1 | Small market stall with plain faded grey canvas on a timber frame, crates beneath, isolated isometric 2:1 view, hand-inked outlines, muted desaturated palette, flat magenta background, no stripes, no people, no letters, no flags, no red roofs, no painted cast shadow, no diamond-shaped ground plate |
| A5 | Q1, N6 | 8+ | 2x1 | Low timber workshop with an open lean-to and stacked planks, slate roof, isolated isometric 2:1 view, hand-inked outlines, muted desaturated palette, flat magenta background, no people, no letters, no flags, no red roofs, no painted cast shadow, no diamond-shaped ground plate |
| A6 | N3, Q1, Q3 | 10+ | 2x1 | Narrow half-timbered town house with one upper floor, steep dark slate roof, dull walls, isolated isometric 2:1 view, hand-inked outlines, muted desaturated palette, flat magenta background, no people, no letters, no flags, no red roofs, no painted cast shadow, no diamond-shaped ground plate |
| A7 | N1 | 11+ | 3x1 | Long low open market hall, heavy timber posts, dark slate roof, empty trestles beneath, isolated isometric 2:1 view, hand-inked outlines, muted desaturated palette, flat magenta background, no people, no letters, no flags, no red roofs, no painted cast shadow, no diamond-shaped ground plate |
| A8 | N4 | 12 | 3x2 | L-shaped low tavern around a small yard with barrels and a bench, dark thatch roof, dull stone walls, isolated isometric 2:1 view, hand-inked outlines, muted desaturated palette, flat magenta background, no sign, no people, no letters, no flags, no red roofs, no painted cast shadow, no diamond-shaped ground plate |
| B1 | Q1 | 6+ | 2x1 | Low masons' shed with cut stone blocks stacked beside it, slate roof, isolated isometric 2:1 view, hand-inked outlines, muted desaturated palette, flat magenta background, no people, no letters, no flags, no red roofs, no painted cast shadow, no diamond-shaped ground plate |
| B2 | Q1 | 11+ | 3x2 | Wide low stone-yard hangar on timber posts around a small working yard, slate roof, isolated isometric 2:1 view, hand-inked outlines, muted desaturated palette, flat magenta background, no people, no letters, no flags, no red roofs, no painted cast shadow, no diamond-shaped ground plate |
| B3 | Q5 | 7+ | 2x2 | Small potter's yard with a squat domed clay kiln and a low hut, dark thatch roof, isolated isometric 2:1 view, hand-inked outlines, muted desaturated palette, flat magenta background, no flames, no people, no letters, no flags, no red roofs, no painted cast shadow, no diamond-shaped ground plate |
| B4 | Q3 | 8+ | 3x3 | Market gardener's cottage among long narrow vegetable strips, dark thatch roof, isolated isometric 2:1 view, hand-inked outlines, muted dull greens, flat magenta background, no people, no letters, no flags, no red roofs, no painted cast shadow, no diamond-shaped ground plate |
| B5 | Q4 | 9+ | 2x1 | Woodcutter's low cabin with stacked logs and fresh stumps, shingled dark roof, isolated isometric 2:1 view, hand-inked outlines, muted desaturated palette, flat magenta background, no people, no letters, no flags, no red roofs, no painted cast shadow, no diamond-shaped ground plate |
| B6 | Q4 | 11+ | 3x2 | Low open sawpit shed with long logs on trestles, dark roof, isolated isometric 2:1 view, hand-inked outlines, muted desaturated palette, flat magenta background, no people, no letters, no flags, no red roofs, no painted cast shadow, no diamond-shaped ground plate |
| B7 | Q2 | 10+ | 2x1 | Low basket-weavers' cottage with reed drying racks, dark thatch roof, isolated isometric 2:1 view, hand-inked outlines, muted desaturated palette, flat magenta background, no people, no letters, no flags, no red roofs, no painted cast shadow, no diamond-shaped ground plate |
| B8 | N1 | 12 | 3x1 | Même prompt que A7 |
| C1 | Q1 | 6-7 | 6x6 | Meadow patch with three small dark cottages on one dirt lane, isolated isometric 2:1 view, hand-inked outlines, muted desaturated palette, flat magenta background, no people, no letters, no flags, no red roofs, no painted cast shadow, no diamond-shaped ground plate |
| C2 | Q1 | 10-11 | 6x6 | Dense small town quarter with a central lane and side lanes in a fishbone pattern, varied low slate and dark thatch roofs, strip gardens, isolated isometric 2:1 view, hand-inked outlines, muted desaturated palette, flat magenta background, no people, no letters, no flags, no red roofs, no painted cast shadow, no diamond-shaped ground plate |
| C3 | Q1 | 12 | 6x6 | The same kind of dense town quarter with a tiny square and a well at its centre, an L-shaped tavern and two workshops, varied low roofs, isolated isometric 2:1 view, hand-inked outlines, muted desaturated palette, flat magenta background, no sign, no people, no letters, no flags, no red roofs, no painted cast shadow, no diamond-shaped ground plate |
| C4 | Q3 | 8-10 | 4x6 | Four low cottages along one edge of a dirt lane with strip gardens behind, varied dark roofs, isolated isometric 2:1 view, hand-inked outlines, muted desaturated palette, flat magenta background, no people, no letters, no flags, no red roofs, no painted cast shadow, no diamond-shaped ground plate |
| C5 | Q4 | 9-11 | 5x4 | Three woodcutters' cabins in a clearing with stumps and stacked logs, very dark muted palette, isolated isometric 2:1 view, hand-inked outlines, flat magenta background, no people, no letters, no flags, no red roofs, no painted cast shadow, no diamond-shaped ground plate |
| C6 | N1 | 12 | 3x1 | Même prompt que A7 |

## Mon choix
**A, La rue bâtie**, seule à répondre au point focal avec 8 peintures. Elle prend de C l'image à plat pour Q1 à Q5, et un peu de B : les cabanes et les grumes de Q4, qui racontent F. Son point faible est le palier 11 : à regarder en premier sur la vignette floutée. Si le 10 et le 11 restent trop proches, avancer la moitié de Q3 au 10 et l'autre au 11. **À décider** : Guillaume valide-t-il d'utiliser N1 à N6, et de faire passer `etal_1`, à rayures, à un étal gris au palier 8 (règle 11) ? **À vérifier sur rendu** : aucune hauteur n'a été testée avec `check`, et un quartier peut gêner une accroche même hors parvis.

## Audit rapide, sur le texte seul (05/11)

| Juge | Classement | Dit | Corrigé dans les concepts |
|---|---|---|---|
| theo (plaisir) | A, B, C | A au 11 ennuie, la halle seule. B : le meilleur 11, la scierie, et les grumes qui entament la lisière racontent F. C : un tapis, rien à raconter | A prend la scierie de B au 11 dans Q4, ses cabanes et ses grumes au 9 |
| mara (art) | A, C, B | Toits d'ardoise sombres = les points les plus sombres du coeur, ils voleraient l'oeil. Une maison 1x1 fait 20 dp : un point. Seuls les groupes de 3 et les jardins se lisent | Toits gris-brun chauds de valeur moyenne, jamais plus sombres que le joueur voisin ; formes simples ; prompts A4, A6, A7, A8, B2, B5, B6, C1 à C5 repris |
| env (sol) | A, B, C | Une maison sans pied peint flotte. A1 répété 15 fois = lotissement. Ruelles droites = quartier plaqué. La nappe de C a une couture sur tout son contour. N4 3x2 trop serré pour une taverne en L | 3 variantes d'A1, miroir, ruelles courbes raccordées en patte d'oie, décal de pied à la pose, N4 sans cour en L, échelle calée sur la salle et la forge |

**Reste vrai après correction** : aucune hauteur n'est testée avec `check`. Env demande un toit chaud par groupe de 6, ce qui contredit la règle 11 (la tuile rouille est au joueur) : question pour Guillaume.
