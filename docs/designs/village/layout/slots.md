# Emplacements des quartiers (L9)

`slots.json` (écrit et vérifié par `python3 scripts/layout/slots.py`), plan : `img/prop-slots.jpg` (`python3 scripts/layout/plan.py slots img/prop-slots.jpg`, cases vues de dessus, rose = quartier, bleu = parvis). Coordonnées en cases, boîtes `[gx0, gy0, gx1, gy1]` incluses, comme `isoLayout.json`.

Le script refuse un quartier qui n'est pas de l'herbe, qui touche un plot, une case de rue, ou le **parvis** d'un bâtiment du joueur : les cases à moins de 2 de son emprise sur ses faces visibles (+gx et +gy), la règle 14 et « jamais devant un bâtiment du joueur à moins de 2 cases » (règle 1). Chaque bâtiment a sa ligne `P-<code>` dans `slots.json`.

| Id | Boîte | Taille | Premier palier | Contient | Reste libre |
|---|---|---|---|---|---|
| Q1 | 3,-6 à 8,-1 | 6x6 | 12 | quartier du nord, rive est, derrière carrière et mannequin | la rue du nord à l'ouest, le chemin gy 2 au sud |
| Q2 | -7,11 à -2,16 | 6x6 | 12 | quartier du sud-ouest, sous la ferme | la ferme et son parvis, la rue gx -4 |
| Q3 | -8,-3 à -5,2 | 4x6 | 11 | clairière ouest, au-dessus de l'observatoire | l'observatoire et son parvis, la rue gx -4 |
| Q4 | -8,-8 à -4,-5 | 5x4 | 11 | nord-ouest, là où la forêt recule, à gauche du bosquet | le bosquet garde sa forêt derrière lui : jamais de maison à l'est de gx -4 |
| Q5 | -8,7 à -5,9 | 4x3 | 11 | l'ouest, le long de la rue gy 7 | la rue gy 7 |
| Q6 | 15,17 à 17,19 | 3x3 | 10 | sud-est, hors du rempart | le rempart au nord, la route du sud |
| H1 | -14,-2 à -8,3 | 7x6 | 10 | **hors île** : clairière ouest du bosquet, au-dessus de l'observatoire, le hameau | l'arrière du bosquet reste en forêt |
| H2 | -14,4 à -8,9 | 7x6 | 10 | hors île : deux fermes | la lisière sud de la clairière |
| H3 | -18,-4 à -14,3 | 5x8 | 10 | hors île : le petit bourg marchand, déplacé à l'ouest de la clairière | le bosquet et sa forêt arrière (règle 23) |

Hors île : en dehors de la grille (`DEBUT = -9`), sur le monde peint ; la boîte est dans les mêmes coordonnées, sans case dans `isoLayout.json`, donc absente de `img/prop-slots.jpg`. La direction F fait reculer la forêt à gauche du bosquet ; le bourg marchand n'est plus au nord du bosquet.

**Pourquoi les paliers sont tardifs (10 à 12) :** ces trous sont de la campagne pour `paliers.py` (`PLOT` ne les couvre pas). La règle 6 veut un quartier dès le palier 6 : pour l'avoir, ajouter à `paliers.py` une coque de ces boîtes au palier voulu (une ligne par boîte). L'est de la carte (forge, armurerie, antre) n'a aucun trou de 3x3 hors parvis : pas de quartier à l'est.
