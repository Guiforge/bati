# Porte de l'étape 1, boucle 2

01/11/2026. Même grille que la boucle 1 (`../loop-1/gate.md`).

## Pourquoi une boucle 2 alors que la 1 passait

En préparant le sol de l'étape 2, le masque recadré a montré un défaut que la porte n'avait pas vu : la rivière s'arrêtait net aux bords de la grille, en plein pré, alors que l'app la dessine jusqu'au bord du monde (capture palier 12, en haut à gauche). Une seule correction : hors de la grille, la rivière est prolongée tout droit sur sa colonne (gx 2), de gy −16 à 35. Elle fait partie du monde dès le palier 1, donc rien n'apparaît plus tard par-dessus la forêt.

Un premier essai la faisait venir avec l'île : 3 688 px de forêt et de bordure devenaient de l'eau au palier 11. Le contrôle d'ajout seul l'a attrapé.

## Mesures (`mesures.json`)

- Alignement : décalage (0, 0) px, échelle 1,00 sur les 3 captures (inchangé).
- Ajout seul : 56 px de bord perdus sur 11 montées (chemin contre eau au pont 32, champ contre désordre 24).
- Forêt : 6 masses ; bordure fermée.

## Notes

| Ligne | Note | Pourquoi |
| --- | --- | --- |
| Vraies données, angle exact du jeu | 2 | Inchangé. |
| Les masques ne font qu'ajouter | 2 | 56 px de bord. |
| Toutes les zones demandées | 2 | La rivière traverse maintenant tout le monde. |
| Forêt en 5 à 8 masses, bordure qui ferme | 1 | Inchangé : deux masses font 70 % de la forêt. |
| Lisible pour la suite | 1 | Inchangé : aux paliers 1 à 6, ni forêt ni bordure à l'écran. |

**Total 8/10, aucun 0 : la porte passe.** Ces masques remplacent ceux de la boucle 1 pour la suite.
