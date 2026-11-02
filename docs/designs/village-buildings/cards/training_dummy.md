# Carte : Mannequin d'entraînement (`training_dummy`)

**Statut : brouillon, non gelé.** Revue theo et mara appliquée, en attente de Guillaume.

Repères de lecture : coordonnées `(gx, gy, z)` en unités de grille depuis le coin arrière de l'emprise. `gx` va vers la droite-bas de l'écran, `gy` vers la gauche-bas. Le coin avant est `(1, 1)`, le coin gauche `(0, 1)`, le coin droit `(1, 0)`. Tailles en dp au zoom de jeu 0,6 (77 dp par case, 5 px de sprite par dp) : 17 dp = 85 px = z 0,36 ; 14 dp = z 0,30 ; 10 dp = 50 px.

**Figures** : 17 dp visés, 14 dp au plancher (l'enfant), grosse tête, un seul gabarit.

## 1. Identité
- **Famille** : fondation, 10 rangs. **Nourri par** : le niveau du héros (`STARTER_RANK_LEVELS`).
- **Gardien** : la recrue, sans nom ni réplique.
- **Piliers** : P2, P3.
- **Silhouette** : part du repère « mannequin de paille sur un poteau en croix ». Il finit sous un manège géant figé en plein tour, sur un mât de bois, unique au village.
- **Accents** : paille, bois, rouge bannière, vert des feuilles. Aucun métal clair.

## 2. Ce qui ne change jamais
Emprise 1×1, canevas `decor1x1` (512×768), ancre (256, 704), même masque au sol. Pas de porte. Mannequin centré en (0,5, 0,5), base en croix entre 0,2 et 0,7, **visage à deux croix et une couture dès le r1**, sur ce seul mannequin. Paille, bois, sol fondu sans losange.

## 3. Échelle des stades
**Créneau de gag, le même à tous les stades** : triangle avant, `gx + gy >= 1,35`, ancre au sol (0,78, 0,72), z de 0 à 0,5. Le gardien vit dans ce créneau : sur 1×1, il n'a pas d'autre place.

| Stade | Rangs | Élément qui domine (nouveau) | Marque de clan | Gardien | Ancre de lumière | Boucle |
| --- | --- | --- | --- | --- | --- | --- |
| rough | 1-2 | Un sac sur un bâton, de travers, avec son visage, sommet z 0,6 | aucune | sa chope à la main, il regarde | aucune | sac qui balance (3 images) |
| solid | 3-4 | Vrais bras en croix à z 0,6, le seau-casque au sommet z 0,95 | fanion sur un piquet en (0,12, 0,45), z 0,8 | s'échauffe | aucune | fanion (3 images) |
| grand | 5-6 | La quintaine : bras tournant le long de `gx`, z 0,8, de (0,08, 0,44) à (0,92, 0,56), 32 dp à l'écran, sac de sable au bout (0,92, 0,56), bas du sac z 0,35, au-dessus du créneau. Sommet du pivot z 1,2 | bannière sur le piquet, monté à z 1,25 | esquive | aucune | sac de sable qui balance (3 images) |
| legendary | 7-9 | Un second mannequin plus petit au coin droit (0,82, 0,16), z 0,75 (35 dp), cuir bouilli et casque-marmite ternes, sans visage | blason sculpté en haut du piquet | salue | aucune | idem |
| mythic | 10 | Manège géant : mât prolongeant le piquet (0,12, 0,45), sommet z 2,0. Bras d'environ 60 dp, de (-0,27, 0,84) à (0,51, 0,06), incliné de z 2,0 à gauche à z 1,6 à droite, figé en plein tour, sans corde. Gros sac rembourré fixé à un bout, grand bouclier à l'autre, 20 à 22 dp chacun. Couronne de feuilles sur le seau | blason qui luit, même place | assis, vaincu (finale) | aucune | banderoles et sac de sable bas, 6 à 9 images |

**Mythic.** Élément dominant : le manège sur son mât. Couche : banderoles qui traînent dans le sens du tour le jour, deux lanternes contre le mât allumées la nuit, jamais au bout du bras. Le manège ne bouge pas et ses sacs ne balancent pas : seules les banderoles vivent. Finale : le mannequin a gagné.

## 4. Table des rangs
| Rang | Nouveauté | Sprite | Taille |
| --- | --- | --- | --- |
| 1 | Peinture rough, le mannequin a un visage, la recrue | stade + gardien | gardien 17 dp |
| 2 | Gag : la recrue lève un seau vers la tête du sac | beat | seau 10 dp |
| 3 | Peinture solid : le seau est sur la tête | stade | sommet 45 dp |
| 4 | Gag : l'épée de la recrue plantée dans la paille, il tire | beat | épée 14 dp |
| 5 | Peinture grand, spectacle | stade | bras 32 dp |
| 6 | Gag : à plat dos, jambes en l'air, étoiles, sous le sac de sable | beat | gardien 17 dp, étoiles 10 dp |
| 7 | Peinture legendary, spectacle | stade | second mannequin 35 dp |
| 8 | Gag : accroupi, mains sur la tête, grande ligne courbe du sac qui passe juste au-dessus | beat | gardien 14 dp accroupi, ligne 20 dp |
| 9 | Ajout : l'épée du r4, terne, dans la main du second mannequin, gardée par le mythic | ajout | 14 dp |
| 10 | Peinture mythic, finale | stade + beat | sommet 94 dp, bras 60 dp, couronne 10 dp |

## 5. Running gag : le mannequin rend les coups
r2 le seau · r4 l'épée coincée · r6 le coup de sac · r8 l'esquive · r9 le second mannequin a récupéré l'épée · r10 un enfant regarde le mannequin couronné en agitant un drapeau, de dos à la recrue, assise avec des étoiles. Chaque beat remplace le précédent dans le créneau.

## 6. Gag de chantier
La recrue essaie le bras du chantier et tourne avec, les jambes à l'horizontale. Le même sprite pour les 4 changements de stade.

## 7. Le mythic en une phrase
« Mon mannequin a un manège géant au-dessus de la tête et une couronne de feuilles, et un gamin vient l'acclamer pendant que la recrue compte les étoiles. »

## 8. Clins d'œil
- Quintaine, domaine public.
- **« Quintaine dorée » du catalogue : refusée.** La règle dit pas d'or et pas de reflet ; une dorure se lirait comme du butin. Remplacée par du bois sombre. La couronne est en feuilles vertes, jamais dorée.
- **Jamais dessiné** : or, ocre brillant, reflet, armure polie ; statue ou colosse (le mannequin reste petit, en paille) ; gibet : pas de corde au manège, bras incliné, sacs fixés, jamais de forme humaine suspendue. Drapeau de l'enfant : un ruban uni, jamais le clan. Le bouclier ne doit pas ressembler à une cible, pour ne pas se confondre avec le Stand de tir voisin.

## 9. Rien ne disparaît
- solid peint : sac et bâton deviennent la paille du mannequin, visage compris, le seau du r2 passe du créneau à la tête.
- grand peint : tout solid, pivot ajouté sur le même poteau.
- legendary peint : tout grand.
- mythic peint : tout legendary, plus l'épée du r9 (retirée des données à ce stade). Le piquet devient le mât, le mannequin et son bras bas restent, le blason reste à sa hauteur sur le mât.
- Le fanion devient bannière, puis blason. Seul le créneau change de contenu.

## 10. Lisibilité
- **Figures, recalculées** : 2 au plus. r10 a l'enfant (14 dp, z 0,30) et la recrue (17 dp, z 0,36) : l'écart de taille dit qu'il s'agit d'un enfant.
- Ajouts : 10 dp ou plus, sur le bord ou dans le créneau.
- Sol dans le masque.
- **Bras du manège hors emprise** : le bout (-0,27, 0,84) dépasse de 0,27 du côté `-gx`, en l'air, au-dessus de la case (12, 9). Rien n'est au sol et l'ombre reste permise, mais `pipeline.md` veut toutes les pièces dans l'emprise (Questions).
- **Bouclier ou sac trop près du bord** : le bout gauche tombe à x 43 sur 512. Avec un objet de 20 à 22 dp (100 à 110 px) centré au bout, il sort du canevas de 12 px environ. Il faut le fixer une vingtaine de px en retrait sur le bras.
- **Densité** : environ 11 formes au mythic, 14 avant (mannequin, bras bas et sac, second mannequin et épée, mât et blason, bras du manège, bouclier, gros sac, banderoles, lanternes, enfant, recrue), pour 3 à 6 dans la bible. Coupés : le râtelier, le bouclier du bras bas (le catalogue n'en demandait pas), les pierres et chiffons de sol, le fanion de pointe.
- **Ombres**, à la main (0,495 par unité de z) : bout droit du bras à 0,27 case de la Forge, mieux qu'avant grâce à l'inclinaison. Si la zone est une boîte de l'emprise, ça touche dès z 2,0.
- Coup du r6 et ligne du r8 : à vérifier sans mouvement.

## 11. Coût (estimation)
- Peintures : 5 (15 sondes, 5 finales), soit 20 images.
- Sprites : gardien, 5 beats, l'épée du r9, 2 formes de marque. 9 sujets, environ 18 images avec reprises.
- Images animées : sac 3, fanion 3, sac de sable 3, chantier 3, boucle mythic 6 à 9 (18 à 21).
- Total environ 56 à 59 images, **environ 7 $** à 0,12 $ l'image (6,5 $ avant la revue ; déduit des 0,5 $ pour 4 du prompt, prix non vérifié).

## Questions pour Guillaume
1. Le bras du manège dépasse l'emprise de 0,27 en l'air : exception permise à ce bâtiment, ou on le raccourcit à 39 dp environ, de (0, 0,57) à (0,51, 0,06), décentré, pour rester dedans ?
2. Le visage à deux croix : la règle dit pas de lettres dans la peinture. Une croix en guise d'œil passe-t-elle ?

## À prouver en maquette
- Silhouette noire de chaque stade, r1 compris.
- **Test du gibet** : montrer à un inconnu la forme noire et le flou à 96 dp, avec la question ouverte « Qu'est-ce que c'est ? ». Il doit répondre manège ou tourniquet, jamais gibet ou potence.
- Écarts d'ombre avec les voisins, `iso-layout.test.ts` lancé sur `hauteurMax` réel, surtout la Forge.
- Le gardien à côté d'un villageois qui marche : même gabarit.
- Le mât fin tient dans les 77 dp de large du zoom 0,6, sous les 96 dp bas du prompt.
- Le r6 et la ligne courbe du r8 se lisent en image fixe.
