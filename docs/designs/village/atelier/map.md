# Village iso : de l'état de jeu aux pixels

Lu dans le code seul (rien lancé). Chemins relatifs à `components/village/` sauf mention. Carte = 20x20 cases (`isoLayout.json`, `TAILLE`), `COTE`=48 dp, donc 960x480 dp à zoom 1 (`iso/carteDemo.ts:31`).

## 1. Pipeline, dans l'ordre
1. `VillageScene.tsx:216` lit `scene.tier` et `scene.buildings` (niveaux), `INTEGRATION` (`isoPoc.ts`: dev et .perf seulement). Lumière: `choisirLumiere` sur `new Date().getHours()` (`VillageScene.tsx:843`), jour 7h-20h, ou `JOUR_SEUL` (Play).
2. `IsoVillage.tsx:~300`: `niveaux = min(level, niveauxReclames)`, `etatAvec(tier, debout)` (`carteDemo.ts:312`) donne `visible` (grille bool, `ileVisible` `isoLayout.ts:206`) et `montres` (bâtiments dont tout le terrain est visible). Stade par `stadeDuNiveau` (`carteDemo.ts:367`, règle B si `BATIMENT_MOTEUR`).
3. Montage: `View` racine > `Monde` (sol peint hors carte, `Monde.tsx`) > `GestureDetector` > `Animated.View iso-camera` > 7 providers (Horloge, Depart, Croissance, Palier, Reclamables, Revelation, RangsBld) > `IsoCarte` (`IsoCarteDemo.tsx:2019`) + `Lucioles` + `OmbresNuages`. Puis `LegendeRevelation`.
4. `IsoCarte` monte, de bas en haut: `Tuile` x N (SVG sol) > champs peints > `SolVocation` > `ForetSiPeinte` > `AmbianceCarte` (voile) > `Objets` (tout ce qui se tient debout, trié).
5. Contextes qui portent l'état: `HorlogeContext` (SharedValue ms), `DepartContext`, `PalierContext` (niveau de décodage), `AlentoursContext` (flags couches, défaut `ALENTOURS`), `RangsBldContext`, `FigeContext`/`LumieresContext` (`fige.ts`), `VeilleContext`/`AnimauxContext` (plan de la vague), `VariantesContext`.

## 2. Données
- `constants/isoLayout.json`: `sol` 20x20 (herbe, chemin, eau, arbre...), `paliers` (tier d'apparition par case), `batiments` (coin + emprise), `rempart`, `champs`, `lieux`. `isoSpec.json`: S=384, cellDp=128, zoom min 0.3 / max 1.0 (x128/48 = 0.8 / 2.667 en unités démo), canvases, `nomImage`, `vieParAmbiance`, biomes. `isoOrdre.json` (134 entrées, ordre de profondeur généré), `isoLisiere.json`, `isoAccroches.json`.
- `constants/buildings/*.ts` (21 + `essai.ts`): données moteur par bâtiment (ajouts, lumières, teasers, gags). `buildingStages.ts`, `buildingLevels.ts`: rang vers stade (rough/solid/grand, + legendary/mythic repeints en grand).
- Sprites: `iso/maquettes1..6.ts` (générés, 5 à 10 k lignes, clé `famille/nom.nuit.webp`, `{image, anchor, size, ombre, pxScale?, masque?}`), `iso/peints.ts` + `iso/peints/<code>.ts` (21 bâtiments peints, derrière `BLD_PEINTS`; `{stades: {stade: {jour, nuit}}, elements}`), `iso/motion/*.json` (mouvement des bâtiments). `spriteDe` (`carteDemo.ts:401`): peint, sinon maquette du jour, sinon maquette nuit.
- Alentours: `iso/alentours.ts` (1187 l: terrain, masses de forêt par treillis, accessoires, voile), `Alentours.tsx` (tables `require` jour/nuit), `champs.ts`, `lisiere*.ts`, `monde.ts`, `solBandes.ts` (généré).
- Densités: aucune variante @2x/@3x. Un seul webp par sprite et par lumière; la densité est un décodage: `Planche` (`PlancheCarte.tsx:69`) demande `tailleDecode(niveau, w, h, taille source, PixelRatio.get()*echelle)` (`detail.ts:61`), 4 niveaux `PALIERS_ZOOM` [0.6,1,1.75,2.667], décodage à `DECODE_ZOOM` [0.636,1.06,1.75,2.2], plafonné à la source, choisi par `useCameraIso` après 150 ms d'arrêt.
- Le "pli" `tuiles(PixelRatio.get())` (`carteDemo.ts:295`): pas = floor(1024/ratio)-1 dp, chaque tuile SVG déborde de 1 dp. A 2.625: 3x2 = 6 `Svg`; a 2: 2; a 3: 6.
- Sol peint: 12 tuiles `terrain_RC.webp` (3 col x 4 rangées, 552x538 dp chacune, `TERRAIN` x=-348 y=-836 w=1656 h=2152). Bandes cuites `.t4-6` pour 9 d'entre elles seulement; `t7-9` et `t10-12` n'existent pas, tier 12 retombe sur `t4-6` (`tuileTerre`, `alentours.ts:~64`). 1005 webp sous `assets/images/village/iso/`.

## 3. Ancres et z-order
- Posage: `poseEn` (`carteDemo.ts:636`): `ecranXY(point de grille) - anchor * (48/384 / pxScale)`. Bâtiment: coin bas de l'emprise (`pose` :642); pièce: coin bas de la case (`posePiece`); villageois/animal: centre de case (`poseCentre`).
- `profondeur.ts`: `derriere(a,b)` (emprises disjointes sur un axe), `ordreProfondeur` = tri topologique de Kahn, égalité par coin lointain gx+gy puis clé. L'app ne trie jamais: `ORDRE_CARTE` (`carteDemo.ts:617`) et `EMPRISES_ORDRE` (:623) lisent `isoOrdre.json`; seuls les éléments montrés sont montés (`elementsMontes`, :880) dans cet ordre.
- Éléments insérés par rang: `borneRang(ordre, emprise, dessus)` (`marcheurs.ts:706`) renvoie [lo,hi]; statue, décor peint, vocation, haies, souris prennent `lo` via `placer`/`insere` (`IsoCarteDemo.tsx:1947`).
- Marcheurs: `rangsMarcheurs` (`marcheurs.ts:726`): triés par coin lointain, rang = `lo` de `borneRang(..., dessus=true)`, jamais avant un marcheur derrière lui. Emprise = cases du segment courant, donc le rang change quand `useMarcheurs` signale un nouveau segment. Montage dans `Objets` (`IsoCarteDemo.tsx:1721`, `flatMap` à la fin).

## 4. Sol, primitives dessinées
- `Tuile` (`IsoCarteDemo.tsx:364`), un `Svg` par rect, `viewBox` = le rect. Contenu: `Path` (diamants herbe, bosses du bord, taches `blob`, crépuscule 3 niveaux opaques, champs, sillons, haies, galets, décals), `Polygon`+`Text` (boîtes dev des terrains), `Rues` (`RuesDessinees.tsx`: sentiers, 3 rangs de rue, place pavée, `Pattern`+`Image` svg par motif, `ClipPath` pavés), ruisseau, lavis du jour (`fillOpacity` 0.14).
- Effets non triviaux: `ClipPath` des ombres (union des ombres qui touchent la tuile; `ombres-i`), `ClipPath ilot-i` (contour organique), `ClipPath hors-i` (evenodd, sol vectoriel hors du terrain peint), `transform translateY` pour l'ombre de l'île, `fillOpacity`/`strokeOpacity` partout. Aucun `Filter`, `Mask`, `mixBlendMode`, `blurRadius`.
- Avec `ALENTOURS.sol` (dev): la pelouse n'est pas dessinée, l'ombre devient une dalle `isoOmbrePeinte` clippée aux ombres, rues d'ombre dedans.
- Peint: terrain (12 `Image` `contentFit=fill`), forêt (`UneMasse`: `Image` + 3 bandes de sous-bois, échelle/miroir par `transform`), ombre de masse = la même image en `tintColor` ardoise avec alpha (`Alentours.tsx:519`), ombres de pieds (`RadialGradient`, `Ellipse`), champs (`ChampPeint` images), accessoires. Monde hors île si `foret` éteint: tuiles `mondeTuiles/*.webp` (6 images partagées, 1.5 px/dp).
- Eau: pièces canal (images), ruisseau en `Path`, reflets = 5 `Animated.View` de `View` 2 px tournés, `Voile` (SVG clippé par case d'eau).
- Bâtiment: `Planche` (`expo-image`, `tintColor` pour encre/lueur dans la croissance, `opacity` fixe pour la lisière, `transform scale` pour les rochers), `OmbreSocle` (Path), Feux/Veilles/Effets (SVG `Ellipse`/`Path`), `LueurDouce`, `MouvementBld` (3 `LinearGradient`).

## 5. Grade de nuit
- Image séparée: chaque sprite, terrain, forêt, accessoire, champ, motif existe en `X.webp` (jour) et `X.nuit.webp` (nuit cuite, `scripts/iso/nuit_alentours.py`). Choix: `moment(lumiere)` (`Alentours.tsx:301`), `spriteDe(code, stade, vie)` avec `vie = lumiere==="jour" ? "jour" : ambiance`. Les pièces (décor, eau, villageois) n'ont que `.nuit` (clé `maquettes`), le jour ne les change pas sauf les voiles.
- Calque, jamais l'image: `AmbianceCarte.tsx`. Nuit: un `View` plein `isoNuitSol(Peint)`, `Bords` (`LinearGradient` expo, bandes sur DEBORD=2*LARGEUR) si sol vectoriel, un `Svg` de flaques (`RadialGradient` tiede/chaude, `Ellipse` par fenêtre/foyer/lanterne, `lueurs.ts flaquesDe`), `iso-monde-nuit`. Jour (`lumiere.ts LUMIERES.jour`): voile plat `isoJourVoile`, vignette, `VoileAlentours` (`RadialGradient` + 2 ellipses assombries), `Rais` (3 `LinearGradient` tournés, un nœud animé).
- `Monde.tsx`: lavis jour sous la terre (`View` + `opacity` 0.14), rideau noir tant que le sol charge (`FadeOut` 450 ms).
- Le défaut `ambiance="nuit"` n'est pas écrasé par `VillageScene`; `vieDe(ambiance)` règle lucioles/flammes/oiseaux sur lui, d'où lucioles de nuit seulement, oiseaux de jour seulement.

## 6. Ce qui bouge par défaut (dev/.perf)
- Une horloge `c` (`horloge.ts:82`), un `withTiming` linéaire vers le prochain multiple de `CYCLE_MS`=5000 laissant 60 s de vie après focus ou dernier toucher; `VAGUE_MIN_MS`=15000 publie un `depart` par fenêtre. Elle ne tourne pas sans focus, avec mouvement réduit, lecteur d'écran ou `fige` (`fige.ts`: `FigeContext` vaut mouvement réduit, aussi coupe sons et buzz).
- Familles (`familles.ts`): eau (reflets `reflet(c, delai)`), feux, fumées, villageois, bêtes, oiseaux, lucioles, lumières (fenêtres, portes), signal, moulin (`angleAiles`: 0.5 tour/rafale), vent (bannières, `nuageA`), croissance. 8 sièges simultanés, la 8e tourne (`ROTATION` signal/lucioles/moulin, `useTour`).
- Villageois: `Marcheur` (`IsoCarteDemo.tsx:1495`), `Animated.View` dont le style est une fonction pure de `horloge - c0` (`positionA` `marcheurs.ts:655`, `poseA` `gestes.ts`, saut de pas 380 ms); `HabitantVue` fixes (par tier, `habitants.ts`), pairs au repos.
- Vague: `planifierVague(carte, fins, jour, numero, opts)` (`marcheurs.ts:430`), A* en JS, déterministe par `(jour, numero)`; `veilleDeVague`, `effetsDeVague`, `mouvementDeVague`, `planifierAnimaux` pris sur les mêmes graines. 3 marcheurs au plus par vague.
- Créatures (LIFE): `Souris` x2 stations, `ChatRempart`, `OiseauToit` (jour). Flammes `FeuxDessines`. Nuages: 2 nœuds, jour seulement. Lucioles: 2 groupes, nuit.
- Vague de rafale: toute chose joue entre deux multiples de 5000 et revient au repos; `fige` fige tout à t=0 au repos.

## 7. Caméra
- `useCameraIso.ts`: `zoom,x,y` SharedValue; `useAnimatedStyle` (translate, translate+secousse, scale) sur `iso-camera` et `iso-monde-fond`. Pan (seuil 8 dp, inertie `withDecay` 0.985, clampé), pinch (focal), double tap = recadrage 220 ms, tap `runOnJS`. Bornes `limitesDe` (`navigation.ts`): zmin = max(0.8, cadrage entier de l'île), zmax 2.667. Cadrage initial `cadrage()` (`carteDemo.ts`, marge 0.92).
- Thread UI: tous les gestes, les styles, l'horloge, les réactions `useAnimatedReaction` (détail, vague). Thread JS (via `scheduleOnRN`): `onTap`, `poserDetail`, `lancer` (plan de vague), `poser` (`setEtat` à chaque nouveau segment).
- Tap: `carteDepuisEcran` (inverse de la caméra) puis `batimentAuPoint(p, cibles)` (`tapBatiment.ts`): masque alpha hex du sprite (`masque.ts`), ordre ORDRE_CARTE inversé; villageois d'abord (`habitants.ts villageoisAuPoint`), statue, marteau. Fonctions pures.

## 8. Drapeaux et code de pistes ("ne pas porter")
- Dans `constants/isoPoc.ts`: `INTEGRATION`, `BATIMENT_MOTEUR`, `ALENTOURS` (3 couches), `BLD_PEINTS` = tous vrais en build local (`BUILD_LOCAL`), faux en publié et sous jest. `MOMENT_CONTRE_JOUR` = faux partout sauf jest. `MODE_VIE`="continu", `DUREE_VIE_MS`=60000.
- LIFE (ne pas porter): moment Contre-jour (`moment.ts`, `IsoCroissance.tsx`, `Revelation.tsx`, `revelation.ts`, `planifierCroissance`, `useTempsOnde` dans `IsoVillage.tsx`), `MouvementBld.tsx` + `motion/`, `MagieBld.tsx`, `Creatures.tsx`/`creatures.ts`, `Chantier.tsx`, `Rempart.tsx` (sortie). Mouvement et créatures n'ont pas de drapeau propre (actifs avec `INTEGRATION`).
- GAME (ne pas porter): bulle et panneau (`Bulle.tsx`, `bulle.ts`, `ouvertureEn`, `mesurerFenetre`), `Reclame.tsx`, `Marteau.tsx`, `Statue.tsx`, `Fierte.tsx`. Bugs connus d'évolution/palissade dans `docs/designs/village/life/summary-1.md`.

## 9. Non-déterminisme (tout ce qui lit l'heure, la plateforme ou l'état d'usage)
Aucun `Math.random` dans `components/village` ni `constants/isoPoc.ts`. Les graines sont des hachages (`graine.ts`, `hasard`).
- `useMarcheurs.ts:47-48` `useJour()` (Date.now + fuseau, lu une fois au montage): lu par `IsoCarteDemo.tsx:1333, 2080, 2122`, `Creatures.tsx:167, 205, 253`.
- `useMarcheurs.ts:106` jour d'état de la vague; `:158` `numero = floor(Date.now()/15000)`; `:159` jour de la vague. Pilotent tout le plan (marcheurs, animaux, lumières, effets, mouvement).
- `MouvementBld.tsx:117` ordre d'allumage des fenêtres par `code:jour`.
- `VillageScene.tsx:847` heure locale (jour/nuit); `:1231` jour du texte de bulle (hors dessin).
- Horloge: `withTiming` en temps réel (`horloge.ts:~126`), donc dépend de la fréquence d'image. Statut: `useIsFocused`, `AccessibilityInfo.isScreenReaderEnabled`, `useReducedMotion`.
- Plateforme: `PixelRatio.get()` (nombre de tuiles SVG et décodage), `useWindowDimensions` (bulle), `Image` `onLoad` (`solCharge`, ouverture, timeouts 1500/3000 ms dans `ouverture.ts`).
- Pour un rendu hors appli: fixer l'horloge `c`, `jour`, `numero`, la lumière, `PixelRatio`, `fige`.

## 10. Combien de choses montées (tier 12, jour)
- Nœuds animés: plafond de test 68 (`__tests__/iso-ciel.test.tsx:44`); LOG V1: 60 au repos, 62 au pire (30/10), non remesuré depuis les pistes LIFE/GAME. Sans villageois ~26 (`NOEUDS_SANS_VILLAGEOIS`), NOEUDS_VILLAGEOIS = 7 pour les marcheurs, 12 par croissance (moment éteint par défaut).
- Connu: 6 `Svg` de sol a 2.625; 12 images de terrain; 21 bâtiments peints (+ voiles de moulin); 2 nuages; 5 couches de reflets. Total d'images, de `Svg` et de `View`: inconnu, non documenté (seules des mesures anciennes: ~792 Views iso, `LOG.md` L4-T02, hors LIFE).
- Mémoire: aucune mesure fiable pour tier 12 en jour avec forêt peinte; V1 estimait 15 Mo maquettes seules, 251 Mo PSS "Carte seule" (`LOG.md` T20).

## Ce qui est couplé à React
- Pure, déjà extractible: `carteDemo.ts` (pose, ORDRE, etatAvec, tuiles), `profondeur.ts`, `marcheurs.ts` (plan, positions, rangs), `horloge.ts` fonctions worklet (`angleAiles`, `reflet`, `cibleVague`), `vivant.ts`, `tapBatiment.ts`, `navigation.ts`, `detail.ts` (`tailleDecode`), `alentours.ts`, `lumiere.ts`, `creatures.ts`.
- A sortir des composants/hooks: tri d'insertion `insere`/`placer`/`placerDecor`/`peuple` et tout le calcul de `IsoCarte` (2019-2370, corps du composant, avec `useContext`, `useJour`, `PixelRatio.get()`); `Tuile` (géométrie dans le rendu: `bordDe`, `blob`, `ombresDans`, `teinteDe`); `Objets` (rang des marcheurs mêlé à `useMarcheurs`); `useMarcheurs` (état de vague en `useState`/refs, `Date.now`, `setTimeout`, `useAnimatedReaction`); `useHorloge` (focus, lecteur d'écran, `withTiming`); `useCameraIso` (limites, détail); `IsoVillage` (croissance, moment, `niveaux`, `stade`, `touchables`, `masques`, `plan`); `MaquetteMoteur`/`MoteurBld`/`BatimentMoteur` (états de bâtiment par contexte); `Planche` (niveau de détail et `PixelRatio` dans le rendu); `AmbianceCarte`, `Monde`, `Alentours.tsx` (choix jour/nuit et flags lus par `useContext`); `Marcheur`, `RefletsVivants`, `Nuage`, `GroupeLucioles` (formules d'animation dans `useAnimatedStyle`, à appeler comme fonctions de `c`).
