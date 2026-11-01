# Perf des jeux classiques et iso : ce qui se transpose à la carte du village

Date : 2026-10-31. Auteur : chercheur. Question : comment DOOM et les jeux 2D iso classiques tenaient leur cadence sur du matériel faible, et qu'en garder pour Bati (RN, Fabric, Hermes, Reanimated 4, react-native-svg, expo-image, sans GL ni Skia).

## Réponse en une phrase

Les classiques ne gagnaient pas par un moteur plus malin mais en ne touchant jamais deux fois ce qui n'a pas changé (ordre précalculé, couches cuites, clipping avant dessin, tables précalculées). Pour Bati, le symptôme "Slow bitmap uploads" presque à chaque trame signale l'inverse : un bitmap est ré-uploadé en texture GPU parce que son contenu change ou n'est pas gardé en cache. La technique la plus rentable est donc de cuire une fois et de ne déplacer que des textures déjà montées.

## Ce qui est établi (source ouverte et lue)

### 1. Ne rien rendre hors champ, ne rien dessiner deux fois (DOOM)
- DOOM trie les segments par un BSP, de l'avant vers l'arrière, rejette le hors-champ par boîtes englobantes et dessine chaque mur contre un tableau d'occlusion (`solidsegs`) : on ne peint que l'espace restant. Le tri coûte "un produit vectoriel par plan". Le frustum culling est "essentiel" avec un BSP. Pas de zéro surdessin : le pire cas écrit un pixel trois fois. Source : Sanglard, "Doom Classic Renderer".
- Transposable à Bati : **oui, en version réduite**. Le BSP n'a pas d'équivalent (la scène est plane, l'ordre est connu à l'avance). Ce qui reste : un rectangle de visibilité (caméra) qui exclut du rendu les bâtiments hors écran, plus l'idée que le coût se mesure en pixels écrits, pas en objets.

### 2. Culling par rectangle de vue avant tout tri (RollerCoaster Tycoon, via OpenRCT2)
- OpenRCT2 (reprise du moteur de Sawyer) rejette les sprites hors du rectangle de rendu à la création des "paint structs" (`imageWithinRT`, "since this is used to cull paint structs, I'd prefer to keep the condition strict"), vérifie aussi les tuiles voisines à cause des sprites qui débordent, puis range les structs en quadrants d'écran et ne les ordonne que localement par boîtes englobantes. Source : OpenRCT2, `Paint.cpp`.
- Limite : c'est le code d'OpenRCT2, pas celui de Sawyer ; le fichier m'a été rendu tronqué (ligne 1000 sur 1096) et je n'ai pas vu la logique de dirty rectangles.
- Transposable à Bati : **oui**. Culling en premier, tri ensuite, tri local seulement. Chez nous l'ordre est précalculé, donc seul le culling reste à faire : ne pas monter dans l'arbre natif les bâtiments hors du cadre caméra (marge d'un bâtiment haut).

### 3. Ordre de profondeur recalculé seulement quand quelque chose bouge
- Pratique courante : une valeur d'ordre dérivée de la coordonnée (Y, ou x+y en iso) posée sur chaque sprite, "recalculée à chaque trame, ou seulement quand Y change", la seconde option étant préférée quand la plupart des sprites sont immobiles. Source : forum Tiled, "Isometric depth sorting".
- Limite : c'est une réponse de forum, pas un post-mortem. Elle ne traite pas les sprites hauts qui coupent plusieurs diagonales ; je n'ai trouvé aucune source solide sur la découpe de sprites en tranches.
- Transposable à Bati : **oui, déjà fait**. L'ordre précalculé est la bonne réponse pour des bâtiments fixes. Il n'y a rien à retirer. Si un bâtiment haut passe devant ou derrière un voisin de façon fausse, la correction est un ordre de montage ou un `zIndex` fixe, pas un tri à l'exécution.

### 4. Cadence visée et partage du budget (Age of Empires)
- AoE visait "15 fps constants sur la config minimale" (Pentium 90, 16 Mo), sprites en 256 couleurs sur monde en tuiles, et après optimisation environ 30 % du temps au rendu, 30 % à l'IA et au pathing, 30 % à la simulation. Le coût de rendu variait avec ce que faisait le joueur (regarder des unités, défiler, terrain inexploré). Source : Game Developer, "1500 Archers on a 28.8".
- Limite : l'article ne dit rien des techniques de rendu (pas de dirty rectangles, pas de mémoire).
- Transposable à Bati : **oui, comme méthode**. Fixer une cadence et un budget par poste, et mesurer le défilement/zoom séparément du repos, puisque le coût dépend de l'action.

### 5. Cuire une fois, déplacer une texture déjà montée (Android, applicable à toute app)
- Doc Android : "Chaque fois que vous changez le contenu d'un bitmap, il est ré-uploadé comme texture GPU au prochain dessin". La métrique Upload est "le temps de transfert des bitmaps de la mémoire CPU vers la mémoire GPU pendant la trame courante" ; une valeur haute vient de beaucoup de petites ressources ou de quelques très grosses, par exemple un bitmap proche de la taille de l'écran. À faire : ne pas afficher un bitmap bien plus grand que sa taille d'affichage. Sources : Android, "Profile GPU rendering" et "Hardware acceleration".
- Une couche matérielle rend la vue une fois dans un tampon hors écran réutilisable ; translation, rotation, échelle et alpha sont alors bon marché. Elle n'est pas gratuite (première trame plus lente, mémoire GPU) et se pose temporairement, sur l'enfant qui bouge. Source : Dan Lew, "Using hardware layers to improve animation performance". C'est un billet de 2015 sur les View natives, pas sur Fabric ; l'équivalent RN est `renderToHardwareTextureAndroid`, que je n'ai pas relu ici.
- Transposable à Bati : **oui, c'est la piste principale**. Voir plus bas.

## Ce que je n'ai pas pu vérifier (à ne pas citer comme acquis)

- Diablo 1 et 2 : aucune source technique ouverte sur le rendu (les recherches renvoient DevilutionX en général). Seul fait lu : le post-mortem de Diablo II dit que l'art du jeu est construit et rendu dans 3D Studio Max (via un résultat de recherche, page non ouverte). Que les sprites de personnages soient pré-rendus depuis la 3D et superposés en couches vient de forums, sans confirmation du studio.
- Fallout 1/2, Ultima Online, SimCity 2000 : aucune source trouvée sur leur rendu. Le code de Micropolis (TileEngine) est la piste, non lu.
- RollerCoaster Tycoon : l'article de Lars Tofus ne parle que de mémoire (types d'un octet), décalages de bits et pathfinding borné ; rien sur le rendu, contrairement à ce que laissait croire la recherche. Interview de Sawyer non ouverte.
- DOOM `COLORMAP` (lumière et teintes par table de palette, sans calcul par pixel) : je le sais d'ailleurs, mais doomwiki a rendu 403 et le Black Book en ligne n'est qu'une annonce. Fait non sourcé ici.
- Dirty rectangles : aucune source ouverte ne les attribue à un de ces jeux. Un fil GameDev.net (résultat de recherche) affirme qu'en iso il faut tout redessiner pour l'empilement, donc que la mise à jour tuile par tuile n'est pas faisable.
- Un iso mobile récent : rien de solide trouvé.
- Niveaux de détail : aucun élément trouvé pour ces jeux (sprites).
- Rien n'a été mesuré sur l'appareil ni lu dans le code de Bati.

## Les 5 techniques classiques les plus transposables

1. **Cuire le sol une fois en une seule texture et ne plus y toucher** (principe de la couche statique et de la règle Android "ne pas modifier un bitmap"). Rastériser les tuiles `<Svg>` à l'exécution est probablement ce qui ré-uploade : un contenu qui change ou une surface re-rastérisée. À vérifier en isolant le sol. Comment : un seul bitmap (webp pré-cuit au build, ou rastérisation unique mise en cache) à la taille d'affichage, jamais re-rastérisé pendant pan/zoom.
2. **Déplacer des textures déjà montées, ne jamais changer leur contenu.** La caméra est un `Animated.View` transformé : tant que ses enfants ne changent pas de contenu ni de taille, c'est une transformation de compositeur, sans upload. Poser le cache matériel sur le conteneur de caméra pendant le geste seulement.
3. **Ne pas servir un bitmap plus grand que son affichage.** Sprites webp et sol au plus près de la taille à l'écran (en pixels réels de l'appareil) ; un sol d'écran entier ou des webp surdimensionnés produisent exactement le symptôme "Upload".
4. **Culling par rectangle de vue avant le reste** (RCT/OpenRCT2, DOOM). Ne pas monter les bâtiments hors cadre, marge d'un bâtiment haut. Ordre de profondeur précalculé conservé tel quel.
5. **Budget par poste, mesuré par action** (AoE). Repos, pan, zoom, animation de bâtiment mesurés séparément ; un rendu à 0 trame au repos est déjà le meilleur des "dirty rectangles".

## Implications pour Bati

- Le diagnostic "Upload à presque chaque trame" est plus probablement un problème de contenu de bitmap qui change ou de surface re-rastérisée que de tri ou de nombre de nœuds. L'hypothèse reste à confirmer en coupant une couche à la fois (sol, puis bâtiments) et en relisant Profile GPU rendering.
- Les anciens jeux n'offrent pas de technique d'ordre de profondeur ou de LOD à reprendre : leurs sources solides manquent ici, et l'ordre précalculé de Bati est déjà au niveau de l'état de l'art qu'on a pu lire.
- Ne pas importer les dirty rectangles : en RN le compositeur fait déjà ce travail, à condition de ne pas invalider les textures.

## Sources

- Fabien Sanglard, "Doom Classic Renderer" : https://fabiensanglard.net/doomIphone/doomClassicRenderer.php
- OpenRCT2, `src/openrct2/paint/Paint.cpp` : https://github.com/OpenRCT2/OpenRCT2/blob/develop/src/openrct2/paint/Paint.cpp
- Game Developer, "1500 Archers on a 28.8: Network Programming in Age of Empires and Beyond" : https://www.gamedeveloper.com/programming/1500-archers-on-a-28-8-network-programming-in-age-of-empires-and-beyond
- Android, "Inspect GPU rendering speed and overdraw" (Profile GPU rendering) : https://developer.android.com/topic/performance/rendering/profile-gpu
- Android, "Hardware acceleration" : https://developer.android.com/topic/performance/hardware-accel
- Dan Lew, "Using hardware layers to improve animation performance" : https://blog.danlew.net/2015/10/20/using-hardware-layers-to-improve-animation-performance
- Forum Tiled, "Isometric depth sorting" : https://discourse.mapeditor.org/t/isometric-depth-sorting/736/2
- Lars Tofus, "The gold standard of optimization: a look under the hood of RollerCoaster Tycoon" (consulté, peu utile ici) : https://larstofus.com/the-gold-standard-of-optimization-a-look-under-the-hood-of-rollercoaster-tycoon
- Game Developer, "Postmortem: Blizzard's Diablo II" (vu en résultat de recherche seulement) : https://www.gamedeveloper.com/design/postmortem-blizzard-s-i-diablo-ii-i-
