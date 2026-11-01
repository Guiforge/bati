# Perf du moteur iso sans GL : d'où vient "Slow bitmap uploads"

Date : 2026-10-31. Cadre : Expo SDK 58, RN 0.88, react-native-svg 15.16, expo-image (Glide), émulateur sans GPU.

## Réponse en une phrase

"Slow bitmap uploads" est le nom affiché du compteur `kSlowSync` (phase de synchronisation du RenderThread, plus de 0,2 trame), et un `SvgView` Android est un bitmap logiciel ARGB_8888 rasterisé sur le thread UI puis téléversé en texture : chaque tuile SVG qui est (re)créée ou (re)attachée, et chaque image à alpha ou taille propre, coûte un téléversement ou un calque hors écran, ce qui colle à nos 95 % de trames lentes avec GPU inchangé.

## 1. Ce que mesurent les compteurs gfxinfo

Faits (AOSP, `JankTracker.cpp`, `ProfileData.cpp`, `GraphicsStatsService.cpp`) :

| Libellé gfxinfo | Type interne | Intervalle mesuré | Seuil |
|---|---|---|---|
| Slow UI thread | `kSlowUI` | `Vsync` à `SyncStart` | 0,5 trame |
| Slow bitmap uploads | `kSlowSync` | `SyncStart` à `IssueDrawCommandsStart` | 0,2 trame |
| Slow issue draw commands | `kSlowRT` | `IssueDrawCommandsStart` à `FrameCompleted` | 0,75 trame |

- "Slow UI thread" = le thread UI (mesure, layout, enregistrement des display lists) a mis plus d'une demi-trame avant de passer la main. Ce n'est PAS le GPU.
- "Slow bitmap uploads" est un mauvais nom : c'est tout le temps de la phase sync (copie de l'état des vues vers le RenderThread, préparation des calques, envoi des bitmaps). Le téléversement de bitmaps en est la cause classique, pas la seule.
- Notre signature (GPU p50 inchangé 10-11 ms, UI et sync en cause) dit : le coût est côté CPU/sync, pas côté remplissage GPU. L'émulateur sans GPU gonfle le téléversement (copie logicielle), donc le chiffre absolu ne se transpose pas à un téléphone, la proportion oui.
- Android documente le téléversement : un bitmap est téléversé à sa première apparition dans une trame, "Texture upload(id) width x height" dans Systrace, "plusieurs millisecondes"; le bitmap ne doit pas être beaucoup plus grand que sa zone à l'écran.

S'applique à Bati : oui. Lire les 3 compteurs ensemble avant tout correctif.

## 2. react-native-svg Android : le `SvgView` est un bitmap logiciel

Lu dans `SvgView.java` (branche main). Version 15.16 non comparée ligne à ligne, voir limites.

- `onDraw` : `if (mBitmap == null) { mBitmap = drawOutput(); }` puis `canvas.drawBitmap(mBitmap, 0, 0, mPaint)`.
- `drawOutput()` : `Bitmap.createBitmap(width, height, ARGB_8888)` à la taille de LAYOUT de la vue, et rend tous les Path/ClipPath dessus avec un Canvas logiciel. Ça se passe dans `onDraw`, donc sur le thread UI.
- Le cache est invalidé (bitmap recyclé et nul) par : `invalidate()`, tout changement de props (setters : couleur courante, viewBox, align...), `onSizeChanged`, `onDetachedFromWindow`.
- Rien de tout ça n'est déclenché par un transform (translate/scale) d'un ancêtre : le bitmap reste, le GPU le transforme. Conclusion déduite de la liste d'invalidations, pas testée sur appareil.
- Conséquences :
  - Coût d'une tuile = rasterisation CPU de tous ses chemins, une fois par vie du bitmap, plus un téléversement de largeur x hauteur x 4 octets. Ajouter bord organique et pavage vectoriel augmente le premier terme sur le thread UI (Slow UI thread) et jamais le GPU.
  - Une tuile détachée puis rattachée (virtualisation, culling par montage, remontage d'un parent conditionnel) est rasterisée de zéro. Un `key` instable a le même effet.
  - Pas de cache partagé entre `SvgView` : N tuiles identiques = N rasterisations et N textures.
  - Un `SvgView` dont le layout change de taille (zoom par width/height au lieu de transform) se ré-rasterise.

S'applique à Bati : oui, c'est le premier suspect pour "Slow UI thread" (~50 %).

## 3. Calques hors écran et cache de textures HWUI

Faits :
- Android : un view avec `setAlpha` < 1 est rendu "dans un tampon hors écran qui double le fill-rate requis" (guide Hardware acceleration, "Use alpha with care"). Un `LAYER_TYPE_HARDWARE` coûte de la mémoire vidéo et doit être retiré après l'animation.
- RN : `needsOffscreenAlphaCompositing` est faux par défaut, alors l'alpha est appliqué à chaque élément sans calque (RN préfère la correction de couleur à la vitesse). `renderToHardwareTextureAndroid` ne vaut que pour animer opacité/transform d'un contenu statique, et "peut épuiser la mémoire vidéo".
- `CacheManager.cpp` (HWUI) : le budget du cache de ressources GPU = surface de l'écran x un multiplicateur de politique mémoire (valeur non lue); niveau de trim BACKGROUND : `freeGpuResources()` et purge de tous les caches; nettoyage différé des ressources inutilisées au plus toutes les 25 ms, purge de ce qui est inutilisé depuis 30 s.
- Symptôme de thrashing du cache (inférence, à confirmer au trace) : mêmes textures re-téléversées à chaque trame, "Texture upload" récurrent sur le RenderThread au lieu d'une seule fois, p50 de sync qui ne retombe pas au repos.

Pour nous : la forêt de `Monde.tsx` (lignes 130-152) monte un `<Image>` par case avec `opacity: k.teinte` ET une taille `IMAGE * k.echelle` propre à chaque image. Deux mécanismes distincts :
- (a) alpha par vue : un `ImageView` avec alpha < 1 est dessiné par `saveLayer` si la vue déclare un rendu qui se chevauche. Valeur de `hasOverlappingRendering` d'expo-image NON vérifiée.
- (b) taille par image : la clé de cache mémoire de Glide inclut largeur, hauteur et transformations (doc Glide, Caching). Des tailles toutes différentes donnent autant de décodages et de bitmaps redimensionnés, donc autant de téléversements, au lieu d'un seul par tuile d'atlas. Lien avec expo-image non confirmé : le sizing exact (taille de vue ou taille cible) dépend de l'intégration.

Le voile `iso-monde-fondu` (opacity 0.3, plein cadre) et `iso-monde-mer-lavis` sont des vues pleines à alpha : une couche de remplissage chacune, pas des calques si pas de chevauchement.

S'applique à Bati : oui pour (a) et (b), à départager par mesure (section 5).

## 4. Techniques de moteurs 2D iso sans GL

Sources : retours généraux (Android doc rendu, Glide). Aucun post-mortem de jeu iso mobile précis lu et cité : je ne prétends pas en avoir.

| Technique | Source | S'applique à Bati |
|---|---|---|
| Bake (pré-rendu) des couches statiques en webp/png, à la taille affichée, et affichage par `Image` | Android : tout bitmap dessiné sur le canvas accéléré évite la rasterisation logicielle; Glide met en cache les redimensionnés | Oui : remplace tuile SVG par une image bakée (hors ligne) ; un seul décodage, une texture, plus de CPU de raster au runtime. À mesurer contre le coût mémoire |
| Atlas / même taille pour tous | Clé de cache Glide inclut la taille | Oui pour la forêt : 2 ou 3 échelles quantifiées au lieu d'une échelle par case |
| Alpha cuit dans le sprite | Guide alpha : coût hors écran | Oui : `opacity` par `teinte` devient une variante bakée ou une teinte précalculée |
| Culling hors écran (ne monter que les tuiles visibles + marge) | Principe général | Prudence : un détachement jette le bitmap SVG (`onDetachedFromWindow`). Culling utile pour des `Image`, nuisible pour des `Svg` si ça remonte souvent. Hystérésis large ou aucun culling si la carte tient en mémoire |
| Niveaux de détail par zoom | Principe général | Non en priorité : la caméra est un transform sur le thread UI, le bitmap n'est pas ré-rasterisé; un LOD par seuil de zoom ne ferait que changer la source (un téléversement) |
| Taille de décodage = taille affichée | Android : "le bitmap ne doit pas être beaucoup plus grand que sa zone à l'écran"; expo-image : `allowDownscaling` vrai par défaut mais "jamais utilisé avec `contentFit` none ou fill" | Oui, et notre forêt utilise `contentFit="fill"` : le garde-fou de downscale ne s'applique pas. Vérifier la taille des webp sources |
| Mémoire décodée | Android : webp = ARGB 4 o/px une fois décodé | Oui : compter largeur x hauteur x 4 par sprite et par tuile SVG (bitmap logiciel + texture) |

Rappel Android : ne pas dépasser environ 2,5 fois les pixels de l'écran dessinés par trame, "les pixels transparents d'un bitmap comptent" (guide Hardware acceleration). La forêt à marges transparentes grandes y contribue.

## 5. Trouver le coupable

Outils standard, ordre conseillé :
1. `adb shell dumpsys gfxinfo <pkg> reset` puis rejouer le scénario puis relire : seul le delta compte. Documenté (Profile GPU rendering).
2. Profile GPU Rendering "en barres" : barre "Sync & Upload" haute = téléversements ; "Command Issue" haute = trop de display lists ; "Misc Time / VSync Delay" = thread UI occupé (descriptions Android verbatim).
3. Perfetto avec FrameTimeline (Android 12+) : classe chaque trame (App Deadline Missed...). Dans la trace, regarder sur le thread UI les slices `draw` / `Record View#draw` autour de `SvgView.onDraw` et, sur le RenderThread, `Texture upload(id) WxH` (nom cité par la doc Android) et `syncFrameState`. Le nom exact des slices selon la version Android n'est pas confirmé ici.
4. Bissection par commit : désactiver `opacity` et l'échelle par image de la forêt (un commit), puis le bord organique des tuiles (un autre), relire gfxinfo. Plus fiable que l'analyse.
5. "Show hardware layers updates" (option développeur, flash vert à chaque mise à jour d'un calque matériel) et "Debug GPU overdraw" (couleurs de surdessin) : existent, mais je n'ai pas pu ouvrir leur page officielle, voir limites. Un calque qui flashe à chaque trame confirmerait (a) de la section 3.

## Les 5 tips les plus probables pour notre symptôme

1. Chaque `SvgView` rasterise tout son contenu sur le thread UI à la première `onDraw` : alléger les chemins (bord organique, pavage) ou les baker en image. Cible "Slow UI thread".
2. Ne jamais détacher/remonter une tuile `Svg` (clés stables, parent inconditionnel, pas de culling par montage) : `onDetachedFromWindow` jette le bitmap.
3. Forêt : supprimer l'alpha par vue (baker la teinte dans le sprite) : alpha < 1 sur une vue = tampon hors écran.
4. Forêt : quantifier `echelle` sur 2 ou 3 valeurs (ou baker) : taille par image = clé de cache Glide distincte = décodage et téléversement distincts. Cible "Slow bitmap uploads".
5. Bissecter sur gfxinfo après `reset` (forêt d'abord, tuiles ensuite) avant de coder le bake, et décoder les sprites à la taille affichée (`contentFit="fill"` désactive le downscale d'expo-image).

## Limites, ce que je n'ai pas pu vérifier

- Pas de mesure sur appareil ni sur nos APK : tout ce qui relie les commits suspects aux compteurs est de l'inférence.
- `SvgView.java` lu sur la branche main, pas sur le tag de la 15.16 ; le comportement de cache vu est ancien et stable mais non comparé.
- `Tuile` d'IsoCarteDemo.tsx non relue en détail pour cette note.
- Valeur de `hasOverlappingRendering` d'expo-image et mécanique exacte de dimensionnement Glide dans expo-image : non vérifiées.
- Pages Android "Show hardware layers updates" et légende de "Debug GPU overdraw" : introuvables dans les pages ouvertes (liens vers /topic/performance/rendering/overdraw non ouvert). Description donnée de mémoire.
- La taille exacte du budget du cache de textures HWUI (le multiplicateur) : non lue, et dépend de la version Android de l'émulateur.
- Aucun post-mortem de jeu iso mobile ouvert et cité : section 4 repose sur la doc Android et Glide, pas sur des retours de jeux.
- "Slow bitmap uploads = tout le temps de sync" est lu dans les seuils AOSP ; qu'un téléversement de bitmap tombe dans cette phase est cohérent avec la doc mais non tracé.

## Sources

- AOSP, JankTracker.cpp : https://android.googlesource.com/platform/frameworks/base/+/refs/heads/main/libs/hwui/JankTracker.cpp
- AOSP, ProfileData.cpp : https://android.googlesource.com/platform/frameworks/base/+/refs/heads/main/libs/hwui/ProfileData.cpp
- AOSP, GraphicsStatsService.cpp : https://android.googlesource.com/platform/frameworks/base/+/refs/heads/main/libs/hwui/service/GraphicsStatsService.cpp
- AOSP, CacheManager.cpp : https://android.googlesource.com/platform/frameworks/base/+/refs/heads/main/libs/hwui/renderthread/CacheManager.cpp
- react-native-svg, SvgView.java : https://github.com/software-mansion/react-native-svg/blob/main/android/src/main/java/com/horcrux/svg/SvgView.java
- Android, Slow rendering : https://developer.android.com/topic/performance/vitals/render
- Android, Hardware acceleration (layers, alpha) : https://developer.android.com/develop/ui/views/graphics/hardware-accel
- Android, Inspect GPU rendering speed : https://developer.android.com/topic/performance/rendering/inspect-gpu-rendering
- Android, Profile GPU Rendering : https://developer.android.com/topic/performance/rendering/profile-gpu
- Android, Tracing (Perfetto) : https://developer.android.com/topic/performance/tracing
- Perfetto, FrameTimeline : https://perfetto.dev/docs/data-sources/frametimeline
- React Native, View (needsOffscreenAlphaCompositing, renderToHardwareTextureAndroid) : https://reactnative.dev/docs/view
- Glide, Caching : https://bumptech.github.io/glide/doc/caching.html
- Expo, Image : https://docs.expo.dev/versions/latest/sdk/image/
- Dépôt : components/village/iso/Monde.tsx (lignes 130-166)
