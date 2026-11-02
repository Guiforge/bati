# BC tour 1 : verdict d'env (02/11)

**Échec.** FAIL sur 2, 3, 4, 5, 6, 7, 8, 16. PASS sur 1, 11, 17. Non vérifié par lui sur 9, 10, 12, 13, 14, 15.
Mesures du chef : critère 9 FAIL (village / alentours 0,96, il faut 1,10 à 1,50). Critère 4 FAIL (1,20, une seule classe).

Sa réponse : ce coin dépasse nettement la baseline, mais ne vaut pas l'écran cible. Il manque, dans l'ordre, une route unique et large visible de la porte jusqu'à une trouée, des chaumières qui donnent un propriétaire aux champs, et des ombres portées qui posent tout au sol.

## Défauts à corriger

| Gravité | Où | Quoi | Par |
| --- | --- | --- | --- |
| Haute | porte | La route ne touche pas la porte sud : herbe sur 12,17 et 12,18, tache à bout coupé | Peinture |
| Haute | porte | `tree_dense` (16,25) posé sur la route, cache 7 tuiles | Code |
| Haute | route | La route meurt sous la forêt, peinture arrêtée vers 29,32 | Les deux |
| Haute | porte | Damier `field_ble` en 18-20,16-17 avec haie en segments | Code |
| Haute | route | `prop_cloture_1` bleu, trop grand | Code |
| Haute | écran | Aucune ombre portée sous les bouquets | Code |
| Haute | champ | Personne autour des champs : deux chaumières à ajouter | Peinture |
| Haute | lisière | Pieds nus sur le pré, sans sous-bois | Les deux |
| Haute | lisière | Forêt nord à la même taille, sans miroir, paire presque superposée | Code |
| Haute | porte, champ | Tonneau, botte, cube sans base, ils flottent | Code |
| Moyenne | écran | Forêt sud plus vive que le village | Code |
| Moyenne | coin-bas | Taches sombres dans les trous de forêt | Code |
| Moyenne | route | `tree_bord_crete` en pleine forêt montre sa dalle, plaque grise voisine | Code |
| Moyenne | champ | Grand côté droit du blé, rangs trop parallèles | Peinture |
| Moyenne | route | Fourche à trois branches égales, route maître pas assez dominante | Peinture |
| Moyenne | porte | Limite de ton droite entre sol clair et pré, à droite | Peinture |
| Basse | paliers 3, 4 | Le moignon de route au palier 4 ne touche rien, la route du palier 3 change de place au 4 | Code |

Hors tour : aplat gris du haut, châtelet et grand-route est (R2).

## Décisions du chef

- **Critère 6 amendé** : un seul tampon de sol porte la route, la carte du manifeste ne peut pas la lister tuile par tuile. Le tampon doit peindre la route sur chaque tuile de la liste.
- **Critère 9** : voile doux en espace carte, centré sur le village, plutôt qu'une repeinture de la forêt. C'est de la lumière (règle 1), rien n'est fixé à l'écran (règle 7), et chaque essence garde sa teinte (critère 17).
- **Chaumières peintes dans le tampon**, avec le sol : pas de nouvelle famille d'image, cliquet inchangé.
