# L5-T03-accroches : points d'accroche foyer, cheminée, fenêtres, porte

Statut proposé : prêt pour revue
Auteur : blender
Tour de revue : 1

## Fait
- `scripts/iso/exports/accroches.py` (nouveau) : calcule `foyer` et `fenetres` depuis les `volumes` de l'ancrage. Sans argument, réécrit les `.anchor.json` (aucun rendu) ; `extras()` est aussi appelée par `iso_blockout.py`.
- `scripts/iso/iso_blockout.py` : `hooks.update(accroches.extras(volumes, projection de la scène))` ; `stage_exports.py` : retire les fenêtres que le masque émissif ne montre pas (murs de dos) avant d'écrire l'ancrage.
- `scripts/iso/exports/test_exports.py` : contrôles `foyer` ssi volume fire/ember, px = grid à 1 px, dans le canevas, tailles > 0.
- 58 `renders/*.anchor.json` régénérés sans re-rendu (57 stades + `windmill_sails`, sans point), et `renders/pieces/*.anchor.json`.
- `constants/isoSpec.json` (`pointsAccroche._doc` et `extras`) et `components/village/iso/isoSpec.ts` (`PointsAccroche.foyer?`, `.fenetres?`, optionnels pour ne pas casser le test de schéma existant).
- `scripts/iso/exports/accroches_planche.py` et la planche `scripts/iso/blockouts/renders/accroches_planche.png`.

## Preuves
- Aucun rendu Cycles : tout vient des volumes. Projection hors Blender (cellToScreen) rejouée sur les points existants des 57 stades : écart max 0,0012 px.
- Par stade (57) : `foyer` 14 (campfire 3, forge 3, armory 2, champion_arena 3, dragon_lair 3) ; `fenetres` sur 26 stades (53 fenêtres en tout) ; `porte` 33 ; `cheminee` 7 (forge 3, armory_solid, farm_grand, heroes_hall solid et grand).
- Planche : forge, campfire, windmill, farm solid et tent rough ; foyer en ellipse rouge, fenêtres cyan (G/D), porte verte, cheminée magenta, faîte jaune. Tout tombe où il faut.
- `python3 scripts/iso/exports/test_exports.py` : sortie sans échec sur les points (seuls restent les écarts de maquettes des `pieces/animal_*`, non liés).
- jest (le motif a pris toute la suite) : Test Suites 429 passed, 1 skipped ; Tests 6289 passed, 1 skipped.
- Coût FLUX : 0.

## Douteux ou non fait
- Le chemin Blender (`iso_blockout.py`) n'a pas été exécuté : il demanderait un rendu Cycles (environ 1 à 3 min par stade, une heure ou plus pour tous). Au prochain rendu, les points différeront de moins de 0,01 px de ceux-ci.
- Pas de cheminée là où le blockout n'en a pas : `armory_rough` a un foyer (`ember`) sans conduit. L'ajouter change le rendu et les ombres : à décider. `farm`, `barn`, `wizard_tower`, `observatory` n'en ont aucune dans leur géométrie.
- Pas de `porte` pour archery_range, quarry rough et solid, watchtower, forge_rough, high_road rough et solid (pas de pièce `accroche: "porte"`). La porte existait déjà (33 stades) contrairement au rapport L4-T12.
- Plusieurs braises (champion_arena : 4 à 6) : `foyer` ne garde que la plus grande ; les autres sont dans `volumes` (mat `ember`).
- Fenêtre = volume `amber` à côté fin (≤ 0,1) ; les cubes ambrés (lanterne de fontaine, lampes du repaire) ne sont pas des fenêtres. Observatoire solid : les fentes inclinées (cylindres) ne comptent pas.
- Un `foyer` n'est pas filtré par le masque émissif.

## Pour la suite
- Lire dans `renders/<code>_<stade>.anchor.json` : `pointsAccroche.foyer` = `{px, grid, demiLargeur}`, `pointsAccroche.fenetres[]` = `{px, grid, largeur, hauteur, face}`, à côté de `px`/`grid` (`faite`, `porte`, `cheminee` nullables).
- Convention identique aux points existants : px du sprite, origine en haut à gauche (pas relatifs à l'ancre) ; soustraire `anchor` pour relatif. Mêmes échelles que le sprite (896x1344 etc.), à multiplier par l'échelle d'affichage.
- `foyer.px` est le milieu du dessus du foyer : poser la base de la flamme là, largeur max `2 x demiLargeur`. `cheminee` est le haut du conduit : la fumée part de là. Fenêtre : `px` est le centre de la face extérieure, `largeur`/`hauteur` sont l'écran (en px, losange compris), `face` `gauche` (mur +gy) ou `droite` (mur +gx).
- Porte : `porte.px` est le centre du seuil (pied), la lueur se pose au-dessus.
- Les anchors `pieces/` ont aussi les nouveaux champs.

## Tour 2
- `test_exports.py` n'a plus sa copie de la formule : il importe `accroches.screen` ; tolérance des points existants 1,0 px à 0,01 px (0,05 px pour `foyer` et `fenetres`, dont la grille est arrondie à 4 décimales). `accroches.screen` accepte de nouveau un point 2D (z = 0).
- Nouveau `scripts/iso/exports/test_accroches.py` : refait la caméra orthographique à la main (X 60°, Z 45°, K = S / racine de 2 = 384 px par case) et la compare à `accroches.screen` sur 1368 sommets des volumes de tous les stades : écart max 0,00001 px. Le chemin Blender (`to_px`) et le chemin hors Blender sont tenus par la même référence ; `iso_blockout.py` lui-même reste non exécuté.
- `python3 test_exports.py` (depuis `scripts/iso/exports/`) : seuls échecs, 18 lignes = les 9 animaux (maquette webp et sidecar, recadrage de L4-T08c), non liés. Rien dans `components/` touché.
