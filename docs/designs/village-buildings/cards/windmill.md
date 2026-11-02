# Carte : Moulin (windmill)

**Statut : brouillon, non gelé.** Corrigé après la revue de mara et theo, puis aligné sur les maquettes du tour 3. `scripts/bld/gen_pilot_specs.py` fait foi pour les formes et les positions. Rien n'est peint : les px hors maquette sont calculés avec la projection de `isoSpec.json`.

Repères utilisés :
- Grille : x et y de 0 à 2. (0,0) est le coin arrière, (2,2) le coin avant, en bas de l'écran. Face +y à gauche de l'écran, face +x à droite. z = hauteur.
- Canevas `building2x2` : 896 × 1344 px. Ancre : (2,2,0) en px (448, 1280). 1 unité de z = 235 px.
- Hypothèse d'échelle : 5 px de canevas = 1 dp (empreinte 154 dp au zoom 0,6). Donc 10 dp = 50 px et 14 dp = 70 px. À confirmer sur la première capture.

## 1. Identité
- **Famille** : muscle (épaules), rangs 1 à 10 par répétitions à vie. Règles A et B sans effet : aucune ligne de coupe sur ce bâtiment.
- **Gardien** : un meunier sans nom ni répliques.
- **Piliers** : P2 (les ailes, le chevalier), P3 (le moulin a capturé un orage), P4 (des sacs sur les épaules).
- **Crochet de silhouette**, à partir du repère « tour et chapeau » :
  1. un socle bas et une tour **fine qui s'affine vers le haut** ;
  2. un grand chapeau conique porté par deux jambes de force ;
  3. une **perche de queue** qui descend du chapeau jusqu'au coin droit, avec un cabestan au pied et une fente de ciel entre perche et tour.
- **Sans ses ailes** : une tour étroite, étayée à droite. L'observatoire est l'inverse : large, bas, un télescope qui monte à gauche. Avec ailes : le X.
- **Accents** : blanc de farine, ocre, puis bleu ciel délavé sur les ailes à partir de legendary.

Triche assumée : une vraie perche part à l'opposé des ailes, donc cachée derrière la tour pour cette caméra. Elle est tournée de 90° pour rester visible.

## 2. Ce qui ne change à aucun stade
- Emprise 2 × 2 et masque de contact : le losange entier, dalle 2 × 2 de 0,04, ancre identique.
- Socle : disque centre (1,1), r 0,78, jusqu'à z 0,16. Le fût part de r 0,66 à z 0,16.
- Porte sur la face +y, x de 0,82 à 1,18, posée sur le fût vers y 1,65, avec une marche dans le socle.
- Pied de la perche en (1,88 ; 0,12), px (786, 1088), perche r 0,08. Haut de la perche en (1,45 ; 0,55), à la base du chapeau.
- Deux jambes de force r 0,04, de part et d'autre de la perche, du fût (0,4 sous le chapeau) au dessous du chapeau (à r 0,70).
- Pierre chaude, bois, chapeau conique. Le chaume devient tuile à grand.

Le rough actuel a un fût de r 0,56 : il change pour tenir cette base.

## 3. Échelle des stades
Le rang change la hauteur, mais chaque stade doit d'abord se lire par son **nouvel élément**.

| Stade | Fût (`cone`, centre (1,1), part de z 0,16) | Chapeau : base z, r, sommet z | Pivot des ailes, échelle | Nouvel élément de silhouette, position |
|---|---|---|---|---|
| rough | r 0,66 à 0,54, h 1,04 | 1,2 ; 0,74 ; 1,7, chaume | (1,4 ; 1,4 ; 1,5), 0,85 | Tour courte étayée : perche et jambes de force, sans cabestan |
| solid | r 0,66 à 0,52, h 1,54 | 1,7 ; 0,78 ; 2,32, chaume | (1,49 ; 1,49 ; 2,08), 1,0 | Cabestan au pied de la perche : tambour r 0,16, h 0,12, centre (1,82 ; 0,18), avec deux barres en croix. Mât à fanion au sommet, jusqu'à z 2,8. Sacs : tas centre (0,4 ; 1,82), r 0,14, h 0,30, et un sac (0,6 ; 1,8), r 0,10, h 0,14 |
| grand | r 0,66 à 0,50, h 2,0 | 2,16 ; 0,84 ; 2,88, tuile | (1,54 ; 1,54 ; 2,59), 1,15 | Galerie en anneau, r 0,80, plancher à z 1,40, garde-corps r 0,77 jusqu'à z 1,67, ouvert là où passe la perche. Four au coin gauche (box (0,08 ; 1,28), 0,38 × 0,38 × 0,36), cheminée (0,18 ; 1,5), r 0,12, sommet z 1,25, px (195, 763) : c'est la fumée qui donne la hauteur. Le mât à fanion reste, jusqu'à z 3,3 |
| legendary | r 0,66 à 0,48, h 2,29 | 2,45 ; 0,88 ; 3,17, tuile | (1,55 ; 1,55 ; 2,88), 1,18 | Ailes bleu ciel délavé, pales larges (`width` 0,50). Mât rallongé jusqu'à z 3,7, girouette-flèche simple à z 3,55, longue de 0,9, tournée vers l'écran |
| mythic | comme legendary | comme legendary | comme legendary | **Élément dominant** : mât de fer jusqu'à z 3,8, px (448, 194), et **un petit orage en laisse**, en haut à droite, hors du disque des ailes. Voir ci-dessous |

**L'orage** :
- Nuage en enclume, aplati, pas une boule. Centre px (790, 110), 36 dp de large (180 × 70 px). En grille, à la verticale de (1,9 ; 0,12), z 4,17.
- **Hors du disque des ailes** : centre (448, 516), rayon 438 mesuré à l'échelle 1,18 et pales 0,50 (442 donné par mara, gardé comme limite). Le bord du nuage est à 468 px du centre, soit 26 px de marge.
- Chaîne molle depuis le mât, 3 dp au moins (15 px), aucune barre rigide ni rayon. Elle part du mât, à l'intérieur du disque : les pales passent devant elle.
- Idle : il tire sur sa chaîne comme un chien, puis il boude. 5 images.
- C'est un sprite posé par les données, pas une pièce du spec : à 90 px de demi-largeur, il sortirait de l'empreinte.

**Emplacement du gag** (libre à tous les stades) : disque centre (1,7 ; 1,7 ; 0), r 0,30, soit le coin avant, à droite du chemin de la porte. En px : (448, 1222), 33 dp de large. Hauteur jusqu'à z 0,45 (px 1117), z 0,9 pour la lance du rang 10 (px 1011). Le bord arrière du disque mord le socle de 0,09 : les figures se posent devant.

**Gardien** : repère en maquette, `cyl` r 0,08, h 0,33 en (0,72 ; 1,76), à gauche de la porte, px (248, 1134).

| Stade | Marque de clan | Gardien | Lumières | Boucle d'idle |
|---|---|---|---|---|
| rough | aucune | un sac sur une épaule | fenêtre | ailes rapiécées |
| solid | fanion, au mât du sommet | idem, adossé à la porte | fenêtre | ailes pleines |
| grand | bannière, face gauche sous la galerie (0,44 ; 1,57), z 0,9 à 1,4 | **un sac sur chaque épaule** | fenêtre, four | ailes, fumée de la cheminée (`cheminee`) |
| legendary | blason sculpté au-dessus de la porte | deux sacs **plus gros que lui** | idem | grandes ailes, fumée |
| mythic | blason lumineux, même place | deux sacs plus gros que lui, regarde le nuage | idem + lueur du nuage (ancre mobile) | ailes à rubans, fumée, orage |

**Mythic** :
- **Élément dominant** : le mât et l'orage en laisse.
- **Couche magique** : rubans de vent peints sur les ailes (visibles de jour), ailes qui luisent en bleu la nuit (version de nuit de la feuille). Le nuage a un éclair bleu lent la nuit.
- **Finale** : le pique-nique du rang 10.
- **Mouvement réduit** : ailes et nuage immobiles, chaîne molle, couleurs identiques.

**Ailes** : une feuille par stade dans le canevas `sails`, tournée par l'app. Rapiécées, pleines, grandes, bleu ciel, à rubans. Le code n'en lit qu'une aujourd'hui (`${code}_sails`), à étendre. Échelles 0,85 / 1,0 / 1,15 gardées : rien ne recule. Largeur des pales dans le spec : `width` 0,30 pour rough, solid et grand, 0,50 pour legendary et mythic (`length` 1,25, `hub` 0,09).

## 4. Table des rangs
| Rang | Nouveau | Sprite | Taille |
|---|---|---|---|
| 1 | stade rough | peinture + ailes | 154 dp de large |
| 2 | gag 1 | `gag_r2` | 21 dp |
| 3 | stade solid | peinture + ailes | |
| 4 | gag 2 | `gag_r4` | 21 dp |
| 5 | stade grand | peinture + ailes | |
| 6 | gag 3 | `gag_r6_cheval` + `gag_r6_chevalier` (tourne avec les ailes) | 16 dp chacun |
| 7 | stade legendary | peinture + ailes | |
| 8 | gag 4 | `gag_r8` | 16 dp |
| 9 | un âne seul, avec un paquetage de voyage, sans sacs, attaché à la perche, en (1,7 ; 0,4), px (698, 1098) | `addon_ane` | 18 dp |
| 10 | stade mythic + finale | peinture + ailes + orage + `gag_r10` | 16 dp, lance 40 dp |

## 5. Le gag : le chevalier et les géants [PD, Don Quichotte, 1605]
- **r2** : un chevalier maigre sur un cheval maigre fixe le moulin, lance dressée.
- **r4** : il charge, de trois quarts vers la tour, lance à l'horizontale (3 dp au moins), poussière.
- **r6** : il est accroché par la ceinture au tiers extérieur d'une aile et tourne avec elle, tête en bas bien visible. Le cheval, seul dans l'emplacement, lève la tête. Il reste coincé au rang 7, sur les ailes bleues.
- **r8** : assis, casque cabossé à côté de lui, il partage son pain avec son cheval.
- **r9** : à qui est cet âne, seul avec son paquetage ? Personne pour le dire.
- **r10, finale** : pique-nique sur une nappe avec son écuyer, qui répond à la question. La lance plantée à côté sert de mât, avec un simple ruban.

Le chevalier du r6 vit dans la vue qui tourne : une seule image, valable sur les ailes grand et legendary. C'est une nouvelle couche d'add-on (`ailes`) à coder. Il est sur la pale **en haut à droite à l'angle de repos**, pieds vers le bout : en mouvement réduit, l'aile s'arrête avec lui tête en bas, sur le ciel. Px au repos : (696, 335) au grand, (703, 261) au legendary.

## 6. Gag de chantier
Le même à chaque changement de stade : un nuage de farine blanchit deux ouvriers, 4 images. Le nuage grossit par échelle en code à legendary et mythic.

## 7. Le mythic en une phrase
« Mon moulin a attrapé un orage : il le tient en laisse au bout d'un paratonnerre, et ses ailes filent des rubans de vent. »

## 8. Clins d'œil
- **Source** : Don Quichotte, domaine public. Pas de [wink] à valider.
- **Jamais dessiné** : le dessin de Picasso, toute version de film ou de dessin animé, aucun texte ni nom.
- Tomber de l'aile donne des étoiles, jamais une blessure.

## 9. Rien ne disparaît
Cumulatif : chaque peinture contient tout ce qui est au-dessus d'elle, amélioré.

| Stade | La peinture contient |
|---|---|
| rough | socle, fût, chapeau, perche, jambes de force, porte, fenêtre |
| solid | tout le rough + cabestan, tas de sacs, mât à fanion |
| grand | tout le solid, mât à fanion compris + galerie, four, cheminée, bannière |
| legendary | tout le grand + mât rallongé, girouette, blason sculpté |
| mythic | tout le legendary + mât de fer, âne du rang 9 (`addon_ane` retiré des données), blason lumineux |

L'emplacement du gag change de contenu, et lui seul. **La couche `ailes` est déclarée comme une extension de cet emplacement** : le chevalier y reste aux rangs 6 et 7 et en sort au r8, comme n'importe quel temps du gag.

## 10. Lisibilité
- **Add-ons** : l'âne fait 18 dp, le cabestan 17 dp, tous deux sur le bord droit.
- **Figures** : 2 au plus. r2, r4 : chevalier + cheval. r6 : cheval dans l'emplacement + chevalier sur l'aile. r8 : les mêmes. r10 : chevalier + écuyer, l'âne est un add-on à part. Chantier : 2 ouvriers. Toutes font 14 dp ou plus.
- **Perche** : r 0,08, soit 8,7 dp de large. Dans la structure, donc hors règle des 10 dp.
- **Cheminée** : r 0,12, soit 13 dp.
- **Contact au sol** : tout dans le losange (pied de perche, four, sacs, âne, gag).
- **Canevas**, à l'échelle 1,18 :

| Élément | Haut en px | Bord droit en px |
|---|---|---|
| sommet legendary | 343 | |
| mât legendary | 218 | |
| mât de fer | 194 | |
| aile au plus haut (mesuré) | 78 | 886 |
| haut du nuage | 75 | 880 |

Tout tient dans 896 × 1344, à 10 px près à gauche et à droite pour les ailes en + (mesuré, `report.json`). L'échelle maximale des ailes avec des pales de 0,50 est 1,21.

**Maquette, ce que le spec ne sait pas dire** (`box`, `roof`, `cyl`, `cone`, `sails`) :
- Tour effilée, socle, galerie, perche, jambes de force, cabestan, four, girouette : faits. Le `cone` accepte `r2`, et `axis` incline la perche.
- **Le nuage et sa chaîne** : pas dans le spec, voir section 3. Le noir de test ne montre qu'une ellipse de remplacement, sans enclume ni chaîne, et seulement avec les ailes.
- `sails` ne fait que des pales rectangles : `length` et `width` suffisent pour la forme. Rapiéçage et rubans viennent de la peinture, pas de la maquette.
- Pas de personnages : repères `cyl` seulement.
- Bleu ciel : pas de matériau, indiqué au prompt FLUX.

## 11. Coût estimé
| Poste | Images retenues |
|---|---|
| Peintures de stade | 5 |
| Feuilles d'ailes | 5 |
| Gags | 6 |
| Âne | 1 |
| Orage | 5 |
| Chantier | 4 |
| **Total** | **26** |

Avec sondes et reprises, environ 75 images, soit 2,70 $ au plafond de 0,036 $ de Klein (`iso_loop.py`). Tarif de FLUX 3 Image non lu : le comparatif de méthodes sur une transition coûtera plus.

Ce qui a été retiré du catalogue :
- **Moulin sur tréteaux au rough** : la structure disparaîtrait au solid, et le contact au sol changerait.
- **Charrette de farine** : un tas de sacs suffit et prend moins de place.
- **Cristal** : il redoublerait le crochet de la tour du sorcier. Le « il alimente l'observatoire » tombe aussi : les deux bâtiments sont à 12 cases l'un de l'autre, rien ne les relierait à l'écran.
- **Girouette en coq** : la grange l'a déjà. Celle-ci est une flèche.
- **Pique-nique sur la galerie** : il sortirait de l'emplacement du gag.
- **Meunier au r8** : il serait deux fois à l'écran.
- **Nid de cigogne** : envisagé pour le rang 9, déjà pris par la tour de guet.

## À prouver en maquette
État après le tour 3 (`maquettes/r3/g-id.md`, `report.json`, `footprint.txt`).

**Prouvé, avec les limites du test** (2 étrangers sous-agents, qui n'ont vu que ces deux bâtiments, liste fermée de 21 noms) :
- Les 5 stades et le mythic flouté : nommés Windmill par les deux étrangers. Mythic « peu sûr » chez l'un, net et flouté.
- Noirs distincts de ceux de l'observatoire : aucune confusion entre les deux au tour 3.
- Empreinte identique à tous les stades, aucune pièce hors de l'empreinte. Ailes dans le canevas, en X et en +.
- La fente de ciel entre perche et tour se voit sur la planche, à tous les stades, sous les pales pour legendary et mythic.
- L'ellipse de remplacement du nuage reste claire des ailes, en X et en +.

**Pas prouvé** :
- La fente avec l'âne du r9, absent de la maquette.
- La chaîne, lisible malgré les pales qui passent devant, et le nuage en enclume : absents. Le mythic du jeu aura plus de signes que ce noir.
- La fente et les silhouettes à taille de téléphone : seul le mythic a été testé flouté.
- `hauteurMax` contre `heights.py` et `iso-layout` : relevé 1,7 / 2,8 / 3,3 / 3,7 / 3,8, mais `heights.py` ne lit pas `blockouts/bld/` et ce test n'a pas tourné. Le nuage doit être déclaré `mobile` pour ne pas compter. La règle d'écart des ombres peut réagir.

## Questions
1. **Orage en laisse ou cristal ?** La carte prend l'orage. Il flotte, mais attaché : « seule la tour du sorcier flotte » vise le bâtiment, à confirmer.
2. **Le Sage ou un astronome anonyme ?** (concerne l'observatoire) theo vote le Sage, mara l'anonyme. Par défaut : anonyme.
3. **Le jour de la mise à jour**, faut-il jouer le show pour un bâtiment redessiné dont le stade ne change pas ?
4. **Teintes à valider** : le bleu ciel des ailes, délavé et jamais saturé, proposition `#9DB8C2`, non testée. La patine de l'observatoire, proposition `#5E8A80`, non testée.
