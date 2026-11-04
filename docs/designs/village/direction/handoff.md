# Image cible : à passer aux autres pistes

Vu par les juges sur les rendus de l'atelier du 04/11 (sommet 477a98d3b). Rien n'a été corrigé ici.

- **LAYOUT** : au palier 12, la ville fait environ 1/4 de la hauteur de l'écran et sa valeur est plate, le feu ne ressort pas (mara, `img/avant-t12-jour.jpg`).
- **LAYOUT ou GROWTH** : au recul maximal, le losange clair flotte dans un sol sombre bruité, une bordure de sapins identiques se répète, la rivière s'arrête net à gauche derrière le mur, et la route sud meurt dans la forêt (env, `img/avant-t12-recul.jpg`). Pour le voir : `node scripts/atelier/atelier.js render --tier 12 --light jour --query 'foyer=forge&zoom=0.3'`.
- **GAME** : le hook de push (`deadcode`, knip) échoue sur 7 fichiers de `scripts/atelier/web/`, vus comme inutilisés. Sans lien avec cette piste, à traiter avant toute fusion dans `main`. Pour le voir : `npm run deadcode`.
- **LAYOUT ou GAME** : le doc « Bati : village iso, ce que les jeux nous apprennent » parle encore de Skia, alors que l'atelier a retenu les vues. À mettre à jour ou à ignorer sur ce point.
- **POLISH** : la nuit de l'atelier est un voile bleu presque uniforme, sans fenêtres allumées au palier 12 (`img/avant-t12-nuit.jpg`, `render --tier 12 --light nuit`).
