# qa-audit1 : build .perf au HEAD f97b81cb, captures et mesures après l'audit de Guillaume (tour 1) et T41 grand 2

Statut proposé : prêt pour revue (regard neuf à venir : je ne juge pas le goût)
Auteur : qa
Tour de revue : 1

## Fait
- Caches vidés avant build : cache Metro (`$TMPDIR/metro-cache`), `android/app/build/generated/{assets,res}`, `intermediates/{assets,compressed_assets,merged_res,packaged_res}`. `heavy.sh --gradle gradle-perf.sh` : BUILD SUCCESSFUL en 1 min 17 (evidence/qa-audit1/build.log). `android/gradlew -p android --stop` : « No Gradle daemons are running » (le script les avait arrêtés).
- `install -r` : lastUpdateTime 2026-10-31 18:49:45, firstInstallTime 29/10 inchangé (données gardées, rien désinstallé).
- Cache d'images : onglet Village de `bati://dev-iso`, bouton « Vider cache images », `am force-stop`, réouverture (00-village-mode.png, 01-apres-cache.png).
- Porte « sprite de HEAD » : OK. À l'emplacement de l'observatoire, la carte montre le dôme fendu à lucarne de `assets/images/village/iso/observatory/solid.nuit.webp` (relu fichier contre capture, 01-apres-cache.png), pas la forge ni un autre bâtiment. Forge, salle des héros, repaire correspondent aussi à leurs fichiers sur les captures de zoom 1.
- Réglages d'émulateur : non touchés (échelles d'animation relues à 1).

## Preuves (docs/designs/village-iso-v1/evidence/qa-audit1/)
Zoom : « zoom 1 » = zoom de jeu 1,0 = `ZOOM_MAX` (isoSpec `zoom.max` 1,0). Zoom maximum et zoom 1 sont donc la même vue dans cette app : les captures « zoom 1 » sont aussi les captures « zoom max ». Mini = cadrage du bouton du palier (île entière).

- Paliers 1, 6, 12, jour et nuit, mini et zoom 1 : `p{1,6,12}-{jour,nuit}-{mini,zoom1}.png`, planche `planche-paliers-jour-nuit.png`.
- Quatre côtés de l'île, palier 12, jour et nuit, zoom 0,6 de jeu (bouton « 0,6 ») avec un balayage vers chaque coin : `c4-{jour,nuit}-{nord-ouest,nord-est,sud-est,sud-ouest}.png`, planche `planche-quatre-cotes-palier12.png`. À zoom 1, bords sud-est, nord-ouest, sud-ouest, nord-est (jour) : `d-jour-bord-*.png`, planche `planche-bords-zoom1.png`.
- Gros plans à zoom 1 :
  - villageois près d'un bâtiment (tous debout) : `gp-villageois-jour.png`, `gp-villageois-nuit.png` (d-jour-debout-a/b.png) ;
  - chemin et place pavée près de la fontaine : bas gauche de `p12-jour-zoom1.png` et `p12-nuit-zoom1.png` ; `d-jour-debout-a.png` ;
  - arbre de lisière au premier plan : `d-jour-bord-se-1.png` (bas). Pas de passe plus proche : le zoom 1 est le maximum ;
  - bord de la forêt : bandes haute et basse de `gp-foret-bord-{jour,nuit}.png` (collage, la couture à mi-hauteur est celle du collage) ;
  - ombre sous l'île : `c4-*`, `d-jour-bord-so-1.png`, `d-jour-bord-se-2.png`, gros plan `ombre-coupure-{jour,nuit}.png`.
- Films de nuit (lourds, ~/.cache/bati-art-loop/iso/evidence/qa-audit1/ : `vagues-mini.mp4` 168 s, `vagues-z1.mp4`, `dsud.mp4`, `enord.mp4`, `eest.mp4`, `fumee.mp4`, `croissance.mp4`) et leurs planches dans le dépôt : `planche-fontaine-repaire.png` + `planche-fontaine-repaire-detail.png` (dsud), `planche-faisceau-observatoire.png` (enord), `planche-orbe-tour.png` (eest), `planche-fumee.png` (fumee). Les touchers et leur fenêtre de vague : `f-*-heures.txt`.
- Mesures brutes : `mesures/gfx-*.txt`, `mesures/meminfo-*.txt`, résumé `mesures/resume.txt`. Les captures avant/après de chaque passe et les autres brutes : ~/.cache/bati-art-loop/iso/evidence/qa-audit1/raw/.

### Ce que montrent les films de nuit (sans jugement de goût)
Le numéro de vague est `floor(Date.now()/15000)` ; j'ai porté `effetsDeVague` (plan.mjs) et touché la carte (540,2250) à chaque début de fenêtre de 15 s, pour savoir quel effet attendre.
- Fontaine + repaire (fenêtre 19:12:45, `planche-fontaine-repaire*.png`) : le jet de la fontaine est une tige bleue à disques bleus, crème et dorés qui part du bassin, autour de la colonne, et monte jusqu'à la lanterne ; visible de 0,6 s à environ 2,6 s après le toucher. Repaire : une volée de disques orange et crème à la gueule, qui monte vers la toiture, de 1,0 s à 3,0 s. Je ne distingue ni deux yeux séparés ni une fumée grise sur ce film (à zoom 1) : ce sont des disques de braise.
- Observatoire (fenêtre 19:17:15 et 19:18:00, `planche-faisceau-observatoire.png`) : faisceau pâle plus large en haut et étoile dorée avec un point, au-dessus de la pointe du dôme, détachés du dôme, sur environ 3 s.
- Tour du mage : orbe pâle (disque crème, halo, glyphes violets et crème autour) qui flotte au-dessus de la pointe de la flèche, avec un vide entre la pointe et l'orbe (`planche-orbe-tour.png`, fenêtres 19:19:45 et 19:20:15).
- Fumée (`planche-fumee.png`, `planche-faisceau-observatoire.png`, 4 vagues de 15 s, vue au zoom 1 centré) : trois formes se distinguent sur les films : nuage rond, nuage à volute intérieure, filet pâle et mince. Je ne vois pas deux cheminées émettre au même instant. Le cadrage ne montre qu'une à deux cheminées à la fois ; montée : plutôt lente, pas de saut vu à 3 images par seconde de planche. Pas de film de 30 s dédié sur une vue large des cheminées.

## Mesures (émulateur x86_64, indicatives ; le verdict reste la mesure du Fairphone)
gfxinfo, 3 passes, île palier 12 nuit, mini : « carte » = `bati://dev-iso` carte seule. « Onglet » = mode « Onglet Village » de dev-iso (VillageScene iso, village du héros de test, palier 1), PAS l'onglet Village actuel hors iso : le témoin demandé n'a pas été mesuré tel quel.

| Passe | Images | Janky | p50 / p90 / p99 (ms) | Deadline missed |
| --- | --- | --- | --- | --- |
| carte, vague 1 | 901 | 4 (0,44 %) | 25 / 29 / 36 | 4 |
| carte, vague 2 | 902 | 4 (0,44 %) | 28 / 30 / 36 | 4 |
| carte, vague 3 | 962 | 1 | 23 / 24 / 27 | 1 (ÉCARTÉE : la caméra a bougé seule à 19:26:38-19:26:56) |
| carte, glissé 1 / 2 / 3 (9 balayages, zoom 0,6) | 416 / 416 / 415 | 3 (0,72 %) / 1 / 1 | 22 / 23-24 / 26-32 | 3 / 1 / 1 |
| carte, tous debout 1 / 2 | 902 / 902 | 3 (0,33 %) / 3 | 23 / 24 / 26-28 | 3 / 3 |
| onglet, vague 1 / 2 / 3 | 927 / 930 / 929 | 11 (1,19 %) / 9 (0,97 %) / 10 (1,08 %) | 22 / 16 / 16 ; p99 28-32 | 11 / 9 / 10 |
| onglet, glissé 1 / 2 / 3 | 415 / 416 / 415 | 1 (0,24 %) chacune | 16-22 / 16-24 | 1 chacune |
| onglet, croissance (Grandir, 12 s) 1 / 2 | 126 / 125 | 6 (4,8 %) / 6 | 16 / 16 / 16 | 6 / 6 |

- Repos : fenêtre de 12 s qui commence 22 s après le toucher : 0 image rendue pour carte vague 1 et 2, onglet vague 1, 2 et 3, carte tous debout 1 et 2 (`gfx-*-repos.txt`). La passe carte vague 3 donne 507 images au repos, mais sa caméra avait bougé seule : écartée.
- Croissance : 126 images dont 6 en retard sur 12 s ; avant/après de la passe identiques (0,0 de différence sur la zone) et la planche d'un film de 9 s ne montre pas de changement net : je n'ai pas prouvé que le « Grandir » joué est visible. Chiffre indicatif seulement.
- Passe « tous les villageois en marche » : « Tous debout » puis vague, à l'échelle mini (3 retards sur 902).
- PSS (dumpsys meminfo, après les passes, `TOTAL PSS`, Graphics lu à 0 sur l'émulateur) : carte palier 12 après vague 282 524 / 279 514 kB (338 817 kB sur la passe écartée) ; tous debout 285 792 / 280 543 kB ; après glissé (zoom 0,6) 311 555 / 320 972 / 326 508 kB ; onglet après vague 316 071 / 330 000 / 328 854 kB, après glissé 326 969 / 325 676 / 328 232 kB, après croissance 319 922 / 318 947 kB. P1 mesurait 280 MB pour une carte seule au repos : le palier 12 mini est au même ordre ; le surcoût de ~2 Mo des arbres décodés à pleine taille n'est pas isolable ici (pas de passe de référence avant les deux commits), et le glissé en ajoute 30 à 45 Mo (autres niveaux de détail chargés).

## Défauts et observations pour le regard neuf
1. Coupure au sol près de l'ombre de la rive : sur `d-jour-bord-so-1.png` (et la nuit), en haut à gauche, le fond change net d'un rectangle à bord droit qui coupe la bande brune de la rive et son ombre ; un petit trait bleu sous la rive. C'est la « coupure aux raccords de tuiles » demandée ; gros plan `ombre-coupure-jour.png` et `ombre-coupure-nuit.png`.
2. Caméra : en balayant plusieurs fois de suite (`planche-camera-hors-ile.png`, deux passes de trois balayages de 800 px à zoom 0,6), le cadre est arrivé à une vue où l'île n'apparaît plus du tout (herbe et arbres seuls). Je n'ai pas conservé le cliché brut de la deuxième passe ; `planche-camera-derive-pan.png` montre le même glissement : après trois balayages l'île ne tient plus qu'un coin du cadre, loin de « la moitié du cadre sur l'île » (le critère PART_ILE de la relecture). À rejouer par le regard neuf avec un seul balayage.
3. Caméra qui bouge sans commande, passes écartées (heures locales) : 19:05-19:06 (toucher sur un bâtiment à zoom 1, la vue a sauté vers le moulin environ 6 s plus tard : `planche-camera-derive-run6.png`) ; 19:07:39-19:08:20 (vue déjà décalée avant tout toucher, puis dézoomée : `planche-camera-derive-run7.png`) ; 19:26:38-19:26:56 (carte vague 3). Ouvertures où j'enchaîne les boutons moins de 5 s après le lancement : la vue n'est pas stable. Avec 6 s d'attente et aucun toucher de bâtiment, la caméra est restée immobile 10 s (passes retenues) ; un toucher d'herbe (540,2250) n'a pas déplacé la vue.
4. Mesure : onglet (VillageScene iso) en vague : 0,97 à 1,19 % de trames en retard, au-dessus de la carte seule (0,44 %) et à la limite du seuil de 1 % du POC ; p50 16 à 22 ms. Émulateur.
5. Tour du mage et observatoire : l'orbe, le faisceau et l'étoile flottent détachés de leur toit (écart visible à zoom 1). Repaire : pas d'yeux distincts vus. Fontaine : le jet monte jusqu'à la lanterne (de la colonne au sommet du lampadaire).

## Douteux ou non fait
- Pas de passe de référence (avant ces deux commits) : aucune comparaison de coût chiffrée.
- Témoin « onglet Village actuel » (hors iso) non mesuré ; l'« onglet » ci-dessus est l'onglet iso.
- Yeux du repaire : des films en gros plan à pleine résolution du repaire seul n'ont pas été refaits (un seul film, fenêtre 19:12:45).
- Fumée : pas de film de 30 s dédié sur une vue large ; trois formes vues sur des extraits seulement, jugement « synchronisation » sur 4 vagues.
- Quatre côtés : par balayages d'un cran vers chaque coin, pas par rotation ; les côtés ne sont pas tous centrés.
- Villageois « de jour, zoom 1, près d'un bâtiment » : jour et nuit vus avec tous debout ; pas de passe villageois par villageois.
- Aucune passe avec animation réduite ; réglages d'émulateur non modifiés.
- Fairphone : jamais touché.

## Pour la suite
- Scripts de la session (scratchpad) : captures par boutons de dev-iso (palier 12 : (90,514) ; Cadrer : (312,781) ; 0,6 : (484,781) ; + : (161,781) ; Tous debout : (200,640) ; Onglet Village : (634,228) ; Grandir : (476,194) ; écran 1080x2400).
- `emu-adb.sh` : `uiautomator dump` ne trouve pas les testID de l'onglet pendant l'animation ; coordonnées lues sur capture.
