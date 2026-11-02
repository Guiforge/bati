# qa-audit2 : build .perf au HEAD 8b6b813f, vérification des corrections après qa-audit1

Statut proposé : prêt pour revue (je ne juge pas le goût)
Auteur : qa
Tour de revue : 1

## Fait
- Caches vidés avant build : `$TMPDIR/metro-cache` (absent), `android/app/build/generated/{assets,res}`, `intermediates/{assets,compressed_assets,merged_res,packaged_res}`. `heavy.sh --gradle gradle-perf.sh` : BUILD SUCCESSFUL en 2 min 37 (evidence/qa-audit2/build.log). `android/gradlew -p android --stop` : « No Gradle daemons are running » (le script les avait arrêtés).
- `install -r` : lastUpdateTime 19:58:46, firstInstallTime 29/10 inchangé (rien désinstallé, données gardées).
- Cache d'images : `bati://dev-iso`, « Onglet Village », « Vider cache images », `am force-stop`, réouverture (00-village-mode.png, 01-apres-cache.png).
- Porte « sprite de HEAD » : OK. `02-zoom-sprite.png` (zoom 1) : le dôme fendu à lucarne de l'observatoire correspond à `assets/images/village/iso/observatory/solid.nuit.webp` (relu fichier contre capture).
- Émulateur : réglages non touchés, jamais arrêté. Fairphone non touché. Heure du téléphone/émulateur synchrone avec l'hôte (écart < 1 s).
- Les scripts de la session sont dans le scratchpad (non versionnés). Gros films (> 2 Mo) : `~/.cache/bati-art-loop/iso/evidence/qa-audit2/` (`z1d.mp4` 139 s, `z1e.mp4` 171 s, `fumee.mp4` 36 s, `grandir1.mp4`, `revelation.mp4`, `chantier.mp4`) et `…/raw/` (grandes captures).

## 1. Ombre de l'île : plus de coupure droite aux raccords (OK, une réserve)
- Même cadrage qu'avant impossible : les nouvelles bornes de caméra empêchent d'aller aussi loin vers le sud-ouest (la vue de `d-jour-bord-so-1` d'audit1 n'est plus atteignable). Cadrage le plus proche : bord sud-ouest à zoom 1, tous debout : `d-jour-bord-so-1/2/3.png` (jour), `d-nuit-bord-so-1.png` (nuit), gros plans `ombre-coupure-jour.png`, `ombre-coupure-nuit.png`.
- Résultat : la bande brune de la rive et son ombre sont continues, sans rectangle à bord droit ni trait bleu sous la rive, de jour comme de nuit. Les quatre coins à zoom 0,6 de jour et de nuit (`c9-*`, `planche-c9-*`) ne montrent pas de coupure non plus.
- Réserve : le bord sud-est (`c9-jour-sud-est.png`, gros plan `defaut-se-bord-droit-jour.png`) est une arête droite sans rive brune, ton plus clair au-dessus et plus sombre au-dessous, avec deux petits crans verticaux aux raccords (environ x 785 et x 400 du gros plan). La même arête droite existait en audit1 (`d-jour-bord-se-1.png`) ; je ne sais pas si elle est voulue (côté sans rive) : à trancher.

## 2. Caméra : bornes (OK)
- 9 glissés de 800 px vers chaque coin à zoom 0,6, jour et nuit : `c9-{jour,nuit}-{nord-ouest,nord-est,sud-est,sud-ouest}.png`, planches `planche-c9-jour.png`, `planche-c9-nuit.png`. À chaque coin, des bâtiments et de la terre de l'île restent à l'écran (un quart à la moitié du cadre, le reste en herbe).
- Puis 6 appuis sur « - » (zoom mini) depuis chaque coin : `c9-mini-*`, `planche-c9-mini-{jour,nuit}.png` : l'île entière est à l'écran, entourée d'herbe et de forêt, décalée vers un bord au pire.
- Bornes trop serrées ? Non, plutôt larges : au coin nord-ouest et sud-est de zoom 0,6, les deux tiers du cadre ne montrent que de l'herbe. Elles ne gênent aucun cadrage ; en revanche elles interdisent le cadrage de bord d'audit1.

## 3. Caméra qui bouge seule (non reproduit)
Protocole : toucher, captures à +0, 1, 3, 5, 6, 7, 8, 10 s, différence moyenne de la zone carte entre captures successives, `logcat -s ReactNativeJS` vidé avant le toucher et lu à +10 s.
| Mode | Toucher | Lecture |
| --- | --- | --- |
| Carte (zoom 1, toucher sur le moulin) | 20:03:59 | rien ne bouge : différences 0,12 à 0,44 (animations seules) ; logcat : 0 ligne. `planche-saut-carte.png` |
| Prêt (toucher du bâtiment prêt, le feu de camp) | 20:04:42 | la caméra vole vers le bâtiment entre +1 s et +3 s (différence 28 : la scène de révélation, voulue) ; ensuite immobile : 0,07 à 0,5 à +5…+10 s ; aucun saut vers +6 s ; logcat : 0 ligne. `planche-saut-pret.png` |
| Onglet (toucher de la forge) | 20:05:28 | une bulle « Forge » s'ouvre entre +1 s et +3 s (différence 12,75), la carte ne bouge pas ; +5…+10 s : 0,02 à 0,05 ; logcat : 0 ligne. `planche-saut-onglet.png` |
Dans les trois cas, rien ne part vers +6 s ni ailleurs. Je n'ai pas rejoué l'enchaînement de boutons en moins de 5 s après l'ouverture, qui avait donné les sauts d'audit1.

## 4. Effets de dernier stade au zoom 1, de nuit, pendant les vagues (PARTIEL, défaut probable)
Films `z1d.mp4` (9 vagues, 20:08:30 à 20:10:45) et `z1e.mp4` (11 vagues, 20:15:15 à 20:17:45), toucher de la carte au début de chaque fenêtre de 15 s, ensembles d'effets prédits par un port de `effetsDeVague`. Images de contrôle à 0,7 à 1 s d'écart.
- Jet de la fontaine : VU (fenêtre 20:15:15, `planche-fontaine-jet.png`, 5,5 à 7,2 s du film z1e) : un jet bleu qui monte de la colonne du bassin jusqu'à la lanterne, retombe en arcs, avec gouttes bleues, crème et dorée ; durée ≈ 2 s. Pas vu dans la fenêtre 20:08:45 pourtant prédite « observatoire + fontaine ».
- Orbe sur la flèche de la tour du mage : NON VU, dans 4 fenêtres prédites (20:09:45, 20:10:30, 20:16:30, 20:17:00 ; `planche-tour-vague-17h00.png`) : la flèche est nue.
- Faisceau de l'observatoire : NON VU (fenêtres 20:08:45, 20:09:15, 20:09:45 ; `planche-observatoire-vague-08h45.png`) : aucun faisceau ni étoile dorée sur le dôme. Seuls de petits points bleus et, une fois, verts flottent à gauche du dôme (vers 20:08:51 et 20:21:22), sans bâtiment dessous visible : je ne sais pas qui les émet.
- Yeux du dragon : NON VUS (fenêtres 20:10:30, 20:17:00, planches `planche-repaire-vague-10h30.png`, `planche-repaire-vague-17h00.png`) : la gueule reste fixe, ni braise ni yeux ni cendre.
Je ne peux pas dire si le défaut est la rotation du siège « signal » qui ne tombe pas sur ces fenêtres, ou un effet qui ne joue pas : à rejouer avec les ensembles réels (le dev peut lire `effetsDeVague` dans le journal). Aucune de ces trois formes n'est donc jugée.

## 5. Fumée, 30 s en vague (vu de loin, peu lisible)
`fumee.mp4` (20:21:12, deux vagues, zoom 1 décalé vers les cheminées), `planche-fumee.png` (gros plan 0,5 s) et `planche-fumee-vue.png`.
- Bouffées petites, pâles, grises, à peine visibles ; une bouffée par cheminée toutes les 3 à 4 s environ (par exemple cheminée au-dessus de l'atelier : 6 s, 14 s, 17 s du film). Montée lente. Je ne vois pas deux cheminées émettre au même instant.
- Traîne pâle : une deuxième bouffée plus pâle derrière la première, non distinguée à cette taille. Cadence exacte non chiffrée (je n'ai pas mesuré image par image).

## 6. Villageois (T42) : NON VUS
`v-jour-1.png`, `v-jour-2.png`, gros plans `gp-forgeron-fermier.png`, `gp-garde-mage.png` (jour, zoom 1, tous debout, agrandis 3 fois).
- Près de la forge : une villageoise en robe claire avec un balai. Près des parcelles brunes (que je prends pour la ferme, sans certitude du code) : un villageois accroupi qui porte une caisse. Près de la tour de guet : le même balayeur et un porteur de caisse. Près de la tour du mage : aucun villageois dans le cadre.
- Je ne vois ni forgeron au tablier et au marteau, ni fermier, ni garde casqué avec lance, ni mage en robe avec bâton. Je n'ai pas fait de passe villageois par villageois en marche.

## 7. Effets Svg encrés
- Révélation (« Prêt », toucher du feu de camp, `revelation.mp4`, `planche-revelation.jpg`) : la caméra vole vers le feu de camp, un échafaudage noir apparaît, un anneau jaune ovale lisse et quatre étoiles dorées à quatre branches jaillissent, puis le foyer apparaît. Anneau lisse (non irrégulier) : à trancher.
- Chantier (bouton « Neuf » puis toucher, `chantier.mp4`, `planche-chantier.jpg`) : échafaudage noir, petit nuage de poussière encré en bas, anneau et étoiles à la fin, puis le foyer.
- Bouton « Grandir » de l'onglet Village : rien de visible à l'écran en 9 s (`f-grandir1-*`, film `grandir1.mp4`, seules les ailes du moulin tournent), comme en audit1 ; le bouton Grandir ne montre pas la révélation sur le village du héros de test. Non prouvé.

## 8. Mesures (émulateur x86_64, indicatives ; le verdict reste la mesure du Fairphone)
Palier 12, nuit, mini ; toucher au début d'une fenêtre de 15 s, 15 s de mesure ; `gfxinfo` remis à zéro avant ; repos : fenêtre de 12 s, 12 s après (0 image rendue dans tous les cas). Fichiers : `mesures/gfx-*.txt`, `meminfo-*.txt`.
| Passe | Images | Janky | p50 / p90 / p99 (ms) | Deadline missed | PSS total |
| --- | --- | --- | --- | --- | --- |
| carte, vague 1 | 1256 | 3 (0,24 %) | 30 / 32 / 32 | 3 | 275 980 kB |
| carte, vague 2 | 1260 | 5 (0,40 %) | 32 / 36 / 40 | 5 | 280 297 kB |
| onglet iso, vague 1 | 336 | 1 (0,30 %) | 26 / 28 / 30 | 1 | 326 225 kB |
| onglet iso, vague 2 | 355 | 1 (0,28 %) | 26 / 28 / 32 | 1 | 320 364 kB |
| carte « Prêt », révélation 1 | 1246 | 20 (1,61 %) | 28 / 32 / 81 | 20 | 359 344 kB |
| carte « Prêt », révélation 2 | 1223 | 18 (1,47 %) | 29 / 32 / 77 | 18 | 360 757 kB |
- Comparaison à qa-audit1 (onglet en vague : 0,97 à 1,19 %, carte 0,44 %) : l'onglet passe sous 1 % (0,28 à 0,30 %, mais seulement 336 à 355 images en 15 s : le rendu ne se redessine pas à chaque image, donc la comparaison de pourcentages est fragile) ; la carte reste sous 0,5 %. La révélation dépasse 1 % (1,5 à 1,6 %, p99 à 77 à 81 ms) : image la plus lente pendant le vol de caméra et la poussée de stade.
- PSS palier 12 : carte seule 276 à 280 Mo après vague (audit1 : 280 à 283 Mo) ; onglet 320 à 326 Mo (audit1 : 316 à 330 Mo) ; après révélation 359 à 361 Mo (audit1 : 319 à 320 Mo en croissance de l'onglet : cas différent). Graphics lu à 0 sur l'émulateur.
- Pas de passe « glissé » ni « tous debout » cette fois (non demandées). Témoin onglet Village actuel (hors iso) toujours non mesuré.

## Défauts et observations pour le regard neuf
1. Orbe de la tour du mage, faisceau de l'observatoire et yeux du dragon non vus en 4, 3 et 2 fenêtres prédites (section 4) ; le jet de la fontaine est vu.
2. Points bleus et verts flottants à gauche du dôme de l'observatoire, sans source claire.
3. Villageois de métier (T42) non vus : balayeur et porteur partout (section 6).
4. Révélation : 1,5 à 1,6 % de trames en retard, p99 ≈ 80 ms.
5. Bouton « Grandir » de l'onglet : aucune révélation visible.
6. Bord sud-est : arête droite à deux crans verticaux (à trancher, existait en audit1).
7. Anneau de révélation lisse (à trancher).

## Douteux ou non fait
- Cadrage exact de `d-jour-bord-so-1` d'audit1 : inatteignable avec les bornes actuelles ; remplacé par le bord sud-ouest le plus proche.
- Effets de nuit : fenêtres prédites par mon port de `effetsDeVague`, non vérifiées contre l'état réel de l'application.
- Fumée : cadence et traîne pâle non mesurées image par image.
- Villageois : une seule passe de jour, tous debout.
- Mage et ferme : bâtiment « ferme » identifié à l'œil.
- Aucune passe avec animation réduite.
