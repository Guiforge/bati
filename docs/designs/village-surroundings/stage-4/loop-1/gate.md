# Porte de l'étape 4, boucle 1

01/11/2026. Kit d'accessoires, petites histoires et animaux peints. 27 images FLUX 3 Image (une par accessoire, ses variantes en rang), référence : l'ancre seule. 1,89 $ (0,07 $ l'image).

## Comment c'est fait

`props.py gen 1` : pour chaque accessoire, un rang de 2 à 4 variantes sur magenta, avec le bloc de la bible et le trait calculé pour la taille posée. `props.py pose 1` :
- détourage de l'étape 0 ;
- une variante par bande de colonnes séparée par du vide ;
- trait extérieur porté à 6 px à S pour les accessoires, 3 px pour les souris et les oiseaux (8 à 12 dp en jeu) ;
- planches contact, la forge solid à gauche de chaque rang pour l'échelle : `contact_zoom06.webp` à l'échelle du jeu au zoom 0,6, `contact_x3.webp` trois fois plus grand pour juger le détail.

Chaque variante est dans `<nom>_<n>.webp`, la provenance dans `provenance/`.

## Le kit (22 accessoires, 5 animaux)

| Groupe | Accessoires (variantes) |
| --- | --- |
| Camp (débuts) | tonneaux (3), caisses (3), tas de bois (3), sacs de grain (3), bottes de foin (3), râtelier d'armes (2), lanterne sur poteau (2), clôture (3), poteau indicateur sans lettres (3), menhir breton (3) |
| Ville (fin) | étal de marché (3), corde à linge (2), charrette (2), échelle, seau et brouette (3), potager (2), épouvantail (2), poulailler (2) |
| Petites histoires (bible du 31/10 §8) | chat endormi pour un toit (3, roux, gris, noir), pêcheur assis pour le pont (2), charrette à la roue cassée avec son charretier (2), vieux qui fait la sieste contre un tonneau (2), renard qui guette (3) |
| Animaux | souris grise, brune et noire (images de course), oiseau sombre et hirondelle (4 battements d'ailes chacun) |

Le puits n'est pas dans le kit : c'est déjà un bâtiment (`well`). Les deux villageois qui se disputent et l'apprenti au seau sont des personnages animés : ils relèvent des planches de villageois, pas des accessoires.

## Mesures (`mesures.json`)

- Variantes obtenues : toutes celles demandées pour les 22 accessoires et les deux oiseaux. Souris : 2 images de course sur 4 pour la grise, 3 sur 4 pour la brune (des images se touchent et se fondent à la découpe), 4 sur 4 pour la noire.
- Trait brut à S avant dilatation : de 0,3 à 3,8 px. FLUX peint un trait fin à cette taille, et la dilatation le porte à 6 px pour tous (3 px pour les animaux).

## Notes

| Ligne | Note | Pourquoi |
| --- | --- | --- |
| 15 à 25 accessoires, 2 à 4 variantes | 2 | 22 accessoires, de 2 à 3 variantes chacun, plus 5 feuilles d'animaux. |
| Même main que les bâtiments | 2 | Même encre, même pinceau, lumière de gauche, couleurs terreuses de la bible ; rien ne jure à côté de la forge. |
| Lisible au zoom 0,6 à côté d'un bâtiment | 2 | Chaque silhouette se reconnaît à l'échelle du jeu, et les tailles tiennent ensemble (un tonneau fait un quart de la forge, un étal la moitié). |
| Rien de posé sous les objets | 2 | Aucun socle ni carreau de sol. Seuls le potager et le poulailler ont un cadre bas, qui fait partie de l'objet. |
| Histoires et animaux | 1 | Chat, pêcheur, charrette cassée, linge, tas de bois, étal, poteaux, menhir, sieste et renard sont là. Mais 2 souris sur 3 n'ont pas leurs 4 images de course. |

**Total 9/10, aucun 0 : la porte passe.**

## Ce qui reste (pour l'étape 5 ou une reprise courte)

- **Souris grise et brune** : il manque des images de course. Les redemander une image par appel, ou couper au milieu les bandes fondues (environ 0,14 $ pour les deux).
- **Animation** : les images de course et de vol ne sont pas vérifiées en mouvement. Elles le seront à l'étape 5 (planche animée), et les écarts d'une image à l'autre peuvent faire sautiller.
- **Personnages** (pêcheur, charretier, vieux) : peints de jour, comme le décor. À côté des villageois animés actuels, ils peuvent sembler plus détaillés. À juger dans l'app.
