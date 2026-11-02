# L6-T20-qa : mémoire du monde et corrections, sur émulateur

Statut proposé : prêt pour revue (cible PSS de l'onglet Village non atteinte, voir verdict 1)
Auteur : qa
Tour de revue : 1

emulator-5554 (bati-bench), `.perf` neuf du HEAD 4ae22b40, arbre de l'app propre (`git status` : rien hors docs et `scripts/iso/team/`). `heavy.sh --gradle gradle-perf.sh` : BUILD SUCCESSFUL in 1m 14s (`evidence/L6-T20/build.log`), démons arrêtés, `install -r` Success. Onglet Village : « Vider cache images », force-stop, relance, puis mesure.

## Verdicts
1. **Mémoire (dumpsys meminfo, 3 passes à 10 s, repos).**
   - Carte seule palier 12 : PSS 254 997 / 251 477 / 251 441 Ko, Native 117 336 / 117 044 / 117 044. L6-T17 : 353 859 et 186 120. **-100 Mo de PSS, -69 Mo de Native** : le bornage du monde marche là où il y avait le plus de cellules.
   - Onglet Village palier 1 : PSS 278 745 / 278 815 / 278 456 Ko, Native 138 388 / 138 576 / 138 428. L6-T17 : 268 085 et 132 664. **Pas de baisse (+10 Mo, dans le bruit d'un démarrage), cible de 222 Mo non atteinte.** 15 nœuds `iso-monde-foret` dans l'arbre (`ui-village-p1.xml`).
   - Le chiffre de référence est douteux : le fichier brut de L6-T10, `evidence/L6-T10/meminfo-village.txt`, dit **264 302 Ko** (Native 129 936), pas les 221 744 écrits dans `reports/L6-T10-qa.md`. Par rapport à ce fichier, l'écart est de +14 Mo, pas de +46. Les 222 Mo ne sont prouvés par aucun fichier : la cible est à revoir avant de chercher plus loin.
   - Graphics : 0 sur l'émulateur, donc sans valeur (à lire sur le Fairphone).
2. **Sentiers de porte sur les parcelles : oui.** Au palier 1 (onglet) et au palier 12 (bouton 0,6), les sentiers vont jusqu'aux socles et passent par-dessus la terre brune, aucun n'est coupé (`20-sentiers-parcelles.jpg`).
3. **Zoom mini : répétition encore visible, plus faible.** Les plaques claires ovales sont toujours là, en deux rangées sur la largeur de l'écran, moins alignées qu'en T17 (`03-zoom-min.png`, `03b-zoom-min-foret.png`, contre `evidence/L6-T17/zoom-min-et-max.jpg`).
4. **Zoom max : net sur les bâtiments, les sentiers et les personnages** (18 appuis sur +, `04-zoom-max.png`). Pas pire qu'en T17.
5. **Texte de debug en haut : parti.** Aucun texte « forge 187x280 … » sur toutes les captures, `Sondes : non` par défaut (`01`, `02`, `03`).
6. **Bouton 0,6 : il zoome (au lieu de dézoomer) depuis le cadrage du palier 12**, comme le dit le rapport L6-T20 (`05-bouton-06.png`). Conforme à ce rapport. À Guillaume de dire si c'est le comportement attendu.
7. **Mode Prêt : marteau, lueur et scène vus.** Bâtiment prêt : `campfire`. Le marteau (`iso-marteau-campfire`) flotte au-dessus du feu, sur le toit de la tente (`06b-pret-marteau-x3.png`). La lueur jaune pulse autour du feu (`13-pret-scene-feu-2ips.jpg`). Au toucher, la caméra se recentre sur le feu, marteau et lueur disparaissent, un plan bleu du stade s'affiche environ 1 s, puis vient le nouveau stade (trépied, chaudron), qui reste (`17-pret-toucher-plein-1ips.jpg`, `18-pret-scene-detail-4ips.jpg`).
   - **Défaut vu une fois** : à la première entrée dans Prêt, l'île est montée au-dessus des montagnes, détachée de la forêt et du sol. C'était avant tout toucher, et l'île y est restée (`11-pret-sequence.png`, première image de la vidéo `pret-scene.mp4`). Mes deux premiers touchers sont tombés dans le vide à cause de ça. Pas reproduit à la deuxième entrée : l'île est restée en place pendant 40 s (`19-pret-reentree-planche.png`). Cause inconnue, peut-être un deuxième `onLayout` de `iso-pret-aire` ou de la caméra dans `PretDemo`.

## Preuves
- `docs/designs/village-iso-v1/evidence/L6-T20/` : `build.log`, `meminfo-village-p1-{1,2,3}.txt`, `meminfo-carte12-{1,2,3}.txt`, captures `00` à `20`, arbres `ui-village-p1.xml`, `ui-pret.xml`, `ui-pret-2.xml`.
- Vidéos (plus de 2 Mo) : `~/.cache/bati-art-loop/iso/evidence/L6-T20/pret-scene.mp4` (île décalée, toucher raté), `pret-scene-2.mp4` (toucher raté), `pret-scene-3.mp4` (scène jouée).
- Coût FLUX : 0.

## Douteux ou non fait
- Pas de témoin (onglet Village actuel) ni de passes en trames (`gfxinfo`) : la tâche ne demandait que le PSS.
- La lueur au repos est une animation permanente tant qu'un bâtiment est prêt : voulu par la conception, mais ça compte pour la règle « rien d'animé au repos ».

## Pour la suite
- Avant de toucher au monde de l'onglet : remesurer le PSS du Village actuel (témoin) et de l'onglet iso dans un même démarrage, pour fixer une vraie cible au lieu des 222 Mo sans preuve.
- Défaut de Prêt à surveiller : l'île peut se détacher du monde à la première entrée.
