# Dépenses FLUX des abords

Plafond du pipeline : 40 $. Chaque appel passe par `scripts/iso/iso_loop.py` (reserve / settle). Le registre compte ces dépenses dans le même compteur « V1 » que la boucle du village, plafonné à 40 $ lui aussi tant que la ligne des 100 $ n'est pas écrite. Il restait 6,94 $ dans ce compteur le 01/11 à 14 h 15 (la boucle du village a dépensé 4,71 $ entre 11 h 40 et 13 h 57, hors de cette table).

| Date | Étape, boucle | Images | Coût | Registre V1 avant | Registre V1 après | Cumul abords |
| --- | --- | --- | --- | --- | --- | --- |
| 01/11 | 0, 1 (arbre test) | 1 | 0,045 $ | 21,788 $ | 21,833 $ | 0,045 $ |
| 01/11 | 0, 2 (FLUX.2 témoin, FLUX 3 bloc A, FLUX 3 bloc B) | 3 | 0,141 $ | 21,833 $ | 21,974 $ | 0,186 $ |
| 01/11 | 2, 1 (sol peint, 4 variantes FLUX 3) | 4 | 0,192 $ | 21,974 $ | 22,166 $ | 0,378 $ |
| 01/11 | 2, 2 (sol peint, 4 variantes FLUX 3) | 4 | 0,192 $ | 22,166 $ | 22,358 $ | 0,570 $ |
| 01/11 | 2, 3 (sol peint, 4 variantes FLUX 3) | 4 | 0,192 $ | 22,358 $ | 22,550 $ | 0,762 $ |
| 01/11 | 2, 4 (terrain seul, 4 variantes FLUX 3) | 4 | 0,192 $ | 22,550 $ | 22,742 $ | 0,954 $ |
| 01/11 | 3, 1 (6 sprites de forêt, 5 reçus) | 6 | 0,42 $ | 22,742 $ | 23,162 $ | 1,374 $ |
| 01/11 | 3, 2 (6 sprites de forêt) | 6 | 0,42 $ | 23,162 $ | 23,582 $ | 1,794 $ |
| 01/11 | 3, 3 (3 sprites refaits) | 3 | 0,21 $ | 23,582 $ | 23,792 $ | 2,004 $ |
| 01/11 | 3, 4 (crête et masse dense, rejetées) | 2 | 0,14 $ | 23,792 $ | 23,932 $ | 2,144 $ |
| 01/11 | 4, 1 (22 accessoires, 5 feuilles d'animaux) | 27 | 1,89 $ | 23,932 $ | 25,822 $ | 4,034 $ |
| 01/11 | 4, 2 (souris complétées par redécoupe) | 0 | 0 $ | 25,822 $ | 25,822 $ | 4,034 $ |
| 01/11 | 3, 5 (crête et masse dense, découpe par clé) | 2 | 0,14 $ | 25,822 $ | 25,962 $ | 4,174 $ |
| 01/11 | 2, 5 (terrain refait : 4 variantes, 13 tuiles d'essai rejetées, 9 tuiles de la bande) | 26 | 2,392 $ | 30,670 $ | 33,062 $ | 6,566 $ |

Par tranche :

| Étape | Tranche | Dépensé |
| --- | --- | --- |
| 0 | 0,30 $ | 0,186 $ (le reste est versé à la réserve) |
| 1 | gratuite | 0 $ |
| 2 | 10 $ | 3,16 $ (boucle 5 comprise) |
| 3 | 10 $ | 1,33 $ (0,07 $ par sprite de 1344 × 896) |
| 4 | 12 $ | 1,89 $ |

Le solde BFL est monté entre deux appels de l'étape 0 (de 1625,6 à 3611,5 crédits). C'est une recharge, que `settle` compte à part, pas une dépense. À la boucle 1 de l'étape 3, le registre a signalé un écart entre le solde et les coûts (22,52 contre 23,16 $) : le solde avait du retard.
