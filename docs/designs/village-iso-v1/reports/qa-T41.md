# qa-T41 : revelation, fenetres de jour, sprites enrichis (HEAD 25661024)

Build : caches Gradle (generated/assets, generated/res, intermediates/assets, compressed_assets, merged_res, packaged_res) et cache Metro videes ; `gradle-perf.sh` OK (2 min 22), demons arretes. `install -r` : lastUpdateTime 2026-10-31 17:17:42, firstInstallTime 29/10 inchange. Reglages d'emulateur : les trois echelles d'animation lues a 1, mises a 0 pour le test, remises a 1 (relu). Rien d'autre touche. Preuves : docs/designs/village-iso-v1/evidence/qa-T41/. Films : ~/.cache/bati-art-loop/iso/evidence/qa-T41-revelation.mp4 et qa-T41-anim0.mp4.

Porte avant capture : forge grand avec lueur orange au foyer : OK (p12-jour-forge-crop.png). Salle des heros grand : toit brun, statue sur le portique, mats a bannieres sombres : OK (p12-jour-salle-heros-crop.png).

| Point | Verdict |
| --- | --- |
| 1a. Jour, palier 12 : fenetres de la salle des heros eteintes | vu bon avec reserve : vitres sombres, pas de halo ; un fin trait ambre au bas des deux vitres de la face droite (p12-jour-salle-heros-crop.png), qui semble peint dans le sprite, pas une lumiere. A trancher par l'oeil de Guillaume |
| 1b. Jour, palier 1 : vitre de la lanterne eteinte | vu bon (p1-jour.png : vitre sombre, sans liseré) |
| 2a. Eclat propre au metier | vu bon : etincelles d'or montant au-dessus du foyer (batiment pret = le foyer, metier par defaut), revelation-planche.png, anneau-milieu.png. Eclats runes/braises/lucioles des autres metiers : pas vus (un seul batiment pret essaye) |
| 2b. Anneau dore qui traverse l'ile | vu bon : ellipse doree partie du pied du foyer, grandit et sort du cadre en environ 0,6 s (anneau-debut/milieu.png) |
| 2c. Allumage des fenetres et braseros au passage | pas atteignable : le mode Pret de dev-iso est en nuit, fenetres et braseros deja allumes, l'effet ne se distingue pas. Il faudrait un Pret de jour (PretDemo n'a pas de param `ambiance`) |
| 2d. Retour au calme vers 0,9 s | vu bon a l'echelle du film (10 images/s) : dernieres etincelles environ 1,0 s apres l'apparition de l'anneau ; pas mesure a l'image pres |
| 2e. gfxinfo pendant la revelation | tap + marteau + revelation (7 s) : 409 images, Janky 8 (1,96 %), 50e 22 ms, 90e 26 ms, 95e 32 ms, 99e 65 ms, deadline missed 8 (gfx-revelation-1.txt). Repos du mode Pret : 0 image (gfx-repos-pret.txt). Comparaison a une vague normale : pas conclue : « Fete » 3 images seulement, « Tous debout » 0 image (gfx-vague-fete.txt, gfx-tous-debout.txt), donc pas de reference exploitable. Emulateur, a titre indicatif |
| 2f. Echelles d'animation a 0 : ni eclat ni anneau | vu bon : le stade change, aucun anneau ni etincelle (film echantillonne a 4 images/s, anim0-planche.png) |
| 3. Sprites enrichis, zoom 1 : forge, salle des heros, carriere (grand) | forge grand : vu bon (lueur de foyer, enclume, braises). Salle des heros grand : vu bon (statue, mats). Carriere grand : vu (blocs en gradins, chevre en A, p12-carriere-crop.png), pas de defaut. Limite : cadrage obtenu par 3 pressions sur « + », zoom proche de 1 mais pas verifie au chiffre ; le tas a gueule dentee et or voisin est le repaire du dragon, pas la carriere |

Non fait : revelation avec deux batiments ensemble, `?fige=1`, chantier « Neuf », rang sans chantier.
