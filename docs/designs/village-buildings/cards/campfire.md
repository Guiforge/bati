# Carte : Feu de camp (`campfire`)

**Statut : brouillon, non gelé.** Revue theo et mara appliquée, en attente de Guillaume.

Repères de lecture : coordonnées `(gx, gy, z)` en unités de grille depuis le coin arrière de l'emprise. `gx` va vers la droite-bas de l'écran, `gy` vers la gauche-bas. Le coin avant est `(1, 1)`, le coin gauche `(0, 1)`, le coin droit `(1, 0)`. Tailles en dp au zoom de jeu 0,6 (77 dp par case, 5 px de sprite par dp) : 17 dp = 85 px = z 0,36 ; 14 dp = z 0,30 ; 10 dp = 50 px.

**Figures** : 17 dp visés, 14 dp au plancher, grosse tête, un seul gabarit. **Le chien** : un seul chien, une planche de référence, tache autour d'un œil et queue reconnaissable, peint une fois ici au r6, 16 dp.

## 1. Identité
- **Famille** : fondation, 10 rangs. **Nourri par** : le niveau du héros (`STARTER_RANK_LEVELS`).
- **Gardien** : le cuistot à la longue louche, sans nom ni réplique. Le Ménestrel garde son rôle de villageois et n'est jamais peint ici.
- **Piliers** : P1, P2, P3.
- **Silhouette** : part du repère « cercle de pierres autour de bûches croisées ». Les bûches croisées finissent en tour de bûches surmontée d'une haute flamme, unique au village.
- **Accents** : orange `#F0A848`, pierre chaude, rouge bannière.

## 2. Ce qui ne change jamais
Emprise 1×1, canevas `decor1x1` (512×768), ancre (256, 704), même masque au sol. Pas de porte. Anneau de pierres centré en (0,5, 0,5), rayon 0,42, **ouvert à l'avant** : aucune pierre où `gx + gy >= 1,5`. Pierre chaude, bois sombre. Sol fondu, sans losange. Sièges déjà posés par le code autour de la case : on n'en peint qu'un, la bûche du gardien.

## 3. Échelle des stades
**Créneau de gag, le même à tous les stades** : triangle avant, `gx + gy >= 1,35`, ancre au sol (0,78, 0,78), z de 0 à 0,5. Le gardien vit dans ce créneau : sur 1×1, il n'a pas d'autre place.

| Stade | Rangs | Élément qui domine (nouveau) | Marque de clan | Gardien | Ancre de lumière | Boucle |
| --- | --- | --- | --- | --- | --- | --- |
| rough | 1-2 | Aucun : pierres disjointes, petit feu, bûche-siège en (0,93, 0,66). Sommet z 0,35 | aucune | assis sur la bûche | foyer (0,5, 0,5, 0,13) | flamme, fumée (code) |
| solid | 3-4 | Potence de bois au coin gauche (0,1, 0,9), z 1,0, bras jusqu'à (0,3, 0,7), marmite suspendue. Braises rayon 0,25 | fanion en haut de la potence | longue louche de 18 dp | foyer z 0,17 | + marmite qui fume |
| grand | 5-6 | Pilier de pierre au coin droit (0,9, 0,1), z 1,25, face à un second pilier qui gaine la potence. Broche sur fourches, de (0,45, 0,97) à (0,97, 0,45), z 0,3, manivelle de 10 dp vers le créneau | bannière sur le pilier droit | louche, main sur la manivelle | foyer z 0,2 | + bannière (3 images) |
| legendary | 7-9 | Grand âtre à ciel ouvert : mur à gradins avec 2 niches (pas un pignon), en L dans le dos du feu, entre les piliers, point haut z 1,45 au coin arrière (0,06, 0,06) | blason sculpté sur le pilier droit (x +154 px) | louche levée | foyer z 0,2, flamme plus large | idem |
| mythic | 10 | Tour de bûches croisées au centre, rayon de 0,24 en bas à 0,14 en haut, sommet z 1,85, bûches qui dépassent d'au moins 3 dp de chaque côté. Haute flamme dessinée au-dessus, jusqu'à z 2,4 environ, comptée dans la silhouette | blason qui luit, même place, jamais derrière la tour | danse (finale) | lueur au sol gardée sur l'anneau (0,5, 0,5, 0,17) ; flamme posée en (0,5, 0,5, 1,85) | flamme 4 à 6 images, guirlande 3 images |

**Mythic.** Élément dominant : la tour et sa flamme, à cœur peint. Braises peintes au pied et entre les bûches. Couche : guirlande de pilier à pilier, passant devant la tour, 4 fanions (rouge et ocre, 10 dp chacun) et 2 lanternes, couleurs le jour, lanternes allumées la nuit. Finale : la danse.

## 4. Table des rangs
| Rang | Nouveauté | Sprite | Taille |
| --- | --- | --- | --- |
| 1 | Peinture rough, le gardien sur sa bûche | stade + gardien | 80 dp de large, gardien 17 dp |
| 2 | Gag : il grille du pain au bout d'un bâton | beat | pain 10 dp |
| 3 | Peinture solid, spectacle, il a sa louche | stade + gardien | sommet 47 dp, louche 18 dp |
| 4 | Gag : une saucisse sur une épée, la louche à la ceinture | beat | saucisse 12 dp |
| 5 | Peinture grand, spectacle | stade + gardien | sommet 59 dp |
| 6 | Gag : sanglier rôti à la broche, le chien assis qui attend, le cuistot à la manivelle | beat | sanglier 22 dp, chien 16 dp, gardien 17 dp |
| 7 | Peinture legendary, spectacle | stade + gardien | sommet 68 dp |
| 8 | Gag : le chien file avec un chapelet de saucisses, le cuistot aux trousses, tous deux vers `-gx` | beat | chien 16 dp, gardien 17 dp |
| 9 | Gag : le cuistot revient bredouille, une saucisse au bout du chapelet, tourné vers la Tente | beat | gardien 17 dp, saucisse 10 dp |
| 10 | Peinture mythic, finale | stade + beat | sommet 87 dp, flamme en plus, couple 17 dp |

## 5. Running gag : la saucisse
r2 le pain · r4 la saucisse sur l'épée · r6 le sanglier et le chien qui attend · r8 le vol · r9 il revient avec la dernière · r10 un couple, une seule image, 17 dp de haut, 26 dp de large au plus : mains jointes, un genou levé, le cuistot brandit sa louche avec la dernière saucisse au bout. Le chien file vers la Tente, où il dort le ventre rond au r9 (voir `tent.md`). Chaque beat remplace le précédent dans le créneau.

## 6. Gag de chantier
Deux ouvriers roulent une bûche géante, l'un debout dessus, les bras écartés. Le même sprite pour les 4 changements de stade.

## 7. Le mythic en une phrase
« Au milieu de mon village, une tour de bûches porte une flamme immense, et le cuistot danse avec sa dernière saucisse. »

## 8. Clins d'œil
- Ronde bretonne an dro, domaine public : une source d'inspiration, rien de promis à l'image.
- **Jamais dessiné** : costume folklorique précis, coiffe, tout habit au-delà d'un gilet simple. L'épée du r4 reste terne, sans reflet.

## 9. Rien ne disparaît
- solid peint : pierres et bûche-siège, améliorées.
- grand peint : tout solid. La potence reste, gainée par le pilier gauche, la marmite toujours pendue.
- legendary peint : tout grand.
- mythic peint : tout legendary. Plus aucun ajout de rang à retirer : le r9 est passé dans le créneau, les lanternes appartiennent à la couche mythic.
- Le fanion devient bannière, puis blason : c'est la même marque. Seul le créneau change de contenu.

## 10. Lisibilité
- **Figures, recalculées** : r6 a le cuistot et le chien, le sanglier rôti compté comme accessoire. r8 a le chien et le cuistot, r9 le cuistot seul, r10 le couple, soit 2 figures dans une image.
- Ajouts : 10 dp ou plus, sur le bord ou dans le créneau. Pain et saucisse dessinés énormes exprès.
- Broche reculée de `gx + gy` 1,35 à 1,42 : à 1,35, les bûches de la tour la touchaient.
- Couple : pieds vers `gx + gy` 1,62, où le triangle fait 29 dp. Marge 3 dp sur ses 26 dp.
- Tout le sol dans le masque. Flamme : y 44 px sur 768, dans le canevas.
- **Densité** : environ 11 formes au mythic (anneau, tour, flamme, broche, potence, marmite, pilier, mur, blason, guirlande, couple), pour 3 à 6 dans la bible. Coupés : dans la guirlande 2 fanions et 2 lanternes, la lanterne du r9. La suite casserait « rien ne disparaît ».
- **Mur et tour** : le point haut du mur tombe à y 182 sur l'écran et le haut des bûches à y 173, au même x. Le coin arrière ajoute 96 px à la hauteur vue, donc l'échelle 47, 59, 68, 87 vaut en z, pas à l'écran. Seule la flamme dépasse vraiment le mur.
- **Ombres**, à la main (0,495 par unité de z) : bout de tour à z 1,85, écart de 0,48 case avec le mannequin. Si la zone est une boîte de l'emprise, l'écart tombe à 0 vers z 2,0.
- **Code** : la flamme dessinée remplace la flamme du code à ce stade, qui lie flamme et lueur au sol dans une même boîte. À traiter dans le moteur, non lu en détail.

## 11. Coût (estimation)
- Peintures : 5 (15 sondes, 5 finales), soit 20 images.
- Sprites : 4 poses du gardien, 6 beats, planche du chien, 2 formes de marque, guirlande. 14 sujets, environ 28 images avec reprises (22 avant la revue).
- Images animées : bannière 3, guirlande 3, chantier 3, flamme environ 6 (15). La danse passe à une seule image.
- Total environ 63 images, **environ 7,5 $** à 0,12 $ l'image (6,5 $ avant la revue ; déduit des 0,5 $ pour 4 du prompt, prix non vérifié).

## Questions pour Guillaume
1. Mur du r7 : on garde z 1,45, ou z 1,1 pour que l'échelle 47, 59, 68, 87 se lise à l'écran et que les bûches dépassent le mur ?
2. Le sanglier rôti compte-t-il comme accessoire ? Sinon le cuistot sort du r6 pour rester à 2 figures.
3. Le chien du r8 et le cuistot du r9 regardent vers `-gx`, donc de dos ou de trois quarts dos : acceptable ?

## À prouver en maquette
- Silhouette noire de chaque stade, r1 compris.
- Test du gibet et lecture générale : montrer à un inconnu la forme noire et le flou à 96 dp, avec la question ouverte « Qu'est-ce que c'est ? ».
- Écarts d'ombre avec les voisins, `iso-layout.test.ts` lancé sur `hauteurMax` réel.
- Le gardien à côté d'un villageois qui marche : même gabarit.
- Le couple de 26 dp tient dans l'ouverture de l'anneau et reste lisible.
