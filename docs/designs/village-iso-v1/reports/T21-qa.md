# T21-qa : carte presque plein écran, rotation, sur émulateur

Statut proposé : bloqué (rotation : saut visible dans les deux sens, et vue perdue au retour en portrait sur le téléphone)
Auteur : qa
Tour de revue : 1

emulator-5554 (bati-bench, 1080x2400, 420 dpi). `.perf` neuve du working tree, `INTEGRATION` mis à `true` le temps de la build puis remis à `false` (relu : `export const INTEGRATION = false;`). `heavy.sh --gradle gradle-perf.sh` : `BUILD SUCCESSFUL in 1m 15s` (`evidence/T21/build.log`), démons arrêtés par le script, `install -r` : `Success`, « Vider cache images » appuyé. sha256 `f046559495975db2f15a3652848b0a655232a9dd1f63e73cb3975a4d6977c45c`.

Pliable et tablette : bati-fold et bati-tablet ne tournaient pas, et je ne démarre pas d'émulateur. J'ai pris leurs gabarits sur bati-bench avec `wm size` et `wm density` (fold déplié 2076x2152 à 390 dpi, tablette 1600x2560 à 320 dpi, valeurs lues dans leur `config.ini`), puis `wm size reset` et `wm density reset` à la fin. Rotation forcée par `settings put system accelerometer_rotation 0` et `user_rotation 0/1`, remis à `1` et `0` à la fin. Ni charnière ni posture : ce n'est pas un vrai pliable.

## Verdicts
1. **Portrait, téléphone : conforme.** La carte prend l'écran jusqu'au haut de la liste (« Next village tier ») ; nom et infos en surimpression sur le dégradé (`01-tel-portrait.png`).
2. **Paysage, téléphone : conforme sur le fond.** Carte à gauche sur 60 %, nom et liste à droite, barre d'onglets en colonne de 520 dp centrée, libellés à côté des icônes (`02-tel-paysage.png`, `03-tel-paysage-repos.png`). Le haut de l'île passe sous la barre d'état.
3. **Rotation sans saut : non (défaut).** Vu sur 3 films (téléphone deux fois, tablette une fois) :
   - **Aller (portrait vers paysage)** : pendant ~0,4 à 0,55 s, la fenêtre est déjà en paysage mais la mise en page reste celle du portrait : carte étroite (~45 % de la largeur), aucune colonne d'infos, moitié droite noire. Puis la mise en page 4B arrive d'un coup et la vue saute. Pendant ~0,2 s après, les bâtiments manquent (parcelles vides, puis chargement), car la carte s'est remontée et ses images aussi (`index-02-tel.jpg` vers 6,0 s, planche `18-…` pour le retour).
   - **Retour (paysage vers portrait)** : ~0,35 à 0,5 s de portrait avec la carte réduite à une bande en haut, le reste noir. Puis **une image où l'île est collée en bas, sous le titre, devant le ciel et les montagnes, sans forêt ni sol, sans bâtiments, l'écusson vide** (`18-tel-retour-portrait-images.jpg`, image 10,7 s). Enfin la vue définitive.
   - **Même point, même zoom** : gardés à l'aller (téléphone et tablette). Au retour en portrait, gardés sur la tablette (`16-tablette-rotation-planche.jpg`), **perdus sur le téléphone, deux fois sur deux** : le glissé est oublié et la carte revient au cadrage par défaut (`17-tel-bis-rotation-planche.jpg`, `02-tel-avant-rotation.png` contre `02-tel-retour-portrait.png`).
4. **Pincement : non testé.** adb `input` n'envoie qu'un doigt, et Maestro n'a pas de pincement. J'ai remplacé par un double toucher (pris sur la tablette, zoom visible, mais pas sur le téléphone : deux `input tap` à la suite étaient trop lents) et par un glissé (pris partout).
5. **Retour en portrait en quittant l'onglet : oui.** Village en paysage, puis tap sur Home : `ROTATION_0`, Home en portrait (`04-tel-onglet-home-apres-paysage.png`). Quests, Journal et Adventures restent en portrait même avec `user_rotation 1` (`05`, `06`, `07`, `ROTATION_0` relu pour chacun).
6. **Retour en portrait sous un écran poussé : oui.** Village en paysage (`ROTATION_90`, `08-tel-village-paysage-avant-reglages.png`), puis `bati://settings` : Réglages en portrait (`ROTATION_0`, `09-tel-reglages-pousse.png`).
   - Effet de bord sur l'émulateur : le `lockAsync(PORTRAIT_UP)` remet `user_rotation` à 0 quand la rotation auto est coupée. En revenant ensuite sur Village, l'écran reste en portrait (`08a-…`). Avec la rotation auto d'un vrai téléphone, c'est le capteur qui décide : pas jugé ici.
7. **Barre d'onglets de même largeur d'un onglet à l'autre, grand écran : oui.** Sur le pliable, Home commence à x=404 et Journal finit à x=1672 sur les cinq onglets (520 dp à 390 dpi) (`11-fold-barre-onglets.txt`, `11-fold-onglets-planche.jpg`). Sur la tablette, de 280 à 1320 sur les cinq (520 dp à 320 dpi) (`14-tablette-barre-onglets.txt`, `14-tablette-onglets-planche.jpg`). Pas de saut en passant sur Village.
8. **Pliable (gabarit) : conforme.** Déplié (2076x2152, presque carré), la mise en page 4B est prise même en rotation 0 (`10-fold-village.png`). En paysage, même chose (`12-fold-paysage.png`). Le cadrage pose l'île dans la moitié basse de la carte, avec beaucoup de ciel au-dessus : à voir par la revue d'écran.
9. **Tablette (gabarit) : conforme.** En portrait, carte plein écran et liste en dessous, toute la largeur (`13-tablette-portrait.png`). En paysage, 4B (`15-tablette-paysage.png`). Dans la barre, le libellé « Adventures » touche l'icône de Quests.
10. **Alignement 16 Ko : conforme.** 28 `.so` dans l'APK (x86_64 seulement, celle de l'émulateur), 85 segments `LOAD`, tous à `0x4000` (`align-16k.txt`). `expo-screen-orientation` n'apporte aucune `.so` : son code natif est en Kotlin.
11. **Île décollée (L6-T20) :** pas revue à l'entrée dans Prêt (île en place à la première entrée, `evidence/T02b/t2-01-pret-p1.png`). Mais **une image de la même famille à chaque retour en portrait** : île seule en bas, sur le ciel, sans sol ni forêt (verdict 3, `18-tel-retour-portrait-images.jpg` ; même chose à 0,87 s du retour sur la tablette). Les couches du monde ne sont pas peintes à la première image du remontage, l'île l'est déjà.

## Preuves
- `docs/designs/village-iso-v1/evidence/T21/` : captures `01` à `15`, planches `11-fold-onglets-planche.jpg`, `14-tablette-onglets-planche.jpg`, `16-tablette-rotation-planche.jpg`, `17-tel-bis-rotation-planche.jpg`, `18-tel-retour-portrait-images.jpg`, bornes de la barre `11-fold-barre-onglets.txt` et `14-tablette-barre-onglets.txt`, `align-16k.txt`, `apk.sha256`, `build.log`, `films-lien.txt`.
- Films hors dépôt, à 30 i/s : `~/.cache/bati-art-loop/iso/evidence/T21/02-tel-30ips.mp4`, `17-tel-bis-30ips.mp4`, `16-tablette-30ips.mp4`, les index `index-*.jpg` et l'APK `app-release-T21-tour2.apk`.
- Coût FLUX : 0.

## Douteux ou non fait
- Pas de vrai pliable ni de vraie tablette (gabarits par `wm size` sur bati-bench). Pas de charnière, pas de passage plié vers déplié.
- Pas de pincement (verdict 4).
- Pas de séance jouée en paysage. Seuls les quatre autres onglets et les Réglages sont vus en portrait.
- Pas de mesures de trames ni de mémoire : la tâche demandait des captures et des films.
- L'alignement n'est vérifié que sur l'APK x86_64. Les `.so` arm64 du Fairphone viennent des mêmes paquets, mais ne sont pas lues ici.

## Pour la suite
- Pour l'ingénieur :
  - (a) La mise en page en paysage ou en portrait arrive une demi-seconde après la rotation, et la carte se pose deux fois. La disposition attend sans doute `onLayout` de l'aire, alors que `useWindowDimensions` donne déjà la bonne taille.
  - (b) Au retour en portrait sur le téléphone, la vue gardée est remplacée par le cadrage.
  - (c) Le remontage repeint une image sans le sol (île décollée), puis les bâtiments manquent ~0,2 s.
- Après un test en paysage avec la rotation auto coupée, l'émulateur garde `user_rotation 0`, car l'app l'a verrouillé : c'est voulu.

## Tour 4 (carte montée à un seul endroit)

Statut proposé : bloqué (rotation : l'ancienne mise en page reste encore ~0,13 à 0,17 s, la vue saute, et au retour en portrait sur le téléphone l'île seule apparaît encore 4 images ; TalkBack : la liste passe avant le titre dans l'arbre natif)

emulator-5554. `.perf` neuve du working tree (build commune avec T03), `INTEGRATION` mis à `true` le temps de la build puis remis à `false` (relu : `export const INTEGRATION = false;`). `BUILD SUCCESSFUL in 1m 14s`, `install -r` : `Success`, « Vider cache images » appuyé (`evidence/T03/build.log`, sha256 `evidence/T21/apk-tour4.sha256`).

Gestes avant chaque rotation : le flux Maestro `.maestro/iso-rotation-gestes.yaml` fait un double toucher puis un glissé sur la carte. Le pincement reste impossible : `sendevent` sur l'écran tactile est refusé par SELinux (« Permission denied »), et `input` n'envoie qu'un doigt. Rotation par `user_rotation 1` puis `0`, rotation auto coupée, remise à `1` à la fin. Pliable et tablette : gabarits par `wm size` / `wm density` sur bati-bench, comme au tour 1, puis `reset`. Films à 30 i/s, défilement à 60 i/s.

### Verdicts
1. **Téléphone, portrait vers paysage : mieux, pas encore propre.**
   - La fin de l'animation système laisse encore **4 images (~0,13 s, 2,40 à 2,50 s)** de l'ancienne mise en page : carte étroite à gauche, moitié droite noire, barre d'onglets du portrait. Au tour 1, c'était 0,4 à 0,55 s.
   - Puis la mise en page 4B arrive d'un coup et **la vue saute** : l'île change de taille et de place entre 2,50 et 2,53 s.
   - L'écusson est vide sur une image, puis la barre d'onglets passe aux libellés à côté des icônes 0,17 s plus tard.
   - Les bâtiments sont là sur toutes les images.
   - Preuves : `03-tel-aller-planche.jpg`, `03-tel-aller-bande.jpg` (bande à pleine résolution, images 72, 75, 76, 77, 80, 90).
2. **Téléphone, paysage vers portrait : non conforme.**
   - **5 images (~0,17 s) d'ancienne mise en page** : fenêtre en portrait, carte réduite à une bande en haut, le reste noir.
   - Puis **4 images (~0,13 s, 10,83 à 10,93 s) de l'île seule** : l'île est collée en bas sous le titre, devant le ciel et les montagnes, sans sol ni forêt, et l'écusson est vide sur la première. Ses bâtiments sont présents.
   - Enfin la vue définitive, avec un saut.
   - Preuves : `04-tel-retour-planche.jpg`, `04-tel-retour-ile-seule.jpg`.
3. **Vue gardée au retour, téléphone : point gardé, zoom pas gardé.**
   - Avant et après, l'île est au même endroit de l'écran : le meilleur recalage est (0, 0).
   - Mais elle est nettement plus grande après le retour. Le zoom imposé par le cadre du paysage reste en portrait (`02-tel-avant-retour-diff.jpg` : avant, après, différence).
   - Le glissé n'est plus oublié, comme il l'était au tour 1.
4. **Pliable (gabarit 2076x2152) : aller propre, retour avec un flash de la mauvaise mise en page.**
   - 4B dans les deux orientations (`07-fold-village.jpg`).
   - Aller : rien d'anormal après l'animation système.
   - Retour : **4 images (~0,13 s) de la mise en page portrait** (carte plein écran, titre en surimpression, écusson vide), puis 4B (`07-fold-retour-planche.jpg`, `07-fold-avant-paysage-flash-apres.jpg`, troisième vignette).
   - La vue est gardée : recalage à 24 px près, sans différence visible.
5. **Tablette (gabarit 1600x2560) : vue gardée, mais ancienne mise en page et saut.**
   - Vue identique avant et après (résidu 0,31 sur 255, recalage (0, 0)) (`08-tablette-avant-paysage-apres.jpg`).
   - Aller : 4B dès la fin de l'animation, puis un saut de la vue à ~2,5 s (`08-tablette-aller-planche.jpg`).
   - Retour : **5 images de carte en bande** en haut, le reste noir, puis 3 images d'une mise en page portrait intermédiaire (titre plus bas), puis la vue définitive avec un saut (`08-tablette-retour-planche.jpg`).
   - Pas d'île seule sur la tablette.
6. **Bâtiments présents : oui, partout.** Aucune image sans bâtiments ni parcelle vide dans les quatre films. Le remontage du tour 1 a disparu.
7. **Le héros suit la liste sans retard : oui.**
   - Sur 290 positions distinctes à 60 i/s, l'écart entre le haut de l'écusson (dans le héros) et le haut de la carte « Next village tier » (dans la liste) reste de 462 à 464 px, alors que la page bouge de 8 à 10 px par image.
   - Seul l'étirement de bord d'Android, en tirant vers le bas à l'arrêt en haut, écarte la liste de 15 px au plus pendant 0,25 s : le héros ne s'étire pas avec.
   - Preuve : `05-defilement-suivi.txt`.
8. **Glissé sur le titre : il fait défiler la page, avec une image de décalage au départ.** Le titre glissé vers le haut puis vers le bas fait défiler toute la page, héros et liste ensemble. À la première image de chaque glissé (7,567 s et 10,817 s), l'écart passe à 471 puis 454 px : le héros et la liste sont décalés de ~8 px pendant une image (`05-titre-glisse-debut.jpg`, `05-defilement-suivi.txt`). Pas d'élan au lâcher, comme annoncé.
9. **TalkBack en portrait : non vérifié avec TalkBack, et l'arbre natif dit non.**
   - TalkBack est allumé, mais il ne se pilote pas par `emu-adb.sh` : le glissé injecté passe à la carte et la déplace (`06-talkback-glisse-deplace-carte.jpg`), et les raccourcis Alt / Méta + flèche ne déplacent pas le focus.
   - J'ai lu l'ordre de l'arbre d'accessibilité natif (`uiautomator dump`, le même arbre de nœuds que TalkBack parcourt) : `village-scroll`, puis `village-tier` (« NEXT VILLAGE TIER », « tier 1 of 12 »…), et seulement ensuite `village-hero`, `village-title` (écusson, « Isoville », « Hamlet · Level 2 »…), puis les onglets (`06-ordre-accessibilite.txt`).
   - **La liste passe donc avant le titre.** C'est le risque signalé par l'ingénieur : Fabric range les vues par `zIndex`, et le héros tiré au-dessus par `zIndex: 1` / `elevation: 1` passe après la liste.
   - À confirmer par une vraie lecture TalkBack au doigt.
   - TalkBack est coupé à la fin (`enabled_accessibility_services` relu `null`, `accessibility_enabled` 0).

### Preuves
- `docs/designs/village-iso-v1/evidence/T21/tour4/` : captures et planches `01` à `08`, `05-defilement-suivi.txt`, `06-ordre-accessibilite.txt`, `films-lien.txt`. Chaque fichier fait moins de 2 Mo. sha256 : `evidence/T21/apk-tour4.sha256`.
- Films hors dépôt : `~/.cache/bati-art-loop/iso/evidence/T21/tour4/` (`tel-a`, `tel-defile`, `fold-a`, `tab-a`).
- Flux : `.maestro/iso-rotation-gestes.yaml` (nouveau).
- Coût FLUX : 0.

### Douteux ou non fait
- Une seule passe par appareil, pas deux comme au tour 1.
- Pas de pincement (SELinux) : « même zoom » est jugé sur le zoom du cadrage après un double toucher. Sur le téléphone, le double toucher n'a pas changé le zoom de façon visible.
- Ni vrai pliable ni vraie tablette.
- Les images d'ancienne mise en page sont comptées après la fin de l'animation système de rotation, qui dure elle-même ~0,2 s : les images tournées n'y sont pas comptées.
- TalkBack non lu au doigt (verdict 9).
- Constat hors tâche : en portrait, la carte glissée laisse le ciel et les montagnes fixes, donc l'île passe devant les montagnes (`02-tel-avant-rotation.jpg`). Cela relève sans doute de la décision « pas de ciel » (T23).

### Pour l'ingénieur
- (a) La mise en page suit encore la rotation avec ~4 à 5 images de retard, dans les deux sens. Au retour, la fenêtre est déjà en portrait, mais la carte garde une taille de paysage.
- (b) Au retour en portrait sur le téléphone, une étape intermédiaire pose le héros en bas, sous le titre, sans sol : c'est l'île seule, 4 images. Sur le pliable, la même étape montre la mise en page portrait 4 images avant 4B.
- (c) Le zoom monté par le paysage reste au retour en portrait sur le téléphone. Le point est gardé.
- (d) L'ordre d'accessibilité met la liste avant le titre.
- (e) Une image de décalage au premier glissé du titre.
