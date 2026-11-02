# AUDIT-DA-cible-qa

Build : `.perf` x86_64 du working tree (base d344d066 + modifications non commitées), INTEGRATION = true pour la build seulement, remis à false et relu (`constants/isoPoc.ts` ligne 29). APK gardées dans `~/.cache/bati-art-loop/iso/evidence/AUDIT-DA-cible/` : `apk-worktree-d344d066.apk` (sha 613bf002...), `apk-5ea86807.apk` (sha 3fbfd13b..., copiée de `iso-audit`, build du 30/10 22:40). Les deux ont le versionCode 21301 : installées par `install -r -d`, données gardées.
Émulateur : `emulator-5554` (bati-bench), écran remis à 1080x1920 (override comme AUDIT-DA-qa, `wm size reset` fait à la fin, 1080x2400 revenu). **Un second émulateur tourne** (`emulator-5556`, bati-bench2, processus qemu séparé) ; load average 0,5 pendant la fin des mesures. Je n'y ai pas touché.
Preuves : `evidence/AUDIT-DA-cible/` (1,9 Mo ; `captures/`, `films/`, `gfxinfo/`) ; film brut 1,9 Mo dans le cache.
Remarque : le héros de cet émulateur est au palier 1 dans l'onglet Village (pas 12 comme dans AUDIT-DA-qa).

## 1. Lignes pâles du dallage (défaut 11)
Vues dev-iso, palier 12, zoom maxi : `captures/p12-zmaxi-brut.jpg`, gros plans x3 `p12-zmaxi-gros-plan-sous-foyer.jpg` et `p12-zmaxi-gros-plan-gauche.jpg`, et après glissé `p12-zmaxi-apres-glisse.jpg`.
- Ce que l'on voit sur le dallage, sous la tente et sous/autour du foyer : un quadrillage de joints sombres suivant exactement les diagonales du losange 2:1 (une case = un losange, un joint à chaque case, épaisseur environ 3 px à ce zoom, gris-brun foncé), **plus** par-dessus des traits clairs/ombrés qui, eux, ne suivent pas les diagonales : des lignes **verticales** (joint sombre-brun épais, 8-10 px écran, d'environ une case de haut, par ex. x=127 dans le gros plan gauche, et sous le foyer, x~540, y 1480-1700) et des lignes **horizontales** pâles (1-2 px, plus claires que le dallage, ton beige clair) à environ 60 px d'écart, courant sur la largeur d'une case. Les coins des plaques de ces traits sont arrondis (cadres de rectangles aux coins ronds, bord haut clair, bord bas sombre : un biseau).
- Ces motifs sont dans les axes de l'écran (vertical/horizontal), pas dans ceux du losange : on dirait une texture de pierre carrée (à biseau) posée sur les cases sans la projection isométrique, ou une carte d'ombre/biseau tuilée en axes écran. Les plaques ont une teinte alternée (beige clair/brun) par case.
- Elles suivent les cases : après un glissé de ~(-100,-120) px, les lignes se sont déplacées avec le dallage, elles sont collées au monde, pas à l'écran.
- Couleur : pâle = beige (~ dallage +15 % de clarté) ; sombre = brun gris.
- Pas de scintillement observé sur les captures (non filmé en repos prolongé).
Piste pour l'ingénieur : le sol des chemins est dessiné par case (SVG ou image de tuile) avec une texture axée écran en plus des joints isométriques ; chercher le tracé des joints verticaux/horizontaux dans le composant qui dessine le dallage (recouvrement de tuiles adjacentes : un joint vertical est le bord de l'image carrée d'une tuile).

## 2. Croissance dans PretDemo
Film : `films/croissance-30ips.mp4` (30 i/s, 540 px), `captures/croissance-halo-feu-2ips.png` (planche à 2 i/s autour du foyer). Appui sur le marteau du foyer (560,1048) à t ≈ 3,1 s du film.
- Le **marteau reste après** : il est encore là à t = 17 s (fin du film) et n'a pas changé.
- Chronologie mesurée sur la différence entre images (10 i/s) : début du mouvement 3,2 s ; mouvement fort (caméra qui se déplace légèrement : la carte glisse de quelques dizaines de pixels, le moulin change de place entre le début et la fin) de 3,3 à 7,7 s soit **environ 4,5 s** ; halo doré (ellipse) autour du foyer de 3,3 s à ~6,3 s (apparition 1 s, plus fort vers 4,3-4,8 s, disparition 6,3 s), soit **environ 3 s** ; **pas d'échafaudage vu**, et le foyer est identique avant et après (déjà au rang final dans cette carte) ; image stable de 7,8 s à 13,8 s, puis une activité faible (corbeaux, fumées) de 14 à 17,4 s.
- Donc : le fondu = l'apparition du halo (1 s) et sa disparition (~2 s) ; l'échafaudage n'apparaît pas dans ce film (à rejouer sur un foyer de rang inférieur : « Neuf » puis marteau). Un essai avec « Rejouer » n'a produit qu'un film vide (63 Ko), jeté.
Limite : tap au point près, un seul film.

## 3. Onglet Village
- `captures/onglet-defile-bas.jpg` : défilé tout en bas (6 balayages), la dernière carte de texte (« Nothing is managed here. Every level comes from a logged session. », y 1393) reste **bien au-dessus de la barre d'onglets** (barre à y 1700), avec ~300 px libres : OK.
- `captures/onglet-depart.jpg` : cadrage de départ (palier 1 sur cet émulateur). L'île n'est **pas entière** : les coins gauche et droit du losange sont coupés par les bords de l'écran (x 0 et x 1080), le bord droit vers (1075,590), le bord gauche vers (0,660). Les bords haut et bas sont visibles.

## 4. Mesure A/B des trames (même démarrage, même résolution 1080x1920, 3 passes chacune)
Vague = ouverture à froid de `bati://village`, trames comptées sur 16 s. Glissé = 9 balayages horizontaux (850 à 250 px, y 600, 500 ms) sur l'onglet, après 22 s d'attente. Repos de 10 s entre passes. Journaux bruts : `gfxinfo/{A,B}-{vague,glisse}-{1,2,3}.txt`.

| Passe | Trames | Janky | Deadline missed | p50 / p99 |
|---|---|---|---|---|
| A (5ea86807) vague 1/2/3 | 867 / 874 / 874 | 4 (0,46 %) / 2 (0,23 %) / 3 (0,34 %) | 4 / 2 / 3 | 25/28, 22/26, 22/26 ms |
| B (working tree) vague 1/2/3 | 445 / 441 / 440 | 421 (94,6 %) / 427 (96,8 %) / 425 (96,6 %) | 421 / 427 / 425 | 61/81 ms (les 3) |
| A glissé 1/2/3 | 744 / 744 / 746 | 2 / 2 / 1 (0,13-0,27 %) | 2 / 2 / 1 | 16/16 ms |
| B glissé 1/2/3 | 388 / 388 / 390 | 376 (96,9 %) / 371 (95,6 %) / 371 (95,1 %) | 376 / 371 / 371 | 61/81 ms (les 3) |

**Régression nette et reproductible** : le working tree rend la moitié moins de trames dans le même temps, 95 % d'entre elles manquent l'échéance, p50 de 61 ms contre 16-25 ms. Les 3 passes de chaque côté concordent à 1 % près ; l'ordre A puis B a été suivi dans le même démarrage de l'émulateur. Bémol : émulateur à GPU logiciel, un second émulateur en marche, pas le Fairphone ; l'ordre fixe (A puis B) ne contrôle pas une dérive de l'émulateur (je n'ai pas rejoué A après B). À contrôler en rejouant A, puis sur le Fairphone.
Mémoire B après les passes : TOTAL PSS 292 172 kB, Graphics 0 (non rempli par l'émulateur). Pas de passe pendant croissance ni « tous debout » (hors de cette tâche).
Pas mesuré : le témoin (onglet actuel, INTEGRATION false).

## Non fait
- Pas de passe A rejouée après B ; pas de film du dallage au repos ; échafaudage non vu (point 2).
