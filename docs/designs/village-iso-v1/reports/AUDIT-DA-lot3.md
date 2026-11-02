# AUDIT-DA lot 3 : les arbres autour et le cadrage

## Quoi
- **Fantômes et 19** : les arbres translucides venaient de `lisiere.ts` (`opacite(r)` : 0,9 en bordure, 0,3 à 4 cases). Maintenant 1 partout : opaques. Les arbres noirs ronds du jour sont l'art des sprites `decor/arbre_*` (palette de nuit, sans variante jour) : sans nouvelle image on ne peut pas les reteindre, ils restent pour le lot 7 (peinture).
- **1** : un voile de la couleur du sol (`foretSol`, opacité 0,3), posé sur la forêt dans `Monde.tsx` (`iso-monde-fondu`), de la gauche de la zone jusqu'à la rive. Les arbres s'enfoncent et contrastent moins. Une View, aucune image.
- **2** : la grille venait des tuiles (6 images, 320 dp, chacune répétée) : leur contenu est identique d'une case à l'autre. Plus petit changement : par case, une échelle 0,8 à 1 et une teinte (opacité 0,7 à 1 sur le sol), tirées de la graine de la case ; et le bruit de densité poussé vers ses extrémités (bosquets denses et clairières plus nettes). Mêmes images, même nombre de nœuds.
- **25** : `cadrage` (carteDemo.ts) 0,92 → 1,08 : seules les pointes du losange dépassent du cadre. Couverture (`etendue`, iso-monde) et pan (`navigation.ts`) inchangés et verts.
- **27** : les petits décors demandés (tas de bois, clôture, lanterne) n'existent pas en image iso. Avec les existants : un rocher (`R`) en (11,11) dans `constants/isoLayout.json`, au palier 1. Seul candidat valide parmi une quinzaine essayés (ombres du test de layout) ; un second rocher ou un bosquet fait passer le pire cas de mémoire de décodage (iso-detail) à 60,1 MiB, au-dessus du plafond de 60. Le palier 1 reste donc peu habité : il faudra un petit décor dédié (lot 7) ou un budget relevé.

## Nœuds Image du monde (mesuré dans `iso-monde`, par `Monde.tsx`)
Avant et après : identiques (une Image par case de forêt ou de rive, 0 ajoutée ; +1 View de voile). Côté carte, le palier 1 passe de 19 à 20 nœuds image/motif et le palier 12 de 104 à 105 (le rocher), test iso-dev-screen mis à jour.

## Fichiers
`components/village/iso/{lisiere.ts,monde.ts,Monde.tsx,carteDemo.ts}`, `constants/{isoLayout.json,isoOrdre.json}` (régénéré par `UPDATE_ORDRE=1`; `isoLisiere.json` régénéré, inchangé), tests `iso-monde` (+1), `iso-lisiere`, `iso-village`, `iso-dev-screen`. `IsoCarteDemo.tsx` et `app/dev-iso.tsx` non touchés.

## Checks
- `npx jest iso- village-scene --testPathIgnorePatterns=/node_modules/` : 56 suites, 617 tests verts (avant la dernière suite ajoutée ; `iso-monde` seul : 15 verts).
- `scripts/iso/team/heavy.sh npx tsc --noEmit` : sans erreur.
- `npx biome check --write --error-on-warnings` sur les fichiers touchés : propre.

## Limites / à voir par qa
- Captures avant/après à faire (nuit et jour, paliers 1, 6, 12, zoom mini) : voile, variété, cadrage, plus de fantômes.
- Arbres noirs du jour et palier 1 pauvre : voir plus haut, lot 7.
