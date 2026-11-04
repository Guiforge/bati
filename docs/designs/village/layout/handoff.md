# Disposition : à passer aux autres pistes

## Vers GROWTH (04/11)

- **Forêt du sud (G15) : je n'y ai pas touché.** `massesForet`, `lisiereSud` et `isoLisiere.json` sont inchangés. L'île ne descend pas sous gy 16 avant le palier 6 (gy 17), le palier 7 ouvre les champs jusqu'à gy 19, l'arène est au palier 9. **Le sud s'ouvre au palier 6 : la forêt du sud peut tenir aux paliers 1 à 5 et doit reculer à partir du 6.**
- **Polygones sombres du sud, paliers 1 à 3** : ce sont deux bandes du terrain peint (`.t1-3` contre `.t4-6`, `BANDES_TERRAIN`) : pas corrigeables en donnée, il faut une repeinture ou la forêt du sud qui les couvre aux paliers 1 à 3. Non touché.
- **Ce que j'ai changé qui vous touche** : `isoLayout.ts` (grille de `DEBUT = -9` à 19, `cle`, `CASES`, `grilleDe`), `distCases` (`monde.ts`) et `voileVillage` et `cleForet` (`alentours.ts`) lisent toute la grille ; `clairiere` compte encore la vieille carte seule ; `tuiles` commence là où la terre commence ; le pont est dessiné à 1,35 et la cascade du bas de la rivière est de l'eau.
- **Bandes F** : `scripts/layout/rendre.sh` rend les paliers 1, 3, 6, 9, 12 (jour), 12 nuit et le recul dans `img/prop-*.jpg` ; `scripts/layout/une.sh NOM PALIER LUMIERE QUERY` un seul état ; `scripts/layout/plan.py` les plans. Voir `paliers.md`.
- **Rue** : `python3 scripts/layout/rue.py nord|ouest`. La rue nord donne le chemin vers le nord avec un pont en [2, 2] qui évite l'observatoire et le moulin (rue sur gx 0 puis gx -1).
