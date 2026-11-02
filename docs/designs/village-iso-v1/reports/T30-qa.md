# T30-qa : variantes d'ombre au sol

Statut proposé : passe (les 4 variantes se distinguent ; choix à Guillaume)
Build : celle de T28-qa Tour 2. Dev-iso palier 12, `?fige=1&ombre=<v>`, « Tous debout » et zoom 0,6, même scène pour les 4. Planche `evidence/T30/planche-ombres.png` (villageois rouge au feu de camp, villageois gris-vert à l'angle du toit, 4 variantes côte à côte) ; captures `ombre-{rien,a,b,c}.png`, recadrages `crop-villageois-*.png`.
- rien : une ellipse pleine sombre aux bords nets, la plus marquée.
- a : une grande ellipse douce, plus large, bords un peu à facettes (octogone lisible).
- b : un noyau sombre dans un halo plus clair, deux étages d'ellipses.
- c : presque invisible, une ombre très pâle sous les pieds.
- Bêtes au sol (chat, souris) : trop petites à 0,6 pour juger de la variante, non isolées.
- Flaques de lumière : `crop-flaques-lumiere.png` et `crop-flaques-4.png`. Une ellipse claire large autour du feu de camp (bord visible en anneau fin) et des plaques d'herbe plus claires aux pieds des bâtiments éclairés. Identiques dans les 4 variantes : elles ne viennent pas de `?ombre=`. Si Guillaume appelle « ombres en ellipse » ce qu'il voit autour du feu et sur l'herbe, c'est cela, pas l'ombre sous les villageois.

## Tour 2 (ombre B seule, lueurs réduites, plaques fondues)
Build `.perf` neuve du working tree (INTEGRATION true pour la build, remis à false et relu : `constants/isoPoc.ts` ligne 29). Dev-iso palier 12, `?fige=1&ambiance=nuit`, « Tous debout », zoom 0,6. Capture de preuve `evidence/T30/apres-z06.png` (place, feu de camp, fontaine, forge, villageois rouge près du feu) ; planche `evidence/T30/planche-apres-t30.png` (gros plans villageois/feu, route sous la forge, herbe, lueur du feu). Avant = `evidence/T30/crop-flaques-lumiere.png`, `ombre-b.png` (autre résolution d'écran, pas de planche côte à côte à échelle égale).
- Villageois au sol : une ombre ovale sombre douce sous les pieds, lisse, sans facettes ; sur la route comme sur l'herbe. Plus discrète que l'ancienne B.
- Route à l'ombre d'un bâtiment : l'ombre est lisible mais brun-gris, proche du ton de la route, sans bande noire.
- Plaques claires de l'herbe : blobs aux bords fondus, plus de contour net.
- Lueur du feu : très discrète, un anneau fin encore visible autour du feu et de la place, pas de grande ellipse pleine.
- Limites : pas d'avant/après à cadrage égal (autre taille d'écran pour les anciennes captures), jugement à l'oeil. Verdict qa : pass sur le rendu ; l'anneau fin autour du feu reste visible, à juger par Guillaume.
