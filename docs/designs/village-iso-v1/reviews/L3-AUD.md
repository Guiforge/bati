verdict: fail

Audit du lot 3 (iso-tech-auditor, neuf), de 3eedb7fb à 3c429495. Texte rendu par l'auditeur (sans outil d'écriture), collé par le chef sans retouche de fond.

Relancé : jest iso- et village-scene, 10 suites, 191 tests verts ; `tsc --noEmit` propre ; `npm run deadcode` propre hors deux tags @legacy existants ; sha256 des fichiers figés égaux à KNOWLEDGE (CRITERES-V1 fdd032c4…, audit gelé 4beebf08… et 3677fc4e…). Le code du lot est sain. Le seul bloquant est l'outil que Guillaume lancera à H3.

## BLOQUANT (à corriger avant H3)

**B1. `perf.sh` ne mesure pas le critère 5, et son étape « trim » ne prouve rien.**
- Le critère 5 demande la carte au palier 12, aux zooms 0,6 et 1,0. `scripts/iso/perf.sh:204` mesure seulement le zoom max, en carte seule : le cas facile (la plupart des sprites hors écran, d'où 3,4 %).
- Le cas difficile, tout le village visible et réduit, n'est mesuré qu'en mode Village, sur le village du héros (10 bâtiments rough) : c'est là qu'on a 8,3 %.
- `perf.sh:211` envoie `RUNNING_LOW`. Glide 4 ne vide ses pools qu'à `UI_HIDDEN`, `RUNNING_CRITICAL` ou à partir de `BACKGROUND`. Le callback d'expo-image ne réagit qu'à `RUNNING_CRITICAL`, et seulement pour le cache blurhash (`node_modules/expo-image/android/.../ExpoImageComponentCallbacks.kt:17`). La conclusion de L3-T07 (« insensible au trim ») est sans valeur.
- Correction : en carte seule palier 12, deux séries de 3 passes de pan, une après `iso-zoom-06`, une après `iso-zoom-cadrer` ; `RUNNING_CRITICAL` au lieu de `RUNNING_LOW` ; 3 allers-retours zoom max puis Cadrer avec un meminfo après chacun (plateau = cache, hausse = fuite) ; rejouer la copie de test sur l'émulateur, puis relecteur neuf (le tour 3 de `perf.sh` n'a eu que le scan du chef).

## IMPORTANTS

**I1. Glissé de la carte en mode Village au-dessus du seuil sur l'émulateur** : 8,30 % contre 2,84 % au témoin, +5,5 points pour un seuil de +5. À ouvrir en lot 4 avant les animations. Causes probables, à départager en mesurant la carte seule au zoom de cadrage (sans verrou) contre le mode Village : (a) le verrou passe par `useAnimatedProps({ scrollEnabled })` (`VillageScene.tsx:201`, `:480`), qui n'est pas une prop rapide : chaque `verrou.set` (`useCameraIso.ts:139`, `:168`, fin de geste) fait un commit Fabric sur un écran de 1 110 vues, deux fois par glissé et même sur un tap ; alternative : `ScrollView` de RNGH avec `simultaneousWithExternalGesture` ou `blocksExternalGesture`. (b) Au zoom de cadrage, les ~640 vues de la carte sont à l'écran, dessinées réduites depuis des bitmaps décodés pour le zoom 1 (I3).

**I2. La carte monte tout son arbre** : 467 à 1 110 vues natives (`evidence/L3-T07/emu-tour3/.../temoin-pass1-meminfo.txt` contre `iso-village-pass1-meminfo.txt`) pour 10 bâtiments. Chaque bâtiment possible, pièce, Voile et OmbreSocle est monté ; Voile et OmbreSocle sont des SvgView qui gardent chacune un bitmap (`react-native-svg/.../SvgView.java:134`). Cause probable du froid : 638-698 ms témoin, 904-1 002 ms iso, même coût carte seule et mode Village (indépendant du nombre de bâtiments) ; routes différentes (`bati://village` contre `bati://dev-iso`). Pas bloquant pour H3 (drapeau éteint, onglet non de démarrage). Lot 4 : ne monter que ce qui est montré dans `IsoVillage`.

**I3. Sprites décodés trop grands sous le zoom 1** (`detail.ts:56`) : le palier 0 décode à la taille de mise en page (zoom 1) ; un village complet dans un héros de 411 dp se cadre vers 0,43, soit ~5 fois trop de pixels. Lot 4 : un palier « sous 1 » qui décode à zoom × vue.

**I4. ~31 Mo de Native Heap non rendus après un aller-retour de zoom** (74,3 → 125,6 → 105,1 Mo). Causes probables : LruBitmapPool de Glide (~1 écran, ~10 Mo), LruArrayPool (4 Mo), bitmaps libérés non encore ramassés par le GC, mémoire gardée par l'allocateur. B1 tranchera cache contre fuite. Pas bloquant. Critère 7 : 9 Mo de marge seulement (carte au zoom max 253-260 Mo de PSS contre 189 témoin, seuil +80) ; le décodage croît avec le carré de la densité et le Fairphone est plus dense : à lire en priorité à H3.

**I5. Ressort de croissance presque invisible** (~2 % pour ~7 %) : avec `damping 9 / stiffness 200 / mass 0.6`, le pic arrive vers 190 ms, quand le fondu (`FONDU_MS = 400`, `IsoCroissance.tsx:18`) n'est qu'à mi-opacité. Correction : fondu ~150 ms, ou ressort après le fondu. Le fondu croisé entre deux stades n'a jamais été vu sur appareil (village tout rough, repli « depuis rien ») ; le LOG en dit plus que les preuves.

**I6. Verrou posé dès le premier toucher** (`useCameraIso.ts:134-139`) : toute la hauteur de la carte ne fait plus défiler la page. Choix d'ergonomie à juger en main à H3.

**I7. Les revues ne gardent que la synthèse du chef** : reviews/L3-*.md contient trois à neuf lignes du chef, le texte brut du relecteur n'est conservé nulle part. Le tour 3 de `perf.sh` n'a pas eu de relecteur neuf ; aucune revue d'écran (REVUE-UI-PROMPT) de l'onglet avec la carte (scrims sur le cadre carré, titre sur la carte) ; l'ombre de socle de L3-T01 n'a pas été vérifiée à l'écran.

**I8. Critère 4 non mesuré** (2 000 points tirés au hasard, bande de 8 px, palier 12, contre une vérité en pleine résolution). Le tap n'est testé qu'à la cellule près (masque `pas: 8`, 57 stades). À planifier, sinon « à reprendre ».

**I9. Lancement non réglé** : fichiers figés non commités ; H1 points 8 (maquettes dans l'APK) et 9 (commit de lancement) sans réponse. DECISIONS:61 annonce un index de 191 Ko, il fait 565 Ko depuis les masques, dans le bundle de toute build même non évalué drapeau éteint.

## MINEURS

- `useAnimatedProps` du `ScrollView` actif même drapeau éteint (`VillageScene.tsx:201`, `:480`) : sans effet, mais pas « strictement » inchangé ; `animatedProps={iso ? scrollProps : undefined}`.
- `perf.sh:160-161` : défilements du témoin à l'aveugle ; si `.perf` plante, une vingtaine de glissés partent sur le lanceur du téléphone personnel. Ajouter à `eveille` : `mCurrentFocus` doit contenir `com.guiforge.bati.perf`, sinon arrêt.
- Accessibilité : TalkBack dit « stade : ébauché » (`village.iso.*`) alors que la fiche et la liste disent « rang » ; chaque bâtiment est annoncé deux fois (carte et liste).
- `mockIsoEvalue` (`__tests__/village-scene.test.tsx`) dépend de l'ordre des tests.
- §7 : `"nuit"` codé en dur dans `spriteDe` et `ombreSocleDe` (`carteDemo.ts:192`, `:354`) ; `biomes.defaut` lu au chargement du module (`IsoCarteDemo.tsx`) ; forge/solid et windmill/solid ont une ombre de socle peinte (`DEJA_PEINTE`), fausse sous une autre lumière. Il faudra un paramètre d'ambiance et de biome jusqu'à `IsoCarte`.

## Question 2 : drapeau éteint
Sûr. `IsoVillage` n'est chargé que par le `require` de `IsoVillageLazy` ; l'import de `VillageScene` n'est qu'un type effacé par `verbatimModuleSyntax` ; le test `village-scene` le garde ; expo-router 58 ne charge une route qu'au rendu (`getRoutesCore.js:209`). Les changements hors drapeau (`onPress`, rôle et libellé du héros identiques drapeau éteint ; `pointerEvents` des dégradés, `box-none` du titre et du cameo) ne changent rien. Seul coût : le poids du bundle (I9).

## Question 4 : `svgVariables`
Vérifié dans expo-image 58.0.17 (`ExpoImageViewWrapper.kt:133-142` lève `shouldRerender` ; `:582` le modèle ne compare que l'uri ; `svgVariables` est une `Option.memory`, `CustomOptions.kt:13`, ignorée pour un webp). Ça marche, `shortcut:` correct. Alternative publique : `useImage(s.image, { maxWidth, maxHeight }, [niveau])` avec la `ImageRef` en source : ancienne image gardée jusqu'à la nouvelle, libération explicite (`useImage.ts:101-108`), ce qui peut aussi régler I4. À essayer en lot 4, avec une mesure.

## Question 5 : `perf.sh` sur le téléphone de Guillaume
Sûr : serial obligatoire et validé, `emulator-*` refusé, `-s` partout, rien écrit ni supprimé sur le téléphone (`exec-out ... /dev/stdout`), seuls force-stop et remise à zéro de gfxinfo de `.perf`, sorties sous `evidence/perf-fairphone/`. Restent les glissés à l'aveugle (mineur) et la mise en veille : régler la mise en veille sur au moins 2 min avant de lancer.

## Question 6 : découpage du lot 4
Tient. Le lot 3 a livré carte, navigation, tap vers la fiche existante avec ses stats, animation d'évolution (faible, I5). Moulin, foyer, fumée et eau demandent l'horloge ambiante et `MODE_VIE` : lot 4. BOARD n'a aucune carte L4 : à créer, I1 à I4 en tête de lot, avant les animations.

## Budget FLUX
Lot 3 : 0 $. V1 à 1,711 $ sur 40 $. Reste de la peinture : ~0,09 $ par sprite accepté, ~4 à 10 $ pour les 39 stades et pièces restants.

## Liste H3 pour Guillaume (une fois B1 corrigé)
1. Mise en veille à 2 min ou plus, puis `scripts/iso/perf.sh <serial>` ; lire dans `summary.md` le glissé de la carte contre le témoin (+5 points au plus), la PSS de la carte au palier 12 contre le témoin (+80 Mo au plus), les 3 allers-retours de zoom (la mémoire plafonne-t-elle ?).
2. Pincement réel dans `bati://dev-iso` en mode Village : centré sous les doigts, bornes, inertie, double-tap qui recadre.
3. Glisser verticalement sur la carte : la page qui ne défile plus depuis le haut est-elle acceptable ?
4. Tap sur quelques bâtiments : la bonne fiche avec ses stats ; un tap à vide ne fait rien.
5. Bouton « grandir » : le ressort se voit-il ? (Le vrai changement de stade attend un bâtiment au rang 2 ou plus.)
6. TalkBack sur la carte : focus, « Ouvrir le détail », doublon avec la liste.
7. Onglet Village de production, drapeau éteint : villageois du cameo qui apparaît et se renvoie à l'appui ; blason et scène qui répondent.
8. À l'œil : ombre de socle des 6 bâtiments peints, netteté au zoom max.

Non vérifié par l'auditeur : ni build, ni émulateur, ni Maestro ; captures relues sans les rejouer. Causes de I1 à I4 : hypothèses tirées du code et des dumps, pas des mesures.
