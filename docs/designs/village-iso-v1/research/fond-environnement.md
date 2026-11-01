# Le fond du village iso : un sol qui continue, sans bord ni île

Écrit le 31/10 pour la demande de Guillaume (LOG 31/10, TODO § 4 « Fond à refaire »). Base de code : worktree `iso`, Expo 58.0.19, React Native 0.88.0, expo-image 58.0.17, Reanimated 4.7.1, react-native-svg 15.16.0.

## La réponse en une phrase

Le village se lit comme une île parce que trois choses lui disent « bord » : une falaise dessinée (`bord.ts`), un aplat de sol uni autour d'une couronne de tuiles « clairière » presque vides, et une caméra qui laisse 75 % du cadre au monde vide ; la reco est de refaire le monde en anneaux de densité (champs, chemin, lisière, forêt dense) avec les tuiles actuelles étendues, de resserrer la caméra, et de ne passer à une toile cuite qu'en dernier tour.

## Comment c'est fait aujourd'hui

### Le monde (Monde.tsx, monde.ts)

- Dimensions : `TAILLE` = 20 cases (`constants/isoLayout.json`), `COTE` = 48 dp, donc la grille fait `LARGEUR` 960 x `HAUTEUR` 480 dp (`carteDemo.ts:35-37`). Le monde est dans l'espace de la carte, sous un seul nœud animé qui porte la transform de la caméra (`Monde.tsx:87-100`, `useCameraIso.ts:273-275`).
- Sol : un aplat `foretSol` (`#10302B`) plein cadre (`Monde.tsx:79`), plus un lavis de jour à 0,14 d'opacité (`Monde.tsx:80-86`, `lumiere.ts:24`).
- Forêt : `casesMonde` (`monde.ts:188-238`) pose une image 384 x 384 dp par case de 320 dp (`CELLULE`, `IMAGE`, `monde.ts:39-41`), prise parmi 6 tuiles (`tuiles.json` : dense, coni, mixte, bouleaux, clairiere, rochers) plus 2 tuiles de rive, au total 8 webp à 1,5 px/dp (`generer.py:21`), environ 9 MB décodés (`Monde.tsx:8-9`). Chaque image garde la même taille de layout, l'échelle 0,8 à 1 passe par `transform`, aucune opacité (`Monde.tsx:133-150`) : c'est ce que le cliquet fige.
- Choix de la tuile (`monde.ts:164-169, 211-230`) : une case dont un des 9 points est à moins de `clair` du bord de l'île est « clairiere » (`clair` de 28 à 80 dp, élargi par un bruit, jamais sous `CLAIRIERE`) ; ailleurs, un bruit de période 3 poussé vers les extrêmes (`0.5 + 1.7 * (bruit - 0.5)`) choisit une classe de densité, avec « jamais la même tuile que la voisine de gauche ou du haut ». Les cases d'un seul tenant sous l'île sont sautées.
- Décalage et échelle par case (`monde.ts:44, 232-234`) : au plus 16 dp, parce que la marge de l'image n'en laisse pas plus.
- Un voile `iso-monde-fondu` à 0,3 d'opacité, couleur du sol, sur toute la forêt à gauche de la rive (`Monde.tsx:154-167`) : c'est un voile sur des arbres, une opacité de plus dans le compte du cliquet, et il contredit « aucun voile ».
- Un `LinearGradient` plein cadre, vertical seulement, 4 arrêts (`NUIT = [0, 0.35, 0.7, 1]`, `Monde.tsx:47, 170-180`) : c'est la seule « vignette » et elle est haut/bas, pas radiale. En jour, ses bouts sont `jour.voile`. Je n'ai pas lu la valeur de `isoJourVoile`, mais c'est très probablement le dégradé jaune-olive du diagnostic (audit-guillaume-3110.md § Fond) : le code a un aplat, la capture p12-jour montre ce dégradé par-dessus.
- La mer : une colonne de rive (`COLONNE_RIVE` = 4, soit x = 1280 dp) et un rectangle plat au-delà (`monde.ts:172-173, 241-243`). C'est une limite franche à droite, à 320 dp du sommet droit de l'île.

### L'étendue (monde.ts `etendue`, navigation.ts)

- `PART_ILE = 0.25` (`navigation.ts:24`) : le bord de l'île peut être tiré jusqu'à ce qu'un quart du cadre reste, soit 75 % du cadre qui peut montrer du monde vide. `etendue` en déduit la zone à peindre : `(1 - PART_ILE) * w / zmin + CELLULE / 2` (`monde.ts:102-103`), et `portee` la même chose avec la boîte réelle de l'île (`monde.ts:110-111`). Une constante règle donc à la fois la caméra et la quantité de monde à fabriquer.
- Zoom plancher : `ZOOM_MIN_JEU` = 0,3 x 128 / 48 = 0,8 (`IsoVillage.tsx:67`, `isoSpec.json` zoom.min 0,3 et cellDp 128), mais `useCameraIso.ts:120` le baisse au zoom de cadrage (`min(zmin, cadre.zoom)`). Sur 411 dp de large, l'île pleine donne environ 0,39 : on ne peut pas dézoomer plus que « toute l'île visible ». Estimation à 411 x 520 : zone d'environ 9 colonnes x 9 rangées, soit une soixantaine d'images forêt (le chiffre de 63 de PLAN-PERF concorde).
- Rendu à ce zoom (capture p12-jour) : l'île occupe le tiers central, avec environ 430 dp de monde au-dessus et au-dessous.

### L'île (bord.ts, solOrganique.ts, solVarie.ts, lisiere.ts)

- `bord.ts` : contour de lobes (`BOSSE` 24 dp), trait d'encre net, et sous les faces avant une berge `EPAISSEUR` = 9 dp, terre sur pierre, avec reflets d'eau (`bord.ts:14-35, 89-118`). C'est une falaise : c'est elle qui fait « plateau ». Il n'y a ni ombre portée ni transition sur le monde (diagnostic « l'île flotte »).
- `solVarie.ts:198-215` `bordsDe` : les cases à 1 à 3 de l'île s'assombrissent (crépuscule du bord), donc l'île finit plus sombre que son centre, et le monde commence encore plus sombre, mais en aplat.
- `lisiere.ts` : arbres peints (`decor/arbre_a`) sur les cases à moins de `RAYON` = 4 de l'île, seulement devant et sur les côtés (`devant = gx + gy >= TAILLE - 2`, `lisiere.ts:79`), opacité 1. Le « flou » des arbres de premier plan vient très probablement de `ECHELLE_DECODE = 0.5` (`lisiere.ts:21`) : `Planche` décode à `PixelRatio * echelle` (`IsoCarteDemo.tsx:618`) et l'image est étirée au double. Les rochers de lisière sont déjà à 1 pour cette raison (`ECHELLE_ROCHER`, `lisiere.ts:22-25`). Non vérifié sur appareil.

### Pourquoi ça se lit comme une île

1. La berge dessinée dit « bord de terrain surélevé ».
2. Entre l'herbe de l'île et l'aplat sombre, il y a un anneau de tuiles « clairière » : buissons et cailloux clairsemés sur un sol plat, soit un tapis vide sans champs ni chemins, large de 80 dp et plus (capture p12-jour, y 780 à 1100).
3. Les tuiles de forêt sont des carrés de 320 dp dont la densité saute d'une classe à l'autre : frontière horizontale nette, haut et bas (audit § Fond), et semis régulier.
4. Les arbres du monde (formes plates vert clair, ellipses) sont d'une autre famille que les sprites encrés : « venu d'un autre monde », même remarque que pour le chemin.
5. Caméra : jusqu'à 75 % du cadre en monde vide, donc on voit surtout ce qui est faible.
6. La seule vignette est un dégradé haut/bas, sans lien avec la lumière de l'île.

## Ce que disent les autres jeux (et ce qu'on n'a pas pu savoir)

Peu de sources ouvertes parlent de technique. Ce qui est vérifié :

- Townscaper : l'île est posée sur « a large distorted grid set in an infinite sea » ([Wikipedia](https://en.wikipedia.org/wiki/Townscaper)). La mer sans bord est la solution du jeu, mais c'est l'inverse de ce que veut Guillaume (un sol continu) : à ne pas copier. Islanders est du même genre (îles sur l'eau ; aucune source ouverte sur la caméra ou l'eau). Dorfromantik : seul est vérifié l'objectif de style, « ideal and harmonic interpretation of the real-world landscapes », style peint de plateau de jeu ([Game Developer](https://www.gamedeveloper.com/disciplines/sparking-joy-through-tile-placement-in-idyllic-village-builder-i-dorfromantik-i-)) ; rien sur le bord de carte ni sur la caméra.
- Clash of Clans : le décor autour du village (« Scenery ») est cosmétique ; ce que ma recherche en dit (extraits de résultats, la page wiki a répondu 402 et je n'ai pas pu l'ouvrir) : montagnes, eau, arbres et ciel au-delà des murs. Je n'ai rien vérifié sur la technique (toile peinte ou tuiles). Hay Day, Pocket City, Kingdom : rien de sourcé trouvé.
- Pratique de cartes en tuiles (forums, avis de praticiens, pas de doc officielle) : une bordure d'arbres doit faire au moins 3 rangées pour qu'on ne voie pas au-delà dans la fenêtre ; une image unique par arbre évite les chevauchements faux en iso ([forum Tiled](https://discourse.mapeditor.org/t/easy-way-to-create-a-border-of-objects/645)).
- Génération : pour décroître vers un bord, mélanger une distance au centre (0 au centre, 1 au bord) à la valeur du terrain, `lerp(e, 1 - d, mix)` ; pour la densité d'arbres, un rayon différent par biome, mieux avec un échantillonnage de Poisson ou une grille jitterée qu'avec du bruit haute fréquence ([Red Blob Games](https://www.redblobgames.com/maps/terrain-from-noise/)). C'est ce que `casesMonde` fait déjà en grossier, avec le bruit sur des classes ; la distance au bord de l'île n'y entre que pour la clairière.

Conclusion honnête : les techniques de la demande (toile peinte sous la grille, tuiles de bord en dégradé de densité, brume cuite, vignette, bornes de caméra plus larges que le jouable) sont des techniques classiques, mais je n'ai pas trouvé de source ouverte qui les attribue à l'un des jeux nommés. Elles sont retenues ici sur leur coût dans ce dépôt, pas sur un précédent.

## Contraintes de perf qui décident

- Cliquet `__tests__/iso-perf-compteur.test.tsx` : opacité < 1 au plus 55, tailles d'image distinctes au plus 20, `<Svg>` au plus 95, nœuds au plus 1024 ; et sur la forêt : 0 opacité, 1 seule taille (`iso-perf-compteur.test.tsx:80-88`). Les marges ne sont pas connues : je n'ai pas pu lancer jest ici (pas de shell).
- 63 images avec taille et opacité propres par case avaient fait passer la carte de 16 à 61 ms ; avec 1 taille et 0 opacité : 22-24 ms au niveau de A (PLAN-PERF, P0 et P1).
- Mémoire : un bitmap coûte largeur x hauteur x 4 octets en ARGB_8888 (exemple Android : 2048 x 1536 donne 12 MB, à un quart de côté 0,75 MB, [Android, load-bitmap](https://developer.android.com/topic/performance/graphics/load-bitmap)). Une tuile actuelle : 576 x 576 px donne 1,3 MB.
- expo-image : `allowDownscaling` ne joue pas avec `contentFit="fill"` ni `"none"` (donc nos tuiles sont décodées à leur taille de fichier) ; sur Android une image trop grande est réduite à la limite de bitmap de la plateforme ([doc expo-image](https://docs.expo.dev/versions/latest/sdk/image/)). Une toile de 2700 px reste sous les 4096 usuels, mais je n'ai pas la limite des appareils cibles.
- Règle du plan perf : si la forêt est repeinte, la teinte de nuit est cuite dans les webp (une variante par ambiance), jamais une opacité par image. Le projet charge déjà un webp par ambiance pour les sprites (`clePiece(famille, nom, ambiance)`).

## Trois approches

| | A. Tuiles en anneaux de densité | B. Grande toile cuite | C. Toile lointaine basse définition + tuiles proches |
|---|---|---|---|
| Idée | Garder la grille de tuiles ; choisir la tuile par distance à l'île (champs, chemin, lisière, dense) ; tuiles drawn pour se raccorder | 1 à 3 images couvrant toute la zone, sous la grille | A pour ce qui est proche, 1 image basse déf. à la place de l'aplat |
| Images | 6 tuiles actuelles + 4 à 6 nouvelles (champ x2, chemin, lisière x2) : +5 à +8 MB à 1,5 px/dp | 1 canvas par ambiance : 1800 x 1340 dp à 1 px/dp donne 9,6 MB, à 1,5 px/dp 21 MB (trop) | A + 1 canvas de 0,5 px/dp : environ 2,4 MB par ambiance |
| Rendu face au cliquet | Opacité : -1 (on retire `fondu`). Tailles : +0 (taille `IMAGE` inchangée). Svg : 0. Nœuds : à peu près pareil (60 à 80 images) | Opacité 0, tailles +1 à +3, nœuds : -60 | Tailles +1, nœuds +1 |
| Travail d'art | Script `generer.py` (PIL) : à refaire pour que les arbres soient les sprites peints, sinon la tuile reste « clipart » ; 0 $ | FLUX ou Blender : cohérence de perspective, de teinte et de jour/nuit difficile ; le projet a déjà vu FLUX recopier des couleurs et rater des lots | FLUX/Blender pour un seul canvas flou ; moins exigeant que B car basse définition |
| Risque | Moyen : raccords de tuiles (les frontières nettes actuelles) et chemin du monde raccordé à celui de l'île ; mémoire +5 à +8 MB à vérifier contre le critère 7 | Élevé : un seul jet d'art qui échoue bloque tout, 2 ambiances, mémoire, pas de variation si la carte change | Moyen : le flou lointain ne doit pas déborder sur les arbres proches (« aucun flou ») |
| Code seul au premier tour | Oui (tour 1) | Non | Non |

Une raison de plus pour ne pas faire B d'abord : la toile doit couvrir la zone pannable, qui dépend de `PART_ILE` ; la caméra doit donc être resserrée avant de savoir quelle taille de toile peindre.

## Reco : A, par tours testables, C en dernier si besoin

### Tour 1 : code seul, pas d'art neuf

1. Retirer `iso-monde-fondu` (`Monde.tsx:154-167`). Test : le compteur d'opacité baisse de 1 ; plus d'élément `iso-monde-fondu`.
2. Distance plutôt que classes : dans `casesMonde`, calculer le rang d'une case par `min(pts)` (déjà calculé, `monde.ts:212-215`) et en faire des anneaux : clairière (les tuiles actuelles), puis `bouleaux`/`mixte` sur environ 1 case (320 dp), puis `coni`/`dense`. Supprimer l'étirement `1.7 *` et le bruit en classes, garder le bruit seulement comme petit décalage du seuil pour casser la symétrie. Test dans `iso-monde.test.ts` : la densité d'arbres par anneau croît avec la distance (en fonction de `TUILES[...]`), jamais de « dense » à côté d'une « clairiere » sans anneau intermédiaire.
3. Camera (voir plus bas) : `PART_ILE` 0,25 à 0,5.
4. Ombre portée sous l'île : chemin `ilot` décalé de 10 à 14 dp vers le bas, fond sombre, dans les `<Svg>` de tuile existants (donc 0 `<Svg>` de plus ; je n'ai pas vérifié que le clip des tuiles laisse passer ce décalage, `IsoCarteDemo.tsx` Tuile à lire).
5. Mesurer : captures p12 et p1 avant/après, `iso-perf-compteur`, gfxinfo.

Critère de sortie : plus de frontière horizontale droite sur p12-jour/pret-avant ; compteurs du cliquet inchangés ou plus bas.

### Tour 2 : art procédural, tuiles de transition (script seul)

1. `generer.py` : composer les arbres par collage des sprites peints `decor/arbre_a` (mêmes encre et teinte que l'île) au lieu d'ellipses plates, mêmes `IMAGE`/`MARGE` (une seule taille).
2. Nouvelles tuiles dans `tuiles.json` : `champ_a`, `champ_b` (sillons sombres, bords en patchs inclus dans la marge), `lisiere_a`, `lisiere_b` (densité décroissante vers un côté, sans frontière droite), `chemin` (tronçon courbe qui passe par les milieux des côtés). `Tuile` est dérivé du JSON (`monde.ts:30`) : les clés neuves étendent `TUILES_IMAGES` ; TypeScript refuse un oubli.
3. Dessiner les tuiles pour que le bord de chacune soit à environ 30 % de densité, afin que deux voisines se mêlent sans cuture ; le décalage et l'échelle actuels cassent le reste.
4. Le chemin du monde repart des sorties de chemin de l'île : la rangée 10 de la grille (`##=#######.#########`) va d'un bord à l'autre, donc au palier 12 le chemin sort des deux côtés ; aux paliers inférieurs l'île est plus petite, il faut raccorder à la case de chemin visible la plus proche. Point risqué : le prévoir en dernier de ce tour, ou se contenter d'un chemin qui commence dans les champs.
5. Budget : 4 à 6 tuiles à 1,3 MB chacune, à mesurer contre le critère 7 ; si trop, sortir les nouvelles tuiles à 1 px/dp (0,58 MB) pour les anneaux lointains.

### Tour 3 : bord de l'île sans falaise

1. Retirer ou réduire la berge (`face()` de `bord.ts:89-118`, `EPAISSEUR` 9 dp) et le trait d'encre du contour : l'herbe de l'île finit en lobes organiques (déjà là) sur la même herbe sombre que la tuile champ/clairière. Les sommets et les bosses restent (clip `ilot` pour le crépuscule). Le bord de l'île et la teinte de la première tuile se choisissent ensemble : la rampe de teinte (herbe de l'île, puis `bordsDe` 1 à 3, puis tuile champ, puis lisière, puis forêt) doit rester monotone ; c'est un choix de DA à faire valider sur captures.
2. Remplacer `foretSol` plat par la teinte de l'herbe sombre là où la forêt est ouverte (par un fond de tuile cuit, pas par un voile).
3. Les arbres de lisière : repasser `ECHELLE_DECODE` à 1 (`lisiere.ts:21`) et vérifier la mémoire (le commentaire dit 9 MB de marge, critère 7) ; moins d'arbres devant (`densite` 0,9 devant dans `lisiereChoix.ts:26` à 0,35, régénérer `constants/isoLisiere.json` par `UPDATE_LISIERE=1 npx jest iso-lisiere`).

### Tour 4 (facultatif) : un fond qui n'est plus un aplat, et la vignette

1. Remplacer le dégradé haut/bas par une vignette radiale douce : un petit webp d'alpha (par exemple 64 x 128 px) étiré sur le cadre en `contentFit="fill"`, sans opacité < 1 dans le compte du cliquet, par-dessus le monde et sous l'île, comme aujourd'hui (`Monde.tsx:169`). La couleur suit la lumière de l'île (jour/nuit, une variante chacun).
2. Seulement si la reco A ne suffit pas à l'œil : toile lointaine basse définition (approche C) à la place de l'aplat, cuite par ambiance, jamais derrière les arbres nets.

Ordre fixé : 1, puis 3 pour juger, 2, 4. Chaque tour se mesure par captures (p1, p12, `pret-avant`) et gfxinfo avant le suivant.

## Les bornes de la caméra

Ce qu'il faut changer :

1. `PART_ILE` (`navigation.ts:24`) : 0,25 vers 0,5 (la pastille de bord quitte 75 % du cadre et en laisse 50 %). Essayer 0,5 d'abord, 0,6 si la zone à peindre reste trop grande. Un seul réglage : `etendue` (`monde.ts:102-111`) et `axe`/`bornesPan` (`navigation.ts:27-39`) lisent la même constante, donc le monde à peindre rétrécit avec. Ordre de grandeur à 411 x 520 et zoom 0,39 : portée de `(1 - 0,25) x 411 / 0,39 = 790 dp` à `0,5 x 411 / 0,39 = 527 dp` par côté (environ 1,6 case de 320 dp).
2. Invariant à tester : pour tout zoom de [zmin, zmax] et toute position permise, les coins du cadre, convertis en dp de carte, sont dans `zone` (`etendue`). Le commentaire de `etendue` l'affirme (« the reach's only spare », `monde.ts:43`), un test doit le prouver avec les nouvelles constantes, y compris pour une petite île au palier 1 (`monde.ts:113-114` dit déjà qu'une île sous le quart du cadre dépasse). Les tests concernés : `iso-camera.test.tsx`, `iso-monde.test.ts`, `iso-clairiere.test.ts`.
3. Ne pas changer le zoom plancher : `useCameraIso.ts:120` l'ancre sur le cadrage de l'île entière ; dézoomer plus ferait peindre plus de monde pour rien (et ferait voir les anneaux d'art de loin).
4. La dernière rangée peinte, au bord de ce que la caméra peut montrer, doit être la forêt dense : la limite se devine par la densité, jamais par un fondu ni un voile. L'invariant du point 2 garantit que le cadre n'en sort pas ; la marge de 3 rangées des praticiens ne s'applique pas, la caméra elle-même est bornée.
5. Rien à changer dans `carteDepuisEcran`, le toucher, ni `useSonVillage` (ils lisent `zmin` déjà borné).
6. La mer à droite (`COLONNE_RIVE`, `X_MER`) : elle est dans la zone pannable aujourd'hui. Si Guillaume ne veut plus de limite visible, la reporter hors de portée de la caméra (ou la retirer) ; décision à lui poser, je ne la tranche pas.

## Ce que je n'ai pas pu vérifier

- Aucun shell : je n'ai pas lancé jest, le compteur, ni compté les images ; les 63 images et la marge sous les plafonds du cliquet sont repris de PLAN-PERF, pas remesurés.
- Le poids des webp actuels (pas d'outil pour lister les tailles) : les 9 MB sont ceux du commentaire de `Monde.tsx`.
- Que le clip des tuiles SVG accepte une ombre portée décalée (tour 1, point 4).
- Que `ECHELLE_DECODE` 0,5 est bien la cause du « flou » des arbres de premier plan (lecture du code, pas de capture comparée).
- La valeur de `isoJourVoile` (le dégradé olive).
- Les techniques de Dorfromantik, Islanders, Kingdom, Pocket City, Hay Day et Clash of Clans : aucune source ouverte exploitable ; la page wiki de Clash a répondu 402.
- Le coût GPU d'un voile plein cadre (vignette ou dégradé) : pas de mesure ici ; gfxinfo à passer.

## Sources

Ouvertes :

- [Townscaper, Wikipedia](https://en.wikipedia.org/wiki/Townscaper)
- [Sparking joy through tile placement in Dorfromantik, Game Developer](https://www.gamedeveloper.com/disciplines/sparking-joy-through-tile-placement-in-idyllic-village-builder-i-dorfromantik-i-)
- [Easy way to create a border of objects, forum Tiled](https://discourse.mapeditor.org/t/easy-way-to-create-a-border-of-objects/645)
- [Making maps with noise (terrain from noise), Red Blob Games](https://www.redblobgames.com/maps/terrain-from-noise/)
- [Loading large bitmaps efficiently, Android Developers](https://developer.android.com/topic/performance/graphics/load-bitmap)
- [expo-image, documentation Expo](https://docs.expo.dev/versions/latest/sdk/image/)

Vues en extrait de recherche seulement, non ouvertes (pas de fait de la note n'en dépend) :

- [Scenery, Clash of Clans wiki](https://clashofclans.fandom.com/wiki/Scenery) (402)
- [Map edges, how can they be fixed?, Spring RTS](https://springrts.com/phpbb/viewtopic.php?p=499653)

Dans le dépôt : `docs/designs/village-iso-v1/reports/audit-guillaume-3110.md`, `PLAN-PERF.md`, `LOG.md`, `TODO.md` § 4 ; `__tests__/iso-perf-compteur.test.tsx` ; `components/village/iso/{Monde.tsx, monde.ts, bord.ts, lisiere.ts, lisiereChoix.ts, solOrganique.ts, solVarie.ts, useCameraIso.ts, navigation.ts, mondeTuiles/}`.
