# L'image cible du village

Choisie par Guillaume le 04/11/2026 : direction A, La Grand-Rue, reprise. Toute piste de look vise cette cible (règle 4 du prompt).

Une seule longue rue en S monte l'écran, de la porte sud jusqu'à la forêt, en passant par le feu et un pont.

| Palier | Image | Source |
|---|---|---|
| 1, jour | `img/cible-t1-jour.jpg` | `r_t1_3` |
| 6, jour | `img/cible-t6-jour.jpg` | `r2_t6_1` |
| 12, jour | `img/cible-t12-jour.jpg` | `r3_t12_1` |
| 12, nuit | `img/cible-t12-nuit.jpg` | `r_t12n_1` |

Les quatre côte à côte : `img/cible-planche.jpg`. Le plan vu de dessus et le détail de A : `directions.md`.

**Ces images sont des cibles, jamais des assets.** Rien n'y est découpé. Elles inventent des détails que les sprites n'auront pas. Les juges regardent les règles et l'impression d'ensemble, jamais la ressemblance au pixel.

## Les règles

1. **Chaque bâtiment du joueur reste visible et reconnaissable à chaque palier.** Cette règle passe avant les images : une maison de quartier ne se pose jamais devant lui.
2. **Une seule rue en S organise tout**, de la porte sud au feu, au pont, puis à la forêt. Elle se devine dès le palier 1 et se lit sans effort au palier 12.
3. **Le palier 1 est presque nu** : feu, tente, puits, un appentis, un petit carré de terre et des souches. Un sentier étroit y mène. Ni cabane, ni maison, ni mur, ni grand champ.
4. **La forêt est sombre et variée**, bouleaux, chênes et pins aux teintes distinctes. Elle serre le village, reste plus sombre que lui et ne passe jamais devant un bâtiment.
5. **La place du feu est le coeur et la zone la plus claire.** La valeur baisse vers les bords. La rue conduit à la place sans la dépasser en clarté.
6. **Dès le palier 6, tout trou de plus de 2 tuiles contient un quartier** : maisons plus basses et plus éteintes que les bâtiments du joueur, jardins en lanières.
7. **Au palier 12, c'est une ville dense**, avec des ruelles en arête de poisson, une halle et une taverne, et un deuxième rang de maisons. Les maisons varient : jamais une masse de toits identiques.
8. **Les champs restent plus calmes que la place**, sombres et peu saturés, sur les bords de la ville.
9. **Les alentours racontent la prospérité** : un appentis, puis les fermes, puis des hameaux et un petit bourg marchand après le pont.
10. **La nuit, la lumière vient du coeur.** Une grande flaque ambre sur la place, une chaîne de lanternes le long de la rue qui faiblit avec la distance, des fenêtres allumées une à une. Le sol garde ses couleurs : jamais un voile bleu.

Le coin verrouillé reste : porte sud, L de mur, route, champ, chaumières et enclos. On ajoute autour sans repeindre.

## Les bâtiments du joueur d'abord

Demandé par Guillaume le 04/11. Les bâtiments du joueur ne sont pas repeints : c'est le remplissage qui se calme.

11. **Couleur** : le remplissage a des toits d'ardoise ou de chaume sombre et des murs éteints. La tuile rouille et les accents vifs sont réservés au joueur, sauf dans le coin verrouillé. À vérifier sur les sprites réels.
12. **Taille** : une maison de remplissage ne dépasse pas 2/3 de la hauteur du bâtiment voisin du joueur. Chiffre à calibrer. Formes simples et basses.
13. **Détail** : moins de détails intérieurs, ni enseigne ni drapeau. Le trait garde la même épaisseur, comme le veut la bible.
14. **Place** : un parvis dégagé devant chaque bâtiment du joueur. La rue mène à ses portes, le remplissage donne sur les ruelles.
15. **Mouvement** : fumée, drapeaux et ailes sur les bâtiments du joueur, remplissage presque immobile.
16. **Nuit** : vraies lumières chez le joueur, petites fenêtres ailleurs.
17. **Contrôle** : sur la vignette floutée au 1/8, les bâtiments du joueur ressortent, pas seulement le coeur.

## Ce que le jeu doit aussi montrer

Tiré du doc « ce que les jeux nous apprennent ».

18. **Stade lisible de loin** : un stade se reconnaît au zoom du palier 12, sans lire de chiffre. Les échelles de bâtiments sont verrouillées : c'est un contrôle sur les bandes de paliers, et un écart se signale à Guillaume.
19. **Effets réservés aux moments forts** : une évolution, oui. Un effet permanent qui décore l'écran, non.
20. **Découvertes cachées, en option** : par exemple, un espace fermé fait toujours pousser un jardin.

## Ce que les images montrent mal

Vu par mara et sur les images. Trois passes de reprise sont faites sur le palier 12 de jour : le reste passe par les règles, sans autre peinture.

- **Bâtiments, palier 12 de jour** : mara en lit environ 19 sur 21 sur l'image retenue. Ce compte n'est pas fiable : sur l'image d'avant, mara en a lu 12 à 14 lors d'une relecture, puis environ 19 lors de la suivante. **`check` mesurera, la règle 1 prime.**
- **Clarté, palier 12 de jour** : la rue pavée dorée est plus claire que le feu, et l'image est un peu monochrome. **Suivre la règle 5, garder la chaleur du village actuel.**
- **Chaumières du coin, palier 12 de jour** : elles ont perdu leur toit rouge. **Ne pas copier : le coin verrouillé garde ses sprites.**
- **Nuit** : elle vient de l'image de jour précédente, ses maisons de quartier ont encore des toits rouges. **Pour le remplissage, suivre les règles 11 et 16.**
- **Palier 6** : la rue en S se voit surtout au-dessus de la palissade, le village reste un bloc fermé, et la pente entre la palissade et la rivière reste vide. **Suivre les règles 2 et 6.**
- **Nord du palier 12** : maisons trop serrées et trop semblables. **Suivre la règle 7.**
- **Coin, palier 12** : de grands champs ont été ajoutés sous le mur à droite. **Ne pas les reprendre : le champ et l'enclos du coin suffisent.**
- **Mur** : palissade au palier 6, pierre au palier 12, comme dans le jeu aujourd'hui. Les images ne disent pas à quel palier il change.

## Ce que chaque piste en prend

**LAYOUT**
- Le tracé de la rue, le plan de `directions.md` et les règles 1, 2, 5, 6, 7 et 14.
- La carte grandit vers le haut, d'environ 100 tuiles. Ce chiffre est une estimation à mesurer.
- `lisiere` et `pieds` peuvent reculer **une fois**, et ils sont reverrouillés sur un rendu que Guillaume valide (sa réponse du 04/11). Le coin de la porte sud ne bouge pas.
- À surveiller : une rue droite en colonne, où chaque bâtiment cache celui du dessus.

**GROWTH**
- Les règles 3, 4, 6, 7, 8, 9, 11, 12, 13 et 17 : ce qui apparaît à chaque palier, la forêt, les quartiers, les champs, les alentours et le calme du remplissage.
- Les maisons doivent varier, et le palier 1 reste presque nu.
- La règle 20, en option.

**POLISH**
- Les règles 5, 10 et 16 : la lumière du jour et de la nuit.
- `img/cible-t12-nuit.jpg` est la référence la plus sûre de la série : mara y voit le noyau chaud dominer sans filtre bleu.
- La nuit de l'atelier n'a aujourd'hui presque aucune fenêtre allumée (`handoff.md`).

**LIFE et AUDIT**
- LIFE : les règles 15 et 19.
- AUDIT : les règles 17 et 18 dans sa liste de contrôles.
