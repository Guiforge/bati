# T02b-qa : chantier, finitions vues à l'écran (émulateur)

Statut proposé : prêt pour revue au tour 2 (la scène finit seule, cas neuf vu) ; deux petits défauts, voir « Tour 2 »
Auteur : qa
Tour de revue : 2

emulator-5554 (bati-bench). `.perf` neuve du working tree au 30/10 15:3x (contient aussi T21, non jugé ici) : `heavy.sh --gradle gradle-perf.sh`, `BUILD SUCCESSFUL in 2m 24s` (`evidence/T02b/build.log`), démons arrêtés, `install -r` : `Success`, « Vider cache images » appuyé. APK gardée pour T21 : `~/.cache/bati-art-loop/iso/evidence/T02b/app-release-T02b-T21.apk` (sha256 dans `evidence/T02b/apk.sha256`).

## Verdicts
1. **Scène bloquée sur l'échafaudage : défaut.** Cas (b), PretDemo palier 1, bâtiment prêt = feu de camp. Après le tap, l'échafaudage apparaît (étape 1) et n'est jamais retiré : encore là à 8 s et à 11,5 s du film (`ancien2`), et plus de 30 s après sur la première passe (`02-ancien-bloque-t30s.png`, 0 trame rendue en 5 s : tout est figé). Vu 2 fois sur 2. Le nouveau stade n'arrive qu'au tap. Logcat : aucune erreur JS ni Reanimated. Piste pour l'ingénieur : le minuteur de l'étape 2 de `IsoVillage` (`CROISSANCE_CAMERA_MS + duree`) ne passe pas ou est effacé ; en L6-T20-qa la même scène allait jusqu'au nouveau stade. L'arbre contient T21 (`useCameraIso`, `memoire`), donc la cause peut venir de T02b ou de T21.
2. **Ancien stade sous l'échafaudage : oui.** Les piliers bleus et le feu du stade d'avant se voient à travers les montants (`planche-ancien-6.jpg`, image 2).
3. **Volutes encrées et éclat de pierres : oui, et une bouffée par coup.** Trois bouffées brunes cerclées d'encre avec trois éclats, au pied du site, à 0,52, 0,92 et 1,32 s après l'apparition de l'échafaudage, chacune éteinte avant la suivante (images 3 et 4). Elles ne ressemblent plus à des bulles.
4. **Coups des ouvriers : peu lisibles.** Au zoom de la scène, l'ouvrier de gauche est caché par un montant ; la bascule de celui en rouge, à droite, est à peine perceptible image par image à 30 i/s. Sans la bouffée, on ne verrait pas de coup. Ouvrier qui se redresse : non vérifiable, la scène ne se termine pas.
5. **3 s au plus : non vérifiable** (verdict 1). Échafaudage à t+~0,5 s du tap, bouffées dans les 1,5 s du chantier, puis rien.
6. **Tap pour passer : oui.** Un tap sur la scène bloquée montre aussitôt le nouveau stade (trépied, chaudron, piliers de pierre) ; rien ne reste (`03-ancien-apres-tap.png`, image 6).
7. **Mouvement réduit (transition, animateur et fenêtre à 0, remis à 1 et relus) : pas d'échafaudage, ni ouvriers en scène, ni poussière.** Le nouveau stade s'affiche d'un coup, sans fondu visible (3 trames rendues, `reduit-gfx.txt`, `06-reduit-avant.png`, `07-reduit-apres.png`). Avec l'animateur à 0, un fondu ne pourrait de toute façon pas se voir sur l'émulateur.
8. **Cas (a), bâtiment neuf et tas de pierres : non fait.** Aucun chemin ne l'atteint sur la `.perf` sans toucher à la base. Le bouton Grandir de l'onglet ne joue plus rien (stades déjà réclamés, `claimable` exclut un niveau 0 : film `onglet-grandir-rien`). PretDemo met tout au niveau 9 et trouve toujours un bâtiment à ancien stade (feu de camp au palier 1). Deux séances réelles jouées (`maestro-sessions.log`, flux `.maestro/iso-perf-sessions.yaml`) n'ont fait naître aucun bâtiment (`05-onglet-apres-seances.png`). Le tas n'est vérifié que par jest.

## Preuves
- `docs/designs/village-iso-v1/evidence/T02b/` : `planche-ancien-6.jpg` (planche de 6 images, cas b), captures `00` à `07`, `ancien2-gfx.txt` (12 s, scène bloquée comprise : `Total frames rendered: 721`, `Janky frames: 1 (0.14%)`, `Number Frame deadline missed: 1`), `reduit-gfx.txt` (`Total frames rendered: 3`, `Janky frames: 3 (100.00%)`, `Number Frame deadline missed: 3`), `build.log`, `apk.sha256`, `maestro-sessions.log`, `films-lien.txt`.
- Films à 30 i/s, hors dépôt : `~/.cache/bati-art-loop/iso/evidence/T02b/ancien2-30ips.mp4`, `ancien-30ips.mp4`, `reduit-30ips.mp4`, `onglet-grandir-rien-30ips.mp4` (brutes à cadence variable à côté).
- Coût FLUX : 0.

## Douteux ou non fait
- Pas de passes de mesure (3 passes, témoin, mémoire) : la tâche demandait le film et la planche. Les chiffres de trames ci-dessus sont une seule passe chacun.
- Mouvement réduit : seul l'état final est vérifiable ; la présence d'un fondu ne l'est pas.
- Le blocage n'est vu que dans PretDemo ; l'onglet ne permet pas de jouer une scène (verdict 8).

## Pour la suite
- Pour l'ingénieur : corriger le verdict 1, puis donner à qa un moyen de jouer un bâtiment neuf (par exemple un mode de PretDemo avec `oldLevel` 0), sans quoi le cas (a) reste invérifiable sur appareil.
- Dans PretDemo, après « Rejouer », la caméra reste zoomée sur le site : le feu de camp se touche à (537, 1290) et non plus à (640, 1365).
- Le marteau du feu de camp flotte sur le toit de la tente : un tap sur la tente ne joue rien.

## Tour 2 (30/10, après la correction d'IsoVillage)

emulator-5554 (bati-bench). `.perf` neuve du working tree, `INTEGRATION` mis à `true` le temps de la build puis remis à `false` (`constants/isoPoc.ts` relu : `false`). `heavy.sh --gradle gradle-perf.sh` : `BUILD SUCCESSFUL in 1m 15s` (`evidence/T21/build.log`, build commune avec T21), démons arrêtés par le script, `install -r` : `Success`, « Vider cache images » appuyé. sha256 `f046559495975db2f15a3652848b0a655232a9dd1f63e73cb3975a4d6977c45c` (`evidence/T21/apk.sha256`). PretDemo, palier 1, bâtiment prêt : feu de camp (`t2-01-pret-p1.png`, île en place, à la première entrée comme aux suivantes).

### Verdicts
1. **La scène finit seule : oui, en moins de 3 s.** Mode normal (`t2-ancien`) : le tap part à ~1,2 s du film ; caméra de 1,43 à 1,93 s, échafaudage de 1,93 à 3,53 s, fondu vers le nouveau stade de 3,57 à ~3,9 s, puis plus rien ne change hors des marcheurs (différence image à image sur 30 i/s). Du tap à la fin : environ 2,5 à 2,7 s. Mode Neuf (`t2-neuf`) : 1,43 à ~3,7 s, environ 2,3 à 2,5 s. Le marteau et la lueur partent avec la scène (`t2-02-ancien-fin.png`). Le blocage du tour 1 est corrigé, vu 3 fois sur 3 (normal, Rejouer, Neuf).
2. **Ancien stade sous l'échafaudage : oui.** Le cercle de pierres et la flamme du feu de camp se voient entre les montants (`t2-planche-ancien-6.jpg`, images 2 à 5). Ils restent pâlis par la lueur jaune du bâtiment prêt, qui ne part qu'au fondu final.
3. **Tas de pierres en mode Neuf : oui.** Pierres hexagonales sombres sur terre battue sous l'échafaudage, de 2,03 à 3,45 s, parties avec lui (`t2-planche-neuf-6.jpg`, images 2 à 5).
4. **Ouvriers devant les montants : en partie.** L'ouvrier en rouge est devant, à gauche du site en mode normal et à droite en Neuf, entier et lisible. Le second (beige) reste collé au montant gauche et à l'échelle, à moitié caché. Les deux autres silhouettes brunes à gauche sont des villageois et ne frappent pas.
5. **Coups lisibles : oui, pour l'ouvrier en rouge.** Il penche nettement en arrière puis bascule, visible image par image (`zoom-t2-ancien.jpg`, `t2-planche-ancien-6.jpg` images 2 et 4). Le beige bouge aussi, mais on le voit mal derrière le montant.
6. **Une volute par coup : oui.** Trois bouffées encrées avec éclat de pierres, à 2,43, 2,83 et 3,23 s (mode normal), et à 2,45, 2,85 et 3,25 s (Neuf). Chacune est éteinte avant la suivante, et aucune n'apparaît hors d'un coup.
7. **Ouvrier qui se redresse : oui.** Après la troisième bouffée, l'ouvrier rouge est droit dès 3,4 s et le reste jusqu'au fondu (`t2-planche-ancien-6.jpg` image 5, `t2-planche-neuf-6.jpg` image 5).
8. **Tap qui passe : oui, avec un défaut d'une image.** Un second tap 1 s après le premier saute au nouveau stade (`t2-passer`). Mais pendant une image (~33 ms à 30 i/s), le site est une parcelle de terre nue, sans ancien ni nouveau stade, avant le fondu du nouveau (`zoom-t2-passer.jpg`, image 0,300). En mode Neuf, sans tap, la même parcelle nue apparaît aussi entre le retrait de l'échafaudage et le fondu (une image à 3,47 s), ce qui se lit comme le début du fondu.
9. **Mode Neuf, 0,55 s de terre nue avant l'échafaudage.** Le stade 9 que PretDemo affiche avant le tap disparaît dès le tap (1,43 s), et l'échafaudage n'arrive qu'à 2,03 s. Pendant l'étape caméra, on voit une parcelle vide. Dans l'onglet, un bâtiment neuf n'est pas affiché avant sa scène, donc c'est peut-être un artefact de la démo. À trancher par l'ingénieur.

### Mesures (une passe par film, pas le protocole complet)
- `t2-ancien-gfx.txt` (8 s, scène comprise) : `Total frames rendered: 414`, `Janky frames: 2 (0.48%)`, `Number Frame deadline missed: 2`.
- `t2-neuf-gfx.txt` (8 s) : `Total frames rendered: 414`, `Janky frames: 1 (0.24%)`, `Number Frame deadline missed: 1`.

### Preuves du tour 2
- `docs/designs/village-iso-v1/evidence/T02b/` : `t2-planche-ancien-6.jpg`, `t2-planche-neuf-6.jpg` (planches de 6 images), `t2-00` à `t2-04` (captures : dev-iso, PretDemo avant le tap, fin de scène, avant Rejouer, Neuf avant le tap), `t2-ancien-gfx.txt`, `t2-neuf-gfx.txt`, `films-lien.txt` (complété).
- Films hors dépôt : `~/.cache/bati-art-loop/iso/evidence/T02b/t2-ancien-30ips.mp4`, `t2-passer-30ips.mp4`, `t2-neuf-30ips.mp4`, et les planches de lecture `index-t2-*.jpg` et `zoom-t2-*.jpg`.
- Coût FLUX : 0.

### Non fait au tour 2
- Mouvement réduit : pas refait (vu au tour 1, rien n'a changé dans ce chemin d'après T02b.md).
- Le marteau du feu de camp flotte toujours sur le toit de la tente (`t2-03-rejouer-avant.png`), comme au tour 1.
- Après la scène, les ouvriers se replacent d'un coup (le rouge passe de gauche à droite du site, `t2-planche-ancien-6.jpg` image 6) : un saut, pas un pas.
