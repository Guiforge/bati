# qa-audit3 : build .perf au HEAD 1d257429, effets forcés, villageois de métier, correctifs T43, révélation, mesures

Statut proposé : prêt pour revue (je ne juge pas le goût)
Auteur : qa
Tour de revue : 1

BUILD_FAITE 21:17

## Build
- Caches vidés (`$TMPDIR/metro-cache`, `android/app/build/generated/{assets,res}`, `intermediates/{assets,compressed_assets,merged_res,packaged_res}`). `heavy.sh --gradle gradle-perf.sh` : BUILD SUCCESSFUL en 4 min 42 (evidence/qa-audit3/build.log). `android/gradlew -p android --stop` : « No Gradle daemons are running ».
- `install -r` à 21:17:29, firstInstallTime 29/10 inchangé (rien désinstallé).
- Cache d'images : onglet Village, « Vider cache images », `am force-stop`, réouverture (01, 02). Sprite de HEAD : le dôme à fente de l'observatoire (02, tier 1) est celui de `observatory/solid.nuit.webp` (`ref-observatoire-solid-nuit.png`) ; le lampadaire réduit de T43 est bien là (preuve que le code est celui de HEAD).
- Émulateur jamais arrêté ni réglé ; Fairphone non touché. Films lourds : `~/.cache/bati-art-loop/iso/evidence/qa-audit3/` (`tour.mp4`, `druide.mp4`, `druide2.mp4`, `dragon.mp4`, `fontaine.mp4`, `forge.mp4`, `obs.mp4`).
- Cadrage « zoom 1 » : le bouton « 0,6 » du dev-iso (vue serrée, à peu près l'échelle du jeu) ; effets filmés avec ce zoom, parfois un cran de « + » en plus. Écran 1080x2400, carte de nuit, palier 12.

## 1. Effets forcés (bouton `Effet : <bâtiment>`, un bâtiment à la fois, vague touchée sur une carte au repos)
Un effet ne se voit que si la vague part sur une carte au repos (15 s) : sinon la vague est prolongée et l'effet est déjà passé (cause de la non-vue d'audit2 confirmée dans mon premier essai du dragon).
| Effet | Vu ? | Ancrage | Lecture |
| --- | --- | --- | --- |
| Tour du mage, orbe | OUI (`e1-tour-mage-orbe.png`, 4 à 7 s après le toucher) | juste : orbe crème à halo posée sur la pointe de la flèche, runes violettes et dorées en croix autour | peint : formes encrées à contour noir, petites étoiles à quatre branches ; l'orbe est petite |
| Observatoire, faisceau | OUI mais faible (`e6-observatoire-faisceau.png`, 5 à 7 s) | à demi juste : le faisceau est un trapèze translucide pâle qui part du sommet du dôme, pas de la fente ; l'étoile dorée flotte à côté, au dessus de l'arbre | l'étoile est peinte ; le faisceau est un aplat pâle sans contour, presque invisible à l'échelle du jeu : plutôt grossier |
| Repaire du dragon, yeux | OUI (`e3-dragon-yeux.png`, 5 à 7 s) | juste : deux yeux crème dans la gueule, sous le toit de pierre, avec braises orange et deux gouttes de cendre crème | peints : yeux en amande ; la pupille fendue est une fine ligne sombre, lisible seulement en gros plan |
| Fontaine, jet | OUI (`e4-fontaine-jet.png`, 4 à 7 s) | juste : jet bleu qui monte de la colonne, arcs et gouttes bleues, crème, dorée | peint, mais les gouttes sont grosses (un peu bande dessinée) |
| Forge, flamme | OUI (`e5-forge-flamme.png`, 5 à 6 s) | juste : la flamme est celle du sprite, des étincelles orange et crème montent de la hotte | peint, discret |
| Bosquet du druide, lucioles vertes | OUI au 2e essai (`e2-druide-vert.png`, 11 à 13 s du film `druide2`) | décalé : les gouttes vertes et crème flottent au nord-ouest du cercle de pierres, au-dessus d'un bosquet de pins sombres, pas sur le cercle | peintes (gouttes encrées) ; au 1er essai (`druide-planche*.png`) je n'ai vu que les lucioles bleues ambiantes |
Planches : `tour-planche.png`, `druide-planche.png`, `druide2-planche.png`, `dragon-planche2.png`, `fontaine-planche.png`, `forge-planche.png`, `obs-planche2.png`.
- Lucioles bleues ambiantes : plates, sans contour (`e2-druide-luciole.png`), à l'est du cercle de pierres (zone gx 5 à 9, gy 0 à 3). Elles ne sont plus devant l'observatoire (vérifié sur les films de l'observatoire et du druide). Elles lisent comme des pastilles, pas comme du dessin encré.

## 2. Villageois de métier (tous debout, nuit, `v-planche1.png`, `v-planche2.png`)
- Forgeron : VU près de la forge (tablier de cuir, marteau), peint, lisible.
- Fermier : VU près de la ferme (femme à la fourche, tablier).
- Sage : VU (vieille femme à capuchon gris, bâton et jarre) près du cercle de pierres, au bord de la route vers l'observatoire. Aucun près de la tour du mage dans mes cadres.
- Garde : VU (tabard bleu avec lance) près de la tente et d'un poste en bois (tour de guet) ; deux gardes debout encadrent le feu de camp (`41-pret-revelation-t4.png`).
- Toujours là : une balayeuse (pose de repos près de l'atelier). Normal selon le correctif (poses gardées pour les habitants sans métier).
- DÉFAUT : trois figurines grises sans visage ni détail, style maquette de dos (un moine près du pas de tir, un chevalier à épée près du mur est, un moine près du mur sud ; `v-planche2-0.png`, `v-planche2-3.png`). Elles détonnent avec les sprites peints.

## 3. Correctifs rapides de T43
- Aucun oiseau la nuit : NON. Des oiseaux blancs en V (type mouette) volent de nuit : `00-ouverture.png` (en haut à droite), `04-pan-tour.png` (en haut à gauche, quatre oiseaux), film `druide2` vers 16 s. Corbeaux sur les toits : présents, voulus. Le code dit que `Oiseaux` se tait la nuit : le V vu est peut-être un corbeau en envol (`CorbeauxToits`, dessiné « en V de mouette »), mais il se lit comme une mouette. À trancher.
- Ouverture plus proche aux paliers 1, 6, 12 (`20`, `21`, `22`) : les trois cadrages sont identiques (île presque entière, bords gauche et droit rognés : colisée à gauche, bâtiment de droite). Plus proche qu'avant : je n'ai pas la capture d'avant pour comparer ; la différence entre paliers n'existe pas dans le dev-iso.
- Zoom mini : OUI, toute l'île, entourée de forêt, centrée (`23`, `50`, `53`).
- Bosquets de la lisière : VUS, groupes de pins sombres aux coins et sur les bords (`22`, `12`), dispersion fine ailleurs ; lisible.
- Palier 1, lampadaire plus bas que la tente : OUI (`20`, `t1-planche.png`, lampadaire plus court que le toit de la tente). Pierres au bout des routes : NON tranché : je vois des petits cailloux gris près des routes mais pas de pierre encrée nettement posée au bout d'un bras de rue (`t1-planche.png`).
- Flaques de lumière chaude de nuit : OUI (ellipses ocre autour du feu de camp, de la forge, des lanternes ; `12`, `32`). De jour : ABSENTES (`31-jour-06.png`, `?ambiance=jour`), lanternes éteintes.

## 4. Révélation (« Prêt », palier 12, nuit, mini ; toucher du feu de camp après « Rejouer », 15 s de mesure, `gfxinfo` remis à zéro avant)
| Passe | Images | Janky | p99 | Slow bitmap uploads | Deadline missed |
| --- | --- | --- | --- | --- | --- |
| 1 (pas de révélation complète : la caméra a volé mais pas d'échafaudage, passe écartée) | 937 | 4 (0,43 %) | 32 ms | 2 | 4 |
| 2 (échafaudage vu, `42-pret-pass2-t2.png`) | 877 | 14 (1,60 %) | 61 ms | 3 | 14 |
| 3 (échafaudage vu, `43-pret-pass3-t2.png`) | 857 | 21 (2,45 %) | 65 ms | 9 | 21 |
Avant les correctifs : 1,47 % et 1,61 % (p99 77 et 81 ms). Après : 1,60 % et 2,45 %, p99 61 et 65 ms. Le p99 baisse d'environ 15 ms, la part en retard ne baisse pas. Les passes 2 et 3 jouent aussi un effet de la vague (jet de la fontaine visible à 2 s) : pas d'isolation possible. Conclusion : la révélation reste au-dessus de 1 %, la correction du bitmap de l'anneau n'a pas fait descendre la part en retard.

## 5. Mesures (émulateur x86_64, indicatives ; le verdict reste la mesure du Fairphone). Fichiers : `mesures/gfx-*.txt`, `meminfo-*.txt`
App relancée (`am force-stop`) avant la série « frais ». Palier 12, nuit, mini, toucher en début de fenêtre de 15 s, repos de 10 s.
| Passe | Images | Janky | p99 | Slow bitmap | PSS total |
| --- | --- | --- | --- | --- | --- |
| carte tous debout, vague A (session longue) | 898 | 4 (0,45 %) | 42 ms | 2 | non relevé |
| carte tous debout, vague B | 895 | 10 (1,12 %) | 65 ms | 4 | non relevé |
| carte (non debout), session longue, vague 1 | 841 | 40 (4,76 %) | 105 ms | 15 | non relevé |
| carte (non debout), session longue, vague 2 | 852 | 23 (2,70 %) | 117 ms | 18 | 493 592 kB |
| carte frais, vague 1 | 786 | 61 (7,76 %) | 150 ms | 19 | 281 994 kB |
| carte frais, vague 2 | 839 | 25 (2,98 %) | 150 ms | 13 | 299 279 kB |
| carte frais, vague 3 | 810 | 41 (5,06 %) | 150 ms | 17 | non relevé |
| carte frais, vague 4 | 901 | 2 (0,22 %) | 30 ms | 1 | 303 731 kB |
| onglet iso, vague 1 (village du héros, palier 1) | 917 | 2 (0,22 %) | 40 ms | 1 | 345 361 kB |
| onglet iso, vague 2 | 899 | 5 (0,56 %) | 40 ms | 1 | non relevé |
| onglet iso, « Grandir » | 105 | 8 (7,62 %) | 38 ms | 0 | 356 831 kB |
- La carte est très variable : de 0,22 % à 7,8 % selon la vague, et les passes lourdes ont toutes 13 à 19 `Slow bitmap uploads` (les légères : 1 à 4). Audit2 donnait 0,24 et 0,40 % : c'est une régression probable sur la carte au palier 12, à rapprocher de ce que la vague tire (effets) ou d'images chargées à la volée ; je n'ai pas isolé la cause.
- PSS palier 12 : 282 à 304 MB juste après un relancement (276 à 280 en audit2) ; 494 MB après environ 25 minutes de session sans relancement (fuite ou cache d'images qui grossit : à regarder). Graphics lu à 0 sur l'émulateur. Onglet : 345 à 357 MB.
- « Grandir » : rien de visible (`55-onglet-grandir.png`) ; 105 images seulement : la croissance ne joue pas sur le village du héros de test, comme en audit1 et audit2.
- Passe « tous les villageois » : les deux premières lignes (tous debout) sont les moins mauvaises de la série ; pas d'effet visible sur le jank.

## Défauts et observations
1. Oiseaux blancs en V visibles de nuit (point T43 non tenu).
2. Carte palier 12 : jank très variable, jusqu'à 7,8 % et p99 150 ms, corrélé aux `Slow bitmap uploads` ; régression face à audit2.
3. Révélation inchangée (1,6 et 2,5 %), p99 un peu plus bas.
4. PSS 494 MB après une longue session.
5. Faisceau de l'observatoire quasi invisible et parti du sommet, pas de la fente.
6. Lucioles vertes du druide décalées au nord-ouest du cercle de pierres ; lucioles bleues ambiantes plates, sans contour.
7. Trois villageois gris de style maquette (moine, chevalier).
8. Pierres encrées au bout des routes non trouvées au palier 1.
9. « Grandir » sans effet visible.
10. Ouverture identique aux paliers 1, 6 et 12 du dev-iso.

## Non fait
- Pas de comparaison avant/après du cadrage ; pas de passe de jour pour la mesure ; passe « tous les villageois en marche » = bouton « Tous debout : oui » (je ne sais pas si les villageois marchent au-delà de la pose debout).
- Sage près de la tour du mage : non vu (aucun villageois dans le cadre).
