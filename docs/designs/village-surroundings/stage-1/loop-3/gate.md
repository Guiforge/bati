# Porte de l'étape 1, boucle 3

01/11/2026. Mêmes lignes que les boucles 1 et 2. Refaite après les réponses de Guillaume (point de contrôle de l'étape 1).

## Ce qui change

1. **La lisière recule avec l'île.** C'est l'exception écrite dans la bible : au palier t, la forêt couvre tout ce qui est entre la clairière de l'île du palier t et la bordure. La clairière vaut 28 dp pour une île d'une case et 80 dp pour l'île finie, comme `monde.ts` `clairiere`. Elle est mesurée comme `distCases` : chaque case visible grossie en losange. Les paliers 1 à 6 sont donc cadrés par la forêt.
2. **Bordure fixe** : au-delà de 380 dp de l'île finie, plus 72 dp contre le bord du monde. Elle ne bouge jamais.
3. **8 coupes depuis le feu de camp** : la route (les deux sens, rangée gy 10), la rivière (les deux sens, colonne gx 2) et 4 trouées sur les diagonales. Chacune serpente et change de largeur. Elles découpent la forêt en masses à tout palier.
4. **La rivière et le pont existent dès le palier 1** sur toute leur colonne, dans la grille comme dehors : la forêt qui recule ne les découvre pas en morceaux. À noter pour l'étape 5 : aujourd'hui, l'app ne dessine la rivière que sur les cases visibles.
5. **Champs** : seuls ceux qui sont hors de l'île finie existent (réponse 2 de Guillaume), comme dans les boucles 1 et 2.

## Mesures (`mesures.json`)

- Alignement : décalage (0, 0) px, échelle 1,00 sur les 3 captures.
- Ajout seul, lisière exceptée : 24 px perdus sur 11 montées (champ contre désordre, un bord).
- **La forêt n'avance jamais** : 0 px de non-forêt qui devient forêt d'un palier au suivant.
- Masses de forêt : **7 au palier 1, 7 au 6, 7 au 12** (de 66 k à 264 k px, la plus grosse fait 26 % de la forêt au palier 1).
- Bordure fermée : oui.

## Notes

| Ligne | Note | Pourquoi |
| --- | --- | --- |
| Vraies données, angle exact du jeu | 2 | Inchangé. |
| Les masques ne font qu'ajouter | 2 | 24 px de bord, et la lisière ne fait que reculer, jamais avancer. |
| Toutes les zones demandées | 2 | Rien ne manque. |
| Forêt en 5 à 8 masses, bordure qui ferme | 2 | 7 masses de taille proche à chaque palier, bordure fermée. |
| Lisible pour la suite | 1 | La forêt cadre tous les paliers. Mais les 8 coupes partent toutes du feu de camp et dessinent une étoile, trop régulière pour la composition finale. À casser à l'étape 3, quand les masses deviennent des sprites. |

**Total 9/10, aucun 0 : la porte passe.** Ces masques remplacent ceux de la boucle 2.
