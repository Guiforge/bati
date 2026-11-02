# T23-qa : vue iso sans ciel, sur émulateur

Statut proposé : prêt pour revue
Auteur : qa
Tour de revue : 1

emulator-5554 (bati-bench, 1080x2400, 420 dpi). `.perf` neuve du working tree du 30/10, `INTEGRATION` mis à `true` le temps de la build puis remis à `false` (relu : `export const INTEGRATION = false;`, `git diff constants/isoPoc.ts` vide). `heavy.sh --gradle gradle-perf.sh` : `BUILD SUCCESSFUL in 2m 37s`, `:app:createBundleReleaseJsAndAssets` exécuté (`evidence/T23/build.log`). `install -r` : `Success`. « Vider cache images » puis force-stop avant les captures. sha256 dans `evidence/T23/apk.sha256` (même APK pour T22, T14, T16 et T03).

## Verdicts
1. **Portrait, Carte seule, paliers 1, 6 et 12, zoom mini et maxi, glissé jusqu'aux quatre bords : aucun ciel, aucun vide.** 30 captures (`planche-p1-portrait.jpg`, `planche-p6-portrait.jpg`, `planche-p12-portrait.jpg`, une ligne zoom mini, une ligne zoom maxi ; colonnes centre, haut, bas, gauche, droite). Partout la forêt, l'herbe, les rochers, ou la mer et sa berge au bord droit en zoom mini. Plus d'horizon, de lune, d'étoiles ni de montagnes. Au zoom maxi, la caméra est bornée avant le bord du monde : le glissé ne montre que de l'herbe et des arbres.
2. **Paysage : aucun ciel, aucun vide**, mais seulement dans l'onglet Village (palier du héros, 1). Glissé jusqu'aux quatre bords au zoom de l'onglet (`planche-onglet-paysage.jpg`, `onglet-paysage.jpg`). dev-iso est verrouillé en portrait (`user_rotation 1` : `ROTATION_0` relu, `deviso-paysage-essai.jpg`). Les paliers 6 et 12 et les zooms mini et maxi n'ont donc pas été vus en paysage, et l'onglet ne se zoome pas sans pincement (`input` n'envoie qu'un doigt).
3. **Retour du paysage au portrait : plus d'île seule sur un ciel.** Film à 30 i/s (`rotation-retour-planche.jpg`, images 1 à 40) : la carte arrive décentrée à droite, puis se recentre vers l'image 10, sur la forêt. Le film n'a commencé qu'après la rotation : le tout premier instant de la bascule n'est pas filmé.
4. **Corbeaux lisibles.** Pendant une vague, la volée traverse le haut du cadre au-dessus de la forêt, encre et liseré pâle, bien détachés du vert sombre (`corbeaux-vague.jpg`, `corbeaux-zoom.png` à x2, `corbeaux-serie.jpg` : visibles sur 5 des 16 captures à 0,6 s d'écart). Aucun ne passe dans un ciel.
5. **Voile de nuit : dosage correct.** Bleu profond en haut et en bas du cadre, centre vert lisible. Aucune bande dure à 35 % ni à 70 %. Il ne mange pas les bâtiments au cadrage de l'onglet (`onglet-portrait.jpg` dans `evidence/T14/00-onglet.jpg`). Il pourrait être un peu moins fort en bas en paysage, où il assombrit la moitié basse de la carte, qui fait 860 px de haut. Rien de bloquant.

## Défaut mineur vu en passant (hors périmètre T23)
- Au zoom maxi du palier 12, glissé vers le bas, le halo vert sous l'île est coupé par un bord droit horizontal (`raw/p12-maxi-bas.png`, hors dépôt). C'est la lisière de l'île, pas un vide.

## Preuves
- `docs/designs/village-iso-v1/evidence/T23/` : planches `planche-p{1,6,12}-portrait.jpg`, `planche-onglet-paysage.jpg`, `rotation-retour-planche.jpg`, `corbeaux-*.jpg|png`, `onglet-paysage.jpg`, `00-ouverture.jpg`, `deviso-paysage-essai.jpg`, `apk.sha256`, `build.log`, `films-lien.txt`.
- Hors dépôt : `~/.cache/bati-art-loop/iso/evidence/T23/` (`raw/` : 36 PNG pleine taille, film `t23-rot-retour.mp4`, APK `app-release-qa3010.apk`, journal Gradle complet).
- Coût FLUX : 0.

## Douteux ou non fait
- Paysage aux paliers 6 et 12, et en zoom mini ou maxi : non vu (dev-iso est en portrait, et le pincement est impossible).
- Nœuds Image comptés par l'ingénieur en jest, pas recomptés sur l'appareil.
- Pas de mesure de trames : la carte ne le demandait pas.

## Pour la suite
- Pour couvrir le paysage aux paliers 6 et 12, il faudrait que dev-iso suive la rotation, ou un palier forcé dans l'onglet.
