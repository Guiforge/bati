# Carte : Observatoire (observatory)

**Statut : brouillon, non gelé.** Corrigé après la revue de mara et theo, puis aligné sur les maquettes du tour 3. `scripts/bld/gen_pilot_specs.py` fait foi pour les formes et les positions. Rien n'est peint : les px hors maquette sont calculés avec la projection de `isoSpec.json`.

Repères utilisés :
- Grille : x et y de 0 à 2. (0,0) est le coin arrière, (2,2) le coin avant, en bas de l'écran. Face +y à gauche de l'écran, face +x à droite. z = hauteur.
- Canevas `building2x2` : 896 × 1344 px. Ancre : (2,2,0) en px (448, 1280). 1 unité de z = 235 px.
- Hypothèse d'échelle : 5 px de canevas = 1 dp (empreinte 154 dp au zoom 0,6). Donc 10 dp = 50 px et 14 dp = 70 px. À confirmer sur la première capture.

## 1. Identité
- **Famille** : amélioration du moulin (débloquée au rang 3 du moulin). Cible : règle B. Ligne de coupe A marquée partout.
- **Gardien** : un astronome sans nom ni répliques (voir Questions).
- **Piliers** : P1 (le titan), P2 (le hibou, la lune qui tourne), P3 (la sphère qui devient le globe du titan), P4 (le bâtiment des épaules : un titan lève le monde à bout de bras).
- **Crochet de silhouette**, à partir du repère « dôme fendu sur une tour basse » : un **tambour large et bas**, un col, un dôme rond, et un **long télescope qui monte en diagonale vers la gauche**, loin hors du dôme. Il doit se lire télescope, pas canon. À legendary et mythic, il forme un V avec la colonne puis le titan, à droite.
- **Face au moulin** : le moulin est haut, étroit, effilé, et sa perche descend à droite. L'observatoire est large et bas, et son télescope monte à gauche. Il n'a plus de galerie : c'est ce qui les rendait jumeaux.
- **Accents** : cuivre, patine sarcelle sur le dôme. Hex à valider (voir Questions).

## 2. Ce qui ne change à aucun stade
- Emprise 2 × 2 et masque de contact : le losange entier, dalle 2 × 2 de 0,04, ancre identique.
- Base : disque centre (1,1), r 0,85.
- Porte sur la face +y, x de 0,84 à 1,16.
- Le télescope : pied (1,1 ; 1,1), bout en (0,5 ; 1,84), px x 191. Il s'allonge et se redresse à chaque stade.
- Pierre, bois, cuivre.

**Forme du télescope** : 3 sections en `cone` évasé avec `axis`, qui finissent à r 0,13 au bout. Bague r 0,16 à chaque raccord et au bout. Contrepoids `cyl` r 0,12, long de 0,2, derrière le pied.
- **Départ** : r 0,09 au rough (pied visible), r 0,075 à partir du solid (pied caché).
- **Sortie du dôme** : environ r 0,10, soit 10,5 dp, à 40 % de la longueur.
- **Du grand au mythic** : manchon r 0,16 sur les derniers 0,34, pour que le bout soit épais en noir.

**Le col** : à partir du solid, `cyl` r 0,60, centre (1,1 ; 1,1), de z 1,0 à 1,45, entre le tambour et le dôme. La marche se voit en noir.

Le rough et le solid actuels (tour étroite r 0,62, galerie, centre (0,95 ; 0,9)) sont à refaire. Le corps du nouveau solid est plus bas que l'ancien (dôme à z 2,05 contre 2,55), mais le télescope monte à y 462, contre 473 aujourd'hui : le sommet ne recule pas.

## 3. Échelle des stades

| Stade | Corps | Nouvel élément de silhouette, position | Haut, px |
|---|---|---|---|
| rough | Anneau de pierre r 0,85, jusqu'à z 0,5 ; plancher de bois r 0,80, jusqu'à z 0,53 | **Pas de dôme** : un plateau plat et un gros télescope, de z 1,55 à 2,55, sur un **trépied bien visible** (3 pieds r 0,05), contrepoids visible. Carte du ciel sur pieds au bord droit (1,6 ; 0,6), 22 × 16 dp | télescope, 521 |
| solid | Tambour r 0,85, jusqu'à z 1,0 (terrasse) ; col r 0,60 | **Dôme rond**, centre (1,1 ; 1,1), r 0,60, de z 1,45 à 2,05, en 3 `cone`. Télescope : pied z 1,1, bout z 2,8. Mât à fanion au sommet du dôme, jusqu'à z 2,6 | télescope, 462 |
| grand | Comme solid | **Télescope plus long, de laiton, avec manchon**, bout z 3,2. Fanion descendu sur la terrasse, mât (1,7 ; 1,25) jusqu'à z 1,75. Bannière sur le tambour (0,42 ; 1,66). **Ni volets ni fente en maquette : la fente n'existe qu'en peinture** | télescope, 368 |
| ---- | **ligne de coupe A** | Tout ce qui suit disparaît sous la règle A. **Le faisceau doit alors passer au grand** : c'est ce dont la règle A a besoin pour que ce stade ne reste pas sans magie | |
| legendary | Comme grand | **Colonne courte et épaisse, sphère basse, à droite**, en V avec le télescope. Socle (1,30 ; 0,5), r 0,26, z 1,0 à 1,12. Colonne r 0,20 jusqu'à z 1,6, puis tige r 0,07 jusqu'à z 1,88. Sphère armillaire r 0,42, centre (1,34 ; 0,52 ; 2,30), px (605, 534). **2 planètes** : r 0,10 au-dessus (sommet z 2,9), r 0,07 à droite. Carte du ciel en (1,65 ; 0,95) | planète, 393 |
| mythic | Comme grand, carte en (1,65 ; 0,95) | **Élément dominant : un titan assis au bord du tambour, une jambe pendante, le globe à bout de bras**. Globe plein r 0,40, centre (1,42 ; 0,47 ; 3,62), px (630, 226) | globe, 132 |

**Le titan**, tel que la maquette le montre. Il n'est plus à genoux sur un socle : il se lit **assis sur le bord, une jambe qui pend hors du tambour jusqu'au sol**. Sera en **cuivre patiné mat, jamais d'or** (en maquette : matériau `tile`), pour se distinguer de la pierre.
- **Socle** : pierre, centre (1,30 ; 0,35), r 0,20, z 1,0 à 1,4, px y 819 à 725.
- **Torse** : `cone` évasé, r 0,16 à 0,26, z 1,4 à 2,2.
- **Tête** : boule r 0,15, z 2,27 à 2,57, px y 450 au sommet.
- **Jambe** : cuisse r 0,13 vers (1,76 ; 0,18 ; 1,55), tibia r 0,10 tout droit jusqu'au sol, pied (box 0,32 × 0,20 × 0,12). Elle se pose hors du tambour, à px (751, 1073), dans le losange.
- **Bras** : chacun deux `cyl` r 0,10, coudes écartés, px (761, 495) et (467, 413). Mains à z 3,28 et 3,3. **Les deux trous entre bras et tête sont le signal.**
- **Globe** : tenu par les mains, pas sur les épaules, avec 130 px d'air au-dessus de la tête. Bande à l'équateur, à plat, pas d'anneaux en l'air.

**Points de construction** :
- Le globe est centré en (1,42 ; 0,47) et non sur le titan, pour rester dans l'empreinte.
- Le socle du titan dépasse la terrasse de 0,07 à l'arrière droit. Il faut un corbeau peint sous le débord.
- Le socle de la colonne (r 0,26) mord le col de 0,23, et cela se voit.

**Les anneaux** de la sphère : 3 anneaux, 16 segments `cyl` r 0,035 par anneau (3,8 dp), générés par script. Pas de disques pleins : les trous doivent se voir.

**Emplacement du gag** (libre à tous les stades) : disque centre (0,22 ; 1,78 ; 0), r 0,22, soit le coin gauche, sur le bord de la silhouette. En px : (148, 1088), 24 dp de large. On empile : l'astronome, le hibou au-dessus, jusqu'à z 0,9 (px 876).

**Gardien** : il vit dans l'emplacement du gag. Pas de second exemplaire en peinture.

| Stade | Marque de clan | Gardien | Lumières | Boucle d'idle |
|---|---|---|---|---|
| rough | aucune | voir gag | aucune | carte du ciel qui bat au vent, 3 images |
| solid | fanion au sommet du dôme | voir gag | 2 fenêtres, fente peinte | carte |
| grand (fin sous A) | bannière sur le tambour, à gauche de la porte ; fanion sur la terrasse | voir gag | idem, fente large peinte (faisceau sous A) | carte |
| legendary | blason sculpté au-dessus de la porte (0,92 ; 1,83 ; 0,7) | voir gag | idem + faisceau (ancre mobile) | bras à 2 planètes autour de la sphère, carte |
| mythic | blason lumineux, même place | voir gag | idem + constellations sur le globe | bras à la lune autour du globe, carte |

**Mythic** :
- **Élément dominant** : le titan et son globe.
- **Couche magique** : le jour, la lune qui tourne et les constellations peintes sur le globe (sarcelle, sans éclat). La nuit, les mêmes lignes tracées en lumière, dessinées en code.
- **Finale** : le gardien salue la lune.
- **Mouvement réduit** : bras immobiles, lignes allumées, faisceau fixe.

**Le faisceau** (en code, absent de la maquette) : part du sommet du dôme, px (448, 620), penche de 20° à gauche, s'éteint en dégradé vers px (237, 40). Environ 123 dp, dans le canevas : depuis ce nouveau départ, les 137 dp prévus sortaient par le haut. Il passe à droite du télescope.

**Les bras** (en code, absents de la maquette, qui ne montre que les 2 planètes fixes) : deux bras inégaux, 176 et 110 px, à 120° l'un de l'autre. Pivot sur la sphère (605, 534), puis sur le globe (630, 226). L'orbite est une ellipse (rx = bras, ry = moitié, comme un cercle horizontal vu par cette caméra), donc **ce n'est plus le mécanisme des ailes**. En code : bras dans un conteneur aplati à 50 %, planètes à part pour rester rondes, et bascule de couche aux deux bouts de l'ellipse. Sur la moitié arrière, le sprite passe sous la peinture du bâtiment, et la lune passe ainsi derrière le globe. Lune 14 dp, sur le grand bras. Le tout tient dans le canevas (x max 841, y min 103). Le juge d'animation tranche.

## 4. Table des rangs (règle B)
| État | Nouveau | Sprite | Taille |
|---|---|---|---|
| Propre 1 | stade rough + gag 1 | peinture, `gag_1` | 16 dp |
| Propre 2 | stade solid + gag 2 | peinture, `gag_2` | 16 dp |
| Propre 3 | stade grand + gag 3 | peinture, `gag_3` | 16 dp |
| ---- | **ligne de coupe A : fin ici, le gag 3 devient la finale, le faisceau passe au grand** | | |
| Moulin 7 | stade legendary + gag 4 | peinture, bras, planètes, `gag_4` | 16 dp, bras 70 dp |
| Moulin 8, 9 | rien ici : le cadeau est sur le moulin | | |
| Moulin 10 | stade mythic + finale | peinture, bras, lune, `gag_5` | 16 dp, globe 43 dp |

## 5. Le gag : l'astronome et son hibou
- **Propre 1** : assis sur un tabouret, il observe le ciel à la longue-vue (3 dp sur 14 dp au moins).
- **Propre 2** : un hibou s'est posé au bout de la longue-vue, et bouche la vue. Il n'a rien remarqué.
- **Propre 3** : il dort, et c'est le hibou, juché au-dessus de lui, qui regarde dans la longue-vue.
- **Legendary** : une petite comète est tombée dans un tas de paille et fume. La paille est sous lui : il est à la renverse dessus, jambes en l'air, étoiles autour de la tête. Le hibou est en plein vol au-dessus.
- **Mythic, finale** : debout sur son tabouret, il salue la petite lune qui passe, le hibou sur la tête.

## 6. Gag de chantier
Le même à chaque changement de stade : une carte du ciel s'envole, un ouvrier lui court après, 4 images.

## 7. Le mythic en une phrase
« Sur mon observatoire, un titan assis lève le ciel à bout de bras, et une petite lune lui tourne autour. »

## 8. Clins d'œil
- **Source** : Atlas [PD]. La maquette a quitté la pose à genoux de l'Atlas Farnèse : il est assis, globe à bout de bras.
- **Jamais dessiné** : toute statue moderne d'Atlas. Le globe est plein, avec ses bandes à plat : **un Atlas portant une sphère en anneaux évoquerait la statue du Rockefeller Center.** Pas de lettres ni de signes sur le globe, seulement des lignes et des points.

## 9. Rien ne disparaît
Cumulatif : chaque peinture contient tout ce qui est au-dessus d'elle, amélioré.

| Stade | La peinture contient |
|---|---|
| rough | anneau, plancher, télescope, trépied, contrepoids, carte du ciel en (1,6 ; 0,6), porte |
| solid | tout le rough (plancher devenu terrasse, trépied et contrepoids logés sous le dôme, carte fixée à la terrasse) + tambour, col, dôme, fanion, 2 fenêtres |
| grand | tout le solid + télescope plus long avec manchon, fente peinte, bannière. Le fanion descend sur la terrasse |
| legendary | tout le grand + socle, colonne, sphère, 2 planètes, blason sculpté. **La carte passe en (1,65 ; 0,95)**, pour ne pas cacher la colonne |
| mythic | tout le legendary (colonne devenue socle du titan en (1,30 ; 0,35), sphère devenue globe, ses anneaux devenus bande à plat) + titan, blason lumineux |

Les bras ne quittent pas les données : le grand bras passe à sa variante lune. Seul l'emplacement du gag change de contenu.

## 10. Lisibilité
- **Figures** : 2 au plus (astronome + hibou), 16 dp l'astronome, 14 dp le hibou. Chantier : 1 ouvrier.
- **Add-ons** : la carte fait 22 × 16 dp, les bras restent au bord de la silhouette.
- **Place du gag** : 24 dp de large, donc une pile, pas deux figures côte à côte.
- **Contact au sol** : tout dans le losange, y compris le pied du titan.
- **Canevas** : le haut du globe est à y 132, il reste de la marge. Le bord droit des bras est à 841.

**Maquette, ce que le spec ne sait pas dire** (`box`, `roof`, `cyl`, `cone`, `sails`) :
- Tambour, col, dôme rond, télescope évasé, trépied, colonne : faits.
- Anneaux : faits par script (48 `cyl` avec `axis`).
- **Pas de sphère** : globe en pile de 8 `cone`. La bande à l'équateur tient dans la pile, une bande oblique viendrait de la peinture.
- **Pas de personnage** : le titan est un mannequin (torse `cone`, tête en pile, membres `cyl` avec `axis`). FLUX peut encore le durcir : à sonder dès que possible.
- **Bras et faisceau** : pas dans le spec. Bras peints directement sur magenta, faisceau en code.
- **Fente** : pas dans le spec, peinture seule.
- Figures : aucune, un disque plat marque l'emplacement en maquette.
- Cuivre et sarcelle : pas de matériau, indiqués au prompt FLUX.

## 11. Coût estimé
| Poste | Images retenues |
|---|---|
| Peintures de stade | 5 (3 sous A) |
| Bras, planètes, lune | 4 (0 sous A) |
| Gags | 5 (3 sous A) |
| Carte qui bat au vent | 3 |
| Chantier | 4 |
| **Total** | **21 (13 sous A)** |

Avec sondes et reprises, environ 60 images, soit 2,20 $ au plafond de 0,036 $ de Klein (`iso_loop.py`). Tarif de FLUX 3 Image non lu. Le tour 3 ne change pas ce compte.

Ce qui a été retiré du catalogue :
- **Télescope pointé vers la taverne** : il n'y a pas de taverne, et rien ne se lirait à 16 dp.
- **Sphère armillaire au grand et orrery au legendary** : fusionnées, une seule sphère au legendary, qui devient le globe.
- **Comète qui traverse le ciel** : une comète tombée dans la paille tient dans l'emplacement et reste drôle.
- **Constellation en forme de blason** : illisible sur le globe, et la marque de clan a déjà sa forme lumineuse.

## À prouver en maquette
État après le tour 3 (`maquettes/r3/g-id.md`, `report.json`, `footprint.txt`).

**Prouvé, avec les limites du test** (2 étrangers sous-agents, qui n'ont vu que ces deux bâtiments, liste fermée de 21 noms) :
- Rough, solid, grand et legendary : nommés Observatory par les deux étrangers. Trois des réponses d'un étranger sont « peu sûr ».
- Noirs distincts de ceux du moulin : aucune confusion entre les deux au tour 3.
- Empreinte identique à tous les stades, aucune pièce hors de l'empreinte.
- Le titan se lit comme une figure qui porte une boule. C'est aussi lui qu'on nomme à la place de l'observatoire.

**Échoué** :
- Mythic, net et flouté : voir Questions.

**Pas prouvé** :
- Que l'on dise « télescope » et non « canon » : le test demandait un nom de bâtiment, pas ce mot.
- Trous des anneaux et des bras à taille de téléphone : vus sur la planche, pas à l'écran, et seul le mythic a été testé flouté.
- Le grand n'a plus de neuf en noir que le télescope, le manchon et les marques : passe-t-il la revue « pas seulement plus haut » une fois peint ?
- Le faisceau à côté du télescope, les bras d'orbite, la fente : absents de la maquette.
- `hauteurMax` contre `heights.py` et `iso-layout` : relevé 2,675 / 2,896 / 3,284 / 3,284 / 4,02 (ancien maximum 2,55), mais `heights.py` ne lit pas `blockouts/bld/`, n'attend que 2 stades pour le tier 3, et ce test n'a pas tourné. Les bras seront à déclarer `mobile`. La règle d'écart des ombres peut réagir.

## Questions
1. **Le mythic n'est pas nommé.** Il a échoué à G-ID aux 3 tours (au tour 1, sur le flou seulement). Au tour 3, les deux étrangers l'appellent Champion Arena, net et flouté, alors que tous les autres stades des deux bâtiments passent. La carte garde la forme actuelle. Options, sans choix :
   - Garder Atlas et accepter l'échec de la gate sur la silhouette.
   - Ajouter au noir des signes célestes (bras d'orbite, lune, bandes).
   - Réduire la figure pour qu'elle serve le dôme.
   - Retirer la figure, en sachant que le catalogue prévoit « Atlas at the Observatory » et que la grammaire du mythic compte cette statue.
2. **Orage en laisse ou cristal ?** (concerne le moulin) La carte du moulin prend l'orage.
3. **Le Sage ou un astronome anonyme ?** C'est déjà un des 7 villageois, ancré à l'observatoire (`constants/villagers.ts`), et le prompt interdit nom et répliques aux gardiens. theo vote le Sage, mara l'anonyme. Par défaut : anonyme, sans sa tenue.
4. **Le jour de la mise à jour**, faut-il jouer le show pour un bâtiment redessiné dont le stade ne change pas ?
5. **Teintes à valider** : la patine, proposition `#5E8A80`, non testée, le ton le plus proche de la bible étant l'eau `#4A6A7C`. Le bleu ciel des ailes du moulin, proposition `#9DB8C2`, non testée.
6. **Règle B** : si le moulin atteint 7 alors que l'observatoire est au rang 1, le passage au legendary suppose-t-il le rang propre 3 ? Cette carte le suppose.
