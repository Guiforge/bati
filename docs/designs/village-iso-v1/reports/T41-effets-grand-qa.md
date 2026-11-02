# T41-effets-grand-qa : décor des effets du dernier stade (HEAD f986055b)

Verdict : fail (ancrage de la fontaine, yeux et fumée du dragon, flottement de l'orbe et du faisceau). Preuves : docs/designs/village-iso-v1/evidence/qa-T41-grand/.

## Build et porte
- Caches vidés avant le build : cache Metro, android/app/build/generated/{assets,res}, intermediates/{assets,compressed_assets,merged_res,packaged_res}. `gradle-perf.sh` OK en 1 min 15, démons arrêtés. `install -r` : lastUpdateTime 17:36:24, firstInstallTime 29/10 inchangé. Le bundle de l'APK contient le trait du jet de forge `M50 100C48 84 52 74 50 62` (build.log).
- Porte « sprite de HEAD » : ÉCHOUÉE une première fois. Après `install -r`, le cache disque d'images de Glide servait de mauvaises images : à l'emplacement de l'observatoire, la carte montrait la forge solid (maison à enclume), le chantier de la carrière et la salle des héros étaient d'avant. J'ai vidé le cache (Onglet Village, « Vider cache images »), arrêté l'app (`am force-stop`, pas de `pm clear`) et rouvert `bati://dev-iso` : l'observatoire est alors le dôme de `assets/images/village/iso/observatory/solid.nuit.webp` (p01-ile.png). Forge grand et repaire grand correspondent à leurs fichiers grand.nuit.webp (z1-forge-pic.png, z1-dragon-pic2.png). Les films du repaire, de la forge et de la tour faits avant le vidage : sprites justes pour ces trois, et le repaire a été refait après vidage (z1-df2). Le film d'observatoire n'a été fait qu'après vidage.
- Les waves : le numéro de vague est `floor(Date.now()/15000)`. J'ai porté `effetsDeVague` (scratchpad plan.mjs) et prédit les 2 effets de chaque fenêtre de 15 s ; la prédiction a tenu à chaque film (fontaine+repaire : repaire et fontaine ; forge+repaire : forge ; tour+repaire : tour ; observatoire+fontaine : observatoire). C'est ce qui a permis de cadrer le zoom 1 sur le bon bâtiment avant de toucher la carte.
- Zoom 1 = zoom de jeu 1 (ZOOM_MAX de la démo) : bouton 0,6 puis trois fois « + » (clampe au maximum). Zoom mini = « Cadrer » (île entière, environ 0,4 de la démo).

## Jugement image par image (zoom 1, nuit, palier 12)
| Effet | Vu | Ancrage | Lisibilité zoom 1 | Défaut |
| --- | --- | --- | --- | --- |
| Repaire : yeux ambre + fumée | oui (z1-dragon-pic2.png, z1-df2-dragon.png) | Les yeux sont deux petits points ambre au bord droit de la gueule, au-dessus de la flamme de la torche, dans l'ouverture sombre : acceptable, pas centrés sur les dents. Le groupe monte de 8 dp seulement, il sort peu du sprite | Yeux : points de 5 dp, de la même teinte et de la même taille que les petites braises jaunes, ils se lisent comme deux braises de plus, pas comme des yeux. Fumée : INVISIBLE, gris à 40-55 % sur de la roche gris-bleu | oui (fumée, yeux) |
| Tour du mage : orbe pâle | oui (z1-tour-pic.png) | L'orbe flotte à environ 230 px au-dessus de la pointe de la flèche (près d'une hauteur de cône), au milieu des runes : détaché du cône, pas posé dessus. Cohérent avec « flotte avec les runes » | Très lisible : disque crème + halo, pas de violet nouveau | mineur (détaché) |
| Fontaine : jet d'eau | oui (z1-fontaine-pic.png, z1-df2-fontaine.png) | RATÉ : l'effet est accroché au sommet du masque, c'est-à-dire le lampadaire, et monte encore. Il flotte à environ 130 px (50 dp) au-dessus de la lanterne, sur le pavage, loin du bassin et de la colonne | Disques bleus sur une tige fine, avec un point crème et un point doré : se lit comme des ballons sur un bâton, pas comme un jet | oui (majeur) |
| Observatoire : faisceau + 2 étoiles | oui (z1-obs-pic.png, z1-obs-sheet.png) | Faisceau (aplat pâle, plus large en haut) et étoile dorée à environ 90 px au-dessus de la pointe du dôme, sans toucher la fente | Lisible, aussi au zoom mini (w5-t26.png, vu avec la mauvaise image d'observatoire mais le décor est le même) | mineur (détaché) |
| Forge : jet de flamme | oui (z1-forge-pic.png) | Bon : le trait orange part de la flamme du foyer sous la hotte et monte le long du conduit, les 6 étincelles autour, la dorée en tête | Lisible ; le jet est un trait fin qui finit sur une étincelle, un peu « bâtonnet » | non |

Au zoom mini (île entière, `Cadrer`) : seul le faisceau de l'observatoire se distingue (w5-t26.png). Le jet de forge n'est qu'une tache (w8-t26.png), et les yeux, la fumée, le jet de la fontaine, l'orbe ne sont pas lisibles ; pas de défaut d'ancrage à juger à cette échelle.

Chaque effet joue sur un seul cycle de 5 s de la vague (visible environ 1,5 s à 4,5 s après le toucher), puis rien jusqu'à la fin ; c'est le comportement attendu (siège signal).

## Gates
- Repos (10 s après une vague) : vu bon. gfxinfo sur 12 s (de la 22e à la 34e seconde après le toucher) : 0 image rendue, sur 3 passes (w8, w9, w10 : *-gfx-repos.txt) ; les films s'arrêtent à 16,4 s faute d'image. Une première passe (w7) donne 723 images au repos, mais la caméra bougeait toute seule dans le film (panoramiques et zooms que je n'avais pas commandés, w7-sheet.png) : je l'écarte, à signaler (voir réserves).
- Jour (`bati://dev-iso?ambiance=jour`) : vu bon. Vague dans une fenêtre fontaine+repaire (les marcheurs bougent), aucun effet sur 20 s (jour-df-sheet.png).
- Mouvement réduit (trois échelles d'animation à 0, relues à 0 ; app relancée) : vu bon. Fenêtre fontaine+repaire : ni effet, ni marcheur, seules les flammes de feu vacillent (anim0-sheet.png). Échelles remises à 1 et relues (1, 1, 1).
- gfxinfo pendant une vague (émulateur, mini, vague avec effets, 3 passes, fichiers *-gfx-vague.txt) :

| Passe | Images | Janky | p50 | p90 | p99 | Deadline missed |
| --- | --- | --- | --- | --- | --- | --- |
| w8 | 902 | 2 (0,22 %) | 26 ms | 29 ms | 32 ms | 2 |
| w9 | 901 | 4 (0,44 %) | 25 ms | 28 ms | 32 ms | 4 |
| w10 | 902 | 2 (0,22 %) | 25 ms | 28 ms | 32 ms | 2 |

P1 (P1-perf-qa) : vague p50 22-24 ms, Janky 0,2-0,35 %. Ici p50 25-26 ms et Janky 0,22-0,44 % : +1 à +4 ms, un cran au-dessus de P1 sans dépasser le seuil de 1 % ; émulateur, passes indicatives. Passe supplémentaire (w6, zoom 1, caméra sur la forge) : 2285 images, Janky 7 (0,31 %), p50 23 ms. Non fait : le témoin « onglet Village », une passe pendant une croissance, une passe avec tous les villageois debout, la mémoire PSS/Graphics.

## Non vu
Druides (hors sujet), les cinq effets au zoom mini sauf le faisceau, passes de gfxinfo croissance et tous debout, témoin et PSS, un deuxième passage de l'orbe.

## Réserves
- Caméra : pendant le film w7 et plusieurs fois avant (panoramiques qui continuent après un glissé, vues qui dérivent), la carte a bougé sans commande de ma part. Rien d'autre n'est enregistré dans `scripts/emu.sh list` (un seul worktree), mais un autre coéquipier qui pilote le même émulateur n'est pas exclu : à vérifier par le chef d'équipe. Les passes de gfxinfo retenues (w8 à w10) sont propres.
- `uiautomator dump` échoue en vague (« could not get idle state ») : pas de lecture des testID `iso-effet-*` pendant une vague.
- Le test pire cas d'iso-effets ne couvre toujours pas les stades grands rendus, selon le rapport de l'ingénieur ; rien ici ne le dément (1 à 2 effets, un nœud chacun).

## Fichiers
Les films (.mp4) et les planches de plus de 2 Mo (dont w7-sheet.png, z1-df-sheet.png, w1-sheetA/B.png) sont dans ~/.cache/bati-art-loop/iso/evidence/qa-T41-grand/ (22 fichiers) ; le reste est dans evidence/qa-T41-grand/.
