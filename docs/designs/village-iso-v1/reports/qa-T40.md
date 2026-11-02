# qa-T40 : les habitants au repos (maquettes grises)

Statut proposé : prêt pour revue, avec des points faux
Auteur : qa
Tour de revue : 1

## Fait
- Build `.perf` du HEAD `1b3c2ef1` (`heavy.sh --gradle gradle-perf.sh`, BUILD SUCCESSFUL en 2 m 23 s, `evidence/qa-T40/build.log`, sha256 `apk.sha256`), démons Gradle arrêtés. Installée par `emu-adb.sh install -r` : `lastUpdateTime` passé de 12:01:33 à 13:24:12 (la nouvelle). Les maquettes `repos/` s'affichent (balai, caisses, lit, dormeur vus à l'écran), donc le cache Glide à versionCode égal n'a pas servi d'ancienne image.
- Scène : `bati://dev-iso?ambiance=nuit|jour`, onglets palier 1 / 6 / 12, zoom « + » x3 pour lire les poses ; ids des habitants lus par uiautomator (au repos seulement). Poses de référence : `ref-poses.png`.
- Les poses dépendent de la graine du jour, pas de l'ambiance : jour et nuit montrent les mêmes poses aux mêmes places (vérifié en comparant les feuilles `*-nuit-*` et `*-jour-*`).
- Réglages d'émulateur lus avant : `window_animation_scale`, `transition_animation_scale`, `animator_duration_scale` = 1, 1, 1. Remis à 1, 1, 1 (relu).

## Verdicts

1. Palier 1, nuit et jour : une pose lisible (balayeur, balai net, `p01-*-z3-sheet.png` h0), une assise sur tonneau au feu de camp (lisible comme un corps sur un fût, `h2`). Le troisième habitant (h1) est entièrement caché derrière la tour du moulin (`h1` de la feuille : mur de la tour) : **vu faux** (un habitant sur trois illisible, placement derrière un bâtiment haut).
2. Palier 6, nuit et jour : 6 habitants, 2 lisibles (h6 balayeur, h1 porteur de panneau sur la place), h2 au bord. **Vu faux : la paire face à face n'est pas visible** : h0 et h5 (voisins, et h4 sans nœud : le second de la paire) sont derrière le mur du château et le tas de pierres ; h3 est derrière le toit de la forge (`p06-nuit-z3-sheet.png`, `pal6-pair-crop.png`). 4 habitants sur 6 invisibles.
3. Palier 12, nuit et jour : 12 habitants, tous posés (aucun debout) : balayeur x6 (h0, h1, h2, h4, h9 + un), porteur de panneau (h10, h11), caisses à la grange (h8, lisible), dormeur contre le dragon lair (h5 : le panneau gris de la maquette est posé à plat devant, pas collé au mur ; la pose reste lisible), h3 derrière le toit de la forge, h7 derrière les créneaux du château (tête visible : profondeur juste). **Vu bon** pour la place, la lisibilité du balai, du panneau, des caisses ; **vu faux** pour la variété : aucun puiseur au puits, aucune paire, aucun assis au tonneau, aucun regardeur de loin ce jour (`p12-jour-z3-sheet.png`, `p12-nuit-repos-zoom.png`). Pas de `-paire` en palier 12 (ids h0 à h11 tous présents).
4. Puiseur au puits : **pas atteignable** ce jour (graine fixe, la date de l'émulateur n'est pas à moi). Même chose pour la paire au palier 12 et le regardeur de loin.
5. Vague (palier 12, jour, 17 s de film, `~/.cache/bati-art-loop/iso/evidence/qa-T40-wave-p12.mp4`) : **vu bon, les habitants restent immobiles** : différence moyenne de 0,0 contre l'image finale sur h0, h1, h6, h8, h9, h10, h11 dès la 3e seconde, des pics seulement là où un marcheur ou un oiseau passe (h4, h7, h3, `wave-diff.txt`, `wave-h7-seq.png`). « Un marcheur se relève puis reprend sa pose » : **pas atteignable** : aucun marcheur n'a pris la case d'un habitant dans deux films (vague et Fête, `qa-T40-fete-p12.mp4`), et le rassemblement de la Fête n'a rien montré de lisible à cette échelle.
6. Toucher un habitant en pose : **vu bon**, dans l'onglet Village (la carte seule n'a pas de bulle) : palier 1, tap sur le balayeur violet (h1) ouvre la bulle « The Sage », queue sur le personnage (`touch-h1-vil-crop.png`). Toucher le second de la paire : **pas atteignable** (paire invisible, point 2 ; aucun palier réglable dans l'onglet Village).
7. Profondeur devant une façade : **vu bon** : h5 (dormeur) et h8 (caisses) dessinés devant leur façade, h7 derrière les créneaux, h3 derrière le toit. Réserve : un habitant caché partout (points 1 et 2) peut venir d'une case derrière le bâtiment, à confirmer par l'ingénieur.
8. Échelles d'animation à 0 (relancé, `anim0-wave.mp4`, 74 Ko, 1 image en 30 s) : **vu bon, rien ne bouge** : l'enregistrement ne contient qu'une image après le tap de la vague. Avec « Fête 1 » (`anim0-fete.mp4`, 5 images) les marcheurs sautent entre le carré et leurs places (`anim0-fete-ba.png`) ; les habitants gardent leurs bornes à 1 px près (`anim0-fete-before/after.txt`) : le « debout puis reprend sa pose » n'est pas vérifié.

## Douteux ou non fait
- Pas de pose « discutent » ni « puise » ni « regarde_loin » ni « joue_chat » vue : dépend de la graine du jour.
- Paliers 7 à 11 : seulement des listes d'ids (`pal7-n.txt` à `pal11-n.txt`), pas jugés à l'image.
- Pas de mesure de performance (non demandée).

## Pour la suite
- Placement : exclure du tirage les cases de `porte` et de bâtiment cachées derrière un volume haut (castle_wall, forge, tour du moulin), au moins pour la paire.
- Preuves : `docs/designs/village-iso-v1/evidence/qa-T40/` ; films de plus de 2 Mo dans `~/.cache/bati-art-loop/iso/evidence/qa-T40-*.mp4`.
