# L4-T01 (qa) : verrou du glissé par RNGH `block`, vérification sur émulateur

Statut proposé : prêt pour revue
Auteur : qa
Code : arbre de travail non commité (VillageScene, useCameraIso, IsoVillage). Build `.perf` neuve par `heavy.sh --gradle gradle-perf.sh` (`BUILD SUCCESSFUL in 1m 21s`, `build.log`), `gradlew --stop` fait par le script, `install -r` Success, base non remise à zéro, `.dev` arrêté.

## 1. Mesures (émulateur, médianes de 3, copie de test `scripts/iso/perf-emu-l4t01.sh`)
Copie de `perf.sh` dont seuls l'adb (`emu-adb.sh`), la garde du serial et le dossier de sortie changent (`diff` dans la session). Brut : `evidence/L4-T01/emu/20261029-144406-emulator-5554/` (`summary.md`), journal `emu-run.log` (`rc=0`).

| phase | avant (L3-T07 tour 3) | après (L4-T01) | cible |
|---|---|---|---|
| témoin, onglet Village de production, défilement | 2,84 % (387 images) | 2,84 % (387 images, 11 janky) | |
| iso Village, défilement de page | 2,27 % (352) | 2,54 % (354, 9 janky) | |
| **iso Village, glissé de carte** | **8,30 % (229)** | **7,89 % (228, 18 janky)** | < 7,84 % : **manquée de 0,05 point** |
| carte seule, zoom max | 3,37 % (178) | 3,45 % (174, 6 janky) | |
| carte seule, zoom 0,6 | 3,45 % (174, tour 4) | 3,73 % (161, 6 janky) | |
| repos 10 s (témoin / iso Village / iso carte) | 0 | 0 / 0 / 0 | 0 |
| démarrage à froid témoin / iso Village / iso carte | 698 / 1 002 / 1 002 ms | 674 / 973 / 939 ms | |
| Native Heap Mo (témoin / Village / glissé / zoom max) | 74,4 / 100,3 / 104,2 / 124,3 | 74,3 / 101,4 / 105,6 / 129,5 | |
| mémoire de la carte, retour / +30 s / trim critique | 105,1 / 105,1 / n.d. | 100,1 / 106,8 / 104,7 (Native Heap) | |
| aller-retours zoom max puis Cadrer | plateau | plateau (107,2 / 104,4 / 106,7) | |

Lecture : le glissé de carte passe de 8,30 à 7,89 %, soit −0,4 point, du même ordre que la dispersion entre passes (tours 2 à 4 : 8,0 à 8,3 %). Le témoin est identique à celui du tour 3 (2,84 %), l'écart reste de 5,05 points. **La cible n'est pas atteinte, et le changement ne fait quasiment rien au chiffre.** Le « cadre de départ » (6 images, 100 %) est non significatif, comme au tour 4.

## 2. Diagnostic du glissé : où et quelle étape (framestats)
Bruts : `evidence/L4-T01/framestats/` (`*.txt` = `dumpsys gfxinfo <pkg> framestats`, `*.gfx.txt` = résumé gfxinfo, `analyse.txt` = sortie du dépouillement, captures de fin de geste). Une session : 3 glissés de 400 ms (aller, retour, aller) après `gfxinfo reset`, une pause de 1,2 s entre eux. Une image est « janky » quand `FrameCompleted > FrameDeadline`.

| scénario | images | janky | où dans le geste | dépassement de l'échéance | étape qui prend le temps |
|---|---|---|---|---|---|
| glissé de carte, mode Village | 97 | 4 (4,12 %) | 1 par glissé : la **toute première image** du geste (3 fois) + l'image traînante isolée après le dernier | 0,1 à 0,3 ms | `SwapBuffers` → `FrameCompleted` (gpu/swap) : 13,5 à 13,9 ms contre 12,9 en médiane |
| glissé de page hors carte (contrôle, liste), mode Village | 168 (120 dans les glissés) | 5 (2,98 %) | 1 par glissé : première image, + 1 image traînante | 0,2 à 0,3 ms | idem : gpu/swap 13,5 à 14,5 ms |
| glissé de carte seule, zoom 0,6 | 44 | 3 (6,82 %) | 1 par glissé : première image | 0,2 à 0,3 ms | idem : gpu/swap 12,9 à 13,5 ms |

- **Aucune image janky ne tombe au milieu ni en fin de geste** : toutes sont la première image du glissé (ou l'image isolée qui suit). Aucune n'est due au fil JS ni à la mise en page : input 0,5 à 1,1 ms, animation 0,1 à 0,3, traversal 0,1, draw 0 à 0,3, sync/upload 0,4 à 0,8, issue 1,3 à 1,8 ms, sur les images janky comme sur les autres. Le tampon `gpu/swap` vaut ~13 ms sur **toutes** les images de l'émulateur (GPU hôte), et les images « janky » ne le dépassent que de 0,1 à 1,6 ms : elles manquent l'échéance de 16,67 ms de 0,1 à 0,3 ms.
- Le pourcentage dépend donc surtout du **nombre d'images du glissé** : 1 image janky par glissé, sur 25 à 45 images. Le glissé de carte en mode Village n'est pas pire que le glissé de page de contrôle (4,1 % contre 3,0 % ici, avec 4 contre 5 janky) : il a seulement moins d'images pour diluer l'image de départ. C'est la raison pour laquelle l'ancien verrou n'était pas la cause : le coût visé n'est pas dans l'UI thread. L'émulateur ne dit rien de la première image sur le Fairphone.
- Limites : une session de 3 glissés par scénario, brève ; les chiffres de `perf.sh` (18 janky sur 228) sont 6 glissés de 4 passes en tout, donc ~1 à 2 images janky par glissé, même ordre de grandeur.

## 3. Comportements (drapeau iso allumé : `bati://dev-iso`, mode « Onglet Village », `VillageScene iso`)
Captures dans `evidence/L4-T01/` (préfixes `03` à `06`). Les glissés partent de `adb input swipe`.

| point | verdict | preuve |
|---|---|---|
| a) un glissé sur la carte ne fait pas défiler la page, y compris un glissé vertical rapide dès le premier toucher | **OK pour le défilement, mais un défaut trouvé** (voir plus bas) | glissés verticaux de 60, 120, 200 et 600 ms et diagonal de 150 ms sur la carte : `village-hero` reste à `[0,252][1080,1374]` à chaque essai (dump), la carte se déplace (`03a-r1-fast.png` : la page est restée en place, la carte a glissé sous le titre) |
| b) un glissé hors de la carte fait défiler la page | **OK pour la liste, KO pour le titre** | liste (2000 → 900) : la page défile, `village-hero` sort de l'écran (`04b-list-scroll.png`). Départ sur le titre ou la ligne « Hamlet » (700,1280 → 700,700) : la page ne défile pas, c'est la carte qui bouge (`04b-title-scroll.png`) : la zone de glissé de la carte (`iso-village`, `[0,252][1080,1332]`) recouvre le titre et le blason. À trancher : voulu (la carte passe derrière le titre) ou à réduire |
| c) la parallaxe du tableau suit le défilement ; revenir sur la page la remet en haut | **parallaxe OK ; retour en haut OK** | défilement de 320 px : le héros passe de `[0,1374]` à `[0,1054]`, le feu de camp de `y=712` à `504`, soit 208 px, la carte bouge à ~0,65 du défilement (`05c-parallax-300px.png`). Retour : pousser `bati://dev` puis retour arrière : `village-hero` revient à `[0,252][1080,1374]` après un défilement qui l'avait sorti de l'écran (`04c-*.png`). Le retour a été joué sur l'écran `dev-iso`, pas sur l'onglet Village du tabbar (voir « non vérifié ») |
| d) double-tap recadre, tap ouvre la bonne fiche, tap à vide ne fait rien | **OK** | tap sur le moulin : fiche « Windmill » (`05d-tap-windmill.png`) ; tap sur la forge : fiche « Forge » (`05d-tap-forge.png`) ; tap à vide `(100,520)` : aucune fiche, caméra inchangée (feu de camp à y=712, `05d-tap-empty.png`) ; carte glissée (feu de camp à y=393) puis double-tap à vide : revient à y=712, sans fiche (`05d-before/after-dbltap.png`) |
| e) drapeau éteint : onglet Village de production comme avant | **OK** | `bati://village` : scène peinte, le défilement amène la liste des muscles (`06e-prod-scrolled.png`), glissé inverse revient en haut (`06e-prod-top.png`) ; un appui sur la scène ouvre le visionneur « Tap anywhere to close » (`06e-prod-tap-scene.png`) |

### Défaut trouvé : un glissé qui finit sur un bâtiment ouvre sa fiche
Sur la carte en mode Village, des glissés rapides ou moyens dont le doigt se lève **sur un bâtiment** ouvrent la fiche de ce bâtiment, en plus de déplacer la carte : glissé vertical de 60 ms (3 essais sur 3, fiche « Campfire », `03a-r1-fast.png`), 120 ms, 200 ms, et horizontal de 60 et 300 ms. Un glissé de 600 ms (540,1100 → 540,500) et un glissé de 60 ms finissant à (540,470) n'ouvrent rien. Le fait que le glissé soit pris pour un appui au relâchement tient aux événements synthétiques d'`adb input swipe` : à reproduire avec un doigt avant de conclure. Si c'est réel, un utilisateur qui fait passer la carte et lève le doigt sur un bâtiment ouvre une fiche sans l'avoir voulu (d) reste vrai pour un tap franc). Je n'ai pas pu savoir si ce comportement date de l'ancien verrou (pas de retour en arrière possible sans `git checkout`).

## 4. Non vérifié
- **Pincement** : non simulable par `adb input`.
- **Retour sur l'onglet Village du tabbar** en mode iso : le drapeau est éteint dans la build (`INTEGRATION = false`), l'écran iso n'est atteignable que par `dev-iso` ; la remise en haut a été vue au retour sur cet écran, par le même `useFocusEffect`, pas sur l'onglet.
- **Barre d'inertie, overscroll, retour prédictif** du `ScrollView` RNGH (risque cité par l'ingénieur) : non regardés.
- **Un toucher long immobile puis glissé vertical** : non joué.
- **Critère 4 en Maestro** (taps sur des bâtiments au palier 12) : non fait, faute de temps.
- **Fairphone** : aucune mesure ; les chiffres de l'émulateur (GPU hôte, `gpu/swap` ~13 ms par image) sont des ordres de grandeur.

## Fichiers
`scripts/iso/perf-emu-l4t01.sh` (copie de test, à supprimer ou garder à la discrétion du chef), `docs/designs/village-iso-v1/evidence/L4-T01/` (`emu/`, `framestats/`, `build.log`, `emu-run.log`, captures `00` à `06`).

## Tour 2 (`maxDistance` 8 dp sur tap et doubleTap dans `useCameraIso.ts`)
Build `.perf` neuve par `heavy.sh --gradle gradle-perf.sh` (`BUILD SUCCESSFUL in 1m 16s`, `evidence/L4-T01/build-tour2.log`, `gradlew --stop` fait par le script), `install -r` Success, base non remise à zéro. Pas de nouvelles mesures de janky. Captures et journaux : `evidence/L4-T01/tour2/`. Chaque essai part d'un démarrage neuf de `dev-iso` (force-stop du `.perf`, `am start`, bascule en « Onglet Village », 2 s d'attente).

| point | verdict | preuve |
|---|---|---|
| 1) les glissés qui ouvraient une fiche n'en ouvrent plus | **OK** | vertical 60, 120 et 200 ms (540,1100 → 540,500, fin sur le feu de camp : `[473,393][571,540]`) et horizontal 60 et 300 ms (900,800 → 200,800) : aucun « Close » dans le dump, la carte a bougé, la page est restée en place (`village-hero` à `[0,252][1080,1374]`). Captures `swipe-v-*.png`, `swipe-h-*.png` |
| 2a) tap sur le moulin puis sur la forge ouvre la bonne fiche | **OK** | moulin : « Close » présent et texte « Rises with your shoulders » (`sheet-windmill-text.txt`, `tap-windmill.png`) ; forge : « Rises with your chest » et « Enter the forge » (`sheet-forge-text.txt`, `tap-forge-2.png`) |
| 2b) tap à vide ne fait rien | **OK** | tap en (100,520) : pas de fiche, feu de camp inchangé à `[473,712][571,859]` (`tap-empty.png`) |
| 2c) double-tap après un glissé recadre | **OK** | glissé lent : feu de camp à `[473,393][571,540]`, double-tap en (900,1100) : revenu à `[473,712][571,859]`, pas de fiche (`dbl-before.png`, `dbl-after.png`) |
| 3) Maestro critère 4 | **KO, non résolu** | voir ci-dessous |

Un seul glissé n'a pas pu finir sur un bâtiment au sens strict : les glissés horizontaux se terminent à (200,800), sur le moulin une fois la carte déplacée, d'après les bornes de la carte avant glissé et le déplacement de 44 px observé du feu de camp (non confirmé par un dump du moulin après coup).

### Maestro critère 4 : le flux est écrit, il échoue sur le premier tap
Flux : `.maestro/iso-batiments.yaml` (mode Village, 4 bâtiments : moulin, forge, carrière, tour du mage ; pour chacun un tap sur son `iso-batiment-*`, la ligne propre à sa fiche, « Close », puis la fiche absente). Le palier 12 n'existe qu'en « Carte seule », où les bâtiments n'ouvrent pas de fiche ; la fiche n'existe qu'en mode Village, qui montre les 10 bâtiments du héros, pas un palier 12.
- `openLink: bati://dev-iso` ouvre un sélecteur « Open with » (`.dev` et `.perf` déclarent tous deux `bati://`) : le flux part donc d'une carte ouverte au préalable par `emu-adb.sh shell am start … com.guiforge.bati.perf`, puis `launchApp: stopApp: false`.
- Dans ce flux, **le tap Maestro sur le moulin (sur `id`, ou sur le point `24%,31%`, avec `retryTapIfNoChange: false` ou non) n'ouvre aucune fiche** : `assertVisible "Rises with your shoulders"` échoue, la capture finale n'a pas de fiche (`maestro-fail3.png`, `maestro-batiments*.log`). Un tap `input tap` aux mêmes coordonnées, sur la même instance de l'app, **ouvre bien la fiche** (essai de contrôle juste après, « Close » présent). L'écart tient donc au tap de Maestro, pas à l'état de l'app.
- Hypothèse non vérifiée : Maestro envoie un appui de durée presque nulle que le tap RNGH (avec `maxDistance` ou non) ne retient pas. Je n'ai pas pu savoir si cela date du changement `maxDistance` ou du verrou RNGH, ni si un doigt réel est concerné : à regarder avant de conclure que le critère 4 est tenu.
- À faire côté ingénieur : soit comprendre pourquoi un tap sans durée n'ouvre rien (un doigt réel en fait toujours une, mais un test automatisé n'est pas fiable tant que cela dure), soit fournir un geste de test (appui avec durée) que le flux puisse employer.
