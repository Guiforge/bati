# L4-T07a (qa) : comportement sur émulateur, horloge ambiante et ailes du moulin

Build : `.perf` neuf depuis l'arbre non commité (base 019aa654), BUILD SUCCESSFUL, Gradle arrêté, `install -r` OK. Pas de série de perf (suspendue).
Preuves : `docs/designs/village-iso-v1/evidence/L4-T07a/` (`build.log`, `00-ouverture.png`, `01-ailes-planche.png`, `repos-gfx.txt`, `repos-uia.txt`, `vague-*-gfx.txt`, `05-prod.png`, `prod-repos.txt`, `ecran/`). Le film brut (4,6 Mo) reste dans le scratchpad, non versionné.

## Verdicts
1. Build + install : OK.
2. Ailes par rafales autour du pivot : OK.
3. Repos, 0 image, uiautomator : OK.
4. Un glissé ou un tap relance une vague de 15 à 20 s : OK (mode « Onglet Village » ; voir détail).
5. Captures pour la revue d'écran : OK avec une réserve sur le zoom.
6. Drapeau éteint, production : OK.

## Détails
**2.** Palier 12 (moulin debout), `dev-iso` rouvert à froid, film de 20 s, images à 30 i/s recadrées sur le moulin et comparées à la pose finale (seuil 30/255 par pixel). Résultat : des rafales d'environ 4,5 s (écart à la pose de repos de 800 à 2100 px), suivies d'un creux d'environ 0,5 s où l'écart est 0 (ailes à la pose fixe), répétées toutes les 5 s (`CYCLE_MS`). Le film s'arrête à 14,6 s : plus aucune image ne change ensuite, la vague a fini. La dernière image est identique à celles des creux (écart 0). `01-ailes-planche.png` : 5 poses de rafale et la dernière image (repos, case en bas à droite) ; les ailes tournent autour du moyeu, tour, toit et bâtiments voisins ne bougent pas.
**3.** Après 20 s sans toucher : `gfxinfo reset`, 10 s : `Total frames rendered: 0`, Janky 0, deadline missed 0. `uiautomator dump` : 2,03 s (< 5 s).
**4.** Mode « Onglet Village » (caméra présente) : `gfxinfo` remis à zéro puis relevé toutes les 5 s. Glissé : 289, 545, 801 images, puis 801 constant (arrêt vers 15 s, environ 51 i/s). Tap : 256, 512, 768, puis 768 constant. Chaque geste donne une vague d'environ 15 s, puis 0 image. Les étiquettes `t+3/8/13...` de `vague-village-gfx.txt` sont celles de ma boucle ; les relevés sont à environ 5, 10, 15, 20 s. L'ouverture du mode a aussi lancé une vague (617 images en 25 s). En « Carte seule » (écran dev sans caméra), un glissé ne relance rien (8 images au total, `vague-swipe-gfx.txt`), un tap non plus (0, `vague-tap-gfx.txt`) : conforme au rapport d'ingénierie (vague au focus seulement), le relancement au toucher n'existe que dans IsoVillage.
**5.** `ecran/` : `1-haut`, `2-zoom`, `3-liste`, chacun en `-brut.png` (écran complet) et `-recadre.png`. La barre de débogage (« Carte seule » / « Grandir ») couvre le haut de 1 et 3 : recadrage sous elle à y=264. Le zoom est pris en mode « Carte seule » (carte un peu agrandie par le bouton `+`, barre d'outils de dev recadrée à y=960). **Réserve** : pas de pincement possible (ni par l'outil d'entrée de l'émulateur ni par Maestro), et un double tap en mode Village ne zoome pas : pas de capture zoomée dans l'onglet lui-même, et l'agrandissement est modeste. La capture 1 est prise à l'ouverture du mode, le moulin y est en mouvement.
**6.** Force-stop, `bati://village` : onglet de production inchangé (image du héros, barre d'onglets, `05-prod.png`), 0 nœud `iso-village`, `iso-carte` ou `iso-batiment` dans le dump, 0 image sur 10 s de repos (`prod-repos.txt`).

## Non vérifié
Arrêt de la vague au changement d'onglet ; mouvement réduit ; zoom par pincement ; lueur forge et feu de camp (non faite, voir rapport d'ingénierie).
