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
| H1 | -16,-2 à -10,3 | 7x6 | 10 | **hors île** : clairière ouest du bosquet, au-dessus de l'observatoire, le hameau | l'arrière du bosquet reste en forêt |
| H2 | -16,4 à -10,9 | 7x6 | 10 | hors île : deux fermes | la lisière sud de la clairière |
| H3 | -21,-4 à -17,3 | 5x8 | 10 | hors île : le petit bourg marchand, déplacé à l'ouest de la clairière | le bosquet et sa forêt arrière (règle 23) |

Hors île : en dehors de la grille (`DEBUT = -9`), sur le monde peint ; la boîte est dans les mêmes coordonnées, sans case dans `isoLayout.json`. Elles sont sur `img/prop-slots.jpg` (jaune), la grille est au centre. La direction F fait reculer la forêt à gauche du bosquet ; le bourg marchand n'est plus au nord du bosquet.

**Règle 6, paliers :** les quartiers de l'île s'ouvrent du palier 6 au 10 (Q1 6, Q5 7, Q6 7, Q3 8, Q4 9, Q2 10) : `paliers.py` lit `slots.json`, prend la boîte et 1 case autour au palier voulu et le plus court chemin de terre jusqu'à ce qui est déjà ouvert ; `slots.py` refuse un quartier qui s'ouvrirait plus tard que voulu. Pour changer un palier : le nombre dans `QUARTIERS` de `slots.py`, puis `slots.py`, `paliers.py`, `slots.py`. L'est de la carte (forge, armurerie, antre) n'a aucun trou de 3x3 hors parvis : pas de quartier à l'est.
