# L'image cible du village

Choisie par Guillaume le 04/11/2026 : direction A, La Grand-Rue, reprise. Toute piste de look vise cette cible (règle 4 du prompt).

Une seule longue rue en S monte l'écran, de la porte sud jusqu'à la forêt, en passant par le feu et un pont.

| Palier | Image | Source |
|---|---|---|
| 1, jour | `img/cible-t1-jour.jpg` | `r_t1_3` |
| 6, jour | `img/cible-t6-jour.jpg` | `r2_t6_1` |
| 12, jour | `img/cible-t12-jour.jpg` | `r2_t12_2` |
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

## Ce que les images montrent mal

Vu par mara et sur les images. Deux passes de reprise sont faites : le reste passe par les règles, sans autre peinture.

- **Bâtiments, palier 12 de jour** : mara en lit 12 à 14 sur 21 environ, contre presque tous aujourd'hui. Le moulin, la tour et l'arène se perdent sous les maisons neuves. **Ne pas copier ce placement : la règle 1 prime.**
- **Clarté, palier 12 de jour** : la rue pavée jaune est plus claire que le feu, et le jour est plus sombre et plus vert qu'aujourd'hui. **Suivre la règle 5, garder la chaleur du village actuel.**
- **Palier 6** : la rue en S se voit surtout au-dessus de la palissade, le village reste un bloc fermé, et la pente entre la palissade et la rivière reste vide. **Suivre les règles 2 et 6.**
- **Nord du palier 12** : maisons trop serrées et trop semblables. **Suivre la règle 7.**
- **Coin, palier 12** : de grands champs ont été ajoutés sous le mur à droite. **Ne pas les reprendre : le champ et l'enclos du coin suffisent.**
- **Mur** : palissade au palier 6, pierre au palier 12, comme dans le jeu aujourd'hui. Les images ne disent pas à quel palier il change.

## Ce que chaque piste en prend

**LAYOUT**
- Le tracé de la rue, le plan de `directions.md` et les règles 1, 2, 5, 6 et 7.
- La carte grandit vers le haut, d'environ 100 tuiles. Ce chiffre est une estimation à mesurer.
- `lisiere` et `pieds` peuvent reculer **une fois**, et ils sont reverrouillés sur un rendu que Guillaume valide (sa réponse du 04/11). Le coin de la porte sud ne bouge pas.
- À surveiller : une rue droite en colonne, où chaque bâtiment cache celui du dessus.

**GROWTH**
- Les règles 3, 4, 6, 7, 8 et 9 : ce qui apparaît à chaque palier, la forêt, les quartiers, les champs et les alentours.
- Les maisons doivent varier, et le palier 1 reste presque nu.

**POLISH**
- Les règles 5 et 10 : la lumière du jour et de la nuit.
- `img/cible-t12-nuit.jpg` est la référence la plus sûre de la série : mara y voit le noyau chaud dominer sans filtre bleu.
- La nuit de l'atelier n'a aujourd'hui presque aucune fenêtre allumée (`handoff.md`).
