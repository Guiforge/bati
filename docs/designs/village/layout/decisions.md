# Disposition : décisions

- 04/11 **Une branche de proposition, `track-layout-proposition`** : le plan agrandi n'entre pas dans `feat/village-iso` avant le choix de Guillaume. Les outils (`check`, `hooks.json`, ancres) y entrent tout de suite.
- 04/11 **Un seul worktree, implémenteurs l'un après l'autre** : la construction de l'atelier et `node_modules` y sont déjà. Le travail est en série de toute façon.
- 04/11 **Cette session travaille dans le worktree `iso`, sur `track-layout`** : l'isolation de la session refuse git dans un autre dossier.
- 04/11 **Grille agrandie par cases négatives, pas par décalage** : `DEBUT = -9` dans `isoLayout.json`, `TAILLE` reste 20 (bords droit et bas, tables et dp du monde peint ne bougent pas), les lignes négatives sont de simples propriétés de tableau donc `visible[gy]?.[gx]` marche partout et seules les boucles (`CASES`) et les clés (`cle`, plus de `gy * TAILLE + gx`) changent ; un décalage de +9 aurait réécrit une quinzaine de tables de coordonnées.
- 04/11 **Échelle +25 % dans `pose`** (`echelleDe`, sauf `castle_wall`) : masque de tap, ombre de contact, ombres portées, ailes et effets suivent le rectangle ; `stadeDemo` lit `etapes` (palier d'avant le déplacement) et non la grille, sinon un moulin lointain redevient blanc.
