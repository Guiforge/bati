# qa-couverture : couverture de jour, fenêtres de la salle des héros et vitre de la lanterne

Build .perf de 16:43, `bati://dev-iso?ambiance=jour` (le paramètre est `ambiance`, pas de `?debug=1` : non faisable). Preuves : evidence/qa-couverture/.

1. Nœud de couverture. Les testID sortent en resource-id.
   - `iso-fenetres-eteintes-heroes_hall` existe au palier 12 : [815,1519][919,1590] au cadrage mini (dump-p12-jour.xml), [472,1445][676,1584] après zoom (dump-p12-zoom.xml). Les 13 autres bâtiments ont aussi le leur.
   - `iso-lanterne-jour-*` n'existe PAS, ni au palier 1 ni au 12 (dump-p1-jour.xml : `iso-figurine-9-7`, la lanterne, [851,924][1080,1442], sans enfant lanterne-jour).
2. Bornes. Elles contiennent bien les fenêtres peintes (faces droite et lucarne, 04-p12-salle-bornes.png). Les pixels au centre des fenêtres valent (42,36,32) = #2A2420 : la couverture est dessinée et sombre. Reste un liseré ambré aux bords bas et droit de chaque fenêtre (06-p12-zoom-salle.png) : la coque est un peu trop petite, d'où l'impression « allumée ».
3. Sous le sprite ? Non : dans la hiérarchie, maquette-heroes_hall, socle, puis fenetres-eteintes (après, donc dessus). Pas de rendu debug.
   - Lanterne : cause lue dans le code, non corrigée. `Figurine` (IsoCarteDemo.tsx l.1058, appelée l.1873) reçoit `ambiance`, le sprite de nuit, alors que les bâtiments reçoivent `vie` (l.782, forcé à « jour » quand `lumiere` = jour). La condition `ambiance === "jour"` (l.1074) est donc fausse en dev-iso jour : la vitre reste allumée (01-p1-jour.png). Cohérent avec l'absence du nœud.
4. Toucher, mode Onglet Village (village du héros, palier 1, de nuit : l'onglet ne prend pas `?ambiance`). Assis h1 (08) et h0 (09) : la bulle « Villager » s'ouvre. Tap à côté de h2 : la bulle « The Smith » (10), le forgeron en marche couvre h2 (bornes voisines) : toucher h2 seul non prouvé. Dormeur et paire non identifiés dans la hiérarchie : non testés.
