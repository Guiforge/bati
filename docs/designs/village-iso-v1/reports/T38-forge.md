# T38-forge : fenêtre 2 de forge_grand

Cause : le carreau (1.3, 1.3..1.58, z .4..0.64) est à demi caché par l'enclume (fer 1.35.., z .52) vue de la caméra. L'export posait le rectangle au centre du carreau entier, donc la lueur tombait sur l'enclume.
Correction : `scripts/iso/exports/accroches.py` `visible()` : un carreau éclairé sur moins de 80 % de son rectangle (masque émissif) reçoit la plus grande boîte entièrement éclairée centrée sur le centroïde des pixels éclairés. Forge_grand 2 : px [421.49, 1032.41], 40 x 22 (avant 426.88, 1039.64, 53.76 x 56.44). Pas de Cycles (le masque existant suffit), pas de décalage dans l'app.
`fenetresSansMur.forge_grand` retiré de `constants/isoSpec.json` (garde-fou gardé, vide). `constants/isoAccroches.json` régénéré (`UPDATE_ACCROCHES=1`).
Preuves : `npx jest iso-accroches iso-feux --testPathIgnorePatterns=/node_modules/` : 2 suites, 17 tests verts.
Autres bâtiments (éclairage < 80 % du rectangle, donc concernés par la même règle à leur prochain export, pas réexportés ; un mur "droite" en losange en fait aussi partie) : armory_solid 0, barn_rough 0, castle_wall_solid 0, farm_grand 2, heroes_hall_grand 2 et 3, heroes_hall_solid 1, windmill_grand 0, windmill_solid 0.
Non vérifié : rendu à l'écran sur émulateur.
