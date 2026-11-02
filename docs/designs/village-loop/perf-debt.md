# Dette de perf de la boucle « sublime »

Tout ce qui alourdit le village pendant la boucle, avec où ça vit, classé par coût probable. La passe d'optimisation part de cette liste. Rien ici ne bloque un lot.

## Point de départ (iter-00, tête 3471d917)

Émulateur `bati-bench`, build `.perf`, palier 12, écran `dev-iso`. Chiffres d'émulateur (GPU Goldfish, Skia OpenGL) : bons pour comparer deux itérations, pas pour juger le Fairphone.

| Prise | Images | p50 / p90 / p99 | GPU p50 / p90 | Retard d'image | Mémoire GPU | Vues |
| --- | --- | --- | --- | --- | --- | --- |
| repos (10 s sans toucher) | 0 | - | - | 0 | 48,9 Mo (textures 34,5) | 1980 |
| montée de stade | 537 | 23 / 29 / 46 ms | 18 / 22 ms | 7 (1,3 %) | 106,4 Mo (textures 71,5 + scratch 22,8 en 12 entrées) | 2031 |
| glisse + zoom | 550 | 24 / 28 / 32 ms | 18 / 21 ms | 3 (0,55 %) | 104,4 Mo (textures 77,9 + scratch 13,6 en 87 entrées) | 1980 |

Lecture :
- Au repos, 0 image : la règle des vagues (`MODE_VIE = "vagues"`, `constants/isoPoc.ts`, horloge unique `components/village/iso/horloge.ts`) tient. C'est aussi pourquoi rien ne bouge. Toute vie ambiante ajoutée fera passer cette ligne de 0 à N images : c'est la première dette à mesurer.
- p50 à 23-24 ms sur les deux prises animées, GPU à 18 ms : le coût est surtout au rendu GPU (surface plein écran, couches), pas au thread UI (3 « Slow UI thread » en montée, 0 en glisse).
- La mémoire GPU double dès qu'on bouge (49 à 104-106 Mo). En montée, 22,8 Mo de scratch en 12 entrées : des calques hors écran (opacité de groupe ou `Animated.View` à opacité sur des sous-arbres). En glisse, 87 petites textures scratch : décodages au fil du zoom.
- 1980 vues montées au repos, 3,3 Mo de render nodes : l'arbre est lourd avant tout ajout.

Budget d'animation : plafond technique 64 nœuds animés (`__tests__/iso-ciel.test.tsx`, `PLAFOND_NOEUDS`), pire cas noté à 63 sur 64 (TODO V1 § 3). Il reste 1 nœud. Cliquets de `iso-perf-compteur` : opacités au plus 55, tailles d'image distinctes au plus 20 (19 prises selon T44).

## Iter-01 (tête 891f6da2), mêmes prises

| Prise | Images | p50 / p90 / p99 | GPU p50 / p90 | Retard d'image | Mémoire GPU | Vues |
| --- | --- | --- | --- | --- | --- | --- |
| repos (10 s sans toucher) | **550** (0) | **27 / 34 / 40 ms** | 18 / 22 ms | 3 (0,55 %) | 48,3 Mo (textures 33,3, cibles de rendu 12,0 en 12) | 2022 (+42) |
| montée de stade | 596 (+59) | 25 / 32 / 48 ms (+2 / +3 / +2) | 18 / 22 ms | 9 (1,51 %, était 1,3 %) ; 6 « Slow UI thread » (3), 2 « Slow bitmap uploads » (0) | 105,6 Mo (scratch 22,8 en 13) | 2113 (+82) |
| glisse + zoom | 550 (=) | 24 / 28 / 32 ms (=) | 18 / 21 ms (=) | 3 (0,55 %, =) | 105,2 Mo (textures 78,5, scratch 13,9 en 58, était 87) | 2022 (+42) |

Lecture :
- Le repos passe de 0 à environ 54 images par seconde (horloge continue, `MODE_VIE = "continu"`, coupée 60 s après le dernier toucher). Ces images coûtent PLUS qu'une glisse : p50 27 ms contre 24, p90 34 contre 28. Le GPU est le même (18 ms) : le surcoût est côté CPU (thread de rendu et commits Reanimated de tous les nœuds animés à chaque image, « Slow issue draw commands » 3).
- La glisse ne bouge pas : la lumière en espace carte (`AmbianceCarte`, aplats de débord plein écran) ne se voit pas sur l'émulateur. À reprendre sur le Fairphone (GPU plus faible, remplissage x2 à x3).
- Montée un peu plus lourde : plus de vues (+82), deux téléversements d'image lents (nouvelles tailles ou nouvelles textures au moment de la croissance).
- Le retard d'image du repos (0,55 %) n'est pas le bon indicateur : ce qui compte, c'est 60 s d'images à 27 ms sur batterie.

## Iter-02 (tête f4609110), mêmes prises + repos 60 s et montée de nuit

Comparé à `iter-01-captures-b` (même build `.perf`, même émulateur). La montée de nuit n'a pas de point de comparaison.

| Prise | Images | p50 / p90 / p99 | GPU p50 / p90 | Retard d'image | Mémoire GPU | Vues |
| --- | --- | --- | --- | --- | --- | --- |
| repos (10 s) | 547 (550) | 26 / 30 / 32 ms (était 27 / 34 / 40) | 18 / 21 ms | 2 (0,37 %) ; 1 « Slow UI thread » | 52,1 Mo (48,3) : textures 38,0 en 229 entrées (33,3 en 161), scratch 2,0 en 42 | **2295 (+273)**, RenderNode 3776 kB (+383) |
| repos 60 s (nouveau) | **3602** (60 i/s pendant 60 s) | 25 / 31 / 38 ms | 18 / 21 ms | 4 (0,11 %) ; 1 « Slow UI thread », 4 « Slow issue draw » | 52,6 Mo (scratch 4,9 en 90) | 2287 |
| montée de jour | 535 (596) | 25 / 30 / 48 ms (était 25 / 32 / 48) | 18 / 21 ms | 9 (1,68 %, était 1,51 %) ; 7 « Slow UI thread » (6), **4 « Slow bitmap uploads » (2)** | 104,9 Mo : textures 70,6 ; scratch 22,2 Mo en **81 entrées (13)** | 2030 (-83) |
| montée de nuit (nouveau) | 531 | 27 / 32 / 48 ms, p95 40 | 18 / 22 ms | 9 (1,69 %) ; 6 « Slow UI thread », 3 « Slow bitmap uploads » | 105,8 Mo : **textures 81,7 (+11 contre le jour)** ; scratch 12,0 en 17 | 2128 (+98 contre le jour) |
| glisse + zoom | 550 (=) | **26 / 30 / 32 ms (+2 / +2 / =)** | 18 / 21 ms | 4 (0,73 %, était 0,55 %) | 108,5 Mo (105,2) : textures 81,1 en 270 ; scratch 14,5 Mo en **106 entrées (58)** | 2025 |

Lecture :
- Repos 60 s : l'horloge tourne bien 60 s à 60 i/s (3602 images), p50 25 ms, puis s'arrête. Aucun pic vers 15, 30, 45 s (1 seul « Slow UI thread » sur 60 s, diff d'images sans saut) : la replanification toutes les 15 s (H1-08) ne se voit pas sur émulateur. Le coût, c'est la durée : 60 s d'images pleines sur batterie.
- Repos : +273 vues au même palier, à attribuer. Piste la plus probable : le cadrage B1 plus serré fait passer un seuil de niveau de détail (`detail.ts`) et monte plus de détails (fenêtres, figurines). Les 4 corbeaux (4 `AnimatedPath`) et les bandes de vignette n'expliquent pas 273. À vérifier par un `uiautomator dump` à l'ouverture, avant et après B1.
- Montée : même poids de scratch (22 Mo) mais 13 à 81 entrées : beaucoup de petits calques. Nouveaux pendant la montée : halo `Reclame` (opacité + échelle sur une vue qui porte un `Svg` à `RadialGradient`, calque hors écran à chaque image de la vague), légende en `Animated.View` à opacité (vue bordée, calque hors écran 1,5 s), 3 traits d'onde, 2 chemins de points. Deux téléversements d'image lents de plus.
- Nuit : +11 Mo de textures contre le jour. Cause probable : les flaques en UN `Svg` de LARGEUR x HAUTEUR (`AmbianceCarte.tsx`, `Mares`), soit un bitmap de la taille de la carte entière en pixels. p95 à 40 ms.
- Glisse : +2 ms au p50, scratch 58 à 106 entrées. Deux causes probables : le zoom d'ouverture plus fort (plus de décodages au zoom), et la vignette en 8 couches qui couvrent toutes tout le débord (`bandesBord.ts`, coins en double, aplats de 2 x LARGEUR sur 5 x HAUTEUR).

## Iter-03 (tête 796dcc92), mêmes prises, couches peintes allumées (`peint=tout`)

Attention : iter-02 était prise sans couches peintes. L'écart mélange donc F2 (bâtiments de jour), B3 (disposition, rempart) et les alentours. La montée n'a pas été jouée (tap à côté du bâtiment) : ses deux lignes sont un repos de plus, pas une montée.

| Prise | Images | p50 / p90 / p99 | GPU p50 / p90 | Retard d'image | Mémoire GPU | Vues |
| --- | --- | --- | --- | --- | --- | --- |
| repos (10 s) | **135** (547) | **133 / 150 / 150 ms** (26 / 30 / 32) | 9 / 17 ms | **100 %** ; 135 « Slow bitmap uploads » sur 135, 88 « Slow UI thread » | **172,1 Mo** (52,1) : textures **161,6 en 195 entrées** (38,0 en 229), 0 purgeable | 1786 (**-509**), RenderNode 2947 kB (3776) |
| repos 60 s | **898** (3602) | 129 / 150 / 150 ms | 7 / 16 ms | 100 % ; 898 téléversements lents, 656 UI lents | 172,1 Mo | 1778 |
| montée de jour (non jouée) | 128 (535) | 150 / 150 / 150 ms | 10 / 17 ms | 100 % | 172,3 Mo (textures 161,7) | 1788 |
| montée de nuit (non jouée) | 120 (531) | 150 / 150 / 150 ms | 10 / 17 ms | 100 % | 185,2 Mo (textures 174,7, +13 contre le jour) | 1969 (+181 contre le jour) |
| glisse + zoom | 117 (550) | 150 / 150 / 150 ms | 10 / 16 ms | 100 % | **208,0 Mo** (108,5) : textures 195,4 | 1840 |

Lecture :
- Le village tombe à 12-13 images/s partout, même au repos. Le GPU n'est pas en cause (p50 7 à 10 ms, plus bas qu'avant). Chaque image a un « Slow bitmap upload » : les textures sont renvoyées au GPU à chaque image.
- Cause presque certaine : le sol peint (`Alentours.tsx` `TerrainPeint`, `alentours.ts` `TERRAIN`). 12 tuiles de 1656 x 1614 px, 10,7 Mo décodées chacune, 128 Mo en tout, toutes montées. Les textures passent de 38 à 162 Mo (+124 Mo, le même ordre). Au-delà du budget du cache de HWUI, rien n'est purgeable : chaque image en chasse une autre et la renvoie.
- Gain réel : -509 vues (pelouse vectorielle, tuiles de forêt de `Monde` et lisière retirées sous les couches peintes).
- Nuit : +13 Mo de textures, +181 vues contre le jour (flaques `Mares` pleine carte, fenêtres et lueurs).
- Mesures à reprendre : la même série avec `peint` absent, pour séparer F2 et B3 des couches peintes, et une montée qui part vraiment (`jouer=1`, voir audit tech iter-03).

## Iter-04 (tête 161d8349), mêmes prises, couches peintes allumées (`peint=tout`)

Comparé à `iter-03-captures` (même build `.perf`, même émulateur, mêmes couches). La montée est enfin jouée (`jouer=1`), mais sa vidéo contient un redémarrage de l'app (images 12 à 36 : écran de lancement puis chargement) : ses deux lignes mélangent démarrage à froid et montée, à ne pas comparer aux lignes d'iter-03 (montée non jouée).

| Prise | Images | p50 / p90 / p99 | GPU p50 / p90 | Retard d'image | Mémoire GPU | Vues |
| --- | --- | --- | --- | --- | --- | --- |
| repos (10 s) | 130 (135) | **150 / 150 / 150 ms** (133 / 150 / 150) | 11 / 17 ms | 100 % ; 130 téléversements lents sur 130, 77 UI lents (88) | **181,1 Mo** (172,1) : textures **170,5 en 197** (161,6 en 195), 0 purgeable | **1848 (+62)**, RenderNode 3032 kB (2947) |
| repos 60 s | **832** (898) | 150 / 150 / 150 ms (129 / 150 / 150) | 10 / 17 ms | 100 % ; 832 téléversements lents, 500 UI lents (656), **395 « Slow issue draw » (240)** | 181,1 Mo | 1840 (+62) |
| montée de jour (jouée, avec démarrage) | 75 | 150 / 150 / 350 ms, p95 200 | 8 / 16 ms, **p99 4950 ms** (une image : premier téléversement de toutes les textures) | 68 % ; 48 téléversements lents | 215,7 Mo : textures **203,2** | 1828 |
| montée de nuit (jouée, avec démarrage) | 49 | 150 / 200 / 200 ms | 10 / 17 ms | 100 % | **228,7 Mo** : textures 216,2 (+13 contre le jour) | 1961 (+133 contre le jour) |
| glisse + zoom | 117 (117) | 150 / 150 / 150 ms (=) | 10 / 17 ms | 100 % | 215,8 Mo (208,0) : textures 203,2 en 198 (195,4) | **1902 (+62)** |

Lecture :
- Toujours 12 images/s et un téléversement lent par image : le point 1 (sol peint) n'a pas bougé, il domine tout le reste. Le repos glisse de 133 à 150 ms au p50, le repos 60 s perd 66 images.
- +9 Mo de textures et +62 vues à palier égal. Ce qui arrive : 24 tuiles de champs peintes (`Alentours.tsx` `ChampPeint`, 6 fichiers de 512 x 384 px, 0,8 Mo décodés chacun), 22 pièces de rempart en images (`Rempart.tsx` `peint`, 12 fichiers de 512 x 640 px, 1,3 Mo décodés chacun, à la place de 5 `Svg`), l'ensemble de vocation (`EnsembleVocation.tsx` : 1 `Svg` de sol, 2 `Svg` de choses, 2 bannières qui ondulent sur l'horloge). 24 + 22 - 5 + ~7 ≈ +48 à +62 vues.
- « Slow issue draw commands » de 240 à 395 sur 60 s : plus de nœuds à dessiner par image (les mêmes +62 vues, et les 2 bannières de vocation animées au repos).
- Démarrage : une image GPU de 4,95 s quand la carte apparaît (toutes les textures montées d'un coup, ~200 Mo). C'est aussi ce que voit le joueur : sol vectoriel nu, puis sol peint tuile par tuile, puis bâtiments (voir audit tech iter-04, T4-10).
- Nuit : +13 Mo de textures contre le jour, comme en iter-03 (flaques `Mares` pleine carte ; les nuits cuites du sol ont la même taille que le jour, un seul jeu monté à la fois).
- Mesures fausses à corriger avant la prochaine comparaison : une partie des sprites à l'écran sont les fichiers d'avant l'itération (cache disque d'expo-image, voir audit tech iter-04). Vider le cache d'images de l'app avant chaque série.

## Iter-05 (tête 11b270ba), mêmes prises, couches peintes allumées, cache d'images vidé avant la série

Comparé à `iter-04-captures-b` (même build `.perf`, même émulateur, mêmes couches). Les deux montées partent d'un `force-stop` puis du lien (`act_pret_jour`, `act_pret_nuit`) : chaque ligne de montée mélange démarrage à froid, fondu d'ouverture et montée, comme en iter-04. Le cache vidé rend les chiffres de textures enfin honnêtes (plus de sprites périmés).

| Prise | Images | p50 / p90 / p99 | GPU p50 / p90 / p99 | Retard d'image | Mémoire GPU | Vues |
| --- | --- | --- | --- | --- | --- | --- |
| repos (10 s) | 125 (130) | 150 / 150 / 150 ms (=) | 10 / 16 / 18 ms | 100 % ; 125 téléversements lents, 81 UI lents (77), 55 « Slow issue draw » (65) | 182,6 Mo (181,1) : textures 172,0 en 199 (170,5 en 197) | **2188 (+340)**, RenderNode 3571 kB (3032, +539) |
| repos 60 s | 830 (832) | 150 / 150 / 150 ms (=) | 10 / 17 / 18 ms | 100 % ; 830 téléversements lents, 516 UI lents (500), **413 « Slow issue draw » (395)** | 181,9 Mo (181,1) | **2180 (+340)**, RenderNode 3557 kB |
| montée de jour (avec démarrage) | 59 (75) | 150 / 150 / 200 ms (150 / 150 / 350) | 9 / 17 / **4950 ms** (=, une image : premier téléversement) | 94,9 % (68 %) ; 54 téléversements lents (48), 33 UI lents (30) | 216,9 Mo (215,7) : textures 204,4 | **2182 (+354)** |
| montée de nuit (avec démarrage) | 54 (49) | 150 / 200 / 250 ms (150 / 200 / 200) | 9 / 16 / 18 ms | 100 % ; 54 téléversements lents (48), 35 UI lents (30) | 229,6 Mo (228,7) : textures 217,0 (+12,6 contre le jour) | **2294 (+333)** |
| glisse + zoom | 116 (117) | 150 / 150 / 150 ms (=) | 10 / 17 / 18 ms | 100 % ; 116 téléversements lents, 73 UI lents (=), 64 « Slow issue draw » (73) | 216,6 Mo (215,8) : textures 204,1 en 199 (203,2 en 198) | **2242 (+340)**, RenderNode 3707 kB (3168) |

Lecture :
- Rien ne change au rythme : 12 images/s et un téléversement lent par image partout. Le sol peint (point 1) masque tout le reste, comme depuis iter-03.
- **+340 vues à palier égal**, sur toutes les prises. Textures presque stables (+0,9 à +1,5 Mo) : ce qui arrive réutilise des images déjà décodées. Attribution probable :
  - pavage des champs hors plan (A7, H4-04 : `IsoCarteDemo.tsx` l. 2167 et 2362, `champs.ts` `tuilesBlocs`) : une `ChampPeint` par case, 6 cases par bloc (`PAS_X` 3 x `PAS_Y` 2). C'est la grosse part, environ 300 vues (à compter avec un `uiautomator dump`). Mêmes 6 fichiers que les champs du plan, donc pas de texture en plus.
  - anneau de forêt (B5 : `alentours.ts` `anneau`) : environ 120 à 130 masses au lieu d'environ 90, soit +35 vues.
  - jour seulement : 2 ombres de nuages (`OmbresNuages.tsx`), 1 vue + 3 `LinearGradient` de rais (`AmbianceCarte.tsx` `Rais`), 1 `Animated.View` de premier plan (`Alentours.tsx` `PremierPlan`) : environ 7 vues.
- RenderNode +539 kB : suit les vues. « Slow issue draw » sur 60 s passe de 395 à 413 : plus de nœuds à dessiner par image, et 3 nouveaux nœuds animés sur l'horloge au repos (2 nuages, les rais).
- Montée : l'image GPU de 4,95 s est toujours là au jour (premier téléversement de ~200 Mo). Le fondu d'ouverture attend maintenant le sol (H4-03) : le joueur voit un rideau sombre au lieu du sol par morceaux, mais le pic de téléversement tombe au début du fondu, pas avant.
- Nuit : +12,6 Mo de textures contre le jour, comme avant (flaques `Mares` pleine carte).
- Nouveaux coûts ponctuels de la montée, non séparables ici : silhouette du nouveau stade (1 nœud de plus, `Image` teintée), 12 étincelles cerclées (trait sur 2 `AnimatedPath`, rasterisé à chaque image), poussière plus grosse, et pendant la montée du rempart les 22 pièces de l'ancien stade sous une opacité animée (`Rempart.tsx` `Sortie`).

## Classement final après iter-05, pour la passe d'optimisation (du plus cher au moins cher)

1. **Sol peint, 12 tuiles de 1656 x 1614 px, 10,7 Mo décodés chacune, toutes montées** (`Alentours.tsx` `TerrainPeint`, `alentours.ts` `TUILES_TERRAIN`, `terrain.ts`). Bloquant : 12 images/s, un téléversement à chaque image, image GPU de 4,95 s au premier affichage. Pistes, de la plus simple à la plus forte : ne monter que les tuiles qui croisent la vue ; peindre à 1,5 px par dp (÷4) ; `decodeFormat="rgb"` sur les tuiles opaques (÷2) ; jamais jour et nuit montés ensemble. Rien d'autre ne se mesure tant que ce point n'est pas réglé.
2. **Horloge continue au repos et ses nouveaux abonnés** (`horloge.ts`, `constants/isoPoc.ts`). Iter-05 ajoute 3 nœuds animés au repos de jour : 2 ombres de nuages (`OmbresNuages.tsx`, ~600 x 240 dp translucides par-dessus tous les sprites, un `Svg` au quart agrandi par le GPU) et les rais (`AmbianceCarte.tsx` `Rais`, opacité animée sur 3 bandes de 70 à 120 dp de large et 1,3 x HAUTEUR de haut, tournées). Remplissage translucide sur une grande surface à chaque image pendant 60 s. Pistes : cadence plus basse pour les nœuds lents (nuages, rais, bannières), rais fixes (le souffle se voit à peine).
3. **Nombre de vues : 2188 au repos (1848 en iter-04, 1980 au départ)**. Chaque commit Reanimated clone ce chemin (performance.md point 3). Premier poste : le pavage des champs hors plan, une image par case (`IsoCarteDemo.tsx` l. 2362, `champs.ts` `tuilesBlocs`). Pistes : une image par bloc (toile de 3 x 2 cases) au lieu de 6 ; ou un seul `Svg` à motif image par bloc. Même piste pour les 24 tuiles des champs du plan.
4. **Anneau de forêt et premier plan qui suit la caméra** (`alentours.ts` `anneau`, `Alentours.tsx` `ForetPeinte`, `PremierPlan`) : ~125 masses de la même toile, et un `Animated.View` sur 3 grandes images en espace écran recalculé à chaque image de glissé. Pistes : regrouper les masses en quelques toiles plus grandes, couper les masses hors de l'étendue de la caméra ; parallaxe seulement au relâcher.
5. **Flaques de nuit en un `Svg` pleine carte** (`AmbianceCarte.tsx` `Mares`) : +12,6 Mo de textures la nuit, inchangé depuis iter-02. Piste : un petit `Svg` par flaque, ou une image prérendue.
6. **Calques et rasterisation de la montée** (`IsoCroissance.tsx` silhouette, `Revelation.tsx` étincelles cerclées et anneau, `Chantier.tsx` `PopFin`, `Rempart.tsx` `Sortie`) : ponctuel (~1 s). Le plus lourd : `Sortie`, 22 images sous une opacité animée pendant la montée du rempart. Pistes : opacité sur chaque `Image` plutôt que sur le groupe ; trait des étincelles remplacé par un second remplissage plus grand.
7. **Fondu d'ouverture sur deux grands sous-arbres** (`ouverture.ts`, `IsoVillage.tsx` l. 572 et 579) : le sol et la carte passent ensemble de 0 à 1 en 450 ms, juste après le pic de téléversement. Ponctuel ; à revoir une fois le point 1 réglé.
8. Inchangés, coût faible ou non mesuré : vignette en 8 couches, décodages au zoom, corbeaux (maintenant au milieu du cadre, même nœud), replanification toutes les 15 s, accessoires du camp et de la vocation, `cibles` refait à chaque rendu.

## Classement après iter-04 (remplacé par le classement final, plus haut)

1. **Sol peint, 12 tuiles de 10,7 Mo toutes montées** (`Alentours.tsx` `TerrainPeint`, `alentours.ts`) : inchangé, toujours bloquant (12 images/s, téléversement à chaque image). Coûte aussi le démarrage : image GPU de 4,95 s et sol qui arrive par morceaux. Mêmes pistes qu'après iter-03.
2. **Horloge continue au repos** (`horloge.ts`, `constants/isoPoc.ts`) : inchangée ; +2 nœuds animés au repos avec les bannières de vocation (`EnsembleVocation.tsx` `BannieresVocation`).
3. **Nouvelles familles d'images : champs (24 vues) et rempart (22 vues)** (`Alentours.tsx` `ChampPeint`, `Rempart.tsx` `peint`) : +9 Mo de textures, +46 vues. Pistes : décoder à la taille de vue (64 x 48 et 64 x 80 dp, soit 192 x 144 et 192 x 240 px à 3x, au lieu de 512 x 384 et 512 x 640) ; une seule image par champ au lieu d'une par case.
4. **Premier plan** (`Alentours.tsx` `PremierPlan`) : inchangé, à mesurer seul.
5. **Flaques de nuit en un `Svg` pleine carte** (`AmbianceCarte.tsx` `Mares`) : +13 Mo la nuit, inchangé.
6. **Remontage des 22 pièces de rempart en fin de croissance du rempart** (`IsoCarteDemo.tsx` clé de `PanRempart` qui change avec la croissance) : 22 décodages à l'entrée et à la sortie de la montée du rempart. Faible, ponctuel.
7. **Masses de forêt, calques de la montée, vignette, décodages au zoom, corbeaux** : inchangés, voir les classements plus bas.

## Classement après iter-03 (remplacé par le classement après iter-04)

1. **Sol peint, 12 tuiles de 10,7 Mo toutes montées** (`Alentours.tsx` `TerrainPeint`, `alentours.ts` l. 41-48) : 128 Mo de textures, cache GPU saturé, téléversement à chaque image, 12 images/s. Bloquant avant d'allumer `sol` en vrai. Pistes, de la plus simple à la plus forte : ne monter que les tuiles qui croisent la vue (`etendue` de la caméra) ; peindre à 1,5 px par dp au lieu de 3 (÷4) ; `decodeFormat="rgb"` sur les 2 tuiles intérieures opaques (÷2) ; jamais deux jeux (jour et nuit) montés en même temps.
2. **Horloge continue au repos** (`horloge.ts`, `constants/isoPoc.ts`) : inchangée, mais chaque image paie maintenant les téléversements. Ce point redevient le premier une fois le 1 réglé.
3. **Premier plan** (`Alentours.tsx` `PremierPlan`) : 3 images de forêt agrandies 1,15 à 1,9 fois, en espace écran, au-dessus de tout : remplissage plein écran à chaque image animée. À mesurer seule.
4. **Flaques de nuit en un `Svg` pleine carte** (`AmbianceCarte.tsx` `Mares`) : +13 Mo la nuit. Même piste qu'avant.
5. **Masses de forêt** (`Alentours.tsx` `ForetPeinte`) : 36 à 52 images, 6 fichiers de 0,7 Mo ; faible en textures, à mesurer en glisse.
6. **Calques hors écran de la montée** (`Reclame.tsx`, `Revelation.tsx`, `Effets.tsx`) ; nouveau : `IsoCroissance.tsx` l. 117, opacité fixe 0,85 sur la vue de l'ancien stade (un calque hors écran pendant la montée), et l'onde passe de 26 à 40 dp de trait (`Revelation.tsx` `TRAIT`). Non mesuré cette fois (montée non jouée).
7. **Pans de rempart** (`Rempart.tsx`, un `Svg` statique par pan) : statique, faible.
8. Vignette en 8 couches, décodages au zoom, corbeaux, replanification : inchangés, voir plus bas.

## Classement après iter-02 (remplacé par le classement après iter-03)

1. **Horloge continue au repos** (`horloge.ts`, `constants/isoPoc.ts` l. 35) : confirmé sur 60 s, 3602 images à 25 ms p50. Pistes : cadence plus basse pour les nœuds lents, couper ce qui est hors écran, couper les corbeaux hors traversée.
2. **+273 vues au repos** (2022 à 2295) : cause à attribuer (cadrage B1 et niveau de détail en tête). Chaque commit Reanimated clone ce chemin (performance.md point 3), donc ce coût se multiplie par les 3600 images de l'horloge.
3. **Flaques de nuit en un `Svg` pleine carte** (`AmbianceCarte.tsx`, `Mares`) : un bitmap de la carte entière, +11 Mo de textures la nuit. Piste : un petit `Svg` par flaque (boîte de la flaque seulement), ou une image prérendue.
4. **Calques hors écran de la montée** (`Reclame.tsx` `Lueur`, `Revelation.tsx` `Legende`, `Fierte.tsx` `Scintille`, `Effets.tsx`) : 81 entrées scratch, 4 téléversements lents. Piste : opacité sur le `Stop` ou le `fill-opacity` du `Svg` plutôt que sur la vue, `needsOffscreenAlphaCompositing` faux.
5. **Vignette de jour en 8 couches pleine longueur** (`bandesBord.ts`, `AmbianceCarte.tsx` `Bords`) : remplissage GPU, coins en double. Invisible au GPU de l'émulateur (18 ms stable), à mesurer sur le Fairphone.
6. **Décodages au zoom** : scratch de glisse 58 à 106 entrées avec le cadrage plus serré.
7. **Corbeaux** (`petitsDetails.tsx` `UnCorbeau`) : 4 `d` recalculés par image pendant la traversée (5 s par vague de 15 s). Faible.
8. **Replanification toutes les 15 s** (`horloge.ts`, `useMarcheurs.ts`) : rien de visible en 60 s sur émulateur ; descendre dans la liste, à revoir sur appareil.
9. Accessoires du camp et de la vocation (3 `Path` par tuile touchée, statiques) : faible.

## Ce qui coûte déjà le plus (classé, point de départ)

1. **Calques hors écran pendant la révélation et les effets** : opacité animée sur une vue qui porte un `Svg` (`Revelation.tsx` l. 82 éclat, `Effets.tsx` l. 179), voile de cadre `LinearGradient` plein écran (`Monde.tsx` l. 108). Signe : 22,8 Mo de scratch en montée, GPU p50 18 ms.
2. **Tuiles vectorielles du sol** (`IsoCarteDemo.tsx` `Tuile`, un `Svg` par tuile, une vingtaine de chemins chacune, deux `ClipPath` dont l'ombre unie) : redessinées à chaque changement d'échelle de la caméra. Signe : glisse à 24 ms p50.
3. **Nombre de vues** (1980) : habitants, figurines, pièces de lisière, couvertures de fenêtres. Chaque commit Fabric de Reanimated clone ce chemin (voir `docs/architecture/performance.md`, point 3).
4. **Décodage d'images au zoom** : 87 textures scratch en glisse, textures de 34,5 à 77,9 Mo. Tuiles de forêt `mondeTuiles/*.webp` et maquettes.
5. **Planche factice 36 Ko** (`Revelation.tsx` l. 52) : poids d'APK seulement, aucune image au rendu.

## Ajouts de la boucle

| Ajout | Où | Lot | Coût probable | Mesure |
| --- | --- | --- | --- | --- |
| Horloge continue (60 s après le dernier toucher, coupée hors focus, mouvement réduit, lecteur d'écran, fige/E2E) | `components/village/iso/horloge.ts`, `constants/isoPoc.ts` | E1 | Le repos passe de 0 image à une animation continue pendant 60 s : une validation de Reanimated par image, un commit Fabric par image sur un arbre de ~2000 vues (voir performance.md point 3) ; coût réel selon ce que les autres lots animent | à prendre : images et CPU UI sur 60 s de repos, avant et après |
| Bannières qui ondulent (un nœud animé par bannière, 3 au plus, sur l'horloge, au repos aussi) ; plafond de nœuds 64 à 68, 9 familles au lieu de 8 (`vent`) | `components/village/iso/Fierte.tsx`, `fierte.ts`, `familles.ts` | E1 | 3 vues animées de plus, un commit Fabric par image pendant les 60 s ; faible | à prendre avec la ligne de l'horloge continue |
| Iter-02 A3 : lumière de la carte déplacée sous les sprites (montée dans `IsoCarte` entre les `Tuile` et `Objets`) ; flaques de nuit en UN `Svg` (carte entière, 1 `RadialGradient` par tiédeur, 1 `Ellipse` par source) au lieu de 2 `View` rondes par source ; flaques de `Tuile` supprimées ; bandes de vignette sans recouvrement (bandes latérales sur tout le débord) | `AmbianceCarte.tsx`, `IsoCarteDemo.tsx`, `lueurs.ts` | A3 | Nuit seulement : +1 `Svg` de ~LARGEUR x HAUTEUR (dégradés radiaux, pas de calque hors écran), moins de vues qu'avant (2 `View` par source en moins) ; le jour est inchangé (mêmes aplats) | à prendre : prise de nuit en glisse, avant et après |
| Lumière de la carte en espace carte : voile plat, 4 bandes `LinearGradient` de bord, 4 aplats de débord (2 x largeur de la carte), 2 flaques `View` à `borderRadius` 50 % par bâtiment éclairé la nuit. Remplace le `LinearGradient` plein écran de `Monde.tsx` | `components/village/iso/AmbianceCarte.tsx` | A1 | ~20 vues de plus, aplats rgba sans `opacity` (pas de calque hors écran), aucune animation ; les aplats de débord font ~3500 x 3500 dp de remplissage GPU sous la caméra (overdraw x2 sur toute la carte) | iter-01 : glisse identique sur émulateur (24 ms p50, GPU 18). Prise de nuit à faire. Les flaques sont dessinées deux fois (aussi dans `Tuile`), à corriger de toute façon (audit tech iter-01) |
| Iter-02 E2 : montée en spectacle. 10 points chauds en 2 `Path` animés (`d` recalculé par image, ~1 s, un `Svg` de 120 x 100 dp) au lieu de 6 grains `Particule` ; onde à 3 traits superposés (3 `AnimatedPath` sur les mêmes `d`, bitmap logiciel à 0,4, ~0,5 s) ; secousse de caméra (une valeur partagée de plus dans la transformation de la carte et du monde, 120 ms) et glissé de 500 ms ; phrase d'histoire en `Animated.View` (opacité + translation, 1,5 s) ; halo de chantier prêt en `RadialGradient` qui respire (même nœud qu'avant, pendant la vague seulement) ; oiseaux : toujours 1 `Svg` mais 4 `AnimatedPath` (battements désynchronisés), 4 `d` recalculés par image pendant la traversée | `Revelation.tsx`, `revelation.ts`, `useCameraIso.ts`, `Reclame.tsx`, `petitsDetails.tsx`, `vivant.ts` | E2 | Pendant la montée seulement (~1 s) : +2 `Path` animés sur la couche de croissance, 2 traits d'onde de plus à rasteriser par le Svg logiciel ; la traversée des oiseaux ajoute 3 props animées. Au repos : rien de plus | à prendre : montée filmée en release (images et GPU de la seconde d'impact) |
| Iter-02 réparation : plafond de `Svg` de `iso-perf-compteur` de 95 à 100 (nuit, pire cas ; jour 89, mesure faite avec l'horloge figée au 2 nov. 2026 12 h, le test passe `lumiere` explicitement et ne lit pas l'heure réelle). Le seul `Svg` ajouté par les lots de l'itération est celui de A3 : les flaques de nuit en UN `Svg` pleine carte (`AmbianceCarte`, +1 la nuit seulement, ~27 nœuds de plus) ; E2 est neutre (l'éclat passe de 1 à 1 `Svg`, les oiseaux restent 1 `Svg`), G1 n'en monte pas encore. Les 99 autres viennent de la carte existante (19 tuiles, socles, vitres, fenêtres, fumées, animaux) : la tête 891f6da2 n'a pas pu être remesurée (extraction de l'arbre refusée par la garde), l'écart avec 95 n'est donc pas attribué plus finement. Le cliquet des tailles d'image reste à 20. Onde et anneau de la montée déplacés dans la couche sol de `IsoCarte` (même `Svg`, mêmes valeurs animées) | `__tests__/iso-perf-compteur.test.tsx`, `IsoCarteDemo.tsx`, `IsoCroissance.tsx` | A3, E2 | Aucun coût d'exécution nouveau ; les nœuds de nuit dépassent le plafond de 1024 (1042 mesurés) | plafond de nœuds à décider |
| Iter-02 G1 : accessoires de la vocation (bornes et fanions, barre et anneaux...) en 3 `Path` par tuile que les accessoires touchent (la salle des héros), rien sans blason ; plafond de nœuds de `iso-perf-compteur` de 1024 à 1042 (mesure nuit, pire cas : les nœuds viennent des flaques `Svg` de A3, ~27 ; G1 ne compte pas dans cette mesure, le test ne passe pas de blason). Habitants : même effectif, un rôle changé, aucun nœud | `AccessoiresVocation.tsx`, `vocation.ts`, `IsoCarteDemo.tsx`, `habitants.ts` | G1, A3 | Statique, 1 à 2 tuiles de sol redessinées ; faible | rien à mesurer seul |
| Alentours peints, cliquet des tailles d'image de 20 à 26 (Guillaume, 01/11) : une taille de vue par famille peinte (sol, masses de forêt, accessoires, animaux, pans de rempart), chacune une toile commune, l'échelle en `transform`. Écrit dans le test avec sa raison ; un test de plus allume toutes les couches et vérifie +4 tailles au plus et aucune opacité | `__tests__/iso-perf-compteur.test.tsx` | L (alentours, étape 5) | Une famille = un décodage par fichier à une seule taille de vue ; pas de calque | à prendre avec les couches allumées |
| Alentours, couche `sol` (drapeau éteint). Iter-03 (401a2669) : 12 tuiles de 1656 x 1614 px, 10,7 Mo décodés chacune, 128 Mo en tout, toutes montées : voir le classement après iter-03, point 1. Avant : une image de 896 x 1008 px (3,6 Mo décodés, `require` donc décodée à la taille du fichier) sous la carte ; la pelouse vectorielle n'est plus tracée, l'ombre portée devient un aplat `rgba` sur le carré de la tuile | `Alentours.tsx` `TerrainPeint`, `Monde.tsx`, `IsoCarteDemo.tsx` `Tuile` | L | Moins de tracés vectoriels par tuile (pelouse, bosses, taches, crépuscule, décalcomanies, lavis en moins) ; une texture pleine de plus ; au zoom fort l'image est agrandie 3 à 4 fois (floue) | gfxinfo glisse + zoom, couche allumée contre éteinte |
| Alentours, couche `foret` (drapeau éteint) : 36 à 52 images `expo-image` de 168 x 144 dp (6 fichiers de 448 x 384 px, 0,7 Mo décodés chacun) dans la carte, entre le sol et la lumière, à la place des ~35 tuiles de 384 dp de `Monde` et des arbres de lisière. Placement calculé au rendu (`massesForet`, ~1000 appels de `distCases` sur 400 centres, gardé en `WeakMap` par île) | `alentours.ts`, `Alentours.tsx` `ForetPeinte`, `IsoCarteDemo.tsx` | L | Plus de vues que les tuiles (≈ +15 à +20) mais moins de pixels remplis ; premier rendu d'un palier : le calcul du placement | à prendre : premier rendu et glisse |
| Alentours, couche `decor` (drapeau éteint) : 5 à 35 images de 57,6 x 52,8 dp dans l'ordre de profondeur (variantes de nuit cuites, 2 fichiers par accessoire, ~470 Ko de webp en tout) ; les accessoires vectoriels du camp disparaissent | `alentours.ts` `ACCESSOIRES`, `Alentours.tsx` `AccessoirePeint` | L | Jusqu'à 35 vues de plus, statiques | rien à mesurer seul |
| Alentours, couche `animaux` (drapeau éteint) : 3 souris peintes à la place du rat (1 nœud de groupe + 1 bande d'images par souris = 4 nœuds animés au lieu de 1, cachés au repos) ; 4 oiseaux peints à la place du V dessiné (1 + 4 nœuds, comme avant : vue + 4 `AnimatedPath`), une bande de 4 images par oiseau qui glisse dans une fenêtre `overflow: hidden` | `Alentours.tsx` `SourisPeintes`, `OiseauxPeints`, `petitsDetails.tsx` | L | +3 nœuds animés pendant les vagues à rat (plafond de `iso-ciel` à vérifier couche allumée) ; 4 fenêtres `overflow: hidden` | à prendre : vague à rat, couche allumée |
| Alentours, couche `plan` (drapeau éteint) : 3 masses de feuillage en espace écran, au-dessus de la carte (toile de la forêt, échelle 1,15 à 1,9) | `Alentours.tsx` `PremierPlan`, `IsoVillage.tsx`, `app/dev-iso.tsx` | L | 3 grandes images au-dessus de tout : remplissage GPU des coins à chaque image animée | gfxinfo repos 60 s, couche allumée |
| F2, famille repeinte de jour : 57 sprites `.jour.webp` + les ailes de jour (~6,3 Mo de WebP q90 en plus dans l'APK, les nuits refaites pèsent ~+0,3 Mo). Mêmes toiles et mêmes tailles de décodage que les nuits, une seule ambiance chargée à la fois ; un passage jour/nuit en cours de session décode la famille entière une fois. L'index généré double ses entrées de bâtiments (masque, ombres, socle recopiés pour `.jour`) : `maquettes*.ts` passe de 4 à 6 morceaux, ~2,6 Mo de source (piste : une table `.jour` qui ne porte que l'image et réutilise la géométrie de la nuit) | `assets/images/village/iso/*/*.jour.webp`, `carteDemo.ts` `spriteDe`, `scripts/iso/famille_jour.py` | L | Taille de l'APK ; un pic de décodage au changement d'ambiance (19 h 59 / 20 h) | taille APK release, mémoire images au premier rendu de jour |
| Iter-03 B3 : rempart en pans dessinés (un `Svg` statique par pan, dans l'ordre de profondeur), cibles de tap des pans (masque calculé par pan dans `cibles`, à chaque rendu d'`IsoVillage`) | `Rempart.tsx`, `rempart.ts`, `tapBatiment.ts` `cibles` | B3 | Statique au rendu ; `cibles` refait `dessinPans` + `masquePan` à chaque rendu (chaque pas d'un marcheur), coût JS à vérifier | profil JS d'un repos 60 s |
| Iter-03 E3 : ancien stade à opacité fixe 0,85 pendant la montée, onde plus large (trait 40 dp au lieu de 26) | `IsoCroissance.tsx` l. 117, `Revelation.tsx` `TRAIT` | E3 | Un calque hors écran de plus pendant ~1 s ; plus de pixels rasterisés par le `Svg` de l'onde | montée jouée (`jouer=1`) |
| Iter-05 B5 : anneau de forêt peinte (couche `foret`, éteinte) : ~120 à 130 masses à tout palier (le tirage par groupes en faisait ~90), toutes la même image de toile 168 x 144 ; le premier plan suit la caméra par un style animé (un `Animated.View` sur 3 images, translation + échelle, aucun rendu JS) | `alentours.ts` `anneau`, `Alentours.tsx` `PremierPlan` | B5 | ~35 vues d'image de plus dans l'arbre ; le calque du premier plan est animé à chaque glissé | gfxinfo glissé 10 s, couches allumées |
| Iter-05 A7 : champs hors plan pavés de tuiles peintes (une `ChampPeint` par case, 6 par bloc, même toile que les champs du plan) ; rais de jour (3 `LinearGradient` tournés sous une opacité animée sur l'horloge) ; fondu d'ouverture qui attend les 12 tuiles du sol (rideau sombre dans `Monde`, état de module dans `ouverture.ts`, plafond 1,5 s) | `IsoCarteDemo.tsx` l. 2167, 2362, `champs.ts` `tuilesBlocs`, `AmbianceCarte.tsx` `Rais`, `ouverture.ts`, `Monde.tsx` | A7 | Environ +300 vues pour les champs (aucune texture de plus) ; +1 nœud animé au repos de jour ; le fondu ne coûte rien de plus mais tombe sur le pic de téléversement | iter-05 : +340 vues au total, voir la section Iter-05 |
| Iter-05 E5 : rempart qui garde l'ancien stade pendant sa montée (clé stable, `Sortie` : 22 images sous une opacité animée) ; silhouette du nouveau stade (1 nœud, `Image` teintée, opacité fixe 0,7) | `Rempart.tsx`, `IsoCroissance.tsx` | E5 | Montée du rempart seulement : un groupe de 22 images à opacité animée ~1 s ; plus de remontage des 22 pièces (gain) | montée du rempart `jouer=1` |
| Iter-05 E5 : deux ombres de nuages de jour (2 `Animated.View` sur l'horloge, transform seul, chacune un `Svg` en dégradé radial dessiné au quart et agrandi par le GPU, ~600 x 240 dp à l'écran, par-dessus les sprites) ; une silhouette de plus par montée (1 nœud, une `Image` teintée, 0,3 s) ; fumées plus larges (36 dp au lieu de 26, même nombre de nœuds) ; anneau de jour un tiers plus opaque, poussière plus grosse, 12 étincelles cerclées au lieu de 10 | `OmbresNuages.tsx`, `vivant.ts` `nuageA`, `IsoCroissance.tsx`, `feux.ts`, `Revelation.tsx` | E5 | Remplissage translucide sur une grande surface pendant la vague (2 couches), +1 nœud par montée ; plafond de 64 nœuds tenu (`iso-ciel`, `iso-familles` verts) | gfxinfo repos 60 s de jour, montée `jouer=1` |

## Classement après iter-01 (remplacé par le classement après iter-02, plus haut)

1. **Horloge continue au repos** (`horloge.ts`, `constants/isoPoc.ts` l. 35) : 0 à ~54 images/s pendant 60 s, p50 27 ms, plus cher qu'une glisse. Pistes : baisser la cadence des nœuds lents (bannières, ailes) ou couper les familles hors écran ; mesurer le CPU UI sur 60 s, pas 10.
2. **Replanification toutes les 15 s** (`horloge.ts` l. 126-132, puis `useMarcheurs.ts` l. 231-238 `lancer`) : un `setEtat` côté JS qui re-rend la carte entière (~2000 vues) 4 fois par minute de repos. Pas vu dans la prise de 10 s ; à mesurer sur 60 s (pics « Slow UI thread » attendus vers 15, 30, 45 s).
3. **Éclat légendaire à opacité animée sur un `Svg`** (`Fierte.tsx` l. 216) : calque hors écran à chaque image tant que l'horloge tourne, par bâtiment légendaire animé (ECLATS_ANIMES). Les 12 cibles de rendu du repos (12 Mo) viennent de là et des effets.
4. **Bannières qui tournent** (`Fierte.tsx` l. 149, `Flotte`) : 3 vues animées en plus, rotation d'un `Svg` (pas de calque) ; faible.
5. **Aplats de débord de `AmbianceCarte`** : coût de remplissage, invisible sur émulateur, à prendre sur appareil.
6. **Accessoires du camp et sillons des champs** (`IsoCarteDemo.tsx` `Accessoires`, 6 `Path` par tuile même vides ; 2 traits de sillons au lieu de 1) : statique, redessiné au zoom ; faible.
8. Iter 3 E3 : le point des mâts (`Fierte.tsx` `Scintille`) garde son nœud animé mais n'est qu'un cercle de 2 dp (même calque d'opacité que le point 3) ; les oiseaux (`petitsDetails.tsx`) ont 35 % de surface en plus (`VOL_ECHELLE` 1,35) et un liseré clair de 0,8 : même nœud, un peu plus de remplissage. La poussière de chantier passe de volutes à 5 ellipses sans trait : moins de tracé.
7. Gain : tailles d'image des habitants arrondies à un dp pair (`IsoCarteDemo.tsx` `HabitantVue`), moins de tailles distinctes, moins de décodages (scratch de glisse 87 à 58 entrées).

9. S-night (branche `loupe-s-night`, non fusionnée) : le relief amplifié de `nuit_sol` alourdit les WebP de nuit, `sol` + `champs` passent de 497 Ko à environ 920 Ko à q80. Aucun effet à l'exécution. À revoir si la branche revient.
10. APK arm64 mesuré à 71,1 MiB (74 566 802 octets) sur `e723cfe2`, avant toute loupe, pour une limite de 55 MiB dans le prompt de phase 2 (retirée d'`AGENTS.md` le 18/10).
11. Loupe BC r1, tuiles de sol par palier (`Alentours.tsx` `TerrainPeint`, `alentours.ts` `tuileTerre`, `solBandes.ts`) : aucun nœud ni effet de plus à l'exécution, le même nombre de tuiles (12) change de source selon le palier. Poids à venir avec le premier cuit : un tampon de route de 2000 x 3000 px touche jusqu'à 6 tuiles du terrain (1656 x 1614 px) ; chaque bande qui ajoute à une tuile en livre une version jour et une nuit (le cuiseur n'écrit pas une bande qui n'ajoute rien), soit au plus 12 WebP par tuile. À mesurer sur l'APK au premier `--install`.
12. Loupe BC r1, route du sud (`rues.ts` `SORTIES`) : 25 pas au lieu de 10, donc `ROUTES` (`alentours.ts`) et `ECHANTILLONS` (`champs.ts`) passent d'environ 70 à 150 points, parcourus à chaque masse de forêt et chaque bloc de champ au calcul de la scène (une fois par île, pas par image). Hors sol peint, la route et sa fourche se dessinent sur toute leur longueur, plus longue donc plus de remplissage ; sous sol peint, rien n'est dessiné.
13. Loupe BC r1, première installation du sol peint (`solBandes.ts`, bande t4-6) : +1 106 264 octets dans `assets/images/village/iso/sol` (1 474 498 à 2 580 762), 6 tuiles du terrain en jour et en nuit (`terrain_20` à `terrain_32`), aucune taille de mise en page nouvelle (cliquet inchangé). Aucun nœud de plus : les 12 tuiles changent de source selon le palier. Mémoire GPU : une seule version d'une tuile est montée à la fois, mais le tampon est livré dans l'APK.
14. Loupe BC r1, lisière sud (`alentours.ts` `lisiereSud`) : +28 masses de forêt (`Image` de 168 x 144 dp mises à l'échelle de 0,85 à 1,7), les mêmes à chaque palier, donc 137 à 146 nœuds de forêt au lieu de 110 environ. Remplissage : les plus grandes (1,5 et 1,7) couvrent jusqu'à 286 x 245 dp, plusieurs se recouvrent en bas d'écran. À mesurer sur appareil à l'écran p06. Quatre accessoires de plus hors île (`ACCESSOIRES` `hors`), 4 `Image` à partir du palier 4.
15. Loupe BC r1 correction : la lisière sud passe à 53 masses (échelles 0,85, 1 et 1,2, dont un rideau le long du dernier tronçon de route), 168 nœuds de forêt au palier 6 au lieu de 142, les mêmes à chaque palier. Plus petites donc moins de remplissage par masse, mais plus nombreuses. Six accessoires hors île (au lieu de quatre) contre les trois parcelles.
16. Loupe BC r2, ombres de forêt (`Alentours.tsx` `OmbresForet`) : un seul `Svg` de 1656 x 2152 dp (le terrain) sous la forêt, un dégradé radial partagé et une `Ellipse` par masse (environ 165 au palier 6) plus une pour la charrette. Statique, aucun nœud animé, mouvement réduit sans effet. Coût : un tracé de ~165 ellipses translucides redessiné au zoom, remplissage en bas d'écran où les masses se recouvrent. Jamais mesuré, à prendre sur appareil à p06.
17. Loupe BC r2, voile de jour sur les alentours (`AmbianceCarte.tsx` `VoileAlentours`) : un `Svg` de 1656 x 2152 dp avec un seul `Rect` en dégradé radial, de jour sur sol et forêt peints seulement ; la nuit inchangée. Remplissage plein écran translucide. Force 0,5 réglée par simulation sur la capture p06 (rapport L village / alentours 0,96 devient 1,19), pas sur appareil.
18. Loupe BC r2, sous-bois (`Alentours.tsx` `UneMasse`) : une `Image` de plus (448 x 384 px, même taille de mise en page que les masses, cliquet inchangé) sur les masses des lisières sud et nord seulement, soit environ 60 nœuds de plus. Le rideau de route et les 5 accessoires hors île sont retirés.
