# AUDIT-DA-lot3-qa : cadrages « eau » et « bâtiments » après le lot 3

Statut proposé : prêt pour revue. Aucun jugement de DA : constats seulement.
Auteur : qa. Build `.perf` x86_64 du working tree (HEAD 71cf79e2 plus modifs), INTEGRATION = true pour la build seulement, remis à false et relu (`constants/isoPoc.ts` ligne 29). Émulateur `emulator-5554` (bati-bench), `bati://dev-iso?ambiance=<nuit|jour>&fige=1`, installé par `install -r -d` (données gardées).

## Écart de méthode
Écran de 1080x2400 ici ; les « avant » (`evidence/AUDIT-DA/captures/`, il n'y a pas de captures brutes dans `apres-t1/`) sont en 1080x1920. La zone carte est donc plus haute après (1480 px contre 938) : même largeur, plus de forêt visible en bas. Le cadrage `cadrage` a aussi changé au lot 3 (0,92 à 1,08) : l'île remplit plus l'écran à « cadre ».

## Planches (`evidence/AUDIT-DA/apres-t2/`, colonnes : nuit avant, nuit après, jour avant, jour après)
- `eau.jpg` : p12 et p6, cadre et zoom mini.
- `batiments.jpg` : p12 et p6, cadre et zoom 0,6.
- `palier1.jpg` : p1, cadre, zoom mini, zoom 0,6.
- `p1-rocher-nuit.jpg` (détail, p1 zoom 0,6) ; `p12-bord-jour.jpg` (détail du bord nord, p12 jour).
Captures brutes 1080x2400 : scratchpad de session, non gardées (poids) ; les planches les contiennent.

## Constats demandés
- **Arbres fantômes translucides au bord de l'île** : plus aucun vu, nuit comme jour, p1, p6, p12, cadre et mini. Les arbres du bord sont pleins. Au jour, les arbres du bord de l'île sont des silhouettes bleu-noir rondes (visibles sur `p12-bord-jour.jpg`), très contrastées sur le sol clair ; tu as déjà noté que c'est l'art de nuit sans variante jour.
- **Forêt en grille** : au cadre, des arbres isolés, dispersés ; pas de grille lisible. Au zoom mini (p1 surtout), la forêt forme des bandes serrées avec des clairières : par endroits des colonnes verticales d'arbres de même taille alignées en haut et à droite (p12 mini jour, p6 mini jour). À l'œil, un motif de rangées reste perceptible en mini ; à toi de juger.
- **Palier 1, rocher (11,11)** : présent, un groupe de trois pierres bleu-gris, posé sur l'herbe juste sous le foyer, côté bas. Il ne touche pas la plateforme du feu mais la frôle (quelques pixels) ; il est de même taille que le feu. Il reste au palier 12 (visible sur la planche T25, à droite de la statue). Le palier 1 reste par ailleurs peu habité : tente, mannequin, feu, 3 villageois.
- **Eau** : le ruisseau du bord gauche se voit au cadre p12 et p6 ; à p1 il n'y en a pas de tracé visible. Le bord de l'île montre maintenant une falaise brune à l'avant (gauche et bas), plus nette qu'avant.
- **Défaut relevé en passant** : au palier 1, bord droit de l'île (nuit cadre, zoom 0,6), une petite encoche carrée, un rectangle noir détaché du contour, côté droit (`palier1.jpg`, ligne 1 et 3, colonnes après).
- **Palier 1 et 6 au cadre** : l'île a la même forme de losange que p12 (les terrains absents sont des échancrures) ; au p6 mini le losange est tronqué dans l'angle.

## Limites
Pas de mesure de perf (non demandée). Une tentative de capture a d'abord montré le sélecteur d'application Android au lieu de l'app (le lien sans `-p`) : captures jetées, refaites avec `-p com.guiforge.bati.perf`. Scripts de pilotage dans le scratchpad.
