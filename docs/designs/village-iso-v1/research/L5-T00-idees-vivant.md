# L5-T00 : ce qui rend vivant un village iso 2D, trié pour Bati

## Réponse en une phrase

Avec peu de moyens, une scène paraît vivante par trois couches qui ne coûtent pas la même chose : un sol et des traces de vie statiques qui cassent la grille (0 image rendue, visibles même au repos), quelques réactions et désynchronisations qui font croire à des intentions (oiseaux qui s'envolent, fenêtres qui s'allument, villageois qui s'arrêtent et regardent), et une seule course par villageois et par vague, calculée d'avance et lue sur l'horloge.

## Ce que ça implique pour Bati

### 0. Le cadre vérifié dans le dépôt

- Versions : `react-native-reanimated` 4.7.1, `expo-image` ~58.0.17, `react-native-svg` 15.16.0, `react-native` 0.88.0 (`package.json`). La page de performance de Reanimated lue est celle de la v4, donc la bonne.
- L'horloge (`components/village/iso/horloge.ts`) est une seule valeur partagée `c` poussée par un `withTiming` borné jusqu'au prochain multiple de `CYCLE_MS` (5 s) qui laisse 15 à 20 s de vie ; chaque élément lit sa phase dans `c` et ne boucle rien lui-même. Toute idée ci-dessous doit donc s'écrire comme une fonction pure de `c` (worklet), au repos à chaque multiple de 5 s. Ce qui est statique ne coûte rien au repos.
- `performance.md` § 3 : seulement `transform` et `opacity`, et le drapeau `ANDROID_SYNCHRONOUSLY_UPDATE_UI_PROPS` envoie ces styles directement à la vue native ; une seule propriété de mise en page dans le même worklet renvoie tout le style par le commit.
- Les animaux du lot 4 (`IsoCarteDemo.tsx`, `Animal`) empilent leurs 3 poses en 3 images montées et jouent sur l'opacité : 3 composants animés par animal.
- BOARD : L5-T01 sol, L5-T02 ciel, L5-T03 flamme et fumée dessinées par l'app, L5-T04 villageois, L5-T05 petits détails. Chaque idée de la liste dit la tâche qu'elle nourrit.

### Le budget qui commande tout : les composants animés

La documentation de Reanimated recommande « no more than 100 components for low-end Android » animés à la fois [17]. Le Fairphone est un Android moyen : viser **60 nœuds animés au plus pendant une vague**, carte entière, et les compter dans `perf.sh`. Conséquence directe pour les villageois : une planche de 9 poses (repos, 2 pas, 2 gestes, de face et de dos) empilée comme les animaux ferait 9 nœuds par villageois. Une seule image de la planche dans un cadre `overflow: hidden`, dont on anime le `translateX` par pas entiers (`Math.floor` dans le worklet), fait 1 nœud pour la pose plus 1 pour la position, et le miroir gauche/droite est un `scaleX: -1` dans le même `transform`. C'est la recommandation technique la plus importante de cette note ; elle vaut aussi pour les animaux existants. (Non mesuré : voir Limites.)

### 1. Ce que font les jeux de référence

- **Townscaper** : les détails apparaissent tout seuls autour d'un bloc posé, « windows, chimneys, bushes and benches », plus des éléments rares (jardins, statues) [1]. La vie animée tient en presque rien : « really simple AI birds and butterflies, which simply anchor to a game object in proximity », qui « occasionally fly around it, and react to local geometry » [1]. La grille est irrégulière pour casser l'aspect rigide [1][2]. Leçon : le décor qui suggère des habitants compte autant que les habitants, et un oiseau ancré à un objet qui réagit suffit.
- **Graveyard Keeper** (2D, nuit) : 10 tables de couleur selon l'heure ; « by nightfall, the light source not only becomes dimmer but also takes on a blue tint » ; les feux et lampes restent chauds [3]. La brume est faite de « numerous horizontal cloud layers spread across the entire scene », et le haut des sprites en traverse moins, donc toits et cimes restent lisibles [3]. Le vent ne bouge que certaines feuilles, pas toute la couronne, et la phase varie avec la position pour que les sprites ne bougent pas ensemble [3]. Leçon pour Bati : nuit bleue froide, seule la lumière des fenêtres et du feu est chaude (déjà la règle), brume en bandes, et jamais deux éléments en phase.
- **Age of Empires II** : les terrains se fondent par masques alpha, le terrain de plus haute priorité « déborde » sur son voisin, et 16 variantes de masque sont choisies « by the low bits of the tile's coordinates to avoid visible repetition » [4]. Leçon : la variété des bords se tire des coordonnées, sans hasard.
- **Kingdom** : un cycle jour-nuit où la nuit change l'ambiance et le danger, et des vagabonds qui errent avant d'être recrutés [18]. Leçon faible mais utile : des personnages sans emploi qui flânent font un village habité.
- **Les autres** (Stardew Valley, Clash of Clans, Islanders, Dorfromantik, Habbo) : je n'ai pu ouvrir aucune page qui décrive leurs techniques (wiki de Stardew en 403, wiki de Clash of Clans en 402, aucune source primaire pour les autres). Je ne leur attribue donc rien ici. Voir Limites.
- **Principes d'animation** (Disney, via Wikipédia) : « Adding secondary actions to the main action gives a scene more life » ; ralentir au départ et à l'arrêt (slow in, slow out) ; « most natural action tends to follow an arched trajectory », le mécanique va en ligne droite ; l'anticipation prépare le geste [15]. Leçon : les oiseaux et chauves-souris en arcs, les villageois qui ralentissent avant de s'arrêter et marquent un temps avant de partir.

### 2. Le sol sans répétition visible (L5-T01)

Tout ce qui suit est statique : coût à la construction du dessin SVG, 0 par image rendue.

- **Variantes pondérées par case.** Tiled donne à chaque tuile une probabilité, et la probabilité relative est le produit de celle de la tuile et de celle de son terrain [5]. Pour Bati : 3 à 4 teintes d'herbe encrée choisies par un hachage de la case (le même motif que `varianteDecor` dans `pieces.ts`), pondérées par exemple 70/20/10, et une variante rare à 2 ou 3 %.
- **Bruit basse fréquence par-dessus.** Red Blob Games sépare le bruit à grosses ondes (« red noise », pour le relief) du bruit fin (« blue noise », pour placer des objets), et mélange des octaves [9]. Pour Bati : un bruit de valeur à 1 ou 2 octaves dont la longueur d'onde fait 3 à 5 cases, qui fonce ou éclaircit l'herbe par taches plus grandes qu'une case : c'est ce qui efface la grille, plus que la variante par case.
- **Décals semés.** Pour placer des objets, Red Blob dit que d'autres méthodes que le bruit bleu (Poisson, grille décalée) « produce a better distribution », et qu'un rayon différent par zone donne une densité variable [9]. Pour Bati : une grille décalée (un point par case, déplacé par le hachage) suffit à 16×16 ; touffes, cailloux, fleurs rares, feuilles mortes ; densité forte au bord de l'eau et de la lisière, faible sur le chemin, nulle sous une emprise ou une ombre. Retourner et miroiter un dessin multiplie la variété sans dessin de plus [6].
- **Bords et transitions.** Un jeu de coins (marching squares) demande 16 tuiles, 6 avec rotation ; le blob en demande 47 [6][8]. Le quart de tuile n'en demande que 5 avec rotation, au prix de « less variation » et de courbes limitées à une demi-case [7]. Tiled distingue les jeux de coins (transitions de terrain) des jeux de bords (chemins, clôtures) et passe par un terrain intermédiaire quand deux terrains n'ont pas de transition directe [5]. Pour Bati : le chemin a déjà des bords en SVG ; le plus économe est un jeu de coins dessiné par l'app (herbe/terre), avec 2 ou 3 variantes de bord choisies par les coordonnées comme AoE II [4], et une bande de terre battue intermédiaire entre l'herbe et le pavé.
- **Assombrissement doux.** Herbe plus sombre au pied des murs, sous les arbres de la lisière et vers le bord de l'îlot ; flaque chaude statique devant une fenêtre et autour du feu. La nuit bleue et la lumière chaude locale viennent de Graveyard Keeper [3] ; le placement est une proposition.

### 3. L'IA légère des villageois (L5-T04)

- **Machine à états et points d'intérêt.** Le plan (PROMPT §5, lot 5) fixe déjà : grille de coûts (chemin 1, herbe 3), A* Manhattan, états choisir, marcher, agir, croiser, fin de vague, graine par jour, réservation de case à l'arrêt. Les Sims mettent l'intelligence dans les objets : chaque action reçoit un score « besoin × objet », et on peut prendre le meilleur ou tirer au sort pondéré par les scores ; Les Sims 3 adoucissent ce tirage (distribution de Boltzmann) [13]. Pour Bati, sans besoins : chaque bâtiment annonce 1 à 3 cases d'action par rôle (enclume pour le forgeron, sillon pour le fermier, créneau pour le garde, banc pour le flâneur), et le villageois tire la suivante au sort, pondérée par le rôle et la distance, avec la graine du jour. Pas de ronde fixe.
- **Routines par rôle.** Le guide de Skywind demande des horaires variés (« make some people nightowls or early risers »), plusieurs activités entre lesquelles on circule plutôt qu'un seul meuble toute la journée, et que les PNJ d'une même scène se retrouvent près les uns des autres à un moment [14]. Pour Bati, de nuit : le garde fait sa ronde, le forgeron reste près du feu, le flâneur va de banc en fontaine, le fermier rentre ; deux styles par rôle pour qu'on ne lise pas un clone.
- **Chemins qui n'ont pas l'air calculés.** Sur une grille, plusieurs plus courts chemins sont à égalité et A* en prend un qui peut faire des escaliers ; Red Blob propose de pousser les égalités par un coût en damier selon la parité de `x + y`, ou de redresser le chemin après coup [10]. Reynolds : l'errance naturelle garde la direction précédente et la dévie un peu à chaque pas, au lieu d'un hasard pur qui donne un mouvement saccadé [11]. Pour Bati : préférer à égalité la direction courante (moins de virages), et une case d'attente en fin de chemin plutôt qu'au milieu.
- **Croisements et files.** Silver traite la marche à plusieurs par une recherche dans l'espace-temps (Cooperative A*), limitée à une fenêtre (WHCA*) [12]. C'est trop pour 4 à 8 villageois : la réservation de case du plan suffit, et un croisement devient un moment de jeu (les deux s'arrêtent, se font face, repartent) plutôt qu'un évitement.
- **Éviter l'effet robot** : départs décalés de 0 à 3 s, vitesses à ±10 %, phase des poses tirée par villageois (désynchroniser, comme le vent de Graveyard Keeper [3]) ; ralentir avant l'arrêt et marquer un temps avant de partir [15] ; à un carrefour, un regard (miroir gauche puis droite) ; un geste secondaire à l'arrivée [15] ; ne pas faire bouger tout le monde à chaque vague.
- **Ce que permet une vague de 15 à 20 s.** Une seule course par villageois actif : partir, marcher, agir, et finir posé à la fin de la vague. La course est calculée côté JS au début de la vague (A* sur 16×16, quelques millisecondes), passée au worklet comme tableau de cases, et la position se lit `f(c)` comme les ailes et les reflets : rien en JS pendant la vague, et l'arrêt tombe sur le repos de l'horloge. Ordre de grandeur à mesurer : à 1 case par seconde, 6 à 10 cases de marche et 5 à 8 s de geste. Montrer 2 à 4 villageois en mouvement par vague, les autres posés à leur dernier point, et changer qui bouge d'une vague à l'autre. La vague suivante repart de là où chacun s'est arrêté : le village a l'air d'avoir vécu entre deux visites.

### 4. Idées pour Bati, triées (les plus efficaces et les moins chères en tête)

Colonnes : effet sur le vivant ; images à produire ; code ; coût par image rendue pendant la vague (nœuds animés) ; compatibilité avec les contraintes ; tâche.

| # | Idée | Effet | Images | Code | Nœuds animés | Compatible | Tâche | Source |
|---|---|---|---|---|---|---|---|---|
| 1 | Teintes d'herbe par case (hachage pondéré) + bruit basse fréquence en taches de 3 à 5 cases | fort | aucune | petit | 0 (statique) | oui | T01 | [5][9] |
| 2 | Décals semés sur grille décalée : touffes, cailloux, feuilles, fleurs rares ; densité par zone, miroir | fort | 4 à 8 petits dessins (SVG encré par l'app) | petit | 0 | oui | T01 | [9][6] |
| 3 | Traces de vie statiques : tas de bois et hache, seau au puits, charrette, outils devant la forge, linge tendu | fort, surtout au repos | 5 à 8 décors (Blender + peinture, payants) | petit | 0 | oui | T01/T05 | [1] |
| 4 | Fenêtres qui vivent : pendant la vague, une fenêtre s'éteint (cache sombre en opacité), une autre s'allume, scintillement léger de 1 ou 2 | fort | aucune (quad SVG) ; points d'accroche des fenêtres exportés par Blender | petit | 1 par fenêtre animée, 4 à 6 | oui, c'est la lumière chaude autorisée | T05 | [3] (nuit froide, sources chaudes) ; proposition |
| 5 | Une course par villageois et par vague, calculée au début, position `f(c)`, fin posée | fort | planches du lot 5 (prévues) | moyen | 2 par villageois (planche découpée) | oui | T04 | PROMPT §5 ; [13][14] |
| 6 | Lumière de porte : un rectangle chaud s'ouvre quand un villageois entre ou sort | fort | aucune | petit (lié à 5) | 1 par porte | oui | T04 | proposition |
| 7 | Corbeaux posés sur les toits qui s'envolent en arc quand on touche près d'eux, puis reviennent | fort (réponse au geste) | 2 à 3 poses (un corbeau existe déjà) | petit | 2 par oiseau, 2 à 3 oiseaux | oui (le toucher lance déjà la vague) | T05 | [1][15] |
| 8 | Choix pondéré des points d'intérêt par rôle, graine du jour, deux styles par rôle | moyen à fort | aucune de plus | petit | 0 | oui | T04 | [13][14] |
| 9 | Brume en 2 bandes horizontales qui dérivent, basses sur l'eau et la lisière | moyen à fort (atmosphère) | aucune (dégradé SVG) | petit | 2 | oui | T02 | [3] |
| 10 | Étoiles en 3 groupes qui scintillent hors phase ; lune placée du côté d'où viennent les ombres (`LUNE`) | moyen | aucune | petit | 3 | oui | T02 | [3] ; proposition |
| 11 | Désynchroniser : départs décalés, vitesses ±10 %, phase des poses par individu | moyen (évite l'effet robot) | aucune | très petit | 0 | oui | T04/T05 | [3][11] |
| 12 | Pause et regard : ralentir avant l'arrêt, temps avant le départ, miroir gauche/droite au carrefour | moyen | aucune | petit | 0 de plus | oui | T04 | [15][11] |
| 13 | Croisement : deux villageois s'arrêtent, se font face 1 s, repartent | moyen | aucune | petit | 0 de plus | oui | T04 | [14][12] |
| 14 | Bords de chemin en jeu de coins + 2 ou 3 variantes choisies par les coordonnées, bande de terre battue | moyen à fort | 6 à 16 pièces SVG (app) | moyen | 0 | oui | T01 | [4][5][6][7] |
| 15 | Assombrissement doux : pied des murs, lisière, bord de l'îlot ; flaques chaudes statiques devant fenêtres et feu | moyen | aucune | petit | 0 | oui | T01 | [3] |
| 16 | Fumée : 3 ou 4 bouffées SVG réutilisées en échelle, opacité et dérive ; 2 cheminées au plus | moyen | aucune (SVG) | petit | 3 par cheminée | oui | T03 | [16] |
| 17 | Chauves-souris en arcs autour de la tour du sorcier | moyen (dark fantasy) | 2 poses | petit | 2 par chauve-souris, 2 au plus | oui | T05 | [15] |
| 18 | Lucioles près du bosquet du druide et de l'eau, 4 à 6 points en arcs | moyen | aucune (points SVG) | petit | 4 à 6 | à trancher : une lueur de plus que fenêtres et feu ; froide (vert pâle) pour rester dans la règle | T05 | [1] (papillons ancrés) |
| 19 | Le plus proche réagit au toucher : un animal ou un villageois se tourne vers le point touché | moyen | aucune | petit | 0 de plus | oui | T04/T05 | [1] |
| 20 | Rongeur qui file le long d'un mur, une fois par vague, pas à chaque vague | faible à moyen | 2 poses | petit | 2 | oui | T05 | proposition |
| 21 | Vent : 3 ou 4 éléments qui oscillent autour de leur base (bannière, linge, une touffe haute), phase par position | faible à moyen | aucune | petit | 1 par élément | oui | T05 | [3] |
| 22 | Repos de fin de vague variés : assis sur un banc, appuyé à un mur | moyen | 1 à 2 poses de plus par rôle (payantes) | petit | 0 de plus | oui | T04 | [14] |
| 23 | Étoile filante rare (une vague sur 4, tirée par la graine) | faible, mais on s'en souvient | aucune | très petit | 1 | oui | T02 | proposition |
| 24 | Ronds dans l'eau du canal (un poisson), une fois par vague | faible | aucune | très petit | 1 | oui | T05 | proposition |
| 25 | Garde avec lanterne en ronde de nuit | fort | une planche | moyen | 2 | **non sans accord** : c'est une deuxième source chaude mobile | T04 | proposition |

Compte d'une vague chargée avec les idées 4 à 24 et 6 villageois : environ 12 (villageois) + 9 (3 animaux empilés) + 6 (fenêtres) + 6 (oiseaux) + 2 (brume) + 3 (étoiles) + 6 (fumée) + 4 (chauves-souris) + 6 (lucioles) + 4 (vent) + 2 à 4 (portes, rongeur, étoile filante, poisson) + les ailes et les reflets déjà en place, soit 60 et plus. C'est le plafond visé : il faut choisir, ou passer les animaux en planche découpée (9 nœuds deviennent 6).

## Limites

- **Pas vérifié : Stardew Valley, Clash of Clans, Islanders, Dorfromantik, Habbo.** Le wiki de Stardew renvoie 403 (pages des horaires et des bestioles), celui de Clash of Clans 402, et je n'ai trouvé aucune source primaire sur la vie ambiante des trois autres. Rien dans la note ne leur est attribué. Age of Empires II n'est sourcé que pour le mélange des terrains, pas pour ses villageois.
- **Les Sims** : la page de Rolling Stone (paywall) et l'article d'Engadget sur la conférence de Will Wright n'ont pas pu être lus ; seul le résumé de Wikipédia (« utility system ») est cité.
- **Le chiffre de 100 composants** [17] est une recommandation générale de Reanimated, pas une mesure sur le Fairphone ; le plafond de 60 est une marge que je propose, à mesurer avec `perf.sh`.
- **Non mesuré** : qu'une vue Android en opacité 0 ne coûte rien au dessin (les poses empilées en dépendent), et qu'un `transform` sur une vue qui contient un `Svg` ne refasse pas le bitmap du SVG. La planche découpée (une image, un `translateX`) est une recommandation à mesurer contre l'empilement actuel, pas un résultat.
- **Vitesse de marche** (1 case par seconde) : hypothèse pour dimensionner une vague ; la vraie valeur sort de la taille des planches et de l'échelle de la carte.
- Les lignes marquées « proposition » sont des idées de conception sans source externe.

## Sources

1. « How Townscaper works: a story four games in the making », Game Developer : https://gamedeveloper.com/blogs/how-townscaper-works-a-story-four-games-in-the-making
2. « Townscaper », Wikipédia (en) : https://en.wikipedia.org/wiki/Townscaper
3. « Graveyard Keeper: how the graphics effects are made », Lazy Bear Games : https://slava.lazybeargames.com/graveyard-keeper-how-the-graphics-effects-are-made
4. « Blendomatic » (mélange des terrains d'Age of Empires II), documentation d'openage : https://github.com/SFTtech/openage/blob/master/doc/media/blendomatic.md
5. « Terrain », manuel de Tiled : https://doc.mapeditor.org/en/stable/manual/terrain/
6. « Classification of Tilesets », Boris the Brave : https://www.boristhebrave.com/2021/11/14/classification-of-tilesets/
7. « Quarter-Tile Autotiling », Boris the Brave : https://www.boristhebrave.com/2023/05/31/quarter-tile-autotiling/
8. « Wang Blob tileset », site cr31 de Guy Walker (miroir de Boris the Brave) : https://boristhebrave.com/permanent/24/06/cr31/stagecast/wang/blob.html
9. « Making maps with noise functions », Red Blob Games : https://www.redblobgames.com/maps/terrain-from-noise/
10. « Implementation of A* », Red Blob Games (section sur les égalités) : https://www.redblobgames.com/pathfinding/a-star/implementation.html
11. « Steering Behaviors For Autonomous Characters », Craig Reynolds, GDC 1999 : https://www.red3d.com/cwr/steer/gdc99/
12. « Cooperative Pathfinding », David Silver, AIIDE 2005 (résumé) : https://ojs.aaai.org/index.php/AIIDE/article/view/18726
13. « Utility system », Wikipédia (en) : https://en.wikipedia.org/wiki/Utility_system
14. « Scheduling », Skywind Handbook : https://handbook.tesrskywind.com/dev/Scheduling
15. « Twelve basic principles of animation », Wikipédia (en) : https://en.wikipedia.org/wiki/Twelve_basic_principles_of_animation
16. « Drawing particle effect sprites », Kenney : https://kenney.nl/learn/drawing-particle-effect-sprites
17. « Performance », documentation de React Native Reanimated : https://docs.swmansion.com/react-native-reanimated/docs/guides/performance/
18. « Kingdom (video game) », Wikipédia (en) : https://en.wikipedia.org/wiki/Kingdom_(video_game)

Dans le dépôt : `package.json` (versions), `components/village/iso/horloge.ts` (horloge, vague), `components/village/iso/IsoCarteDemo.tsx` (`Animal`, poses empilées), `components/village/iso/pieces.ts` (`varianteDecor`, hachage par case), `docs/architecture/performance.md` § 3, `docs/designs/village-iso-v1/PROMPT-EQUIPE-V1.md` §5 et §6, `docs/designs/village-iso-v1/BOARD.md` (L5-T01 à T06).
