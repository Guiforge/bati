# qa-frais : build .perf neuve, HEAD b28020ba

Build : caches Gradle vidés (generated/assets, generated/res, intermediates/assets, compressed_assets, merged_res, packaged_res) ; aucun cache Metro n'existait (node_modules/.cache/metro et $TMPDIR/metro-* absents). `gradle-perf.sh` OK (2 min 29), démons arrêtés. Installé par `install -r` : lastUpdateTime 31/10 16:43:40 (avant : 16:08:18), firstInstallTime inchangé (données gardées). Aucun réglage d'émulateur lu ni modifié (date et heure intactes).

Porte avant capture : salle des héros grand, toit brun (pas rouge), villageois peints : OK (evidence/qa-frais/salle-heros-grand-jour.png, p00-ouverture.png).

Planches jour (ligne du haut) et nuit (ligne du bas), 6 vues par palier (cadrage mini, zoom, 4 balayages) : evidence/qa-frais/planche-palier{1,6,12}-jour-nuit.jpg. Bruts : ~/.cache/bati-art-loop/iso/evidence/qa-frais/raw/ (36 captures). Vidéos : ~/.cache/bati-art-loop/iso/evidence/qa-frais/rat-forcee.mp4 et grandir.mp4. Limite : les quatre balayages ne donnent pas quatre côtés bien distincts (le zoom revient au même cadre, le balayage décale d'environ 500 px) : les côtés de l'île ne sont pas tous couverts.

| Point | Verdict |
| --- | --- |
| Toit de la salle des héros grand | vu bon (brun) |
| Fenêtres de la salle des héros éteintes de jour | vu faux : fenêtres ambrées allumées de jour (salle-heros-grand-jour.png) |
| Lanterne du palier 1, vitre allumée la nuit seulement | vu faux : vitre allumée aussi de jour, aux paliers 1 et 6 (palier1-jour-lanterne-ombres.png, planches) |
| Villageois peints | vu bon (paliers 1, 6, 12, jour et nuit) |
| Ombres de contact du palier 1 | vu bon à l'œil (tente, estrade du mannequin, foyer : ombre sous le socle, palier1-jour-lanterne-ombres.png) ; non mesuré |
| Rochers à l'échelle (palier 1) | vu bon : un tas de la taille d'un villageois (palier1-jour-toucher-assis.png) ; autres paliers non jugés |
| Les 4 côtés de l'île, paliers 1, 6, 12 | partiel, voir la limite ci-dessus |
| Arbre peint, forêt, lisière | forêt claire façon clipart de jour, déjà connue (TODO section 4) ; non jugée en détail |
| Rat : sort, court, rentre | pas vu : « Rat : forcé » activé, touche sur la carte, 25 s filmées à 2 images/s autour de la ferme et du moulin (rat-forcee-25s-planche.png). Aucun rat repéré à cette échelle ; pas conclu |
| Poussière de fin de chantier | non conclu : « Grandir » joué en onglet Village (grandir.mp4), image trop petite pour voir la poussière |
| Toucher dormeur, assis, paire | pas atteignable ici : en « Carte seule », le toucher d'un assis (palier 1) n'ouvre aucune bulle (palier1-jour-apres-toucher.png) ; ni dormeur ni paire vus. À rejouer dans l'onglet Village |
| Jour rare | pas atteignable : `emu-adb.sh` interdit `setprop`/`reboot`, la date ne se change pas sans root. Jours rares calculés par la graine (marcheurs.ts) : 02/11 chat, 06/11 corbeau, 08/11 poule + rat, 10/11 poule + corbeau, 15/11 chat + poule ; aucun aujourd'hui |
| Zoom forge/moulin, sons, lucioles, saut de fête, rotation, Fairphone | non joués |
