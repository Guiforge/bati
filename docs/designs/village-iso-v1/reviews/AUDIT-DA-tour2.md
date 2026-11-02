# Audit DA de sortie, tour 2 du code (31/10)

Revue de code neuve (iso-code-reviewer, Sonnet) : **pass**. `npx jest iso- village-scene` : 58 suites, 633 tests verts.

Constats 6 (fumée au repos à 0), 8 (rochers du premier plan assombris avec le fondu de leur pièce), 12 (bosses du bord sans trait), 21 (bas de la liste sous la barre d'onglets), cadrage de départ ramené à 1 (l'île tient dans l'aire).

Mineurs notés : l'assombrissement passe de 0,35 à 0,45 pour tous les gros rochers, pas seulement le premier plan (voulu, à revoir à la capture suivante) ; `PHASES_FUMEE(2)` finit pile à la frontière du cycle, marge nulle, couverte par le test.

Restent du tour 2 (rapport AUDIT-DA-sortie-carte) : 11 (grille du dallage), 14 (ruines), 17 (croissance de démo), 22 (île coupée dans l'onglet), 23 (ferme sans bulle), repris dans T38.
