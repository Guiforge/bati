# Carte : Tente (`tent`)

**Statut : brouillon, non gelé.** Revue theo et mara appliquée, en attente de Guillaume.

Repères de lecture : coordonnées `(gx, gy, z)` en unités de grille depuis le coin arrière de l'emprise. `gx` va vers la droite-bas de l'écran, `gy` vers la gauche-bas. Le coin avant est `(2, 2)`, le coin gauche `(0, 2)`, le coin droit `(2, 0)`. Tailles en dp au zoom de jeu 0,6 (77 dp par case, 5 px de sprite par dp) : 17 dp = 85 px = z 0,36 ; 14 dp = z 0,30 ; 10 dp = 50 px.

**Figures** : 17 dp visés, 14 dp au plancher, grosse tête, un seul gabarit. **Le chien** : le chien du Feu de camp, même planche de référence, tache autour d'un œil et queue reconnaissable, 16 dp.

## 1. Identité
- **Famille** : fondation, 10 rangs. **Nourrie par** : le niveau du héros (`STARTER_RANK_LEVELS`).
- **Gardien** : le voisin à la petite tente, sans nom ni réplique.
- **Piliers** : P1, P3.
- **Silhouette** : part du repère « toile en pointe sur deux mâts ». Les deux pointes restent jusqu'au bout, et le mythic y ajoute un mât très haut. Le seul grand bâtiment de toile du village.
- **Accents** : parchemin, rouge bannière `#8A2432`, lueur `#F0A848` la nuit.

## 2. Ce qui ne change jamais
Emprise 2×2, canevas `building2x2` (896×1344), ancre (448, 1280), même masque au sol. Porte sur la face `+gy`, en x de 0,55 à 0,85. Tente principale entre `gx` 0,15 et 1,25, pour laisser libre le côté droit. Paquetage en (1,3, 1,7), hors du créneau. Toile parchemin, mâts de bois sombre. Une chaussette de 10 dp sèche sur une perche à tous les stades. Sol fondu, sans losange.

## 3. Échelle des stades
**Créneau de gag, le même à tous les stades** : côté droit, `gx` de 1,4 à 1,95, `gy` de 0,5 à 1,2, ancre au sol (1,68, 0,85), z de 0 à 0,6. Il tient la petite tente et son voisin, sur le bord de la silhouette. Le gardien vit dans ce créneau.

| Stade | Rangs | Élément qui domine (nouveau) | Marque de clan | Gardien | Ancre de lumière | Boucle |
| --- | --- | --- | --- | --- | --- | --- |
| rough | 1-2 | Bâche sur deux perches, `gy` de 0,5 à 1,5, faîte z 0,85, chaussette sur la perche avant | aucune | déballe son paquetage | aucune | aucune |
| solid | 3-4 | Vraie tente à faîte, `gy` de 0,3 à 1,6, z 1,3, lanterne pendue à la perche avant | fanion en haut du mât arrière | se bat avec sa toile | aucune | fanion (3 images) |
| grand | 5-6 | Auvent devant la porte, x de 0,45 à 0,95, sommet z 1,3 à `gy` 1,97, environ 13 dp hors de la silhouette, table de cartes dessous en (0,7, 1,86), carte sans lettres, 10 dp ou plus. Deux piques aux coins. La lanterne passe au poteau gauche de l'auvent (0,45, 1,97), émissive, 10 dp ou plus ; la chaussette au poteau droit (0,95, 1,97) | bannière sur la pique gauche (0,25, 1,8) | fier devant sa tente | aucune | bannière (3 images) |
| legendary | 7-9 | Le faîte devient deux cônes rayés : centres (0,7, 0,6) et (0,7, 1,2), rayon 0,55, murs à z 0,9, pointes à z 1,75, festons | blason sculpté sur un panneau au-dessus de l'auvent | dort | aucune | bannière |
| mythic | 10 | Grand mât entre les cônes, (0,7, 0,9), rayon 0,05 ou plus, sommet z 3,4, gonfanon vertical à trois pointes, de 0,6 × 1,0 sous le sommet, qui flotte vers `+gx`. Bande basse des cônes marquée émissive dans la maquette | panneau sculpté gardé, et blason qui luit en plus, sur le gonfanon | assis endormi (finale) | aucune | gonfanon et flammes (3 images chacun) |

**Mythic.** Élément dominant : le grand mât. Couche : le gonfanon et deux flammes de toile sur les pointes le jour, la toile éclairée de l'intérieur la nuit (bande émissive, sans ancre). Finale : le chien dans le bonnet de nuit du voisin.

## 4. Table des rangs
| Rang | Nouveauté | Sprite | Taille |
| --- | --- | --- | --- |
| 1 | Peinture rough, le voisin arrive avec son paquetage, une chaussette sèche sur la perche | stade + gardien | gardien 17 dp, chaussette 10 dp |
| 2 | Gag : le mât de la petite tente tombe, il regarde | beat | mât 15 dp, gardien 17 dp |
| 3 | Peinture solid, spectacle | stade | sommet 61 dp |
| 4 | Gag : une bosse qui gigote sous la petite tente écroulée | beat | 18 dp |
| 5 | Peinture grand, spectacle : auvent, table de cartes, lanterne | stade | auvent 13 dp hors silhouette, table 10 dp |
| 6 | Gag : la petite tente montée au cordeau, le voisin fier | beat | tente 20 dp, gardien 17 dp |
| 7 | Peinture legendary, spectacle | stade | sommet 82 dp |
| 8 | Gag : il dort dedans, les pieds dépassent | beat | pieds 10 dp |
| 9 | Gag : même cadrage. Pattes et queue dépassent, toile gonflée par le ventre, un bout de saucisse visible. Le voisin dehors, debout, furieux, dans un énorme bonnet de nuit | beat | saucisse 10 dp, gardien 17 dp |
| 10 | Peinture mythic, finale | stade + beat | sommet 160 dp, chien 16 dp, bonnet 10 dp |

## 5. Running gag : la petite tente d'à côté
r2 le mât tombe · r4 la bosse sous la toile · r6 montée, enfin · r8 il s'y couche · r9 le chien a pris sa place · r10 le chien porte CE bonnet de nuit, le voisin dort assis contre la toile, tête nue. Chaque beat remplace le précédent dans le créneau. Le chien est celui qui a volé les saucisses au Feu de camp au r8 : la blague marche seule, et la double lecture récompense qui regarde.

## 6. Gag de chantier
Deux villageois emballés dans une toile qui cherchent la sortie. Le même sprite pour les 4 changements de stade.

## 7. Le mythic en une phrase
« Ma tente est devenue un pavillon de guerre avec un étendard immense, et le chien du voisin dort dans son bonnet de nuit. »

## 8. Clins d'œil
Aucun. **Jamais dessiné** : lettres sur la carte. Le bonnet reste un bonnet, sans personnage ni marque.

## 9. Rien ne disparaît
- solid peint : toile, perches, paquetage, chaussette, améliorés.
- grand peint : tout solid. La lanterne passe de la perche avant au poteau gauche de l'auvent, la chaussette au poteau droit.
- legendary peint : tout grand, table et lanterne comprises, les perches deviennent les mâts des cônes.
- mythic peint : tout legendary, chaussette comprise. **Le panneau sculpté reste, le blason qui luit s'y ajoute.**
- Aucun ajout de rang à retirer : tout passe par le créneau, la chaussette est peinte. Le fanion devient bannière, puis blason. La bannière du grand reste peinte, simple drap sur sa pique.

## 10. Lisibilité
- **Figures, recalculées** : 2 au plus. r8 le voisin seul, r9 le chien (pattes, queue, sous la toile) et le voisin, r10 le chien et le voisin. Voisin 17 dp, chien 16 dp.
- Ajouts : 10 dp ou plus. Les pieds du r8, le bout de saucisse du r9 et le bonnet du r10 sont dessinés énormes exprès.
- Sol dans le masque. Le canevas a de la marge : le sommet z 3,4 tombe à y 252 sur 1344.
- **Densité** : case 2×2, 12 à 24 formes permises par la bible. Rien à couper sur le compte.
- **Ombres**, à la main (0,495 par unité de z) : pointe du mât à 0,22 case de la Salle des héros. Ça touche vers z 3,8. Si la zone est une boîte de l'emprise, ça touche dès z 2,0.
- **Écarts au catalogue, pour Guillaume** : r8 et r9 s'en écartent (voir Questions).

## 11. Coût (estimation)
- Peintures : 5 (15 sondes, 5 finales), soit 20 images.
- Sprites : gardien, 6 beats (le r9 est un beat), 2 formes de marque. 9 sujets, environ 18 images avec reprises (16 avant la revue). Le chien part de la planche du Feu de camp.
- Images animées : fanion 3, bannière 3, gonfanon 3, flammes 3, chantier 3 (15).
- Total environ 53 images, **environ 6,5 $** à 0,12 $ l'image (6 $ avant la revue ; déduit des 0,5 $ pour 4 du prompt, prix non vérifié).

## Questions pour Guillaume
1. r8 et r9 s'écartent du catalogue : celui-ci avait « un gros chien dort dedans » au r8, sans pieds qui dépassent, ni saucisse, ni bonnet volé. D'accord ?
2. L'idée du chien gardien du joueur reste écartée (statique par défaut), puisque le chien est celui du gag du Feu de camp. D'accord ?

## À prouver en maquette
- Silhouette noire de chaque stade, r1 compris.
- Test du gibet et lecture générale : montrer à un inconnu la forme noire et le flou à 96 dp, avec la question ouverte « Qu'est-ce que c'est ? ».
- Écarts d'ombre avec les voisins, `iso-layout.test.ts` lancé sur `hauteurMax` réel, surtout le grand mât contre la Salle des héros.
- Le gardien à côté d'un villageois qui marche : même gabarit.
- L'auvent sort bien de 13 dp, et la table reste visible dessous.
- Le mât de rayon 0,05 tient dans le flou à 96 dp.
