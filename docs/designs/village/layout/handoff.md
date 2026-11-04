# Disposition : à passer aux autres pistes

## Vers GROWTH (04/11)

- **Forêt du sud (G15) : `massesForet` et `lisiereSud` ne sont pas touchés**, ni `isoLisiere.json`. **Le sud arrive au palier 4** (rempart, champs, porte, île jusqu'à gy 19 ; les stades du mur commencent au 6, palissade jusqu'au 6 comme le crop verrouillé). La forêt du sud peut tenir aux paliers 1 à 3 et doit reculer au 4.
- **Polygones sombres du sud, paliers 1 à 3** : bandes `.t1-3` du terrain peint (`BANDES_TERRAIN`), qui cèdent au palier 4 : ils ont besoin de la forêt du sud de GROWTH aux paliers 1 à 3, ou d'une repeinture. Pas corrigeables en donnée. Les autres défauts du sol sont dans `paliers.md`, « Sol, reste à faire ».
- **Ce que j'ai changé qui vous touche** : `isoLayout.ts` (grille de `DEBUT = -9` à 19, `cle`, `CASES`, `grilleDe`), `distCases` (`monde.ts`) et `voileVillage` et `cleForet` (`alentours.ts`) lisent toute la grille ; `clairiere` compte encore la vieille carte seule ; `tuiles` commence là où la terre commence ; le pont est dessiné à 1,35 et la cascade du bas de la rivière est de l'eau.
- **Bandes F** : `scripts/layout/rendre.sh` rend les paliers 1, 3, 6, 9, 12 (jour), 12 nuit et le recul dans `img/prop-*.jpg` ; `scripts/layout/une.sh NOM PALIER LUMIERE QUERY` un seul état ; `scripts/layout/plan.py` les plans. Voir `paliers.md`.
- **Rue** : `python3 scripts/layout/rue.py nord|ouest`. La rue nord donne le chemin vers le nord avec un pont en [2, 2] qui évite l'observatoire et le moulin (rue sur gx 0 puis gx -1).
