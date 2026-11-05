# Disposition : à passer aux autres pistes

## Vers GROWTH (04/11)

- **Forêt du sud (G15) : `massesForet` et `lisiereSud` ne sont pas touchés**, ni `isoLisiere.json`. **Le sud arrive au palier 4** (rempart, champs, porte, île jusqu'à gy 19 ; les stades du mur commencent au 6, palissade jusqu'au 6 comme le crop verrouillé). La forêt du sud peut tenir aux paliers 1 à 3 et doit reculer au 4.
- **Polygones sombres du sud, paliers 1 à 3** : bandes `.t1-3` du terrain peint (`BANDES_TERRAIN`), qui cèdent au palier 4 : ils ont besoin de la forêt du sud de GROWTH aux paliers 1 à 3, ou d'une repeinture. Pas corrigeables en donnée. Les autres défauts du sol sont dans `paliers.md`, « Sol, reste à faire ».
- **Ce que j'ai changé qui vous touche** : `isoLayout.ts` (grille de `DEBUT = -9` à 19, `cle`, `CASES`, `grilleDe`), `distCases` (`monde.ts`) et `voileVillage` et `cleForet` (`alentours.ts`) lisent toute la grille ; `clairiere` compte encore la vieille carte seule ; `tuiles` commence là où la terre commence ; le pont est dessiné à 1,35 et la cascade du bas de la rivière est de l'eau.
- **Bandes F** : `scripts/layout/rendre.sh` rend les paliers 1, 3, 6, 9, 12 (jour), 12 nuit et le recul dans `img/prop-*.jpg` ; `scripts/layout/une.sh NOM PALIER LUMIERE QUERY` un seul état ; `scripts/layout/plan.py` les plans. Voir `paliers.md`.
- **Rue** : `python3 scripts/layout/rue.py nord|ouest`. La rue nord donne le chemin vers le nord avec un pont en [2, 2] qui évite l'observatoire et le moulin (rue sur gx 0 puis gx -1).
- **GROWTH** : tes données sont sur `origin/track-layout-proposition`, dans `docs/designs/village/layout/` : `paliers.md` (commandes de rendu pour G14), `slots.md`, `slots.json`, `img/prop-*.jpg`. Le coin du sud arrive au palier 4. `massesForet` et `lisiereSud` ne sont pas touchés : G15 passe après la fusion de cette piste. Les polygones sombres des paliers 1 à 3 comptent sur ta forêt. Le zoom minimum s'arrête à 0,43, et coupe carrée, bord net et bruit s'y voient encore (page de LAYOUT, question 8).
- **GAME** : le doc « Bati : village iso, ce que les jeux nous apprennent » parle encore de Skia, à mettre à jour ou à ignorer sur ce point. Pour le voir : chercher « Skia » dans ce doc.
- **GAME** : `check` ne regarde pas les villageois ni les murs pour le pied. Deux figurines du palier 1 sont à 3 px, sans flotter (`farmer_face`, `herbalist_face`).
- **GROWTH** : le plan est choisi le 05/11 (rue nord, palier 1 sans maison). G14 peut repartir sur `origin/track-layout-proposition` ; G15 attend toujours la fusion de LAYOUT.
