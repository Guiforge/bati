# Journal de l'étape 1

- 01/11 : GO de Guillaume sur l'étape 0.
- Boucle 1, 01/11 : masques en coordonnées du monde depuis le code de l'app (891f6da2), calques sur les captures palier 1, 6 et 12, alignement mesuré à 0 px. Porte à 8/10 (`loop-1/gate.md`). Gratuit.
- Boucle 2, 01/11 : la rivière prolongée hors de la grille (défaut vu en préparant l'étape 2). Porte à 8/10 (`loop-2/gate.md`).
- Réponses de Guillaume : la lisière recule avec l'île (seule exception, écrite dans la bible), champs hors de l'île finie seulement, sol nu sous la forêt.
- Boucle 3, 01/11 : forêt par palier qui ne fait que reculer, bordure fixe, 8 coupes, rivière et pont dès le palier 1. Porte à 9/10 (`loop-3/gate.md`). **Ce sont ces masques qui servent pour la suite.**

Pour rejouer (depuis la racine du dépôt) :
```
bun docs/designs/village-surroundings/stage-1/stub_rn.mjs <dossier>/dump.js
bun <dossier>/dump.js > <dossier>/monde.json
python3 -I docs/designs/village-surroundings/stage-1/masques.py <dossier>/monde.json docs/designs/village-surroundings/stage-1/loop-N
```
Vérifié le 01/11 vers 10 h 30 : avec le lot B1 de la boucle parallèle dans l'arbre de travail, le vidage ne change que `cadre` (palier 12 : zoom 0,79 au lieu de 0,59, décalage x de −131 dp). Toutes les données de zone sont identiques, donc les masques aussi. `loop-2/monde.json` garde le cadrage de 891f6da2, celui des captures.

Les scripts d'aide sont en `.mjs` sans types, parce que le `tsc` du dépôt lit tous les `.ts`.

Après un nouveau cadrage (lot B1) ou de nouvelles captures : relancer les trois lignes ; les masques ne changent que si les données du village changent.
