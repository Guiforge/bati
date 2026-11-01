# Comment les jeux et scènes animées en React Native tiennent 60 fps

Date : 2026-10-31. Auteur : chercheur. Complète `perf-moteur.md` (compteurs gfxinfo, SvgView logiciel, calques) et `perf-jeux-classiques.md` (culling, ordre de profondeur), à ne pas relire ici. Versions du dépôt : RN 0.88.0, Reanimated 4.7.1, worklets 0.13.0, react-native-svg 15.16.0, expo-image ~58.0.17.

## Réponse en une phrase

Les jeux RN qui tiennent 60 fps ne dessinent pas des centaines de vues : soit ils passent par Skia (un seul canvas, Atlas), soit ils gardent peu de vues natives et animent par Reanimated sur le thread UI ; sans Skia ni GL, le plafond documenté est de l'ordre de 100 composants animés sur Android d'entrée de gamme, et la forêt de centaines d'`expo-image` est le contre-exemple de ce que la littérature recommande.

## Verdict Skia / GL / F-Droid

- **Non démontré acceptable, non démontré refusé.** Je n'ai trouvé aucune application F-Droid qui embarque `@shopify/react-native-skia`, ni aucun refus (recherches web, API GitLab de fdroiddata refusée en 401). Ne pas citer ça comme un fait dans un sens ou dans l'autre.
- **Ce qui est établi sur Skia.** Les binaires Skia sont des paquets npm précompilés (`react-native-skia-graphite-android` et frères), installés comme dépendances ; un build local existe (`yarn build-skia` dans `packages/skia`, "this can take a while") et prend le pas sur les paquets (CONTRIBUTING de Skia). Or la politique d'inclusion de F-Droid veut des dépendances binaires "from source compilation or Debian repository downloads", avec une liste de replis (Maven Central, Google Maven, JitPack, etc.) où npm ne figure pas, hors Node lui-même. Donc un Skia prébuilt npm est un binaire non reconstruit : très probablement bloquant, à moins de lancer `build-skia` dans la recette F-Droid, ce que je n'ai pas vu faire ni ne sais faisable sur leur builder.
- **expo-gl.** Le paquet est livré avec des sources C++ (`android/CMakeLists.txt`, `src/main/cpp`, pas de `jniLibs` dans le listing de `src/main`), version 58.0.3, sans mention de dépréciation. Avec `autolinking.buildFromSource: [".*"]` (déjà en place, voir `docs/fdroid.md` § Expo shipped 22 prebuilt AARs), il se compile depuis les sources. Je n'ai pas trouvé d'app F-Droid qui l'utilise ni de MR fdroiddata. La doc Expo ne mentionne ni Skia ni react-three-fiber ; elle renvoie à `expo-three`.
- **Rive** : déjà écarté (`T31-rive.md`, C++ précompilé). **Lottie** : non étudié ici, voir "Non vérifié".

Implication : la décision du 27/10 (`DECISIONS.md` : ni Skia, ni 3D, ni WebView) tient pour F-Droid. Skia reste le plan B de perf (`HF.md`), mais son coût F-Droid est inconnu et probablement fort ; expo-gl serait le seul chemin canvas plausible sans binaire, au prix d'écrire son propre rendu WebGL.

## Enseignements

### 1. Le plafond officiel d'objets animés sans Skia

Le guide de performance de Reanimated dit de ne pas animer plus de 100 composants sur Android bas de gamme et 500 sur iOS, et d'utiliser Reanimated avec react-native-skia plutôt que des composants React pour les animations complexes. Il prescrit aussi : animer `transform` et `opacity`, pas les propriétés de mise en page ; mémoïser les worklets de `useFrameCallback` ; ne pas lire une shared value sur le thread JS ; les problèmes de perf se voient surtout en dev.
Transposable à Bati : **oui.** Nos 64 nœuds animés sont sous le plafond de 100 ; le plafond mesure les nœuds animés, pas les vues statiques, donc il ne dit rien de la forêt. Le drapeau `ANDROID_SYNCHRONOUSLY_UPDATE_UI_PROPS` (Reanimated 4.0+, chemin rapide pour les props non-layout) existe : à tester par mesure, attention il change la détection de touch sur les composants à transform animé.

### 2. Boucle de jeu sur le thread UI

`useFrameCallback` est workletisé et tourne sur le thread UI, à chaque trame, avec `timeSincePreviousFrame` (null à la première trame), `setActive` pour l'arrêter. La page ne donne aucun chiffre de coût. À l'opposé, `react-native-game-engine` boucle sur `requestAnimationFrame` côté JS, vise 16 ms pour update plus rendu, et son FAQ avoue que les scènes à beaucoup d'ennemis, particules et effets "will struggle".
Transposable : **oui, déjà fait** (horloge partagée). Le point à garder : `setActive(false)` au repos, c'est ce qui donne 0 trame ; l'API le permet. Ne jamais passer par un moteur JS par état React.

### 3. Beaucoup de sprites : un canvas, pas des vues

Skia `Atlas` dessine N instances d'une même texture avec un `RSXform` par sprite, animables par worklet (`useRSXformBuffer`) ; "a few hundred sprites usually perform fine". Piège de version : en v3 (Graphite) l'atlas est dessiné sprite par sprite, plus lent qu'en v2 pour de gros atlas.
Transposable : **non** tel quel (Skia hors périmètre F-Droid). L'enseignement transposable est l'inverse : la méthode qui tient les centaines de sprites est de ne pas avoir une vue par sprite. Sans canvas, l'équivalent est de réduire le nombre de vues (voir 4 et 5).

### 4. Image par vue : le coût est le décodage et le nombre, pas la transformation

Doc expo-image : `allowDownscaling` vrai par défaut mais inactif si `contentFit` est `none` ou `fill` ; `decodeFormat` Android défaut `argb` (32 bits), `rgb` (16 bits sans alpha) existe mais "not guaranteed" ; `cachePolicy` défaut `disk`, la mémoire "may be purged very quickly" ; `useImage` sans `maxWidth`/`maxHeight` peut décoder en grand. Guide RN : sur iOS, changer width/height re-découpe et re-met à l'échelle l'image ; animer `transform: scale` à la place. Le guide RN signale aussi que sur Android un texte transparent sur image force des redessins à chaque trame (alpha).
Transposable : **comment.** Le code (`IsoCarteDemo.tsx`) pose déjà `contentFit="contain"`, `transition={0}` et `cachePolicy="disk"` avec le raisonnement Glide. Reste à tester pour la forêt : (a) mêmes sources et même taille décodée pour tous les arbres (l'échelle aléatoire par `transform`, pas par width/height, pour ne pas changer la clé de décodage), (b) opacité fixée sur la source (pré-cuite dans le webp) plutôt qu'`opacity` de style par arbre, que le code note déjà comme source de calque hors écran, (c) `decodeFormat="rgb"` impossible tant que l'alpha compte. Aucune des sources lues ne chiffre "N ImageView Android tiennent 60 fps" : voir "Non vérifié".

### 5. Moins de vues : fusionner les statiques

Le guide Reanimated recommande Skia quand il y a trop de composants ; le guide RN ne chiffre pas les vues natives. Pour un décor immobile la voie sans GL est de le cuire : une seule bitmap par bloc de cases (forêt rendue en un webp par zone), et de ne garder en vues que ce qui bouge ou se touche. `perf-jeux-classiques.md` § 5 couvre le "cuire une fois" et `perf-moteur.md` § 3 les calques ; ce qui s'y ajoute ici est que la littérature RN n'offre pas d'alternative : pas de batch natif d'images sans canvas.
Transposable : **oui**, c'est la correction la plus probable du symptôme (centaines d'`Image` aléatoires vers quelques bitmaps par chunk), mais c'est une inférence des sources, non une mesure. À valider avec un gfxinfo avant/après sur une zone de forêt.

### 6. Découpe de sprite sheet sans Skia

La technique "overflow hidden plus translate" (un conteneur à la taille d'une cellule, une `Image` de la feuille entière décalée) n'a aucune source sérieuse trouvée. Elle a un coût connu : chaque cellule affichée tient la feuille entière décodée (ou re-décode selon la taille demandée à Glide). Les feuilles de poses des animaux de Bati (`T31-rive.md`) ont donc plutôt intérêt à être découpées en fichiers par pose, ou à ne montrer qu'une vue qui change de `source` (avec `transition={0}`).
Transposable : **à mesurer**, aucune preuve externe.

### 7. LOD et culling dans une scène RN

Aucun retour d'expérience RN sérieux trouvé sur le culling de vues d'une carte. Les sources de jeux classiques (`perf-jeux-classiques.md` § 1, 2) restent la référence ; le guide Reanimated confirme que la limite est le nombre d'éléments animés, donc ne monter que ce qui est visible est cohérent. La caméra en un seul `Animated.View` n'empêche pas de ne rendre que les chunks dans le rectangle de vue plus une marge.
Transposable : **oui**, par principe, source RN absente.

## Mesure

- **Perf Monitor** (menu dev, RN) : disponible uniquement en dev, "a guide" à ne pas prendre pour une mesure ; pas de chiffre de perf à tirer de là (règle du dépôt aussi).
- **Flashlight (BAM)** : Android seulement, `flashlight measure` en direct, `flashlight test` pour des itérations automatisées ; agrège FPS, CPU par thread et RAM en un score. Lecture : FPS moyen proche de 60 ; thread UI près de 100 % de CPU = débordé ; thread JS `mqt_js` près de 100 % = mauvaise réactivité. Le score varie entre les passes : même durée, plusieurs itérations. Le thread UI y sert à confirmer le symptôme, pas à localiser la cause.
- **gfxinfo / Perfetto** : déjà traités dans `perf-moteur.md` § 1 et § 5. Je n'ai pas ouvert de page Perfetto dans cette recherche.

## Ce que j'ai écarté

- **react-native-game-engine** : MIT, 2018, boucle `requestAnimationFrame` JS, rendu par vues ou SVG, auteur qui renvoie vers Godot/Unity pour les jeux sérieux. Rien à reprendre.
- **matter-js + RN** : non étudié (pas de physique dans le village).
- **react-three-fiber natif, three.js** : passent par expo-gl ; hors périmètre, lourds, aucun gain pour une carte 2D.

## Non vérifié

- Si une app F-Droid embarque Skia ou expo-gl aujourd'hui (aucun résultat ; GitLab fdroiddata en 401). Chercher à la main `react-native-skia` et `expo-gl` dans `metadata/*.yml`.
- Si le builder F-Droid peut lancer `yarn build-skia` (toolchain Skia, temps, mémoire).
- Un chiffre fiable de "N vues natives sous Fabric sur Android moyen de gamme". Un benchmark Theodo (Fabric contre Paper, vues et textes) est apparu en résultat de recherche mais je ne l'ai pas ouvert : non cité.
- Le coût de `opacity` par `ImageView` sous HWUI sans calque (le code dit qu'un groupe en demande un ; une `Image` seule n'en demande peut-être pas).
- Lottie, Candillon, démos Skia de jeu : aucun retour sourcé trouvé.
- La version de Skia dont j'ai lu le CONTRIBUTING (Graphite, v3) ; une recherche mentionne qu'en 2.6.2 un postinstall copiait les binaires : mécanisme différent, même constat de binaires npm précompilés.

## Sources

- Reanimated, Performance guide : https://docs.swmansion.com/react-native-reanimated/docs/guides/performance/
- Reanimated, useFrameCallback : https://docs.swmansion.com/react-native-reanimated/docs/advanced/useFrameCallback/
- React Native, Performance overview : https://reactnative.dev/docs/performance
- React Native, Debugging (Perf Monitor) : https://reactnative.dev/docs/debugging#performance-monitor
- react-native-skia, Atlas (source markdown) : https://github.com/Shopify/react-native-skia/blob/main/apps/docs/docs/shapes/atlas.md
- react-native-skia, README : https://github.com/Shopify/react-native-skia
- react-native-skia, package.json : https://github.com/Shopify/react-native-skia/blob/main/packages/skia/package.json
- react-native-skia, CONTRIBUTING : https://github.com/Shopify/react-native-skia/blob/main/packages/skia/CONTRIBUTING.md
- F-Droid, Inclusion Policy : https://f-droid.org/docs/Inclusion_Policy/
- expo-gl, package.json : https://github.com/expo/expo/blob/main/packages/expo-gl/package.json
- expo-gl, dossier android : https://github.com/expo/expo/tree/main/packages/expo-gl/android et .../src/main
- Expo, GLView : https://docs.expo.dev/versions/latest/sdk/gl-view/
- Expo, Image : https://docs.expo.dev/versions/latest/sdk/image/
- react-native-game-engine : https://github.com/bberak/react-native-game-engine
- Flashlight : https://github.com/bamlab/flashlight et https://docs.flashlight.dev/
- Theodo, Measuring React Native performance with Flashlight : https://www.theodo.com/blog/measuring-react-native-performance-with-flashlight
- Dépôt : `docs/fdroid.md` § Expo shipped 22 prebuilt AARs, `docs/designs/village-iso-v1/DECISIONS.md` (27/10), `components/village/iso/IsoCarteDemo.tsx` (en-tête), `package.json`.
