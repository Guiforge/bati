# T03-qa : gestes de travail, bannières, or au dernier stade, sur émulateur

Statut proposé : prêt pour revue (avec une réserve : la croissance vers un dernier stade à bannière n'a pas pu être jouée, voir verdict 4)
Auteur : qa
Tour de revue : 1

emulator-5554 (bati-bench, 1080x2400, 420 dpi). `.perf` neuve du working tree, `INTEGRATION` mis à `true` le temps de la build puis remis à `false` (relu : `export const INTEGRATION = false;`). `heavy.sh --gradle gradle-perf.sh` : `BUILD SUCCESSFUL in 1m 14s`, `:app:createBundleReleaseJsAndAssets` exécuté (`evidence/T03/build.log`), démons arrêtés par le script. `install -r` : `Success`. Bouton « Vider cache images » appuyé, puis force-stop. sha256 `evidence/T03/apk.sha256`. Même build que T21 tour 4.

## Verdicts
1. **Palier 12 : conforme.** Dans `bati://dev-iso`, Carte seule, palier 12 (21 terrains), zoom `+` deux fois :
   - une bannière (tissu sang de bœuf, liseré d'or) sur chaque bâtiment au dernier stade, plantée au sommet de la peinture, pas au haut du canevas : sur la coupole de l'observatoire, le linteau du cercle de pierres, la flèche de la tour, le toit de la salle des héros (`01-palier12-zoom.jpg`, `02-palier12-detail-centre.jpg`, `02-palier12-detail-droite.jpg`) ;
   - une étoile d'or sur chaque pommeau ;
   - des fenêtres chaudes sur la ferme, l'observatoire, la tour de guet et la salle des héros ;
   - le feu de camp n'a pas de bannière.
   - Un doute, sur la forge : une des fenêtres chaudes est posée sur l'appentis de l'enclume, hors d'un mur (`02-fenetres-salle-heros-forge-zoom.jpg`, à droite). Les points orange autour de la salle des héros sont des feuilles au sol, pas des fenêtres.
2. **Un toucher lance une vague : conforme.**
   - **Étoiles.** Après un tap à vide, exactement 2 étoiles scintillent, celles du mannequin et de la tente : elles grandissent puis reviennent toutes les ~2,5 s. Les 23 autres restent fixes. J'ai compté les pixels `isoEclat` par case de 40 px (`03-etoiles-serie.txt`) : seules ces deux cases varient en cycle, les trois autres cases qui bougent sont les flammes du feu et de la forge. Planche : `03-vague-etoiles-planche.jpg`.
   - **Gestes, 3 rôles vus**, au zoom `+` x5 (`04-gestes-planche.png`, une ligne par rôle, une image toutes les 0,1 à 0,2 s) :
     - le fermier arrive, puis se penche nettement en avant pendant ~0,4 s avant de se redresser (bêcher) ;
     - le ménestrel se balance à gauche puis à droite à plusieurs arrêts (danse) ;
     - le sage s'incline légèrement à ~1,8 s de son arrivée (hochement), un geste discret.
     - Le guetteur arrive sans geste visible à cette échelle. Le forgeron et l'herboriste ne sont pas arrivés à un lieu pendant mes trois vagues, donc pas jugés.
   - Aucun saut de position à la fin d'un geste.
   - Une passe `gfxinfo` pendant la vague, film en cours : 902 trames, 3 en retard (`Janky frames: 3 (0.33%)`, `Number Frame deadline missed: 3`), p50 25 ms, p99 31 ms (`03-vague-gfx.txt`). Après la vague, 10 s de repos : 0 trame.
3. **Mouvement réduit : conforme.**
   - Transition, animateur et fenêtre mis à 0 (relus : 0), force-stop, réouverture, puis un tap à vide : 0 trame rendue sur ~15 s (`05-reduit-gfx.txt`, `Total frames rendered: 0`).
   - Aucune différence entre les captures à t+1,2 s et t+5 s.
   - Bannières et étoiles présentes, fixes (`05-reduit-apres-tap.jpg`).
   - Les trois valeurs sont remises à 1, relues à 1.
4. **Croissance vers le dernier stade (bannière qui entre avec le fondu) : non vérifiée.** Aucune entrée de dev-iso ne la produit :
   - PretDemo rejoue toujours le feu de camp, quel que soit le palier ou le nombre de « Rejouer ». `croissanceDemo` prend le premier bâtiment construit, et le feu de camp est dans `SANS_BANNIERE`.
   - « Grandir » (mode Onglet Village) part du village réel du héros, au palier 1, où aucun bâtiment n'est au dernier stade : après le tap, aucun nœud `iso-banniere-*` (`10-grandir-village-heros.jpg`).
   - Il faudrait un choix du bâtiment dans PretDemo, ou un palier où un autre bâtiment est le premier construit.
5. **PretDemo palier 1, normal : conforme.**
   - Le marteau est sur le montant droit du feu de camp, plus sur la tente (`06-pret-p1-avant.jpg`).
   - Au tap, l'échafaudage remplace l'ancien stade sans image vide.
   - Un ouvrier en entier devant le montant gauche, rien de caché derrière (`06-pret-echafaudage-zoom.jpg`).
   - Fondu de l'échafaudage vers le nouveau stade vers 3,6 s : l'échafaudage reste par-dessus pendant que le nouveau stade apparaît, sans image nue (`06-pret-normal-planche.jpg`, `06-pret-normal-fondu.jpg`, à 30 i/s).
   - L'ouvrier ne bouge plus après la fin. Marteau et lueur partent avec la scène.
6. **PretDemo, tap qui passe : conforme.** Un second tap 1 s après le premier passe à ~2,6 s au lieu de ~3,6 s. L'échafaudage reste pendant le fondu du nouveau stade, sans image de parcelle nue (`07-pret-passe-planche.jpg`, 30 i/s). Le défaut d'une image du tour 2 de T02b est corrigé.
7. **PretDemo en Neuf : presque conforme, une image nue.**
   - Échafaudage et tas de pierres en place pendant la caméra.
   - Ouvriers devant, fondu propre, pareil quand un tap passe la scène (`09-pret-neuf-passe-planche.jpg`).
   - **Mais** au tap, sur une image (≈33 ms, image 44 du film à 30 i/s, 1,47 s), l'ancien stade a disparu et l'échafaudage n'est pas encore là : on ne voit que le tas de pierres sur la terre (`08-pret-neuf-image-nue.jpg`). Vu 2 fois sur 2 (`08` et `09`). Les 0,55 s de parcelle vide du tour précédent sont devenus une image.

Pour le lancement de la scène, j'ai dû viser la base du feu de camp par son nœud `iso-socle-campfire`, lu dans le dump. Après une scène, la caméra reste zoomée et un point fixe tombe à côté : ce n'est pas un défaut.

## Preuves
- `docs/designs/village-iso-v1/evidence/T03/` :
  - captures et planches `01` à `10` ;
  - `03-etoiles-serie.txt`, `03-vague-gfx.txt`, `05-reduit-gfx.txt` ;
  - `apk.sha256`, `build.log`, `films-lien.txt`.
  - Tous les fichiers font moins de 2 Mo (le plus gros : 1,34 Mo).
- Films hors dépôt : `~/.cache/bati-art-loop/iso/evidence/T03/` (`03` à `09` `*-brut.mp4`, APK `app-release-T03-T21t4.apk`).
- Coût FLUX : 0.

## Douteux ou non fait
- Verdict 4 : la croissance vers un dernier stade à bannière n'a pas été jouée. Je n'ai donc pas vu si la bannière et les fenêtres entrent avec le fondu.
- Gestes : 3 rôles sur 7 vus au travail. La lisibilité est jugée sur des crops à x5 de zoom. Au cadrage normal, les figures font ~30 px : le penché du fermier se lit, le hochement du sage à peine.
- Pas de 3 passes ni de témoin : une seule passe pendant une vague, film en cours. Les mesures de perf sont suspendues par Guillaume (DECISIONS 29/10).
- Pas de bâtiment « prêt » déjà au dernier stade, donc pas vu le cas du marteau qui cache l'étoile.

## Pour la suite
- Pour l'ingénieur :
  - (a) l'image nue de Neuf au tap, verdict 7 ;
  - (b) une fenêtre chaude hors mur sur la forge, verdict 1 ;
  - (c) une entrée de PretDemo qui fait pousser un bâtiment à bannière, pour voir le verdict 4.
- Méthodes réutilisables : `dump.sh`, `scene.sh`, `scenesheet.py` et `activite.py`, dans le scratchpad de la session (non versionnés). Les vagues bloquent `uiautomator dump` : on lit les positions des villageois juste après une vague.

## Tour 3 (30/10)

Statut proposé : bloqué (une image de parcelle nue sous l'échafaudage, quand la bannière entre, en mode normal)

`.perf` neuve du working tree du 30/10 (sha256 dans `evidence/T03/apk.sha256`, la même que pour T23, T22, T14 et T16). `INTEGRATION` a été allumé le temps de la build puis remis à `false` (relu), et le cache d'images vidé. `bati://dev-iso`, palier 1, mode Prêt. Films à 30 i/s, hors dépôt.

1. **Bouton « Bannière » : la bannière entre bien avec le fondu.**
   - Bannière allumée : le bâtiment prêt est la tente au stade solid, avec son marteau et sans bannière (`t3-01-banniere-avant.jpg`).
   - Au tap, l'échafaudage monte. La bannière apparaît à 4,47 s en transparence, avec le nouveau stade (grand), puis devient pleine à 4,60 s. Elle n'arrive ni avant le fondu ni d'un coup après (`t3-03-banniere-fondu-planche.jpg`, une image sur deux de 4,20 à 4,97 s).
2. **Mais une image nue, 2 fois sur 2.** Juste avant le fondu, sur une image (≈33 ms : n=132 à 4,40 s dans les deux films), l'ancien stade a disparu et le nouveau n'est pas encore là. On ne voit que l'échafaudage sur la parcelle de terre ocre (`t3-04-normal-image-132-136.jpg`, `t3-08-banniere-2-image-nue.jpg`). C'est le mode normal, pas Neuf. Au tour 1, le mode normal du feu de camp n'en avait pas : c'est peut-être la première peinture de `tent_grand`, qui n'est pas encore décodée au moment où l'ancienne image disparaît.
3. **Mode Neuf (feu de camp, Bannière éteinte) : plus d'image nue au tap, 2 fois sur 2.**
   - L'échafaudage apparaît par-dessus l'ancien stade, qui reste visible dessous pendant 4 images (≈130 ms).
   - Ensuite, il ne reste que l'échafaudage sur le tas de pierres. Aucune image ne montre l'ancien stade parti sans échafaudage (`t3-06-neuf-tap-planche.jpg`, `t3-07-neuf-tap-2-planche.jpg`, image par image). Le défaut du verdict 7 du tour 1 est corrigé.

Preuves : `docs/designs/village-iso-v1/evidence/T03/t3-00` à `t3-08`, `films-lien.txt`. Films hors dépôt : `~/.cache/bati-art-loop/iso/evidence/T03/` (`t3-banniere.mp4`, `t3-banniere-2.mp4`, `t3-neuf-1.mp4`, `t3-neuf-2.mp4`). Coût FLUX : 0.

Non fait : le « tap qui passe » avec Bannière ; le marteau qui cache l'étoile (aucun bâtiment prêt déjà au dernier stade).

Pour l'ingénieur : l'image nue du point 2. Le délai de 120 ms (`ECHAFAUDAGE_APRES_MS`) couvre le cas Neuf. En mode normal, c'est l'ancien stade qui disparaît une image avant que le nouveau soit peint.
