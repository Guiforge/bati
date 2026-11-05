# Emplacements des quartiers (L9)

`slots.json` (écrit et vérifié par `python3 scripts/layout/slots.py`), plan : `img/prop-slots.jpg` (`python3 scripts/layout/plan.py slots img/prop-slots.jpg`, cases vues de dessus, rose = quartier, bleu = parvis). Coordonnées en cases, boîtes `[gx0, gy0, gx1, gy1]` incluses, comme `isoLayout.json`.

Le script refuse un quartier qui n'est pas de l'herbe, qui touche un plot, une case de rue, ou le **parvis** d'un bâtiment du joueur : les cases à moins de 2 de son emprise sur ses faces visibles (+gx et +gy), la règle 14 et « jamais devant un bâtiment du joueur à moins de 2 cases » (règle 1). Chaque bâtiment a sa ligne `P-<code>` dans `slots.json`.

| Id | Boîte | Taille | Premier palier | Contient | Reste libre |
|---|---|---|---|---|---|
| Q1 | 3,-6 à 8,-1 | 6x6 | 6 | quartier du nord, rive est, derrière carrière et mannequin | la rue du nord à l'ouest, le chemin gy 2 au sud |
| Q2 | -7,11 à -2,16 | 6x6 | 10 | quartier du sud-ouest, sous la ferme | la ferme et son parvis, la rue gx -4 |
| Q3 | -8,-3 à -5,2 | 4x6 | 8 | clairière ouest, au-dessus de l'observatoire | l'observatoire et son parvis, la rue gx -4 |
| Q4 | -8,-8 à -4,-5 | 5x4 | 9 | nord-ouest, là où la forêt recule, à gauche du bosquet | le bosquet garde sa forêt derrière lui : jamais de maison à l'est de gx -4 |
| Q5 | -8,7 à -5,9 | 4x3 | 7 | l'ouest, le long de la rue gy 7 | la rue gy 7 |
| Q6 | 15,17 à 17,19 | 3x3 | 7 | sud-est, hors du rempart | le rempart au nord, la route du sud |
| H1 | -14,0 à -10,4 | 5x5 | 7 | **hors île**, dans le cadre de la caméra fixe : le hameau, cabanes au 7 puis hameau à leur place au 9 | l'observatoire (gx -6), l'arrière du bosquet reste en forêt |
| H2 | -18,-5 à -12,0 | 7x6 | 10 | hors île : deux fermes, la première au 10, la seconde au 11 | le hameau H1 au sud, les champs H4 à l'ouest |
| H3 | -15,-13 à -11,-8 | 5x6 | 12 | hors île : le petit bourg marchand au 12, au bord de la forêt, à gauche du bosquet (règle 23) | le bosquet et sa forêt arrière |
| H4 | -23,-10 à -19,-7 | 5x4 | 11 | hors île : les champs de la ferme au 11 | la forêt du nord-ouest, derrière |

Hors île : en dehors de la grille (`DEBUT = -9`), sur le monde peint ; la boîte est dans les mêmes coordonnées, sans case dans `isoLayout.json`. Elles sont sur `img/prop-slots.jpg` (jaune), la grille est au centre. La direction F fait reculer la forêt à gauche du bosquet ; le bourg marchand n'est plus au nord du bosquet.

**H1 à H4 déplacées (growth G11, 05/11).** Sur la caméra fixe (`foyer=campfire&zoom=0.45`), chacune tient entière dans l'image, hors île, loin de l'observatoire et des bâtiments du joueur ; H1, H2 et H3 étaient à moitié hors cadre (gx - gy jusqu'à -19 pour le bord). Chaque boîte est l'empreinte de la pièce peinte qui y vient (largeur de la pièce sur 2 demi-cases, `scripts/growth/poser.py` et `poser_f.json`), et son palier celui de sa première pièce, pas 10 (`DEHORS` dans `slots.py`). `DEGAGES_FORET` (`components/village/iso/piecesPosees.ts`) reprend ces empreintes plus une demi-case : la forêt peinte s'en écarte dès ce palier, et ne revient pas.

**Règle 6, paliers :** les quartiers de l'île s'ouvrent du palier 6 au 10 (Q1 6, Q5 7, Q6 7, Q3 8, Q4 9, Q2 10) : `paliers.py` lit `slots.json`, prend la boîte et 1 case autour au palier voulu et le plus court chemin de terre jusqu'à ce qui est déjà ouvert ; `slots.py` refuse un quartier qui s'ouvrirait plus tard que voulu. Pour changer un palier : le nombre dans `QUARTIERS` de `slots.py`, puis `slots.py`, `paliers.py`, `slots.py`. L'est de la carte (forge, armurerie, antre) n'a aucun trou de 3x3 hors parvis : pas de quartier à l'est.
