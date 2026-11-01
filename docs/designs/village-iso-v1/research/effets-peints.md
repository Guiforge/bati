# FIN-MAG : animations peintes pour les effets magiques

Date : 31/10/2026. Question du propriétaire : les effets Svg paraissent « très grossiers » à côté des bâtiments peints, faut-il passer certains moments forts à des animations peintes image par image ? Et les oiseaux, « absolument horribles » ?

## Réponse en une phrase

Oui, mais seulement pour 3 ou 4 moments, avec une **planche de sprites jouée par un seul nœud Reanimated** (une vue qui coupe, une image décalée par `translate`, 8 à 12 dessins, 12 images par seconde au plus) ; ni WebP animé, ni GIF, ni Lottie, ni Rive ; tout le reste reste en Svg mais refait avec trait d'encre et formes peintes ; les oiseaux : un seul essai de planche à 4 images (perché = image fixe), et on les retire si le tour 2 ne passe pas.

## 1. Comment jouer une animation peinte

Contexte du dépôt (vérifié) : `expo-image ~58.0.17`, `react-native-svg 15.16.0`, `react-native-reanimated 4.7.1`, `react-native 0.88.0`, `react-native-worklets 0.13.0`. Ni Lottie, ni Rive, ni Skia dans `package.json`. Les effets actuels : `Effets.tsx` (un nœud animé par bâtiment, un `<Svg>` de 100x100 plein de `Circle`, `Path`, `Rect` plats), `Revelation.tsx` (un éclat de 64 dp et une `Ellipse` dorée animée par `animatedProps` pendant `ONDE_MS = 900`), `CorbeauxToits.tsx` (perché : un `<Svg>` de 5 formes, 11,2 dp de large ; envol : un `<Svg>` à un `Path`, battement par `scaleY`, `DUREE_ENVOL_MS = 2600`).

Précédent interne : DECISIONS 28/10 avait retenu « planche de 6 dessins à 8 images par seconde, ni GIF ni WebP animé » pour la flamme, puis le 29/10 la flamme est repassée en Svg encré. La planche n'a donc jamais été essayée en jeu.

| | Planche de sprites + translate (Reanimated) | WebP animé / GIF dans expo-image | Lottie / Rive |
| --- | --- | --- | --- |
| Mémoire décodée | largeur x hauteur de la **planche** x 4 octets. Exemple : 12 dessins de 256x256 en grille 4x3 = 1024x768 = **3,1 Mo** ; 8 dessins de 192x192 en 4x2 = 768x384 = **1,2 Mo**. Une seule bitmap, une seule texture | non vérifié (voir limites) : la doc expo-image ne donne aucune limite de taille ni d'images pour les animés. Le décodeur Android est `penfeizhou ... glide-plugin 3.0.5` (lu dans `node_modules/expo-image/android/build.gradle`), qui annonce « low memory usage » sans chiffre | Lottie avec images raster : même chose qu'une planche, une bitmap par dessin ; Lottie en vecteur pur : retombe sur le « grossier » du Svg |
| Nœuds | 1 vue qui coupe (`overflow: hidden`) + 1 `Image` + 1 style animé (le budget des 64 : 1 nœud). 0 `<Svg>`, donc ça **libère** de la marge sur le plafond de 95 Svg | 1 `Image`, 0 nœud animé (la lecture est native) | 1 vue native, 0 nœud Reanimated, mais une dépendance native |
| Images par seconde | le style ne change que quand l'indice de dessin change : 12 commits par seconde pour 12 fps, pas 60 (une valeur identique n'est pas recommitée, `performance.md` § « An ambient animation with no end »). Transform seul, donc chemin synchrone avec `ANDROID_SYNCHRONOUSLY_UPDATE_UI_PROPS` (déjà activé) | cadence imposée par le fichier, non pilotable depuis l'horloge ambiante ; décodage par image sur un fil du décodeur | dépend du moteur ; non mesuré |
| Pause | on ne fait rien : l'indice vient de l'horloge ambiante ou de `t` de la révélation, qui s'arrêtent d'elles-mêmes ; la couche est démontée à la fin (comme `Revelation`) | `autoplay={false}` puis `ref.startAnimating()` / `stopAnimating()` (doc Expo, Android et iOS) | `play()` impératif (lottie-react-native) ; pour Rive l'API n'est pas décrite dans le README, non vérifié |
| Mouvement réduit | ne pas monter la couche (déjà le contrat de `Revelation` et `useMouvementReduit`) ; ou monter la première image seule, sans nœud animé | ne pas monter, ou afficher une image fixe distincte ; `autoplay={false}` sans `startAnimating` donne la 1re image | idem, ne pas monter |
| Dépendance et licence | aucune ; l'`Image` est celle qui sert déjà aux bâtiments | aucune (déjà dans expo-image). Mais GIF : alpha à 1 bit, donc bords crénelés sur le fond du village ; WebP animé : alpha propre | **lottie-react-native** : Apache-2.0, exige RN 0.84+ et la nouvelle architecture (OK ici en 0.88), ajoute `lottie-android`. **rive-react-native** : MIT, c'est le paquet ancien, le README renvoie vers `rive-nitro-react-native`. Dans les deux cas : module natif en plus, donc cliquet des permissions, test 16 Ko des `.so`, reconstruction F-Droid depuis les sources |

Pourquoi la planche : elle est la seule des trois qui reste sur l'horloge unique et le contrat « rien au repos » du dépôt (le WebP animé tourne seul et ne se cale pas sur la vague ni sur `ONDE_MS`), elle donne la cadence BD voulue le 28/10 (dessins tenus), elle ne demande aucune dépendance, et elle fait baisser le nombre de `<Svg>`. Le WebP animé n'a que l'avantage de ne rien coder ; Lottie et Rive sont des moteurs de vecteur et un runtime natif de plus pour jouer des bitmaps qu'on sait déjà afficher.

Détails d'implémentation à tenir (déduits du dépôt, à vérifier à l'écriture) :
- Un style animé qui ne contient que `transform` : `translateX` et `translateY` calculés depuis `Math.floor(t * fps)` modulo la grille. Aucune propriété de mise en page dans le même worklet (sinon tout repart par le commit d'arbre, `performance.md`, règle 3).
- La planche garde sa taille décodée propre : demander à `expo-image` la taille de la planche, pas celle d'un dessin (`tailleDecode` dans `Planche` règle déjà la taille par palier). Un seul format de taille de plus dans le plafond de 20 tailles ; garder la largeur ou la hauteur de planche à **4096 px au plus** (limite de texture GPU courante ; 2048 sur du très vieux matériel, d'où des dessins de 256 px en 4 colonnes au plus).
- Pas d'opacité animée sur la vue qui coupe (une couche hors écran de plus, plafond de 55 opacités) : le fondu est peint dans les dessins eux-mêmes.
- Une planche **neutre** (or et blanc) teintée par `tintColor` (déjà utilisé par `Planche` via `teinte`) pour les 4 genres de métier, plutôt qu'une planche par genre.

## 2. Combien d'images, et comment les produire

Vocabulaire : en animation 2D, « sur les uns » = 24 dessins par seconde, « sur les deux » = 12, « sur les trois » = 8 ; « sur les deux » est le plus courant, « sur les trois » sert pour les scènes lentes (idtech, source 8). Spider-Verse alterne uns et deux selon l'émotion (source 9, blogs et mémoires, à prendre comme approximatif).

| Éclat de 1 s | Dessins | Planche (256x256) | Mémoire décodée |
| --- | --- | --- | --- |
| 24 images/s, tout dessiné | 24 | 4096x1536 ou 6x4 | 6,3 Mo (24 x 256 x 256 x 4) |
| 12 images/s, tout dessiné | 12 | 1024x768 (4x3) | 3,1 Mo |
| **12 images/s, 8 dessins avec tenues** (reco) | 8 | 1024x512 (4x2) | 2,1 Mo |
| 8 images/s (sur les trois) | 8 | idem | 2,1 Mo |

Reco : **12 images/s avec 8 dessins** (attaque et pic tenus, chute dessinée), et jamais 24. À 24, la mémoire double sans que le rythme BD du village y gagne, et la cohérence entre dessins devient le vrai coût.

Production, deux filières :

1. **FLUX 3 Image avec le blockout comme image 1** (méthode du dépôt, `iso_loop.py` variante `f3` : image 1 le blockout vert, image 2 le sprite ; 0,048 $ l'image à 1k d'après le commentaire de `iso_loop.py`, que je n'ai pas pu recouper sur la page de prix BFL dont les cellules sont vides dans la doc). Le blockout Blender donne la géométrie de chaque dessin (une gerbe qui monte en 8 poses), FLUX peint par-dessus. À éviter : une planche entière en une requête, le dépôt a mesuré que FLUX ne tient pas la mise en page (KNOWLEDGE : triptyque de 2688 px, recouvrement de 0,24 à 0,78 ; DECISIONS 29/10 « FLUX sans géométrie ne tient pas une planche »). Un dessin par requête, trois candidats par dessin (`CANDIDATES = 3`).
2. **Rendu encré dans Blender** (Freestyle ou contour inversé, sans FLUX) : cohérence parfaite d'un dessin à l'autre, coût nul en FLUX, mais un style de trait qui doit encore être accordé aux bâtiments peints ; non essayé ici.

Coût d'un effet complet par la filière 1 (arithmétique à partir de 0,048 $) :

| | Dessins | Premier jet (3 candidats) | Avec reprises (x1,5 à x2,5) |
| --- | --- | --- | --- |
| 8 dessins | 8 | 1,15 $ | 1,7 à 2,9 $ |
| 12 dessins | 12 | 1,73 $ | 2,6 à 4,3 $ |
| 24 dessins | 24 | 3,46 $ | 5,2 à 8,6 $ |

Le taux d'acceptation d'un effet lumineux sur fond de clé n'est pas mesuré dans le dépôt (forge : 2 rendus sur 20 en FLUX.2 ; 0,062 à 0,080 $ par sprite accepté avec Klein, KNOWLEDGE ligne 92) ; la colonne « reprises » est une hypothèse, pas une mesure. Les références multiples sont gratuites (« text to image and image editing cost the same », commentaire de `iso_loop.py`), jusqu'à dix références (doc BFL) : on peut donner le dessin précédent en image 3 pour tenir la suite.

Rappel : FLUX ajoute ce que le nom promet (KNOWLEDGE, DECISIONS 28/10) : nommer les formes (« gerbe de petites étincelles à pointes, traits d'encre sombre »), jamais « magie » ni « feu ».

Budget FLUX : STATE.md dit environ 5,7 $ dépensés sur 40 $ au 30/10 ; TODO.md dit environ 17,5 $ sur 40 $. Les deux chiffres ne concordent pas, je ne les ai pas départagés ; le plafond par tour ci-dessous est donc en absolu, à rabattre sur le solde réel relu par le garde-budget.

## 3. Quels événements, et le reste en Svg

Les moments qui méritent la peinture (4 au plus ; ce sont des couches montées quelques secondes puis démontées, donc compatibles avec « rien au repos ») :

1. **Révélation de stade** : l'éclat (`EclatRevelation`, 64 dp) passe en planche neutre teintée, 8 dessins, 1 s. Le plus vu, le plus joué, le plus fort. L'anneau au sol (`AnneauRevelation`) reste en Svg mais refait (ci-dessous).
2. **Dernier stade** : même planche, version « riche » (dessins plus larges, une étincelle or) ; le code a déjà `dernierStade(code, stade)`. Une 2e planche, pas une par métier.
3. **Nouveau bâtiment** : fin de chantier, la poussière de `Chantier.tsx` (deux volutes Svg) et l'apparition ; une planche de poussière peinte de 6 à 8 dessins qui sert à chaque apparition.
4. **Statue de boss** : à confirmer, je n'ai pas lu le code de la statue ; à ne décider qu'après l'avoir lue.

Ce qui reste en Svg : les petits effets de métier de `Effets.tsx` (runes, braises, lucioles, étoile, étincelles), la flamme et la fumée de `FeuxDessines.tsx`, la poussière des coups de chantier. Ils tournent en boucle sur l'horloge ambiante, donc une planche y coûterait des commits permanents.

Ce qui rend un effet Svg moins grossier (jugement de conception, appuyé sur le principe de la doc react-native-svg que `Mask`, `ClipPath`, `Image` et `RadialGradient` existent ; rien ici n'a été essayé sur appareil) :
- **Contour d'encre** : tout élément a le trait sombre des bâtiments (`stroke` de la couleur d'encre du village, `strokeLinejoin="round"`), pas un aplat nu. C'est ce que les corbeaux perchés ont déjà et ce que les particules de `Effets.tsx` n'ont pas (« flat shapes, no outline »).
- **Pas de cercle nu** : `Particule` « puce ronde » (`<Circle>`) pour braise et luciole est le défaut le plus visible. Remplacer par 3 ou 4 formes irrégulières dessinées une fois (étincelle à pointes, goutte, flocon de braise), tracées à la main ou extraites d'un dessin FLUX détouré et vectorisé, puis réutilisées.
- **Formes peintes réutilisées comme masques** : un dessin FLUX d'un seul éclat, détouré, sert de `Mask` ou de `Image` dans le `<Svg>` pour donner le grain de la peinture à une lueur ; `Mask` sur éléments natifs est « expérimental » selon la doc, à tester avant de s'y fier. Alternative sans risque : poser l'`Image` détourée directement, teinte par `tintColor`.
- **Dégradé étagé, pas de blur** : les 5 bandes de `BANDES_LUEUR` sont la bonne idée ; `FeGaussianBlur` existe mais la doc prévient que tous les filtres ne sont pas implémentés en natif.
- **Valeurs** : deux tons par effet plus un accent or, pas plus ; l'oeil lit mieux une forme tenue qu'un nuage de points.

## 4. Les oiseaux

Constat : le corbeau perché fait 11,2 dp de large. À cette taille, ce qui choque n'est pas la technique (Svg) mais le dessin : 5 formes géométriques (ellipse, cercle, polygone) et un envol en « V » de mouette battu par `scaleY`, qui ne ressemble pas à un oiseau. Une peinture de 11 dp tient en 30 px.

Reco :
- **Perché** : une image fixe peinte (un seul dessin FLUX, détouré, deux ou trois poses au choix selon le jour), à la place du `<Svg>`. Coût : 1 à 3 dessins, soit 0,15 à 0,45 $ avec trois candidats. Retire 1 `<Svg>` par corbeau.
- **Envol** : une planche de **4 dessins** (ailes haut, mi-haut, bas, mi-bas) jouée à 8 images/s pendant `DUREE_ENVOL_MS` (2600 ms), sur le nœud animé existant qui garde le déplacement `dx`, `dy` ; 4 dessins de 64x64 en 256x64 = 64 Ko. Coût FLUX : 4 dessins x 3 candidats = 0,58 $, avec reprises jusqu'à 1,4 $.
- **Condition de retrait** : si deux tours (une génération + une reprise) ne donnent pas un corbeau qui passe le contrôle de l'art-reviewer à 11 dp, **retirer les oiseaux**. Gain : 1 à 2 nœuds animés du budget, des lignes de code, et plus de « absolument horribles » à l'écran. Un village sans oiseau vaut mieux qu'un oiseau raté.

## Limites de la recherche (non vérifié)

- Mémoire réelle d'un WebP animé décodé dans expo-image sur Android : ni la doc Expo ni le README de `APNG4Android` ne la donnent ; le chiffre « taille décodée » de la colonne WebP est donc absent. Le seul signe public est un ancien problème de fuite mémoire des animés corrigé dans la bibliothèque (issue 203 d'`APNG4Android`, non relue en détail).
- Images par seconde et mémoire de la planche : arithmétique et doc de Reanimated/performance.md, **aucune mesure sur Fairphone 6**. Une planche de 12 dessins à 12 images/s est une hypothèse à mesurer en release (`gfxinfo`) avant de s'engager sur les 4 événements. Le dépôt dit qu'on ne prend jamais un chiffre de perf en dev.
- Prix `flux-3-image` : 0,048 $ lu dans `iso_loop.py`, non recoupé sur le site BFL (la page `pricing.md` de la doc a des cellules vides). La graine n'est pas documentée sur la page FLUX 3 ; le dépôt dit que Klein l'accepte.
- Lottie : exigence RN 0.84+ lue dans le README du dépôt GitHub, pas sur npm ; performances et mémoire non trouvées dans la doc officielle (la page airbnb.io redirige). Rive : API de pause non décrite, taille ajoutée au binaire inconnue. Licence de `lottie-android` et des runtimes Rive natifs non lue (seuls les paquets React Native l'ont été).
- Je n'ai pas lu la statue de boss ni testé le rendu Blender encré.
- Aucun fichier de code touché.

## Reco découpée en tours (plafond FLUX par tour)

| Tour | Contenu | Plafond FLUX |
| --- | --- | --- |
| 0 | Mesure sans FLUX : une planche factice (carrés de couleur, 8 dessins en 1024x512) jouée dans `EclatRevelation` derrière un drapeau local ; relever images, Svg, opacités, tailles, nœuds avec `iso-perf-compteur`, puis `gfxinfo` en release sur Fairphone 6. Svg : contour d'encre et formes irrégulières à la place des cercles (0 $) | 0 $ |
| 1 | **Révélation de stade** : 8 dessins neutres via blockout + FLUX 3 | 2,00 $ |
| 2 | **Dernier stade** (variante riche) et **nouveau bâtiment** (poussière) : 8 et 6 dessins | 3,00 $ |
| 3 | **Oiseaux** : perché (2 à 3 dessins) et envol (4 dessins), ou retrait | 1,50 $ |
| 4 | **Statue de boss** si le code la confirme ; sinon reliquat de reprises | 2,00 $ |
| Total | | **8,50 $ au plus**, à rabattre sur le solde réel du garde-budget |

Arrêt anticipé : si le tour 0 montre un dépassement des plafonds (55 opacités, 20 tailles, 95 Svg, 1024 nœuds, 64 nœuds animés) ou une trame ratée au repos, on n'ouvre pas le tour 1 et tout reste en Svg amélioré.

## Sources

1. expo-image, doc officielle (autoplay, startAnimating, stopAnimating, decodeFormat, allowDownscaling) : https://docs.expo.dev/versions/latest/sdk/image/
2. Reanimated, `useReducedMotion` : https://docs.swmansion.com/react-native-reanimated/docs/device/useReducedMotion/
3. react-native-svg, USAGE (Mask, ClipPath, Image, RadialGradient, filtres) : https://github.com/software-mansion/react-native-svg/blob/main/USAGE.md
4. lottie-react-native (Apache-2.0, RN 0.84+, API impérative) : https://github.com/lottie-react-native/lottie-react-native
5. rive-react-native (MIT, paquet ancien, renvoi vers rive-nitro) : https://github.com/rive-app/rive-react-native
6. APNG4Android (décodeur des animés d'expo-image sur Android, Apache-2.0) : https://github.com/penfeizhou/APNG4Android
7. BFL, FLUX 3 Image (aperçu, jusqu'à dix références ; tarification en crédits, 1 crédit = 0,01 $) : https://docs.bfl.ml/flux_3/flux3_image_overview.md et https://docs.bfl.ml/quick_start/pricing.md
8. Uns, deux, trois (12 et 8 dessins par seconde) : https://wwwapi.idtech.com/blog/what-does-animating-on-ones-twos-and-threes-mean
9. Spider-Verse et les deux cadences (secondaire, approximatif) : https://www.sessions.edu/notes-on-design/illustration-art-styles-utilized-in-spider-man-across-the-spider-verse/
10. Limite de texture GPU et limite de 100 Mo d'une bitmap (rapports de bogues, secondaire) : https://jira-archive.titaniumsdk.com/TIMOB-24528
11. Lottie Android, rendu matériel/logiciel (journal des versions) : https://skia.googlesource.com/external/github.com/airbnb/lottie-android/+/refs/tags/v5.0.1/CHANGELOG.md
12. Dépôt : `docs/architecture/performance.md` (règle 3, § « An ambient animation with no end »), `components/village/iso/{Effets,Revelation,Chantier,FeuxDessines,CorbeauxToits}.tsx`, `corbeaux.ts`, `revelation.ts`, `__tests__/iso-perf-compteur.test.tsx`, `scripts/iso/iso_loop.py` (FLUX3), `node_modules/expo-image/android/build.gradle`, `docs/designs/village-iso-v1/{DECISIONS,KNOWLEDGE,STATE,TODO}.md`.
