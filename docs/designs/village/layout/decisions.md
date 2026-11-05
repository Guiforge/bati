# Disposition : décisions

- 04/11 **Une branche de proposition, `track-layout-proposition`** : le plan agrandi n'entre pas dans `feat/village-iso` avant le choix de Guillaume. Les outils (`check`, `hooks.json`, ancres) y entrent tout de suite.
- 04/11 **Deux worktrees** : les outils dans `iso`, la proposition dans celui de son implémenteur, avec son propre `npm ci`, pour que l'un ne salisse pas les rendus de l'autre.
- 04/11 **Cette session travaille dans le worktree `iso`, sur `track-layout`** : l'isolation de la session refuse git dans un autre dossier.
- 04/11 **Grille agrandie par cases négatives, pas par décalage** : `DEBUT = -9` dans `isoLayout.json`, `TAILLE` reste 20 (bords droit et bas, tables et dp du monde peint ne bougent pas), les lignes négatives sont de simples propriétés de tableau donc `visible[gy]?.[gx]` marche partout et seules les boucles (`CASES`) et les clés (`cle`, plus de `gy * TAILLE + gx`) changent ; un décalage de +9 aurait réécrit une quinzaine de tables de coordonnées.
- 04/11 **Échelle +25 % dans `pose`** (`echelleDe`, sauf `castle_wall`) : masque de tap, ombre de contact, ombres portées, ailes et effets suivent le rectangle ; `stadeDemo` lit `etapes` (palier d'avant le déplacement) et non la grille, sinon un moulin lointain redevient blanc.
- 04/11 **Une ancre par stade, à l'intérieur des `peints/*.ts` générés, et `integrate.py` les écrit** : un seul `ancre` partagé ne pouvait pas tenir les 2 px à chaque stade. Le coût est connu : fontaine et salle des héros passent un peu sous 85 % à cause de voisins, à revoir avec le plan.
- 04/11 **GROWTH s'arrête pour la nuit, ses demandes entrent dans la proposition** (message de Guillaume) : la forêt du sud reste à G15, après cette piste ; le recul de F dans `lisiere` est permis.
- 04/11 **Pas de juges avant la page** : Guillaume juge lui-même les propositions, les juges passent une fois sur le plan appliqué.
- 04/11 **Un pont peint essayé dès maintenant** (0,29 $) : la règle 22 veut un pont lisible, et aucun réglage de données n'y arrive. Rien n'est posé avant le choix.
- 05/11 **Guillaume suit les 8 recommandations** : son plan, rue nord, palier 1 sans maison, recul des crops validé sans les bouts de chemin, pont B, mannequin [7, 0], zoom minimum 0,43.
- 05/11 **Les bouts de chemin près de la porte sud restent, retardés** : douze cases portent les routes de l'arène et de l'est, elles arrivent aux paliers 7 et 8 pour que le coin du palier 6 ne change pas. Les culs-de-sac sont retirés. Écart à la réponse de Guillaume, signalé dans `checkpoint.md`.
- 05/11 **Accroches : pas de zéro exigé** : la règle laisse à GAME les recouvrements qui restent, et le seuil de 1 % n'a pas bougé. Aucune boîte changée.
- 05/11 **Fusion dans `feat/village-iso` avant le reverrouillage** : `lock_check` passe, et GROWTH attendait le plan pour G15.
