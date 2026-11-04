# Trois directions pour l'image cible

Elles diffèrent par ce qui organise le village : la route pour A, la rivière pour B, la forêt pour C.

Règles communes :
- Le plan est fixé une fois pour tous les paliers. Chaque bâtiment a sa parcelle dès le palier 1, et rien ne saute quand le palier monte. Un héros existant voit le nouveau plan une seule fois, à la mise à jour.
- Un bâtiment construit avant son palier garde sa parcelle, et un bout de chemin l'y relie.
- Une maison de quartier ne se pose jamais devant un bâtiment du joueur, c'est-à-dire plus bas sur l'écran à moins de 2 tuiles. Les grands bâtiments restent en haut de l'écran ou sur les bords.
- Le feu de camp reste en [12, 11] : c'est le départ visible, et son crop `keep-feu` est verrouillé.
- Le coin verrouillé est la porte sud [12, 16], son L de mur (sud de gx 11 à 17, est de gy 12 à 15), la route, le champ, les deux chaumières et l'enclos, au palier 6. Avant ce palier on y voit moins de choses, à la même place. Après, on ajoute autour sans repeindre.
- Les crops `lisiere` et `pieds` sont verrouillés eux aussi, en haut à gauche. Toute croissance vers le haut les touche : chaque direction dit ce qu'elle en fait, et Guillaume tranche.
- Les plans sont des croquis vus dans le sens de l'écran. `T` forêt, `q` maisons et jardins, `~` eau, `#` mur, `|` et `=` rue.

## A. La Grand-Rue
- **Idée** : le village est une seule longue rue en S qui monte l'écran, de la porte sud jusqu'à la forêt.
- **Disposition** : les bâtiments du joueur bordent la rue en quinconce, décalés de 2 tuiles sur le côté, à 3 tuiles d'écart au moins, les bas près de la porte et les hauts vers le haut. La rue s'élargit en place au feu et à la salle, qui reste en [8, 7]. Palier 1 : une tente et un sentier piqueté entre la porte et le feu.
- **Quartiers** : des lanières de jardin derrière chaque façade. Palier 3 : deux maisons au feu. Palier 6 : la rue est bordée entre les bâtiments. Palier 9 : des ruelles en arête de poisson, avec halle et taverne. Palier 12 : deuxième rang de maisons des deux côtés.
- **Carte** : environ 100 tuiles de plus, en haut de l'écran, au-delà de la rivière, fondu dans la lisière, le sol raccordé au reste. Le cadrage reste celui d'un téléphone en hauteur.
- **Alentours** : palier 1, une terre retournée et un appentis au bord de la route. Palier 6, les fermes du coin. Palier 12, des hameaux à chaque virage et un petit bourg marchand après le pont.
- **Lumière** : le jour, la place du feu et de la salle reste la plus claire, et la valeur baisse vers les deux bouts. La nuit, une colonne de lanternes dessine la rue, plus forte à la place. La rivière et la forêt restent ardoise.
- **Coin** : tir à l'arc, fontaine et route haute ne bougent pas, et le coin reste entier. Les bâtiments du nord passent le long de la rue ou sur l'autre rive, et les remparts du nord-est disparaissent. La rue traverse le crop `lisiere` : il recule et doit être reverrouillé, avec `pieds` en partie.
```
 T T T   antre    bourg marchand    T T T
  bosquet   q|q   tour    observatoire
  moulin    q|q   grange    ferme
 ~~~~~~~~~~~ pont ~~~~~~~~~~~~~~~~~~~~~~~
  carriere  q|q   forge     tour de guet
    qqq    SALLE|halle  armurerie    qqq
  puits tente |FEU| mannequin  chateau=route haute
  fontaine qqq|qq  tir a l'arc
  arene  #####porte######
              | fermes, coin verrouille
```
- **Risque** : une rue droite en colonne, où chaque bâtiment cache celui du dessus et où l'œil lit une liste.
- **FLUX t1** : Repaint this isometric village at its very start: a campfire, one tent and a well beside a stake-lined dirt track climbing from the lower gap toward the upper meadow. Add a turned earth patch and one lean-to low on the road. Lanes stay empty, warm light from top-left, slate shadows. Keep the camera angle and the dark inked hand-painted map style.
- **FLUX t6** : Repaint this isometric village as one long S-curved street climbing the image from the lower gate to the hall. Add painted half-timbered houses and narrow garden strips in the gaps between existing buildings on both sides, with cobbles around the fire square. Keep the gate, lower road and farms as they are, the camera angle, inked hand-painted style, top-left light and empty lanes.
- **FLUX t12 jour** : Repaint this isometric village as a dense market town along one winding high street, from the walled lower gate up across a stone bridge to the dark forest. Add herringbone lanes of painted houses, a covered market, a tavern, riverside workshops, rich farms and a small hamlet past the bridge. Existing buildings stay fully visible. Keep camera angle, ink style, top-left light, blank signboards.
- **FLUX t12 nuit** : Regrade this isometric market town to a deep slate blue night, keeping ochre and moss colour in the ground. Add warm amber windows and a chain of lanterns along the high street, strongest around the fire square and hall, fading toward the bridge and far hamlet. Keep every building, the varied dark forest, camera angle, inked hand-painted style, empty streets and blank signboards.

## B. La Boucle
- **Idée** : la rivière fait un méandre autour du village, et le mur ne ferme plus que le col, là où l'eau s'arrête.
- **Disposition** : le bras gauche reste en gx 2, un bras neuf et large passe derrière, avec un gué ouvert à l'est, un autre descend en gx 19. Les rues sont des anneaux courbes autour du feu, avec des rayons vers les ponts. Palier 1 : le feu dans le pré de la boucle, une barque, un appentis et trois planches sur l'eau.
- **Quartiers** : ils montent du centre vers l'eau. Palier 3 : la place et ses étals. Palier 6 : un premier anneau de maisons peintes et de jardins. Palier 9 : la taverne, puis les ateliers sur les quais. Un pont neuf à chaque palier pair. Palier 12 : ils passent les ponts et forment des faubourgs sur l'autre rive.
- **Carte** : environ 80 tuiles de plus, 3 rangs derrière (gy -3 à -1) et une bande à l'est de gx 19. Jamais au sud. Le cadrage reste le losange d'aujourd'hui.
- **Alentours** : palier 1, une barque et un appentis sur la berge. Palier 6, les fermes du coin. Palier 12, des hameaux en face de chaque pont et un petit bourg marchand à l'est, sur la route haute.
- **Lumière** : le jour, le centre de la boucle reste le plus clair et l'eau ardoise fait le cadre. La nuit, les fenêtres se reflètent par courts traits sur l'eau, en lumière de code. La rive d'en face garde quelques feux, plus bas.
- **Coin** : mur sud, porte et route restent, et le mur sud devient le col. La route haute reste où elle est. Les remparts du nord-est disparaissent du plan. L'antre passe sur l'autre rive. `pieds` ne bouge pas, `lisiere` recule de 3 rangs et doit être reverrouillé.
```
    T T   antre   T T   hameau    T T
 ~~~~~~~~~~~~~~ pont ~~~~~~~~~~~~~~~~~~
 ~  moulin  ateliers quai   tour     ~
 ~  qqq   carriere   bosquet   qqq   ~
 ~  grange  qq  SALLE  forge   qq    ~
 ~  ferme   qq  FEU halle armurerie  ~
 ~  observ.  tente mannequin  guet   ~
 ~  puits fontaine  tir  chateau=pont=route haute
 ~  arene ####porte####
             | fermes, coin verrouille
```
- **Risque** : un anneau d'eau trop net se lit comme une île, ce que la bible interdit, alors il faut un col large et des rives habitées.
- **FLUX t1** : Repaint this isometric landscape with the river sweeping in a wide bend around a meadow. Add a lone campfire, one tent and a well in the middle of the bend, three planks over the water, a moored small boat and one lean-to on the bank. Lanes stay empty, warm light from top-left, slate shadows. Keep the camera angle and the dark inked hand-painted map style.
- **FLUX t6** : Repaint this isometric village inside a wide river bend that wraps its back and right side. Add curved rows of painted houses and small gardens in a ring around the fire square, between the existing buildings, and two timber bridges. Keep the lower wall, gate, road and farms as they are, the camera angle, inked hand-painted style, top-left light, slate shadows and empty lanes.
- **FLUX t12 jour** : Repaint this isometric village as a dense town in a wide river bend open to a wide meadow, its banks inhabited, one wall across the open neck at the bottom. Add curved streets of painted houses, a covered market, a tavern, workshops along stone quays, three bridges, and suburbs with hamlets on the far banks, empty quays. Existing buildings stay fully visible. Keep camera angle, ink style, top-left light, slate water, blank signboards.
- **FLUX t12 nuit** : Regrade this isometric river town to a deep slate blue night, keeping ochre and moss colour in the ground. Add warm amber windows, brightest in the centre of the bend, with short golden reflections on the dark water along the quays and a few low lights on the far banks. Keep every building, camera angle, inked hand-painted style, empty streets and blank signboards.

## C. Les Essarts
- **Idée** : le village naît de clairières taillées dans une forêt sombre, la route sud finit en sentier vers l'une d'elles, et elles finissent par se rejoindre en une ville.
- **Disposition** : une clairière par métier autour de celle du feu, reliées par des sentiers en étoile, puis par une route en anneau au palier 8. Les arbres restent sur les côtés de chaque clairière, jamais devant. Palier 1 : une seule clairière aux souches fraîches, autour du feu.
- **Quartiers** : chaque clairière a le sien : potagers et chaumières chez les fermiers, ateliers et taverne chez les forgerons, jardins d'herbes au fond, marché au centre. Palier 6 : les maisons entourent les places. Palier 9 : elles longent les sentiers. Palier 12 : les langues de forêt ne sont plus que des bosquets entre les rues.
- **Carte** : environ 150 tuiles de plus, soit 23 x 24 environ, plafond du recul de caméra, en haut et sur les deux côtés, jamais au sud. C'est quand même le plus gros recul des trois, donc les bâtiments les plus petits au téléphone.
- **Alentours** : palier 1, un appentis et une terre retournée entre les souches. Palier 6, les fermes du coin et deux huttes dans une petite clairière. Palier 12, des hameaux dans leurs clairières et un petit bourg marchand à l'est, sur la route haute.
- **Lumière** : le jour, la clairière du feu est une flaque de soleil, la plus claire, et les autres descendent d'un cran. Bouleau, chêne et pin gardent leurs teintes. La nuit, des poches chaudes dans le noir, reliées par des fils de lanternes.
- **Coin** : porte, L de mur et route restent, et le mur n'enclot que la clairière de la porte. Tir à l'arc, fontaine et route haute ne bougent pas, le château reste en [17, 9], et les remparts du nord-est disparaissent. Les autres bâtiments se regroupent par métier. `lisiere` et `pieds` reculent, à reverrouiller.
```
 T T  antre  T T  observ.  T  bosquet tour  T T
 T hameau  T T T   qqq   T T   qqq   T T  hameau
 T  moulin grange  T  T  carriere  T T T T T T
 ~  ferme  qqq  T  SALLE halle  T  forge armurerie
 ~  puits  qq   T  FEU tente qq  T  guet   qqq
 ~  qq  T  T    T  mannequin fontaine T chateau=route haute
 ~  T T  arene  qqq T tir a l'arc  T T  bourg
 T T T T  ####porte####   T T T T T
             | fermes, coin verrouille
```
- **Risque** : au téléphone, une masse verte semée de petits villages, loin de la ville dense voulue, alors dès le palier 6 la forêt ne dépasse pas un quart de la surface du village, et elle reste sombre autour de lui.
- **FLUX t1** : Repaint this isometric landscape so dense mixed birch, oak and pine forest closes in around one small clearing with fresh tree stumps. Add a campfire, one tent, a well, a turned earth patch and one lean-to inside the clearing, with a thin trail leaving it. Warm light from top-left falls into the clearing, slate shadows. Keep the camera angle and the dark inked hand-painted map style.
- **FLUX t6** : Repaint this isometric village as four forest clearings joined by dirt trails, the fire clearing largest and sunlit. Add tongues of mixed forest between the clearings, stumps along their edges, and small groups of painted houses and gardens around each square. Keep the lower wall, gate, road and farms as they are, the camera angle, inked hand-painted style, top-left light and empty lanes.
- **FLUX t12 jour** : Repaint this isometric village as a dense town where forest clearings have merged, with only groves of dark birch, oak and pine left between streets. Add painted houses along every trail, a market at the centre, a tavern and workshops by the forge, herb gardens at the back, a ring road, one far hamlet, buildings lighter than the trees. Existing buildings stay fully visible. Keep camera angle, ink style, top-left light, blank signboards.
- **FLUX t12 nuit** : Regrade this isometric forest town to a deep slate blue night, keeping moss, ochre and distinct tree tints. Add warm amber windows in pockets of light, the largest at the central fire clearing and smaller ones at each quarter, joined by thin threads of lanterns through the dark groves. Keep every building, camera angle, inked hand-painted style, empty streets and blank signboards.

## Audit rapide (04/11, mara, theo, env)

Corrections déjà reportées plus haut. Ce qu'ils en disent :
- **A** : la plus lisible, risque de liste en colonne (mara, theo). Le sol ajouté en haut peut sembler collé (env).
- **B** : la plus belle capture et la meilleure joie de palier, choix de theo. Risque d'île, et la rivière actuelle est mince (env, mara).
- **C** : la plus forte en ambiance et la plus cohérente avec les arbres déjà peints, la plus faible au téléphone (mara, theo, env).
- **Toutes** : au téléphone la ville fait environ 1/4 de la hauteur et sa valeur est plate, le feu ne ressort pas (mara).
- **Ajouté à chaque prompt de peinture** : isometric 2:1, same camera, no people, no text, no banners with symbols, the player's buildings tallest and brightest, quarter houses lower and muted.
